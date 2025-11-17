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
import { useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';

const COMPANY_ID = '1';

// Helper to parse the full address
const parseFullAddress = (fullAddress: string) => {
    const parts = fullAddress.split(',').map(p => p.trim());
    if (parts.length >= 5) {
        const [logradouro, numero, bairro, cidade, estadoCep] = parts;
        const [estado, cep] = estadoCep.split(' - ');
        return { logradouro, numero, bairro, cidade, estado, cep };
    }
    // Fallback for simple addresses
    return {
        logradouro: fullAddress,
        numero: '',
        bairro: '',
        cidade: '',
        estado: '',
        cep: '',
    };
};

type FormValues = z.infer<typeof newLocationSchema>;

export function EditDestinoForm({ destino }: { destino: Destino }) {
  const { toast } = useToast();
  const router = useRouter();
  const firestore = useFirestore();

  const form = useForm<FormValues>({
    resolver: zodResolver(newLocationSchema),
    defaultValues: {
      name: destino.name,
      ...parseFullAddress(destino.address),
    },
  });

  async function onSubmit(data: FormValues) {
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Erro de conexão' });
      return;
    }

    try {
      const destinoRef = doc(firestore, 'companies', COMPANY_ID, 'destinos', destino.id);
      const { logradouro, numero, bairro, cidade, estado, cep } = data;
      const fullAddress = `${logradouro}, ${numero}, ${bairro}, ${cidade} - ${estado}, ${cep}`;

      await updateDoc(destinoRef, {
        name: data.name,
        address: fullAddress,
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
