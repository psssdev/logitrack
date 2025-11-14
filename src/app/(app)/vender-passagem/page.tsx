'use client';

import Link from 'next/link';
import { useMemo, useCallback } from 'react';
import { ChevronLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NewFinancialEntryForm } from '@/components/new-financial-entry-form';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import type { Vehicle, Client, Origin, Destino } from '@/lib/types';
import { collection, query, orderBy, Query } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

const COMPANY_ID = '1';

export default function VenderPassagemPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  // Só consulta quando estiver tudo pronto e autenticado
  const canQuery = !!firestore && !!user?.uid && !isUserLoading;

  /**
   * IMPORTANTE: índices recomendados (se o console pedir):
   * - companies/{companyId}/vehicles  orderBy(modelo)
   * - companies/{companyId}/clients   orderBy(nome)
   * - companies/{companyId}/origins   orderBy(name)
   * - companies/{companyId}/destinos  orderBy(name)
   */

  const vehiclesQuery = useMemoFirebase<Query | null>(() => {
    if (!canQuery) return null;
    return query(collection(firestore!, 'companies', COMPANY_ID, 'vehicles'), orderBy('modelo', 'asc'));
  }, [canQuery, firestore]);

  const clientsQuery = useMemoFirebase<Query | null>(() => {
    if (!canQuery) return null;
    return query(collection(firestore!, 'companies', COMPANY_ID, 'clients'), orderBy('nome', 'asc'));
  }, [canQuery, firestore]);

  const originsQuery = useMemoFirebase<Query | null>(() => {
    if (!canQuery) return null;
    return query(collection(firestore!, 'companies', COMPANY_ID, 'origins'), orderBy('name', 'asc'));
  }, [canQuery, firestore]);

  const destinosQuery = useMemoFirebase<Query | null>(() => {
    if (!canQuery) return null;
    return query(collection(firestore!, 'companies', COMPANY_ID, 'destinos'), orderBy('name', 'asc'));
  }, [canQuery, firestore]);

  const {
    data: vehiclesRaw,
    isLoading: isLoadingVehicles,
    error: vehiclesError,
  } = useCollection<Vehicle>(vehiclesQuery ?? undefined);

  const {
    data: clientsRaw,
    isLoading: isLoadingClients,
    error: clientsError,
  } = useCollection<Client>(clientsQuery ?? undefined);

  const {
    data: originsRaw,
    isLoading: isLoadingOrigins,
    error: originsError,
  } = useCollection<Origin>(originsQuery ?? undefined);

  const {
    data: destinationsRaw,
    isLoading: isLoadingDestinations,
    error: destinationsError,
  } = useCollection<Destino>(destinosQuery ?? undefined);

  const vehicles: Vehicle[] = Array.isArray(vehiclesRaw) ? vehiclesRaw : [];
  const clients: Client[] = Array.isArray(clientsRaw) ? clientsRaw : [];
  const origins: Origin[] = Array.isArray(originsRaw) ? originsRaw : [];
  const destinations: Destino[] = Array.isArray(destinationsRaw) ? destinationsRaw : [];

  const isLoadingAll =
    !canQuery ||
    isUserLoading ||
    isLoadingVehicles ||
    isLoadingClients ||
    isLoadingOrigins ||
    isLoadingDestinations;

  // Render “erro amigável” com link de índice quando for failed-precondition
  const renderError = useCallback((err?: unknown) => {
    if (!err) return null;
    const msg = String(err);
    const isIndexError = /failed-precondition/i.test(msg) && /index/i.test(msg);
    const indexLink = msg.match(/https:\/\/console\.firebase\.google\.com\/[^\s)]+/i)?.[0];

    return (
      <Card className="border-red-300 bg-red-50">
        <CardContent className="p-4 text-sm text-red-700">
          <p className="font-semibold">Erro ao carregar dados</p>
          <p className="mt-1">{msg}</p>
          {isIndexError && indexLink && (
            <p className="mt-2">
              Esta consulta requer um índice. Clique para criar:{' '}
              <a className="underline" href={indexLink} target="_blank" rel="noreferrer">
                Criar índice no Firestore
              </a>
            </p>
          )}
        </CardContent>
      </Card>
    );
  }, []);

  const anyError = vehiclesError || clientsError || originsError || destinationsError;

  // Tentar de novo = um “no-op” que força refetch (mudando uma key de estado) — aqui simples: recarrega rota
  const retry = () => {
    if (typeof window !== 'undefined') window.location.reload();
  };

  return (
    <div className="mx-auto grid w-full max-w-6xl flex-1 auto-rows-max gap-4">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm" className="hidden sm:flex">
          <Link href="/inicio">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Início
          </Link>
        </Button>
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
          PDV — Venda de Passagem
        </h1>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={retry}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Loading geral */}
      {isLoadingAll && <Skeleton className="h-[500px] w-full" />}

      {/* Erros */}
      {!isLoadingAll && anyError && (
        <div className="space-y-3">
          {renderError(vehiclesError)}
          {renderError(clientsError)}
          {renderError(originsError)}
          {renderError(destinationsError)}
          <div>
            <Button variant="outline" onClick={retry}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Tentar de novo
            </Button>
          </div>
        </div>
      )}

      {/* Vazios */}
      {!isLoadingAll && !anyError && (vehicles.length === 0 || clients.length === 0 || origins.length === 0 || destinations.length === 0) && (
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">
              Para vender passagem, você precisa ter <strong>Veículos</strong>, <strong>Clientes</strong>,
              <strong> Origens</strong> e <strong> Destinos</strong> cadastrados.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm"><Link href="/veiculos">Cadastrar veículo</Link></Button>
              <Button asChild variant="outline" size="sm"><Link href="/clientes">Cadastrar cliente</Link></Button>
              <Button asChild variant="outline" size="sm"><Link href="/origens">Cadastrar origem</Link></Button>
              <Button asChild variant="outline" size="sm"><Link href="/destinos">Cadastrar destino</Link></Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Form pronto */}
      {!isLoadingAll && !anyError && vehicles.length && clients.length && origins.length && destinations.length ? (
        <NewFinancialEntryForm
          vehicles={vehicles}
          clients={clients}
          origins={origins}
          destinations={destinations}
        />
      ) : null}
    </div>
  );
}
