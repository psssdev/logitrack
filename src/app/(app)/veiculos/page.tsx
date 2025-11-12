'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Vehicle } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, orderBy, query } from 'firebase/firestore';
import { PlusCircle, Bus, Car, Van } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const COMPANY_ID = '1';

const statusConfig = {
    "Ativo": "bg-green-500/80",
    "Inativo": "bg-gray-500/80",
    "Em Manutenção": "bg-yellow-500/80",
}

const iconConfig = {
    "Ônibus": Bus,
    "Van": Van,
    "Carro": Car,
}

export default function VeiculosPage() {
    const firestore = useFirestore();
    const { user, isUserLoading } = useUser();

    const vehiclesQuery = useMemoFirebase(() => {
        if (!firestore || isUserLoading || !user) return null;
        return query(
            collection(firestore, 'companies', COMPANY_ID, 'vehicles'),
            orderBy('modelo', 'asc')
        );
    }, [firestore, isUserLoading, user]);

    const { data: vehicles, isLoading } = useCollection<Vehicle>(vehiclesQuery);
    const pageIsLoading = isLoading || isUserLoading;


  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center">
        <h1 className="flex-1 text-2xl font-semibold md:text-3xl">Veículos</h1>
        <Button size="sm" className="h-8 gap-1" asChild>
            <Link href="/veiculos/novo">
                <PlusCircle className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Novo Veículo
                </span>
            </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Frota de Veículos</CardTitle>
          <CardDescription>
            Gerencie os veículos da sua empresa.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {pageIsLoading &&
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-12 w-full" />
                </CardContent>
              </Card>
            ))}
          {!pageIsLoading && vehicles &&
            vehicles.map((vehicle) => {
              const Icon = iconConfig[vehicle.tipo] || Bus;
              return (
                <Card key={vehicle.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <Icon className="h-8 w-8 text-muted-foreground" />
                            <div>
                                <CardTitle>{vehicle.modelo}</CardTitle>
                                <CardDescription>{vehicle.placa} - {vehicle.ano}</CardDescription>
                            </div>
                        </div>
                        <Badge className={cn("text-white", statusConfig[vehicle.status])}>
                            {vehicle.status}
                        </Badge>
                    </CardHeader>
                </Card>
              )
            })}
            {!pageIsLoading && (!vehicles || vehicles.length === 0) && (
                <div className="col-span-full text-center p-8 border-2 border-dashed rounded-md">
                    <p className="text-muted-foreground">Nenhum veículo cadastrado.</p>
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
