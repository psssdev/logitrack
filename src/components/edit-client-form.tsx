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
import type { Client, Destino } from '@/lib/types';
import { useFirestore, useStore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

type EditClientFormValues = z.infer<typeof editClientSchema>;

export function EditClientForm({ client, destinos }: { client: Client, destinos: Destino[] }) {
  const { toast } = useToast();
  const router = useRouter();
  const firestore = useFirestore();
  const { selectedStore } = useStore();

  const form = useForm<EditClientFormValues>({
    resolver: zodResolver(editClientSchema),
    defaultValues: {
      nome: client.nome,
      telefone: client.telefone,
      defaultDestinoId: client.defaultDestinoId || '',
    },
  });

  async function onSubmit(data: EditClientFormValues) {
    if (!firestore || !selectedStore) {
      toast({
        variant: 'destructive',
        title: 'Erro de Conexão',
        description: 'Não foi possível ligar à base de dados. Por favor, tente novamente.',
      });
      return;
    }

    try {
      const clientRef = doc(
        firestore,
        'stores',
        selectedStore.id,
        'clients',
        client.id
      );
      await updateDoc(clientRef, {
          ...data,
          defaultDestinoId: data.defaultDestinoId || null,
      });

      await triggerRevalidation('/clientes');
      await triggerRevalidation(`/clientes/${client.id}`);
      await triggerRevalidation('/encomendas/nova');
      await triggerRevalidation('/vender-passagem');

      toast({
        title: 'Sucesso!',
        description: 'Os dados do cliente foram atualizados.',
      });
      router.push(`/clientes/${client.id}`);
    } catch (error: any) {
      console.error('Erro ao atualizar cliente:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao Atualizar Cliente',
        description: 'Não foi possível guardar as alterações. Por favor, verifique os dados e tente novamente.',
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
            name="defaultDestinoId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Destino Padrão</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Nenhum" />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        {destinos.map(destino => (
                            <SelectItem key={destino.id} value={destino.id}>{destino.name}</SelectItem>
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
