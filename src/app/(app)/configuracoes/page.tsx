
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search, Loader2, UploadCloud, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDoc, useFirestore, useMemoFirebase, useUser, errorEmitter, FirestorePermissionError } from '@/firebase';
import type { Company } from '@/lib/types';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { triggerRevalidation } from '@/lib/actions';

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

const COMPANY_ID = '1';

export default function ConfiguracoesPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { isUserLoading } = useUser();

  const companyRef = useMemoFirebase(() => {
    if (!firestore || isUserLoading) return null;
    return doc(firestore, 'companies', COMPANY_ID);
  }, [firestore, isUserLoading]);
  
  const { data: company, isLoading: isLoadingCompany } = useDoc<Company>(companyRef);

  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingCep, setIsFetchingCep] = useState(false);
  const [isFetchingCnpj, setIsFetchingCnpj] = useState(false);
  const [cities, setCities] = useState<City[]>([]);
  const [isFetchingCities, setIsFetchingCities] = useState(false);
  const [selectedState, setSelectedState] = useState('');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const [formValues, setFormValues] = useState<Partial<Company>>({
    nomeFantasia: 'LogiTrack',
    codigoPrefixo: 'TR',
    linkBaseRastreio: 'https://seusite.com/rastreio/',
  });
  
  useEffect(() => {
    if (company) {
      setFormValues(company);
      if (company.logoUrl) {
        setLogoPreview(company.logoUrl);
      }
      if (company.estado) {
        setSelectedState(company.estado);
      }
    }
  }, [company]);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormValues(prev => ({ ...prev, [id]: value }));
  };
  
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setLogoPreview(dataUrl);
        setFormValues(prev => ({ ...prev, logoUrl: dataUrl }));
      };
      reader.readAsDataURL(file);
    }
  }

  const handleSelectChange = (id: keyof Company, value: string) => {
    setFormValues(prev => ({ ...prev, [id]: value }));
    if (id === 'estado') {
      setSelectedState(value);
    }
  };

  useEffect(() => {
    const fetchCities = async () => {
      if (!selectedState) {
        setCities([]);
        return;
      }
      setIsFetchingCities(true);
      handleSelectChange('cidade', '');
      try {
        const response = await fetch(
          `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${selectedState}/municipios`
        );
        const data: City[] = await response.json();
        const sortedCities = data.sort((a, b) => a.nome.localeCompare(b.nome));
        setCities(sortedCities);
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Erro ao buscar cidades',
          description:
            'Não foi possível carregar a lista de cidades para o estado selecionado.',
        });
        setCities([]);
      } finally {
        setIsFetchingCities(false);
      }
    };

    if(selectedState) {
        fetchCities();
    }
  }, [selectedState, toast]);

  const handleCepSearch = async () => {
    const currentCep = formValues.cep?.replace(/\D/g, '') || '';
    if (currentCep.length !== 8) {
      toast({
        variant: 'destructive',
        title: 'CEP inválido',
        description: 'Por favor, digite um CEP com 8 dígitos.',
      });
      return;
    }

    setIsFetchingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${currentCep}/json/`);
      const data = await response.json();

      if (data.erro) {
        toast({
          variant: 'destructive',
          title: 'CEP não encontrado',
          description: 'Verifique o CEP digitado e tente novamente.',
        });
      } else {
        const newValues = {
          ...formValues,
          estado: data.uf,
          logradouro: data.logradouro,
          bairro: data.bairro,
          cidade: data.localidade
        };
        setFormValues(newValues);
        setSelectedState(data.uf);
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

  const handleCnpjSearch = async () => {
    const currentCnpj = formValues.cnpj?.replace(/\D/g, '') || '';
    if (currentCnpj.length !== 14) {
      toast({
        variant: 'destructive',
        title: 'CNPJ inválido',
        description: 'Por favor, digite um CNPJ com 14 dígitos.',
      });
      return;
    }

    setIsFetchingCnpj(true);
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${currentCnpj}`);
      if (!response.ok) {
        throw new Error('CNPJ não encontrado ou API indisponível.');
      }
      const data = await response.json();

      const newValues = {
        ...formValues,
        nomeFantasia: data.nome_fantasia || data.razao_social,
        cep: data.cep?.replace(/\D/g, '') || formValues.cep,
        logradouro: data.logradouro || formValues.logradouro,
        numero: data.numero || formValues.numero,
        bairro: data.bairro || formValues.bairro,
        cidade: data.municipio || formValues.cidade,
        estado: data.uf || formValues.estado,
      };
      setFormValues(newValues);
      if(data.uf) {
        setSelectedState(data.uf);
      }

      toast({
        title: 'Dados da Empresa Encontrados!',
        description: 'Os campos foram preenchidos com os dados do CNPJ.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro na Busca por CNPJ',
        description: error.message || 'Não foi possível buscar os dados. Tente novamente.',
      });
    } finally {
      setIsFetchingCnpj(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!firestore || !companyRef) {
        toast({ variant: 'destructive', title: 'Erro de conexão' });
        return;
    }
    setIsSaving(true);

    const companyData: Partial<Company> = {
        ...formValues,
    };
    
    // Ensure required fields have a default if they are empty
    if (!companyData.nomeFantasia) companyData.nomeFantasia = 'LogiTrack';
    if (!companyData.codigoPrefixo) companyData.codigoPrefixo = 'TR';
    if (!companyData.linkBaseRastreio) companyData.linkBaseRastreio = 'https://seusite.com/rastreio/';

    setDoc(companyRef, companyData, { merge: true })
      .then(async () => {
        await triggerRevalidation('/'); 
        toast({
            title: "Configurações Salvas",
            description: "Suas alterações foram salvas com sucesso.",
        });
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: companyRef.path,
          operation: 'update',
          requestResourceData: companyData,
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  if (isUserLoading || isLoadingCompany) {
      return (
        <div className="flex flex-col gap-6">
            <Skeleton className="h-9 w-1/3" />
            <div className="grid gap-6">
                <Card><CardHeader><Skeleton className="h-6 w-1/4" /></CardHeader><CardContent><Skeleton className="h-48 w-full" /></CardContent></Card>
                <Card><CardHeader><Skeleton className="h-6 w-1/4" /></CardHeader><CardContent><Skeleton className="h-24 w-full" /></CardContent></Card>
                <Card><CardHeader><Skeleton className="h-6 w-1/4" /></CardHeader><CardContent><Skeleton className="h-32 w-full" /></CardContent></Card>
            </div>
        </div>
      );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center">
        <h1 className="flex-1 text-2xl font-semibold md:text-3xl">
          Configurações da Empresa
        </h1>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Dados e Marca</CardTitle>
            <CardDescription>
              Informações e identidade visual da sua empresa.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                    <Label htmlFor="nomeFantasia">Nome Fantasia</Label>
                    <Input id="nomeFantasia" value={formValues.nomeFantasia || ''} onChange={handleInputChange} />
                </div>
                <div className="grid grid-cols-[1fr_auto] gap-2">
                    <div className="space-y-1">
                        <Label htmlFor="cnpj">CNPJ</Label>
                        <Input id="cnpj" value={formValues.cnpj || ''} onChange={handleInputChange} />
                    </div>
                    <div className="flex items-end">
                    <Button variant="outline" className="w-full" onClick={handleCnpjSearch} disabled={isFetchingCnpj}>
                        {isFetchingCnpj ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                        Buscar
                    </Button>
                    </div>
                </div>
            </div>

             <div className="space-y-2">
              <Label>Logo da Empresa</Label>
               <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20 rounded-md">
                    <AvatarImage src={logoPreview || undefined} className="object-contain" />
                    <AvatarFallback className="rounded-md">
                        <UploadCloud />
                    </AvatarFallback>
                </Avatar>
                <div className="flex gap-2">
                    <Button asChild variant="outline">
                        <label htmlFor="logo-upload" className="cursor-pointer">
                           <UploadCloud className="mr-2" /> 
                           Carregar Imagem
                        </label>
                    </Button>
                    <Input id="logo-upload" type="file" className="hidden" accept="image/*" onChange={handleLogoChange} />
                    {logoPreview && (
                        <Button variant="ghost" size="icon" onClick={() => { setLogoPreview(null); setFormValues(p => ({...p, logoUrl: ''}))}}>
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
               </div>
               <p className="text-xs text-muted-foreground">Recomendado: Imagem quadrada (ex: 200x200px) em .png ou .jpg.</p>
            </div>
            
            <div className="space-y-4 pt-6 border-t">
                <h3 className="text-lg font-medium">Endereço</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                     <div className="md:col-span-1">
                        <Label htmlFor="cep">CEP</Label>
                        <div className="flex gap-2">
                             <Input id="cep" placeholder="00000-000" value={formValues.cep || ''} onChange={handleInputChange} />
                            <Button type="button" onClick={handleCepSearch} disabled={isFetchingCep} className="w-32">
                                {isFetchingCep ? <Loader2 className="animate-spin" /> : <><Search className="mr-2" /> Buscar</>}
                            </Button>
                        </div>
                     </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
                    <div className="md:col-span-4 space-y-1">
                        <Label htmlFor="logradouro">Logradouro</Label>
                        <Input id="logradouro" placeholder="Rua, Avenida, etc." value={formValues.logradouro || ''} onChange={handleInputChange} />
                    </div>
                    <div className="md:col-span-2 space-y-1">
                        <Label htmlFor="numero">Número</Label>
                        <Input id="numero" placeholder="123" value={formValues.numero || ''} onChange={handleInputChange} />
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="space-y-1">
                        <Label htmlFor="bairro">Bairro</Label>
                        <Input id="bairro" placeholder="Centro" value={formValues.bairro || ''} onChange={handleInputChange} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="estado">Estado (UF)</Label>
                        <Select onValueChange={(v) => handleSelectChange('estado', v)} value={formValues.estado || ''}>
                            <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                            <SelectContent>
                                {brazilianStates.map(state => (
                                    <SelectItem key={state.value} value={state.value}>{state.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="cidade">Cidade</Label>
                         <Select onValueChange={(v) => handleSelectChange('cidade', v)} value={formValues.cidade || ''} disabled={!selectedState || isFetchingCities}>
                            <SelectTrigger>
                                <SelectValue placeholder={isFetchingCities ? 'Carregando...' : 'Selecione a cidade'} />
                            </SelectTrigger>
                            <SelectContent>
                                {cities.map(city => (
                                    <SelectItem key={city.id} value={city.nome}>{city.nome}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

          </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Configurações de Rastreio</CardTitle>
                <CardDescription>Configure como os códigos de rastreio são gerados e para onde apontam.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <Label htmlFor="codigoPrefixo">Prefixo do Código de Rastreio</Label>
                        <Input id="codigoPrefixo" value={formValues.codigoPrefixo || ''} onChange={handleInputChange} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="linkBaseRastreio">Link Base para Rastreio</Label>
                        <Input id="linkBaseRastreio" placeholder="https://seusite.com/rastreio/" value={formValues.linkBaseRastreio || ''} onChange={handleInputChange} />
                    </div>
              </div>
            </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Modelos de Mensagem do WhatsApp</CardTitle>
            <CardDescription>
              Edite os textos. Use {'{cliente}'}, {'{codigo}'}, {'{link}'}, {'{valor}'}, {'{volumes}'} e {'{cidade}'} como variáveis.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="msgRecebido">Encomenda Recebida</Label>
              <Textarea
                id="msgRecebido"
                placeholder="Olá {cliente}! Recebemos sua encomenda de {volumes} volume(s) com o código {codigo}. O valor da entrega é de {valor}. Acompanhe em: {link}"
                value={formValues.msgRecebido || ''} onChange={handleInputChange}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="msgEmRota">Saiu para Entrega</Label>
              <Textarea
                id="msgEmRota"
                placeholder="Olá {cliente}! Sua encomenda {codigo} saiu para entrega. Acompanhe em: {link}"
                value={formValues.msgEmRota || ''} onChange={handleInputChange}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="msgEntregue">Entrega Concluída</Label>
              <Textarea
                id="msgEntregue"
                placeholder="Olá {cliente}! Sua encomenda {codigo} foi entregue com sucesso! Obrigado por confiar em nossos serviços."
                value={formValues.msgEntregue || ''} onChange={handleInputChange}
              />
            </div>
             <div className="space-y-1">
              <Label htmlFor="msgChegueiCidade">Chegamos na Cidade</Label>
              <Textarea
                id="msgChegueiCidade"
                placeholder="Olá! Estamos na sua cidade ({cidade}) para realizar entregas hoje. Fique atento!"
                value={formValues.msgChegueiCidade || ''} onChange={handleInputChange}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end pt-2">
          <Button size="lg" onClick={handleSaveChanges} disabled={isSaving}>
            {isSaving ? <Loader2 className="animate-spin" /> : 'Salvar Alterações'}
          </Button>
        </div>
      </div>
    </div>
  );
}
