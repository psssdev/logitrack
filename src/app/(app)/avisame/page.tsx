'use client';
import { useState, useMemo, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import type { Order, Driver, Client, Address } from '@/lib/types';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Megaphone, Send, Search, Radar, User, MoveRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getCityFromCoordinates } from '@/lib/actions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { avisameCampaignSchema } from '@/lib/schemas';
import type { NewAvisameCampaign } from '@/lib/types';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { scheduleAvisameCampaign } from '@/lib/avisame-actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { WhatsApp } from '@/components/ui/icons';
import { z } from 'zod';

const COMPANY_ID = '1';

// Snippets do plano do usuário
function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Geolocalização indisponível'));
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 8000,
      maximumAge: 0
    });
  });
}

function mapsLink(lat: number, lng: number) {
  return `https://maps.google.com/?q=${lat},${lng}`;
}

function openWhatsApp(phone: string, message: string) {
    const cleanedPhone = phone.replace(/\D/g, '');
    const fullPhone = cleanedPhone.startsWith('55') ? cleanedPhone : `55${cleanedPhone}`;
    const url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
}


type Vars = Record<string, string>;
function renderTemplate(tpl: string, vars: Vars) {
  // Substitui placeholders e remove linhas onde o placeholder não foi preenchido
  let result = tpl.replace(/\{(\w+)\}/g, (_, k) => (vars[k] || ''));
  result = result.split('\n').filter(line => line.trim() !== '').join('\n');
  return result;
}


export default function AvisamePage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const clientsQuery = useMemoFirebase(() => {
    if (!firestore || isUserLoading) return null;
    return query(collection(firestore, 'companies', COMPANY_ID, 'clients'));
  }, [firestore, isUserLoading]);
  
  const ordersQuery = useMemoFirebase(() => {
    if (!firestore || isUserLoading) return null;
    return query(collection(firestore, 'companies', COMPANY_ID, 'orders'));
  }, [firestore, isUserLoading]);
  

  const { data: clients, isLoading: isLoadingClients } = useCollection<Client>(clientsQuery);
  const { data: orders, isLoading: isLoadingOrders } = useCollection<Order>(ordersQuery);


  const pageIsLoading = isUserLoading || isLoadingClients || isLoadingOrders;
  
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center">
        <h1 className="flex-1 text-2xl font-semibold md:text-3xl">Avisame</h1>
      </div>
      
       <Tabs defaultValue="campaign">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="campaign"><Megaphone className="mr-2 h-4 w-4" /> Campanha por Cidade</TabsTrigger>
            <TabsTrigger value="radar"><Radar className="mr-2 h-4 w-4" /> Radar de Oportunidade</TabsTrigger>
        </TabsList>
        <TabsContent value="campaign">
            <CityCampaignTab 
                orders={orders || []} 
                clients={clients || []}
                user={user}
                isUserLoading={pageIsLoading}
            />
        </TabsContent>
        <TabsContent value="radar">
            <RadarTab 
                clients={clients || []}
                isUserLoading={pageIsLoading}
            />
        </TabsContent>
       </Tabs>
    </div>
  );
}

// Custom Type for Form Data
type CampaignFormData = NewAvisameCampaign & { target: 'city' | 'all' };

