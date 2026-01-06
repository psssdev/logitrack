'use client';
import { useMemo } from 'react';
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
import type { Order, Driver, Client, FinancialEntry, Vehicle, FinancialCategory } from '@/lib/types';
import { collection, query } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Timestamp } from 'firebase/firestore';


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
  '#ffc658',
  '#8884d8'
];

export default function RelatoriosPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  
  const financialEntriesQuery = useMemoFirebase(() => {
    if (!firestore || isUserLoading) return null;
    return query(collection(firestore, 'financialEntries'));
  }, [firestore, isUserLoading]);

  const vehiclesQuery = useMemoFirebase(() => {
    if (!firestore || isUserLoading) return null;
    return query(collection(firestore, 'vehicles'));
  }, [firestore, isUserLoading]);
  
  const categoriesQuery = useMemoFirebase(() => {
      if (!firestore || isUserLoading) return null;
      return query(collection(firestore, 'financialCategories'));
  }, [firestore, isUserLoading]);


  const { data: financialEntries, isLoading: isLoadingEntries } = useCollection<FinancialEntry>(financialEntriesQuery);
  const { data: vehicles, isLoading: isLoadingVehicles } = useCollection<Vehicle>(vehiclesQuery);
  const { data: categories, isLoading: isLoadingCategories } = useCollection<FinancialCategory>(categoriesQuery);


  const { monthlyData, paymentData, totalRevenue, totalExpenses, netProfit, ticketMedio, expenseByCategory, vehiclePerformance } = useMemo(() => {
    if (!financialEntries || !vehicles || !categories) {
      return { monthlyData: [], paymentData: [], totalRevenue: 0, totalExpenses: 0, netProfit: 0, ticketMedio: 0, expenseByCategory: [], vehiclePerformance: [] };
    }

    const incomeEntries = financialEntries.filter(e => e.type === 'Entrada');
    const expenseEntries = financialEntries.filter(e => e.type === 'Saída');
    
    const monthly = financialEntries.reduce((acc, entry) => {
      const date = entry.date instanceof Timestamp ? entry.date.toDate() : new Date(entry.date);
      const month = new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
      
      if (!acc[month]) {
        acc[month] = { month, faturamento: 0, despesas: 0 };
      }
      
      if(entry.type === 'Entrada') {
          acc[month].faturamento += entry.amount;
      } else {
          acc[month].despesas += entry.amount;
      }
      return acc;
    }, {} as Record<string, { month: string; faturamento: number; despesas: number }>);
    
    const sortedMonthlyData = Object.values(monthly).sort((a,b) => new Date(a.month).getTime() - new Date(b.month).getTime()).map(d => ({
        ...d,
        month: new Date(d.month).toLocaleString('default', { month: 'short', year: 'numeric' })
    }));

    const payment = incomeEntries.reduce((acc, entry) => {
        const method = paymentMethodLabels[entry.formaPagamento || ''] || 'Outro';
        if (!acc[method]) {
            acc[method] = 0;
        }
        acc[method] += entry.amount;
        return acc;
    }, {} as Record<string, number>);

    const expenseCat = expenseEntries.reduce((acc, entry) => {
        const category = categories.find(c => c.id === entry.categoryId);
        const categoryName = category?.name || 'Sem Categoria';
        if(!acc[categoryName]) {
            acc[categoryName] = 0;
        }
        acc[categoryName] += entry.amount;
        return acc;
    }, {} as Record<string, number>);


    const totalRevenueValue = incomeEntries.reduce((sum, e) => sum + e.amount, 0);
    const totalExpensesValue = expenseEntries.reduce((sum, e) => sum + e.amount, 0);
    const ticketMedioValue = incomeEntries.length > 0 ? totalRevenueValue / incomeEntries.length : 0;
    
    const vehiclePerf = vehicles.map(vehicle => {
        const vehicleIncome = incomeEntries.filter(e => e.vehicleId === vehicle.id).reduce((sum, e) => sum + e.amount, 0);
        const vehicleExpenses = expenseEntries.filter(e => e.vehicleId === vehicle.id).reduce((sum, e) => sum + e.amount, 0);
        return {
            ...vehicle,
            totalIncome: vehicleIncome,
            totalExpenses: vehicleExpenses,
            netProfit: vehicleIncome - vehicleExpenses,
        }
    }).sort((a,b) => b.netProfit - a.netProfit);


    return { 
        monthlyData: sortedMonthlyData, 
        paymentData: Object.entries(payment).map(([name, value]) => ({ name, value })),
        totalRevenue: totalRevenueValue,
        totalExpenses: totalExpensesValue,
        netProfit: totalRevenueValue - totalExpensesValue,
        ticketMedio: ticketMedioValue,
        expenseByCategory: Object.entries(expenseCat).map(([name, value]) => ({ name, value })),
        vehiclePerformance: vehiclePerf,
    };
  }, [financialEntries, vehicles, categories]);

  const monthlyChartConfig = {
    faturamento: { label: 'Faturamento', color: 'hsl(var(--chart-1))' },
    despesas: { label: 'Despesas', color: 'hsl(var(--chart-2))' },
  } satisfies ChartConfig;

  const paymentChartConfig = {
      faturamento: { label: 'Faturamento' },
      ...paymentData.reduce((acc, item) => {
        acc[item.name] = { label: item.name };
        return acc;
      }, {} as ChartConfig),
    } satisfies ChartConfig;
    
   const expenseChartConfig = {
      despesa: { label: 'Despesa' },
      ...expenseByCategory.reduce((acc, item) => {
        acc[item.name] = { label: item.name };
        return acc;
      }, {} as ChartConfig),
    } satisfies ChartConfig;


  const isLoading = isLoadingEntries || isLoadingVehicles || isLoadingCategories || isUserLoading;

  if(isLoading) {
    return (
        <div className="flex flex-col gap-6 animate-pulse">
            <Skeleton className="h-9 w-1/3" />
            <div className="grid gap-4 md:grid-cols-4">
                <Skeleton className="h-28 w-full" />
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
        <h1 className="flex-1 text-2xl font-semibold md:text-3xl">Relatórios Financeiros</h1>
      </div>

       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader><CardTitle>Receita Total</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{formatCurrency(totalRevenue)}</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader><CardTitle>Despesa Total</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-destructive">{formatCurrency(totalExpenses)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Lucro Líquido</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCurrency(netProfit)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Ticket Médio (Receita)</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCurrency(ticketMedio)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
            <CardHeader>
            <CardTitle>Análise Financeira Mensal</CardTitle>
            <CardDescription>
                Receitas e despesas consolidadas por mês.
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
                <YAxis yAxisId="left" orientation="left" stroke="var(--color-faturamento)" tickFormatter={(value) => `R$${value / 1000}k`} />
                <Tooltip cursor={false} content={<ChartTooltipContent formatter={(value, name) => `${name}: ${formatCurrency(value as number)}`} />} />
                 <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="faturamento" fill="var(--color-faturamento)" radius={4} yAxisId="left" name="Faturamento"/>
                <Bar dataKey="despesas" fill="var(--color-despesas)" radius={4} yAxisId="left" name="Despesas" />
                </BarChart>
            </ChartContainer>
            </CardContent>
        </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Receita por Forma de Pagamento</CardTitle>
          </CardHeader>
          <CardContent>
             <ChartContainer config={paymentChartConfig} className="min-h-[300px] w-full">
                <PieChart>
                  <Tooltip content={<ChartTooltipContent nameKey="value" hideLabel formatter={(value) => formatCurrency(value as number)}/>} />
                  <Pie data={paymentData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} labelLine={false} label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}>
                     {paymentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                   <ChartLegend content={<ChartLegendContent />} />
                </PieChart>
              </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Despesas por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
             <ChartContainer config={expenseChartConfig} className="min-h-[300px] w-full">
                <PieChart>
                  <Tooltip content={<ChartTooltipContent nameKey="value" hideLabel formatter={(value) => formatCurrency(value as number)} />} />
                  <Pie data={expenseByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} labelLine={false} label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}>
                     {expenseByCategory.map((entry, index) => (
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
            <CardTitle>Performance Financeira por Veículo</CardTitle>
            <CardDescription>Análise de receitas, despesas e lucro por veículo da frota.</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Veículo (Placa)</TableHead>
                            <TableHead className="text-right">Receita Total</TableHead>
                            <TableHead className="text-right">Despesa Total</TableHead>
                            <TableHead className="text-right">Lucro Líquido</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {vehiclePerformance.map(vehicle => (
                            <TableRow key={vehicle.id}>
                                <TableCell className="font-medium">{vehicle.modelo} ({vehicle.placa})</TableCell>
                                <TableCell className="text-right text-green-600">{formatCurrency(vehicle.totalIncome)}</TableCell>
                                <TableCell className="text-right text-destructive">{formatCurrency(vehicle.totalExpenses)}</TableCell>
                                <TableCell className="text-right font-bold">{formatCurrency(vehicle.netProfit)}</TableCell>
                            </TableRow>
                        ))}
                         {vehiclePerformance.length === 0 && (
                             <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">Nenhum dado de veículo encontrado.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
             </div>
          </CardContent>
      </Card>
    </div>
  );
}

    