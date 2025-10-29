
'use client';

import * as React from 'react';
import Link from 'next/link';
import { MoreHorizontal, ArrowRight, Truck, PackageCheck, CreditCard, Send } from 'lucide-react';
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
import { Timestamp, doc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser } from '@/firebase';
import { triggerRevalidation } from '@/lib/actions';

const paymentMethodLabels: Record<string, string> = {
  pix: 'PIX',
  dinheiro: 'Dinheiro',
  cartao: 'Cartão',
  boleto: 'Boleto',
  link: 'Link',
  haver: 'A Haver',
};

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
          at: serverTimestamp(),
          userId: user.uid,
        }),
      };

      if (typeof newPaidStatus === 'boolean') {
        updateData.pago = newPaidStatus;
      }
      
      await updateDoc(orderRef, updateData);

      // Revalidate paths to reflect changes
      await triggerRevalidation(`/encomendas/${order.id}`);
      await triggerRevalidation('/encomendas');
      await triggerRevalidation('/dashboard');
      await triggerRevalidation('/financeiro');

      toast({
        title: 'Sucesso',
        description: `Status da encomenda atualizado para ${newStatus}.`,
      });
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar',
        description: error.message || 'Não foi possível atualizar o status.',
      });
    }
  };

  const handleSendReminder = (order: Order) => {
    const message = `Olá, ${order.nomeCliente}. Passando para lembrar da sua pendência de ${formatCurrency(order.valorEntrega)} referente à encomenda ${order.codigoRastreio}.`;
    openWhatsApp(order.telefone, message);
    toast({
      title: 'Ação Requerida',
      description: 'Verifique o WhatsApp para enviar a mensagem de cobrança.',
    });
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
                        <DropdownMenuLabel>Mudar Status</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {order.status === 'PENDENTE' && (
                            <DropdownMenuItem onClick={() => handleUpdateStatus(order, 'EM_ROTA')}>
                                <Truck className="mr-2 h-4 w-4" />
                                Marcar como Em Rota
                            </DropdownMenuItem>
                        )}
                         {order.status === 'EM_ROTA' && (
                            <>
                                <DropdownMenuItem onClick={() => handleUpdateStatus(order, 'ENTREGUE', true)}>
                                    <PackageCheck className="mr-2 h-4 w-4" />
                                    Entregue (Pago)
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleUpdateStatus(order, 'ENTREGUE', false)}>
                                    <CreditCard className="mr-2 h-4 w-4" />
                                    Entregue (Pendente)
                                </DropdownMenuItem>
                            </>
                        )}
                        {order.status !== 'PENDENTE' && order.status !== 'EM_ROTA' && (
                            <DropdownMenuItem disabled>Sem ações de status</DropdownMenuItem>
                        )}
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
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuItem asChild><Link href={`/encomendas/${order.id}`}>Ver Detalhes</Link></DropdownMenuItem>
                            {order.formaPagamento === 'haver' && !order.pago && (
                                <>
                                 <DropdownMenuSeparator />
                                 <DropdownMenuItem onClick={() => handleSendReminder(order)}>
                                    <Send className="mr-2 h-4 w-4"/>
                                    Enviar Cobrança
                                </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                        </DropdownMenu>
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
