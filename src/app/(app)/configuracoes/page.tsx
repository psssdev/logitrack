
'use client';

import React from 'react';
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
import { Search, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

export default function ConfiguracoesPage() {
  const { toast } = useToast();
  const [isFetchingCep, setIsFetchingCep] = React.useState(false);
  const [cities, setCities] = React.useState<City[]>([]);
  const [isFetchingCities, setIsFetchingCities] = React.useState(false);
  const [selectedState, setSelectedState] = React.useState('');
  const [cep, setCep] = React.useState('');

  const [formValues, setFormValues] = React.useState({
    nomeFantasia: 'LogiTrack Express',
    cnpj: '00.000.000/0001-00',
    logoUrl: '',
    codigoPrefixo: 'TR-',
    linkBaseRastreio: 'https://seusite.com/rastreio/',
    cep: '',
    logradouro: '',
    numero: '',
    bairro: '',
    cidade: '',
    estado: '',
    whatsappProvider: 'Z-API',
    whatsappToken: '************',
    msgRecebido: 'Olá {{nome}}! Recebemos sua encomenda. Código: {{codigo}}. Acompanhe: {{link_rastreio}} — {{empresa}}',
    msgEmRota: 'Sua encomenda {{codigo}} saiu para entrega 🚚. Acompanhe: {{link_rastreio}} — {{empresa}}',
    msgEntregue: 'Entrega concluída 🎉! Código {{codigo}}. Obrigado por escolher {{empresa}}.',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormValues(prev => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (id: string, value: string) => {
      setFormValues(prev => ({ ...prev, [id]: value }));
      if (id === 'estado') {
          setSelectedState(value);
      }
  }

  React.useEffect(() => {
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

    fetchCities();
  }, [selectedState, toast]);

  const handleCepSearch = async () => {
    const currentCep = formValues.cep.replace(/\D/g, '');
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
        setFormValues(prev => ({
            ...prev,
            estado: data.uf,
            logradouro: data.logradouro,
            bairro: data.bairro,
        }));
        setSelectedState(data.uf);
        // Await city fetching, then set city
        setTimeout(() => {
            setFormValues(prev => ({...prev, cidade: data.localidade }));
        }, 500);
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
  
    const handleCnpjSearch = () => {
        toast({
            title: 'Busca de CNPJ',
            description: 'Funcionalidade de busca por CNPJ ainda não implementada.'
        })
    }
    
    const handleSaveChanges = () => {
        // Here you would typically save the formValues state to your backend
        console.log("Saving data:", formValues);
        toast({
            title: "Configurações Salvas",
            description: "Suas alterações foram salvas com sucesso.",
        })
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
            <CardTitle>Dados da Empresa</CardTitle>
            <CardDescription>
              Informações da sua empresa que aparecerão para os clientes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                    <Label htmlFor="nomeFantasia">Nome Fantasia</Label>
                    <Input id="nomeFantasia" value={formValues.nomeFantasia} onChange={handleInputChange} />
                </div>
                <div className="grid grid-cols-[1fr_auto] gap-2">
                    <div className="space-y-1">
                        <Label htmlFor="cnpj">CNPJ</Label>
                        <Input id="cnpj" value={formValues.cnpj} onChange={handleInputChange} />
                    </div>
                    <div className="flex items-end">
                    <Button variant="outline" className="w-full" onClick={handleCnpjSearch}>
                        <Search className="mr-2 h-4 w-4" />
                        Buscar
                    </Button>
                    </div>
                </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="logoUrl">URL do Logo</Label>
              <Input
                id="logoUrl"
                placeholder="https://exemplo.com/logo.png"
                value={formValues.logoUrl} onChange={handleInputChange}
              />
            </div>
            
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 pt-4 border-t">
                 <div className="md:col-span-2">
                    <Label htmlFor="cep">CEP</Label>
                    <div className="flex gap-2">
                         <Input id="cep" placeholder="00000-000" value={formValues.cep} onChange={handleInputChange} />
                        <Button type="button" onClick={handleCepSearch} disabled={isFetchingCep} className="w-32">
                            {isFetchingCep ? <Loader2 className="animate-spin" /> : <><Search className="mr-2" /> Buscar</>}
                        </Button>
                    </div>
                 </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
                <div className="md:col-span-4 space-y-1">
                    <Label htmlFor="logradouro">Logradouro</Label>
                    <Input id="logradouro" placeholder="Rua, Avenida, etc." value={formValues.logradouro} onChange={handleInputChange} />
                </div>
                <div className="md:col-span-2 space-y-1">
                    <Label htmlFor="numero">Número</Label>
                    <Input id="numero" placeholder="123" value={formValues.numero} onChange={handleInputChange} />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-1">
                    <Label htmlFor="bairro">Bairro</Label>
                    <Input id="bairro" placeholder="Centro" value={formValues.bairro} onChange={handleInputChange} />
                </div>
                <div className="space-y-1">
                    <Label htmlFor="estado">Estado (UF)</Label>
                    <Select onValueChange={(v) => handleSelectChange('estado', v)} value={formValues.estado}>
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
                     <Select onValueChange={(v) => handleSelectChange('cidade', v)} value={formValues.cidade} disabled={!selectedState || isFetchingCities}>
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
                        <Input id="codigoPrefixo" value={formValues.codigoPrefixo} onChange={handleInputChange} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="linkBaseRastreio">Link Base para Rastreio</Label>
                        <Input id="linkBaseRastreio" placeholder="https://seusite.com/rastreio/" value={formValues.linkBaseRastreio} onChange={handleInputChange} />
                    </div>
              </div>
            </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Configuração do WhatsApp</CardTitle>
            <CardDescription>
              Configure seu provedor de API do WhatsApp para notificações.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="whatsappProvider">Provedor</Label>
              <Input id="whatsappProvider" value={formValues.whatsappProvider} onChange={handleInputChange} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="whatsappToken">Token</Label>
              <Input id="whatsappToken" type="password" value={formValues.whatsappToken} onChange={handleInputChange} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Modelos de Mensagem</CardTitle>
            <CardDescription>
              Edite os textos das notificações automáticas do WhatsApp.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="msgRecebido">Encomenda Recebida</Label>
              <Textarea
                id="msgRecebido"
                value={formValues.msgRecebido} onChange={handleInputChange}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="msgEmRota">Saiu para Entrega</Label>
              <Textarea
                id="msgEmRota"
                value={formValues.msgEmRota} onChange={handleInputChange}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="msgEntregue">Entrega Concluída</Label>
              <Textarea
                id="msgEntregue"
                value={formValues.msgEntregue} onChange={handleInputChange}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end pt-2">
          <Button size="lg" onClick={handleSaveChanges}>Salvar Alterações</Button>
        </div>
      </div>
    </div>
  );
}
