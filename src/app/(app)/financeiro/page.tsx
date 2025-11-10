'use client';

import { useMemo, useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { Clipboard, ClipboardCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const COMPANY_ID = '1';

/* =========================================================================
   Utils - datas, números e clipboard (com fallback)
   ========================================================================= */
function toNumberSafe(n: any): number {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

function isFramed(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    // cross-origin iframes jogam erro ao acessar window.top
    return true;
  }
}

async function copyToClipboardSafe(text: string) {
  // Se estiver em iframe, muitos navegadores bloqueiam a Clipboard API
  // => use direto o fallback.
  if (isFramed()) {
    try {
      const el = document.createElement('textarea');
      el.value = text;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.focus();
      el.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(el);
      return ok;
    } catch {
      return false;
    }
  }

  // Tenta API moderna
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    throw new Error('navigator.clipboard indisponível');
  } catch {
    // Fallback
    try {
      const el = document.createElement('textarea');
      el.value = text;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.focus();
      el.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(el);
      return ok;
    } catch {
      return false;
    }
  }
}

/* =========================================================================
   Botão de Copiar (embutido para ficar "completo")
   ========================================================================= */
function CopyButton({ value, label = 'Copiar', className }: { value: string; label?: string; className?: string }) {
  const { toast } = useToast();
  const [done, setDone] = useState(false);

  const onCopy = async () => {
    const ok = await copyToClipboardSafe(value);
    setDone(ok);
    toast({
      title: ok ? 'Copiado!' : 'Não foi possível copiar',
      description: ok
        ? 'O texto foi enviado para a área de transferência.'
        : 'O navegador bloqueou o acesso ao clipboard. Use Ctrl/Cmd+C como alternativa.',
      variant: ok ? 'default' : 'destructive',
    });
    if (ok) setTimeout(() => setDone(false), 1500);
  };

  return (
    <Button onClick={onCopy} className={className} variant="outline" size="sm">
      {done ? <ClipboardCheck className="mr-2 h-4 w-4" /> : <Clipboard className="mr-2 h-4 w-4" />}
      {done ? 'Copiado' : label}
    </Button>
  );
}

/* =========================================================================
   Página
   ========================================================================= */
export default function FinanceiroPage() {
  const firestore = useFirestore();
  const { isUserLoading } = useUser();

  // Datas do mês atual
  const { startOfMonth, endOfMonth } = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { startOfMonth: start, endOfMonth: end };
  }, []);

  // Formatter BRL memorizado
  const fmtBRL = useMemo(
    () => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }),
    []
  );

  // ===== Query 1: Contas a receber
  const receivableQuery = useMemoFirebase<Query | null>(() => {
    if (!firestore || isUserLoading) return null;
    return query(
      collection(firestore, 'companies', COMPANY_ID, 'orders'),
      where('formaPagamento', '==', 'haver'),
      where('pago', '==', false)
    );
  }, [firestore, isUserLoading]);

  const {
    data: receivableOrders,
    isLoading: isLoadingReceivable,
    error: receivableError,
  } = useCollection<Order>(receivableQuery ?? undefined);

  // ===== Query 2: Recebido no mês
  const receivedThisMonthQuery = useMemoFirebase<Query | null>(() => {
    if (!firestore || isUserLoading) return null;
    return query(
      collection(firestore, 'companies', COMPANY_ID, 'orders'),
      where('pago', '==', true),
      where('createdAt', '>=', Timestamp.fromDate(startOfMonth)),
      where('createdAt', '<=', Timestamp.fromDate(endOfMonth)),
      orderBy('createdAt', 'asc')
    );
  }, [firestore, isUserLoading, startOfMonth, endOfMonth]);

  const {
    data: receivedOrdersInMonth,
    isLoading: isLoadingReceived,
    error: receivedError,
  } = useCollection<Order>(receivedThisMonthQuery ?? undefined);

  // Sempre transforme null/undefined em array vazio
  const receivableOrdersArr: Order[] = Array.isArray(receivableOrders) ? receivableOrders : [];
  const receivedOrdersInMonthArr: Order[] = Array.isArray(receivedOrdersInMonth) ? receivedOrdersInMonth : [];

  const pageIsLoading = isUserLoading || isLoadingReceivable || isLoadingReceived;

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

  // Render de erro com link de índice (quando for "failed-precondition")
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
