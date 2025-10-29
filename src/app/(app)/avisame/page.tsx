'use client';
import { useState, useMemo } from 'react';
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
import type { Order } from '@/lib/types';
import { collection, query, where } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Megaphone, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const COMPANY_ID = '1';

export default function AvisamePage() {
  const firestore = useFirestore();
  const { isUserLoading } = useUser();
  const { toast } = useToast();
  
  const [selectedCity, setSelectedCity] = useState('');
  const [message, setMessage] = useState('Olá! Estaremos fazendo entregas na sua cidade em breve. Aproveite para fazer seu pedido!');
  const [isSending, setIsSending] = useState(false);

  const ordersQuery = useMemoFirebase(() => {
    if (!firestore || isUserLoading) return null;
    return query(collection(firestore, 'companies', COMPANY_ID, 'orders'));
  }, [firestore, isUserLoading]);

  const { data: orders, isLoading } = useCollection<Order>(ordersQuery);

  const uniqueCities = useMemo(() => {
    if (!orders) return [];
    const cities = orders.map((order) => {
        // Simple city extraction from a full address string
        const parts = order.destino.split(',');
        return parts.length > 2 ? parts[parts.length - 2].trim() : 'Desconhecida';
    });
    return [...new Set(cities)].sort();
  }, [orders]);
  
  const handleSendNotifications = async () => {
    if (!selectedCity || !message) {
      toast({
        variant: 'destructive',
        title: 'Campos incompletos',
        description: 'Por favor, selecione uma cidade e escreva uma mensagem.',
      });
      return;
    }
    
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

    let successCount = 0;
    for (const client of clientsToNotify) {
        const personalizedMessage = message.replace('{cliente}', client.nomeCliente).replace('{cidade}', selectedCity);
        const cleanedPhone = client.telefone.replace(/\D/g, '');
        const fullPhone = cleanedPhone.startsWith('55') ? cleanedPhone : `55${cleanedPhone}`;
        const url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(personalizedMessage)}`;
        
        // This will open a new tab for each client.
        // For a large number of clients, this can be overwhelming for the user.
        // In a real application, this should be handled by a backend service.
        window.open(url, '_blank');
        successCount++;
        // A small delay to prevent browsers from blocking too many popups
        await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    setIsSending(false);
    toast({
        title: 'Envio em massa concluído!',
        description: `${successCount} abas do WhatsApp foram abertas para envio.`,
    });
  };

  const pageIsLoading = isLoading || isUserLoading;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center">
        <h1 className="flex-1 text-2xl font-semibold md:text-3xl">Avisame</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Notificações em Massa</CardTitle>
          <CardDescription>
            Envie um aviso via WhatsApp para todos os clientes de uma cidade
            específica.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <Alert>
                <Megaphone className="h-4 w-4" />
                <AlertTitle>Como Funciona?</AlertTitle>
                <AlertDescription>
                   Selecione uma cidade, escreva sua mensagem e clique em enviar. O sistema abrirá uma aba do WhatsApp para cada cliente encontrado na cidade selecionada. Use {'{cliente}'} e {'{cidade}'} para personalizar.
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
                <label className="text-sm font-medium">Mensagem</label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Escreva sua mensagem aqui..."
                  rows={5}
                />
              </div>
            </div>
          )}
           <div className="flex justify-end">
                <Button onClick={handleSendNotifications} disabled={pageIsLoading || isSending || !selectedCity || !message}>
                    {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Enviar Avisos
                </Button>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
