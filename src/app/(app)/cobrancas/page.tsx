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
import type { Order, Company, Client } from '@/lib/types';
import { collection, query, where, doc } from 'firebase/firestore';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MessageCircle, DollarSign, AlertCircle, Download, Send, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { RecordPaymentDialog } from '@/components/record-payment-dialog';
import { useToast } from '@/hooks/use-toast';
import { triggerRevalidation } from '@/lib/actions';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/date-range-picker';
import { Timestamp } from 'firebase/firestore';
import Link from 'next/link';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    value
  );

const toDate = (date: any): Date => {
  if (date instanceof Timestamp) return date.toDate();
  if (typeof date === 'string') return new Date(date);
  return date;
};

const openWhatsApp = (phone: string, message: string) => {
  const cleanedPhone = phone.replace(/\D/g, '');
  const fullPhone = cleanedPhone.startsWith('55') ? cleanedPhone : `55${cleanedPhone}`;
  const url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
};

interface ClientDebt {
    clientId: string;
    nomeCliente: string;
    telefone: string;
    totalPendente: number;
    orderCount: number;
    pendingOrders: Order[];
}


export default function CobrancasPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  
  // Filter states
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState<'all' | string>('all');
  const [payingClient, setPayingClient] = useState<ClientDebt | null>(null);


  const pendingOrdersQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'orders'),
      where('pago', '==', false)
    );
  }, [firestore, user]);

  const { data: allPendingOrders, isLoading: isLoadingOrders } = useCollection<Order>(pendingOrdersQuery);
  
  const companyRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    // Assuming a single company document for simplicity, adjust if multi-tenant
    return doc(firestore, 'companies', '1');
  }, [firestore, user]);
  
  const { data: company, isLoading: isLoadingCompany } = useDoc<Company>(companyRef);

  const isLoading = isUserLoading || isLoadingOrders || isLoadingCompany;

  const cities = useMemo(() => {
    if (!allPendingOrders) return [];
    const citySet = new Set<string>();
    allPendingOrders.forEach(order => {
        if (typeof order.destino === 'string') {
            const parts = order.destino.split(',').map(p => p.trim());
            if (parts.length >= 2) {
                const cityCandidate = parts[parts.length - 2];
                if (cityCandidate && cityCandidate.length > 2) { 
                    citySet.add(cityCandidate);
                }
            }
        }
    });
    return Array.from(citySet).sort();
  }, [allPendingOrders]);


 const { clientDebts, summary } = useMemo(() => {
    if (!allPendingOrders) return { clientDebts: [], summary: { totalPendente: 0, totalClientes: 0, totalEncomendas: 0 } };
    
    const filteredByDateAndCity = allPendingOrders.filter(order => {
        const orderDate = toDate(order.createdAt);
        
        // Date filter
        const isDateInRange = dateRange?.from && dateRange?.to ? isWithinInterval(orderDate, { start: dateRange.from, end: dateRange.to }) : true;
            
        // City filter
         const orderCityParts = typeof order.destino === 'string' ? order.destino.split(',').map(p => p.trim()) : [];
         const orderCity = orderCityParts.length >= 2 ? orderCityParts[orderCityParts.length - 2] : '';
        const isCityMatch = selectedCity === 'all' || orderCity === selectedCity;

        return isDateInRange && isCityMatch;
    });

    const debtsByClient = filteredByDateAndCity.reduce((acc, order) => {
        const paidAmount = order.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
        const pendingAmount = order.valorEntrega - paidAmount;

        if (pendingAmount <= 0) return acc;

        if (!acc[order.clientId]) {
            acc[order.clientId] = {
                clientId: order.clientId,
                nomeCliente: order.nomeCliente,
                telefone: order.telefone,
                totalPendente: 0,
                orderCount: 0,
                pendingOrders: []
            };
        }

        acc[order.clientId].totalPendente += pendingAmount;
        acc[order.clientId].orderCount += 1;
        acc[order.clientId].pendingOrders.push(order);
        return acc;

    }, {} as Record<string, ClientDebt>);

    const debtList = Object.values(debtsByClient).sort((a,b) => b.totalPendente - a.totalPendente);
    
    const filteredByName = searchTerm
      ? debtList.filter(client => client.nomeCliente.toLowerCase().includes(searchTerm.toLowerCase()))
      : debtList;

    const summaryData = {
        totalPendente: filteredByName.reduce((sum, client) => sum + client.totalPendente, 0),
        totalClientes: filteredByName.length,
        totalEncomendas: filteredByName.reduce((sum, client) => sum + client.orderCount, 0),
    };

    return { clientDebts: filteredByName, summary: summaryData };
  }, [allPendingOrders, dateRange, selectedCity, searchTerm]);


  const handleCharge = (client: ClientDebt) => {
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
      'Olá {cliente}, tudo bem? Verificamos que há uma pendência de {valor} referente a {quantidade} encomenda(s). Poderia nos dar um retorno sobre o pagamento? Obrigado!';

    const message = messageTemplate
      .replace('{cliente}', client.nomeCliente)
      .replace('{valor}', formatCurrency(client.totalPendente))
      .replace('{quantidade}', client.orderCount.toString());

    openWhatsApp(client.telefone, message);
  };
  
  const handlePaymentSuccess = () => {
    // This will trigger a re-fetch of the `useCollection` hook
    triggerRevalidation('/cobrancas');
    toast({
      title: 'Sucesso!',
      description: 'A lista de cobranças foi atualizada.',
    });
  }


  const exportToCSV = () => {
    if (clientDebts.length === 0) {
        toast({ description: 'Nenhum dado para exportar.'});
        return;
    }

    const headers = ['Cliente', 'Telefone', 'Qtd. Encomendas', 'Valor Pendente Total'];
    const rows = clientDebts.map(client => [
        `"${client.nomeCliente.replace(/"/g, '""')}"`,
        client.telefone,
        client.orderCount,
        client.totalPendente.toFixed(2)
    ].join(','));

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `cobrancas_por_cliente_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  return (
    <>
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
            <CardTitle>Valor Total Pendente</CardTitle>
            <CardDescription>Soma de todos os valores não pagos.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-3/4" /> : <p className="text-3xl font-bold text-destructive">{formatCurrency(summary.totalPendente)}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Clientes Devedores</CardTitle>
            <CardDescription>Total de clientes com pendências.</CardDescription>
          </CardHeader>
          <CardContent>
             {isLoading ? <Skeleton className="h-8 w-3/4" /> : <p className="text-3xl font-bold">{summary.totalClientes}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Encomendas Pendentes</CardTitle>
            <CardDescription>Total de encomendas com pagamento pendente.</CardDescription>
          </CardHeader>
          <CardContent>
             {isLoading ? <Skeleton className="h-8 w-3/4" /> : <p className="text-3xl font-bold">{summary.totalEncomendas}</p>}
          </CardContent>
        </Card>
      </div>


      <Card>
        <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex-1">
                    <CardTitle>Controle de Cobranças por Cliente</CardTitle>
                    <CardDescription>
                        Filtre e gerencie as dívidas consolidadas por cliente.
                    </CardDescription>
                </div>
                 <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
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
                 <Select value={selectedCity} onValueChange={setSelectedCity}>
                    <SelectTrigger>
                        <SelectValue placeholder="Filtrar por cidade de destino" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas as Cidades</SelectItem>
                        {cities.map(city => (
                            <SelectItem key={city} value={city}>{city}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                 <Input 
                    placeholder="Buscar por nome do cliente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
          
          {/* Table */}
          {isLoading && <Skeleton className="h-64 w-full" />}
          {!isLoading && allPendingOrders && (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-center">Nº de Encomendas</TableHead>
                    <TableHead>Valor Pendente</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientDebts.length > 0 ? (
                    clientDebts.map((client) => (
                      <TableRow key={client.clientId}>
                        <TableCell>
                          <div className="font-medium">{client.nomeCliente}</div>
                          <div className="text-sm text-muted-foreground">
                            {client.telefone}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{client.orderCount}</Badge>
                        </TableCell>
                        <TableCell className="font-semibold text-destructive">
                          {formatCurrency(client.totalPendente)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                             <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCharge(client)}
                            >
                                <MessageCircle className="mr-2 h-4 w-4" />
                                Cobrar
                            </Button>
                             <Button
                              size="sm"
                              onClick={() => setPayingClient(client)}
                            >
                              <DollarSign className="mr-2 h-4 w-4" />
                              Pagar
                            </Button>
                            <Button asChild size="sm" variant="ghost">
                                <Link href={`/encomendas?status=PENDENTE&cliente=${client.nomeCliente}`}>
                                 <ArrowRight className="h-4 w-4" />
                                </Link>
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
                        Nenhum cliente com pendências para os filtros aplicados.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
           {!isLoading && !allPendingOrders && (
             <div className="text-center p-8 border-2 border-dashed rounded-md flex flex-col items-center gap-2">
                <AlertCircle className="h-8 w-8 text-destructive"/>
                <p className="font-semibold text-destructive">Ocorreu um erro</p>
                <p className="text-muted-foreground text-sm">Não foi possível carregar os dados. Tente novamente mais tarde.</p>
            </div>
           )}
        </CardContent>
      </Card>
    </div>

    {payingClient && (
        <RecordPaymentDialog
            clientDebt={payingClient}
            isOpen={!!payingClient}
            setIsOpen={() => setPayingClient(null)}
            onPaymentRecorded={handlePaymentSuccess}
        />
    )}
    </>
  );
}
