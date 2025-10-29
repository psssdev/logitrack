'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import type { Order } from '@/lib/types';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { AccountsReceivableTable } from '@/components/accounts-receivable-table';
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
import { doc, updateDoc } from 'firebase/firestore';
import { triggerRevalidation } from '@/lib/actions';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import Link from 'next/link';

const COMPANY_ID = '1';

export default function FinanceiroPage() {
  const firestore = useFirestore();
  const { isUserLoading } = useUser();

  const allOrdersQuery = useMemoFirebase(() => {
    if (!firestore || isUserLoading) return null;
    return query(collection(firestore, 'companies', COMPANY_ID, 'orders'));
  }, [firestore, isUserLoading]);

  const { data: allOrders, isLoading } = useCollection<Order>(allOrdersQuery);
  const pageIsLoading = isLoading || isUserLoading;

  const { receivableOrders, totalReceivable, totalReceivedInMonth, receivedOrdersCountInMonth } = useMemo(() => {
    if (!allOrders) {
      return { receivableOrders: [], totalReceivable: 0, totalReceivedInMonth: 0, receivedOrdersCountInMonth: 0 };
    }

    const receivable = allOrders.filter(o => (o.valorPago || 0) < o.valorEntrega);
    const totalReceivableAmount = receivable.reduce((acc, order) => acc + (order.valorEntrega - (order.valorPago || 0)), 0);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    
    let monthlyTotal = 0;
    const monthlyPaidOrders = new Set<string>();

    allOrders.forEach(order => {
        if(order.pagamentos) {
            order.pagamentos.forEach(p => {
                const paymentDate = p.data instanceof Timestamp ? p.data.toDate() : new Date(p.data);
                if(paymentDate >= startOfMonth && paymentDate <= endOfMonth) {
                    monthlyTotal += p.valor;
                    monthlyPaidOrders.add(order.id);
                }
            })
        }
    });


    return {
      receivableOrders: receivable,
      totalReceivable: totalReceivableAmount,
      totalReceivedInMonth: monthlyTotal,
      receivedOrdersCountInMonth: monthlyPaidOrders.size
    };
  }, [allOrders]);


  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center">
        <h1 className="flex-1 text-2xl font-semibold md:text-3xl">
          Financeiro
        </h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total a Receber
            </CardTitle>
            <span className="text-muted-foreground">$</span>
          </CardHeader>
          <CardContent>
            {pageIsLoading ? (
              <Skeleton className="h-8 w-1/2" />
            ) : (
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(totalReceivable)}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              de {receivableOrders?.length || 0} encomenda(s) com pendências
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recebido no Mês</CardTitle>
            <span className="text-muted-foreground">$</span>
          </CardHeader>
          <CardContent>
            {pageIsLoading ? (
              <Skeleton className="h-8 w-1/2" />
            ) : (
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(totalReceivedInMonth)}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              de {receivedOrdersCountInMonth || 0} encomenda(s) que tiveram pagamento
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contas a Receber</CardTitle>
          <CardDescription>
            Lista de todas as encomendas com pagamentos pendentes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pageIsLoading && <Skeleton className="h-64 w-full" />}
          {receivableOrders && !pageIsLoading && (
            <AccountsReceivableTable orders={receivableOrders} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
