'use client';

import { useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  useCollection,
  useFirestore,
  useMemoFirebase,
  useUser,
} from '@/firebase';
import type { Order } from '@/lib/types';
import {
  collection,
  query,
  where,
  orderBy,
  Timestamp,
  Query,
} from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { AccountsReceivableTable } from '@/components/accounts-receivable-table';
import { CopyButton } from '@/components/copy-button';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { subDays, startOfDay, endOfDay } from 'date-fns';
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { ReceivedTable } from '@/components/received-table';


const COMPANY_ID = '1';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const renderQueryError = (err?: unknown) => {
  if (!err) return null;
  const msg = String(err);
  const isIndexError = /failed-precondition/i.test(msg) && /index/i.test(msg);
  const linkMatch = msg.match(/https:\/\/console\.firebase\.google\.com\/[^\s)]+/i);
  const indexLink = linkMatch?.[0];

  if (!isIndexError) return null;

  return (
    <div className="mt-3 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
      <p>
        <strong>Ação necessária:</strong> Esta consulta requer um índice do
        Firestore.
      </p>
      {indexLink && (
        <p className="mt-1">
          <a
            className="underline underline-offset-2"
            href={indexLink}
            target="_blank"
            rel="noreferrer"
          >
            Clique aqui para criar o índice
          </a>{' '}
          e, em seguida, atualize a página.
        </p>
      )}
    </div>
  );
};

function KpiCard({
  title,
  value,
  description,
  isLoading,
  error,
}: {
  title: string;
  value: number;
  description: string;
  isLoading: boolean;
  error?: unknown;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <span className="text-muted-foreground">R$</span>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-1/2" />
        ) : (
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold">{formatCurrency(value)}</div>
            <CopyButton value={String(value)} label="Copiar" />
          </div>
        )}
        <p className="text-xs text-muted-foreground">{description}</p>
        {renderQueryError(error)}
      </CardContent>
    </Card>
  );
}

