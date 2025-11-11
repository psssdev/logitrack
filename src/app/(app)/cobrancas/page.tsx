'use client';

import React, { useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where, doc, updateDoc } from 'firebase/firestore';
import type { Order, Company } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Timestamp } from 'firebase/firestore';
import { triggerRevalidation } from '@/lib/actions';
import { MessageCircle, CircleDollarSign } from 'lucide-react';
import { RecordPaymentDialog } from '@/components/record-payment-dialog';

const COMPANY_ID = '1';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const formatDate = (date: Date | Timestamp) => {
  if (date instanceof Timestamp) {
    return date.toDate().toLocaleDateString('pt-BR');
  }
  return new Date(date).toLocaleDateString('pt-BR');
};

const openWhatsApp = (phone: string, message: string) => {
  const cleanedPhone = phone.replace(/\D/g, '');
  const fullPhone = cleanedPhone.startsWith('55') ? cleanedPhone : `55${cleanedPhone}`;
  const url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
};


export default function CobrancasPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);

  const pendingOrdersQuery = useMemoFirebase(() => {
    if (!firestore || !user || isUserLoading) return null;
    return query(
      collection(firestore, 'companies', COMPANY_ID, 'orders'),
      where('formaPagamento', '==', 'haver'),
      where('pago', '==', false)
    );
  }, [firestore, user, isUserLoading]);

  const companyRef = useMemoFirebase(() => {
    if (!firestore || !user || isUserLoading) return null;
    return doc(firestore, 'companies', COMPANY_ID);
  }, [firestore, user, isUserLoading]);

  const { data: pendingOrders, isLoading: isLoadingOrders } = useCollection<Order>(pendingOrdersQuery);
  const { data: company, isLoading: isLoadingCompany } = useDoc<Company>(companyRef);

  const pageIsLoading = isLoadingOrders || isLoadingCompany || isUserLoading;

  const totalPending = useMemo(() => {
    return pendingOrders?.reduce((acc, order) => acc + order.valorEntrega, 0) || 0;
  }, [pendingOrders]);

  const handleOpenPaymentDialog = (order: Order) => {
    setSelectedOrder(order);
    setIsPaymentDialogOpen(true);
  };
  
  const handleSendReminder = (order: Order) => {
    if (!company) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Configurações da empresa não carregadas.' });
      return;
    }

    const template = company.msgCobranca || 'Olá, {cliente}! Passando para lembrar da sua pendência no valor de {valor} referente à encomenda {codigo}. Agradecemos a sua atenção!';
    
    const message = template
      .replace('{cliente}', order.nomeCliente)
      .replace('{valor}', formatCurrency(order.valorEntrega))
      .replace('{codigo}', order.codigoRastreio);

    openWhatsApp(order.telefone, message);
    toast({ title: 'Lembrete de Cobrança', description: 'Abrindo WhatsApp para enviar a mensagem.' });
  }

  const handlePaymentRecorded = async () => {
    // This will just trigger a re-fetch of the collection by the hook
    await triggerRevalidation('/cobrancas');
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex items-center">
          <h1 className="flex-1 text-2xl font-semibold md:text-3xl">Cobranças</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pagamentos Pendentes</CardTitle>
            <CardDescription>
              Lista de todas as encomendas com a forma de pagamento "A Haver" que
              ainda não foram pagas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 text-2xl font-bold">
              Total a Receber: {formatCurrency(totalPending)}
            </div>
            {pageIsLoading && <Skeleton className="h-48 w-full" />}
            {!pageIsLoading && pendingOrders && (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-center">Status Pagamento</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingOrders.length > 0 ? (
                      pendingOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">
                            {order.nomeCliente}
                          </TableCell>
                          <TableCell>{formatDate(order.createdAt)}</TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(order.valorEntrega)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="destructive">Pendente</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                             <div className="flex justify-end gap-2">
                                <Button variant="outline" size="sm" onClick={() => handleSendReminder(order)}>
                                    <MessageCircle className="h-4 w-4 mr-2" />
                                    Cobrar
                                </Button>
                                <Button variant="default" size="sm" onClick={() => handleOpenPaymentDialog(order)}>
                                    <CircleDollarSign className="h-4 w-4 mr-2" />
                                    Pagar
                                </Button>
                             </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="h-24 text-center text-muted-foreground"
                        >
                          Nenhuma cobrança pendente encontrada.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

       {selectedOrder && (
         <RecordPaymentDialog
          order={selectedOrder}
          isOpen={isPaymentDialogOpen}
          setIsOpen={setIsPaymentDialogOpen}
          onPaymentRecorded={handlePaymentRecorded}
        />
       )}
    </>
  );
}
