import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PlusCircle } from 'lucide-react';

export default function OrigensPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center">
        <h1 className="flex-1 text-2xl font-semibold md:text-3xl">Origens</h1>
        <Button size="sm" className="h-8 gap-1">
          <PlusCircle className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
            Nova Origem
          </span>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pontos de Partida</CardTitle>
          <CardDescription>
            Gerencie os endereços de origem das suas encomendas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/30 p-12 text-center">
            <p className="text-muted-foreground">Nenhuma origem cadastrada.</p>
            <p className="text-sm text-muted-foreground/80">
              Adicione uma origem para começar.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
