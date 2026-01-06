'use client';

import { useMemo, useState } from 'react';
import { type DateRange } from 'react-day-picker';
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
import {
  useCollection,
  useDoc,
  useFirestore,
  useMemoFirebase,
  useUser,
} from '@/firebase';
import type { Order, Company } from '@/lib/types';
import { collection, query, where, doc, Timestamp } from 'firebase/firestore';
import {
  format,
  isWithinInterval,
} from 'date-fns';
import {
  MessageCircle,
  DollarSign,
  AlertCircle,
  Download,
  ArrowRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { RecordPaymentDialog } from '@/components/record-payment-dialog';
import { useToast } from '@/hooks/use-toast';
import { triggerRevalidation } from '@/lib/actions';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/date-range-picker';
import Link from 'next/link';
import { useStore } from '@/contexts/store-context';

const formatCurrency = (value?: number | null) => {
  const safe = typeof value === 'number' && !isNaN(value) ? value : 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(safe);
};

const toDate = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
};

const openWhatsApp = (phone: string | undefined | null, message: string) => {
  if (!phone) return;
  const cleanedPhone = phone.replace(/\D/g, '');
  if (!cleanedPhone) return;

  const fullPhone = cleanedPhone.startsWith('55')
    ? cleanedPhone
    : `55${cleanedPhone}`;
  const url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
};

interface ClientDebt {
  clientId: string;
  nomeCliente: string;
  telefone?: string;
  totalPendente: number;
  orderCount: number;
  pendingOrders: Order[];
}

