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
import { newDriverSchema } from '@/lib/schemas';
import type { NewDriver } from '@/lib/types';
import { useFirestore } from '@/firebase';
import { useStore } from '@/contexts/store-context';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Loader2, UploadCloud, X } from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { uploadFile } from '@/lib/storage';

export function NewDriverForm() {
  const { toast } = useToast();
  const router = useRouter();
  const firestore = useFirestore();
  const { selectedStore } = useStore();
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(null);
  const [photoFile, setPhotoFile] = React.useState<File | null>(null);

  const form = useForm<NewDriver>({
    resolver: zodResolver(newDriverSchema),
    defaultValues: {
      storeId: selectedStore?.id || '',
      nome: '',
      telefone: '',
      photoUrl: '',
    },
  });

  React.useEffect(() => {
    if (selectedStore?.id) {
        form.setValue('storeId', selectedStore.id);
    }
  }, [selectedStore, form]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  async function onSubmit(data: NewDriver) {
    if (!firestore || !selectedStore) {
      toast({
        variant: 'destructive',
        title: 'Erro de Conexão',
        description: 'Não foi possível ligar à base de dados. Por favor, tente novamente.',
      });
      return;
    }

    try {
      let uploadedPhotoUrl = '';
      if (photoFile) {
        toast({ description: 'A carregar a foto...' });
        uploadedPhotoUrl = await uploadFile(
          photoFile,
          `driver_photos`
        );
      }

      const driversCollection = collection(firestore, 'stores', selectedStore.id, 'drivers');

      await addDoc(driversCollection, {
        ...data,
        photoUrl: uploadedPhotoUrl,
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
      console.error('Erro ao criar motorista:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao Cadastrar Motorista',
        description: 'Não foi possível registar o motorista. Verifique os dados e tente novamente.',
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
        <FormField
          control={form.control}
          name="photoUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Foto do Motorista</FormLabel>
              <div className="flex items-center gap-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={photoPreview || undefined} className="object-cover" />
                  <AvatarFallback className="text-muted-foreground">
                    <UploadCloud size={32} />
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-2">
                   <Button asChild variant="outline">
                        <label htmlFor="photo-upload" className="cursor-pointer">
                           <UploadCloud className="mr-2" /> 
                           Carregar Foto
                        </label>
                    </Button>
                    <Input id="photo-upload" type="file" className="hidden" accept="image/*" onChange={handlePhotoChange} />
                    {photoPreview && (
                        <Button variant="ghost" size="sm" onClick={() => { setPhotoPreview(null); setPhotoFile(null); form.setValue('photoUrl', '')}}>
                            <X className="mr-2" />
                            Remover
                        </Button>
                    )}
                </div>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
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
