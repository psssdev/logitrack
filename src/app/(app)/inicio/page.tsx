'use client';

import Link from 'next/link';
import {
  Package,
  PackageCheck,
  PlusCircle,
  Truck,
  PackageX,
} from 'lucide-react';
import { Pie, PieChart, Cell } from 'recharts';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo } from 'react';
import type { Client, Order } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { useStore } from '@/contexts/store-context';

interface TopClient extends Client {
  orderCount: number;
  totalValue: number;
}

const formatCurrency = (value: number) => {
  if (typeof value !== 'number') return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export default function InicioPage() {
  const firestore = useFirestore();
  const { isUserLoading } = useUser();
  const { selectedStore } = useStore();

  const ordersQuery = useMemoFirebase(() => {
    if (!firestore || !selectedStore) return null;
    return query(collection(firestore, 'stores', selectedStore.id, 'orders'));
  }, [firestore, selectedStore]);

  const clientsQuery = useMemoFirebase(() => {
    if (!firestore || !selectedStore) return null;
    return query(collection(firestore, 'stores', selectedStore.id, 'clients'));
  }, [firestore, selectedStore]);

  const { data: orders, isLoading: isLoadingOrders } = useCollection<Order>(ordersQuery);
  const { data: clients, isLoading: isLoadingClients } = useCollection<Client>(clientsQuery);

  const isLoading = isLoadingOrders || isLoadingClients || isUserLoading || !selectedStore;

  const { summary, topClients } = useMemo(() => {
    if (!orders || !clients) {
      return {
        summary: { total: 0, pendentes: 0, emRota: 0, entregues: 0, canceladas: 0 },
        topClients: [],
      };
    }

    const summaryData = orders.reduce(
      (acc, order) => {
        acc.total++;
        if (order.status === 'PENDENTE') acc.pendentes++;
        else if (order.status === 'EM_ROTA') acc.emRota++;
        else if (order.status === 'ENTREGUE') acc.entregues++;
        else if (order.status === 'CANCELADA') acc.canceladas++;
        return acc;
      },
      { total: 0, pendentes: 0, emRota: 0, entregues: 0, canceladas: 0 }
    );

    const clientPerformance = clients.map(client => {
      const clientOrders = orders.filter(o => o.clientId === client.id);
      const totalValue = clientOrders.reduce((sum, o) => sum + o.valorEntrega, 0);
      return {
        ...client,
        orderCount: clientOrders.length,
        totalValue
      }
    }).sort((a, b) => b.totalValue - a.totalValue).slice(0, 5);

    return { summary: summaryData, topClients: clientPerformance };
  }, [orders, clients]);

  const chartData = useMemo(
    () =>
      [
        {
          name: 'Pendentes',
          value: summary.pendentes,
          fill: 'hsl(var(--chart-2))',
        },
        { name: 'Em Rota', value: summary.emRota, fill: 'hsl(var(--chart-3))' },
        {
          name: 'Entregues',
          value: summary.entregues,
          fill: 'hsl(var(--chart-1))',
        },
        {
          name: 'Canceladas',
          value: summary.canceladas,
          fill: 'hsl(var(--chart-4))',
        },
      ].filter((item) => item.value > 0),
    [summary]
  );

  const chartConfig = {
    pendentes: { label: 'Pendentes', color: 'hsl(var(--chart-2))' },
    emRota: { label: 'Em Rota', color: 'hsl(var(--chart-3))' },
    entregues: { label: 'Entregues', color: 'hsl(var(--chart-1))' },
    canceladas: { label: 'Canceladas', color: 'hsl(var(--chart-4))' },
  } satisfies ChartConfig;

  const totalPie = chartData.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold md:text-3xl">Início</h1>
        <Button asChild>
          <Link href="/encomendas/nova">
            <PlusCircle className="mr-2 h-4 w-4" />
            Nova Encomenda
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-2/3" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-1/4" />
              </CardContent>
            </Card>
          ))}
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
              <p className="text-xs text-muted-foreground">Aguardando envio</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Em Rota</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.emRota}</div>
              <p className="text-xs text-muted-foreground">
                A caminho do destino
              </p>
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
                Entregas concluídas
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Canceladas</CardTitle>
              <PackageX className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.canceladas}</div>
              <p className="text-xs text-muted-foreground">Envios cancelados</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Status das Encomendas</CardTitle>
            <CardDescription>
              Distribuição de todas as encomendas por status.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            {isLoading ? (
              <Skeleton className="h-[250px] w-[250px] rounded-full" />
            ) : totalPie > 0 ? (
              <ChartContainer
                config={chartConfig}
                className="min-h-[250px] w-full max-w-sm"
              >
                <PieChart accessibilityLayer>
                  <ChartTooltip
                    content={<ChartTooltipContent nameKey="value" hideLabel />}
                  />
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {chartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartLegend
                    content={<ChartLegendContent nameKey="name" />}
                  />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[250px] w-full flex-col items-center justify-center text-center">
                <p className="text-muted-foreground">
                  Nenhuma encomenda encontrada.
                </p>
                <p className="text-sm text-muted-foreground/80">
                  Crie uma para ver o gráfico.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Top 5 Clientes</CardTitle>
            <CardDescription>
              Clientes que mais geraram faturamento.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : topClients.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead className="text-center">Encomendas</TableHead>
                      <TableHead className="text-right">Faturamento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topClients.map((client) => (
                      <TableRow key={client.id}>
                        <TableCell className="font-medium">
                          {client.nome}
                        </TableCell>
                        <TableCell className="text-center">
                          {client.orderCount}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(client.totalValue)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex h-48 flex-col items-center justify-center rounded-md border-2 border-dashed p-12 text-center">
                <p className="text-muted-foreground">
                  Nenhum cliente com encomendas.
                </p>
                <p className="text-sm text-muted-foreground/80">
                  Os dados aparecerão aqui quando houver encomendas.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
