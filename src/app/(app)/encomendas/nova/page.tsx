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

export default function NewOrderPage() {
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
            Preencha os campos abaixo para registrar uma nova encomenda. Campos
            obrigatórios são marcados com *.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewOrderForm />
        </CardContent>
      </Card>
    </div>
  );
}
