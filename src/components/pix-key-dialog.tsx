
'use client';

import React, { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser } from '@/firebase';
import { doc, addDoc, updateDoc, collection, serverTimestamp } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import type { PixKey } from '@/lib/types';
import { triggerRevalidation } from '@/lib/actions';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { pixKeySchema } from '@/lib/schemas';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useStore } from '@/contexts/store-context';

interface PixKeyDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  editingKey: PixKey | null;
}

type PixKeyFormValues = z.infer<typeof pixKeySchema>;

export function PixKeyDialog({
  isOpen,
  setIsOpen,
  editingKey,
}: PixKeyDialogProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { selectedStore } = useStore();
  const { toast } = useToast();

  const form = useForm<PixKeyFormValues>({
    resolver: zodResolver(pixKeySchema),
    defaultValues: {
        storeId: selectedStore?.id || '',
        name: '',
        key: '',
        type: 'Aleatória',
        isPrimary: false,
    }
  });

  useEffect(() => {
    if (selectedStore?.id) {
        form.setValue('storeId', selectedStore.id);
    }
    if (editingKey) {
        form.setValue('name', editingKey.name);
        form.setValue('key', editingKey.key);
        form.setValue('type', editingKey.type);
        form.setValue('isPrimary', editingKey.isPrimary);
    } else {
        form.reset({
            storeId: selectedStore?.id || '',
            name: '',
            key: '',
            type: 'Aleatória',
            isPrimary: false,
        });
    }
  }, [editingKey, isOpen, form, selectedStore]);

  const handleSave = async (data: PixKeyFormValues) => {
    if (!firestore || !user || !selectedStore) {
      toast({ variant: 'destructive', title: 'Erro de conexão.' });
      return;
    }
    
    try {
        if (editingKey) {
            // Update
            const keyRef = doc(firestore, 'stores', selectedStore.id, 'pixKeys', editingKey.id);
            await updateDoc(keyRef, data);
            toast({ title: 'Sucesso!', description: 'Chave Pix atualizada.' });
        } else {
            // Create
            const keysCollection = collection(firestore, 'stores', selectedStore.id, 'pixKeys');
            await addDoc(keysCollection, {
                ...data,
                createdAt: serverTimestamp(),
            });
            toast({ title: 'Sucesso!', description: 'Nova chave Pix adicionada.' });
        }
        
        await triggerRevalidation('/pix-config');
        setIsOpen(false);
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Erro ao Guardar',
            description: error.message || 'Não foi possível guardar a chave Pix.',
        });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editingKey ? 'Editar Chave Pix' : 'Adicionar Nova Chave Pix'}</DialogTitle>
          <DialogDescription>
            Preencha os detalhes da sua chave Pix.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSave)} className="grid gap-4 py-4">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nome da Chave</FormLabel>
                            <FormControl>
                                <Input placeholder="Ex: Pix Principal, Vendas Online" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Tipo</FormLabel>
                             <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                    <SelectTrigger><SelectValue placeholder="Selecione o tipo de chave" /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="CNPJ">CNPJ</SelectItem>
                                    <SelectItem value="Email">Email</SelectItem>
                                    <SelectItem value="Telefone">Telefone</SelectItem>
                                    <SelectItem value="Aleatória">Aleatória</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="key"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Chave Pix</FormLabel>
                            <FormControl>
                                <Input placeholder="O valor da sua chave pix" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <DialogFooter className="mt-4">
                    <Button type="button" variant="secondary" onClick={() => setIsOpen(false)} disabled={form.formState.isSubmitting}>
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Salvar Chave
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
