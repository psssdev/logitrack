'use client';

import { useMemo } from 'react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import type { Order } from '@/lib/types';
import {
  collection, query, where, orderBy, Timestamp, Query,
} from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { AccountsReceivableTable } from '@/components/accounts-receivable-table';
import { CopyButton } from '@/components/copy-button';

const COMPANY_ID = '1';

/* ========================= Utils ========================= */
function toNumberSafe(n: any): number {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

/* ========================= Página ========================= */
export default function FinanceiroPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser(); // <- usamos user aqui!

  // Datas do mês atual
  const { startOfMonth, endOfMonth } = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { startOfMonth: start, endOfMonth: end };
  }, []);

  const fmtBRL = useMemo(
    () => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }),
    []
  );

  // Só construa queries se Firestore pronto E usuário autenticado
  const canQuery = !!firestore && !isUserLoading && !!user?.uid;

  // Contas a receber
  const receivableQuery = useMemoFirebase<Query | null>(() => {
    if (!canQuery) return null;
    return query(
      collection(firestore!, 'companies', COMPANY_ID, 'orders'),
      where('formaPagamento', '==', 'haver'),
      where('pago', '==', false)
    );
  }, [canQuery, firestore]);

  const {
    data: receivableOrders,
    isLoading: isLoadingReceivable,
    error: receivableError,
  } = useCollection<Order>(receivableQuery ?? undefined);

  // Recebido no mês
  const receivedThisMonthQuery = useMemoFirebase<Query | null>(() => {
    if (!canQuery) return null;
    return query(
      collection(firestore!, 'companies', COMPANY_ID, 'orders'),
      where('pago', '==', true),
      where('createdAt', '>=', Timestamp.fromDate(startOfMonth)),
      where('createdAt', '<=', Timestamp.fromDate(endOfMonth)),
      orderBy('createdAt', 'asc')
    );
  }, [canQuery, firestore, startOfMonth, endOfMonth]);

  const {
    data: receivedOrdersInMonth,
    isLoading: isLoadingReceived,
    error: receivedError,
  } = useCollection<Order>(receivedThisMonthQuery ?? undefined);

  // Arrays seguros
  const receivableOrdersArr: Order[] = Array.isArray(receivableOrders) ? receivableOrders : [];
  const receivedOrdersInMonthArr: Order[] = Array.isArray(receivedOrdersInMonth) ? receivedOrdersInMonth : [];

  const pageIsLoading = isUserLoading || !user?.uid || isLoadingReceivable || isLoadingReceived || !firestore;

  // Totais seguros
  const totalReceivable = useMemo(
    () => receivableOrdersArr.reduce((acc, o) => acc + toNumberSafe(o?.valorEntrega), 0),
    [receivableOrdersArr]
  );
  const totalReceivedInMonth = useMemo(
    () => receivedOrdersInMonthArr.reduce((acc, o) => acc + toNumberSafe(o?.valorEntrega), 0),
    [receivedOrdersInMonthArr]
  );
  const receivableCount = receivableOrdersArr.length;
  const receivedCount = receivedOrdersInMonthArr.length;

  const renderQueryError = (err?: unknown) => {
    if (!err) return null;
    const msg = String(err);
    const isIndexError = /failed-precondition/i.test(msg) && /index/i.test(msg);
    const linkMatch = msg.match(/https:\/\/console\.firebase\.google\.com\/[^\s)]+/i);
    const indexLink = linkMatch?.[0];
    return (
      <div className="mt-3 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
        <p><strong>Erro de consulta:</strong> {msg}</p>
        {isIndexError && indexLink && (
          <p className="mt-1">
            Esta consulta requer um índice. Clique aqui para criar:&nbsp;
            <a className="underline underline-offset-2" href={indexLink} target="_blank" rel="noreferrer">
              Criar índice no Firestore
            </a>
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center">
        <h1 className="flex-1 text-2xl font-semibold md:text-3xl">Financeiro</h1>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total a Receber */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total a Receber</CardTitle>
            <span className="text-muted-foreground">R$</span>
          </CardHeader>
          <CardContent>
            {pageIsLoading ? (
              <Skeleton className="h-8 w-1/2" />
            ) : (
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold">{fmtBRL.format(totalReceivable)}</div>
                <CopyButton value={String(totalReceivable)} label="Copiar total" />
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              de {pageIsLoading ? '—' : receivableCount} encomenda(s)
            </p>
            {renderQueryError(receivableError)}
          </CardContent>
        </Card>

        {/* Recebido no mês */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recebido no mês</CardTitle>
            <span className="text-muted-foreground">R$</span>
          </CardHeader>
          <CardContent>
            {pageIsLoading ? (
              <Skeleton className="h-8 w-1/2" />
            ) : (
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold">{fmtBRL.format(totalReceivedInMonth)}</div>
                <CopyButton value={String(totalReceivedInMonth)} label="Copiar total" />
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              de {pageIsLoading ? '—' : receivedCount} encomenda(s) quitadas
            </p>
            {renderQueryError(receivedError)}
          </CardContent>
        </Card>
      </div>

      {/* Contas a Receber */}
      <Card>
        <CardHeader>
          <CardTitle>Contas a Receber</CardTitle>
          <CardDescription>
            Encomendas com pagamento &quot;A Haver&quot; ainda não quitadas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pageIsLoading && <Skeleton className="h-64 w-full" />}
          {!pageIsLoading && receivableOrdersArr.length === 0 && !receivableError && (
            <div className="flex h-24 items-center justify-center rounded-md border-2 border-dashed text-center">
              <p className="text-muted-foreground">Nenhuma conta a receber encontrada.</p>
            </div>
          )}
          {!pageIsLoading && receivableOrdersArr.length > 0 && (
            <AccountsReceivableTable orders={receivableOrdersArr} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
