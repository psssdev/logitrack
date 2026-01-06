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
import { vehicleSchema } from '@/lib/schemas';
import { useFirestore, useUser } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Textarea } from './ui/textarea';
import type { Vehicle, SeatLayout } from '@/lib/types';
import Link from 'next/link';

type EditVehicleFormValues = z.infer<typeof vehicleSchema>;

export function EditVehicleForm({ vehicle }: { vehicle: Vehicle }) {
  const { toast } = useToast();
  const router = useRouter();
  const firestore = useFirestore();
  const { user } = useUser();

  const form = useForm<EditVehicleFormValues>({
    resolver: zodResolver(vehicleSchema.omit({ id: true })),
    defaultValues: {
      placa: vehicle.placa,
      modelo: vehicle.modelo,
      ano: vehicle.ano,
      tipo: vehicle.tipo,
      status: vehicle.status,
      seatLayout: vehicle.seatLayout ? JSON.stringify(vehicle.seatLayout, null, 2) : '',
      occupiedSeats: vehicle.occupiedSeats || [],
    },
  });

  const vehicleType = form.watch('tipo');

  async function onSubmit(data: EditVehicleFormValues) {
    if (!firestore || !user) {
      toast({
        variant: 'destructive',
        title: 'Erro de Conexão',
        description: 'Não foi possível ligar à base de dados. Por favor, tente novamente.',
      });
      return;
    }

    let processedData: Partial<Vehicle> = { ...data };

    if (data.tipo === 'Ônibus') {
      try {
        const layout = JSON.parse(data.seatLayout || '{}');
        processedData.seatLayout = layout;
      } catch (error) {
        form.setError('seatLayout', { type: 'manual', message: 'O formato do JSON do mapa de assentos é inválido.' });
        return;
      }
    } else {
      delete processedData.seatLayout;
    }

    try {
      const vehicleRef = doc(firestore, 'vehicles', vehicle.id);
      await updateDoc(vehicleRef, {
        ...processedData,
        placa: data.placa.toUpperCase(),
      });

      await triggerRevalidation('/veiculos');
      await triggerRevalidation(`/veiculos/${vehicle.id}`);

      toast({
        title: 'Sucesso!',
        description: 'Os dados do veículo foram atualizados.',
      });
      router.push(`/veiculos/${vehicle.id}`);
    } catch (error: any) {
      console.error('Erro ao atualizar veículo:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao Atualizar Veículo',
        description: 'Não foi possível guardar as alterações. Verifique os dados e tente novamente.',
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="placa"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Placa *</FormLabel>
                <FormControl>
                  <Input placeholder="ABC1D23" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="modelo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Modelo *</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Fiat Uno" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <FormField
            control={form.control}
            name="ano"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ano *</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="2024" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="tipo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Ônibus">Ônibus</SelectItem>
                    <SelectItem value="Van">Van</SelectItem>
                    <SelectItem value="Carro">Carro</SelectItem>
                    <SelectItem value="Caminhão">Caminhão</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Inativo">Inativo</SelectItem>
                    <SelectItem value="Em Manutenção">Em Manutenção</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {vehicleType === 'Ônibus' && (
          <FormField
            control={form.control}
            name="seatLayout"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Configuração dos Assentos (JSON)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder='Cole aqui o JSON da configuração dos assentos...'
                    className="min-h-[200px] font-mono text-xs"
                    {...field}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="ghost" asChild>
                <Link href={`/veiculos/${vehicle.id}`}>Cancelar</Link>
            </Button>
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
