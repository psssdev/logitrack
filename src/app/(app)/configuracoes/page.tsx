import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search } from 'lucide-react';

export default function ConfiguracoesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center">
        <h1 className="flex-1 text-2xl font-semibold md:text-3xl">Configurações</h1>
      </div>

      <Tabs defaultValue="empresa" className="flex-1">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="empresa">Empresa</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          <TabsTrigger value="mensagens">Mensagens</TabsTrigger>
        </TabsList>
        <TabsContent value="empresa">
          <Card>
            <CardHeader>
              <CardTitle>Dados da Empresa</CardTitle>
              <CardDescription>
                Informações da sua empresa que aparecerão para os clientes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="space-y-1">
                <Label htmlFor="nomeFantasia">Nome Fantasia</Label>
                <Input id="nomeFantasia" defaultValue="LogiTrack Express" />
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <div className="space-y-1">
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input id="cnpj" defaultValue="00.000.000/0001-00" />
                </div>
                 <div className="flex items-end">
                    <Button variant="outline" className="w-full">
                        <Search className="mr-2 h-4 w-4" />
                        Buscar
                    </Button>
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="logoUrl">URL do Logo</Label>
                <Input id="logoUrl" placeholder="https://exemplo.com/logo.png" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                    <Label htmlFor="codigoPrefixo">Prefixo do Código de Rastreio</Label>
                    <Input id="codigoPrefixo" defaultValue="TR-" />
                </div>
                 <div className="space-y-1">
                    <Label htmlFor="linkBaseRastreio">Link Base para Rastreio</Label>
                    <Input id="linkBaseRastreio" placeholder="https://seusite.com/rastreio/" />
                </div>
              </div>
               <div className="flex justify-end pt-2">
                    <Button>Salvar Alterações</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="whatsapp">
          <Card>
            <CardHeader>
              <CardTitle>Configuração do WhatsApp</CardTitle>
              <CardDescription>
                Configure seu provedor de API do WhatsApp.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="space-y-1">
                <Label htmlFor="provider">Provedor</Label>
                <Input id="provider" defaultValue="Z-API" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="token">Token</Label>
                <Input id="token" type="password" defaultValue="************" />
              </div>
               <Button>Testar Conexão</Button>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="mensagens">
          <Card>
            <CardHeader>
              <CardTitle>Modelos de Mensagem</CardTitle>
              <CardDescription>
                Edite os textos das notificações automáticas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="space-y-1">
                <Label htmlFor="recebido">Encomenda Recebida</Label>
                <Textarea id="recebido" defaultValue="Olá {{nome}}! Recebemos sua encomenda. Código: {{codigo}}. Acompanhe: {{link_rastreio}} — {{empresa}}" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="emRota">Saiu para Entrega</Label>
                <Textarea id="emRota" defaultValue="Sua encomenda {{codigo}} saiu para entrega 🚚. Acompanhe: {{link_rastreio}} — {{empresa}}" />
              </div>
               <div className="space-y-1">
                <Label htmlFor="entregue">Entrega Concluída</Label>
                <Textarea id="entregue" defaultValue="Entrega concluída 🎉! Código {{codigo}}. Obrigado por escolher {{empresa}}." />
              </div>
                 <div className="flex justify-end pt-2">
                    <Button>Salvar Modelos</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
