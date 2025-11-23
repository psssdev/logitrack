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
import { Loader2, PlusCircle, Search } from 'lucide-react';
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

type City = {
  id: number;
  nome: string;
};


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
  const [isFetchingCep, setIsFetchingCep] = React.useState(false);
  const [cities, setCities] = React.useState<City[]>([]);
  const [isFetchingCities, setIsFetchingCities] = React.useState(false);

  const form = useForm<NewLocation>({
    resolver: zodResolver(newLocationSchema),
    defaultValues: { name: '', logradouro: '', numero: '', bairro: '', cidade: '', estado: '', cep: '' },
  });

  const selectedState = form.watch('estado');

  React.useEffect(() => {
    const fetchCities = async () => {
      if (!selectedState) {
        setCities([]);
        return;
      }
      setIsFetchingCities(true);
      form.setValue('cidade', '');
      try {
        const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${selectedState}/municipios`);
        const data: City[] = await response.json();
        setCities(data.sort((a, b) => a.nome.localeCompare(b.nome)));
      } catch (error) {
        toast({ variant: 'destructive', title: 'Erro ao buscar cidades' });
        setCities([]);
      } finally {
        setIsFetchingCities(false);
      }
    };
    fetchCities();
  }, [selectedState, form, toast]);

  const handleCepSearch = async () => {
    const cep = form.getValues('cep')?.replace(/\D/g, '');
    if (cep?.length !== 8) {
      toast({ variant: 'destructive', title: 'CEP inválido' });
      return;
    }
    setIsFetchingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      if (data.erro) {
        toast({ variant: 'destructive', title: 'CEP não encontrado' });
      } else {
        form.setValue('estado', data.uf, { shouldValidate: true });
        setTimeout(() => form.setValue('cidade', data.localidade, { shouldValidate: true }), 500);
        form.setValue('logradouro', data.logradouro, { shouldValidate: true });
        form.setValue('bairro', data.bairro, { shouldValidate: true });
        form.setFocus('numero');
        toast({ title: 'Endereço encontrado!' });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro na busca' });
    } finally {
      setIsFetchingCep(false);
    }
  };

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
        lat: data.lat ?? null,
        lng: data.lng ?? null,
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
        active: true,
      };

      onLocationCreated(newLocation as Origin | Destino);

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
      <DialogContent className="sm:max-w-lg">
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
                  <FormLabel>Nome do Ponto *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Garagem Principal" {...field} />
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
                      <Button type="button" onClick={handleCepSearch} disabled={isFetchingCep}>
                        {isFetchingCep ? <Loader2 className="animate-spin" /> : <Search />}
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
                    <FormControl><Input {...field} /></FormControl><FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="numero"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Número *</FormLabel>
                    <FormControl><Input {...field} /></FormControl><FormMessage />
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
                    <FormControl><Input {...field} /></FormControl><FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="estado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {brazilianStates.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
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
                      <FormControl><SelectTrigger><SelectValue placeholder={isFetchingCities ? 'Carregando...' : 'Selecione'} /></SelectTrigger></FormControl>
                      <SelectContent>
                        {cities.map(c => <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancelar</Button>
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
