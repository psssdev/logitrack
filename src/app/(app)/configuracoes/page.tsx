'use client';

import React, { useState, useTransition } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DownloadCloud, HardDriveDownload, Loader2, UploadCloud, Settings } from 'lucide-react';
import { useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, getDocs, doc, writeBatch, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Company } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { CompanySettingsForm } from '@/components/company-settings-form';
import { useStore } from '@/contexts/store-context';

const collectionsToBackup = [
  'clients',
  'orders',
  'drivers',
  'vehicles',
  'financialEntries',
  'financialCategories',
  'origins',
  'destinos',
  'pixKeys',
  'companySettings'
];

export default function ConfiguracoesPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { selectedStore } = useStore();
  const { toast } = useToast();
  const [isBackingUp, startBackupTransition] = useTransition();
  const [isRestoring, startRestoreTransition] = useTransition();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const companyRef = useMemoFirebase(() => {
    if (!firestore || !selectedStore) return null;
    return doc(firestore, 'stores', selectedStore.id, 'companySettings', 'default');
  }, [firestore, selectedStore]);

  const { data: company, isLoading: isLoadingCompany } = useDoc<Company>(companyRef);

  const handleCreateBackup = () => {
    startBackupTransition(async () => {
      if (!firestore || !selectedStore) {
        toast({
          variant: 'destructive',
          title: 'Erro de Conexão',
          description: 'Não foi possível conectar ao Firestore ou nenhuma loja selecionada.',
        });
        return;
      }

      toast({
        title: 'Iniciando Backup...',
        description: 'A coletar os dados. O download começará em breve.',
      });

      const backupData: Record<string, any[]> = {};
      let totalDocs = 0;

      try {
        for (const collectionName of collectionsToBackup) {
          // 1. Fetch from Store
          const collectionRef = collection(firestore, 'stores', selectedStore.id, collectionName);
          const snapshot = await getDocs(collectionRef);
          const finalDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

          backupData[collectionName] = finalDocs;
          totalDocs += finalDocs.length;
        }

        const jsonString = JSON.stringify(backupData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        const date = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '-');
        link.download = `backup-${selectedStore.name.replace(/\s/g, '_')}-${date}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast({
          title: 'Backup Concluído!',
          description: `${totalDocs} documentos foram exportados com sucesso.`,
        });

      } catch (error: any) {
        console.error("Backup failed:", error);
        toast({
          variant: 'destructive',
          title: 'Falha no Backup',
          description: error.message || 'Ocorreu um erro ao tentar criar o backup.',
        });
      }
    });
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleRestoreBackup(file);
    }
  };

  const handleRestoreBackup = (file: File) => {
    startRestoreTransition(async () => {
      if (!firestore || !selectedStore) {
        console.error("Missing firestore or selectedStore");
        return;
      }

      console.log("Starting restore for file:", file.name);

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const json = e.target?.result as string;
          const backupData = JSON.parse(json);
          console.log("Backup data parsed. Keys found:", Object.keys(backupData));

          let totalRestored = 0;

          // Helper to convert ISO strings or {seconds, nanoseconds} back to Timestamp
          const deserializeTimestamps = (obj: any): any => {
            if (obj === null || typeof obj !== 'object') return obj;

            // Handle { seconds, nanoseconds } (standard JSON.stringify of Timestamp)
            if (obj.seconds !== undefined && obj.nanoseconds !== undefined) {
              return new Timestamp(obj.seconds, obj.nanoseconds);
            }

            // Handle { _seconds, _nanoseconds } (internal format or legacy export)
            if (obj._seconds !== undefined && obj._nanoseconds !== undefined) {
              return new Timestamp(obj._seconds, obj._nanoseconds);
            }

            for (const key in obj) {
              const value = obj[key];
              if (typeof value === 'string') {
                // Regex for ISO 8601 date format
                if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(value)) {
                  const date = new Date(value);
                  if (!isNaN(date.getTime())) {
                    obj[key] = Timestamp.fromDate(date);
                  }
                }
              } else if (typeof value === 'object') {
                obj[key] = deserializeTimestamps(value);
              }
            }
            return obj;
          };

          for (const collectionName of collectionsToBackup) {
            const docs = backupData[collectionName];
            if (!docs || !Array.isArray(docs) || docs.length === 0) {
              console.log(`Skipping collection ${collectionName}: No docs or empty.`);
              continue;
            }

            console.log(`Restoring ${docs.length} docs for ${collectionName}...`);

            // Process in batches
            const chunkPoints = [];
            for (let i = 0; i < docs.length; i += 400) {
              chunkPoints.push(docs.slice(i, i + 400));
            }

            for (const chunk of chunkPoints) {
              const batch = writeBatch(firestore);
              let actualOps = 0;

              for (const docData of chunk) {
                const { id, ...data } = docData;
                if (!id) continue;

                const processedData = deserializeTimestamps(data);
                const finalData = { ...processedData, storeId: selectedStore.id };

                const docRef = doc(firestore, 'stores', selectedStore.id, collectionName, id);
                batch.set(docRef, finalData);
                actualOps++;
              }

              if (actualOps > 0) {
                await batch.commit();
                console.log(`Batch committed: ${actualOps} docs for ${collectionName}`);
                totalRestored += actualOps;
              }
            }
          }

          console.log("Total restored:", totalRestored);

          if (totalRestored === 0) {
            toast({
              variant: 'destructive', // Warning style
              title: 'Nenhum dado restaurado',
              description: 'O arquivo parece válido, mas nenhum documento foi encontrado nas coleções esperadas.',
            });
          } else {
            toast({
              title: 'Restauro Concluído',
              description: `${totalRestored} documentos foram importados para a loja ${selectedStore.name}.`,
            });
            // Force reload to reflect changes
            window.location.reload();
          }

        } catch (error: any) {
          console.error("Restore failed:", error);
          toast({
            variant: 'destructive',
            title: 'Erro no Restauro',
            description: 'O arquivo de backup parece estar inválido ou corrompido: ' + error.message,
          });
        }

        // Reset file input
        if (fileInputRef.current) fileInputRef.current.value = "";
      };

      reader.readAsText(file);
    });
  };

  const isLoading = isLoadingCompany || isUserLoading || !selectedStore;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center">
        <h1 className="flex-1 text-2xl font-semibold md:text-3xl">
          Configurações
        </h1>
      </div>

      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDriveDownload className="h-6 w-6" />
              Gestão de Dados
            </CardTitle>
            <CardDescription>
              Exporte ou restaure todos os seus dados operacionais da loja selecionada. Use com cuidado.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="space-y-2">
              <Button onClick={handleCreateBackup} disabled={isBackingUp} className="w-full">
                {isBackingUp ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DownloadCloud className="mr-2 h-4 w-4" />}
                {isBackingUp ? 'A processar...' : 'Criar Backup da Loja'}
              </Button>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Isto irá descarregar um ficheiro JSON com os dados da loja atual.
              </p>
            </div>
            <div className="space-y-2">
              <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="application/json" className="hidden" />
              <Button onClick={() => fileInputRef.current?.click()} disabled={isRestoring} className="w-full" variant="outline">
                {isRestoring ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                {isRestoring ? 'A restaurar...' : 'Restaurar Backup'}
              </Button>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Selecione um ficheiro de backup JSON para restaurar os dados na loja atual.
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-6 w-6" />
              Dados da Empresa e Sistema
            </CardTitle>
            <CardDescription>
              Configure as informações da sua empresa e personalize as mensagens automáticas para esta loja.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-96 w-full" />
            ) : (
              <CompanySettingsForm company={company} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
