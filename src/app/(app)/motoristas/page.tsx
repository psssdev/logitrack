
'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, MoreVertical, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Driver } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const COMPANY_ID = '1';

export default function MotoristasPage() {
  const firestore = useFirestore();
  const { isUserLoading } = useUser();

  const driversQuery = useMemoFirebase(() => {
    if (!firestore || isUserLoading) return null;
    return query(collection(firestore, 'companies', COMPANY_ID, 'drivers'), orderBy('nome'));
  }, [firestore, isUserLoading]);

  const { data: drivers, isLoading } = useCollection<Driver>(driversQuery);
  const pageIsLoading = isLoading || isUserLoading;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center">
        <h1 className="flex-1 text-2xl font-semibold md:text-3xl">Motoristas</h1>
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
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ))}
          {!pageIsLoading && drivers &&
            drivers.map((driver) => (
              <Card
                key={driver.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardContent className="p-6 flex items-center justify-between gap-4">
                  <Link href={`/motoristas/${driver.id}`} className="flex items-center gap-4 flex-1 overflow-hidden">
                    <Avatar className="h-12 w-12">
                      <AvatarImage
                        src={`https://picsum.photos/seed/${driver.id}/80/80`}
                        data-ai-hint="person face"
                      />
                      <AvatarFallback>{driver.nome.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="grid gap-1">
                      <p className="text-lg font-medium leading-none truncate">
                        {driver.nome}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {driver.telefone}
                      </p>
                      {driver.placa && (
                        <Badge variant="secondary" className="w-fit">
                          {driver.placa}
                        </Badge>
                      )}
                    </div>
                  </Link>
                   <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                           <Button asChild variant="ghost" size="icon">
                                <span className="cursor-pointer">
                                    <MoreVertical className="h-5 w-5" />
                                    <span className="sr-only">Abrir menu</span>
                                </span>
                           </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                                <Link href={`/motoristas/${driver.id}/editar`}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Editar
                                </Link>
                            </DropdownMenuItem>
                             <DropdownMenuItem className="text-destructive">
                                Excluir
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </CardContent>
              </Card>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}
