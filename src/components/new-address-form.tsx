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
import { newAddressFormSchema } from '@/lib/schemas';
import type { NewAddress } from '@/lib/types';
import { Loader2, Search } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useFirestore, useUser } from '@/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';


type City = {
  id: number;
  nome: string;
};

const brazilianStates = [
    { value: 'AC', label: 'Acre' },
    { value: 'AL', label: 'Alagoas' },
    { value: 'AP', label: 'Amapá' },
    { value: 'AM', label: 'Amazonas' },
    { value: 'BA', label: 'Bahia' },
    { value: 'CE', label: 'Ceará' },
    { value: 'DF', label: 'Distrito Federal' },
    { value: 'ES', label: 'Espírito Santo' },
    { value: 'GO', label: 'Goiás' },
    { value: 'MA', label: 'Maranhão' },
    { value: 'MT', label: 'Mato Grosso' },
    { value: 'MS', label: 'Mato Grosso do Sul' },
    { value: 'MG', label: 'Minas Gerais' },
    { value: 'PA', label: 'Pará' },
    { value: 'PB', label: 'Paraíba' },
    { value: 'PR', label: 'Paraná' },
    { value: 'PE', label: 'Pernambuco' },
    { value: 'PI', label: 'Piauí' },
    { value: 'RJ', label: 'Rio de Janeiro' },
    { value: 'RN', label: 'Rio Grande do Norte' },
    { value: 'RS', label: 'Rio Grande do Sul' },
    { value: 'RO', label: 'Rondônia' },
    { value: 'RR', label: 'Roraima' },
    { value: 'SC', label: 'Santa Catarina' },
    { value: 'SP', label: 'São Paulo' },
    { value: 'SE', label: 'Sergipe' },
    { value: 'TO', label: 'Tocantins' },
];

