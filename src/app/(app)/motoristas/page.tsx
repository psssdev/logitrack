import { getDrivers } from '@/lib/actions';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default async function MotoristasPage() {
  const drivers = await getDrivers();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center">
        <h1 className="flex-1 text-2xl font-semibold md:text-3xl">Motoristas</h1>
        <Button size="sm" className="h-8 gap-1">
            <PlusCircle className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Novo Motorista
            </span>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Equipe de Entrega</CardTitle>
          <CardDescription>
            Lista de motoristas cadastrados no sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {drivers.map((driver) => (
            <Card key={driver.id}>
              <CardContent className="p-6 flex items-center gap-4">
                <Avatar className="h-12 w-12">
                   <AvatarImage src={`https://picsum.photos/seed/${driver.id}/80/80`} data-ai-hint="person face" />
                  <AvatarFallback>{driver.nome.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="grid gap-1">
                  <p className="text-lg font-medium leading-none">{driver.nome}</p>
                  <p className="text-sm text-muted-foreground">{driver.telefone}</p>
                  {driver.placa && <Badge variant="secondary" className="w-fit">{driver.placa}</Badge>}
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
