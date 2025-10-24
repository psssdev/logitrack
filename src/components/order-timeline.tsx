import type { Order } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  PackageCheck,
  PackageX,
  Truck,
  Timer,
} from 'lucide-react';

const statusConfig = {
  PENDENTE: { label: 'Pendente', icon: Timer },
  EM_ROTA: { label: 'Em Rota', icon: Truck },
  ENTREGUE: { label: 'Entregue', icon: PackageCheck },
  CANCELADA: { label: 'Cancelada', icon: PackageX },
};

export function OrderTimeline({ timeline }: { timeline: Order['timeline'] }) {
  const sortedTimeline = [...timeline].sort((a, b) => b.at.getTime() - a.at.getTime());

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {sortedTimeline.map((event, eventIdx) => {
          const config = statusConfig[event.status];
          const isLast = eventIdx === sortedTimeline.length - 1;
          
          return (
            <li key={eventIdx}>
              <div className="relative pb-8">
                {!isLast ? (
                  <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-border" aria-hidden="true" />
                ) : null}
                <div className="relative flex space-x-3">
                  <div>
                    <span
                      className={cn(
                        'h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-card bg-primary text-primary-foreground'
                      )}
                    >
                      <config.icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                  </div>
                  <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                    <div>
                      <p className="text-sm text-foreground">
                        Status alterado para{' '}
                        <span className="font-medium">{config.label}</span>
                      </p>
                    </div>
                    <div className="whitespace-nowrap text-right text-sm text-muted-foreground">
                      <time dateTime={event.at.toISOString()}>
                        {event.at.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      </time>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  );
}
