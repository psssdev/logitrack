'use client';

import { useStore } from '@/contexts/store-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Store as StoreIcon } from 'lucide-react';
import { Logo } from '@/components/logo';

export default function SelectStorePage() {
  const { stores, selectStore, isLoading } = useStore();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <div className="mb-8 flex items-center gap-2 font-semibold">
            <Logo className="h-8 w-8" />
            <span className="text-2xl">LogiTrack</span>
        </div>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Selecione uma Loja</CardTitle>
          <CardDescription>
            Escolha a loja em que você deseja operar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isLoading && (
              <>
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </>
            )}
            {!isLoading &&
              stores.map((store) => (
                <button
                  key={store.id}
                  onClick={() => selectStore(store)}
                  className="flex w-full items-center gap-4 rounded-lg border p-4 text-left transition-all hover:bg-accent hover:text-accent-foreground"
                >
                  <StoreIcon className="h-6 w-6 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-semibold">{store.name}</p>
                    <p className="text-sm text-muted-foreground">ID: {store.id}</p>
                  </div>
                </button>
              ))}
            {!isLoading && stores.length === 0 && (
              <p className="text-center text-muted-foreground">
                Nenhuma loja encontrada para seu usuário.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
