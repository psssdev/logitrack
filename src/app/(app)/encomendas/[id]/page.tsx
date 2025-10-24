'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { notFound } from 'next/navigation';
import { OrderStatusBadge } from '@/components/status-badge';
import { OrderTimeline } from '@/components/order-timeline';
import { RealTimeTrackingCard } from '@/components/real-time-tracking-card';
import { UpdateStatusButtons } from '@/components/update-status-buttons';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Order } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Timestamp } from 'firebase/firestore';

const paymentMethodLabels: Record<string, string> = {
  pix: 'PIX',
  dinheiro: 'Dinheiro',
  cartao: 'Cartão',
  boleto: 'Boleto',
  link: 'Link',
  haver: 'A Haver',
};

const formatDate = (date: Date | Timestamp | undefined) => {
  if (!date) return 'Data indisponível';
  const d = date instanceof Timestamp ? date.toDate() : date;
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  return <OrderDetailContent orderId={params.id} />;
}


function OrderDetailContent({ orderId }: { orderId: string }) {
  const firestore = useFirestore();

  const orderRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'companies', '1', 'orders', orderId);
  }, [firestore, orderId]);

  const { data: order, isLoading } = useDoc<Order>(orderRef);

  if (!isLoading && !order) {
    notFound();
  }

  if (isLoading) {
    return <OrderDetailsSkeleton />;
  }

  if (order) {
    return (
      <div className="mx-auto grid max-w-6xl flex-1 auto-rows-max gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" className="h-7 w-7" asChild>
            <Link href="/encomendas">
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Voltar</span>
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="font-semibold text-xl">
              Encomenda{' '}
              <span className="font-mono text-primary">
                {order.codigoRastreio}
              </span>
            </h1>
            <p className="text-sm text-muted-foreground">
              Criada em {formatDate(order.createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <UpdateStatusButtons order={order} />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_250px] lg:grid-cols-3 lg:gap-8">
          <div className="grid auto-rows-max items-start gap-4 lg:col-span-2 lg:gap-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Detalhes da Encomenda</CardTitle>
                <OrderStatusBadge status={order.status} />
              </CardHeader>
              <CardContent>
                <div className="grid gap-6">
                  <div className="grid gap-3">
                    <div className="font-semibold">Informações de Entrega</div>
                    <dl className="grid gap-3">
                      <div className="flex items-center justify-between">
                        <dt className="text-muted-foreground">Origem</dt>
                        <dd>{order.origem}</dd>
                      </div>
                      <div className="flex items-center justify-between">
                        <dt className="text-muted-foreground">Destino</dt>
                        <dd>{order.destino}</dd>
                      </div>
                      {order.numeroNota && (
                        <div className="flex items-center justify-between">
                          <dt className="text-muted-foreground">
                            Nota Fiscal
                          </dt>
                          <dd className="font-mono">{order.numeroNota}</dd>
                        </div>
                      )}
                    </dl>
                  </div>
                  <Separator />
                  <div className="grid gap-3">
                    <div className="font-semibold">Itens da Encomenda</div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-1/2">Item</TableHead>
                          <TableHead className="text-right">Qtd.</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {order.items.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{item.description}</TableCell>
                            <TableCell className="text-right">
                              {item.quantity}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(item.value)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      <TableFooter>
                        <TableRow>
                          <TableCell
                            colSpan={2}
                            className="font-semibold text-right"
                          >
                            Total
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            {formatCurrency(order.valorEntrega)}
                          </TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </div>
                  <Separator />
                  <div className="grid gap-3">
                    <div className="font-semibold">Informações do Cliente</div>
                    <dl className="grid gap-3">
                      <div className="flex items-center justify-between">
                        <dt className="text-muted-foreground">Nome</dt>
                        <dd>{order.nomeCliente}</dd>
                      </div>
                      <div className="flex items-center justify-between">
                        <dt className="text-muted-foreground">Telefone</dt>
                        <dd>{order.telefone}</dd>
                      </div>
                    </dl>
                  </div>
                  <Separator />
                  <div className="grid gap-3">
                    <div className="font-semibold">Informações de Pagamento</div>
                    <dl className="grid gap-3">
                      <div className="flex items-center justify-between">
                        <dt className="text-muted-foreground">Forma</dt>
                        <dd>{paymentMethodLabels[order.formaPagamento]}</dd>
                      </div>
                      <div className="flex items-center justify-between">
                        <dt className="text-muted-foreground">Status</dt>
                        <dd>{order.pago ? 'Pago' : 'Pendente'}</dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Linha do Tempo</CardTitle>
              </CardHeader>
              <CardContent>
                <OrderTimeline timeline={order.timeline} />
              </CardContent>
            </Card>
          </div>
          <div className="grid auto-rows-max items-start gap-4 lg:gap-8">
            <RealTimeTrackingCard order={order} />
            <Card>
              <CardHeader>
                <CardTitle>Observações</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {order.observacao || 'Nenhuma observação fornecida.'}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

function OrderDetailsSkeleton() {
  return (
    <div className="mx-auto grid max-w-6xl flex-1 auto-rows-max gap-4 animate-pulse">
      <div className="flex items-center gap-4">
        <Skeleton className="h-7 w-7 rounded-md" />
        <div className="flex-1">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-1/3 mt-2" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid gap-4 md:grid-cols-[1fr_250px] lg:grid-cols-3 lg:gap-8">
        <div className="grid auto-rows-max items-start gap-4 lg:col-span-2 lg:gap-8">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-1/3" />
            </CardHeader>
            <CardContent className="space-y-6">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-1/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        </div>
        <div className="grid auto-rows-max items-start gap-4 lg:gap-8">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-2/3" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-1/3" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-12 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}