import Link from 'next/link';
import { ChevronLeft, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { getClientById, getAddressesByClientId } from '@/lib/actions';
import { notFound } from 'next/navigation';
import AddressList from '@/components/address-list';

export default async function ClientDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const client = await getClientById(params.id);

  if (!client) {
    notFound();
  }

  const addresses = await getAddressesByClientId(client.id);

  return (
    <div className="mx-auto grid max-w-4xl flex-1 auto-rows-max gap-4">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="h-7 w-7" asChild>
          <Link href="/clientes">
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Voltar</span>
          </Link>
        </Button>
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
          Detalhes do Cliente
        </h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="grid auto-rows-max items-start gap-4 lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>{client.nome}</CardTitle>
              <CardDescription>
                Telefone: {client.telefone}
              </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">
                    Cliente desde {new Date(client.createdAt).toLocaleDateString('pt-BR')}
                </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Endereços</CardTitle>
                    <CardDescription>Endereços cadastrados para este cliente.</CardDescription>
                </div>
                <Button size="sm" asChild>
                    <Link href={`/clientes/${client.id}/enderecos/novo`}>
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Novo Endereço
                    </Link>
                </Button>
            </CardHeader>
            <CardContent>
                <AddressList addresses={addresses} />
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
