
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
import { NewDriverForm } from '@/components/new-driver-form';

export default function NewDriverPage() {
  return (
    <div className="mx-auto grid w-full max-w-2xl flex-1 auto-rows-max gap-4">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="h-7 w-7" asChild>
          <Link href="/motoristas">
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Voltar</span>
          </Link>
        </Button>
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
          Novo Motorista
        </h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Dados do Motorista</CardTitle>
          <CardDescription>
            Preencha os campos abaixo para cadastrar um novo motorista na sua
            equipe.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewDriverForm />
        </CardContent>
      </Card>
    </div>
  );
}
