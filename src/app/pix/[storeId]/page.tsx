'use client';

import { useEffect, useState } from 'react';
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
import type { Company } from '@/lib/types';
import { Logo } from '@/components/logo';
import { useToast } from '@/hooks/use-toast';

async function getPublicCompanySettings(storeId: string): Promise<Company | null> {
  if (!storeId) return null;
  try {
    const db = await getFirestoreServer();
    const settingsRef = doc(db, 'stores', storeId, 'companySettings', 'default');
    const docSnap = await getDoc(settingsRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      // Manually create a plain object to ensure it's serializable
      const companyData: Company = {
        id: docSnap.id,
        nomeFantasia: data.nomeFantasia,
        razaoSocial: data.razaoSocial,
        cnpj: data.cnpj,
        chavePix: data.chavePix,
        endereco: data.endereco,
        telefone: data.telefone,
        codigoPrefixo: data.codigoPrefixo,
        linkBaseRastreio: data.linkBaseRastreio,
        msgCobranca: data.msgCobranca,
        msgRecebido: data.msgRecebido,
        msgAvisame: data.msgAvisame,
        msgEmRota: data.msgEmRota,
      };
      return companyData;
    }
    return null;
  } catch (error) {
    console.error('Error fetching public company settings:', error);
    return null;
  }
}

export default function PublicPixPage({ params }: { params: { storeId: string } }) {
  const { storeId } = params;
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      const data = await getPublicCompanySettings(storeId);
      setCompany(data);
      setIsLoading(false);
    }
    fetchData();
  }, [storeId]);

  const handleShare = async () => {
    if (!company?.chavePix || !navigator.share) {
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
        title: `Pagar para ${company.nomeFantasia}`,
        text: `Use a chave Pix para pagar: ${company.chavePix}`,
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

  if (!company || !company.chavePix) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-muted p-4 text-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
            <CardTitle className="mt-4">Informação Indisponível</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              As informações de pagamento para esta empresa ainda não foram
              configuradas.
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
            Pagar para {company.nomeFantasia}
          </CardTitle>
          <CardDescription>
            Use o QR Code ou a chave Pix abaixo para efetuar o pagamento.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6">
          <div className="rounded-lg bg-white p-4">
            <QRCodeSVG
              value={company.chavePix}
              size={220}
              bgColor={'#ffffff'}
              fgColor={'#000000'}
              level={'L'}
              includeMargin={false}
            />
          </div>
          <div className="w-full space-y-2">
            <p className="text-sm text-muted-foreground">
              Ou copie a chave Pix:
            </p>
            <div className="flex w-full items-center gap-2">
              <p className="flex-1 truncate rounded-md border bg-muted p-3 font-mono text-sm">
                {company.chavePix}
              </p>
              <CopyButton value={company.chavePix} label="Copiar" />
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
