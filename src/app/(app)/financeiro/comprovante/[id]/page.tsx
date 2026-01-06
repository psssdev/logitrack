'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { FinancialEntry, Vehicle } from '@/lib/types';
import { useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Timestamp } from 'firebase/firestore';
import {
  ArrowLeft,
  Bus,
  DollarSign,
  Ticket,
  User,
  Wallet,
  MapPin,
  MessageCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useStore } from '@/contexts/store-context';

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

export default function VendaComprovantePage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = React.use(params);
  return <ComprovanteContent entryId={id} />;
}

function ComprovanteContent({ entryId }: { entryId: string }) {
  const firestore = useFirestore();
  const { isUserLoading } = useUser();
  const { selectedStore } = useStore();
  const { toast } = useToast();

  const entryRef = useMemoFirebase(() => {
    if (!firestore || !selectedStore) return null;
    return doc(firestore, 'stores', selectedStore.id, 'financialEntries', entryId);
  }, [firestore, selectedStore, entryId]);

  const { data: entry, isLoading } = useDoc<FinancialEntry>(entryRef);

  const vehicleRef = useMemoFirebase(() => {
    if (!firestore || !entry?.vehicleId || !selectedStore) return null;
    return doc(firestore, 'stores', selectedStore.id, 'vehicles', entry.vehicleId);
  }, [firestore, entry?.vehicleId, selectedStore]);

  const { data: vehicle } = useDoc<Vehicle>(vehicleRef);

  const handleSendWhatsApp = () => {
    if (!entry || !vehicle) return;

    const seats = entry.selectedSeats?.join(', ') || 'N/A';
    const message = `
*Comprovante de Passagem - LogiTrack*

Olá, *${entry.clientName}*!
Obrigado por viajar conosco.

*Detalhes da sua Viagem:*
--------------------------------
Ônibus: *${vehicle.modelo} (${vehicle.placa})*
Data da Viagem: *${formatDate(entry.travelDate)}*
Origem: *${entry.origin}*
Destino: *${entry.destination}*
Assento(s): *${seats}*
--------------------------------
Valor Total: *${formatCurrency(entry.amount)}*
Forma de Pagamento: *${
      paymentMethodLabels[entry.formaPagamento || ''] || 'Não informado'
    }*

Agradecemos a sua preferência!
`.trim();

    // In a real app, you would fetch the client's phone number.
    // This is a placeholder.
    const mockedPhone = '5511999999999';

    const url = `https://wa.me/${mockedPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    
    toast({ title: "Abrindo WhatsApp...", description: "Prepare-se para enviar a mensagem para o cliente."})
  };

  const pageIsLoading = isLoading || isUserLoading || !selectedStore;

  if (pageIsLoading) {
    return <ComprovanteSkeleton />;
  }

  if (!entry) {
    return (
      <div className="mx-auto grid w-full max-w-lg flex-1 auto-rows-max gap-4">
         <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" className="h-7 w-7" asChild>
            <Link href="/vender-passagem">
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Voltar</span>
            </Link>
            </Button>
            <h1 className="font-semibold text-xl">Comprovante não encontrado</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Erro 404</CardTitle>
            <CardDescription>
              A venda para a qual você está tentando gerar um comprovante não
              foi encontrada.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-lg flex-1 auto-rows-max gap-4">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="h-7 w-7" asChild>
          <Link href="/vender-passagem">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Voltar</span>
          </Link>
        </Button>
        <h1 className="font-semibold text-xl">Comprovante de Venda</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="h-6 w-6 text-primary" />
            Passagem de Viagem
          </CardTitle>
          <CardDescription>
            Venda registrada em {formatDate(entry.date)}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex items-center gap-3 rounded-md border p-3">
            <User className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Passageiro</p>
              <p className="font-semibold">{entry.clientName}</p>
            </div>
          </div>
          <Separator />
          <dl className="grid gap-3">
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground flex items-center gap-2">
                <Bus className="h-4 w-4" /> Veículo
              </dt>
              <dd>{vehicle?.modelo || '...'}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Origem
              </dt>
              <dd>{entry.origin}</dd>
            </div>
             <div className="flex items-center justify-between">
              <dt className="text-muted-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Destino
              </dt>
              <dd>{entry.destination}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Data da Viagem</dt>
              <dd className="font-medium">{formatDate(entry.travelDate)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Assentos</dt>
              <dd className="font-mono text-lg font-bold">
                {entry.selectedSeats?.join(', ')}
              </dd>
            </div>
          </dl>
          <Separator />
          <dl className="grid gap-3">
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground flex items-center gap-2">
                <Wallet className="h-4 w-4" /> Forma de Pagamento
              </dt>
              <dd>
                {paymentMethodLabels[entry.formaPagamento || ''] ||
                  'Não informado'}
              </dd>
            </div>
            <div className="flex items-center justify-between font-bold">
              <dt className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" /> Total Pago
              </dt>
              <dd className="text-primary text-xl">{formatCurrency(entry.amount)}</dd>
            </div>
          </dl>
        </CardContent>
        <CardFooter className="flex-col items-stretch gap-2">
          <Button onClick={handleSendWhatsApp} size="lg">
            <MessageCircle className="mr-2" />
            Enviar via WhatsApp
          </Button>
          <Button variant="outline" asChild>
            <Link href="/vender-passagem">Nova Venda</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

function ComprovanteSkeleton() {
  return (
    <div className="mx-auto grid w-full max-w-lg flex-1 auto-rows-max gap-4 animate-pulse">
      <div className="flex items-center gap-4">
        <Skeleton className="h-7 w-7 rounded-md" />
        <Skeleton className="h-6 w-1/2" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent className="grid gap-4">
          <Skeleton className="h-12 w-full" />
          <Separator />
          <div className="space-y-3">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
          </div>
          <Separator />
          <div className="space-y-3">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-7 w-full" />
          </div>
        </CardContent>
        <CardFooter className="flex-col items-stretch gap-2">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
        </CardFooter>
      </Card>
    </div>
  );
}
