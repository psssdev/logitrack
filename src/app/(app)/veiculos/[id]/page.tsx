'use client';
import React from 'react';
import Link from 'next/link';
import { ChevronLeft, ArrowRight, Edit, Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { Vehicle } from '@/lib/types';
import { useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { doc } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { BusSeatLayout } from '@/components/bus-seat-layout';
import { Bus, Car, Truck } from 'lucide-react';

const statusConfig = {
    "Ativo": "bg-green-500/80",
    "Inativo": "bg-gray-500/80",
    "Em Manutenção": "bg-yellow-500/80",
}

const iconConfig = {
    "Ônibus": Bus,
    "Van": Truck,
    "Carro": Car,
    "Caminhão": Truck,
}

export default function VehicleDetailPage({ params }: { params: { id: string } }) {
  const { id } = React.use(params);
  return <VehicleDetailContent vehicleId={id} />;
}

function VehicleDetailContent({ vehicleId }: { vehicleId: string }) {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const vehicleRef = useMemoFirebase(() => {
    if (!firestore || isUserLoading || !user) return null;
    return doc(firestore, 'companies', '1', 'vehicles', vehicleId);
  }, [firestore, isUserLoading, vehicleId, user]);

  const { data: vehicle, isLoading: isLoadingVehicle } = useDoc<Vehicle>(vehicleRef);

  const isLoading = isLoadingVehicle || isUserLoading;

  if (isLoading) {
    return <VehicleDetailSkeleton />;
  }

  if (!vehicle) {
    return (
      <div className="mx-auto grid max-w-4xl flex-1 auto-rows-max gap-4">
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
            <CardDescription>O veículo que você está procurando não foi encontrado.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }
  
  const Icon = iconConfig[vehicle.tipo] || Bus;

  return (
    <div className="mx-auto grid max-w-4xl flex-1 auto-rows-max gap-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="h-7 w-7" asChild>
          <Link href="/veiculos">
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Voltar</span>
          </Link>
        </Button>
        <div className="flex-1">
            <h1 className="text-2xl font-semibold">
                {vehicle.modelo}
            </h1>
            <p className="text-sm text-muted-foreground">{vehicle.placa} - {vehicle.ano}</p>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
                <Edit className="mr-2 h-4 w-4" /> Editar
            </Button>
            <Button variant="destructive" size="sm">
                <Trash className="mr-2 h-4 w-4" /> Excluir
            </Button>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div className="flex items-center gap-4">
              <Icon className="h-10 w-10 text-muted-foreground" />
              <div>
                <CardTitle>{vehicle.modelo}</CardTitle>
                <CardDescription>{vehicle.tipo}</CardDescription>
              </div>
            </div>
            <Badge className={cn("text-white", statusConfig[vehicle.status])}>
                {vehicle.status}
            </Badge>
          </CardHeader>
        </Card>
        
        {vehicle.tipo === 'Ônibus' && vehicle.seatLayout && (
            <BusSeatLayout 
                vehicle={vehicle}
                selectedSeats={[]}
                onSeatSelect={() => {}} // Read-only for now
            />
        )}
      </div>
    </div>
  );
}

function VehicleDetailSkeleton() {
  return (
    <div className="mx-auto grid max-w-4xl flex-1 auto-rows-max gap-6 animate-pulse">
      <div className="flex items-center gap-4">
        <Skeleton className="h-7 w-7" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-1/4" />
        </div>
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-10" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </CardHeader>
        </Card>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
