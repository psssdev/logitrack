'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import type { Order, OrderStatus } from '@/lib/types';
import { Loader2, ChevronDown } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import {
  doc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
} from 'firebase/firestore';
import { triggerRevalidation } from '@/lib/actions';
import { OrderStatusBadge } from './status-badge';

const openWhatsApp = (phone: string, message: string) => {
  const cleanedPhone = phone.replace(/\D/g, '');
  const fullPhone = cleanedPhone.startsWith('55') ? cleanedPhone : `55${cleanedPhone}`;
  const url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
};

const statusOptions: OrderStatus[] = [
  'PENDENTE',
  'EM_ROTA',
  'ENTREGUE',
  'CANCELADA',
];
const statusLabels: Record<OrderStatus, string> = {
  PENDENTE: 'Pendente',
  EM_ROTA: 'Em Rota',
  ENTREGUE: 'Entregue',
  CANCELADA: 'Cancelada',
};

export function UpdateStatusDropdown({ order }: { order: Order }) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const handleUpdateStatus = (newStatus: OrderStatus) => {
    if (newStatus === order.status) return;

    startTransition(async () => {
      if (!firestore || !user) {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Usuário não autenticado.',
        });
        return;
      }

      const orderRef = doc(firestore, 'orders', order.id);

      try {
        await updateDoc(orderRef, {
          status: newStatus,
          timeline: arrayUnion({
            status: newStatus,
            at: new Date(),
            userId: user.uid,
          }),
        });

        let messageTemplate: string | undefined;
        let notificationTitle = 'Status Atualizado';

        if (newStatus === 'EM_ROTA') {
          messageTemplate = "Olá {cliente}! Sua encomenda {codigo} saiu para entrega. Acompanhe em: {link}";
          notificationTitle = 'Encomenda em rota!';
        } else if (newStatus === 'ENTREGUE') {
          messageTemplate = "Olá {cliente}! Sua encomenda {codigo} foi entregue com sucesso! Obrigado por confiar em nossos serviços.";
          notificationTitle = 'Encomenda entregue!';
        }

        if (messageTemplate) {
          const trackingLink = `https://seusite.com/rastreio/${order.codigoRastreio}`;
          let message = messageTemplate
            .replace('{cliente}', order.nomeCliente)
            .replace('{codigo}', order.codigoRastreio)
            .replace('{link}', trackingLink);
          
          openWhatsApp(order.telefone, message);
        }

        await triggerRevalidation(`/encomendas/${order.id}`);
        await triggerRevalidation('/encomendas');
        await triggerRevalidation('/inicio');

        toast({
          title: notificationTitle,
          description: `Status alterado para ${statusLabels[newStatus]}. Verifique o WhatsApp para notificar.`,
        });
      } catch (error: any) {
        console.error('Error updating status:', error);
        toast({
          variant: 'destructive',
          title: 'Erro ao atualizar',
          description: error.message || 'Não foi possível atualizar o status.',
        });
      }
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-[180px] justify-between" disabled={isPending || isUserLoading}>
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <OrderStatusBadge status={order.status} />
          )}
          <span>Alterar Status</span>
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[180px]" align="end">
        <DropdownMenuLabel>Mudar status para:</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {statusOptions.map((status) => (
          <DropdownMenuItem
            key={status}
            disabled={status === order.status || isPending}
            onClick={() => handleUpdateStatus(status)}
            className="cursor-pointer"
          >
            <OrderStatusBadge status={status} />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
