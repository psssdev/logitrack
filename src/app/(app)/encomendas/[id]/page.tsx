import Link from 'next/link';
import {
  ChevronLeft,
  Copy,
  CreditCard,
  MoreVertical,
  Truck,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { getOrderById } from '@/lib/actions';
import { notFound } from 'next/navigation';
import { OrderStatusBadge } from '@/components/status-badge';
import { OrderTimeline } from '@/components/order-timeline';
import { RealTimeTrackingCard } from '@/components/real-time-tracking-card';
import { UpdateStatusButtons } from '@/components/update-status-buttons';

const paymentMethodLabels: Record<string, string> = {
  pix: 'PIX',
  dinheiro: 'Dinheiro',
  cartao: 'Cartão',
  boleto: 'Boleto',
  link: 'Link',
};

export default async function OrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const order = await getOrderById(params.id);

  if (!order) {
    notFound();
  }

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
            <span className="font-mono text-primary">{order.codigoRastreio}</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Criada em{' '}
            {new Date(order.createdAt).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}
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
                                <dt className="text-muted-foreground">Nota Fiscal</dt>
                                <dd className="font-mono">{order.numeroNota}</dd>
                            </div>
                        )}
                    </dl>
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
                            <dt className="text-muted-foreground">Valor</dt>
                            <dd>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.valorEntrega)}</dd>
                        </div>
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
