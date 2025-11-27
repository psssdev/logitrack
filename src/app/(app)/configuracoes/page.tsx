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
import { collection, getDocs, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Company } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { CompanySettingsForm } from '@/components/company-settings-form';

const collectionsToBackup = [
    'clients', 
    'orders', 
    'drivers', 
    'vehicles', 
    'financialEntries', 
    'financialCategories',
    'origins',
    'destinos'
];

export default function ConfiguracoesPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [isBackingUp, startBackupTransition] = useTransition();
  const [isRestoring, startRestoreTransition] = useTransition();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const companyRef = useMemoFirebase(() => {
    if (!firestore || !user || isUserLoading) return null;
    // Assuming a single company document for simplicity, adjust if multi-tenant
    return doc(firestore, 'companies', '1');
  }, [firestore, user, isUserLoading]);

  const { data: company, isLoading: isLoadingCompany } = useDoc<Company>(companyRef);

  const handleCreateBackup = () => {
    startBackupTransition(async () => {
        if (!firestore) {
            toast({
                variant: 'destructive',
                title: 'Erro de Conexão',
                description: 'Não foi possível conectar ao Firestore.',
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
                const collectionRef = collection(firestore, collectionName);
                const snapshot = await getDocs(collectionRef);
                const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                backupData[collectionName] = docs;
                totalDocs += docs.length;
            }

            const jsonString = JSON.stringify(backupData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            const date = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '-');
            link.download = `backup-logitrack-${date}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
             toast({
                title: 'Backup Concluído!',
                description: `${totalDocs} documentos foram exportados com sucesso.`,
            });

        } catch(error: any) {
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
      toast({
        title: 'Restauro não implementado',
        description: 'A funcionalidade de restauro de backup ainda não está ativa. Esta é uma operação sensível que requer confirmação.',
        variant: 'destructive',
      });
      // Placeholder for restore logic
      console.log('Restore from file:', file.name);
      // Reset the file input
      if(fileInputRef.current) fileInputRef.current.value = "";
    });
  };

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
                   <HardDriveDownload className="h-6 w-6"/>
                   Gestão de Dados
                </CardTitle>
                <CardDescription>
                    Exporte ou restaure todos os seus dados operacionais. Use com cuidado.
                </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
                <div className="space-y-2">
                    <Button onClick={handleCreateBackup} disabled={isBackingUp} className="w-full">
                        {isBackingUp ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DownloadCloud className="mr-2 h-4 w-4" />}
                        {isBackingUp ? 'A processar...' : 'Criar Backup Completo'}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                        Isto irá descarregar um ficheiro JSON com os dados de todas as coleções.
                    </p>
                </div>
                 <div className="space-y-2">
                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="application/json" className="hidden" />
                    <Button onClick={() => fileInputRef.current?.click()} disabled={isRestoring} className="w-full" variant="outline">
                        {isRestoring ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                        {isRestoring ? 'A restaurar...' : 'Restaurar Backup'}
                    </Button>
                     <p className="text-xs text-muted-foreground mt-2 text-center">
                        Selecione um ficheiro de backup JSON para restaurar os dados.
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
                    Configure as informações da sua empresa e personalize as mensagens automáticas.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isLoadingCompany || isUserLoading ? (
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
