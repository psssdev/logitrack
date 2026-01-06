'use client';
import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlusCircle, ArrowRight, MoreHorizontal, Edit, Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Driver } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import {
  useCollection,
  useFirestore,
  useMemoFirebase,
  useUser,
} from '@/firebase';
import { collection, orderBy, query, doc, deleteDoc } from 'firebase/firestore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
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
import { useToast } from '@/hooks/use-toast';
import { triggerRevalidation } from '@/lib/actions';
import { useStore } from '@/contexts/store-context';

export default function MotoristasPage() {
  const firestore = useFirestore();
  const { isUserLoading } = useUser();
  const { selectedStore } = useStore();
  const { toast } = useToast();
  const [deletingDriver, setDeletingDriver] = React.useState<Driver | null>(null);

  const driversQuery = useMemoFirebase(() => {
    if (!firestore || !selectedStore) return null;
    return query(collection(firestore, 'stores', selectedStore.id, 'drivers'), orderBy('nome', 'asc'));
  }, [firestore, selectedStore]);

  const { data: drivers, isLoading: isLoadingDrivers } = useCollection<Driver>(driversQuery);

  const pageIsLoading = isLoadingDrivers || isUserLoading;

  const handleDeleteClick = (driver: Driver) => {
    setDeletingDriver(driver);
  };

  const confirmDelete = async () => {
    if (!firestore || !deletingDriver || !selectedStore) return;
    try {
      const docRef = doc(firestore, 'stores', selectedStore.id, 'drivers', deletingDriver.id);
      await deleteDoc(docRef);
      await triggerRevalidation('/motoristas');
      toast({
        title: 'Motorista excluído',
        description: `O motorista "${deletingDriver.nome}" foi removido.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: error.message,
      });
    } finally {
      setDeletingDriver(null);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex items-center">
          <h1 className="flex-1 text-2xl font-semibold md:text-3xl">
            Motoristas
          </h1>
          <Button size="sm" className="h-8 gap-1" asChild>
            <Link href="/motoristas/novo">
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Novo Motorista
              </span>
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Equipe de Entrega</CardTitle>
            <CardDescription>
              Lista de motoristas cadastrados no sistema.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {pageIsLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            {!pageIsLoading &&
              drivers &&
              drivers.map((driver) => (
                <Card
                  key={driver.id}
                  className="hover:shadow-md transition-shadow flex flex-col"
                >
                  <CardContent className="p-6 flex-1 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage
                          src={driver.photoUrl || undefined}
                          alt={`Foto de ${driver.nome}`}
                        />
                        <AvatarFallback>{driver.nome.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="grid gap-1">
                        <p className="text-lg font-medium leading-none">
                          {driver.nome}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {driver.telefone}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Button asChild variant="ghost" size="icon">
                        <Link href={`/motoristas/${driver.id}`}>
                          <ArrowRight className="h-4 w-4" />
                          <span className="sr-only">Ver detalhes</span>
                        </Link>
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem asChild>
                            <Link href={`/motoristas/${driver.id}/editar`}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onSelect={() => handleDeleteClick(driver)}
                          >
                            <Trash className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))}
            {!pageIsLoading && (!drivers || drivers.length === 0) && (
              <div className="col-span-full text-center p-8 border-2 border-dashed rounded-md">
                <p className="text-muted-foreground">
                  Nenhum motorista cadastrado.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {deletingDriver && (
        <AlertDialog
          open={!!deletingDriver}
          onOpenChange={(open) => !open && setDeletingDriver(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Isso excluirá
                permanentemente o motorista{' '}
                <span className="font-bold">"{deletingDriver.nome}"</span>.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete}>
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
