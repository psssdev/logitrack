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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { createOrigin } from '@/lib/actions';
import { newOriginSchema } from '@/lib/schemas';
import type { NewOrigin } from '@/lib/types';

export function NewOriginForm() {
  const { toast } = useToast();
  const router = useRouter();
  const form = useForm<NewOrigin>({
    resolver: zodResolver(newOriginSchema),
    defaultValues: {
      name: '',
      address: '',
    },
  });

  async function onSubmit(data: NewOrigin) {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      formData.append(key, String(value));
    });

    const result = await createOrigin(formData);

    if (result?.message.includes('sucesso')) {
      toast({
        title: 'Sucesso!',
        description: 'Nova origem cadastrada.',
      });
      router.push('/origens');
    } else {
      toast({
        variant: 'destructive',
        title: 'Erro ao cadastrar origem.',
        description: result?.message || 'Ocorreu um erro desconhecido.',
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome da Origem *</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Matriz, Centro de Distribuição SP" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Endereço Completo *</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Rua, Número, Bairro, Cidade, Estado, CEP"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end">
          <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Salvando...' : 'Salvar Origem'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
