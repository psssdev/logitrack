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
import { createClient } from '@/lib/actions';
import { newClientSchema } from '@/lib/schemas';
import type { NewClient } from '@/lib/types';


export function NewClientForm() {
  const { toast } = useToast();
  const router = useRouter();
  const form = useForm<NewClient>({
    resolver: zodResolver(newClientSchema),
    defaultValues: {
      nome: '',
      telefone: '',
    },
  });

  async function onSubmit(data: NewClient) {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });

    const result = await createClient(formData);
    
    if (result?.message.includes('sucesso')) {
        toast({
            title: 'Sucesso!',
            description: 'Novo cliente cadastrado.',
        });
        router.push('/clientes');
    } else {
        toast({
            variant: 'destructive',
            title: 'Erro ao cadastrar cliente.',
            description: result?.message || 'Ocorreu um erro desconhecido.',
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
            {form.formState.isSubmitting ? 'Salvando...' : 'Salvar Cliente'}
            </Button>
        </div>
      </form>
    </Form>
  );
}
