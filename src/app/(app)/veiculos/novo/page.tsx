'use client'

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
import { NewVehicleForm } from '@/components/new-vehicle-form';

export default function NewVehiclePage() {
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
          Novo Veículo
        </h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Dados do Veículo</CardTitle>
          <CardDescription>
            Preencha os campos para cadastrar um novo veículo na frota.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewVehicleForm />
        </CardContent>
      </Card>
    </div>
  );
}
