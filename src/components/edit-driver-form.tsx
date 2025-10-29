
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
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
import type { Driver, NewDriver } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { Switch } from './ui/switch';
import { useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';

const COMPANY_ID = '1';

export function EditDriverForm({ driver }: { driver: Driver }) {
  const { toast } = useToast();
  const router = useRouter();
  const firestore = useFirestore();

  const form = useForm<NewDriver>({
    resolver: zodResolver(newDriverSchema),
    defaultValues: {
      nome: driver.nome || '',
      telefone: driver.telefone || '',
      placa: driver.placa || '',
      ativo: driver.ativo ?? true,
    },
  });

  async function onSubmit(data: NewDriver) {
    if (!firestore) {
      toast({
        variant: 'destructive',
        title: 'Erro de conexão',
        description: 'Não foi possível conectar ao banco de dados.',
      });
      return;
    }

    try {
      const driverRef = doc(firestore, 'companies', COMPANY_ID, 'drivers', driver.id);
      await updateDoc(driverRef, data);

      await triggerRevalidation('/motoristas');
      await triggerRevalidation(`/motoristas/${driver.id}`);
      await triggerRevalidation('/encomendas/nova');
      await triggerRevalidation('/avisame');
      await triggerRevalidation('/relatorios');

      toast({
        title: 'Sucesso!',
        description: 'Dados do motorista atualizados.',
      });
      router.push('/motoristas');
    } catch (error: any) {
      console.error("Error updating driver:", error);
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar motorista.',
        description: error.message || 'Ocorreu um erro desconhecido.',
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="placa"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Placa do Veículo (Opcional)</FormLabel>
                <FormControl>
                  <Input placeholder="ABC-1234" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="ativo"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Motorista Ativo</FormLabel>
                  <FormDescription>
                    Desative para que ele não apareça nas listas de seleção.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end pt-4">
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
