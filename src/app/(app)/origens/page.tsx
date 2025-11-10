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
import type { Origin } from '@/lib/types';
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

export default function OrigensPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const originsQuery = useMemoFirebase(() => {
    if (!firestore || isUserLoading || !user) return null;
    return query(
      collection(firestore, 'companies', '1', 'origins'),
      orderBy('name', 'asc')
    );
  }, [firestore, isUserLoading, user]);

  const { data: origins, isLoading } = useCollection<Origin>(originsQuery);
  const pageIsLoading = isLoading || isUserLoading;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center">
        <h1 className="flex-1 text-2xl font-semibold md:text-3xl">Origens</h1>
        <Button size="sm" className="h-8 gap-1" asChild>
          <Link href="/origens/novo">
            <PlusCircle className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Nova Origem
            </span>
          </Link>
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
          {pageIsLoading && <Skeleton className="h-48 w-full" />}
          {origins && !pageIsLoading && <OriginList origins={origins} />}
        </CardContent>
      </Card>
    </div>
  );
}

function OriginList({ origins }: { origins: Origin[] }) {
  if (origins.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/30 p-12 text-center">
        <p className="text-muted-foreground">Nenhuma origem cadastrada.</p>
        <p className="text-sm text-muted-foreground/80">
          Adicione uma origem para começar.
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
          {origins.map((origin) => (
            <TableRow key={origin.id}>
              <TableCell className="font-medium">{origin.name}</TableCell>
              <TableCell>{origin.address}</TableCell>
              <TableCell>
                <div className="flex justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-haspopup="true" size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Toggle menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Editar</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
