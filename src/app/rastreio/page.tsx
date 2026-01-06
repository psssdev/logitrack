'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Logo } from '@/components/logo';
import { Search } from 'lucide-react';

export default function RastreioSearchPage() {
  const [trackingCode, setTrackingCode] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (trackingCode.trim()) {
      router.push(`/rastreio/${trackingCode.trim()}`);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Link href="/" className="inline-block">
            <Logo className="mx-auto h-16 w-16" />
          </Link>
          <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground">
            Rastreie sua Encomenda
          </h1>
          <p className="mt-2 text-muted-foreground">
            Insira o código abaixo para acompanhar o progresso da sua entrega.
          </p>
        </div>

        <Card className="shadow-lg">
          <CardContent className="p-6">
            <form onSubmit={handleSearch} className="space-y-6">
              <div className="relative">
                <Input
                  id="tracking-code"
                  value={trackingCode}
                  onChange={(e) =>
                    setTrackingCode(e.target.value.toUpperCase())
                  }
                  placeholder="TR-XXXXXX"
                  required
                  autoFocus
                  className="h-14 text-center text-xl font-mono tracking-widest"
                />
              </div>
              <Button type="submit" className="w-full" size="lg">
                <Search className="mr-2 h-5 w-5" />
                Rastrear
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            É um administrador?{' '}
            <Link
              href="/"
              className="font-medium text-primary hover:underline"
            >
              Acessar o painel
            </Link>
          </p>
        </div>
      </div>
      <footer className="absolute bottom-8 text-center text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} LogiTrack. Todos os direitos
        reservados.
      </footer>
    </div>
  );
}
