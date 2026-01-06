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
import type { Origin } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { useStore } from '@/contexts/store-context';
import { doc, updateDoc } from 'firebase/firestore';
import { z } from 'zod';

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

export function EditOriginForm({ origin }: { origin: Origin }) {
  const { toast } = useToast();
  const router = useRouter();
  const firestore = useFirestore();
  const { user } = useUser();
  const { selectedStore } = useStore();

  const form = useForm<FormValues>({
    resolver: zodResolver(newLocationSchema),
    defaultValues: {
      name: origin.name,
      ...parseFullAddress(origin.address),
      lat: origin.lat,
      lng: origin.lng,
    },
  });

  async function onSubmit(data: FormValues) {
    if (!firestore || !user) {
      toast({ variant: 'destructive', title: 'Erro de conexão' });
      return;
    }

    try {
      if (!selectedStore) throw new Error("Loja não selecionada");
      const originRef = doc(firestore, 'stores', selectedStore.id, 'origins', origin.id);
      const { logradouro, numero, bairro, cidade, estado, cep } = data;
      const fullAddress = `${logradouro}, ${numero}, ${bairro}, ${cidade} - ${estado}, ${cep}`;

      await updateDoc(originRef, {
        name: data.name,
        address: fullAddress,
        lat: data.lat,
        lng: data.lng,
      });

      await triggerRevalidation('/origens');
      await triggerRevalidation('/vender-passagem');

      toast({
        title: 'Sucesso!',
        description: 'Origem atualizada.',
      });
      router.push('/origens');
    } catch (error: any) {
      console.error('Error updating origin:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar origem.',
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
              <FormLabel>Nome da Origem *</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Garagem Principal" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* Full address editing is complex, for now only name, lat, lng */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="lat"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Latitude</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="-19.0187" {...field} onChange={e => field.onChange(e.target.valueAsNumber)} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lng"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Longitude</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="-40.5363" {...field} onChange={e => field.onChange(e.target.valueAsNumber)} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
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
