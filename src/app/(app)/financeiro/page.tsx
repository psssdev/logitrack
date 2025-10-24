'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
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

  const accountsReceivableQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'companies', COMPANY_ID, 'orders'),
      where('formaPagamento', '==', 'haver'),
      where('pago', '==', false)
    );
  }, [firestore]);
  
  const { data: receivableOrders, isLoading: isLoadingReceivable } = useCollection<Order>(accountsReceivableQuery);
  const totalReceivable = receivableOrders?.reduce((acc, order) => acc + order.valorEntrega, 0) || 0;


  const receivedInMonthQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    const now = new Date();
    const startOfMonth = Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth(), 1));
    const endOfMonth = Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59));

    return query(
      collection(firestore, 'companies', COMPANY_ID, 'orders'),
      where('pago', '==', true),
      where('createdAt', '>=', startOfMonth),
      where('createdAt', '<=', endOfMonth)
    );
  }, [firestore]);

  const { data: receivedOrders, isLoading: isLoadingReceived } = useCollection<Order>(receivedInMonthQuery);
  const totalReceivedInMonth = receivedOrders?.reduce((acc, order) => acc + order.valorEntrega, 0) || 0;

  const isLoading = isLoadingReceivable || isLoadingReceived;

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
                <CardTitle className="text-sm font-medium">Total a Receber</CardTitle>
                <span className="text-muted-foreground">$</span>
            </CardHeader>
            <CardContent>
                {isLoadingReceivable ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalReceivable)}</div>}
                <p className="text-xs text-muted-foreground">de {receivableOrders?.length || 0} encomenda(s)</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recebido no Mês</CardTitle>
                <span className="text-muted-foreground">$</span>
            </CardHeader>
            <CardContent>
                {isLoadingReceived ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalReceivedInMonth)}</div>}
                <p className="text-xs text-muted-foreground">de {receivedOrders?.length || 0} encomenda(s) quitadas</p>
            </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contas a Receber</CardTitle>
          <CardDescription>
            Lista de todas as encomendas com pagamento "A Haver" que ainda não
            foram quitadas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingReceivable && <Skeleton className="h-64 w-full" />}
          {receivableOrders && <AccountsReceivableTable orders={receivableOrders} />}
        </CardContent>
      </Card>
    </div>
  );
}
