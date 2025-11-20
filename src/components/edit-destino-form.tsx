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
import { newLocationSchema } from '@/lib/schemas';
import type { Destino } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';

type FormValues = z.infer<typeof newLocationSchema>;

export function EditDestinoForm({ destino }: { destino: Destino }) {
  const { toast } = useToast();
  const router = useRouter();
  const firestore = useFirestore();
  const { companyId } = useUser();

  const form = useForm<FormValues>({
    resolver: zodResolver(newLocationSchema),
    defaultValues: {
      name: destino.name,
      // Address parsing can be complex, simplifying for now
      logradouro: destino.address,
      numero: '',
      bairro: '',
      cidade: '',
      estado: '',
      cep: '',
    },
  });

  async function onSubmit(data: FormValues) {
    if (!firestore || !companyId) {
      toast({ variant: 'destructive', title: 'Erro de conexão' });
      return;
    }

    try {
      const destinoRef = doc(firestore, 'companies', companyId, 'destinos', destino.id);
      
      await updateDoc(destinoRef, {
        name: data.name,
        // address: fullAddress, // Logic for full address reconstruction needed if fields are editable
      });

      await triggerRevalidation('/destinos');
      await triggerRevalidation('/vender-passagem');

      toast({
        title: 'Sucesso!',
        description: 'Destino atualizado.',
      });
      router.push('/destinos');
    } catch (error: any) {
      console.error('Error updating destination:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar destino.',
        description: error.message || 'Ocorreu um erro desconhecido.',
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
              <FormLabel>Nome do Destino *</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Rodoviária de Campinas" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* Simplified form - only name can be changed for now */}
        <div className="flex justify-end">
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
