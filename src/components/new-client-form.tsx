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
import { newClientSchema } from '@/lib/schemas';
import type { NewClient, Origin, Destino } from '@/lib/types';
import { useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

export function NewClientForm({ origins, destinos }: { origins: Origin[], destinos: Destino[] }) {
  const { toast } = useToast();
  const router = useRouter();
  const firestore = useFirestore();

  const form = useForm<NewClient>({
    resolver: zodResolver(newClientSchema),
    defaultValues: {
      nome: '',
      telefone: '',
      defaultOriginId: '',
      defaultDestinoId: '',
    },
  });

  async function onSubmit(data: NewClient) {
    if (!firestore) {
        toast({
            variant: 'destructive',
            title: 'Erro de conexão',
            description: 'Não foi possível conectar ao banco de dados.'
        });
        return;
    }

    try {
        const newClientRef = collection(firestore, 'clients');
        await addDoc(newClientRef, {
            nome: data.nome,
            telefone: data.telefone,
            defaultOriginId: data.defaultOriginId || null,
            defaultDestinoId: data.defaultDestinoId || null,
            createdAt: serverTimestamp()
        });
        
        await triggerRevalidation('/clientes');

        toast({
            title: 'Sucesso!',
            description: 'Novo cliente cadastrado.',
        });
        router.push('/clientes');
    } catch (error: any) {
        console.error("Error creating client:", error);
        toast({
            variant: 'destructive',
            title: 'Erro ao cadastrar cliente.',
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
                  <Input placeholder="Ex: João da Silva" {...field} />
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

        <div className="grid gap-4 md:grid-cols-2">
            <FormField
                control={form.control}
                name="defaultOriginId"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Origem Padrão</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Nenhuma" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="">Nenhuma</SelectItem>
                            {origins.map(origin => (
                                <SelectItem key={origin.id} value={origin.id}>{origin.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="defaultDestinoId"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Destino Padrão</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Nenhum" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="">Nenhum</SelectItem>
                            {destinos.map(destino => (
                                <SelectItem key={destino.id} value={destino.id}>{destino.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
                )}
            />
        </div>
        

        <div className="flex justify-end pt-4">
            <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : 'Salvar Cliente'}
            </Button>
        </div>
      </form>
    </Form>
  );
}