export default function CobrancasPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { selectedStore } = useStore();
  const { toast } = useToast();

  // Filter states
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState<'all' | string>('all');
  const [payingClient, setPayingClient] = useState<ClientDebt | null>(null);
  
  const isSpecialUser = user?.email === 'jiverson.t@gmail.com';

  const storePendingOrdersQuery = useMemoFirebase(() => {
    if (!firestore || !selectedStore) return null;
    return query(
      collection(firestore, 'stores', selectedStore.id, 'orders'),
      where('pago', '==', false)
    );
  }, [firestore, selectedStore]);
  
  const legacyPendingOrdersQuery = useMemoFirebase(() => {
    if (!firestore || !isSpecialUser) return null;
    return query(
      collection(firestore, 'orders'),
      where('pago', '==', false)
    );
  }, [firestore, isSpecialUser]);

  const { data: storePendingOrders, isLoading: isLoadingStoreOrders } = useCollection<Order>(storePendingOrdersQuery);
  const { data: legacyPendingOrders, isLoading: isLoadingLegacyOrders } = useCollection<Order>(legacyPendingOrdersQuery);

  const allPendingOrders = useMemo(() => {
    const allOrders = new Map<string, Order>();
    if (isSpecialUser && legacyPendingOrders) {
        legacyPendingOrders.forEach(order => {
            if(!order.storeId) {
                allOrders.set(order.id, order);
            }
        });
    }
    if (storePendingOrders) {
      storePendingOrders.forEach(order => allOrders.set(order.id, order));
    }
    return Array.from(allOrders.values());
  }, [storePendingOrders, legacyPendingOrders, isSpecialUser]);


  const companyRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    // Assuming a single company doc with ID '1'
    return doc(firestore, 'companies', '1');
  }, [firestore, user]);

  const { data: company, isLoading: isLoadingCompany } =
    useDoc<Company>(companyRef);

  const isLoading = isUserLoading || isLoadingStoreOrders || (isSpecialUser && isLoadingLegacyOrders) || isLoadingCompany;

  const cities = useMemo(() => {
    if (!allPendingOrders) return [];
    const citySet = new Set<string>();

    allPendingOrders.forEach((order) => {
      if (typeof order.destino === 'string') {
        const parts = order.destino.split(',').map((p) => p.trim());
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
    if (!allPendingOrders) {
      return {
        clientDebts: [] as ClientDebt[],
        summary: {
          totalPendente: 0,
          totalClientes: 0,
          totalEncomendas: 0,
        },
      };
    }

    const filteredByDateAndCity = allPendingOrders.filter((order) => {
      const orderDate = toDate(order.createdAt);

      const isDateInRange =
        !dateRange?.from || !dateRange?.to || !orderDate
          ? true
          : isWithinInterval(orderDate, {
              start: dateRange.from,
              end: dateRange.to,
            });

      const orderCityParts =
        typeof order.destino === 'string'
          ? order.destino.split(',').map((p) => p.trim())
          : [];
      const orderCity =
        orderCityParts.length >= 2
          ? orderCityParts[orderCityParts.length - 2]
          : '';

      const isCityMatch =
        selectedCity === 'all' || orderCity === selectedCity;

      return isDateInRange && isCityMatch;
    });

    const debtsByClient = filteredByDateAndCity.reduce(
      (acc, order) => {
        const payments = Array.isArray(order.payments)
          ? order.payments
          : [];
        const paidAmount =
          payments.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

        const valorEntrega =
          typeof order.valorEntrega === 'number'
            ? order.valorEntrega
            : 0;
        const pendingAmount = valorEntrega - paidAmount;

        if (pendingAmount <= 0) return acc;

        const clientId = order.clientId || 'sem-id';
        if (!acc[clientId]) {
          acc[clientId] = {
            clientId,
            nomeCliente: order.nomeCliente || 'Cliente sem nome',
            telefone: order.telefone,
            totalPendente: 0,
            orderCount: 0,
            pendingOrders: [],
          };
        }

        acc[clientId].totalPendente += pendingAmount;
        acc[clientId].orderCount += 1;
        acc[clientId].pendingOrders.push(order);

        return acc;
      },
      {} as Record<string, ClientDebt>
    );

    const debtList = Object.values(debtsByClient).sort(
      (a, b) => b.totalPendente - a.totalPendente
    );

    const filteredByName = searchTerm
      ? debtList.filter((client) =>
          (client.nomeCliente || '')
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
        )
      : debtList;

    const summaryData = {
      totalPendente: filteredByName.reduce(
        (sum, client) => sum + client.totalPendente,
        0
      ),
      totalClientes: filteredByName.length,
      totalEncomendas: filteredByName.reduce(
        (sum, client) => sum + client.orderCount,
        0
      ),
    };

    return { clientDebts: filteredByName, summary: summaryData };
  }, [allPendingOrders, dateRange, selectedCity, searchTerm]);

  const handleCharge = (client: ClientDebt) => {
    if (!client.telefone) {
      toast({
        variant: 'destructive',
        title: 'Telefone ausente',
        description:
          'Não foi possível enviar a cobrança porque o cliente não possui telefone cadastrado.',
      });
      return;
    }

    const messageTemplate =
      company?.msgCobranca ||
      'Olá {cliente}, tudo bem? Verificamos que há uma pendência de {valor} referente a {quantidade} encomenda(s). Poderia nos dar um retorno sobre o pagamento? Obrigado!';

    const message = messageTemplate
      .replace('{cliente}', client.nomeCliente || 'cliente')
      .replace('{valor}', formatCurrency(client.totalPendente))
      .replace('{quantidade}', client.orderCount.toString());

    openWhatsApp(client.telefone, message);
  };

  const handlePaymentSuccess = async () => {
    await triggerRevalidation('/cobrancas');
    await triggerRevalidation('/encomendas');
    toast({
      title: 'Sucesso!',
      description: 'A lista de cobranças foi atualizada.',
    });
  };

  const exportToCSV = () => {
    if (clientDebts.length === 0) {
      toast({ description: 'Nenhum dado para exportar.' });
      return;
    }

    const headers = [
      'Cliente',
      'Telefone',
      'Qtd. Encomendas',
      'Valor Pendente Total',
    ];
    const rows = clientDebts.map((client) =>
      [
        `"${(client.nomeCliente || '')
          .replace(/"/g, '""')
          .trim()}"`,
        client.telefone || '',
        client.orderCount,
        client.totalPendente.toFixed(2),
      ].join(',')
    );

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cobrancas_por_cliente_${format(
      new Date(),
      'yyyy-MM-dd'
    )}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
              <CardDescription>
                Soma de todos os valores não pagos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-3/4" />
              ) : (
                <p className="text-3xl font-bold text-destructive">
                  {formatCurrency(summary.totalPendente)}
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Clientes Devedores</CardTitle>
              <CardDescription>
                Total de clientes com pendências.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-3/4" />
              ) : (
                <p className="text-3xl font-bold">
                  {summary.totalClientes}
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Encomendas Pendentes</CardTitle>
              <CardDescription>
                Total de encomendas com pagamento pendente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-3/4" />
              ) : (
                <p className="text-3xl font-bold">
                  {summary.totalEncomendas}
                </p>
              )}
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
              <DatePickerWithRange
                date={dateRange}
                setDate={setDateRange}
              />
              <Select
                value={selectedCity}
                onValueChange={setSelectedCity}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por cidade de destino" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Cidades</SelectItem>
                  {cities.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Buscar por nome do cliente..."
                value={searchTerm}
                onChange={(e) =>
                  setSearchTerm(e.target.value)
                }
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
                      <TableHead className="text-center">
                        Nº de Encomendas
                      </TableHead>
                      <TableHead>Valor Pendente</TableHead>
                      <TableHead className="text-right">
                        Ações
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientDebts.length > 0 ? (
                      clientDebts.map((client) => (
                        <TableRow key={client.clientId}>
                          <TableCell>
                            <div className="font-medium">
                              {client.nomeCliente ||
                                'Cliente sem nome'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {client.telefone || 'Sem telefone'}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">
                              {client.orderCount}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-semibold text-destructive">
                            {formatCurrency(
                              client.totalPendente
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleCharge(client)
                                }
                              >
                                <MessageCircle className="mr-2 h-4 w-4" />
                                Cobrar
                              </Button>
                              <Button
                                size="sm"
                                onClick={() =>
                                  setPayingClient(client)
                                }
                              >
                                <DollarSign className="mr-2 h-4 w-4" />
                                Pagar
                              </Button>
                              <Button
                                asChild
                                size="sm"
                                variant="ghost"
                              >
                                <Link
                                  href={`/encomendas?status=PENDENTE&pago=false&cliente=${encodeURIComponent(
                                    client.nomeCliente ||
                                      ''
                                  )}`}
                                >
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
                          Nenhum cliente com pendências para os
                          filtros aplicados.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
            {!isLoading && !allPendingOrders && (
              <div className="flex flex-col items-center gap-2 rounded-md border-2 border-dashed p-8 text-center">
                <AlertCircle className="h-8 w-8 text-destructive" />
                <p className="font-semibold text-destructive">
                  Ocorreu um erro
                </p>
                <p className="text-sm text-muted-foreground">
                  Não foi possível carregar os dados. Tente novamente
                  mais tarde.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {payingClient && (
        <RecordPaymentDialog
          clientDebt={payingClient}
          isOpen={!!payingClient}
          setIsOpen={(open) => {
            if (!open) setPayingClient(null);
          }}
          onPaymentRecorded={handlePaymentSuccess}
        />
      )}
    </>
  );
}
