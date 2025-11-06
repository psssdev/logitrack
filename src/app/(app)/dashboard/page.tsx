'use client';

import Link from 'next/link';
import { Package, PackageCheck, PlusCircle, Truck, PackageX } from 'lucide-react';
import { Pie, PieChart, Cell } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useMemo, useState } from 'react';
import { getDashboardSummary } from '@/lib/actions';

export default function DashboardPage() {
  const [summary, setSummary] = useState({
    total: 0,
    pendentes: 0,
    emRota: 0,
    entregues: 0,
    canceladas: 0,
  });
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);

  useEffect(() => {
    let alive = true;
    const fetchSummary = async () => {
      try {
        setIsLoadingSummary(true);
        const s = await getDashboardSummary(); // server action
        if (alive) {
          setSummary(s);
        }
      } catch (e) {
        console.error("Failed to fetch dashboard summary:", e);
      } finally {
        if (alive) {
          setIsLoadingSummary(false);
        }
      }
    };
    
    fetchSummary();

    return () => {
      alive = false;
    };
  }, []);

  const chartData = useMemo(
    () => [
      { name: 'Pendentes', value: summary.pendentes, fill: 'hsl(var(--chart-2))' },
      { name: 'Em Rota', value: summary.emRota, fill: 'hsl(var(--chart-3))' },
      { name: 'Entregues', value: summary.entregues, fill: 'hsl(var(--chart-1))' },
      { name: 'Canceladas', value: summary.canceladas, fill: 'hsl(var(--chart-4))' },
    ].filter(item => item.value > 0),
    [summary]
  );

  const chartConfig = {
    pendentes: { label: 'Pendentes', color: 'hsl(var(--chart-2))' },
    emRota: { label: 'Em Rota', color: 'hsl(var(--chart-3))' },
    entregues: { label: 'Entregues', color: 'hsl(var(--chart-1))' },
    canceladas: { label: 'Canceladas', color: 'hsl(var(--chart-4))' },
  } satisfies ChartConfig;

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
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                 <Skeleton className="h-5 w-2/3" />
                 <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-1/4" />
                <Skeleton className="h-3 w-full mt-2" />
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
              <p className="text-xs text-muted-foreground">Aguardando para sair para entrega</p>
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
              <div className="text-2xl font-bold">{summary.entregues}</div>
              <p className="text-xs text-muted-foreground">
                Total de entregas concluídas
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
              <p className="text-xs text-muted-foreground">
                Total de encomendas canceladas
              </p>
            </CardContent>
          </Card>
        </div>
      )}

       <Card>
        <CardHeader>
          <CardTitle>Visão Geral das Encomendas</CardTitle>
          <CardDescription>
            Distribuição do status de todas as encomendas.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center">
            {isLoadingSummary ? (
                <Skeleton className="h-64 w-full" />
            ) : (
                <ChartContainer config={chartConfig} className="min-h-[250px] w-full max-w-sm">
                    <PieChart accessibilityLayer>
                        <ChartTooltip content={<ChartTooltipContent nameKey="value" hideLabel />} />
                        <Pie
                            data={chartData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                            {chartData.map((entry) => (
                                <Cell key={entry.name} fill={entry.fill} />
                            ))}
                        </Pie>
                         <ChartLegend
                            content={<ChartLegendContent nameKey="name" />}
                            className="-translate-y-4"
                        />
                    </PieChart>
                </ChartContainer>
            )}
        </CardContent>
       </Card>
    </>
  );
}
