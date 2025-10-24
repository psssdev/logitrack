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
      logradouro: '',
      numero: '',
      bairro: '',
      cidade: '',
      estado: '',
      cep: '',
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
            <FormField
            control={form.control}
            name="logradouro"
            render={({ field }) => (
                <FormItem className='md:col-span-4'>
                <FormLabel>Logradouro *</FormLabel>
                <FormControl>
                    <Input placeholder="Rua, Avenida, etc." {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
             <FormField
            control={form.control}
            name="numero"
            render={({ field }) => (
                <FormItem className='md:col-span-2'>
                <FormLabel>Número *</FormLabel>
                <FormControl>
                    <Input placeholder="123" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
         <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
            control={form.control}
            name="bairro"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Bairro *</FormLabel>
                <FormControl>
                    <Input placeholder="Centro" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="cep"
            render={({ field }) => (
                <FormItem>
                <FormLabel>CEP *</FormLabel>
                <FormControl>
                    <Input placeholder="00000-000" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
            <FormField
            control={form.control}
            name="cidade"
            render={({ field }) => (
                <FormItem className='md:col-span-4'>
                <FormLabel>Cidade *</FormLabel>
                <FormControl>
                    <Input placeholder="São Paulo" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="estado"
            render={({ field }) => (
                <FormItem className='md:col-span-2'>
                <FormLabel>Estado (UF) *</FormLabel>
                <FormControl>
                    <Input placeholder="SP" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        
        <div className="flex justify-end">
          <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Salvando...' : 'Salvar Origem'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
