import Link from 'next/link';
import {
  PlusCircle,
  File,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { getOrders } from '@/lib/actions';
import { OrderTable } from '@/components/order-table';
import type { Order } from '@/lib/types';

export default async function EncomendasPage() {
    const orders = await getOrders();
    const statuses = ['TODAS', 'PENDENTE', 'EM_ROTA', 'ENTREGUE', 'CANCELADA'];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center">
        <h1 className="flex-1 text-2xl font-semibold md:text-3xl">Encomendas</h1>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-8 gap-1">
            <File className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Exportar
            </span>
          </Button>
          <Button size="sm" className="h-8 gap-1" asChild>
            <Link href="/encomendas/nova">
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Nova Encomenda
              </span>
            </Link>
          </Button>
        </div>
      </div>
      <Tabs defaultValue="TODAS">
        <TabsList>
            {statuses.map(status => (
                <TabsTrigger key={status} value={status}>
                    {status.charAt(0) + status.slice(1).toLowerCase()}
                </TabsTrigger>
            ))}
        </TabsList>
        {statuses.map(status => {
            const filteredOrders = status === 'TODAS' 
                ? orders 
                : orders.filter(order => order.status === status);
            return (
                <TabsContent key={status} value={status}>
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                {status.charAt(0) + status.slice(1).toLowerCase()}
                            </CardTitle>
                            <CardDescription>
                                {filteredOrders.length} encomenda(s) encontrada(s).
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <OrderTable orders={filteredOrders} />
                        </CardContent>
                    </Card>
                </TabsContent>
            );
        })}
      </Tabs>
    </div>
  );
}
