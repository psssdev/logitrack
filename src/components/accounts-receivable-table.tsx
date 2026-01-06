'use client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { Order } from '@/lib/types';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { triggerRevalidation } from '@/lib/actions';
import { useFirestore, useStore } from '@/firebase';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import { Timestamp } from 'firebase/firestore';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }

export function AccountsReceivableTable({ orders }: { orders: Order[] }) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { selectedStore } = useStore();

  const handleMarkAsPaid = async (order: Order) => {
    if (!firestore || !selectedStore) {
      toast({
        variant: 'destructive',
        title: 'Erro de conexão',
        description: 'Não foi possível conectar ao banco de dados.',
      });
      return;
    }
    const orderRef = doc(firestore, 'stores', selectedStore.id, 'orders', order.id);
    const remainingAmount = order.valorEntrega - (order.valorPago || 0);

    if (remainingAmount <= 0) {
        toast({ title: 'Aviso', description: 'Esta encomenda já está totalmente paga.'});
        return;
    }

    try {
      await updateDoc(orderRef, { 
        valorPago: order.valorEntrega,
        pagamentos: arrayUnion({
            valor: remainingAmount,
            forma: 'haver', // Assume 'haver' for this quick action
            data: new Date()
        })
      });
      await triggerRevalidation('/financeiro');
      await triggerRevalidation('/encomendas');
      toast({
        title: 'Sucesso!',
        description: 'Encomenda marcada como paga.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar',
        description: error.message,
      });
    }
  };

  const handleSendReceipt = (order: Order) => {
    const message = `Olá, ${order.nomeCliente}. Este é um lembrete sobre o pagamento pendente da sua encomenda ${order.codigoRastreio}, no valor de ${formatCurrency(order.valorEntrega - (order.valorPago || 0))}.`;
    
    const cleanedPhone = order.telefone.replace(/\D/g, '');
    const fullPhone = cleanedPhone.startsWith('55') ? cleanedPhone : `55${cleanedPhone}`;
    const url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');

    toast({
      title: 'Notificação de Cobrança',
      description: 'Verifique o WhatsApp para enviar a mensagem para o cliente.',
    });
  };
  
  const formatDate = (date: Date | Timestamp | undefined) => {
    if (!date) return 'Data desconhecida';
    const d = date instanceof Timestamp ? date.toDate() : date;
    return d.toLocaleDateString('pt-BR');
  }

  if (orders.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center rounded-md border-2 border-dashed p-12 text-center">
        <h3 className="text-lg font-medium">Tudo em ordem!</h3>
        <p className="text-sm text-muted-foreground">
          Nenhuma pendência de pagamento encontrada.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>Código</TableHead>
            <TableHead className="text-right">Valor Total</TableHead>
            <TableHead className="text-right">Valor Pendente</TableHead>
            <TableHead className="hidden sm:table-cell">Data</TableHead>
            <TableHead className="text-center">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="font-medium">{order.nomeCliente}</TableCell>
              <TableCell>{order.codigoRastreio}</TableCell>
              <TableCell className="text-right font-semibold">
                {formatCurrency(order.valorEntrega)}
              </TableCell>
               <TableCell className="text-right font-semibold text-destructive">
                {formatCurrency(order.valorEntrega - (order.valorPago || 0))}
              </TableCell>
              <TableCell className="hidden sm:table-cell">{formatDate(order.createdAt)}</TableCell>
              <TableCell className="text-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button aria-haspopup="true" size="icon" variant="ghost">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Toggle menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Ações</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => handleMarkAsPaid(order)}>
                      Marcar como Pago
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSendReceipt(order)}>
                      Notificar Cliente
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href={`/encomendas/${order.id}`}>Ver Encomenda</Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
