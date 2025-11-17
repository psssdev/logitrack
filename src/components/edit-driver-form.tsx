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
import { editDriverSchema } from '@/lib/schemas';
import type { Driver } from '@/lib/types';
import { useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Loader2, UploadCloud, X } from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { uploadFile } from '@/lib/storage';

type EditDriverFormValues = z.infer<typeof editDriverSchema>;

const COMPANY_ID = '1';

export function EditDriverForm({ driver }: { driver: Driver }) {
  const { toast } = useToast();
  const router = useRouter();
  const firestore = useFirestore();
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(
    driver.photoUrl
  );
  const [photoFile, setPhotoFile] = React.useState<File | null>(null);

  const form = useForm<EditDriverFormValues>({
    resolver: zodResolver(editDriverSchema),
    defaultValues: {
      nome: driver.nome,
      telefone: driver.telefone,
      photoUrl: driver.photoUrl,
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

  async function onSubmit(data: EditDriverFormValues) {
    if (!firestore) {
      toast({
        variant: 'destructive',
        title: 'Erro de conexão',
      });
      return;
    }
    
    form.formState.isSubmitting = true;

    try {
      let uploadedPhotoUrl = data.photoUrl;

      if (photoFile) {
        toast({ description: 'Atualizando foto...' });
        uploadedPhotoUrl = await uploadFile(
          photoFile,
          `companies/${COMPANY_ID}/driver_photos`
        );
      }
      
      const driverRef = doc(
        firestore,
        'companies',
        COMPANY_ID,
        'drivers',
        driver.id
      );

      await updateDoc(driverRef, {
        ...data,
        photoUrl: uploadedPhotoUrl,
      });

      await triggerRevalidation('/motoristas');
      await triggerRevalidation(`/motoristas/${driver.id}`);

      toast({
        title: 'Sucesso!',
        description: 'Dados do motorista atualizados.',
      });
      router.push(`/motoristas/${driver.id}`);
    } catch (error: any) {
      console.error('Error updating driver:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar motorista.',
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
                  <AvatarImage
                    src={photoPreview || undefined}
                    className="object-cover"
                  />
                  <AvatarFallback className="text-muted-foreground">
                    <UploadCloud size={32} />
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-2">
                  <Button asChild variant="outline">
                    <label
                      htmlFor="photo-upload"
                      className="cursor-pointer"
                    >
                      <UploadCloud className="mr-2" />
                      Alterar Foto
                    </label>
                  </Button>
                  <Input
                    id="photo-upload"
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handlePhotoChange}
                  />
                  {photoPreview && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setPhotoPreview(null);
                        setPhotoFile(null);
                        form.setValue('photoUrl', null);
                      }}
                    >
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
            <Link href={`/motoristas/${driver.id}`}>Cancelar</Link>
          </Button>
          <Button
            type="submit"
            size="lg"
            disabled={form.formState.isSubmitting}
          >
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