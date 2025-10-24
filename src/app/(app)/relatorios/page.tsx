'use client';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';

const chartData = [
  { month: 'Janeiro', entregas: 186, faturamento: 4200 },
  { month: 'Fevereiro', entregas: 305, faturamento: 6500 },
  { month: 'Março', entregas: 237, faturamento: 5300 },
  { month: 'Abril', entregas: 273, faturamento: 6100 },
  { month: 'Maio', entregas: 209, faturamento: 4800 },
  { month: 'Junho', entregas: 214, faturamento: 5100 },
];

const chartConfig = {
  faturamento: {
    label: 'Faturamento (R$)',
    color: 'hsl(var(--primary))',
  },
   entregas: {
    label: 'Entregas',
    color: 'hsl(var(--accent))',
  },
} satisfies ChartConfig;

export default function RelatoriosPage() {
  return (
    <div className="flex flex-col gap-6">
       <div className="flex items-center">
        <h1 className="flex-1 text-2xl font-semibold md:text-3xl">Relatórios</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Faturamento Mensal</CardTitle>
          <CardDescription>Faturamento e número de entregas por mês.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
            <BarChart accessibilityLayer data={chartData}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
              />
              <YAxis 
                yAxisId="left"
                orientation="left"
                stroke="hsl(var(--foreground))"
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                stroke="hsl(var(--accent))"
              />
              <Tooltip cursor={false} content={<ChartTooltipContent />} />
              <Bar dataKey="faturamento" fill="var(--color-faturamento)" radius={4} yAxisId="left" />
              <Bar dataKey="entregas" fill="var(--color-entregas)" radius={4} yAxisId="right" />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
