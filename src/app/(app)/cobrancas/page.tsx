'use client';

import React, { useMemo } from 'react';
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
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where, doc, updateDoc } from 'firebase/firestore';
import type { Order } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Timestamp } from 'firebase/firestore';
import { triggerRevalidation } from '@/lib/actions';
import { CircleDollarSign } from 'lucide-react';

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

export default function CobrancasPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  const pendingOrdersQuery = useMemoFirebase(() => {
    if (!firestore || !user || isUserLoading) return null;
    return query(
      collection(firestore, 'companies', COMPANY_ID, 'orders'),
      where('formaPagamento', '==', 'haver'),
      where('pago', '==', false)
    );
  }, [firestore, user, isUserLoading]);

  const { data: pendingOrders, isLoading } = useCollection<Order>(pendingOrdersQuery);
  const pageIsLoading = isLoading || isUserLoading;

  const totalPending = useMemo(() => {
    return pendingOrders?.reduce((acc, order) => acc + order.valorEntrega, 0) || 0;
  }, [pendingOrders]);

  const handleMarkAsPaid = async (orderId: string) => {
    if (!firestore) return;
    const orderRef = doc(firestore, 'companies', COMPANY_ID, 'orders', orderId);
    try {
      await updateDoc(orderRef, { pago: true });
      await triggerRevalidation('/cobrancas');
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

  return (
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
                    <TableHead className="text-right">Ação</TableHead>
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
                          <Button
                            size="sm"
                            onClick={() => handleMarkAsPaid(order.id)}
                          >
                            <CircleDollarSign className="mr-2 h-4 w-4" />
                            Marcar como Pago
                          </Button>
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
  );
}