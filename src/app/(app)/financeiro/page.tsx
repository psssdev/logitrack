'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PlusCircle, MoreHorizontal, ArrowUpCircle, ArrowDownCircle, Landmark, Edit, Trash, Settings } from 'lucide-react';
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
import type { FinancialEntry } from '@/lib/types';
import { collection, query, orderBy, Timestamp, doc, deleteDoc } from 'firebase/firestore';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { triggerRevalidation } from '@/lib/actions';

const COMPANY_ID = '1';

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
  const { toast } = useToast();

  const [deletingEntry, setDeletingEntry] = React.useState<FinancialEntry | null>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = React.useState(false);


  const entriesQuery = useMemoFirebase(() => {
    if (!firestore || isUserLoading || !user) return null;
    return query(
      collection(firestore, 'companies', COMPANY_ID, 'financialEntries'),
      orderBy('date', 'desc')
    );
  }, [firestore, isUserLoading, user]);

  const { data: entries, isLoading } = useCollection<FinancialEntry>(entriesQuery);
  const pageIsLoading = isLoading || isUserLoading;

  const summary = React.useMemo(() => {
    if (!entries) return { entradas: 0, saidas: 0, saldo: 0 };
    return entries.reduce((acc, entry) => {
        if(entry.type === 'Entrada') {
            acc.entradas += entry.amount;
        } else {
            acc.saidas += entry.amount;
        }
        acc.saldo = acc.entradas - acc.saidas;
        return acc;
    }, { entradas: 0, saidas: 0, saldo: 0 });
  }, [entries]);
  
  const handleDelete = (entry: FinancialEntry) => {
    setDeletingEntry(entry);
    setIsDeleteAlertOpen(true);
  }

  const confirmDelete = async () => {
    if (!firestore || !deletingEntry) return;
    try {
        await deleteDoc(doc(firestore, 'companies', COMPANY_ID, 'financialEntries', deletingEntry.id));
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
      <div className="flex items-center">
        <h1 className="flex-1 text-2xl font-semibold md:text-3xl">
          Controle Financeiro
        </h1>
        <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
                <Link href="/categorias">
                    <Settings className="h-4 w-4 mr-2" />
                    Categorias
                </Link>
            </Button>
            <Button asChild>
                <Link href="/financeiro/receita/nova">
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

       <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Entradas</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {pageIsLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.entradas)}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Saídas</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
           {pageIsLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold text-destructive">{formatCurrency(summary.saidas)}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Atual</CardTitle>
             <Landmark className="h-4 w-4 text-muted-foreground" />
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
            <EntryList entries={entries || []} onDelete={handleDelete} />
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
                  {entry.clientName && <div className="text-sm text-muted-foreground">{entry.clientName}</div>}
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
