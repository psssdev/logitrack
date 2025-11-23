'use client';

import Link from 'next/link';
import {
  PlusCircle,
  File,
  Truck,
  Megaphone,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { OrderTable } from '@/components/order-table';
import type { Order, OrderStatus } from '@/lib/types';
import {
  useCollection,
  useFirestore,
  useMemoFirebase,
  useUser,
} from '@/firebase';
import {
  collection,
  query,
  orderBy,
  writeBatch,
  doc,
  arrayUnion,
} from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo, useState, useTransition } from 'react';
import { Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { triggerRevalidation } from '@/lib/actions';
import { format } from 'date-fns';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

const openWhatsApp = (phone: string, message: string) => {
  const cleanedPhone = phone.replace(/\\D/g, '');
  const fullPhone = cleanedPhone.startsWith('55')
    ? cleanedPhone
    : `55${cleanedPhone}`;
  const url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
};

const statusLabels: Record<OrderStatus, string> = {
  PENDENTE: 'Pendente',
  EM_ROTA: 'Em Rota',
  ENTREGUE: 'Entregue',
  CANCELADA: 'Cancelada',
};

export default function EncomendasPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [isUpdating, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<string>('TODAS');
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [showNotifyAlert, setShowNotifyAlert] = useState(false);
  const [pendingBulkStatus, setPendingBulkStatus] =
    useState<OrderStatus | null>(null);

  const statuses: OrderStatus[] = [
    'PENDENTE',
    'EM_ROTA',
    'ENTREGUE',
    'CANCELADA',
  ];

  const ordersQuery = useMemoFirebase(() => {
    if (!firestore || isUserLoading || !user) return null;
    return query(collection(firestore, 'orders'), orderBy('createdAt', 'desc'));
  }, [firestore, isUserLoading, user]);

  const { data: orders, isLoading: isLoadingOrders } =
    useCollection<Order>(ordersQuery);

  const pageIsLoading = isLoadingOrders || isUserLoading;

  const filteredOrdersForTab = useMemo(() => {
    if (!orders) return [];
    if (activeTab === 'TODAS') return orders;
    return orders.filter((order) => order.status === activeTab);
  }, [orders, activeTab]);

  const statusCounts = useMemo(() => {
    if (!orders)
      return { TODAS: 0, PENDENTE: 0, EM_ROTA: 0, ENTREGUE: 0, CANCELADA: 0 };

    const counts = orders.reduce(
      (acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      },
      {} as Record<OrderStatus, number>
    );

    return {
      TODAS: orders.length,
      PENDENTE: counts.PENDENTE || 0,
      EM_ROTA: counts.EM_ROTA || 0,
      ENTREGUE: counts.ENTREGUE || 0,
      CANCELADA: counts.CANCELADA || 0,
    };
  }, [orders]);

  const allStatuses = ['TODAS', ...statuses] as const;

  const handleBulkStatusUpdate = (
    newStatus: OrderStatus,
    notify: boolean = false
  ) => {
    startTransition(async () => {
      if (!firestore || !user || selectedOrderIds.length === 0) return;

      const batch = writeBatch(firestore);
      const updatedOrders: Order[] = [];

      selectedOrderIds.forEach((id) => {
        const orderRef = doc(firestore, 'orders', id);
        const order = orders?.find((o) => o.id === id);
        if (order && order.status !== newStatus) {
          batch.update(orderRef, {
            status: newStatus,
            timeline: arrayUnion({
              status: newStatus,
              at: new Date(),
              userId: user.uid,
            }),
          });
          updatedOrders.push(order);
        }
      });

      try {
        await batch.commit();
        await triggerRevalidation('/encomendas');
        await triggerRevalidation('/inicio');

        toast({
          title: 'Sucesso!',
          description: `${updatedOrders.length} encomenda(s) atualizada(s) para "${statusLabels[newStatus]}".`,
        });

        if (notify && newStatus === 'EM_ROTA' && updatedOrders.length > 0) {
          for (const order of updatedOrders) {
            const messageTemplate =
              'Olá {cliente}! Sua encomenda {codigo} saiu para entrega.';
            const message = messageTemplate
              .replace('{cliente}', order.nomeCliente)
              .replace('{codigo}', order.codigoRastreio);
            openWhatsApp(order.telefone, message);
            // Add a small delay between opening tabs
            await new Promise((resolve) => setTimeout(resolve, 300));
          }
        }
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Erro ao atualizar',
          description:
            error.message ||
            'Não foi possível atualizar as encomendas selecionadas.',
        });
      } finally {
        setSelectedOrderIds([]);
        setPendingBulkStatus(null);
        setShowNotifyAlert(false);
      }
    });
  };

  const startBulkUpdate = (newStatus: OrderStatus) => {
    if (newStatus === 'EM_ROTA') {
      setPendingBulkStatus(newStatus);
      setShowNotifyAlert(true);
    } else {
      handleBulkStatusUpdate(newStatus);
    }
  };

  const exportToCSV = () => {
    const ordersToExport =
      activeTab === 'TODAS'
        ? orders
        : orders?.filter((o) => o.status === activeTab);

    if (!ordersToExport || ordersToExport.length === 0) {
      toast({
        description: 'Nenhuma encomenda para exportar na aba atual.',
      });
      return;
    }

    const headers = [
      'Data',
      'Código',
      'Cliente',
      'Telefone',
      'Origem',
      'Destino',
      'Valor',
      'Status',
      'Forma Pagamento',
    ];

    const escapeCSV = (field: any) => {
      if (typeof field === 'string') {
        const cleanField = field.replace(/"/g, '""');
        if (cleanField.includes(',')) {
          return `"${cleanField}"`;
        }
        return cleanField;
      }
      return field;
    };

    const rows = ordersToExport.map((order) => {
      const orderDate =
        order.createdAt instanceof Timestamp
          ? order.createdAt.toDate()
          : new Date(order.createdAt);
      return [
        format(orderDate, 'yyyy-MM-dd'),
        order.codigoRastreio,
        escapeCSV(order.nomeCliente),
        order.telefone,
        escapeCSV(order.origem),
        escapeCSV(order.destino),
        order.valorEntrega.toFixed(2),
        order.status,
        order.formaPagamento,
      ].join(',');
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `encomendas_${activeTab.toLowerCase()}_${format(
        new Date(),
        'yyyy-MM-dd'
      )}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Exportação Iniciada',
      description: 'O download do arquivo CSV deve começar em breve.',
    });
  };

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex items-center">
          <h1 className="flex-1 text-2xl font-semibold md:text-3xl">
            Encomendas
          </h1>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1"
              onClick={exportToCSV}
            >
              <File className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Exportar
              </span>
            </Button>
            <Button size="sm" className="h-8 gap-1" asChild>
              <Link href="/encomendas/nova">
                <PlusCircle className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  Nova Encomenda
                </span>
              </Link>
            </Button>
          </div>
        </div>
        <Tabs
          defaultValue="TODAS"
          onValueChange={(tab) => {
            setActiveTab(tab);
            setSelectedOrderIds([]); // Clear selection when changing tabs
          }}
        >
          <ScrollArea className="w-full whitespace-nowrap rounded-md">
            <TabsList className="grid w-full grid-cols-5">
              {allStatuses.map((status) => {
                const label = status
                  .charAt(0)
                  .concat(status.slice(1).toLowerCase().replace('_', ' '));
                const count = pageIsLoading ? '' : `(${statusCounts[status]})`;
                return (
                  <TabsTrigger key={status} value={status}>
                    {label} {count}
                  </TabsTrigger>
                );
              })}
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          {pageIsLoading && (
            <Card>
              <CardContent>
                <Skeleton className="w-full h-64 mt-4" />
              </CardContent>
            </Card>
          )}

          {orders &&
            !pageIsLoading &&
            allStatuses.map((status) => {
              const filteredForTab =
                status === 'TODAS'
                  ? orders
                  : orders.filter((order) => order.status === status);
              const label = status
                .charAt(0)
                .concat(status.slice(1).toLowerCase().replace('_', ' '));

              return (
                <TabsContent key={status} value={status}>
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>{label}</CardTitle>
                          <CardDescription>
                            {filteredForTab.length} encomenda(s) encontrada(s).
                          </CardDescription>
                        </div>
                        {selectedOrderIds.length > 0 && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                disabled={isUpdating}
                              >
                                {isUpdating ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  'Ações em Massa'
                                )}
                                <ChevronDown className="ml-2 h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              {statuses.map((s) => (
                                <DropdownMenuItem
                                  key={s}
                                  onClick={() => startBulkUpdate(s)}
                                >
                                  Mudar para {statusLabels[s]}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <OrderTable
                        orders={filteredForTab}
                        selectedOrderIds={selectedOrderIds}
                        setSelectedOrderIds={setSelectedOrderIds}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>
              );
            })}
        </Tabs>
      </div>

      <AlertDialog
        open={showNotifyAlert}
        onOpenChange={setShowNotifyAlert}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Notificar Clientes?</AlertDialogTitle>
            <AlertDialogDescription>
              Você alterou o status para "Em Rota". Deseja abrir o WhatsApp
              para enviar uma notificação para os clientes selecionados?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => handleBulkStatusUpdate(pendingBulkStatus!, false)}
            >
              Não, apenas alterar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleBulkStatusUpdate(pendingBulkStatus!, true)}
            >
              Sim, alterar e notificar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
