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
import { NewLocationForm } from '@/components/new-location-form';

export default function NewLocationPage() {
  return (
    <div className="mx-auto grid w-full max-w-2xl flex-1 auto-rows-max gap-4">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="h-7 w-7" asChild>
          <Link href="/localidades">
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Voltar</span>
          </Link>
        </Button>
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
          Nova Localidade
        </h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Dados da Localidade</CardTitle>
          <CardDescription>
            Preencha os campos para cadastrar um novo ponto de partida ou destino.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewLocationForm />
        </CardContent>
      </Card>
    </div>
  );
}
