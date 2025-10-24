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
import { collection, query, where, orderBy } from 'firebase/firestore';
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
      where('pago', '==', false),
      orderBy('createdAt', 'desc')
    );
  }, [firestore]);

  const { data: orders, isLoading } =
    useCollection<Order>(accountsReceivableQuery);
    
  const totalReceivable = orders?.reduce((acc, order) => acc + order.valorEntrega, 0) || 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center">
        <h1 className="flex-1 text-2xl font-semibold md:text-3xl">
          Contas a Receber
        </h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total a Receber</CardTitle>
                <span className="text-muted-foreground">$</span>
            </CardHeader>
            <CardContent>
                {isLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalReceivable)}</div>}
                <p className="text-xs text-muted-foreground">de {orders?.length || 0} encomenda(s)</p>
            </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Encomendas Pendentes de Pagamento</CardTitle>
          <CardDescription>
            Lista de todas as encomendas com pagamento "A Haver" que ainda não
            foram quitadas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && <Skeleton className="h-64 w-full" />}
          {orders && <AccountsReceivableTable orders={orders} />}
        </CardContent>
      </Card>
    </div>
  );
}
