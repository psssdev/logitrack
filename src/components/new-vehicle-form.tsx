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
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
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

type NewVehicleFormValues = z.infer<typeof vehicleSchema>;

const defaultSeatLayout: SeatLayout = {
  upperDeck: {
    '0': ["U01", "U02", null, "U03", "U04"],
    '1': ["U05", "U06", null, "U07", "U08"],
    '2': ["U09", "U10", null, "U11", "U12"],
    '3': ["U13", "U14", null, "U15", "U16"],
    '4': ["U17", "U18", null, "U19", "U20"],
    '5': ["U21", "U22", null, "U23", "U24"],
    '6': ["U25", "U26", null, "U27", "U28"],
    '7': ["U29", "U30", null, "U31", "U32"],
    '8': ["U33", "U34", null, "U35", "U36"],
    '9': ["U37", "U38", null, "U39", "U40"],
    '10': ["U41", "U42", "U43", "U44", "U45"],
  },
  lowerDeck: {
    '0': ["L01", "L02", null, null, null],
    '1': ["L03", "L04", null, "L05", "L06"],
    '2': ["L07", "L08", null, "L09", "L10"],
  }
};

export function NewVehicleForm() {
  const { toast } = useToast();
  const router = useRouter();
  const firestore = useFirestore();
  const { user } = useUser();

  const form = useForm<NewVehicleFormValues>({
    resolver: zodResolver(vehicleSchema.omit({ id: true })),
    defaultValues: {
      placa: '',
      modelo: '',
      ano: new Date().getFullYear(),
      tipo: 'Carro',
      status: 'Ativo',
      seatLayout: JSON.stringify(defaultSeatLayout, null, 2),
      occupiedSeats: [],
    },
  });

  const vehicleType = form.watch('tipo');

  async function onSubmit(data: NewVehicleFormValues) {
    if (!firestore || !user) {
      toast({
        variant: 'destructive',
        title: 'Erro de conexão',
        description: 'Não foi possível conectar ao banco de dados.',
      });
      return;
    }

    let processedData: Partial<Vehicle> = { ...data };

    if (data.tipo === 'Ônibus') {
      try {
        const layout = JSON.parse(data.seatLayout || '{}');
        processedData.seatLayout = layout;
      } catch (error) {
        form.setError('seatLayout', { type: 'manual', message: 'Formato do JSON do mapa de assentos é inválido.'});
        return;
      }
    } else {
      delete processedData.seatLayout;
    }

    try {
      const vehiclesCollection = collection(firestore, 'vehicles');
      await addDoc(vehiclesCollection, {
        ...processedData,
        placa: data.placa.toUpperCase(),
        createdAt: serverTimestamp(),
      });

      await triggerRevalidation('/veiculos');

      toast({
        title: 'Sucesso!',
        description: 'Novo veículo cadastrado.',
      });
      router.push('/veiculos');
    } catch (error: any) {
      console.error('Error creating vehicle:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao cadastrar veículo.',
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


        <div className="flex justify-end pt-4">
          <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? (
              <Loader2 className="animate-spin" />
            ) : (
              'Salvar Veículo'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
