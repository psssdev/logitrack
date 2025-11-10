'use client';

import { useMemo } from 'react';
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

  const { startOfMonth, endOfMonth } = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );
    return { startOfMonth: start, endOfMonth: end };
  }, []);

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

  const receivedThisMonthQuery = useMemoFirebase<Query | null>(() => {
    if (!canQuery) return null;
    return query(
      collection(firestore!, 'companies', COMPANY_ID, 'orders'),
      where('pago', '==', true),
      where('createdAt', '>=', Timestamp.fromDate(startOfMonth)),
      where('createdAt', '<=', Timestamp.fromDate(endOfMonth))
    );
  }, [canQuery, firestore, startOfMonth, endOfMonth]);

  const {
    data: receivableOrders,
    isLoading: isLoadingReceivable,
    error: receivableError,
  } = useCollection<Order>(receivableQuery);

  const {
    data: receivedOrdersInMonth,
    isLoading: isLoadingReceived,
    error: receivedError,
  } = useCollection<Order>(receivedThisMonthQuery);

  const pageIsLoading = isUserLoading || isLoadingReceivable || isLoadingReceived;

  const { totalReceivable, receivableCount, totalReceivedInMonth, receivedCount } =
    useMemo(() => {
      const receivable = Array.isArray(receivableOrders) ? receivableOrders : [];
      const received = Array.isArray(receivedOrdersInMonth)
        ? receivedOrdersInMonth
        : [];

      return {
        totalReceivable: receivable.reduce(
          (acc, o) => acc + (o?.valorEntrega || 0),
          0
        ),
        receivableCount: receivable.length,
        totalReceivedInMonth: received.reduce(
          (acc, o) => acc + (o?.valorEntrega || 0),
          0
        ),
        receivedCount: received.length,
      };
    }, [receivableOrders, receivedOrdersInMonth]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center">
        <h1 className="flex-1 text-2xl font-semibold md:text-3xl">
          Financeiro
        </h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total a Receber"
          value={totalReceivable}
          description={`de ${receivableCount} encomenda(s)`}
          isLoading={pageIsLoading}
          error={receivableError}
        />
        <KpiCard
          title="Recebido no Mês"
          value={totalReceivedInMonth}
          description={`de ${receivedCount} encomenda(s) quitadas`}
          isLoading={pageIsLoading}
          error={receivedError}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contas a Receber</CardTitle>
          <CardDescription>
            Encomendas com pagamento &quot;A Haver&quot; ainda não quitadas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pageIsLoading ? (
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
    </div>
  );
}
