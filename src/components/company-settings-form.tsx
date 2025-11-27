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
import { Loader2, Search } from 'lucide-react';
import type { Company } from '@/lib/types';
import { companySchema } from '@/lib/schemas';

type CompanyFormValues = z.infer<typeof companySchema>;

export function CompanySettingsForm({ company }: { company: Company | null }) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isFetchingCnpj, setIsFetchingCnpj] = React.useState(false);

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      nomeFantasia: company?.nomeFantasia || '',
      razaoSocial: company?.razaoSocial || '',
      cnpj: company?.cnpj || '',
      endereco: company?.endereco || '',
      telefone: company?.telefone || '',
      codigoPrefixo: company?.codigoPrefixo || 'TR',
      linkBaseRastreio: company?.linkBaseRastreio || 'https://seusite.com/rastreio/',
      msgCobranca: company?.msgCobranca || 'Olá {cliente}, tudo bem? Verificamos que há uma pendência de {valor} referente a {quantidade} encomenda(s). Poderia nos dar um retorno sobre o pagamento? Obrigado!',
      msgRecebido: company?.msgRecebido || 'Olá {cliente}! Recebemos sua encomenda de {volumes} volume(s) com o código {codigo}. O valor da entrega é de {valor}. Acompanhe em: {link}',
      msgAvisame: company?.msgAvisame || 'Olá {nome}, estamos na sua cidade ({cidade}) para realizar a entrega da sua encomenda {codigo} hoje. Fique atento!',
      msgEmRota: company?.msgEmRota || 'Olá {cliente}! Sua encomenda {codigo} saiu para entrega. Acompanhe em: {link}',
    },
  });

  const handleCnpjSearch = async () => {
    const cnpj = form.getValues('cnpj').replace(/\D/g, '');
    if (cnpj.length !== 14) {
      toast({
        variant: 'destructive',
        title: 'CNPJ Inválido',
        description: 'Por favor, digite um CNPJ válido com 14 dígitos.',
      });
      return;
    }

    setIsFetchingCnpj(true);
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
      if (!response.ok) {
        throw new Error('Não foi possível encontrar o CNPJ. Verifique o número e tente novamente.');
      }
      const data = await response.json();

      form.setValue('razaoSocial', data.razao_social || '', { shouldValidate: true });
      form.setValue('nomeFantasia', data.nome_fantasia || '', { shouldValidate: true });
      
      const address = `${data.logradouro}, ${data.numero} - ${data.bairro}, ${data.municipio} - ${data.uf}, ${data.cep}`;
      form.setValue('endereco', address, { shouldValidate: true });
      form.setValue('telefone', data.ddd_telefone_1 || '', { shouldValidate: true });


      toast({
        title: 'Dados da Empresa Carregados!',
        description: 'Os campos do formulário foram preenchidos com os dados do CNPJ.',
      });

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao Buscar CNPJ',
        description: error.message || 'Ocorreu um erro desconhecido.',
      });
    } finally {
      setIsFetchingCnpj(false);
    }
  };


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
            name="razaoSocial"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Razão Social</FormLabel>
                <FormControl><Input placeholder="O nome legal da sua empresa" {...field} /></FormControl>
                <FormMessage />
                </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="cnpj"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>CNPJ</FormLabel>
                    <div className="flex gap-2">
                        <FormControl>
                            <Input placeholder="00.000.000/0001-00" {...field} />
                        </FormControl>
                        <Button type="button" size="icon" onClick={handleCnpjSearch} disabled={isFetchingCnpj}>
                            {isFetchingCnpj ? <Loader2 className="animate-spin" /> : <Search />}
                        </Button>
                    </div>
                    <FormMessage />
                </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="telefone"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Telefone de Contato</FormLabel>
                <FormControl><Input placeholder="(00) 0000-0000" {...field} /></FormControl>
                <FormMessage />
                </FormItem>
            )}
          />
        </div>
        
        <FormField
            control={form.control}
            name="endereco"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Endereço da Empresa</FormLabel>
                <FormControl><Input placeholder="Rua, Número, Bairro, Cidade - Estado" {...field} /></FormControl>
                <FormMessage />
                </FormItem>
            )}
          />

        <div className="border-t pt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
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
        </div>

        <div className="border-t pt-6 space-y-6">
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
                name="msgEmRota"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Mensagem de 'Em Rota'</FormLabel>
                    <FormControl><Textarea className="min-h-[100px]" {...field} /></FormControl>
                    <FormDescription>
                        Variáveis disponíveis: `'{'{cliente}'}'`, `'{'{codigo}'}'`, `'{'{link}'}'`.
                    </FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="msgAvisame"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Mensagem do Avisa-me</FormLabel>
                    <FormControl><Textarea className="min-h-[100px]" {...field} /></FormControl>
                    <FormDescription>
                        Variáveis disponíveis: `'{'{nome}'}'`, `'{'{cidade}'}'`, `'{'{codigo}'}'`.
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
        </div>

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
