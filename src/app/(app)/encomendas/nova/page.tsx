'use client';
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
import { NewOrderForm } from '@/components/new-order-form';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, orderBy, query } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import type { Client, Origin } from '@/lib/types';

export default function NewOrderPage() {
  const firestore = useFirestore();
  const { isUserLoading } = useUser();

  const clientsQuery = useMemoFirebase(() => {
    if (!firestore || isUserLoading) return null;
    return query(
      collection(firestore, 'companies', '1', 'clients'),
      orderBy('nome', 'asc')
    );
  }, [firestore, isUserLoading]);

  const originsQuery = useMemoFirebase(() => {
    if (!firestore || isUserLoading) return null;
    return query(
      collection(firestore, 'companies', '1', 'origins'),
      orderBy('name', 'asc')
    );
  }, [firestore, isUserLoading]);

  const { data: clients, isLoading: isLoadingClients } = useCollection<Client>(clientsQuery);
  const { data: origins, isLoading: isLoadingOrigins } = useCollection<Origin>(originsQuery);

  const isLoading = isLoadingClients || isLoadingOrigins || isUserLoading;

  return (
    <div className="mx-auto grid w-full max-w-4xl flex-1 auto-rows-max gap-4">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="h-7 w-7" asChild>
          <Link href="/encomendas">
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Voltar</span>
          </Link>
        </Button>
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
          Nova Encomenda
        </h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Detalhes da Encomenda</CardTitle>
          <CardDescription>
            Selecione um cliente e preencha os detalhes da entrega.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && <Skeleton className="h-48 w-full" />}
          {clients && origins && <NewOrderForm clients={clients} origins={origins} />}
        </CardContent>
      </Card>
    </div>
  );
}
