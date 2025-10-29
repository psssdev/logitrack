
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
import type { Client, NewClient } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';

const COMPANY_ID = '1';

// We only need a subset for the client edit form
const clientEditSchema = newClientSchema.pick({ nome: true, telefone: true });

export function EditClientForm({ client }: { client: Client }) {
  const { toast } = useToast();
  const router = useRouter();
  const firestore = useFirestore();

  const form = useForm<Pick<NewClient, 'nome' | 'telefone'>>({
    resolver: zodResolver(clientEditSchema),
    defaultValues: {
      nome: client.nome || '',
      telefone: client.telefone || '',
    },
  });

  async function onSubmit(data: Pick<NewClient, 'nome' | 'telefone'>) {
    if (!firestore) {
      toast({
        variant: 'destructive',
        title: 'Erro de conexão',
      });
      return;
    }

    try {
      const clientRef = doc(firestore, 'companies', COMPANY_ID, 'clients', client.id);
      await updateDoc(clientRef, data);

      await triggerRevalidation('/clientes');
      await triggerRevalidation(`/clientes/${client.id}`);
      
      toast({
        title: 'Sucesso!',
        description: 'Dados do cliente atualizados.',
      });
      router.push(`/clientes/${client.id}`);
    } catch (error: any) {
      console.error("Error updating client:", error);
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar cliente.',
        description: error.message || 'Ocorreu um erro desconhecido.',
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

        <div className="flex justify-end pt-4">
          <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? (
              <Loader2 className="animate-spin" />
            ) : (
              'Salvar Alterações'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
