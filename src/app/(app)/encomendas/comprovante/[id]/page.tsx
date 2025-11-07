'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronLeft, Share, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { OrderStatusBadge } from '@/components/status-badge';
import { useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { doc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import type { Order, Company } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Timestamp } from 'firebase/firestore';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

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

export default function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  return <ReceiptContent orderId={id} />;
}

function ReceiptContent({ orderId }: { orderId: string }) {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const orderRef = useMemoFirebase(() => {
    if (!firestore || isUserLoading) return null;
    return doc(firestore, 'companies', '1', 'orders', orderId);
  }, [firestore, isUserLoading, orderId]);
  
  const companyRef = useMemoFirebase(() => {
    if (!firestore || isUserLoading) return null;
    return doc(firestore, 'companies', '1');
  }, [firestore, isUserLoading]);

  const { data: order, isLoading: isLoadingOrder } = useDoc<Order>(orderRef);
  const { data: company, isLoading: isLoadingCompany } = useDoc<Company>(companyRef);

  const isLoading = isLoadingOrder || isLoadingCompany || isUserLoading;
  
  const handleSendNotification = async () => {
    if (!order || !company || !firestore || !user) return;

    const trackingLink = `${company.linkBaseRastreio || 'https://seusite.com/rastreio/'}${order.codigoRastreio}`;
    const totalValue = formatCurrency(order.valorEntrega);
    const totalVolumes = order.items.reduce((acc, item) => acc + item.quantity, 0).toString();

    let messageTemplate = company.msgRecebido || `Olá {cliente}! Recebemos sua encomenda de {volumes} volume(s) com o código {codigo}. O valor da entrega é de {valor}. Acompanhe em: {link}`;

    let message = messageTemplate
      .replace('{cliente}', order.nomeCliente)
      .replace('{codigo}', order.codigoRastreio)
      .replace('{link}', trackingLink)
      .replace('{valor}', totalValue)
      .replace('{volumes}', totalVolumes);
    
    const cleanedPhone = order.telefone.replace(/\D/g, '');
    const fullPhone = cleanedPhone.startsWith('55') ? cleanedPhone : `55${cleanedPhone}`;
    const url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');

    try {
        const messageLog = `Notificação de 'Recebido' enviada via WhatsApp em ${new Date().toLocaleString('pt-BR')}`;
        await updateDoc(orderRef, {
            messages: arrayUnion(messageLog),
        });
        toast({
            title: "Notificação Registrada",
            description: "O envio da notificação foi registrado no histórico da encomenda."
        });
    } catch(error: any) {
        console.error("Failed to log notification:", error);
        toast({
            variant: "destructive",
            title: "Erro ao registrar notificação",
            description: error.message
        })
    }
    
    // After attempting to send, redirect to the main orders page
    router.push('/encomendas');
  };

  if (isLoading) {
    return <ReceiptSkeleton />;
  }

  if (!order) {
    return (
      <div className="mx-auto grid max-w-2xl flex-1 auto-rows-max gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" className="h-7 w-7" asChild>
            <Link href="/encomendas">
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Voltar</span>
            </Link>
          </Button>
          <h1 className="font-semibold text-xl">Comprovante não encontrado</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Erro 404</CardTitle>
            <CardDescription>
              A encomenda para a qual você está tentando gerar um comprovante não foi encontrada.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-2xl flex-1 auto-rows-max gap-4">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="h-7 w-7" asChild>
          <Link href="/encomendas/nova">
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Voltar</span>
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="font-semibold text-xl">Comprovante da Encomenda</h1>
          <p className="text-sm text-muted-foreground">
            Revise os detalhes e envie para o cliente.
          </p>
        </div>
      </div>
      <Card>
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
          <div className="grid gap-3">
            <div className="font-semibold">Informações do Cliente</div>
            <dl className="grid gap-3">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Cliente</dt>
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
            <div className="font-semibold">Detalhes da Entrega</div>
            <dl className="grid gap-3">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Origem</dt>
                <dd>{order.origem}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Destino</dt>
                <dd>{order.destino}</dd>
              </div>
            </dl>
          </div>
          <Separator />
           <div className="grid gap-3">
            <div className="font-semibold">Itens</div>
            <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Qtd.</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {order.items.map((item, index) => (
                    <TableRow key={index}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.value * item.quantity)}</TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                <TableFooter>
                    <TableRow>
                    <TableCell colSpan={2} className="font-semibold text-right">Total</TableCell>
                    <TableCell className="text-right font-bold text-lg">{formatCurrency(order.valorEntrega)}</TableCell>
                    </TableRow>
                </TableFooter>
            </Table>
           </div>
        </CardContent>
        <CardFooter className="flex-col items-stretch gap-4">
          <Button onClick={handleSendNotification} size="lg">
             <MessageCircle className="mr-2" />
             Enviar Comprovante via WhatsApp
          </Button>
           <Button variant="outline" asChild>
              <Link href="/encomendas">Finalizar</Link>
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

function ReceiptSkeleton() {
    return (
        <div className="mx-auto grid w-full max-w-2xl flex-1 auto-rows-max gap-4 animate-pulse">
            <div className="flex items-center gap-4">
                <Skeleton className="h-7 w-7 rounded-md" />
                <div className="flex-1">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
                </div>
            </div>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                         <div>
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-8 w-40 mt-2" />
                         </div>
                         <Skeleton className="h-7 w-28 rounded-full" />
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-24 w-full" />
                </CardContent>
                <CardFooter className="flex-col items-stretch gap-4">
                     <Skeleton className="h-11 w-full" />
                     <Skeleton className="h-11 w-full" />
                </CardFooter>
            </Card>
        </div>
    )
}
