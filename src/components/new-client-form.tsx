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
import { newClientSchema, newLocationSchema } from '@/lib/schemas';
import type { NewClient, Origin, Destino, NewLocation } from '@/lib/types';
import { useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Loader2, PlusCircle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

function AddLocationDialog({
  locationType,
  onLocationCreated,
}: {
  locationType: 'origem' | 'destino';
  onLocationCreated: (newLocation: Origin | Destino) => void;
}) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isOpen, setIsOpen] = React.useState(false);

  const form = useForm<NewLocation>({
    resolver: zodResolver(newLocationSchema),
    defaultValues: { name: '', logradouro: '', numero: '', bairro: '', cidade: '', estado: '', cep: '' },
  });

  async function onSubmit(data: NewLocation) {
    if (!firestore) return;

    try {
      const collectionName = locationType === 'destino' ? 'destinos' : 'origins';
      const collectionRef = collection(firestore, collectionName);
      const { logradouro, numero, bairro, cidade, estado, cep } = data;
      const fullAddress = `${logradouro}, ${numero}, ${bairro}, ${cidade} - ${estado}, ${cep}`;

      const newDocRef = await addDoc(collectionRef, {
        name: data.name,
        address: fullAddress,
        city: data.cidade,
        active: true,
        createdAt: serverTimestamp(),
      });

      toast({ title: 'Sucesso!', description: `Novo ${locationType} criado.` });

      const newLocation = {
        id: newDocRef.id,
        name: data.name,
        address: fullAddress,
        createdAt: new Date(),
        lat: data.lat ?? 0,
        lng: data.lng ?? 0,
        city: data.cidade ?? '',
      } as Origin | Destino;

      onLocationCreated(newLocation);

      setIsOpen(false);
      form.reset();
      await triggerRevalidation('/vender-passagem');
      await triggerRevalidation('/clientes/novo');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao criar', description: error.message });
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <PlusCircle className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo {locationType === 'destino' ? 'Destino' : 'Origem'}</DialogTitle>
          <DialogDescription>
            Crie um novo ponto de {locationType} rapidamente.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Local</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Rodoviária de SP" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function NewClientForm({
  origins: initialOrigins,
  destinos: initialDestinos,
}: {
  origins: Origin[];
  destinos: Destino[];
}) {
  const { toast } = useToast();
  const router = useRouter();
  const firestore = useFirestore();

  const [liveOrigins, setLiveOrigins] = React.useState(initialOrigins);
  const [liveDestinos, setLiveDestinos] = React.useState(initialDestinos);

  const form = useForm<NewClient>({
    resolver: zodResolver(newClientSchema),
    defaultValues: {
      nome: '',
      telefone: '',
      defaultOriginId: '',
      defaultDestinoId: '',
    },
  });

  const onOriginCreated = (newLocation: Origin | Destino) => {
    setLiveOrigins((prev) => [...prev, newLocation as Origin]);
    form.setValue('defaultOriginId', newLocation.id);
  };

  const onDestinoCreated = (newLocation: Origin | Destino) => {
    setLiveDestinos((prev) => [...prev, newLocation as Destino]);
    form.setValue('defaultDestinoId', newLocation.id);
  };

  async function onSubmit(data: NewClient) {
    if (!firestore) {
      toast({
        variant: 'destructive',
        title: 'Erro de conexão',
        description: 'Não foi possível conectar ao banco de dados.',
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
        createdAt: serverTimestamp(),
      });

      await triggerRevalidation('/clientes');

      toast({
        title: 'Sucesso!',
        description: 'Novo cliente cadastrado.',
      });
      router.push('/clientes');
    } catch (error: any) {
      console.error('Error creating client:', error);
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
                <div className="flex gap-2">
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Nenhuma" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {liveOrigins.map((origin) => (
                        <SelectItem key={origin.id} value={origin.id}>
                          {origin.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <AddLocationDialog
                    locationType="origem"
                    onLocationCreated={onOriginCreated}
                  />
                </div>
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
                <div className="flex gap-2">
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Nenhum" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {liveDestinos.map((destino) => (
                        <SelectItem key={destino.id} value={destino.id}>
                          {destino.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <AddLocationDialog
                    locationType="destino"
                    onLocationCreated={onDestinoCreated}
                  />
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end pt-4">
          <Button
            type="submit"
            size="lg"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? (
              <Loader2 className="animate-spin" />
            ) : (
              'Salvar Cliente'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
