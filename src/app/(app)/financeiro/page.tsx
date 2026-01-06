
'use client';

import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PlusCircle, MoreHorizontal, ArrowUpCircle, ArrowDownCircle, CircleDollarSign, Edit, Trash, Settings, FileWarning } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import type { FinancialEntry, Order } from '@/lib/types';
import { collection, query, orderBy, Timestamp, doc, deleteDoc } from 'firebase/firestore';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { triggerRevalidation } from '@/lib/actions';
import { useStore } from '@/contexts/store-context';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    value
  );

const formatDate = (date: Date | Timestamp) => {
  if (date instanceof Timestamp) {
    return date.toDate().toLocaleDateString('pt-BR');
  }
  return new Date(date).toLocaleDateString('pt-BR');
}

export default function FinanceiroPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { selectedStore } = useStore();
  const { toast } = useToast();

  const [deletingEntry, setDeletingEntry] = React.useState<FinancialEntry | null>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = React.useState(false);
  const isSpecialUser = user?.email === 'jiverson.t@gmail.com';

  const storeEntriesQuery = useMemoFirebase(() => {
    if (!firestore || !selectedStore) return null;
    return query(collection(firestore, 'stores', selectedStore.id, 'financialEntries'), orderBy('date', 'desc'));
  }, [firestore, selectedStore]);

  const legacyEntriesQuery = useMemoFirebase(() => {
    if (!firestore || !isSpecialUser) return null;
    return query(collection(firestore, 'financialEntries'), orderBy('date', 'desc'));
  }, [firestore, isSpecialUser]);
  
  const storeOrdersQuery = useMemoFirebase(() => {
    if (!firestore || !selectedStore) return null;
    return query(collection(firestore, 'stores', selectedStore.id, 'orders'));
  }, [firestore, selectedStore]);

  const legacyOrdersQuery = useMemoFirebase(() => {
    if (!firestore || !isSpecialUser) return null;
    return query(collection(firestore, 'orders'));
  }, [firestore, isSpecialUser]);

  const { data: storeEntries, isLoading: isLoadingStoreEntries } = useCollection<FinancialEntry>(storeEntriesQuery);
  const { data: legacyEntries, isLoading: isLoadingLegacyEntries } = useCollection<FinancialEntry>(legacyEntriesQuery);
  const { data: storeOrders, isLoading: isLoadingStoreOrders } = useCollection<Order>(storeOrdersQuery);
  const { data: legacyOrders, isLoading: isLoadingLegacyOrders } = useCollection<Order>(legacyOrdersQuery);

  const combinedEntries = useMemo(() => {
    const allEntries = new Map<string, FinancialEntry>();
    if (isSpecialUser && legacyEntries) {
        legacyEntries.forEach(entry => {
            if (!entry.storeId) {
                allEntries.set(entry.id, entry);
            }
        });
    }
    if (storeEntries) {
      storeEntries.forEach(entry => allEntries.set(entry.id, entry));
    }
    return Array.from(allEntries.values()).sort((a,b) => (b.date as Timestamp).toMillis() - (a.date as Timestamp).toMillis());
  }, [storeEntries, legacyEntries, isSpecialUser]);

  const combinedOrders = useMemo(() => {
    const allOrders = new Map<string, Order>();
    if (isSpecialUser && legacyOrders) {
        legacyOrders.forEach(order => {
            if (!order.storeId) {
                allOrders.set(order.id, order);
            }
        });
    }
    if (storeOrders) {
      storeOrders.forEach(order => allOrders.set(order.id, order));
    }
    return Array.from(allOrders.values());
  }, [storeOrders, legacyOrders, isSpecialUser]);


  const pageIsLoading = (isSpecialUser && (isLoadingLegacyEntries || isLoadingLegacyOrders)) || isLoadingStoreEntries || isLoadingStoreOrders || isUserLoading;

  const summary = React.useMemo(() => {
    const initialSummary = { entradas: 0, saidas: 0, saldo: 0, aReceber: 0 };
    if (!combinedEntries || !combinedOrders) return initialSummary;

    const financialSummary = combinedEntries.reduce((acc, entry) => {
        if(entry.type === 'Entrada') {
            acc.entradas += entry.amount;
        } else {
            acc.saidas += entry.amount;
        }
        return acc;
    }, { entradas: 0, saidas: 0 });

    const receivableSummary = combinedOrders.reduce((acc, order) => {
        if(!order.pago) {
            const paidAmount = order.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
            acc += (order.valorEntrega - paidAmount);
        }
        return acc;
    }, 0);

    return {
        entradas: financialSummary.entradas,
        saidas: financialSummary.saidas,
        saldo: financialSummary.entradas - financialSummary.saidas,
        aReceber: receivableSummary,
    };
  }, [combinedEntries, combinedOrders]);
  
  const handleDelete = (entry: FinancialEntry) => {
    setDeletingEntry(entry);
    setIsDeleteAlertOpen(true);
  }

  const confirmDelete = async () => {
    if (!firestore || !deletingEntry) return;
    try {
        const docRef = doc(firestore, deletingEntry.storeId ? `stores/${deletingEntry.storeId}/financialEntries` : 'financialEntries', deletingEntry.id);
        await deleteDoc(docRef);
        await triggerRevalidation('/financeiro');
        toast({ title: 'Lançamento excluído com sucesso.' });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Erro ao excluir', description: error.message });
    } finally {
        setIsDeleteAlertOpen(false);
        setDeletingEntry(null);
    }
  };


  return (
    <>
    <div className="flex flex-col gap-6">
      <div className="flex items-center flex-wrap gap-y-2">
        <h1 className="flex-1 text-2xl font-semibold md:text-3xl">
          Controle Financeiro
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" asChild>
                <Link href="/categorias">
                    <Settings className="h-4 w-4 mr-2" />
                    Categorias
                </Link>
            </Button>
            <Button asChild>
                <Link href="/vender-passagem">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Nova Receita
                </Link>
            </Button>
             <Button asChild>
                <Link href="/financeiro/despesa/nova">
                    <ArrowDownCircle className="h-4 w-4 mr-2" />
                    Nova Despesa
                </Link>
            </Button>
        </div>
      </div>

       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Entradas</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {pageIsLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.entradas)}</div>}
          </CardContent>
        </Card>
        <Link href="/financeiro/despesa/nova">
          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Saídas</CardTitle>
              <ArrowDownCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
            {pageIsLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold text-destructive">{formatCurrency(summary.saidas)}</div>}
            </CardContent>
          </Card>
        </Link>
        <Link href="/cobrancas">
            <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Contas a Receber</CardTitle>
                <FileWarning className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
                {pageIsLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold text-yellow-600">{formatCurrency(summary.aReceber)}</div>}
            </CardContent>
            </Card>
        </Link>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Atual</CardTitle>
             <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {pageIsLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold">{formatCurrency(summary.saldo)}</div>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Últimos Lançamentos</CardTitle>
          <CardDescription>
            Visualize as últimas transações financeiras registradas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pageIsLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <EntryList entries={combinedEntries || []} onDelete={handleDelete} />
          )}
        </CardContent>
      </Card>
    </div>
     <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                <AlertDialogDescription>
                   Esta ação não pode ser desfeita. Isso excluirá permanentemente o lançamento: <span className="font-bold">"{deletingEntry?.description}"</span> no valor de <span className="font-bold">{formatCurrency(deletingEntry?.amount || 0)}</span>.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete}>Excluir</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function EntryList({ entries, onDelete }: { entries: FinancialEntry[], onDelete: (entry: FinancialEntry) => void }) {
    if (entries.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/30 p-12 text-center">
          <p className="text-muted-foreground">Nenhum lançamento encontrado.</p>
          <p className="text-sm text-muted-foreground/80">
            Adicione uma entrada ou saída para começar a gerenciar suas finanças.
          </p>
        </div>
      );
    }
  
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>
                <span className="sr-only">Ações</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>
                  <div className="font-medium">{entry.description}</div>
                  <div className="text-sm text-muted-foreground">
                    {entry.clientName && <span>{entry.clientName}</span>}
                    {entry.driverName && <span className="ml-1">({entry.driverName})</span>}
                  </div>
                </TableCell>
                <TableCell>{formatDate(entry.date)}</TableCell>
                <TableCell className={entry.type === 'Entrada' ? 'text-green-600' : 'text-destructive'}>
                    {entry.type === 'Saída' && '- '}{formatCurrency(entry.amount)}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end">
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem asChild>
                                <Link href={`/financeiro/${entry.id}/editar`}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Editar
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onSelect={() => onDelete(entry)}>
                                <Trash className="mr-2 h-4 w-4" />
                                Excluir
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

    
