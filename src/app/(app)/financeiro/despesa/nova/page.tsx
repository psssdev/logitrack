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
import type { FinancialCategory, Vehicle } from '@/lib/types';
import { collection, query, orderBy, where } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

const COMPANY_ID = '1';

export default function NewExpensePage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const categoriesQuery = useMemoFirebase(() => {
    if (!firestore || isUserLoading || !user) return null;
    return query(
      collection(firestore, 'companies', COMPANY_ID, 'financialCategories'),
      where('type', '==', 'Saída'),
      orderBy('name', 'asc')
    );
  }, [firestore, isUserLoading, user]);

  const vehiclesQuery = useMemoFirebase(() => {
    if (!firestore || isUserLoading || !user) return null;
    return query(
      collection(firestore, 'companies', COMPANY_ID, 'vehicles'),
      orderBy('modelo', 'asc')
    );
  }, [firestore, isUserLoading, user]);

  const { data: categories, isLoading: isLoadingCategories } = useCollection<FinancialCategory>(categoriesQuery);
  const { data: vehicles, isLoading: isLoadingVehicles } = useCollection<Vehicle>(vehiclesQuery);

  const isLoading = isLoadingCategories || isLoadingVehicles || isUserLoading;

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
            <NewExpenseForm categories={categories || []} vehicles={vehicles || []} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
