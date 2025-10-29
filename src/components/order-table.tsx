
'use client';

import * as React from 'react';
import Link from 'next/link';
import { MoreHorizontal, ArrowRight, Truck, PackageCheck, CreditCard, Send, BadgeCent, History } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Order } from '@/lib/types';
import { OrderStatusBadge } from './status-badge';
import { Input } from './ui/input';
import { Timestamp, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser } from '@/firebase';
import { triggerRevalidation } from '@/lib/actions';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

const openWhatsApp = (phone: string, message: string) => {
    const cleanedPhone = phone.replace(/\D/g, '');
    const fullPhone = cleanedPhone.startsWith('55') ? cleanedPhone : `55${cleanedPhone}`;
    const url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
}

export function OrderTable({ orders }: { orders: Order[] }) {
  const [filter, setFilter] = React.useState('');
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const filteredOrders = orders.filter(
    (order) =>
      order.nomeCliente.toLowerCase().includes(filter.toLowerCase()) ||
      order.codigoRastreio.toLowerCase().includes(filter.toLowerCase()) ||
      order.telefone.includes(filter)
  );
  
  const formatDate = (date: Date | Timestamp | undefined) => {
    if (!date) return 'N/A';
    const d = date instanceof Timestamp ? date.toDate() : date;
    return d.toLocaleDateString('pt-BR');
  }
  
  const handleSendNotification = (order: Order, type: 'payment_received' | 'payment_due') => {
    let message = '';
    const company = { linkBaseRastreio: 'https://seusite.com/rastreio/' }; // Placeholder
    const trackingLink = `${company.linkBaseRastreio}${order.codigoRastreio}`;

    if (type === 'payment_received') {
        message = `Olá, ${order.nomeCliente}. Sua encomenda ${order.codigoRastreio} foi marcada como entregue e paga. Agradecemos a preferência!`;
    } else { // payment_due
        message = `Olá, ${order.nomeCliente}. Sua encomenda ${order.codigoRastreio} foi entregue. Passando para lembrar sobre o pagamento pendente de ${formatCurrency(order.valorEntrega)}.`;
    }
    openWhatsApp(order.telefone, message);
    toast({
      title: 'Ação Requerida',
      description: 'Verifique o WhatsApp para enviar a mensagem.',
    });
  }
  
  const handleUpdatePaymentStatus = async (orderId: string, newPaidStatus: boolean) => {
    if (!firestore || !user) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Usuário não autenticado.' });
      return;
    }
    const orderRef = doc(firestore, 'companies', '1', 'orders', orderId);
    try {
        await updateDoc(orderRef, { pago: newPaidStatus });

        await triggerRevalidation(`/encomendas/${orderId}`);
        await triggerRevalidation('/encomendas');
        await triggerRevalidation('/financeiro');

        toast({
            title: 'Sucesso',
            description: `Status de pagamento atualizado.`,
        });

    } catch (error: any) {
         console.error("Error updating payment status:", error);
         toast({
            variant: 'destructive',
            title: 'Erro ao atualizar pagamento',
            description: error.message || 'Não foi possível atualizar o pagamento.',
         });
    }
  }

  const handleUpdateStatus = async (order: Order, newStatus: 'EM_ROTA' | 'ENTREGUE', newPaidStatus?: boolean) => {
    if (!firestore || !user) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Usuário não autenticado.' });
      return;
    }

    const orderRef = doc(firestore, 'companies', '1', 'orders', order.id);

    try {
      const updateData: any = {
        status: newStatus,
        timeline: arrayUnion({
          status: newStatus,
          at: new Date(),
          userId: user.uid,
        }),
      };

      if (typeof newPaidStatus === 'boolean') {
        updateData.pago = newPaidStatus;
      }
      
      await updateDoc(orderRef, updateData);

      await triggerRevalidation(`/encomendas/${order.id}`);
      await triggerRevalidation('/encomendas');
      await triggerRevalidation('/dashboard');
      await triggerRevalidation('/financeiro');

      toast({
        title: 'Sucesso',
        description: `Status da encomenda atualizado para ${newStatus}.`,
      });
      
      if (newStatus === 'ENTREGUE') {
        if (newPaidStatus === true) {
          handleSendNotification(order, 'payment_received');
        } else if (newPaidStatus === false) {
          handleSendNotification(order, 'payment_due');
        }
      }

    } catch (error: any) {
      console.error("Error updating status:", error);
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar',
        description: error.message || 'Não foi possível atualizar o status.',
      });
    }
  };

  
  const renderDropdownActions = (order: Order) => {
    const status = String(order.status).trim();
    
    if (status === 'PENDENTE') {
      return (
        <DropdownMenuItem onClick={() => handleUpdateStatus(order, 'EM_ROTA')}>
          <Truck className="mr-2 h-4 w-4" />
          Marcar como Em Rota
        </DropdownMenuItem>
      );
    } 
    
    if (status === 'EM_ROTA') {
      return (
        <>
          <DropdownMenuItem onClick={() => handleUpdateStatus(order, 'ENTREGUE', true)}>
            <PackageCheck className="mr-2 h-4 w-4" />
            Marcar como Entregue (Pago)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleUpdateStatus(order, 'ENTREGUE', false)}>
            <CreditCard className="mr-2 h-4 w-4" />
            Marcar como Entregue (Pendente)
          </DropdownMenuItem>
        </>
      );
    }
    
    if (status === 'ENTREGUE') {
      if (order.pago) {
        return (
          <>
            <DropdownMenuItem onClick={() => handleSendNotification(order, 'payment_received')}>
                <BadgeCent className="mr-2 h-4 w-4"/>
                Notificar Pagamento Recebido
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleUpdatePaymentStatus(order.id, false)}>
                <History className="mr-2 h-4 w-4" />
                Marcar como Pendente
            </DropdownMenuItem>
          </>
        );
      } else {
        return (
          <DropdownMenuItem onClick={() => handleSendNotification(order, 'payment_due')}>
            <Send className="mr-2 h-4 w-4"/>
            Enviar Cobrança
          </DropdownMenuItem>
        );
      }
    }
    
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="w-full max-w-sm">
        <Input 
          placeholder="Buscar por cliente, código ou telefone..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente / Destino</TableHead>
              <TableHead className="hidden lg:table-cell">Código</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Pagamento</TableHead>
              <TableHead className="hidden lg:table-cell">Data</TableHead>
              <TableHead>
                <span className="sr-only">Ações</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.length > 0 ? (
              filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <div className="font-medium">{order.nomeCliente}</div>
                    <div className="text-sm text-muted-foreground">{order.destino}</div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <Badge variant="outline">{order.codigoRastreio}</Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                         <div className="inline-block cursor-pointer">
                           <OrderStatusBadge status={order.status} />
                         </div>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuLabel>Ações Rápidas</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {renderDropdownActions(order)}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild><Link href={`/encomendas/${order.id}`}>Ver Detalhes</Link></DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex flex-col">
                      <span>
                        {formatCurrency(order.valorEntrega)}
                      </span>
                       <Badge variant={order.pago ? "default" : "secondary"} className={`w-fit text-xs ${order.pago ? 'bg-green-500/90' : ''}`}>
                          {order.pago ? 'Pago' : 'Pendente'}
                        </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {formatDate(order.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                        <Button asChild variant="ghost" size="icon">
                            <Link href={`/encomendas/${order.id}`}>
                                <ArrowRight className="h-4 w-4" />
                                <span className="sr-only">Ver Detalhes</span>
                            </Link>
                        </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  Nenhuma encomenda encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
