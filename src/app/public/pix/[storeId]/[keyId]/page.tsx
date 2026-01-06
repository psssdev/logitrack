
'use client';

import React, { useEffect, useState, use } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Logo } from '@/components/logo';
import { PixKeyDisplay } from '@/components/pix-key-display';
import { doc, getDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import type { Company, PixKey } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

interface PublicPixData {
  company: Company | null;
  pixKey: PixKey | null;
}

function PublicPixPageSkeleton() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4 animate-pulse">
             <Card className="w-full max-w-md text-center shadow-lg">
                <CardHeader>
                    <Skeleton className="mx-auto h-14 w-14 rounded-full" />
                    <Skeleton className="mx-auto mt-4 h-8 w-3/4" />
                    <Skeleton className="mx-auto mt-2 h-4 w-full" />
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-6">
                    <Skeleton className="h-[220px] w-[220px] rounded-lg" />
                    <div className="w-full space-y-2">
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-12 w-full" />
                    </div>
                </CardContent>
             </Card>
        </div>
    )
}


export default function PublicPixPage({ params }: { params: { storeId: string; keyId: string } }) {
  const { storeId, keyId } = use(params);
  const firestore = useFirestore();
  const [data, setData] = useState<PublicPixData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function fetchPublicPixData() {
        if (!firestore || !storeId || !keyId) {
            setError('Dados inválidos para carregar a página.');
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            console.log('Fetching PIX data for:', { storeId, keyId });
            const companySettingsRef = doc(firestore, 'stores', storeId, 'companySettings', 'default');
            const pixKeyRef = doc(firestore, 'stores', storeId, 'pixKeys', keyId);

            const [companySnap, pixKeySnap] = await Promise.all([
                getDoc(companySettingsRef),
                getDoc(pixKeyRef)
            ]);
            
            const company = companySnap.exists() ? companySnap.data() as Company : null;
            const pixKey = pixKeySnap.exists() ? { id: pixKeySnap.id, ...pixKeySnap.data() } as PixKey : null;

            if (!pixKey) {
                setError('O link de pagamento que tentou aceder é inválido ou a chave foi removida.');
            }
            
            setData({ company, pixKey });

        } catch (error: any) {
            console.error('Error fetching public pix data:', error);
            setError('Ocorreu um erro ao carregar os dados do pagamento.');
        } finally {
            setIsLoading(false);
        }
    }
    
    fetchPublicPixData();

  }, [firestore, storeId, keyId]);


  if (isLoading) {
    return <PublicPixPageSkeleton />;
  }

  if (error || !data?.pixKey) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-muted p-4 text-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
            <CardTitle className="mt-4">Chave Pix não Encontrada</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              {error || 'O link de pagamento que tentou aceder é inválido ou a chave foi removida.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { company, pixKey } = data;

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
        <CardContent>
            <PixKeyDisplay pixKey={pixKey} companyName={company?.nomeFantasia || undefined} />
        </CardContent>
      </Card>
    </div>
  );
}
