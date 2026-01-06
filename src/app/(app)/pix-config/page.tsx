'use client';

import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QrCode, ArrowUpRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { copyToClipboardSafe } from '@/lib/clipboard';

export default function PixConfigPage() {
  const { toast } = useToast();
  const publicPixUrl = `${window.location.origin}/pix`;

  const handleCopyLink = async () => {
    const ok = await copyToClipboardSafe(publicPixUrl);
    if (ok) {
      toast({
        title: 'Link Copiado!',
        description: 'O link público da sua página Pix foi copiado.',
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Erro ao Copiar',
        description: 'Não foi possível copiar o link automaticamente.',
      });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center">
        <h1 className="flex-1 text-2xl font-semibold md:text-3xl">
          Partilhar Chave Pix
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-6 w-6" />
            Sua Página Pública de Pagamento
          </CardTitle>
          <CardDescription>
            Use o link abaixo para partilhar facilmente a sua chave Pix e QR
            Code com os seus clientes. Esta página não requer login.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-start gap-4 rounded-lg border bg-muted/50 p-4 sm:flex-row sm:items-center">
            <div className="flex-1">
              <p className="text-sm font-medium">Link para Partilha:</p>
              <Link
                href={publicPixUrl}
                target="_blank"
                className="break-all font-mono text-primary hover:underline"
              >
                {publicPixUrl}
              </Link>
            </div>
            <div className="flex w-full gap-2 sm:w-auto">
              <Button onClick={handleCopyLink} variant="outline" className="w-full sm:w-auto">
                Copiar Link
              </Button>
              <Button asChild className="w-full sm:w-auto">
                <Link href={publicPixUrl} target="_blank">
                  Abrir <ArrowUpRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
