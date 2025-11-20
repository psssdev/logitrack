
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
import { NewClientForm } from '@/components/new-client-form';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import type { Origin } from '@/lib/types';
import { collection, query, orderBy } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

export default function NewClientPage() {
  const firestore = useFirestore();
  const { user, companyId, isUserLoading } = useUser();

  const originsQuery = useMemoFirebase(() => {
    if (!firestore || isUserLoading || !companyId) return null;
    return query(
      collection(firestore, 'companies', companyId, 'origins'),
      orderBy('name', 'asc')
    );
  }, [firestore, companyId, isUserLoading]);

  const { data: origins, isLoading: isLoadingOrigins } = useCollection<Origin>(originsQuery);

  const isLoading = isLoadingOrigins || isUserLoading;

  return (
    <div className="mx-auto grid w-full max-w-2xl flex-1 auto-rows-max gap-4">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="h-7 w-7" asChild>
          <Link href="/clientes">
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Voltar</span>
          </Link>
        </Button>
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
          Novo Cliente
        </h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Dados do Cliente</CardTitle>
          <CardDescription>
            Preencha os campos abaixo para cadastrar um novo cliente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && <Skeleton className="h-64 w-full" />}
          {origins && !isLoading && <NewClientForm origins={origins} />}
        </CardContent>
      </Card>
    </div>
  );
}
