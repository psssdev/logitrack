'use client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PlusCircle, MoreHorizontal } from 'lucide-react';
import type { Destino } from '@/lib/types';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, orderBy, query } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

export default function DestinosPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const destinosQuery = useMemoFirebase(() => {
    if (!firestore || isUserLoading || !user) return null;
    return query(
      collection(firestore, 'companies', '1', 'destinos'),
      orderBy('name', 'asc')
    );
  }, [firestore, isUserLoading, user]);

  const { data: destinos, isLoading } = useCollection<Destino>(destinosQuery);
  const pageIsLoading = isLoading || isUserLoading;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center">
        <h1 className="flex-1 text-2xl font-semibold md:text-3xl">Destinos</h1>
        <Button size="sm" className="h-8 gap-1" asChild>
          <Link href="/destinos/novo">
            <PlusCircle className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Novo Destino
            </span>
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pontos de Destino</CardTitle>
          <CardDescription>
            Gerencie as localidades que podem ser usadas como destino.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pageIsLoading && <Skeleton className="h-48 w-full" />}
          {destinos && !pageIsLoading && <DestinoList destinos={destinos} />}
        </CardContent>
      </Card>
    </div>
  );
}

function DestinoList({ destinos }: { destinos: Destino[] }) {
  if (destinos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/30 p-12 text-center">
        <p className="text-muted-foreground">Nenhum destino cadastrado.</p>
        <p className="text-sm text-muted-foreground/80">
          Adicione um destino para começar.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Endereço</TableHead>
            <TableHead>
              <span className="sr-only">Ações</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {destinos.map((destino) => (
            <TableRow key={destino.id}>
              <TableCell className="font-medium">{destino.name}</TableCell>
              <TableCell>{destino.address}</TableCell>
              <TableCell>
                <div className="flex justify-end">
                  {/* Actions removed for now */}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

    