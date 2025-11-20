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
import { EditVehicleForm } from '@/components/edit-vehicle-form';
import { useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import type { Vehicle } from '@/lib/types';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

export default function EditVehiclePage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = React.use(params);
  return <EditVehicleContent vehicleId={id} />;
}

function EditVehicleContent({ vehicleId }: { vehicleId: string }) {
  const firestore = useFirestore();
  const { user, isUserLoading, companyId } = useUser();

  const vehicleRef = useMemoFirebase(() => {
    if (!firestore || isUserLoading || !user || !companyId) return null;
    return doc(firestore, 'companies', companyId, 'vehicles', vehicleId);
  }, [firestore, isUserLoading, vehicleId, user, companyId]);

  const { data: vehicle, isLoading } = useDoc<Vehicle>(vehicleRef);

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

  if (!vehicle) {
    return (
      <div className="mx-auto grid w-full max-w-2xl flex-1 auto-rows-max gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" className="h-7 w-7" asChild>
            <Link href="/veiculos">
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Voltar</span>
            </Link>
          </Button>
          <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
            Veículo não encontrado
          </h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Erro 404</CardTitle>
            <CardDescription>
              O veículo que você está tentando editar não foi encontrado.
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
          <Link href={`/veiculos/${vehicleId}`}>
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Voltar</span>
          </Link>
        </Button>
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
          Editar Veículo
        </h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Dados do Veículo</CardTitle>
          <CardDescription>
            Altere as informações do veículo na frota.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EditVehicleForm vehicle={vehicle} />
        </CardContent>
      </Card>
    </div>
  );
}
