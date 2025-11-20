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
import { useFirestore, useUser } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Loader2, UploadCloud, X } from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { uploadFile } from '@/lib/storage';

export function NewDriverForm() {
  const { toast } = useToast();
  const router = useRouter();
  const firestore = useFirestore();
  const { user, companyId } = useUser();
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(null);
  const [photoFile, setPhotoFile] = React.useState<File | null>(null);

  const form = useForm<NewDriver>({
    resolver: zodResolver(newDriverSchema),
    defaultValues: {
      nome: '',
      telefone: '',
      photoUrl: '',
    },
  });

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
    if (!firestore || !user || !companyId) {
      toast({
        variant: 'destructive',
        title: 'Erro de Autenticação',
        description: 'Você precisa estar logado para criar um motorista.',
      });
      return;
    }

    form.formState.isSubmitting = true;

    try {
      let uploadedPhotoUrl = '';
      if (photoFile) {
        toast({ description: 'Fazendo upload da foto...' });
        uploadedPhotoUrl = await uploadFile(
          photoFile,
          `companies/${companyId}/driver_photos`
        );
      }

      const driversCollection = collection(
        firestore,
        'companies',
        companyId,
        'drivers'
      );

      await addDoc(driversCollection, {
        ...data,
        photoUrl: uploadedPhotoUrl,
        companyId: companyId,
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
    } finally {
        form.formState.isSubmitting = false;
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
