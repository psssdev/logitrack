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
import { newDriverSchema } from '@/lib/schemas';
import type { NewDriver } from '@/lib/types';
import { useFirestore, useUser } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

const COMPANY_ID = '1';

export function NewDriverForm() {
  const { toast } = useToast();
  const router = useRouter();
  const firestore = useFirestore();
  const { user } = useUser();

  const form = useForm<NewDriver>({
    resolver: zodResolver(newDriverSchema),
    defaultValues: {
      nome: '',
      telefone: '',
      placa: '',
    },
  });

  async function onSubmit(data: NewDriver) {
    if (!firestore || !user) {
      toast({
        variant: 'destructive',
        title: 'Erro de Autenticação',
        description: 'Você precisa estar logado para criar um motorista.',
      });
      return;
    }

    try {
      const driversCollection = collection(
        firestore,
        'companies',
        COMPANY_ID,
        'drivers'
      );

      await addDoc(driversCollection, {
        ...data,
        companyId: COMPANY_ID,
        ativo: true,
        createdAt: serverTimestamp(),
      });

      await triggerRevalidation('/motoristas');
      await triggerRevalidation('/encomendas/nova');

      toast({
        title: 'Sucesso!',
        description: 'Novo motorista cadastrado.',
      });
      router.push('/motoristas');
    } catch (error: any) {
      console.error('Error creating driver:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao cadastrar motorista.',
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
                  <Input placeholder="Ex: Carlos Alberto" {...field} />
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
          name="placa"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Placa do Veículo</FormLabel>
              <FormControl>
                <Input placeholder="ABC-1234 ou ABC1D23" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
           <Button type="button" variant="ghost" asChild>
            <Link href="/motoristas">
              Cancelar
            </Link>
          </Button>
          <Button
            type="submit"
            size="lg"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? (
              <Loader2 className="animate-spin" />
            ) : (
              'Salvar Motorista'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