// TAB 1: CAMPANHA POR CIDADE
function CityCampaignTab({ orders, clients, user, isUserLoading }: { orders: Order[], clients: Client[], user: any, isUserLoading: boolean }) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const [preview, setPreview] = useState<{ clients: Client[], message: string, includeGeo: boolean } | null>(null);
  const [isBuildingPreview, setIsBuildingPreview] = useState(false);

  const uniqueCities = useMemo(() => {
    if (!orders) return [];
    const cities = orders.map((order) => {
      if (typeof order.destino?.full !== 'string') {
        return null;
      }
      const parts = order.destino.full.split(',');
      return parts.length > 2 ? parts[parts.length - 2].trim() : null;
    });
    return [...new Set(cities)].filter((city): city is string => city !== null).sort();
  }, [orders]);


  const form = useForm<CampaignFormData>({
    resolver: zodResolver(avisameCampaignSchema.extend({ target: z.enum(['city', 'all']) })),
    defaultValues: {
      target: 'city',
      city: '',
      driverId: undefined,
      messageTemplate: 'Olá, {cliente}! Estaremos com entregas em {cidade} em breve.\nMotorista: {motorista_nome} ({motorista_telefone})\n{ponto_encontro}\nSe quiser, me chama por aqui e já separo seu pedido 🙂',
      includeGeo: false,
      sendNow: true,
      scheduledAt: new Date(),
    },
  });

  const sendNow = form.watch('sendNow');
  const target = form.watch('target');
  
  const driversQuery = useMemoFirebase(() => {
    if (!firestore || isUserLoading) return null;
    return query(collection(firestore, 'companies', COMPANY_ID, 'drivers'), orderBy('nome'));
  }, [firestore, isUserLoading]);

  const { data: drivers, isLoading: isLoadingDrivers } = useCollection<Driver>(driversQuery);

  const handleBuildPreview = async (data: CampaignFormData) => {
    setIsBuildingPreview(true);
    let clientsToNotify: Client[] = [];

    if (data.target === 'all') {
      clientsToNotify = clients || [];
    } else {
      const city = data.city;
      if (!city) {
         toast({
          title: 'Cidade obrigatória',
          description: `Por favor, selecione uma cidade para a campanha.`,
          variant: 'destructive'
        });
        setIsBuildingPreview(false);
        return;
      }
      const ordersInCity = orders?.filter(o => o.destino.full.toLowerCase().includes(city.toLowerCase()));
      const clientIdsInCity = [...new Set(ordersInCity?.map(o => o.clientId))];
      clientsToNotify = clients?.filter(c => clientIdsInCity.includes(c.id)) || [];
    }
    
    if (clientsToNotify.length === 0) {
      toast({
        title: 'Nenhum cliente',
        description: `Nenhum cliente encontrado para o critério selecionado.`,
        variant: 'destructive'
      });
      setIsBuildingPreview(false);
      return;
    }
    
    let locationText = '';
    if (data.includeGeo) {
        try {
            const position = await getCurrentPosition();
            const { latitude, longitude } = position.coords;
            locationText = `Ponto de encontro: ${mapsLink(latitude, longitude)}`;
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Erro de Localização',
                description: error.message || 'Não foi possível obter sua localização.'
            });
            setIsBuildingPreview(false);
            return;
        }
    }
    
    const driver = drivers?.find(d => d.id === data.driverId);
    const vars: Vars = {
        cliente: '{cliente}', // keep placeholder for preview
        cidade: data.city || 'sua região',
        motorista_nome: driver?.nome ?? '',
        motorista_telefone: driver?.telefone ?? '',
        ponto_encontro: locationText
    };
    const finalMessage = renderTemplate(data.messageTemplate, vars);

    setPreview({ clients: clientsToNotify, message: finalMessage, includeGeo: data.includeGeo });
    setIsBuildingPreview(false);
  }

  const handleConfirmAndSchedule = async () => {
      if (!preview || !user) return;
      const campaignData = form.getValues();
      
      try {
        await scheduleAvisameCampaign({
          ...campaignData,
          city: campaignData.target === 'all' ? 'Todos os Clientes' : campaignData.city,
          createdBy: user.uid,
          scheduledAt: campaignData.sendNow ? new Date() : campaignData.scheduledAt,
        });

        toast({
          title: "Campanha Agendada!",
          description: `Sua campanha foi agendada com sucesso.`,
        });
        setPreview(null);
        form.reset();
      } catch(e: any) {
        toast({
          variant: "destructive",
          title: "Erro ao agendar",
          description: e.message || "Não foi possível salvar a campanha."
        })
      }
  }


  const pageIsLoading = isUserLoading || isLoadingDrivers;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Nova Campanha de Avisos</CardTitle>
          <CardDescription>
            Agende ou envie uma notificação em massa para os seus clientes.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <Alert className="mb-6">
                <Megaphone className="h-4 w-4" />
                <AlertTitle>Como Funciona?</AlertTitle>
                <AlertDescription>
                   Selecione o público, um motorista (opcional) e escreva sua mensagem. Use {'{cliente}'}, {'{cidade}'}, {'{motorista_nome}'}, {'{motorista_telefone}'} e {'{ponto_encontro}'} para personalizar.
                </AlertDescription>
            </Alert>
          {pageIsLoading ? (
            <Skeleton className="h-96 w-full" />
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleBuildPreview)} className="space-y-8">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="target"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Público-Alvo</FormLabel>
                           <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o público" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="city">Cidade Específica</SelectItem>
                                <SelectItem value="all">Todos os Clientes</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {target === 'city' && (
                        <FormField
                            control={form.control}
                            name="city"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Cidade de Destino</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Selecione uma cidade" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {uniqueCities.map(city => (
                                          <SelectItem key={city} value={city}>{city}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}
                  </div>
                   <FormField
                    control={form.control}
                    name="driverId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Motorista (Opcional)</FormLabel>
                         <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingDrivers}>
                           <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione um motorista" />
                              </SelectTrigger>
                           </FormControl>
                          <SelectContent>
                            <SelectItem value="none">Nenhum</SelectItem>
                            {drivers?.map((driver) => (
                              <SelectItem key={driver.id} value={driver.id}>
                                {driver.nome}
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
                  name="messageTemplate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mensagem</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Escreva sua mensagem aqui..."
                          rows={6}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-4 rounded-md border p-4">
                       <FormField
                        control={form.control}
                        name="sendNow"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between">
                            <div className="space-y-0.5">
                              <FormLabel>Enviar Imediatamente</FormLabel>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      {!sendNow && (
                         <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="scheduledAt"
                              render={({ field }) => (
                                <FormItem className="flex flex-col">
                                  <FormLabel>Data</FormLabel>
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <FormControl>
                                        <Button
                                          variant={"outline"}
                                          className={cn(
                                            "pl-3 text-left font-normal",
                                            !field.value && "text-muted-foreground"
                                          )}
                                        >
                                          {field.value ? (
                                            format(field.value, "dd/MM/yyyy")
                                          ) : (
                                            <span>Escolha uma data</span>
                                          )}
                                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                      </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                      <CalendarComponent
                                        mode="single"
                                        selected={field.value}
                                        onSelect={field.onChange}
                                        disabled={(date) =>
                                          date < new Date(new Date().setHours(0,0,0,0))
                                        }
                                        initialFocus
                                      />
                                    </PopoverContent>
                                  </Popover>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                             <FormItem>
                                <FormLabel>Hora</FormLabel>
                                <FormControl>
                                  <Input type="time" defaultValue={format(form.getValues('scheduledAt'), "HH:mm")} onChange={(e) => {
                                      const [hours, minutes] = e.target.value.split(':').map(Number);
                                      const newDate = new Date(form.getValues('scheduledAt'));
                                      newDate.setHours(hours, minutes);
                                      form.setValue('scheduledAt', newDate);
                                  }} />
                                </FormControl>
                            </FormItem>
                         </div>
                      )}
                    </div>
                     <div className="space-y-4 rounded-md border p-4">
                       <FormField
                        control={form.control}
                        name="includeGeo"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between">
                            <div className="space-y-0.5">
                              <FormLabel>Incluir Ponto de Encontro?</FormLabel>
                               <p className="text-xs text-muted-foreground">
                                Anexa a sua localização atual como link na mensagem.
                              </p>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                     </div>
                 </div>

                <div className="flex justify-end">
                    <Button type="submit" disabled={isBuildingPreview || form.formState.isSubmitting}>
                        {isBuildingPreview ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                        Agendar / Visualizar Envio
                    </Button>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
      
      {preview && (
        <AlertDialog open={!!preview} onOpenChange={() => setPreview(null)}>
            <AlertDialogContent className="max-w-2xl">
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar e Agendar Campanha?</AlertDialogTitle>
                    <AlertDialogDescription>
                        A campanha será agendada para <span className="font-bold">{form.getValues('city') || 'Todos os Clientes'}</span>.
                        Serão notificados <span className="font-bold">{preview.clients.length} clientes</span>.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="max-h-80 overflow-y-auto space-y-4 pr-4">
                  <div>
                    <h4 className="font-semibold mb-2">Pré-visualização da Mensagem:</h4>
                    <p className="text-sm bg-muted p-3 rounded-md whitespace-pre-wrap">
                      {preview.message.replace('{cliente}', preview.clients[0]?.nome || 'Cliente Exemplo')}
                    </p>
                  </div>
                   <div>
                    <h4 className="font-semibold mb-2">Primeiros clientes na lista:</h4>
                     <ul className="text-sm text-muted-foreground list-disc list-inside">
                        {preview.clients.slice(0,5).map(c => <li key={c.id}>{c.nome}</li>)}
                        {preview.clients.length > 5 && <li>e mais {preview.clients.length - 5}...</li>}
                    </ul>
                  </div>
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmAndSchedule} disabled={form.formState.isSubmitting}>
                         {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Confirmar e Agendar"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )}
    </>
  )
}

type FoundClient = Client & { distance: number };

function RadarTab({ clients, isUserLoading }: { clients: Client[], isUserLoading: boolean }) {
    const { toast } = useToast();
    const firestore = useFirestore();
    const [isSearching, setIsSearching] = useState(false);
    const [nearbyClients, setNearbyClients] = useState<FoundClient[]>([]);
    const [searchRadius, setSearchRadius] = useState<number>(5);

    const haversineDistance = (coords1: {lat: number, lng: number}, coords2: {lat: number, lng: number}) => {
        const R = 6371; // Radius of the Earth in km
        const dLat = (coords2.lat - coords1.lat) * Math.PI / 180;
        const dLon = (coords2.lng - coords1.lng) * Math.PI / 180;
        const a = 
            0.5 - Math.cos(dLat)/2 + 
            Math.cos(coords1.lat * Math.PI / 180) * Math.cos(coords2.lat * Math.PI / 180) * 
            (1 - Math.cos(dLon)) / 2;
        return R * 2 * Math.asin(Math.sqrt(a));
    };

    const handleSearchNearby = async () => {
        setIsSearching(true);
        setNearbyClients([]);
        
        if (!firestore) {
            toast({ variant: 'destructive', title: 'Erro de conexão' });
            setIsSearching(false);
            return;
        }

        try {
            const position = await getCurrentPosition();
            const myLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
            
            const foundClientsMap = new Map<string, FoundClient>();

            // Iterate through each client to fetch their addresses
            for (const client of clients) {
                const addressesCollection = collection(firestore, 'companies', COMPANY_ID, 'clients', client.id, 'addresses');
                const addressesSnapshot = await getDocs(addressesCollection);
                const clientAddresses = addressesSnapshot.docs.map(doc => doc.data() as Address);

                for (const address of clientAddresses) {
                     if (address.latitude && address.longitude) {
                        const clientLocation = { lat: address.latitude, lng: address.longitude };
                        const distance = haversineDistance(myLocation, clientLocation);

                        if (distance <= searchRadius) {
                            // If client is already found, check if this new address is closer
                            const existingClient = foundClientsMap.get(client.id);
                            if (!existingClient || distance < existingClient.distance) {
                                foundClientsMap.set(client.id, { ...client, distance });
                            }
                        }
                    }
                }
            }
            
            const foundClients = Array.from(foundClientsMap.values()).sort((a,b) => a.distance - b.distance);
            setNearbyClients(foundClients);
            
            if (foundClients.length === 0) {
                 toast({ title: 'Nenhum cliente próximo', description: `Nenhum cliente encontrado em um raio de ${searchRadius}km.` });
            }

        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Erro de Localização',
                description: error.message || 'Não foi possível obter sua localização.'
            });
        } finally {
            setIsSearching(false);
        }
    }
    
    const handleNotifyClient = (client: Client) => {
        const message = `Olá, ${client.nome}! Estou aqui perto de você hoje. Gostaria de aproveitar para fazer um pedido?`;
        openWhatsApp(client.telefone, message);
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Radar de Oportunidade</CardTitle>
                <CardDescription>
                    Encontre clientes próximos à sua localização atual e envie um aviso rápido.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                 <Alert>
                    <Radar className="h-4 w-4" />
                    <AlertTitle>Como Funciona?</AlertTitle>
                    <AlertDescription>
                        Use sua localização para encontrar clientes em um raio de até 20km. Ideal para motoristas em rota que desejam aproveitar oportunidades de novas entregas.
                    </AlertDescription>
                </Alert>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                     <Select onValueChange={(val) => setSearchRadius(Number(val))} defaultValue={searchRadius.toString()}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue placeholder="Raio de busca" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="5">Raio de 5 km</SelectItem>
                            <SelectItem value="10">Raio de 10 km</SelectItem>
                            <SelectItem value="20">Raio de 20 km</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button size="lg" onClick={handleSearchNearby} disabled={isSearching || isUserLoading} className="w-full sm:w-auto">
                        {isSearching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                        Buscar Clientes Próximos
                    </Button>
                </div>

                {(isSearching || nearbyClients.length > 0) && (
                    <div className="space-y-4">
                         <h3 className="text-lg font-medium text-center">
                            {isSearching ? 'Buscando...' : `Clientes encontrados (${nearbyClients.length})`}
                        </h3>

                        {isSearching ? (
                            <div className="space-y-4">
                                <Skeleton className="h-16 w-full" />
                                <Skeleton className="h-16 w-full" />
                                <Skeleton className="h-16 w-full" />
                            </div>
                        ) : (
                             <ul className="space-y-3 max-h-96 overflow-y-auto pr-2">
                                {nearbyClients.map(client => (
                                    <li key={client.id} className="flex items-center justify-between rounded-md border p-4">
                                        <div className="flex items-center gap-4">
                                            <Avatar>
                                                <AvatarFallback><User /></AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1">
                                                <p className="font-semibold">{client.nome}</p>
                                                <p className="text-sm text-muted-foreground">{client.telefone}</p>
                                            </div>
                                        </div>
                                         <div className="flex items-center gap-4">
                                             <div className="text-right">
                                                <div className="font-bold text-lg">{client.distance.toFixed(1)} km</div>
                                                <div className="text-xs text-muted-foreground">distância</div>
                                             </div>
                                            <Button size="sm" variant="outline" onClick={() => handleNotifyClient(client)}>
                                                <WhatsApp className="mr-2" />
                                                Notificar
                                            </Button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

    