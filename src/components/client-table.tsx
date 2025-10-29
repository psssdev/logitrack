'use client';

import * as React from 'react';
import Link from 'next/link';
import { MoreHorizontal, ArrowRight, Edit, Trash2 } from 'lucide-react';
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
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from './ui/input';
import type { Client } from '@/lib/types';
import { Timestamp } from 'firebase/firestore';

export default function ClientTable({ clients }: { clients: Client[] }) {
  const [filter, setFilter] = React.useState('');

  const filteredClients = clients.filter(
    (client) =>
      client.nome.toLowerCase().includes(filter.toLowerCase()) ||
      client.telefone.includes(filter)
  );
  
  const formatDate = (date: Date | Timestamp) => {
    if (date instanceof Timestamp) {
      return date.toDate().toLocaleDateString('pt-BR');
    }
    return new Date(date).toLocaleDateString('pt-BR');
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="w-full max-w-sm">
        <Input
          placeholder="Buscar por nome ou telefone..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead className="hidden md:table-cell">
                Data de Cadastro
              </TableHead>
              <TableHead>
                <span className="sr-only">Ações</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClients.length > 0 ? (
              filteredClients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.nome}</TableCell>
                  <TableCell>{client.telefone}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {formatDate(client.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                       <Button asChild variant="ghost" size="icon">
                            <Link href={`/clientes/${client.id}`}>
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            aria-haspopup="true"
                            size="icon"
                            variant="ghost"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                          <DropdownMenuItem asChild>
                            <Link href={`/clientes/${client.id}`}>Ver Detalhes</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/clientes/${client.id}/editar`}>Editar Cliente</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  Nenhum cliente encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
