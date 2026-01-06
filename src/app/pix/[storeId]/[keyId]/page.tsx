
'use server';

import { getPublicPixData } from '@/lib/actions-public';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { Logo } from '@/components/logo';
import { PixKeyDisplay } from '@/components/pix-key-display';


export default async function PublicPixPage({ params }: { params: { storeId: string; keyId: string } }) {
  const storeId = params.storeId;
  const keyId = params.keyId;
  console.log('StoreId e KeyId',{ storeId, keyId });
  const { company, pixKey } = await getPublicPixData(storeId, keyId);

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
        <CardContent>
            <PixKeyDisplay pixKey={pixKey} companyName={company?.nomeFantasia || undefined} />
        </CardContent>
      </Card>
    </div>
  );
}
