'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NewFinancialEntryForm } from '@/components/new-financial-entry-form';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import type { Vehicle, Client } from '@/lib/types';
import { collection, query, orderBy } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

const COMPANY_ID = '1';

export default function NewFinancialEntryPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const vehiclesQuery = useMemoFirebase(() => {
    if (!firestore || isUserLoading || !user) return null;
    return query(
        collection(firestore, 'companies', COMPANY_ID, 'vehicles'),
        orderBy('modelo', 'asc')
    );
  }, [firestore, isUserLoading, user]);
  
  const clientsQuery = useMemoFirebase(() => {
    if (!firestore || isUserLoading || !user) return null;
    return query(
        collection(firestore, 'companies', COMPANY_ID, 'clients'),
        orderBy('nome', 'asc')
    );
  }, [firestore, isUserLoading, user]);

  const { data: vehicles, isLoading: isLoadingVehicles } = useCollection<Vehicle>(vehiclesQuery);
  const { data: clients, isLoading: isLoadingClients } = useCollection<Client>(clientsQuery);
  
  const isLoading = isLoadingVehicles || isLoadingClients || isUserLoading;


  return (
    <div className="mx-auto grid w-full max-w-6xl flex-1 auto-rows-max gap-4">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="h-7 w-7" asChild>
          <Link href="/financeiro">
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Voltar</span>
          </Link>
        </Button>
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
          Caixa - Nova Receita
        </h1>
      </div>
      
      {isLoading && <Skeleton className="h-[500px] w-full" />}
      {vehicles && clients && !isLoading && (
        <NewFinancialEntryForm vehicles={vehicles} clients={clients} />
      )}
      
    </div>
  );
}
