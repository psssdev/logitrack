import { Badge } from '@/components/ui/badge';
import type { OrderStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  Package,
  PackageCheck,
  PackageX,
  Truck,
  Timer,
} from 'lucide-react';

const statusConfig: Record<
  OrderStatus,
  { label: string; icon: React.ElementType; color: string }
> = {
  PENDENTE: {
    label: 'Pendente',
    icon: Timer,
    color: 'bg-yellow-500/80 border-yellow-500/80',
  },
  EM_ROTA: {
    label: 'Em Rota',
    icon: Truck,
    color: 'bg-blue-500/80 border-blue-500/80',
  },
  ENTREGUE: {
    label: 'Entregue',
    icon: PackageCheck,
    color: 'bg-green-500/80 border-green-500/80',
  },
  CANCELADA: {
    label: 'Cancelada',
    icon: PackageX,
    color: 'bg-red-500/80 border-red-500/80',
  },
};

export function OrderStatusBadge({
  status,
  className,
}: {
  status: OrderStatus;
  className?: string;
}) {
  const config = statusConfig[status];
  if (!config) return null;
  const { label, icon: Icon, color } = config;

  return (
    <Badge
      className={cn(
        'text-white hover:text-white capitalize text-xs font-medium',
        color,
        className
      )}
    >
      <Icon className="mr-1 h-3 w-3" />
      {label}
    </Badge>
  );
}
