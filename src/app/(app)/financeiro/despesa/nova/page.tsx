
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
import { NewExpenseForm } from '@/components/new-expense-form';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import type { FinancialCategory, Vehicle, Driver } from '@/lib/types';
import { collection, query, orderBy, where } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useStore } from '@/contexts/store-context';

export default function NewExpensePage() {
  const firestore = useFirestore();
  const { isUserLoading } = useUser();
  const { selectedStore } = useStore();

  const categoriesQuery = useMemoFirebase(() => {
    if (!firestore || !selectedStore) return null;
    return query(
      collection(firestore, 'stores', selectedStore.id, 'financialCategories'),
      where('type', '==', 'Saída')
    );
  }, [firestore, selectedStore]);

  const vehiclesQuery = useMemoFirebase(() => {
    if (!firestore || !selectedStore) return null;
    return query(
      collection(firestore, 'stores', selectedStore.id, 'vehicles'),
      orderBy('modelo', 'asc')
    );
  }, [firestore, selectedStore]);

  const driversQuery = useMemoFirebase(() => {
    if (!firestore || !selectedStore) return null;
    return query(
        collection(firestore, 'stores', selectedStore.id, 'drivers'),
        orderBy('nome', 'asc')
    );
  }, [firestore, selectedStore]);

  const { data: categories, isLoading: isLoadingCategories } = useCollection<FinancialCategory>(categoriesQuery);
  const { data: vehicles, isLoading: isLoadingVehicles } = useCollection<Vehicle>(vehiclesQuery);
  const { data: drivers, isLoading: isLoadingDrivers } = useCollection<Driver>(driversQuery);

  const isLoading = isLoadingCategories || isLoadingVehicles || isLoadingDrivers || isUserLoading || !selectedStore;

  return (
    <div className="mx-auto grid w-full max-w-2xl flex-1 auto-rows-max gap-4">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="h-7 w-7" asChild>
          <Link href="/financeiro">
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Voltar</span>
          </Link>
        </Button>
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
          Nova Despesa
        </h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Dados da Despesa</CardTitle>
          <CardDescription>
            Preencha os campos para registrar uma nova saída financeira.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <NewExpenseForm categories={categories || []} vehicles={vehicles || []} drivers={drivers || []} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
