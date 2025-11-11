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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import type { Order, Company } from '@/lib/types';
import { collection, query, where, doc } from 'firebase/firestore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MessageCircle, DollarSign, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { RecordPaymentDialog } from '@/components/record-payment-dialog';
import { useToast } from '@/hooks/use-toast';
import { triggerRevalidation } from '@/lib/actions';

const COMPANY_ID = '1';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    value
  );

const formatDate = (date: any) => {
  const d = date?.toDate ? date.toDate() : new Date(date);
  return format(d, 'dd/MM/yyyy', { locale: ptBR });
};

const openWhatsApp = (phone: string, message: string) => {
  const cleanedPhone = phone.replace(/\D/g, '');
  const fullPhone = cleanedPhone.startsWith('55') ? cleanedPhone : `55${cleanedPhone}`;
  const url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
};

export default function CobrancasPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);

  const pendingOrdersQuery = useMemoFirebase(() => {
    if (!firestore || !user || isUserLoading) return null;
    return query(
      collection(firestore, 'companies', COMPANY_ID, 'orders'),
      where('formaPagamento', '==', 'haver'),
      where('pago', '==', false)
    );
  }, [firestore, user, isUserLoading]);

  const companyRef = useMemoFirebase(() => {
    if (!firestore || !user || isUserLoading) return null;
    return doc(firestore, 'companies', COMPANY_ID);
  }, [firestore, user, isUserLoading]);

  const { data: pendingOrders, isLoading: isLoadingOrders } = useCollection<Order>(pendingOrdersQuery);
  const { data: company, isLoading: isLoadingCompany } = useDoc<Company>(companyRef);

  const isLoading = isUserLoading || isLoadingOrders || isLoadingCompany;

  const handleCharge = (order: Order) => {
    if (!company) {
      toast({
        variant: 'destructive',
        title: 'Erro de configuração',
        description: 'Template de mensagem de cobrança não encontrado.',
      });
      return;
    }
    const messageTemplate =
      company.msgCobranca ||
      'Olá {cliente}, tudo bem? Verificamos que há uma pendência de {valor} referente à encomenda {codigo}. Poderia nos dar um retorno sobre o pagamento? Obrigado!';

    const message = messageTemplate
      .replace('{cliente}', order.nomeCliente)
      .replace('{valor}', formatCurrency(order.valorEntrega))
      .replace('{codigo}', order.codigoRastreio);

    openWhatsApp(order.telefone, message);
  };

  const handleRecordPayment = (order: Order) => {
    setSelectedOrder(order);
    setIsPaymentDialogOpen(true);
  };

  const onPaymentRecorded = () => {
    // This will trigger a re-fetch of the pendingOrdersQuery
    triggerRevalidation('/cobrancas');
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center">
        <h1 className="flex-1 text-2xl font-semibold md:text-3xl">
          Cobranças Pendentes
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pagamentos "A Haver"</CardTitle>
          <CardDescription>
            Acompanhe e gerencie as encomendas com pagamento pendente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && <Skeleton className="h-48 w-full" />}
          {!isLoading && pendingOrders && (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Data da Encomenda</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingOrders.length > 0 ? (
                    pendingOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>
                          <div className="font-medium">{order.nomeCliente}</div>
                          <div className="text-sm text-muted-foreground">
                            {order.codigoRastreio}
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(order.createdAt)}</TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(order.valorEntrega)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCharge(order)}
                            >
                              <MessageCircle className="mr-2 h-4 w-4" />
                              Cobrar
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleRecordPayment(order)}
                            >
                              <DollarSign className="mr-2 h-4 w-4" />
                              Pagar
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="h-24 text-center"
                      >
                        Nenhuma cobrança pendente.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
           {!isLoading && !pendingOrders && (
             <div className="text-center p-8 border-2 border-dashed rounded-md flex flex-col items-center gap-2">
                <AlertCircle className="h-8 w-8 text-destructive"/>
                <p className="font-semibold text-destructive">Ocorreu um erro</p>
                <p className="text-muted-foreground text-sm">Não foi possível carregar as cobranças pendentes. Tente novamente mais tarde.</p>
            </div>
           )}
        </CardContent>
      </Card>

      <RecordPaymentDialog
        order={selectedOrder}
        isOpen={isPaymentDialogOpen}
        setIsOpen={setIsPaymentDialogOpen}
        onPaymentRecorded={onPaymentRecorded}
      />
    </div>
  );
}
