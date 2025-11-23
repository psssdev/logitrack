
'use client'

import { getFirestoreServer } from '@/lib/actions-public';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { OrderTimeline } from '@/components/order-timeline';
import { OrderStatusBadge } from '@/components/status-badge';
import { Separator } from '@/components/ui/separator';
import { Logo } from '@/components/logo';
import Link from 'next/link';
import { Package, Search, AlertCircle, Home } from 'lucide-react';
import type { Order } from '@/lib/types';
import { useEffect, useState, use } from 'react';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

async function getOrderByTrackingCode(codigoRastreio: string): Promise<Order | null> {
    const firestore = getFirestoreServer();
    const ordersCollection = collection(firestore, 'orders');
     const q = query(
        ordersCollection,
        where("codigoRastreio", "==", codigoRastreio.toUpperCase()),
        limit(1)
    );
    
    try {
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const orderDoc = querySnapshot.docs[0];
            return { id: orderDoc.id, ...orderDoc.data() } as Order;
        }
    } catch (error) {
        console.error("Error fetching order by tracking code: " + codigoRastreio, error);
    }
  
    return null;
}


export default function RastreioPage({
  params,
}: {
  params: { codigo: string };
}) {
  const { codigo } = use(params);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchOrder() {
        setLoading(true);
        setError(false);
        if(!codigo) {
            setError(true);
            setLoading(false);
            return;
        }
        const fetchedOrder = await getOrderByTrackingCode(codigo);
        if(fetchedOrder) {
            setOrder(fetchedOrder);
        } else {
            setError(true);
        }
        setLoading(false);
    }
    fetchOrder();
  }, [codigo]);

  if(loading) {
    return <RastreioSkeleton />
  }

  if (error || !order) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center shadow-lg">
          <CardHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="mt-4">Encomenda não encontrada</CardTitle>
            <CardDescription>
              O código de rastreio{' '}
              <strong className="font-mono text-foreground">
                {codigo ? codigo.toUpperCase() : ''}
              </strong>{' '}
              não foi encontrado em nosso sistema.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button asChild>
              <Link href="/rastreio">
                <Search className="mr-2 h-4 w-4" />
                Tentar Novamente
              </Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                Página Inicial
              </Link>
            </Button>
          </CardContent>
        </Card>
        <footer className="absolute bottom-8 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} LogiTrack. Todos os direitos
          reservados.
        </footer>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-muted/40 p-4 sm:p-8">
      <div className="w-full max-w-3xl space-y-8">
        <div className="text-center">
          <Link href="/" className="inline-block">
            <Logo className="mx-auto h-16 w-16" />
          </Link>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground">
            Detalhes da Entrega
          </h1>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardDescription>Código de Rastreio</CardDescription>
                <CardTitle className="font-mono text-2xl tracking-wider">
                  {order.codigoRastreio}
                </CardTitle>
              </div>
              <OrderStatusBadge status={order.status} className="w-fit text-sm" />
            </div>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="grid gap-4 rounded-lg border p-4">
              <div className="font-semibold">Informações do Envio</div>
              <dl className="grid gap-3 text-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <dt className="text-muted-foreground">Cliente</dt>
                  <dd className="font-medium">{order.nomeCliente}</dd>
                </div>
                <Separator className="my-1 sm:hidden" />
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <dt className="text-muted-foreground">De</dt>
                  <dd className="font-medium">{order.origem}</dd>
                </div>
                <Separator className="my-1 sm:hidden" />
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <dt className="text-muted-foreground">Para</dt>
                  <dd className="font-medium">{order.destino}</dd>
                </div>
              </dl>
            </div>
            <div>
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <Package className="h-5 w-5" />
                Histórico
              </h3>
              <OrderTimeline timeline={order.timeline} />
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <Button variant="outline" asChild>
            <Link href="/rastreio">
              <Search className="mr-2 h-4 w-4" />
              Rastrear outra encomenda
            </Link>
          </Button>
        </div>
      </div>
      <footer className="mt-12 text-center text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} LogiTrack. Todos os direitos
        reservados.
      </footer>
    </div>
  );
}


function RastreioSkeleton() {
    return (
        <div className="flex min-h-screen flex-col items-center bg-muted/40 p-4 sm:p-8 animate-pulse">
            <div className="w-full max-w-3xl space-y-8">
                 <div className="text-center">
                    <Skeleton className="h-16 w-16 rounded-full mx-auto" />
                    <Skeleton className="h-9 w-3/4 mx-auto mt-4" />
                </div>

                <Card className="shadow-lg">
                    <CardHeader>
                        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-8 w-40 mt-2" />
                            </div>
                            <Skeleton className="h-7 w-28 rounded-full" />
                        </div>
                    </CardHeader>
                    <CardContent className="grid gap-6">
                        <div className="grid gap-4 rounded-lg border p-4">
                           <Skeleton className="h-5 w-32" />
                            <div className="space-y-4">
                               <Skeleton className="h-4 w-full" />
                               <Skeleton className="h-4 w-full" />
                               <Skeleton className="h-4 w-full" />
                            </div>
                        </div>
                        <div>
                             <Skeleton className="h-6 w-24 mb-4" />
                            <div className="space-y-4">
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                 <div className="text-center">
                    <Skeleton className="h-11 w-52 mx-auto" />
                </div>
            </div>
        </div>
    )
}
