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
import { PlusCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Driver } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, orderBy, query } from 'firebase/firestore';

export default function MotoristasPage() {
    const firestore = useFirestore();
    const { user, companyId, isUserLoading } = useUser();

    const driversQuery = useMemoFirebase(() => {
        if (!firestore || !companyId || isUserLoading) return null;
        return query(
            collection(firestore, 'companies', companyId, 'drivers'),
            orderBy('nome', 'asc')
        );
    }, [firestore, companyId, isUserLoading]);

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
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage
                        src={driver.photoUrl}
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
                   <Button asChild variant="outline" size="icon">
                        <Link href={`/motoristas/${driver.id}`}>
                            <ArrowRight className="h-4 w-4" />
                            <span className="sr-only">Ver detalhes</span>
                        </Link>
                    </Button>
                </CardContent>
              </Card>
            ))}
            {!pageIsLoading && (!drivers || drivers.length === 0) && (
                <div className="col-span-full text-center p-8 border-2 border-dashed rounded-md">
                    <p className="text-muted-foreground">Nenhum motorista cadastrado.</p>
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
