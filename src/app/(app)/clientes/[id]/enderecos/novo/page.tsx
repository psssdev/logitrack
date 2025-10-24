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
import { NewAddressForm } from '@/components/new-address-form';
import { getClientById } from '@/lib/actions';
import { notFound } from 'next/navigation';

export default async function NewAddressPage({
  params,
}: {
  params: { id: string };
}) {
  const client = await getClientById(params.id);

  if (!client) {
    notFound();
  }

  return (
    <div className="mx-auto grid w-full max-w-2xl flex-1 auto-rows-max gap-4">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="h-7 w-7" asChild>
          <Link href={`/clientes/${client.id}`}>
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Voltar</span>
          </Link>
        </Button>
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
          Novo Endereço
        </h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Dados do Endereço</CardTitle>
          <CardDescription>
            Cadastrando endereço para o cliente{' '}
            <span className="font-semibold text-foreground">{client.nome}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewAddressForm clientId={client.id} />
        </CardContent>
      </Card>
    </div>
  );
}
