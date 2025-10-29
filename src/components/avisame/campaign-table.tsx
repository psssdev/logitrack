'use client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import type { AvisameCampaign } from '@/lib/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlayCircle } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Timestamp } from 'firebase/firestore';
import { Progress } from '../ui/progress';

const campaignStatusConfig: Record<string, { label: string; color: string }> = {
  scheduled: { label: 'Agendada', color: 'bg-yellow-500/80' },
  running: { label: 'Em Execução', color: 'bg-blue-500/80' },
  done: { label: 'Concluída', color: 'bg-green-500/80' },
  failed: { label: 'Falhou', color: 'bg-red-500/80' },
};

export function CampaignTable({ campaigns }: { campaigns: AvisameCampaign[] }) {
  const formatDate = (date: Date | Timestamp | undefined) => {
    if (!date) return 'N/A';
    const d = date instanceof Timestamp ? date.toDate() : date;
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const config = campaignStatusConfig[status];
    if (!config)
      return <Badge variant="secondary">{status.toUpperCase()}</Badge>;
    return (
      <Badge className={`text-white hover:text-white ${config.color}`}>
        {config.label}
      </Badge>
    );
  };

  const calculateProgress = (stats: AvisameCampaign['stats']) => {
    if (!stats || !stats.queued) return 0;
    const total = stats.queued + stats.sent + stats.failed;
    if (total === 0) return 0;
    const completed = stats.sent + stats.failed;
    return (completed / total) * 100;
  };

  if (campaigns.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center rounded-md border-2 border-dashed p-12 text-center">
        <h3 className="text-lg font-medium">Nenhuma campanha encontrada</h3>
        <p className="text-sm text-muted-foreground">
          Crie sua primeira campanha para começar a notificar seus clientes.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cidade</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden md:table-cell">Agendada Para</TableHead>
            <TableHead className="hidden lg:table-cell">Progresso</TableHead>
            <TableHead>
              <span className="sr-only">Ações</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {campaigns.map((campaign) => (
            <TableRow key={campaign.id}>
              <TableCell className="font-medium">{campaign.city}</TableCell>
              <TableCell>{getStatusBadge(campaign.status)}</TableCell>
              <TableCell className="hidden md:table-cell">
                {formatDate(campaign.scheduledAt)}
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <div className="flex items-center gap-2">
                    <Progress value={calculateProgress(campaign.stats)} className="w-32 h-2" />
                    <span className="text-xs text-muted-foreground">{`${campaign.stats.sent}/${campaign.stats.queued + campaign.stats.sent + campaign.stats.failed}`}</span>
                </div>
              </TableCell>
              <TableCell className="text-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button aria-haspopup="true" size="icon" variant="ghost">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Abrir menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {campaign.status === 'scheduled' && (
                        <DropdownMenuItem>
                            <PlayCircle className="mr-2 h-4 w-4" />
                            Executar Agora
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuItem className="text-destructive">
                      Cancelar Campanha
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
