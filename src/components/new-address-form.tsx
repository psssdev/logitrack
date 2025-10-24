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
import { createAddress } from '@/lib/actions';
import { newAddressSchema } from '@/lib/schemas';
import type { NewAddress } from '@/lib/types';


export function NewAddressForm({ clientId }: { clientId: string }) {
  const { toast } = useToast();
  const router = useRouter();
  const form = useForm<NewAddress>({
    resolver: zodResolver(newAddressSchema),
    defaultValues: {
      clientId,
      label: '',
      fullAddress: '',
    },
  });

  async function onSubmit(data: NewAddress) {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });

    const result = await createAddress(formData);
    
    if (result?.message.includes('sucesso')) {
        toast({
            title: 'Sucesso!',
            description: 'Novo endereço cadastrado.',
        });
        router.push(`/clientes/${clientId}`);
    } else {
        toast({
            variant: 'destructive',
            title: 'Erro ao cadastrar endereço.',
            description: result?.message || 'Ocorreu um erro desconhecido.',
        });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
        <FormField
          control={form.control}
          name="label"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rótulo *</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Casa, Trabalho, Ponto de Coleta" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="fullAddress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Endereço Completo *</FormLabel>
              <FormControl>
                <Textarea placeholder="Rua, Número, Bairro, Cidade, Estado, CEP" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end">
            <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Salvando...' : 'Salvar Endereço'}
            </Button>
        </div>
      </form>
    </Form>
  );
}
