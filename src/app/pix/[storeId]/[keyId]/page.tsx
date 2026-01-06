
'use client';

import { useEffect, useState, use } from 'react';
import { getFirestoreServer } from '@/lib/actions-public';
import { doc, getDoc } from 'firebase/firestore';
import { QRCodeSVG } from 'qrcode.react';
import { CopyButton } from '@/components/copy-button';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, QrCode, Share2 } from 'lucide-react';
import type { Company, PixKey } from '@/lib/types';
import { Logo } from '@/components/logo';
import { useToast } from '@/hooks/use-toast';

async function getPublicPixData(storeId: string, keyId: string): Promise<{ company: Company | null; pixKey: PixKey | null }> {
  if (!storeId || !keyId) return { company: null, pixKey: null };
  try {
    const db = await getFirestoreServer();
    const companySettingsRef = doc(db, 'stores', storeId, 'companySettings', 'default');
    const pixKeyRef = doc(db, 'stores', storeId, 'pixKeys', keyId);

    const [companySnap, pixKeySnap] = await Promise.all([
        getDoc(companySettingsRef),
        getDoc(pixKeyRef)
    ]);
    
    const company = companySnap.exists() ? companySnap.data() as Company : null;
    const pixKey = pixKeySnap.exists() ? { id: pixKeySnap.id, ...pixKeySnap.data() } as PixKey : null;

    return { company, pixKey };

  } catch (error) {
    console.error('Error fetching public pix data:', error);
    return { company: null, pixKey: null };
  }
}

export default function PublicPixPage({ params }: { params: { storeId: string; keyId: string } }) {
  const { storeId, keyId } = use(params);
  const [data, setData] = useState<{ company: Company | null; pixKey: PixKey | null }>({ company: null, pixKey: null });
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      const fetchedData = await getPublicPixData(storeId, keyId);
      setData(fetchedData);
      setIsLoading(false);
    }
    fetchData();
  }, [storeId, keyId]);

  const { company, pixKey } = data;

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
        title: `Pagar para ${company?.nomeFantasia || 'esta empresa'}`,
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

  if (isLoading) {
    return <PixPageSkeleton />;
  }

  if (!pixKey) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-muted p-4 text-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
            <CardTitle className="mt-4">Chave Pix não Encontrada</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              O link de pagamento que tentou aceder é inválido ou a chave foi removida.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md text-center shadow-lg">
        <CardHeader>
          <Logo className="mx-auto h-14 w-14" />
          <CardTitle className="mt-4 text-2xl">
            Pagar para {company?.nomeFantasia || 'esta empresa'}
          </CardTitle>
          <CardDescription>
            Use o QR Code ou a chave Pix abaixo para efetuar o pagamento.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6">
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
              <p className="flex-1 truncate rounded-md border bg-muted p-3 font-mono text-sm">
                {pixKey.key}
              </p>
              <CopyButton value={pixKey.key} label="Copiar" />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-3">
          {navigator.share && (
            <Button className="w-full" onClick={handleShare}>
              <Share2 className="mr-2 h-4 w-4" />
              Partilhar Link de Pagamento
            </Button>
          )}
          <p className="text-xs text-muted-foreground">
            Verifique o nome do destinatário antes de confirmar o pagamento.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

function PixPageSkeleton() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <Skeleton className="mx-auto h-14 w-14 rounded-full" />
          <Skeleton className="mx-auto mt-4 h-7 w-48" />
          <Skeleton className="mx-auto mt-2 h-4 w-64" />
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6">
          <Skeleton className="h-[220px] w-[220px] rounded-lg" />
          <div className="w-full space-y-2">
            <Skeleton className="mx-auto h-4 w-32" />
            <div className="flex w-full items-center gap-2">
              <Skeleton className="h-12 flex-1" />
              <Skeleton className="h-12 w-24" />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </CardFooter>
      </Card>
    </div>
  );
}
