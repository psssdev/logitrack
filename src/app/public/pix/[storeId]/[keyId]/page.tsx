'use client';

import { useEffect, useState } from 'react';
import { useFirestore, useMemoFirebase } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { Company, PixKey } from '@/lib/types';
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
import { Skeleton } from '@/components/ui/skeleton';


function PublicPixPageSkeleton() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4 animate-pulse">
            <Card className="w-full max-w-md text-center shadow-lg">
                 <CardHeader>
                    <Skeleton className="h-14 w-14 rounded-full mx-auto" />
                    <Skeleton className="h-7 w-3/4 mx-auto mt-4" />
                    <Skeleton className="h-4 w-full mx-auto mt-2" />
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center gap-6">
                        <Skeleton className="h-56 w-56 rounded-lg" />
                        <div className="w-full space-y-2">
                             <Skeleton className="h-4 w-1/2" />
                             <div className="flex gap-2">
                                <Skeleton className="h-12 w-full" />
                                <Skeleton className="h-12 w-24" />
                             </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}


export default function PublicPixPage({ params }: { params: { storeId: string; keyId: string } }) {
  const { storeId, keyId } = params;
  const firestore = useFirestore();

  const [pixKey, setPixKey] = useState<PixKey | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const companyRef = useMemoFirebase(() => {
    if (!firestore || !storeId) return null;
    return doc(firestore, 'stores', storeId, 'companySettings', 'default');
  }, [firestore, storeId]);

  const pixKeyRef = useMemoFirebase(() => {
     if (!firestore || !storeId || !keyId) return null;
     return doc(firestore, 'stores', storeId, 'pixKeys', keyId);
  }, [firestore, storeId, keyId]);


  useEffect(() => {
    async function fetchData() {
        if (!pixKeyRef || !companyRef) {
            setIsLoading(false);
            setError('Link de pagamento inválido.');
            return;
        }

        try {
            const [pixKeySnap, companySnap] = await Promise.all([
                getDoc(pixKeyRef),
                getDoc(companyRef),
            ]);

            if (!pixKeySnap.exists()) {
                setError('Chave Pix não encontrada ou removida.');
            } else {
                setPixKey({ id: pixKeySnap.id, ...pixKeySnap.data() } as PixKey);
            }
            
            if (companySnap.exists()) {
                 setCompany({ id: companySnap.id, ...companySnap.data() } as Company);
            }

        } catch (err: any) {
            console.error("Error fetching public pix data:", err);
            setError("Ocorreu um erro ao carregar os dados do pagamento.");
        } finally {
            setIsLoading(false);
        }
    }

    fetchData();
  }, [pixKeyRef, companyRef]);


  if (isLoading) {
    return <PublicPixPageSkeleton />;
  }

  if (error || !pixKey) {
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
