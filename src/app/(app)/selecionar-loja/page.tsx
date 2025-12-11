'use client';

import React, { useState } from 'react';
import { useStore } from '@/contexts/store-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Store as StoreIcon, Loader2 } from 'lucide-react';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SelectStorePage() {
  const { stores, selectStore, isLoading, createStore } = useStore();

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <div className="mb-8 flex items-center gap-2 font-semibold">
            <Logo className="h-8 w-8" />
            <span className="text-2xl">LogiTrack</span>
        </div>
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle>A carregar Lojas...</CardTitle>
                <CardDescription>
                    A verificar as suas lojas disponíveis.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                </div>
            </CardContent>
        </Card>
      </div>
    );
  }

  // If loading is done and there are no stores, show the creation form
  if (!isLoading && stores.length === 0) {
    return <NewStoreWizard createStore={createStore} />;
  }

  // If stores exist, show the selection list
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
            {stores.map((store) => (
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


function NewStoreWizard({ createStore }: { createStore: (name: string) => Promise<void> }) {
  const [storeName, setStoreName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim() || isCreating) return;
    setIsCreating(true);
    try {
      await createStore(storeName);
      // The context will handle the redirection upon successful creation and selection.
    } catch (error) {
      // Error is handled inside createStore with a toast
      setIsCreating(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <div className="mb-8 flex items-center gap-2 font-semibold">
            <Logo className="h-8 w-8" />
            <span className="text-2xl">LogiTrack</span>
        </div>
       <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Bem-vindo ao LogiTrack!</CardTitle>
          <CardDescription>
            Vamos começar por criar a sua primeira loja. Pode ser o nome da sua empresa ou uma filial.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="store-name">Nome da Loja</Label>
                    <Input
                        id="store-name"
                        placeholder="Ex: Loja Matriz"
                        value={storeName}
                        onChange={(e) => setStoreName(e.target.value)}
                        required
                        autoFocus
                    />
                </div>
                 <Button type="submit" className="w-full" disabled={isCreating || !storeName.trim()}>
                    {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {isCreating ? 'A criar...' : 'Criar Loja e Continuar'}
                 </Button>
            </form>
        </CardContent>
      </Card>
    </div>
  );
}