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
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { triggerRevalidation } from '@/lib/actions';
import { useFirestore } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import type { Company } from '@/lib/types';
import { z } from 'zod';

const companySchema = z.object({
  nomeFantasia: z.string().min(1, 'O nome fantasia é obrigatório.'),
  codigoPrefixo: z.string().min(2, 'O prefixo deve ter pelo menos 2 caracteres.').max(5, 'O prefixo deve ter no máximo 5 caracteres.'),
  linkBaseRastreio: z.string().url('A URL base de rastreio deve ser um link válido.'),
  msgCobranca: z.string().optional(),
  msgRecebido: z.string().optional(),
});

type CompanyFormValues = z.infer<typeof companySchema>;

export function CompanySettingsForm({ company }: { company: Company | null }) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      nomeFantasia: company?.nomeFantasia || '',
      codigoPrefixo: company?.codigoPrefixo || 'TR',
      linkBaseRastreio: company?.linkBaseRastreio || 'https://seusite.com/rastreio/',
      msgCobranca: company?.msgCobranca || 'Olá {cliente}, tudo bem? Verificamos que há uma pendência de {valor} referente a {quantidade} encomenda(s). Poderia nos dar um retorno sobre o pagamento? Obrigado!',
      msgRecebido: company?.msgRecebido || 'Olá {cliente}! Recebemos sua encomenda de {volumes} volume(s) com o código {codigo}. O valor da entrega é de {valor}. Acompanhe em: {link}',
    },
  });

  async function onSubmit(data: CompanyFormValues) {
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Erro de Conexão' });
      return;
    }

    try {
      const companyRef = doc(firestore, 'companies', '1'); // Hardcoded ID for single company setup
      
      const dataToSave = {
        ...data,
        updatedAt: serverTimestamp(),
        // Add createdAt only if it's a new document
        ...(!company && { createdAt: serverTimestamp() }),
      };

      await setDoc(companyRef, dataToSave, { merge: true });
      await triggerRevalidation('/configuracoes');

      toast({
        title: 'Sucesso!',
        description: 'As configurações da empresa foram salvas.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao Salvar',
        description: 'Não foi possível salvar as configurações.',
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <FormField
            control={form.control}
            name="nomeFantasia"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Nome Fantasia</FormLabel>
                <FormControl><Input placeholder="O nome da sua transportadora" {...field} /></FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="codigoPrefixo"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Prefixo do Rastreio</FormLabel>
                <FormControl><Input placeholder="TR" {...field} /></FormControl>
                 <FormDescription>Prefixo usado nos códigos de rastreio (ex: TR-12345).</FormDescription>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        
         <FormField
            control={form.control}
            name="linkBaseRastreio"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Link Base para Rastreio</FormLabel>
                <FormControl><Input placeholder="https://seusite.com/rastreio/" {...field} /></FormControl>
                <FormDescription>O código de rastreio será adicionado no final deste link.</FormDescription>
                <FormMessage />
                </FormItem>
            )}
         />

        <FormField
          control={form.control}
          name="msgRecebido"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mensagem de Encomenda Recebida</FormLabel>
              <FormControl><Textarea className="min-h-[100px]" {...field} /></FormControl>
              <FormDescription>
                Variáveis disponíveis: `'{'{cliente}'}'`, `'{'{volumes}'}'`, `'{'{codigo}'}'`, `'{'{valor}'}'`, `'{'{link}'}'`.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="msgCobranca"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mensagem de Cobrança</FormLabel>
              <FormControl><Textarea className="min-h-[100px]" {...field} /></FormControl>
              <FormDescription>
                Variáveis disponíveis: `'{'{cliente}'}'`, `'{'{valor}'}'`, `'{'{quantidade}'}'`.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Loader2 className="mr-2 animate-spin" />}
            Salvar Configurações
          </Button>
        </div>
      </form>
    </Form>
  );
}
