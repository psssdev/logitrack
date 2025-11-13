'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NewFinancialEntryForm } from '@/components/new-financial-entry-form';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import type { Vehicle, Client, Origin, Destino } from '@/lib/types';
import { collection, query, orderBy } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

const COMPANY_ID = '1';

export default function VenderPassagemPage() {
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

  const originsQuery = useMemoFirebase(() => {
    if (!firestore || isUserLoading || !user) return null;
    return query(
        collection(firestore, 'companies', COMPANY_ID, 'origins'),
        orderBy('name', 'asc')
    );
  }, [firestore, isUserLoading, user]);

  const destinosQuery = useMemoFirebase(() => {
    if (!firestore || isUserLoading || !user) return null;
    return query(
        collection(firestore, 'companies', COMPANY_ID, 'destinos'),
        orderBy('name', 'asc')
    );
    }, [firestore, isUserLoading, user]);
  
  const { data: vehicles, isLoading: isLoadingVehicles } = useCollection<Vehicle>(vehiclesQuery);
  const { data: clients, isLoading: isLoadingClients } = useCollection<Client>(clientsQuery);
  const { data: origins, isLoading: isLoadingOrigins } = useCollection<Origin>(originsQuery);
  const { data: destinations, isLoading: isLoadingDestinations } = useCollection<Destino>(destinosQuery);
  
  const isLoading = isLoadingVehicles || isLoadingClients || isLoadingOrigins || isLoadingDestinations || isUserLoading;


  return (
    <div className="mx-auto grid w-full max-w-6xl flex-1 auto-rows-max gap-4">
      <div className="flex items-center gap-4">
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
          PDV - Venda de Passagem
        </h1>
      </div>
      
      {isLoading && <Skeleton className="h-[500px] w-full" />}
      {vehicles && clients && origins && destinations && !isLoading && (
        <NewFinancialEntryForm vehicles={vehicles} clients={clients} origins={origins} destinations={destinations} />
      )}
      
    </div>
  );
}
