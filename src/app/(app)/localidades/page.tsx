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
import type { Location } from '@/lib/types';
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

export default function LocalidadesPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const locationsQuery = useMemoFirebase(() => {
    if (!firestore || isUserLoading || !user) return null;
    return query(
      collection(firestore, 'companies', '1', 'locations'),
      orderBy('name', 'asc')
    );
  }, [firestore, isUserLoading, user]);

  const { data: locations, isLoading } = useCollection<Location>(locationsQuery);
  const pageIsLoading = isLoading || isUserLoading;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center">
        <h1 className="flex-1 text-2xl font-semibold md:text-3xl">Localidades</h1>
        <Button size="sm" className="h-8 gap-1" asChild>
          <Link href="/localidades/novo">
            <PlusCircle className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Nova Localidade
            </span>
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pontos de Partida e Destino</CardTitle>
          <CardDescription>
            Gerencie as localidades que podem ser usadas como origem e destino.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pageIsLoading && <Skeleton className="h-48 w-full" />}
          {locations && !pageIsLoading && <LocationList locations={locations} />}
        </CardContent>
      </Card>
    </div>
  );
}

function LocationList({ locations }: { locations: Location[] }) {
  if (locations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/30 p-12 text-center">
        <p className="text-muted-foreground">Nenhuma localidade cadastrada.</p>
        <p className="text-sm text-muted-foreground/80">
          Adicione uma localidade para começar.
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
          {locations.map((location) => (
            <TableRow key={location.id}>
              <TableCell className="font-medium">{location.name}</TableCell>
              <TableCell>{location.address}</TableCell>
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
