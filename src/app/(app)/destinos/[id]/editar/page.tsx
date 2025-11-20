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
import type { Destino } from '@/lib/types';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { EditDestinoForm } from '@/components/edit-destino-form';

export default function EditDestinoPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = React.use(params);
  return <EditDestinoContent destinoId={id} />;
}

function EditDestinoContent({ destinoId }: { destinoId: string }) {
  const firestore = useFirestore();
  const { user, companyId, isUserLoading } = useUser();

  const destinoRef = useMemoFirebase(() => {
    if (!firestore || !companyId || isUserLoading) return null;
    return doc(firestore, 'companies', companyId, 'destinos', destinoId);
  }, [firestore, isUserLoading, destinoId, companyId]);

  const { data: destino, isLoading } = useDoc<Destino>(destinoRef);

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

  if (!destino) {
    return (
      <div className="mx-auto grid w-full max-w-2xl flex-1 auto-rows-max gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" className="h-7 w-7" asChild>
            <Link href="/destinos">
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Voltar</span>
            </Link>
          </Button>
          <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
            Destino não encontrado
          </h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Erro 404</CardTitle>
            <CardDescription>
              O destino que você está tentando editar não foi encontrado.
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
          <Link href="/destinos">
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Voltar</span>
          </Link>
        </Button>
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
          Editar Destino
        </h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Dados do Destino</CardTitle>
          <CardDescription>
            Altere as informações do ponto de destino.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EditDestinoForm destino={destino} />
        </CardContent>
      </Card>
    </div>
  );
}
