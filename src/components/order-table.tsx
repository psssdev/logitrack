'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  MoreHorizontal,
  ArrowRight,
  Truck,
  PackageCheck,
  CreditCard,
  Send,
  BadgeCent,
  History,
  PackageX,
  Loader2,
} from 'lucide-react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Order } from '@/lib/types';
import { OrderStatusBadge } from './status-badge';
import { Input } from './ui/input';
import { Timestamp, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser } from '@/firebase';
import { triggerRevalidation } from '@/lib/actions';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

const paymentMethodLabels: Record<string, string> = {
  pix: 'PIX',
  dinheiro: 'Dinheiro',
  cartao: 'Cartão',
  boleto: 'Boleto',
  link: 'Link',
  haver: 'A Haver',
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const openWhatsApp = (phone: string, message: string) => {
  const cleanedPhone = phone.replace(/\D/g, '');
  const fullPhone = cleanedPhone.startsWith('55')
    ? cleanedPhone
    : `55${cleanedPhone}`;
  const url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
};

export function OrderTable({ orders }: { orders: Order[] }) {
  const [filter, setFilter] = React.useState('');
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const [isUpdating, setIsUpdating] = React.useState<string | null>(null);

  // State for the payment dialog
  const [paymentDialogOpen, setPaymentDialogOpen] = React.useState(false);
  const [orderForPayment, setOrderForPayment] = React.useState<Order | null>(null);
  const [amountReceived, setAmountReceived] = React.useState<number | string>('');
  const [paymentMethod, setPaymentMethod] = React.useState<string>('dinheiro');

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
  };

  const handleSendNotification = (
    order: Order,
    type: 'payment_received' | 'payment_due' | 'cancellation',
    paymentDetails?: { amount: number; method: string }
  ) => {
    let message = '';
    const company = { linkBaseRastreio: 'https://seusite.com/rastreio/' }; // Placeholder
    const trackingLink = `${company.linkBaseRastreio}${order.codigoRastreio}`;

    if (type === 'payment_received') {
      message = `Olá, ${
        order.nomeCliente
      }. Recebemos o pagamento da sua encomenda ${
        order.codigoRastreio
      }. Agradecemos a preferência!`;
    } else if (type === 'payment_due') {
      const totalValue = formatCurrency(order.valorEntrega);
      const paidValue = formatCurrency(paymentDetails?.amount || 0);
      const pendingAmount = formatCurrency(order.valorEntrega - (order.valorPago || 0) - (paymentDetails?.amount || 0));

      message = `Olá, ${order.nomeCliente}. Sua encomenda ${order.codigoRastreio} foi entregue. Do valor total de ${totalValue}, foi recebido ${paidValue}, restando um saldo pendente de ${pendingAmount}.`;

    } else if (type === 'cancellation') {
      message = `Olá, ${order.nomeCliente}. Sua encomenda ${order.codigoRastreio} foi cancelada. Caso tenha alguma dúvida, por favor, entre em contato.`;
    }
    openWhatsApp(order.telefone, message);
    toast({
      title: 'Ação Requerida',
      description: 'Verifique o WhatsApp para enviar a mensagem.',
    });
  };

  const handleUpdatePaymentStatus = async (
    orderId: string,
    newPaidStatus: boolean
  ) => {
    if (!firestore || !user) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Usuário não autenticado.',
      });
      return;
    }
    setIsUpdating(orderId);
    const orderRef = doc(firestore, 'companies', '1', 'orders', orderId);
    try {
      // To mark as pending, we remove the "pago" status by setting it to false.
      // And we reset the valorPago to 0, and clear the pagamentos array.
      // This is a destructive action for now. A better implementation might "archive" the payments.
      await updateDoc(orderRef, {
        valorPago: newPaidStatus ? (filteredOrders.find(o => o.id === orderId)?.valorEntrega || 0) : 0,
        // if we are un-paying, we should probably clear the payment history too.
        pagamentos: newPaidStatus ? arrayUnion({
            valor: filteredOrders.find(o => o.id === orderId)?.valorEntrega,
            forma: 'haver',
            data: new Date()
        }) : []
      });

      await triggerRevalidation(`/encomendas/${orderId}`);
      await triggerRevalidation('/encomendas');
      await triggerRevalidation('/financeiro');

      toast({
        title: 'Sucesso',
        description: `Status de pagamento atualizado.`,
      });
    } catch (error: any) {
      console.error('Error updating payment status:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar pagamento',
        description: error.message || 'Não foi possível atualizar o pagamento.',
      });
    } finally {
        setIsUpdating(null);
    }
  };

  const handleUpdateStatus = async (
    order: Order,
    newStatus: 'EM_ROTA' | 'ENTREGUE' | 'CANCELADA',
    paymentDetails?: { amount: number; method: string }
  ) => {
    if (!firestore || !user) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Usuário não autenticado.',
      });
      return;
    }
    setIsUpdating(order.id);
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
      
      let finalPaidStatus: boolean | undefined = undefined;

      if (newStatus === 'ENTREGUE' && paymentDetails) {
        const newTotalPaid = (order.valorPago || 0) + paymentDetails.amount;
        updateData.valorPago = newTotalPaid;
        updateData.pagamentos = arrayUnion({
            valor: paymentDetails.amount,
            forma: paymentDetails.method,
            data: new Date()
        });
        
        finalPaidStatus = newTotalPaid >= order.valorEntrega;
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
      
      // Send notifications AFTER status update
      if (newStatus === 'ENTREGUE') {
          if (finalPaidStatus === true) {
              handleSendNotification(order, 'payment_received');
          } else if (finalPaidStatus === false) {
              handleSendNotification(order, 'payment_due', paymentDetails);
          }
      } else if (newStatus === 'CANCELADA') {
          handleSendNotification(order, 'cancellation');
      }

    } catch (error: any) {
      console.error('Error updating status:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar',
        description: error.message || 'Não foi possível atualizar o status.',
      });
    } finally {
      setIsUpdating(null);
    }
  };
  
  const openPaymentDialog = (order: Order) => {
    const remainingAmount = order.valorEntrega - (order.valorPago || 0);
    setOrderForPayment(order);
    setAmountReceived(remainingAmount > 0 ? remainingAmount : 0);
    setPaymentMethod('dinheiro');
    setPaymentDialogOpen(true);
  }

  const handleConfirmPayment = () => {
      if (!orderForPayment) return;
      const parsedAmount = typeof amountReceived === 'string' ? parseFloat(amountReceived) : amountReceived;
      if (isNaN(parsedAmount) || parsedAmount < 0) {
          toast({ variant: 'destructive', title: 'Valor Inválido', description: 'Por favor, insira um valor de pagamento válido.'});
          return;
      }
      handleUpdateStatus(orderForPayment, 'ENTREGUE', { amount: parsedAmount, method: paymentMethod });
      setPaymentDialogOpen(false);
  }

  function renderDropdownActions(order: Order) {
    if (order.status === 'PENDENTE') {
      return (
        <>
          <DropdownMenuItem
            onClick={() => handleUpdateStatus(order, 'EM_ROTA')}
            disabled={isUpdating === order.id}
          >
            <Truck className="mr-2 h-4 w-4" />
            Marcar como Em Rota
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => handleUpdateStatus(order, 'CANCELADA')}
            disabled={isUpdating === order.id}
          >
            <PackageX className="mr-2 h-4 w-4" />
            Cancelar Encomenda
          </DropdownMenuItem>
        </>
      );
    }

    if (order.status === 'EM_ROTA') {
      return (
        <>
          <DropdownMenuItem
            onClick={() => openPaymentDialog(order)}
            disabled={isUpdating === order.id}
          >
            <PackageCheck className="mr-2 h-4 w-4" />
            Marcar como Entregue
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => handleUpdateStatus(order, 'CANCELADA')}
            disabled={isUpdating === order.id}
          >
            <PackageX className="mr-2 h-4 w-4" />
            Cancelar Encomenda
          </DropdownMenuItem>
        </>
      );
    }

    const isPaid = (order.valorPago || 0) >= order.valorEntrega;

    if (order.status === 'ENTREGUE') {
        if (isPaid) {
            return (
                <>
                <DropdownMenuItem
                    onClick={() => handleSendNotification(order, 'payment_received')}
                >
                    <BadgeCent className="mr-2 h-4 w-4" />
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
                <>
                <DropdownMenuItem onClick={() => openPaymentDialog(order)}>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Registrar Pagamento
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => handleSendNotification(order, 'payment_due')}
                >
                    <Send className="mr-2 h-4 w-4" />
                    Enviar Cobrança
                </DropdownMenuItem>
                </>
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
                <TableRow key={order.id} data-state={isUpdating === order.id ? 'active' : ''} className="data-[state=active]:opacity-50">
                  <TableCell>
                    <div className="font-medium">{order.nomeCliente}</div>
                    <div className="text-sm text-muted-foreground">
                      {order.destino.full}
                    </div>
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
                        <DropdownMenuItem asChild>
                          <Link href={`/encomendas/${order.id}`}>
                            Ver Detalhes
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex flex-col">
                      <span>{formatCurrency(order.valorEntrega)}</span>
                      <Badge
                        variant={
                          (order.valorPago || 0) >= order.valorEntrega
                            ? 'default'
                            : 'secondary'
                        }
                        className={`w-fit text-xs ${
                          (order.valorPago || 0) >= order.valorEntrega
                            ? 'bg-green-500/90'
                            : ''
                        }`}
                      >
                        {(order.valorPago || 0) >= order.valorEntrega
                          ? 'Pago'
                          : `Pendente: ${formatCurrency(order.valorEntrega - (order.valorPago || 0))}`}
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

       <AlertDialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Registrar Pagamento</AlertDialogTitle>
            <AlertDialogDescription>
              Encomenda: <span className="font-mono">{orderForPayment?.codigoRastreio}</span>
              <br />
              Valor total: <span className="font-semibold">{formatCurrency(orderForPayment?.valorEntrega || 0)}</span>
              <br />
              Valor pendente: <span className="font-semibold text-destructive">{formatCurrency((orderForPayment?.valorEntrega || 0) - (orderForPayment?.valorPago || 0))}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">
                Valor Recebido
              </Label>
              <Input
                id="amount"
                type="number"
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="payment-method" className="text-right">
                Forma
              </Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(paymentMethodLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmPayment} disabled={isUpdating !== null}>
              {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
              Confirmar e Concluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
