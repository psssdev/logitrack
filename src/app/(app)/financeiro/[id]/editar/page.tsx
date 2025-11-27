
'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { EditFinancialEntryForm } from '@/components/edit-financial-entry-form';
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import type { FinancialEntry, Vehicle, Client, Driver, FinancialCategory } from '@/lib/types';
import { collection, doc, query, orderBy, where } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

export default function EditFinancialEntryPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = React.use(params);
  return <EditFinancialEntryContent entryId={id} />;
}


function EditFinancialEntryContent({ entryId }: { entryId: string }) {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const entryRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'financialEntries', entryId);
  }, [firestore, user, entryId]);

  const { data: entry, isLoading: isLoadingEntry } = useDoc<FinancialEntry>(entryRef);
  
  const canQuery = firestore && user && entry;

  const vehiclesQuery = useMemoFirebase(() => {
    if (!canQuery) return null;
    return query(
        collection(firestore, 'vehicles'),
        orderBy('modelo', 'asc')
    );
  }, [canQuery, firestore]);
  
  const clientsQuery = useMemoFirebase(() => {
    if (!canQuery) return null;
    return query(
        collection(firestore, 'clients'),
        orderBy('nome', 'asc')
    );
  }, [canQuery, firestore]);

  const categoriesQuery = useMemoFirebase(() => {
    if (!canQuery) return null;
    return query(
        collection(firestore, 'financialCategories'),
        where('type', '==', entry.type)
    );
  }, [canQuery, firestore, entry?.type]);

  const driversQuery = useMemoFirebase(() => {
    if (!canQuery) return null;
    return query(
        collection(firestore, 'drivers'),
        orderBy('nome', 'asc')
    );
  }, [canQuery, firestore]);

  const { data: vehicles, isLoading: isLoadingVehicles } = useCollection<Vehicle>(vehiclesQuery);
  const { data: clients, isLoading: isLoadingClients } = useCollection<Client>(clientsQuery);
  const { data: categories, isLoading: isLoadingCategories } = useCollection<FinancialCategory>(categoriesQuery);
  const { data: drivers, isLoading: isLoadingDrivers } = useCollection<Driver>(driversQuery);

  const isLoading = isLoadingEntry || isLoadingVehicles || isLoadingClients || isLoadingCategories || isLoadingDrivers || isUserLoading;

  if (isLoading) {
    return (
      <div className="mx-auto grid w-full max-w-4xl flex-1 auto-rows-max gap-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-7 w-7" />
          <Skeleton className="h-6 w-1/2" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-3/4 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-96 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="mx-auto grid w-full max-w-4xl flex-1 auto-rows-max gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" className="h-7 w-7" asChild>
            <Link href="/financeiro">
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Voltar</span>
            </Link>
          </Button>
          <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
            Lançamento não encontrado
          </h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Erro 404</CardTitle>
            <CardDescription>
              O lançamento que você está tentando editar não foi encontrado.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-4xl flex-1 auto-rows-max gap-4">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="h-7 w-7" asChild>
          <Link href="/financeiro">
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Voltar</span>
          </Link>
        </Button>
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
          Editar Lançamento
        </h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Detalhes do Lançamento</CardTitle>
          <CardDescription>
            Altere os detalhes da transação financeira.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {entry && vehicles && clients && categories && drivers && (
            <EditFinancialEntryForm 
                entry={entry} 
                vehicles={vehicles} 
                clients={clients}
                categories={categories}
                drivers={drivers}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
