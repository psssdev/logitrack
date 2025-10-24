'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { updateOrderStatus } from '@/lib/actions';
import type { Order } from '@/lib/types';
import { PackageCheck, Truck } from 'lucide-react';

export function UpdateStatusButtons({ order }: { order: Order }) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleUpdateStatus = (status: 'EM_ROTA' | 'ENTREGUE') => {
    startTransition(async () => {
      const result = await updateOrderStatus(order.id, status);
      if (result.success) {
        toast({
          title: 'Sucesso',
          description: result.message,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: result.message,
        });
      }
    });
  };

  return (
    <>
      {order.status === 'PENDENTE' && (
        <Button
          onClick={() => handleUpdateStatus('EM_ROTA')}
          disabled={isPending}
        >
          <Truck className="mr-2 h-4 w-4" />
          Marcar como Em Rota
        </Button>
      )}
      {order.status === 'EM_ROTA' && (
        <Button
          onClick={() => handleUpdateStatus('ENTREGUE')}
          disabled={isPending}
          className="bg-green-600 hover:bg-green-700"
        >
          <PackageCheck className="mr-2 h-4 w-4" />
          Marcar como Entregue
        </Button>
      )}
    </>
  );
}
