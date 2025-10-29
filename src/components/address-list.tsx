'use client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { MoreHorizontal } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import type { Address } from '@/lib/types';
import Link from 'next/link';

export default function AddressList({ addresses }: { addresses: Address[] }) {
  if (addresses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/30 p-12 text-center">
        <p className="text-muted-foreground">Nenhum endereço cadastrado.</p>
        <p className="text-sm text-muted-foreground/80">
          Adicione um endereço para começar.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Rótulo</TableHead>
            <TableHead>Endereço</TableHead>
            <TableHead>
              <span className="sr-only">Ações</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {addresses.map((address) => (
            <TableRow key={address.id}>
              <TableCell className="font-medium">{address.label}</TableCell>
              <TableCell>{address.fullAddress}</TableCell>
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
                      <DropdownMenuItem asChild>
                         <Link href={`/clientes/${address.clientId}/enderecos/${address.id}/editar`}>
                          Editar
                        </Link>
                      </DropdownMenuItem>
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
