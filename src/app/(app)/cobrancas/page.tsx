'use client';

import { useMemo, useState } from 'react';
import { DateRange } from 'react-day-picker';
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
import { collection, query, where, doc, orderBy } from 'firebase/firestore';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MessageCircle, DollarSign, AlertCircle, Download, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { RecordPaymentDialog } from '@/components/record-payment-dialog';
import { useToast } from '@/hooks/use-toast';
import { triggerRevalidation } from '@/lib/actions';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/date-range-picker';
import { Timestamp } from 'firebase/firestore';

const COMPANY_ID = '1';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    value
  );

const toDate = (date: any): Date => {
  if (date instanceof Timestamp) return date.toDate();
  return new Date(date);
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
  
  // Filter states
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [paymentStatus, setPaymentStatus] = useState<'all' | 'paid' | 'pending'>('all');
  const [searchTerm, setSearchTerm] = useState('');


  const ordersQuery = useMemoFirebase(() => {
    if (!firestore || !user || isUserLoading) return null;
    return query(
      collection(firestore, 'companies', COMPANY_ID, 'orders'),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, user, isUserLoading]);

  const companyRef = useMemoFirebase(() => {
    if (!firestore || !user || isUserLoading) return null;
    return doc(firestore, 'companies', COMPANY_ID);
  }, [firestore, user, isUserLoading]);

  const { data: allOrders, isLoading: isLoadingOrders } = useCollection<Order>(ordersQuery);
  const { data: company, isLoading: isLoadingCompany } = useDoc<Company>(companyRef);

  const isLoading = isUserLoading || isLoadingOrders || isLoadingCompany;

  const filteredOrders = useMemo(() => {
    if (!allOrders) return [];
    
    return allOrders.filter(order => {
        const orderDate = toDate(order.createdAt);
        
        // Date filter
        const isDateInRange = dateRange?.from && dateRange?.to ? isWithinInterval(orderDate, { start: dateRange.from, end: dateRange.to }) : true;
        
        // Payment status filter
        const isStatusMatch = paymentStatus === 'all' || (paymentStatus === 'paid' && order.pago) || (paymentStatus === 'pending' && !order.pago);

        // Search term filter
        const isSearchMatch = searchTerm === '' ||
            order.nomeCliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.codigoRastreio.toLowerCase().includes(searchTerm.toLowerCase());

        return isDateInRange && isStatusMatch && isSearchMatch;
    });
  }, [allOrders, dateRange, paymentStatus, searchTerm]);
  
  const summary = useMemo(() => {
    const summaryData = filteredOrders.reduce((acc, order) => {
        acc.geral += order.valorEntrega;
        if(order.pago) {
            acc.recebido += order.valorEntrega;
        } else {
            acc.pendente += order.valorEntrega;
        }
        return acc;
    }, { pendente: 0, recebido: 0, geral: 0 });

    return summaryData;
  }, [filteredOrders]);


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
  
   const handleChargeAll = () => {
    const pendingToCharge = filteredOrders.filter(o => !o.pago);
    if (pendingToCharge.length === 0) {
      toast({ description: 'Nenhuma cobrança pendente para notificar.' });
      return;
    }
    
    pendingToCharge.forEach((order, index) => {
        setTimeout(() => handleCharge(order), index * 300);
    });

    toast({
        title: `Notificando ${pendingToCharge.length} clientes...`,
        description: 'Verifique as janelas do WhatsApp que serão abertas.'
    });
  };

  const handleRecordPayment = (order: Order) => {
    setSelectedOrder(order);
    setIsPaymentDialogOpen(true);
  };

  const onPaymentRecorded = () => {
    triggerRevalidation('/cobrancas');
  };
  
  const exportToCSV = () => {
    if (filteredOrders.length === 0) {
        toast({ description: 'Nenhum dado para exportar.'});
        return;
    }

    const headers = ['Data', 'Código', 'Cliente', 'Valor', 'Status Pagamento', 'Forma Pagamento'];
    const rows = filteredOrders.map(order => [
        format(toDate(order.createdAt), 'yyyy-MM-dd'),
        order.codigoRastreio,
        `"${order.nomeCliente.replace(/"/g, '""')}"`,
        order.valorEntrega.toFixed(2),
        order.pago ? 'Pago' : 'Pendente',
        order.formaPagamento
    ].join(','));

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `cobrancas_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center">
        <h1 className="flex-1 text-2xl font-semibold md:text-3xl">
          Cobranças e Recebimentos
        </h1>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Valor Pendente</CardTitle>
            <CardDescription>Soma dos valores não pagos no período.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-3/4" /> : <p className="text-3xl font-bold text-destructive">{formatCurrency(summary.pendente)}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Valor Recebido</CardTitle>
            <CardDescription>Soma dos valores pagos no período.</CardDescription>
          </CardHeader>
          <CardContent>
             {isLoading ? <Skeleton className="h-8 w-3/4" /> : <p className="text-3xl font-bold text-green-600">{formatCurrency(summary.recebido)}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Valor Geral</CardTitle>
            <CardDescription>Soma de todas as encomendas no período.</CardDescription>
          </CardHeader>
          <CardContent>
             {isLoading ? <Skeleton className="h-8 w-3/4" /> : <p className="text-3xl font-bold">{formatCurrency(summary.geral)}</p>}
          </CardContent>
        </Card>
      </div>


      <Card>
        <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex-1">
                    <CardTitle>Controle de Encomendas</CardTitle>
                    <CardDescription>
                        Filtre e gerencie as encomendas e seus status de pagamento.
                    </CardDescription>
                </div>
                 <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Button variant="outline" onClick={handleChargeAll}>
                        <Send className="mr-2 h-4 w-4" />
                        Notificar Pendentes
                    </Button>
                    <Button variant="outline" onClick={exportToCSV}>
                        <Download className="mr-2 h-4 w-4" />
                        Exportar CSV
                    </Button>
                </div>
            </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filters */}
           <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <DatePickerWithRange date={dateRange} setDate={setDateRange} />
                <Select value={paymentStatus} onValueChange={(v) => setPaymentStatus(v as any)}>
                    <SelectTrigger>
                        <SelectValue placeholder="Status do Pagamento" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos os Status</SelectItem>
                        <SelectItem value="pending">Pendentes</SelectItem>
                        <SelectItem value="paid">Pagos</SelectItem>
                    </SelectContent>
                </Select>
                 <Input 
                    placeholder="Buscar por cliente ou código..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
          
          {/* Table */}
          {isLoading && <Skeleton className="h-64 w-full" />}
          {!isLoading && allOrders && (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.length > 0 ? (
                    filteredOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>
                          <div className="font-medium">{order.nomeCliente}</div>
                          <div className="text-sm text-muted-foreground">
                            {order.codigoRastreio}
                          </div>
                        </TableCell>
                        <TableCell>{format(toDate(order.createdAt), 'dd/MM/yyyy')}</TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(order.valorEntrega)}
                        </TableCell>
                        <TableCell>
                            <Badge variant={order.pago ? 'default' : 'destructive'} className={order.pago ? 'bg-green-600' : ''}>
                                {order.pago ? 'Pago' : 'Pendente'}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {!order.pago && (
                                <>
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
                                </>
                            )}
                            {order.pago && (
                                <Button size="sm" disabled variant="ghost">Pago</Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-24 text-center"
                      >
                        Nenhum resultado encontrado para os filtros aplicados.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
           {!isLoading && !allOrders && (
             <div className="text-center p-8 border-2 border-dashed rounded-md flex flex-col items-center gap-2">
                <AlertCircle className="h-8 w-8 text-destructive"/>
                <p className="font-semibold text-destructive">Ocorreu um erro</p>
                <p className="text-muted-foreground text-sm">Não foi possível carregar os dados. Tente novamente mais tarde.</p>
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
