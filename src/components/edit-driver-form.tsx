
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

type EditDriverFormValues = z.infer<typeof editDriverSchema>;

const COMPANY_ID = '1';

export function EditDriverForm({ driver }: { driver: Driver }) {
  const { toast } = useToast();
  const router = useRouter();
  const firestore = useFirestore();
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(
    driver.photoUrl
  );

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
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setPhotoPreview(dataUrl);
        form.setValue('photoUrl', dataUrl, { shouldValidate: true });
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

    try {
      const driverRef = doc(
        firestore,
        'companies',
        COMPANY_ID,
        'drivers',
        driver.id
      );

      await updateDoc(driverRef, data);

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
