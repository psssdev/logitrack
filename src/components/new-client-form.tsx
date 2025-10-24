'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { triggerRevalidation } from '@/lib/actions';
import { newClientSchema } from '@/lib/schemas';
import type { NewClient } from '@/lib/types';
import { useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

const COMPANY_ID = '1';

export function NewClientForm() {
  const { toast } = useToast();
  const router = useRouter();
  const firestore = useFirestore();

  const form = useForm<NewClient>({
    resolver: zodResolver(newClientSchema),
    defaultValues: {
      nome: '',
      telefone: '',
    },
  });

  async function onSubmit(data: NewClient) {
    if (!firestore) {
        toast({
            variant: 'destructive',
            title: 'Erro de conexão',
            description: 'Não foi possível conectar ao banco de dados.'
        });
        return;
    }

    try {
        const clientsCollection = collection(firestore, 'companies', COMPANY_ID, 'clients');
        await addDoc(clientsCollection, {
            ...data,
            createdAt: serverTimestamp()
        });

        await triggerRevalidation('/clientes');

        toast({
            title: 'Sucesso!',
            description: 'Novo cliente cadastrado.',
        });
        router.push('/clientes');
    } catch (error: any) {
        console.error("Error creating client:", error);
        toast({
            variant: 'destructive',
            title: 'Erro ao cadastrar cliente.',
            description: error.message || 'Ocorreu um erro desconhecido.',
        });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="nome"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome Completo *</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: João da Silva" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="telefone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefone (WhatsApp) *</FormLabel>
                <FormControl>
                  <Input placeholder="(99) 99999-9999" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex justify-end">
            <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : 'Salvar Cliente'}
            </Button>
        </div>
      </form>
    </Form>
  );
}
