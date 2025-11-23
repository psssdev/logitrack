'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import type { Client, Address, Company } from '@/lib/types';
import { collection, doc, getDocs } from 'firebase/firestore';
import { MessageCircle, Megaphone, Send, Settings2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';


type ClientWithAddresses = Client & { addresses: Address[] };

// --------- Utils
const isMobileLike = () => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /Android|iPhone|iPad|iPod|Windows Phone/i.test(ua);
};

const titleCase = (s?: string) =>
  (s || '')
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(' ')
    .trim();

const sanitizePhoneBR = (raw?: string) => {
  if (!raw) return '';
  // remove não dígitos
  let digits = raw.replace(/\D/g, '');
  // remove 0 à esquerda do DDD, se houver (casos de importações com 0)
  digits = digits.replace(/^0+/, '');
  // garante código do país 55
  if (!digits.startsWith('55')) digits = `55${digits}`;
  return digits;
};

const buildMessage = (tpl: string, ctx: { cidade?: string; nome?: string }) =>
  (tpl || '')
    .replaceAll('{cidade}', ctx.cidade || '')
    .replaceAll('{nome}', ctx.nome || '');

type SendMode = 'auto' | 'force-app' | 'force-web';

/**
 * Abre WhatsApp de forma resiliente.
 * - auto: tenta app no mobile e web no desktop.
 * - force-app: tenta whatsapp:// (app); se bloquear, faz fallback para wa.me
 * - force-web: usa wa.me / web
 */
const openWhatsAppSmart = (phoneRaw: string, message: string, mode: SendMode) => {
  const phone = sanitizePhoneBR(phoneRaw);
  if (!phone) return;

  const encoded = encodeURIComponent(message || '');
  const waMeUrl = `https://wa.me/${phone}?text=${encoded}`;
  const deepUrl = `whatsapp://send?phone=${phone}&text=${encoded}`;

  const onDesktop = !isMobileLike();

  if (mode === 'force-web') {
    window.open(waMeUrl, '_blank');
    return;
  }

  if (mode === 'force-app') {
    const win = window.open(deepUrl);
    // Se o navegador bloquear esquemas customizados, faz fallback
    setTimeout(() => {
      if (!win || win.closed) window.open(waMeUrl, '_blank');
    }, 600);
    return;
  }

  // auto
  if (onDesktop) {
    window.open(waMeUrl, '_blank');
  } else {
    // mobile tenta app primeiro
    const win = window.open(deepUrl);
    setTimeout(() => {
      if (!win || win.closed) window.open(waMeUrl, '_blank');
    }, 600);
  }
};