export default function FinanceiroPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 29),
    to: new Date(),
  });

  const canQuery = !!firestore && !isUserLoading && !!user?.uid;

  const receivableQuery = useMemoFirebase<Query | null>(() => {
    if (!canQuery) return null;
    return query(
      collection(firestore!, 'companies', COMPANY_ID, 'orders'),
      where('formaPagamento', '==', 'haver'),
      where('pago', '==', false),
      orderBy('createdAt', 'desc')
    );
  }, [canQuery, firestore]);

  const receivedInPeriodQuery = useMemoFirebase<Query | null>(() => {
    if (!canQuery || !dateRange?.from) return null;
    // Garante que a data final inclua o dia inteiro
    const from = startOfDay(dateRange.from);
    const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
    return query(
      collection(firestore!, 'companies', COMPANY_ID, 'orders'),
      where('pago', '==', true),
      where('createdAt', '>=', Timestamp.fromDate(from)),
      where('createdAt', '<=', Timestamp.fromDate(to)),
      orderBy('createdAt', 'desc')
    );
  }, [canQuery, firestore, dateRange]);


  const {
    data: receivableOrders,
    isLoading: isLoadingReceivable,
    error: receivableError,
  } = useCollection<Order>(receivableQuery);

  const {
    data: receivedOrdersInPeriod,
    isLoading: isLoadingReceived,
    error: receivedError,
  } = useCollection<Order>(receivedInPeriodQuery);

  const pageIsLoading = isUserLoading || isLoadingReceivable || isLoadingReceived;

  const { totalReceivable, receivableCount, totalReceivedInPeriod, receivedCountInPeriod, ticketMedio, dailyRevenueData } =
    useMemo(() => {
      const receivable = Array.isArray(receivableOrders) ? receivableOrders : [];
      const received = Array.isArray(receivedOrdersInPeriod)
        ? receivedOrdersInPeriod
        : [];
      
      const dailyData = received.reduce((acc, order) => {
        const date = order.createdAt.toDate().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit'});
        if (!acc[date]) {
          acc[date] = { date, faturamento: 0 };
        }
        acc[date].faturamento += order.valorEntrega;
        return acc;
      }, {} as Record<string, { date: string; faturamento: number }>);


      const totalReceived = received.reduce((acc, o) => acc + (o?.valorEntrega || 0), 0);

      return {
        totalReceivable: receivable.reduce((acc, o) => acc + (o?.valorEntrega || 0), 0),
        receivableCount: receivable.length,
        totalReceivedInPeriod: totalReceived,
        receivedCountInPeriod: received.length,
        ticketMedio: received.length > 0 ? totalReceived / received.length : 0,
        dailyRevenueData: Object.values(dailyData).sort((a,b) => a.date.localeCompare(b.date, 'pt-BR')),
      };
    }, [receivableOrders, receivedOrdersInPeriod]);

    const chartConfig = {
      faturamento: {
        label: 'Faturamento',
        color: 'hsl(var(--chart-1))',
      },
    } satisfies ChartConfig;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <h1 className="flex-1 text-2xl font-semibold md:text-3xl">
          Financeiro
        </h1>
        <DateRangePicker date={dateRange} onDateChange={setDateRange} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
         <KpiCard
          title="Recebido no Período"
          value={totalReceivedInPeriod}
          description={`de ${receivedCountInPeriod} encomenda(s) quitadas`}
          isLoading={pageIsLoading}
          error={receivedError}
        />
        <KpiCard
          title="Ticket Médio"
          value={ticketMedio}
          description="Valor médio por encomenda no período"
          isLoading={pageIsLoading}
        />
        <KpiCard
          title="Total a Receber"
          value={totalReceivable}
          description={`de ${receivableCount} encomenda(s) "a haver"`}
          isLoading={pageIsLoading}
          error={receivableError}
        />
      </div>

       <Card>
        <CardHeader>
          <CardTitle>Faturamento Diário no Período</CardTitle>
          <CardDescription>
            Receita total de encomendas pagas a cada dia.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pageIsLoading ? <Skeleton className="h-64 w-full" /> : 
            dailyRevenueData.length > 0 ? (
                <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
                    <BarChart accessibilityLayer data={dailyRevenueData}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                        dataKey="date"
                        tickLine={false}
                        tickMargin={10}
                        axisLine={false}
                        tickFormatter={(value) => value.substring(0, 5)}
                    />
                    <YAxis tickFormatter={(value) => `R$ ${value / 1000}k`} />
                    <Tooltip cursor={false} content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
                    <Bar dataKey="faturamento" fill="var(--color-faturamento)" radius={4} />
                    </BarChart>
                </ChartContainer>
            ) : (
                <div className="flex h-24 items-center justify-center rounded-md border-2 border-dashed text-center">
                    <p className="text-muted-foreground">Nenhum faturamento encontrado para este período.</p>
                </div>
            )
          }
        </CardContent>
      </Card>


      <Card>
        <CardHeader>
          <CardTitle>Contas a Receber</CardTitle>
          <CardDescription>
            Encomendas com pagamento &quot;A Haver&quot; ainda não quitadas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingReceivable ? (
            <Skeleton className="h-64 w-full" />
          ) : receivableOrders && receivableOrders.length > 0 ? (
            <AccountsReceivableTable orders={receivableOrders} />
          ) : (
            <div className="flex h-24 items-center justify-center rounded-md border-2 border-dashed text-center">
              <p className="text-muted-foreground">
                {receivableError
                  ? 'Não foi possível carregar os dados.'
                  : 'Nenhuma conta a receber encontrada.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recebidos no Período</CardTitle>
          <CardDescription>
            Encomendas pagas dentro do período selecionado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingReceived ? (
            <Skeleton className="h-64 w-full" />
          ) : receivedOrdersInPeriod && receivedOrdersInPeriod.length > 0 ? (
            <ReceivedTable orders={receivedOrdersInPeriod} />
          ) : (
            <div className="flex h-24 items-center justify-center rounded-md border-2 border-dashed text-center">
              <p className="text-muted-foreground">
                {receivedError
                  ? 'Não foi possível carregar os dados.'
                  : 'Nenhuma encomenda recebida no período.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
