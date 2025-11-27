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
import { DownloadCloud, HardDriveDownload, Loader2 } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

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
  const { user } = useUser();
  const { toast } = useToast();
  const [isBackingUp, startTransition] = useTransition();

  const handleCreateBackup = () => {
    startTransition(async () => {
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center">
        <h1 className="flex-1 text-2xl font-semibold md:text-3xl">
          Configurações
        </h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
         <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                   <HardDriveDownload className="h-6 w-6"/>
                   Gestão de Dados
                </CardTitle>
                <CardDescription>
                    Exporte todos os seus dados operacionais para um ficheiro local como medida de segurança.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Button onClick={handleCreateBackup} disabled={isBackingUp}>
                    {isBackingUp ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <DownloadCloud className="mr-2 h-4 w-4" />
                    )}
                    {isBackingUp ? 'A processar...' : 'Criar Backup Completo'}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                    Isto irá descarregar um ficheiro JSON com os dados de todas as coleções.
                </p>
            </CardContent>
         </Card>
      </div>
    </div>
  );
}