export function NewAddressForm({ clientId }: { clientId: string }) {
  const { toast } = useToast();
  const router = useRouter();
  const firestore = useFirestore();
  const { companyId } = useUser();
  const [isFetchingCep, setIsFetchingCep] = React.useState(false);
  const [cities, setCities] = React.useState<City[]>([]);
  const [isFetchingCities, setIsFetchingCities] = React.useState(false);

  const form = useForm<NewAddress>({
    resolver: zodResolver(newAddressFormSchema),
    defaultValues: {
      clientId,
      label: '',
      logradouro: '',
      numero: '',
      bairro: '',
      cidade: '',
      estado: '',
      cep: '',
      lat: undefined,
      lng: undefined,
    },
  });

  const selectedState = form.watch('estado');

  React.useEffect(() => {
    const fetchCities = async () => {
      if (!selectedState) {
        setCities([]);
        return;
      }
      setIsFetchingCities(true);
      form.setValue('cidade', ''); // Reset city selection
      try {
        const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${selectedState}/municipios`);
        const data: City[] = await response.json();
        const sortedCities = data.sort((a, b) => a.nome.localeCompare(b.nome));
        setCities(sortedCities);
      } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Erro ao buscar cidades',
            description: 'Não foi possível carregar a lista de cidades para o estado selecionado.'
        })
        setCities([]);
      } finally {
        setIsFetchingCities(false);
      }
    };

    fetchCities();
  }, [selectedState, form, toast]);


  const handleCepSearch = async () => {
    const cep = form.getValues('cep').replace(/\D/g, '');
    if (cep.length !== 8) {
      toast({
        variant: 'destructive',
        title: 'CEP inválido',
        description: 'Por favor, digite um CEP com 8 dígitos.',
      });
      return;
    }

    setIsFetchingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();

      if (data.erro) {
        toast({
          variant: 'destructive',
          title: 'CEP não encontrado',
          description: 'Verifique o CEP digitado e tente novamente.',
        });
        form.setValue('logradouro', '');
        form.setValue('bairro', '');
        form.setValue('cidade', '');
        form.setValue('estado', '');
      } else {
        form.setValue('estado', data.uf, { shouldValidate: true });
        // The useEffect for state change will handle fetching cities.
        // This is a bit of a hack, but it works for now. A better solution would be to use a callback or promise.
        setTimeout(() => {
            form.setValue('cidade', data.localidade, { shouldValidate: true });
        }, 500); 
        form.setValue('logradouro', data.logradouro, { shouldValidate: true });
        form.setValue('bairro', data.bairro, { shouldValidate: true });
        form.setFocus('numero'); 
        toast({
          title: 'Endereço encontrado!',
          description: 'Por favor, preencha o número.',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro na busca',
        description: 'Não foi possível buscar o CEP. Tente novamente.',
      });
    } finally {
      setIsFetchingCep(false);
    }
  };

  async function onSubmit(data: NewAddress) {
      if (!firestore) {
        toast({ variant: 'destructive', title: 'Erro de conexão', description: 'Não foi possível conectar ao banco de dados.' });
        return;
    }

     try {
        const addressCollection = collection(firestore, 'clients', data.clientId, 'addresses');
        const { logradouro, numero, bairro, cidade, estado, cep } = data;
        const fullAddress = `${logradouro}, ${numero}, ${bairro}, ${cidade} - ${estado}, ${cep}`;

        await addDoc(addressCollection, {
            ...data,
            fullAddress,
            createdAt: serverTimestamp(),
        });

        await triggerRevalidation(`/clientes/${data.clientId}`);
        await triggerRevalidation('/encomendas/nova');
        await triggerRevalidation('/vender-passagem');

        toast({
            title: 'Sucesso!',
            description: 'Novo endereço cadastrado.',
        });
        router.push(`/clientes/${data.clientId}`);

    } catch (error: any) {
        console.error("Error creating address:", error);
        toast({
            variant: 'destructive',
            title: 'Erro ao cadastrar endereço.',
            description: error.message || 'Ocorreu um erro desconhecido.',
        });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
      <FormField
          control={form.control}
          name="label"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rótulo do Endereço *</FormLabel>
              <FormControl>
                <Input
                  placeholder="Ex: Casa, Trabalho, Ponto de Coleta"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
             <FormField
                control={form.control}
                name="cep"
                render={({ field }) => (
                    <FormItem className="md:col-span-2">
                    <FormLabel>CEP *</FormLabel>
                    <div className="flex gap-2">
                         <FormControl>
                            <Input placeholder="00000-000" {...field} />
                        </FormControl>
                        <Button type="button" onClick={handleCepSearch} disabled={isFetchingCep} className="w-32">
                            {isFetchingCep ? <Loader2 className="animate-spin" /> : <><Search className="mr-2" /> Buscar</>}
                        </Button>
                    </div>
                    <FormMessage />
                    </FormItem>
                )}
                />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
          <FormField
            control={form.control}
            name="logradouro"
            render={({ field }) => (
              <FormItem className="md:col-span-4">
                <FormLabel>Logradouro *</FormLabel>
                <FormControl>
                  <Input placeholder="Rua, Avenida, etc." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="numero"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Número *</FormLabel>
                <FormControl>
                  <Input placeholder="123" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <FormField
            control={form.control}
            name="bairro"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bairro *</FormLabel>
                <FormControl>
                  <Input placeholder="Centro" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="estado"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Estado (UF) *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="UF" />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        {brazilianStates.map(state => (
                            <SelectItem key={state.value} value={state.value}>
                                {state.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
             <FormField
                control={form.control}
                name="cidade"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Cidade *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!selectedState || isFetchingCities}>
                        <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder={isFetchingCities ? 'Carregando...' : 'Selecione a cidade'} />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {cities.map(city => (
                                <SelectItem key={city.id} value={city.nome}>
                                    {city.nome}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
                control={form.control}
                name="lat"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Latitude</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="-19.0187" {...field} onChange={e => field.onChange(e.target.valueAsNumber)} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="lng"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Longitude</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="-40.5363" {...field} onChange={e => field.onChange(e.target.valueAsNumber)} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>

        <div className="flex justify-end">
            <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : 'Salvar Endereço'}
            </Button>
        </div>
      </form>
    </Form>
  );
}
