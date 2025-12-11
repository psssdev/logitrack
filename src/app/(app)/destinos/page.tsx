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
import { PlusCircle, MoreHorizontal, Edit, Trash } from 'lucide-react';
import type { Destino } from '@/lib/types';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, orderBy, query, doc, deleteDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
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
import { useToast } from '@/hooks/use-toast';
import { triggerRevalidation } from '@/lib/actions';
import { useStore } from '@/contexts/store-context';

export default function DestinosPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { selectedStore } = useStore();
  const { toast } = useToast();
  const [deletingDestino, setDeletingDestino] = React.useState<Destino | null>(null);

  const isSpecialUser = user?.email === 'jiverson.t@gmail.com';

  const storeDestinosQuery = useMemoFirebase(() => {
    if (!firestore || !selectedStore) return null;
    return query(collection(firestore, 'stores', selectedStore.id, 'destinos'), orderBy('name', 'asc'));
  }, [firestore, selectedStore]);

  const legacyDestinosQuery = useMemoFirebase(() => {
    if (!firestore || !isSpecialUser) return null;
    return query(collection(firestore, 'destinos'), orderBy('name', 'asc'));
  }, [firestore, isSpecialUser]);

  const { data: storeDestinos, isLoading: isLoadingStore } = useCollection<Destino>(storeDestinosQuery);
  const { data: legacyDestinos, isLoading: isLoadingLegacy } = useCollection<Destino>(legacyDestinosQuery);

  const combinedDestinos = useMemo(() => {
    const allDestinos = new Map<string, Destino>();
    if (isSpecialUser && legacyDestinos) {
      legacyDestinos.forEach(d => allDestinos.set(d.id, d));
    }
    if (storeDestinos) {
      storeDestinos.forEach(d => allDestinos.set(d.id, d));
    }
    return Array.from(allDestinos.values()).sort((a,b) => a.name.localeCompare(b.name));
  }, [storeDestinos, legacyDestinos, isSpecialUser]);

  const pageIsLoading = isLoadingStore || isLoadingLegacy || isUserLoading;

  const handleDelete = (destino: Destino) => {
    setDeletingDestino(destino);
  };

  const confirmDelete = async () => {
    if (!firestore || !deletingDestino) return;
    try {
      const docRef = doc(firestore, deletingDestino.storeId ? `stores/${deletingDestino.storeId}/destinos` : 'destinos', deletingDestino.id);
      await deleteDoc(docRef);
      await triggerRevalidation('/destinos');
      await triggerRevalidation('/vender-passagem');
      toast({
        title: 'Destino excluído',
        description: `O destino "${deletingDestino.name}" foi removido.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: error.message,
      });
    } finally {
      setDeletingDestino(null);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex items-center">
          <h1 className="flex-1 text-2xl font-semibold md:text-3xl">Destinos</h1>
          <Button size="sm" className="h-8 gap-1" asChild>
            <Link href="/destinos/novo">
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Novo Destino
              </span>
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pontos de Destino</CardTitle>
            <CardDescription>
              Gerencie as localidades que podem ser usadas como destino.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pageIsLoading && <Skeleton className="h-48 w-full" />}
            {combinedDestinos && !pageIsLoading && (
              <DestinoList destinos={combinedDestinos} onDelete={handleDelete} />
            )}
          </CardContent>
        </Card>
      </div>
      {deletingDestino && (
        <AlertDialog open={!!deletingDestino} onOpenChange={(open) => !open && setDeletingDestino(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Isso excluirá permanentemente o destino{' '}
                <span className="font-bold">"{deletingDestino.name}"</span>.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete}>Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}

function DestinoList({
  destinos,
  onDelete,
}: {
  destinos: Destino[];
  onDelete: (destino: Destino) => void;
}) {
  if (destinos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/30 p-12 text-center">
        <p className="text-muted-foreground">Nenhum destino cadastrado.</p>
        <p className="text-sm text-muted-foreground/80">
          Adicione um destino para começar.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Endereço</TableHead>
            <TableHead>
              <span className="sr-only">Ações</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {destinos.map((destino) => (
            <TableRow key={destino.id}>
              <TableCell className="font-medium">{destino.name}</TableCell>
              <TableCell>{destino.address}</TableCell>
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
                        <Link href={`/destinos/${destino.id}/editar`}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onSelect={() => onDelete(destino)}>
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
