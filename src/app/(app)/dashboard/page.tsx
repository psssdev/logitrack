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
  CardDescription
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
import { useEffect, useState } from 'react';
import { getDashboardSummary } from '@/lib/actions';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';


export default function DashboardPage() {
    const [summary, setSummary] = useState({ total: 0, pendentes: 0, emRota: 0, entregues: 0 });
    const [loadingSummary, setLoadingSummary] = useState(true);
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

    const { data: recentOrders, isLoading: loadingOrders } = useCollection<Order>(recentOrdersQuery);
    
    useEffect(() => {
        if (isUserLoading) return;
        async function fetchSummary() {
            setLoadingSummary(true);
            const summaryData = await getDashboardSummary();
            setSummary(summaryData);
            setLoadingSummary(false);
        }
        fetchSummary();
    }, [isUserLoading]);

    const isLoading = loadingOrders || isUserLoading;

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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingSummary || isUserLoading ? <Skeleton className="h-8 w-1/4" /> : <div className="text-2xl font-bold">{summary.pendentes}</div>}
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
            {loadingSummary || isUserLoading ? <Skeleton className="h-8 w-1/4" /> : <div className="text-2xl font-bold">{summary.emRota}</div>}
            <p className="text-xs text-muted-foreground">
              Encomendas em trânsito
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entregues</CardTitle>
            <PackageCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingSummary || isUserLoading ? <Skeleton className="h-8 w-1/4" /> : <div className="text-2xl font-bold">{summary.entregues}</div>}
            <p className="text-xs text-muted-foreground">
              Total de entregas concluídas
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Encomendas</CardTitle>
             <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             {loadingSummary || isUserLoading ? <Skeleton className="h-8 w-1/4" /> : <div className="text-2xl font-bold">{summary.total}</div>}
            <p className="text-xs text-muted-foreground">
              Total de registros no sistema
            </p>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Encomendas Recentes</CardTitle>
          <CardDescription>As 5 encomendas mais recentes registradas no sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && <Skeleton className="h-48 w-full" />}
          {recentOrders && <RecentOrdersTable orders={recentOrders} />}
          {!isLoading && recentOrders?.length === 0 && (
             <p className="text-sm text-muted-foreground text-center p-4">Nenhuma encomenda recente encontrada.</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function RecentOrdersTable({ orders }: { orders: Order[] }) {
  const formatValue = (value: number) => new Intl.NumberFormat('pt-BR', {
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
