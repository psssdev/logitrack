
'use client';
import { useMemo, useState, useEffect } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Pie,
  PieChart,
  Cell,
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import type { Order, Driver, Client } from '@/lib/types';
import { collection, query, orderBy } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const COMPANY_ID = '1';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    value
  );

const paymentMethodLabels: { [key: string]: string } = {
  pix: 'PIX',
  dinheiro: 'Dinheiro',
  cartao: 'Cartão',
  boleto: 'Boleto',
  link: 'Link',
  haver: 'A Haver',
};

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#82ca9d',
];

export default function RelatoriosPage() {
  const firestore = useFirestore();
  const { isUserLoading } = useUser();

  const ordersQuery = useMemoFirebase(() => {
    if (!firestore || isUserLoading) return null;
    return query(collection(firestore, 'companies', '1', 'orders'));
  }, [firestore, isUserLoading]);
  
  const clientsQuery = useMemoFirebase(() => {
    if (!firestore || isUserLoading) return null;
    return query(collection(firestore, 'companies', '1', 'clients'));
  }, [firestore, isUserLoading]);

  const driversQuery = useMemoFirebase(() => {
    if (!firestore || isUserLoading) return null;
    return query(collection(firestore, 'companies', COMPANY_ID, 'drivers'), orderBy('nome'));
  }, [firestore, isUserLoading]);

  const { data: orders, isLoading: isLoadingOrders } = useCollection<Order>(ordersQuery);
  const { data: clients, isLoading: isLoadingClients } = useCollection<Client>(clientsQuery);
  const { data: drivers, isLoading: isLoadingDrivers } = useCollection<Driver>(driversQuery);


  const { monthlyData, paymentData, totalRevenue, totalReceivable, ticketMedio, driverPerformance, clientPerformance } = useMemo(() => {
    if (!orders || !clients || !drivers) {
      return { monthlyData: [], paymentData: [], totalRevenue: 0, totalReceivable: 0, ticketMedio: 0, driverPerformance: [], clientPerformance: [] };
    }

    const monthly = orders.reduce((acc, order) => {
      const month = new Date(order.createdAt.toDate()).toLocaleString('default', { month: 'short', year: 'numeric' });
      if (!acc[month]) {
        acc[month] = { month, entregas: 0, faturamento: 0 };
      }
      acc[month].entregas += 1;
      acc[month].faturamento += order.valorEntrega;
      return acc;
    }, {} as Record<string, { month: string; entregas: number; faturamento: number }>);

    const payment = orders.reduce((acc, order) => {
        const method = paymentMethodLabels[order.formaPagamento] || 'Outro';
        if (!acc[method]) {
            acc[method] = 0;
        }
        acc[method] += order.valorEntrega;
        return acc;
    }, {} as Record<string, number>);

    const totalRevenue = orders.reduce((sum, o) => sum + o.valorEntrega, 0);
    const totalReceivable = orders.filter(o => o.formaPagamento === 'haver' && !o.pago).reduce((sum, o) => sum + o.valorEntrega, 0);
    const ticketMedio = orders.length > 0 ? totalRevenue / orders.length : 0;
    
    const driverPerf = drivers.map(driver => {
        const driverOrders = orders.filter(o => o.motoristaId === driver.id);
        const totalValue = driverOrders.reduce((sum, o) => sum + o.valorEntrega, 0);
        return {
            ...driver,
            deliveries: driverOrders.length,
            totalValue
        }
    }).sort((a,b) => b.deliveries - a.deliveries);

    const clientPerf = clients.map(client => {
      const clientOrders = orders.filter(o => o.clientId === client.id);
      const totalValue = clientOrders.reduce((sum, o) => sum + o.valorEntrega, 0);
      return {
        ...client,
        orderCount: clientOrders.length,
        totalValue
      }
    }).sort((a,b) => b.totalValue - a.totalValue);


    return { 
        monthlyData: Object.values(monthly), 
        paymentData: Object.entries(payment).map(([name, value]) => ({ name, value })),
        totalRevenue,
        totalReceivable,
        ticketMedio,
        driverPerformance: driverPerf,
        clientPerformance: clientPerf
    };
  }, [orders, drivers, clients]);

  const monthlyChartConfig = {
    faturamento: {
      label: 'Faturamento (R$)',
      color: 'hsl(var(--primary))',
    },
    entregas: {
      label: 'Entregas',
      color: 'hsl(var(--accent))',
    },
  } satisfies ChartConfig;

  const paymentChartConfig = {
      faturamento: {
        label: 'Faturamento',
      },
      ...paymentData.reduce((acc, item) => {
        acc[item.name] = { label: item.name };
        return acc;
      }, {} as ChartConfig),
    } satisfies ChartConfig;


  const isLoading = isLoadingOrders || isLoadingDrivers || isLoadingClients || isUserLoading;

  if(isLoading) {
    return (
        <div className="flex flex-col gap-6">
            <Skeleton className="h-9 w-1/3" />
            <div className="grid gap-4 md:grid-cols-3">
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
                <Skeleton className="h-80 w-full" />
                <Skeleton className="h-80 w-full" />
            </div>
             <Skeleton className="h-64 w-full" />
        </div>
    )
  }


  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center">
        <h1 className="flex-1 text-2xl font-semibold md:text-3xl">Relatórios</h1>
      </div>

       <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Faturamento Total</CardTitle>
            <CardDescription>Soma de todas as encomendas.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCurrency(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total a Receber</CardTitle>
            <CardDescription>Saldo devedor de encomendas "a haver".</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCurrency(totalReceivable)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Ticket Médio</CardTitle>
            <CardDescription>Valor médio por encomenda.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCurrency(ticketMedio)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
         <Card>
            <CardHeader>
            <CardTitle>Faturamento Mensal</CardTitle>
            <CardDescription>
                Faturamento e número de entregas por mês.
            </CardDescription>
            </CardHeader>
            <CardContent>
            <ChartContainer config={monthlyChartConfig} className="min-h-[300px] w-full">
                <BarChart accessibilityLayer data={monthlyData}>
                <CartesianGrid vertical={false} />
                <XAxis
                    dataKey="month"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                />
                <YAxis yAxisId="left" orientation="left" stroke="hsl(var(--foreground))" tickFormatter={(value) => `R$ ${value / 1000}k`} />
                <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--accent))" />
                <Tooltip cursor={false} content={<ChartTooltipContent />} />
                <Bar dataKey="faturamento" fill="var(--color-faturamento)" radius={4} yAxisId="left" />
                <Bar dataKey="entregas" fill="var(--color-entregas)" radius={4} yAxisId="right" />
                </BarChart>
            </ChartContainer>
            </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Faturamento por Forma de Pagamento</CardTitle>
            <CardDescription>Distribuição da receita por método de pagamento.</CardDescription>
          </CardHeader>
          <CardContent>
             <ChartContainer config={paymentChartConfig} className="min-h-[300px] w-full">
                <PieChart>
                  <Tooltip content={<ChartTooltipContent nameKey="value" hideLabel />} />
                  <Pie data={paymentData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                     {paymentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                   <ChartLegend content={<ChartLegendContent />} />
                </PieChart>
              </ChartContainer>
          </CardContent>
        </Card>
      </div>
      
       <Card>
          <CardHeader>
            <CardTitle>Ranking de Clientes</CardTitle>
            <CardDescription>Clientes que mais geram faturamento para a empresa.</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Cliente</TableHead>
                            <TableHead className="text-center">Nº de Encomendas</TableHead>
                            <TableHead className="text-right">Valor Total</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {clientPerformance.map(client => (
                            <TableRow key={client.id}>
                                <TableCell className="font-medium">{client.nome}</TableCell>
                                <TableCell className="text-center">{client.orderCount}</TableCell>
                                <TableCell className="text-right">{formatCurrency(client.totalValue)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
             </div>
          </CardContent>
      </Card>

      <Card>
          <CardHeader>
            <CardTitle>Performance dos Motoristas</CardTitle>
            <CardDescription>Ranking de motoristas por entregas e valor total.</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Motorista</TableHead>
                            <TableHead className="text-center">Nº de Entregas</TableHead>
                            <TableHead className="text-right">Valor Movimentado</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {driverPerformance.map(driver => (
                            <TableRow key={driver.id}>
                                <TableCell className="font-medium">{driver.nome}</TableCell>
                                <TableCell className="text-center">{driver.deliveries}</TableCell>
                                <TableCell className="text-right">{formatCurrency(driver.totalValue)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
             </div>
          </CardContent>
      </Card>

    </div>
  );
}

    

    