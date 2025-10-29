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
import type { Order, Driver } from '@/lib/types';
import { collection, query } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Megaphone, Send, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getDrivers } from '@/lib/actions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const COMPANY_ID = '1';

// Snippets do plano do usuário
function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Geolocalização indisponível'));
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 8000,
      maximumAge: 60000
    });
  });
}

function mapsLink(lat: number, lng: number) {
  return `https://maps.google.com/?q=${lat},${lng}`;
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
  const { isUserLoading } = useUser();
  const { toast } = useToast();

  const [selectedCity, setSelectedCity] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [message, setMessage] = useState('Olá, {cliente}! Estaremos com entregas em {cidade} em breve.\nMotorista: {motorista_nome} ({motorista_telefone})\n{ponto_encontro}\nSe quiser, me chama por aqui e já separo seu pedido 🙂');
  const [isSending, setIsSending] = useState(false);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isLoadingDrivers, setIsLoadingDrivers] = useState(true);

  useEffect(() => {
    async function fetchDrivers() {
      setIsLoadingDrivers(true);
      const fetchedDrivers = await getDrivers();
      setDrivers(fetchedDrivers);
      setIsLoadingDrivers(false);
    }
    fetchDrivers();
  }, []);

  const ordersQuery = useMemoFirebase(() => {
    if (!firestore || isUserLoading) return null;
    return query(collection(firestore, 'companies', COMPANY_ID, 'orders'));
  }, [firestore, isUserLoading]);

  const { data: orders, isLoading: isLoadingOrders } = useCollection<Order>(ordersQuery);

  const uniqueCities = useMemo(() => {
    if (!orders) return [];
    const cities = orders.map((order) => {
        const parts = order.destino.split(',');
        // Tenta pegar a antepenúltima parte (cidade) de um endereço completo
        return parts.length > 2 ? parts[parts.length - 2].trim() : 'Desconhecida';
    });
    return [...new Set(cities)].filter(city => city !== 'Desconhecida').sort();
  }, [orders]);

  const handleSend = async (includeLocation: boolean) => {
    setIsSending(true);

    const clientsToNotify = orders
      ?.filter(order => order.destino.includes(selectedCity))
      .reduce((acc, order) => {
          if (!acc.find(c => c.telefone === order.telefone)) {
              acc.push({ nomeCliente: order.nomeCliente, telefone: order.telefone });
          }
          return acc;
      }, [] as { nomeCliente: string, telefone: string }[]);

    if (!clientsToNotify || clientsToNotify.length === 0) {
      toast({
        title: 'Nenhum cliente',
        description: `Nenhum cliente encontrado para a cidade de ${selectedCity}.`,
      });
      setIsSending(false);
      return;
    }

    let locationText = '';
    if (includeLocation) {
        try {
            const position = await getCurrentPosition();
            const { latitude, longitude } = position.coords;
            locationText = `Ponto de encontro: ${mapsLink(latitude, longitude)}`;
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Erro de Localização',
                description: error.message || 'Não foi possível obter sua localização. Verifique as permissões do navegador.'
            });
            setIsSending(false);
            return;
        }
    }
    
    const driver = drivers.find(d => d.id === selectedDriverId);

    let successCount = 0;
    for (const client of clientsToNotify) {
        const vars: Vars = {
            cliente: client.nomeCliente,
            cidade: selectedCity,
            motorista_nome: driver?.nome ?? '',
            motorista_telefone: driver?.telefone ?? '',
            ponto_encontro: locationText
        };
        
        const finalMessage = renderTemplate(message, vars);
        
        const cleanedPhone = client.telefone.replace(/\D/g, '');
        const fullPhone = cleanedPhone.startsWith('55') ? cleanedPhone : `55${cleanedPhone}`;
        const url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(finalMessage)}`;
        
        window.open(url, '_blank');
        successCount++;
        await new Promise(resolve => setTimeout(resolve, 300)); // Pequena pausa
    }
    
    setIsSending(false);
    toast({
        title: 'Envio em massa concluído!',
        description: `${successCount} abas do WhatsApp foram abertas para envio.`,
    });
  };

  const pageIsLoading = isLoadingOrders || isUserLoading || isLoadingDrivers;
  const canSend = !pageIsLoading && !isSending && !!selectedCity && !!message;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center">
        <h1 className="flex-1 text-2xl font-semibold md:text-3xl">Avisame</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Notificações em Massa</CardTitle>
          <CardDescription>
            Envie um aviso via WhatsApp para todos os clientes de uma cidade específica.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <Alert>
                <Megaphone className="h-4 w-4" />
                <AlertTitle>Como Funciona?</AlertTitle>
                <AlertDescription>
                   Selecione uma cidade, um motorista (opcional) e escreva sua mensagem. Use {'{cliente}'}, {'{cidade}'}, {'{motorista_nome}'}, {'{motorista_telefone}'} e {'{ponto_encontro}'} para personalizar. Ao enviar, você poderá incluir sua localização atual como ponto de encontro.
                </AlertDescription>
            </Alert>
          {pageIsLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Cidade de Destino</label>
                <Select onValueChange={setSelectedCity} value={selectedCity}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma cidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueCities.map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
               <div className="space-y-2">
                <label className="text-sm font-medium">Motorista (Opcional)</label>
                <Select onValueChange={setSelectedDriverId} value={selectedDriverId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um motorista" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {drivers.map((driver) => (
                      <SelectItem key={driver.id} value={driver.id}>
                        {driver.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-medium">Mensagem</label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Escreva sua mensagem aqui..."
                  rows={6}
                />
              </div>
            </div>
          )}
           <div className="flex justify-end">
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                         <Button disabled={!canSend}>
                            {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                            Enviar Avisos
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Compartilhar Localização?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Deseja incluir sua localização atual como um ponto de encontro na mensagem?
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleSend(false)} disabled={isSending}>
                           {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Não, Enviar sem Localização"}
                        </AlertDialogAction>
                         <AlertDialogAction onClick={() => handleSend(true)} disabled={isSending} className="bg-blue-600 hover:bg-blue-700">
                            {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <><MapPin className="mr-2 h-4 w-4" /> Sim, Incluir Localização</>}
                        </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
