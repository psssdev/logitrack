'use client';
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import { Timestamp } from 'firebase/firestore';
import type { Order } from '@/lib/types';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { OrderStatusBadge } from './status-badge';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
}

const formatDate = (date: Date | Timestamp) => {
    const d = date instanceof Timestamp ? date.toDate() : date;
    return d.toLocaleDateString('pt-BR');
}

export function ReceivedTable({ orders }: { orders: Order[] }) {
  if (orders.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center rounded-md border-2 border-dashed p-12 text-center">
        <h3 className="text-lg font-medium">Nenhum resultado</h3>
        <p className="text-sm text-muted-foreground">
          Nenhuma encomenda paga encontrada no período selecionado.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>Código</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead>
                <span className="sr-only">Ações</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="font-medium">{order.nomeCliente}</TableCell>
              <TableCell>
                <Badge variant="outline">{order.codigoRastreio}</Badge>
              </TableCell>
              <TableCell>{formatDate(order.createdAt)}</TableCell>
              <TableCell>
                 <OrderStatusBadge status={order.status} />
              </TableCell>
              <TableCell className="text-right font-semibold">
                {formatCurrency(order.valorEntrega)}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button aria-haspopup="true" size="icon" variant="ghost">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Toggle menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Ações</DropdownMenuLabel>
                    <DropdownMenuItem asChild>
                      <Link href={`/encomendas/${order.id}`}>Ver Encomenda</Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
