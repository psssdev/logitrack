'use client';

import * as React from 'react';
import Link from 'next/link';
import { MoreHorizontal, ArrowRight } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import type { Order } from '@/lib/types';
import { OrderStatusBadge } from './status-badge';
import { Input } from './ui/input';

const paymentMethodLabels: Record<string, string> = {
  pix: 'PIX',
  dinheiro: 'Dinheiro',
  cartao: 'Cartão',
  boleto: 'Boleto',
  link: 'Link',
};

export function OrderTable({ orders }: { orders: Order[] }) {
  const [filter, setFilter] = React.useState('');
  
  const filteredOrders = orders.filter(
    (order) =>
      order.nomeCliente.toLowerCase().includes(filter.toLowerCase()) ||
      order.codigoRastreio.toLowerCase().includes(filter.toLowerCase()) ||
      order.telefone.includes(filter)
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="w-full max-w-sm">
        <Input 
          placeholder="Buscar por cliente, código ou telefone..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead className="hidden lg:table-cell">Código</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Pagamento</TableHead>
              <TableHead className="hidden lg:table-cell">Data</TableHead>
              <TableHead>
                <span className="sr-only">Ações</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.length > 0 ? (
              filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <div className="font-medium">{order.nomeCliente}</div>
                    <div className="text-sm text-muted-foreground">{order.telefone}</div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <Badge variant="outline">{order.codigoRastreio}</Badge>
                  </TableCell>
                  <TableCell>
                    <OrderStatusBadge status={order.status} />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex flex-col">
                      <span>
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(order.valorEntrega)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {paymentMethodLabels[order.formaPagamento]}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" asChild>
                           <Link href={`/encomendas/${order.id}`}>
                             <ArrowRight className="h-4 w-4" />
                           </Link>
                        </Button>
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuItem asChild><Link href={`/encomendas/${order.id}`}>Ver Detalhes</Link></DropdownMenuItem>
                            <DropdownMenuItem>Editar</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">Cancelar</DropdownMenuItem>
                        </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  Nenhuma encomenda encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
