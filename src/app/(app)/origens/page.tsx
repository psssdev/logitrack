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
import type { Origin } from '@/lib/types';
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

export default function OrigensPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { selectedStore } = useStore();
  const { toast } = useToast();
  const [deletingOrigin, setDeletingOrigin] = React.useState<Origin | null>(null);

  const isSpecialUser = user?.email === 'jiverson.t@gmail.com';

  const storeOriginsQuery = useMemoFirebase(() => {
    if (!firestore || !selectedStore) return null;
    return query(
      collection(firestore, 'stores', selectedStore.id, 'origins'),
      orderBy('name', 'asc')
    );
  }, [firestore, selectedStore]);

  const legacyOriginsQuery = useMemoFirebase(() => {
    if (!firestore || !isSpecialUser) return null;
    return query(collection(firestore, 'origins'), orderBy('name', 'asc'));
  }, [firestore, isSpecialUser]);

  const { data: storeOrigins, isLoading: isLoadingStore } = useCollection<Origin>(storeOriginsQuery);
  const { data: legacyOrigins, isLoading: isLoadingLegacy } = useCollection<Origin>(legacyOriginsQuery);

  const combinedOrigins = useMemo(() => {
    const allOrigins = new Map<string, Origin>();
    if (isSpecialUser && legacyOrigins) {
      legacyOrigins.forEach(o => allOrigins.set(o.id, o));
    }
    if (storeOrigins) {
      storeOrigins.forEach(o => allOrigins.set(o.id, o));
    }
    return Array.from(allOrigins.values()).sort((a,b) => a.name.localeCompare(b.name));
  }, [storeOrigins, legacyOrigins, isSpecialUser]);

  const pageIsLoading = isLoadingStore || isLoadingLegacy || isUserLoading;

  const handleDelete = (origin: Origin) => {
    setDeletingOrigin(origin);
  };

  const confirmDelete = async () => {
    if (!firestore || !deletingOrigin) return;
    try {
      const docRef = doc(firestore, deletingOrigin.storeId ? `stores/${deletingOrigin.storeId}/origins` : 'origins', deletingOrigin.id);
      await deleteDoc(docRef);
      await triggerRevalidation('/origens');
      await triggerRevalidation('/vender-passagem');
      toast({
        title: 'Origem excluída',
        description: `A origem "${deletingOrigin.name}" foi removida.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: error.message,
      });
    } finally {
      setDeletingOrigin(null);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex items-center">
          <h1 className="flex-1 text-2xl font-semibold md:text-3xl">Origens</h1>
          <Button size="sm" className="h-8 gap-1" asChild>
            <Link href="/origens/novo">
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Nova Origem
              </span>
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pontos de Partida</CardTitle>
            <CardDescription>
              Gerencie os endereços de origem das suas encomendas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pageIsLoading && <Skeleton className="h-48 w-full" />}
            {combinedOrigins && !pageIsLoading && <OriginList origins={combinedOrigins} onDelete={handleDelete} />}
          </CardContent>
        </Card>
      </div>

      {deletingOrigin && (
        <AlertDialog open={!!deletingOrigin} onOpenChange={(open) => !open && setDeletingOrigin(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Isso excluirá permanentemente a origem{' '}
                <span className="font-bold">"{deletingOrigin.name}"</span>.
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

function OriginList({
  origins,
  onDelete,
}: {
  origins: Origin[];
  onDelete: (origin: Origin) => void;
}) {
  if (origins.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/30 p-12 text-center">
        <p className="text-muted-foreground">Nenhuma origem cadastrada.</p>
        <p className="text-sm text-muted-foreground/80">
          Adicione uma origem para começar.
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
          {origins.map((origin) => (
            <TableRow key={origin.id}>
              <TableCell className="font-medium">{origin.name}</TableCell>
              <TableCell>{origin.address}</TableCell>
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
                        <Link href={`/origens/${origin.id}/editar`}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onSelect={() => onDelete(origin)}>
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
