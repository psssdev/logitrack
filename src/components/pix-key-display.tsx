'use client';

import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/copy-button';
import { Share2 } from 'lucide-react';
import type { PixKey } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';


export function PixKeyDisplay({ pixKey, companyName }: { pixKey: PixKey, companyName?: string }) {
  const { toast } = useToast();
  
  const handleShare = async () => {
    if (!pixKey?.key || !navigator.share) {
      toast({
        variant: 'destructive',
        title: 'Não é possível partilhar',
        description:
          'O seu navegador não suporta a partilha nativa ou não há chave Pix para partilhar.',
      });
      return;
    }
    try {
      await navigator.share({
        title: `Pagar para ${companyName || 'esta empresa'}`,
        text: `Use a chave Pix para pagar: ${pixKey.key}`,
        url: window.location.href,
      });
    } catch (error) {
      console.error('Error sharing:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao partilhar',
        description:
          'Não foi possível abrir a caixa de diálogo de partilha.',
      });
    }
  };


  return (
    <div className="flex flex-col items-center gap-6">
        <div className="rounded-lg bg-white p-4">
        <QRCodeSVG
            value={pixKey.key}
            size={220}
            bgColor={'#ffffff'}
            fgColor={'#000000'}
            level={'L'}
            includeMargin={false}
        />
        </div>
        <div className="w-full space-y-2">
        <p className="text-sm text-muted-foreground">
            Ou copie a chave Pix ({pixKey.type} - {pixKey.name}):
        </p>
        <div className="flex w-full items-center gap-2">
            <p className="flex-1 truncate rounded-md border bg-muted p-3 font-mono text-sm text-left">
            {pixKey.key}
            </p>
            <CopyButton value={pixKey.key} />
        </div>
        </div>
        {navigator.share && (
            <Button className="w-full" onClick={handleShare}>
              <Share2 className="mr-2 h-4 w-4" />
              Partilhar Link de Pagamento
            </Button>
          )}
    </div>
  );
}