export default function AvisamePage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  // UI/controle
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [sendMode, setSendMode] = useState<SendMode>('auto');
  const [intervalMs, setIntervalMs] = useState<number>(500); // intervalo entre disparos em massa

  // Company (template de mensagem)
  const companyRef = useMemoFirebase(() => {
    if (!firestore || !user || isUserLoading) return null;
    return doc(firestore, 'companies', '1');
  }, [firestore, user, isUserLoading]);
  const { data: company, isLoading: isLoadingCompany } = useDoc<Company>(companyRef);

  // Clients
  const clientsQuery = useMemoFirebase(() => {
    if (!firestore || !user || isUserLoading) return null;
    return collection(firestore, 'clients');
  }, [firestore, user, isUserLoading]);
  const { data: clients, isLoading: isLoadingClients } = useCollection<Client>(clientsQuery);

  const [clientsWithAddresses, setClientsWithAddresses] = useState<ClientWithAddresses[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true);

  // Busca addresses de todos os clientes
  useEffect(() => {
    if (!clients || !firestore) return;

    const fetchAllAddresses = async () => {
      setIsLoadingAddresses(true);
      try {
        const list = await Promise.all(
          clients.map(async (client) => {
            const addressesCollection = collection(
              firestore,
              'clients',
              client.id,
              'addresses'
            );
            const snap = await getDocs(addressesCollection);
            const addresses = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Address) }));
            return { ...client, addresses } as ClientWithAddresses;
          })
        );
        setClientsWithAddresses(list);
      } catch (error) {
        console.error('Error fetching addresses: ', error);
        toast({
          variant: 'destructive',
          title: 'Erro ao carregar endereços',
          description: 'Não foi possível buscar os endereços dos clientes.',
        });
      } finally {
        setIsLoadingAddresses(false);
      }
    };

    fetchAllAddresses();
  }, [clients, firestore, toast]);

  const isLoading = isLoadingClients || isLoadingCompany || isLoadingAddresses || isUserLoading;

  const { cities, filteredClients } = useMemo(() => {
    if (!clientsWithAddresses?.length) return { cities: [] as string[], filteredClients: [] as ClientWithAddresses[] };

    const citySet = new Set<string>();
    for (const c of clientsWithAddresses) {
      for (const a of c.addresses || []) {
        if (a?.cidade) citySet.add(titleCase(String(a.cidade)));
      }
    }

    const sortedCities = Array.from(citySet).sort((a, b) => a.localeCompare(b, 'pt-BR'));

    const filtered =
      selectedCity
        ? clientsWithAddresses.filter((c) =>
            (c.addresses || []).some((a) => titleCase(String(a.cidade)) === selectedCity)
          )
        : [];

    return { cities: sortedCities, filteredClients: filtered };
  }, [clientsWithAddresses, selectedCity]);

  const getTemplate = () =>
    company?.msgChegueiCidade ||
    'Olá{nome?, }estamos na sua cidade ({cidade}) para realizar entregas hoje. Fique atento!';

  const renderTemplate = (tpl: string, c: ClientWithAddresses, cidade: string) => {
    // Suporta {cidade} e {nome}. Também permite remover vírgula se {nome} não existir via "truque" simples.
    let out = buildMessage(tpl, { cidade, nome: c?.nome || '' });
    // Se template tiver "Olá{nome?, }" — remove marcador opcional quando nome vazio
    out = out.replaceAll('{nome?, }', c?.nome ? `${c.nome}, ` : '');
    return out;
  };


  const handleNotifySingle = (client: ClientWithAddresses) => {
    if (!selectedCity) {
      toast({ variant: 'destructive', title: 'Selecione uma cidade', description: 'Escolha uma cidade para montar a mensagem.' });
      return;
    }
    const tpl = getTemplate();
    const msg = renderTemplate(tpl, client, selectedCity);
    const phoneOk = sanitizePhoneBR(client?.telefone || '');
    if (!phoneOk) {
      toast({ variant: 'destructive', title: 'Telefone inválido', description: `Cliente ${client?.nome || ''} sem telefone válido.` });
      return;
    }
    openWhatsAppSmart(client.telefone!, msg, sendMode);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center">
        <h1 className="flex-1 text-2xl font-semibold md:text-3xl">Avisa-me</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-6 w-6" />
            Notificar Clientes por Cidade
          </CardTitle>
          <CardDescription>
            Envie um aviso para os clientes de uma cidade específica via WhatsApp Web/App.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Controles de envio */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="city-select">Selecione uma Cidade</Label>
              {isLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select
                  onValueChange={(v) => setSelectedCity(v)}
                  disabled={cities.length === 0}
                >
                  <SelectTrigger id="city-select">
                    <SelectValue placeholder={cities.length > 0 ? 'Escolha uma cidade...' : 'Nenhum cliente com endereço'} />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label>Modo de envio</Label>
              <div className="flex items-center gap-3 rounded-md border p-3">
                <Settings2 className="h-4 w-4" />
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="force-app"
                      checked={sendMode === 'force-app'}
                      onCheckedChange={(checked) => setSendMode(checked ? 'force-app' : 'auto')}
                    />
                    <Label htmlFor="force-app" className="text-sm">Forçar app</Label>
                  </div>
                  <Button
                    variant={sendMode === 'force-web' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSendMode(sendMode === 'force-web' ? 'auto' : 'force-web')}
                  >
                    {sendMode === 'force-web' ? 'Forçando Web' : 'Forçar Web'}
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="interval">Intervalo entre envios (ms)</Label>
              <Input
                id="interval"
                type="number"
                min={200}
                step={100}
                value={intervalMs}
                onChange={(e) => setIntervalMs(Math.max(200, Number(e.target.value) || 500))}
                disabled={true}
              />
              <p className="text-xs text-muted-foreground">Intervalo para envios em massa (desativado).</p>
            </div>
          </div>

          {/* Lista e ações */}
          {selectedCity && (
            <Card className="border-dashed">
              <CardHeader>
                <div>
                  <CardTitle>Clientes em {selectedCity}</CardTitle>
                  <CardDescription>
                    {isLoading ? 'Carregando...' : `${filteredClients.length} cliente(s) encontrado(s).`}
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-48 w-full" />
                ) : filteredClients.length > 0 ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Telefone</TableHead>
                          <TableHead className="text-right">Ação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredClients.map((client) => {
                          const phoneOk = sanitizePhoneBR(client?.telefone || '');
                          return (
                            <TableRow key={client.id}>
                              <TableCell className="font-medium">{client?.nome || '-'}</TableCell>
                              <TableCell className={!phoneOk ? 'text-red-600' : ''}>
                                {client?.telefone || '—'}
                                {!phoneOk && <span className="ml-2 text-xs text-red-600">(inválido)</span>}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleNotifySingle(client)}
                                  disabled={!phoneOk}
                                  title={!phoneOk ? 'Telefone inválido' : 'Enviar aviso individual'}
                                >
                                  <MessageCircle className="mr-2 h-4 w-4" />
                                  Avisar
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="flex h-24 items-center justify-center rounded-md border-2 border-dashed text-center">
                    <p className="text-muted-foreground">Nenhum cliente encontrado para esta cidade.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
