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
import { useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import type { Origin } from '@/lib/types';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { EditOriginForm } from '@/components/edit-origin-form';

export default function EditOriginPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = React.use(params);
  return <EditOriginContent originId={id} />;
}

function EditOriginContent({ originId }: { originId: string }) {
  const firestore = useFirestore();
  const { user, companyId, isUserLoading } = useUser();

  const originRef = useMemoFirebase(() => {
    if (!firestore || !companyId || isUserLoading) return null;
    return doc(firestore, 'companies', companyId, 'origins', originId);
  }, [firestore, isUserLoading, originId, companyId]);

  const { data: origin, isLoading } = useDoc<Origin>(originRef);

  const pageIsLoading = isLoading || isUserLoading;

  if (pageIsLoading) {
    return (
      <div className="mx-auto grid w-full max-w-2xl flex-1 auto-rows-max gap-4">
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

  if (!origin) {
    return (
      <div className="mx-auto grid w-full max-w-2xl flex-1 auto-rows-max gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" className="h-7 w-7" asChild>
            <Link href="/origens">
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Voltar</span>
            </Link>
          </Button>
          <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
            Origem não encontrada
          </h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Erro 404</CardTitle>
            <CardDescription>
              A origem que você está tentando editar não foi encontrada.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-2xl flex-1 auto-rows-max gap-4">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="h-7 w-7" asChild>
          <Link href="/origens">
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Voltar</span>
          </Link>
        </Button>
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
          Editar Origem
        </h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Dados da Origem</CardTitle>
          <CardDescription>
            Altere as informações do ponto de partida.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EditOriginForm origin={origin} />
        </CardContent>
      </Card>
    </div>
  );
}
