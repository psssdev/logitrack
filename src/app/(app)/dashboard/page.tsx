'use client';

import Link from 'next/link';
import {
  ArrowRight,
  Package,
  PackageCheck,
  PlusCircle,
  Truck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { OrderStatusBadge } from '@/components/status-badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { Order } from '@/lib/types';
import { getDashboardSummary } from '@/lib/actions';
import {
  useCollection,
  useFirestore,
  useMemoFirebase,
  useUser,
} from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState } from 'react';

// Main component that fetches server-side data
export default function DashboardPage() {
  const [summary, setSummary] = useState({ total: 0, pendentes: 0, emRota: 0, entregues: 0 });
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);

  useEffect(() => {
    async function fetchSummary() {
      setIsLoadingSummary(true);
      const summaryData = await getDashboardSummary();
      setSummary(summaryData);
      setIsLoadingSummary(false);
    }
    fetchSummary();
  }, []);

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold md:text-3xl">Dashboard</h1>
        <Button asChild>
          <Link href="/encomendas/nova">
            <PlusCircle className="mr-2 h-4 w-4" />
            Nova Encomenda
          </Link>
        </Button>
      </div>

      {isLoadingSummary ? (
         <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card><CardHeader><Skeleton className="h-5 w-2/3" /></CardHeader><CardContent><Skeleton className="h-8 w-1/4" /></CardContent></Card>
            <Card><CardHeader><Skeleton className="h-5 w-2/3" /></CardHeader><CardContent><Skeleton className="h-8 w-1/4" /></CardContent></Card>
            <Card><CardHeader><Skeleton className="h-5 w-2/3" /></CardHeader><CardContent><Skeleton className="h-8 w-1/4" /></CardContent></Card>
            <Card><CardHeader><Skeleton className="h-5 w-2/3" /></CardHeader><CardContent><Skeleton className="h-8 w-1/4" /></CardContent></Card>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{summary.pendentes}</div>
                <p className="text-xs text-muted-foreground">
                Aguardando para sair para entrega
                </p>
            </CardContent>
            </Card>
            <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Em Rota</CardTitle>
                <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{summary.emRota}</div>
                <p className="text-xs text-muted-foreground">Encomendas em trânsito</p>
            </CardContent>
            </Card>
            <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Entregues</CardTitle>
                <PackageCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{summary.entregues}</div>
                <p className="text-xs text-muted-foreground">
                Total de entregas concluídas
                </p>
            </CardContent>
            </Card>
            <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                Total de Encomendas
                </CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{summary.total}</div>
                <p className="text-xs text-muted-foreground">
                Total de registros no sistema
                </p>
            </CardContent>
            </Card>
        </div>
      )}


      <RecentOrders />
    </>
  );
}

// Client component to fetch recent orders
function RecentOrders() {
  const firestore = useFirestore();
  const { isUserLoading } = useUser();

  const recentOrdersQuery = useMemoFirebase(() => {
    if (!firestore || isUserLoading) return null;
    return query(
      collection(firestore, 'companies', '1', 'orders'),
      orderBy('createdAt', 'desc'),
      limit(5)
    );
  }, [firestore, isUserLoading]);

  const { data: recentOrders, isLoading: loadingOrders } =
    useCollection<Order>(recentOrdersQuery);

  const isLoading = loadingOrders || isUserLoading;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Encomendas Recentes</CardTitle>
        <CardDescription>
          As 5 encomendas mais recentes registradas no sistema.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton className="h-48 w-full" />}
        {recentOrders && <RecentOrdersTable orders={recentOrders} />}
        {!isLoading && recentOrders?.length === 0 && (
          <p className="text-sm text-muted-foreground text-center p-4">
            Nenhuma encomenda recente encontrada.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function RecentOrdersTable({ orders }: { orders: Order[] }) {
  const formatValue = (value: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead className="hidden md:table-cell">Código</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden md:table-cell">Valor</TableHead>
            <TableHead>
              <span className="sr-only">Ações</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell>
                <div className="font-medium">{order.nomeCliente}</div>
                <div className="hidden text-sm text-muted-foreground md:inline">
                  {order.telefone}
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <Badge variant="outline">{order.codigoRastreio}</Badge>
              </TableCell>
              <TableCell>
                <OrderStatusBadge status={order.status} />
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {formatValue(order.valorEntrega)}
              </TableCell>
              <TableCell>
                <Button asChild variant="ghost" size="icon">
                  <Link href={`/encomendas/${order.id}`}>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}


function DashboardSkeleton() {
    return (
        <div className="animate-pulse">
            <div className="flex items-center justify-between">
                <Skeleton className="h-9 w-1/3" />
                <Skeleton className="h-10 w-36" />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-4">
                <Card><CardHeader><Skeleton className="h-5 w-2/3" /></CardHeader><CardContent><Skeleton className="h-8 w-1/4" /></CardContent></Card>
                <Card><CardHeader><Skeleton className="h-5 w-2/3" /></CardHeader><CardContent><Skeleton className="h-8 w-1/4" /></CardContent></Card>
                <Card><CardHeader><Skeleton className="h-5 w-2/3" /></CardHeader><CardContent><Skeleton className="h-8 w-1/4" /></CardContent></Card>
                <Card><CardHeader><Skeleton className="h-5 w-2/3" /></CardHeader><CardContent><Skeleton className="h-8 w-1/4" /></CardContent></Card>
            </div>
            <Card className="mt-6">
                <CardHeader><Skeleton className="h-6 w-1/4" /><Skeleton className="h-4 w-1/2 mt-2" /></CardHeader>
                <CardContent><Skeleton className="h-48 w-full" /></CardContent>
            </Card>
        </div>
    )
}
