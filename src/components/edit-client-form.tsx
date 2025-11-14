'use client';

import * as React from 'react';
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
import { editClientSchema } from '@/lib/schemas';
import type { Client, Origin } from '@/lib/types';
import { useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

type EditClientFormValues = z.infer<typeof editClientSchema>;

const COMPANY_ID = '1';

export function EditClientForm({ client, origins }: { client: Client, origins: Origin[] }) {
  const { toast } = useToast();
  const router = useRouter();
  const firestore = useFirestore();

  const form = useForm<EditClientFormValues>({
    resolver: zodResolver(editClientSchema),
    defaultValues: {
      nome: client.nome,
      telefone: client.telefone,
      defaultOriginId: client.defaultOriginId || '',
    },
  });

  async function onSubmit(data: EditClientFormValues) {
    if (!firestore) {
      toast({
        variant: 'destructive',
        title: 'Erro de conexão',
        description: 'Não foi possível conectar ao banco de dados.',
      });
      return;
    }

    try {
      const clientRef = doc(
        firestore,
        'companies',
        COMPANY_ID,
        'clients',
        client.id
      );
      await updateDoc(clientRef, {
          ...data,
          defaultOriginId: data.defaultOriginId || null,
      });

      await triggerRevalidation('/clientes');
      await triggerRevalidation(`/clientes/${client.id}`);
      await triggerRevalidation('/encomendas/nova');

      toast({
        title: 'Sucesso!',
        description: 'Dados do cliente atualizados.',
      });
      router.push(`/clientes/${client.id}`);
    } catch (error: any) {
      console.error('Error updating client:', error);
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
         <FormField
            control={form.control}
            name="defaultOriginId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Origem Padrão</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Selecione a origem mais conveniente" />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="">Nenhuma</SelectItem>
                        {origins.map(origin => (
                            <SelectItem key={origin.id} value={origin.id}>{origin.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                 <FormMessage />
              </FormItem>
            )}
          />

        <div className="flex justify-end pt-4">
          <Button
            type="submit"
            size="lg"
            disabled={form.formState.isSubmitting}
          >
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
