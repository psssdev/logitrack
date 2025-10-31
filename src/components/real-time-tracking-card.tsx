'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  getRealTimeOrderStatus,
  type RealTimeOrderTrackingOutput,
} from '@/ai/flows/real-time-order-tracking';
import type { Order } from '@/lib/types';
import { AlertCircle, Clock, MapPin, Zap } from 'lucide-react';

export function RealTimeTrackingCard({ order }: { order: Order }) {
  const [data, setData] = React.useState<RealTimeOrderTrackingOutput | null>(
    null
  );
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function fetchTrackingData() {
      if (order.status !== 'EM_ROTA') {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        // In a real app, currentLocation would be dynamic.
        const result = await getRealTimeOrderStatus({
          orderId: order.codigoRastreio,
          currentLocation: 'Meio do caminho',
          destination: order.destino.full,
        });
        setData(result);
      } catch (e) {
        setError('Não foi possível obter a previsão em tempo real.');
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    fetchTrackingData();
  }, [order.codigoRastreio, order.destino, order.status]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-accent" />
          Previsão de Entrega (IA)
        </CardTitle>
        <CardDescription>
          Estimativas baseadas em trânsito e clima.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading && <LoadingSkeleton />}
        {error && <ErrorAlert message={error} />}
        {!loading && !error && data && <TrackingInfo data={data} />}
        {!loading && !error && !data && order.status !== 'EM_ROTA' && (
             <p className="text-sm text-muted-foreground text-center p-4">
                A previsão em tempo real fica disponível quando a encomenda está em rota.
             </p>
        )}
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-6 w-2/3" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-full" />
      </div>
    </div>
  );
}

function ErrorAlert({ message }: { message: string }) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Erro</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

function TrackingInfo({ data }: { data: RealTimeOrderTrackingOutput }) {
  return (
    <ul className="grid gap-3">
        <li className="flex items-start justify-between">
            <span className="text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                ETA
            </span>
            <span className="font-semibold">{data.estimatedArrivalTime}</span>
        </li>
        <li className="flex items-start justify-between">
            <span className="text-muted-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Status Atual
            </span>
            <span className="font-semibold text-right">{data.status}</span>
        </li>
        <li className="flex items-start justify-between">
            <span className="text-muted-foreground flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Previsão IA
            </span>
            <span className="font-semibold text-right">{data.predictiveStatus}</span>
        </li>
    </ul>
  );
}
