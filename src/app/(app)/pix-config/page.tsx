
'use client';

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QrCode, PlusCircle, MoreHorizontal, Copy, ExternalLink, Trash2, Edit, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { copyToClipboardSafe } from '@/lib/clipboard';
import { useStore } from '@/contexts/store-context';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { PixKey } from '@/lib/types';
import { collection, query, doc, deleteDoc, writeBatch } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PixKeyDialog } from '@/components/pix-key-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { triggerRevalidation } from '@/lib/actions';
import Link from 'next/link';

export default function PixConfigPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { selectedStore, isLoading: isLoadingStore } = useStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<PixKey | null>(null);
  const [deletingKey, setDeletingKey] = useState<PixKey | null>(null);

  const pixKeysQuery = useMemoFirebase(() => {
    if (!firestore || !selectedStore) return null;
    return query(collection(firestore, 'stores', selectedStore.id, 'pixKeys'));
  }, [firestore, selectedStore]);

  const { data: pixKeys, isLoading: isLoadingKeys } = useCollection<PixKey>(pixKeysQuery);

  const isLoading = isLoadingStore || isLoadingKeys;

  const handleCopyLink = async (keyId: string) => {
    if (!selectedStore) return;
    const publicPixUrl = `${window.location.origin}/publico/pix/${selectedStore.id}/${keyId}`;
    const ok = await copyToClipboardSafe(publicPixUrl);
    toast({
      title: ok ? 'Link Copiado!' : 'Erro ao Copiar',
      description: ok ? 'O link público da chave Pix foi copiado.' : 'Não foi possível copiar o link.',
      variant: ok ? 'default' : 'destructive',
    });
  };
  
  const handleSetPrimary = async (keyToSet: PixKey) => {
    if (!firestore || !selectedStore || !pixKeys) return;

    if (keyToSet.isPrimary) {
        toast({ description: "Esta já é a chave principal."});
        return;
    }

    const batch = writeBatch(firestore);

    // Unset current primary
    const currentPrimary = pixKeys.find(k => k.isPrimary);
    if(currentPrimary) {
        const currentPrimaryRef = doc(firestore, 'stores', selectedStore.id, 'pixKeys', currentPrimary.id);
        batch.update(currentPrimaryRef, { isPrimary: false });
    }

    // Set new primary
    const newPrimaryRef = doc(firestore, 'stores', selectedStore.id, 'pixKeys', keyToSet.id);
    batch.update(newPrimaryRef, { isPrimary: true });

    try {
        await batch.commit();
        await triggerRevalidation('/pix-config');
        toast({ title: "Sucesso!", description: `"${keyToSet.name}" foi definida como a chave principal.` });
    } catch(error: any) {
        toast({ variant: "destructive", title: "Erro ao definir chave primária", description: error.message });
    }
  }

  const handleDelete = async () => {
    if (!firestore || !deletingKey || !selectedStore) return;
    try {
        const keyRef = doc(firestore, 'stores', selectedStore.id, 'pixKeys', deletingKey.id);
        await deleteDoc(keyRef);
        await triggerRevalidation('/pix-config');
        toast({ title: "Chave Pix removida com sucesso!" });
    } catch (error: any) {
        toast({ variant: "destructive", title: "Erro ao remover chave", description: error.message });
    } finally {
        setDeletingKey(null);
    }
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex items-center">
          <h1 className="flex-1 text-2xl font-semibold md:text-3xl">
            Gestor de Chaves Pix
          </h1>
          <Button onClick={() => { setEditingKey(null); setDialogOpen(true); }}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar Chave Pix
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-6 w-6" />
              Suas Chaves Pix
            </CardTitle>
            <CardDescription>
              Gira as suas chaves Pix para esta loja. Pode partilhar cada chave individualmente através de um link público.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
                <Skeleton className="h-48 w-full" />
            ) : pixKeys && pixKeys.length > 0 ? (
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Chave</TableHead>
                                <TableHead><span className="sr-only">Ações</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {pixKeys.map(key => (
                                <TableRow key={key.id} className={key.isPrimary ? "bg-muted/50" : ""}>
                                    <TableCell className="font-medium flex items-center gap-2">
                                        {key.name}
                                        {key.isPrimary && <Star className="h-4 w-4 text-yellow-500 fill-current" />}
                                    </TableCell>
                                    <TableCell>{key.type}</TableCell>
                                    <TableCell className="font-mono">{key.key}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4"/></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleSetPrimary(key)} disabled={key.isPrimary}>
                                                   <Star className="mr-2 h-4 w-4"/> Definir como Principal
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => handleCopyLink(key.id)}>
                                                    <Copy className="mr-2 h-4 w-4" /> Copiar Link Público
                                                </DropdownMenuItem>
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/publico/pix/${selectedStore?.id}/${key.id}`} target="_blank">
                                                        <ExternalLink className="mr-2 h-4 w-4" /> Abrir Link Público
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                 <DropdownMenuItem onClick={() => { setEditingKey(key); setDialogOpen(true); }}>
                                                    <Edit className="mr-2 h-4 w-4"/> Editar
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="text-destructive" onClick={() => setDeletingKey(key)}>
                                                    <Trash2 className="mr-2 h-4 w-4"/> Remover
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            ): (
                <div className="text-center p-8 border-2 border-dashed rounded-md">
                    <p className="text-muted-foreground">Nenhuma chave Pix registada para esta loja.</p>
                    <Button variant="link" onClick={() => { setEditingKey(null); setDialogOpen(true); }}>Adicionar a sua primeira chave</Button>
                </div>
            )}
          </CardContent>
        </Card>
      </div>

      <PixKeyDialog 
        isOpen={dialogOpen}
        setIsOpen={setDialogOpen}
        editingKey={editingKey}
      />

      <AlertDialog open={!!deletingKey} onOpenChange={(open) => !open && setDeletingKey(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Tem a certeza?</AlertDialogTitle>
                <AlertDialogDescription>
                   Esta ação não pode ser desfeita. Isto irá remover permanentemente a chave Pix <span className="font-bold">"{deletingKey?.name}"</span>.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Remover</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
