'use client';

import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, orderBy, query } from 'firebase/firestore';
import type { AvisameCampaign } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { CampaignTable } from '@/components/avisame/campaign-table';

const COMPANY_ID = '1';

export default function AvisameCampaignsPage() {
  const firestore = useFirestore();
  const { isUserLoading } = useUser();

  const campaignsQuery = useMemoFirebase(() => {
    if (!firestore || isUserLoading) return null;
    return query(
      collection(firestore, 'companies', COMPANY_ID, 'avisame_campaigns'),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, isUserLoading]);

  const { data: campaigns, isLoading } = useCollection<AvisameCampaign>(campaignsQuery);
  const pageIsLoading = isLoading || isUserLoading;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center">
        <h1 className="flex-1 text-2xl font-semibold md:text-3xl">
          Campanhas Avisame
        </h1>
        <div className="flex items-center gap-2">
          <Button size="sm" className="h-8 gap-1" asChild>
            <Link href="/avisame">
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Nova Campanha
              </span>
            </Link>
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Campanhas</CardTitle>
          <CardDescription>
            Gerencie e acompanhe as campanhas de notificação em massa.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pageIsLoading && <Skeleton className="h-64 w-full" />}
          {campaigns && !pageIsLoading && (
            <CampaignTable campaigns={campaigns} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
