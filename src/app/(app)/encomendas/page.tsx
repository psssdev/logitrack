'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  PlusCircle,
  File,
  Trash,
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
  deleteDoc,
} from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo, useState, useTransition, Suspense } from 'react';
import { Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { triggerRevalidation } from '@/lib/actions';
import { format, isWithinInterval } from 'date-fns';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { DatePickerWithRange } from '@/components/date-range-picker';
import { useStore } from '@/contexts/store-context';

const statusLabels: Record<OrderStatus, string> = {
  PENDENTE: 'Pendente',
  EM_ROTA: 'Em Rota',
  ENTREGUE: 'Entregue',
  CANCELADA: 'Cancelada',
};

function EncomendasContent() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { selectedStore } = useStore();
  const { toast } = useToast();
  const [isUpdating, startTransition] = useTransition();
  const searchParams = useSearchParams();
  
  const activeTab = (searchParams.get('status') as OrderStatus) || 'TODAS';
  const clientFilter = searchParams.get('cliente');

  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);

  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const isSpecialUser = user?.email === 'jiverson.t@gmail.com';

  const statuses: OrderStatus[] = [
    'PENDENTE',
    'EM_ROTA',
    'ENTREGUE',
    'CANCELADA',
  ];

  const storeOrdersQuery = useMemoFirebase(() => {
    if (!firestore || !selectedStore) return null;
    return query(collection(firestore, 'stores', selectedStore.id, 'orders'), orderBy('createdAt', 'desc'));
  }, [firestore, selectedStore]);

  const legacyOrdersQuery = useMemoFirebase(() => {
    if (!firestore || !isSpecialUser) return null;
    return query(collection(firestore, 'orders'), orderBy('createdAt', 'desc'));
  }, [firestore, isSpecialUser]);

  const { data: storeOrders, isLoading: isLoadingStoreOrders } = useCollection<Order>(storeOrdersQuery);
  const { data: legacyOrders, isLoading: isLoadingLegacyOrders } = useCollection<Order>(legacyOrdersQuery);

  const combinedOrders = useMemo(() => {
    const allOrders = new Map<string, Order>();

    // Only add legacy orders if the user is the special user
    if (isSpecialUser && legacyOrders) {
      legacyOrders.forEach(order => {
        if (!order.storeId) { // Ensure we don't double-add migrated data
            allOrders.set(order.id, order);
        }
      });
    }

    // Always add store-specific orders
    if (storeOrders) {
      storeOrders.forEach(order => allOrders.set(order.id, order));
    }
    
    return Array.from(allOrders.values()).sort((a,b) => (b.createdAt as Timestamp).toMillis() - (a.createdAt as Timestamp).toMillis());
  }, [storeOrders, legacyOrders, isSpecialUser]);


  const pageIsLoading = isLoadingStoreOrders || (isSpecialUser && isLoadingLegacyOrders) || isUserLoading || !selectedStore;
  

  const filteredOrdersForTab = useMemo(() => {
    if (!combinedOrders) return [];
    
    let filtered = combinedOrders;
    
    if (activeTab !== 'TODAS') {
        filtered = filtered.filter((order) => order.status === activeTab);
    }
    
    if (clientFilter) {
        filtered = filtered.filter(order => order.nomeCliente.toLowerCase().includes(clientFilter.toLowerCase()));
    }
    
    if (dateRange?.from && dateRange?.to) {
        filtered = filtered.filter(order => {
            const orderDate = order.createdAt instanceof Timestamp ? order.createdAt.toDate() : new Date(order.createdAt);
            return isWithinInterval(orderDate, { start: dateRange.from!, end: dateRange.to! });
        })
    }

    return filtered;
  }, [combinedOrders, activeTab, clientFilter, dateRange]);

  const statusCounts = useMemo(() => {
    if (!combinedOrders)
      return { TODAS: 0, PENDENTE: 0, EM_ROTA: 0, ENTREGUE: 0, CANCELADA: 0 };
      
    let ordersToCount = combinedOrders;
     if (clientFilter) {
        ordersToCount = combinedOrders.filter(order => order.nomeCliente.toLowerCase().includes(clientFilter.toLowerCase()));
    }
     if (dateRange?.from && dateRange?.to) {
        ordersToCount = ordersToCount.filter(order => {
            const orderDate = order.createdAt instanceof Timestamp ? order.createdAt.toDate() : new Date(order.createdAt);
            return isWithinInterval(orderDate, { start: dateRange.from!, end: dateRange.to! });
        })
    }

    const counts = ordersToCount.reduce(
      (acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      },
      {} as Record<OrderStatus, number>
    );

    return {
      TODAS: ordersToCount.length,
      PENDENTE: counts.PENDENTE || 0,
      EM_ROTA: counts.EM_ROTA || 0,
      ENTREGUE: counts.ENTREGUE || 0,
      CANCELADA: counts.CANCELADA || 0,
    };
  }, [combinedOrders, clientFilter, dateRange]);

  const allStatuses = ['TODAS', ...statuses] as const;

  const handleBulkStatusUpdate = (newStatus: OrderStatus) => {
    startTransition(async () => {
      if (!firestore || !user || !selectedStore || selectedOrderIds.length === 0) return;

      const batch = writeBatch(firestore);
      const updatedOrders: Order[] = [];

      selectedOrderIds.forEach((id) => {
        const order = combinedOrders?.find((o) => o.id === id);
        // Determine the correct path
        const orderRef = doc(firestore, order?.storeId ? `stores/${order.storeId}/orders` : 'orders', id);

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
      }
    });
  };

  const confirmDelete = async () => {
    if (!firestore || !orderToDelete) return;
    try {
      // Use the storeId from the order to build the correct path
      const docPath = orderToDelete.storeId 
          ? `stores/${orderToDelete.storeId}/orders/${orderToDelete.id}`
          : `orders/${orderToDelete.id}`;
          
      const orderRef = doc(firestore, docPath);

      await deleteDoc(orderRef);
      await triggerRevalidation('/encomendas');
      await triggerRevalidation('/inicio');
      toast({
        title: 'Encomenda excluída',
        description: `A encomenda "${orderToDelete.codigoRastreio}" foi removida.`,
      });
    } catch(error: any) {
        toast({
            variant: "destructive",
            title: "Erro ao excluir",
            description: error.message,
        });
    } finally {
        setOrderToDelete(null);
        setShowDeleteAlert(false);
    }
  }

  const handleDeleteClick = (order: Order) => {
    setOrderToDelete(order);
    setShowDeleteAlert(true);
  }

  const exportToCSV = () => {
    const ordersToExport = filteredOrdersForTab;

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
        <div className="flex items-start md:items-center flex-col md:flex-row gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-semibold md:text-3xl">
              Encomendas
            </h1>
              {clientFilter && <span className="text-base text-muted-foreground font-normal">(Filtrando por cliente: {clientFilter})</span>}
          </div>
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
        <Tabs value={activeTab}>
          <ScrollArea className="w-full whitespace-nowrap rounded-md">
            <div className="flex items-center gap-2 pb-2">
                 <TabsList className="flex-1 sm:flex-initial h-auto">
                    {allStatuses.map((status) => {
                        const label = status === 'TODAS' ? 'Todas' : statusLabels[status as OrderStatus];
                        const count = pageIsLoading ? '' : `(${statusCounts[status]})`;
                        return (
                        <Link
                            key={status}
                            href={status === 'TODAS' ? '/encomendas' : `/encomendas?status=${status}`}
                            scroll={false}
                        >
                            <TabsTrigger value={status}>
                            {label} {count}
                            </TabsTrigger>
                        </Link>
                        );
                    })}
                 </TabsList>
                 <div className="hidden sm:block">
                    <DatePickerWithRange date={dateRange} setDate={setDateRange} />
                 </div>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
           <div className="sm:hidden mt-2">
                <DatePickerWithRange date={dateRange} setDate={setDateRange} />
            </div>

          {pageIsLoading && (
            <Card>
              <CardContent>
                <Skeleton className="w-full h-64 mt-4" />
              </CardContent>
            </Card>
          )}

          {combinedOrders &&
            !pageIsLoading &&
            allStatuses.map((status) => {
               const label = status === 'TODAS' ? 'Todas' : statusLabels[status as OrderStatus];

              return (
                <TabsContent key={status} value={status}>
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>{label}</CardTitle>
                          <CardDescription>
                            {filteredOrdersForTab.length} encomenda(s) encontrada(s).
                          </CardDescription>
                        </div>
                        {selectedOrderIds.length > 0 && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                disabled={isUpdating}
                              >
                                {`Ações para ${selectedOrderIds.length} item(s)`}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              {statuses.map((s) => (
                                <DropdownMenuItem
                                  key={s}
                                  onClick={() => handleBulkStatusUpdate(s)}
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
                        orders={filteredOrdersForTab}
                        selectedOrderIds={selectedOrderIds}
                        setSelectedOrderIds={setSelectedOrderIds}
                        initialFilter={clientFilter || ''}
                        onDeleteClick={handleDeleteClick}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>
              );
            })}
        </Tabs>
      </div>
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                <AlertDialogDescription>
                   Esta ação não pode ser desfeita. Isso excluirá permanentemente a encomenda <span className="font-bold font-mono">"{orderToDelete?.codigoRastreio}"</span>.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setOrderToDelete(null)}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete}>Excluir</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function EncomendasPage() {
  return (
    <Suspense fallback={<Skeleton className="w-full h-96" />}>
      <EncomendasContent />
    </Suspense>
  )
}
