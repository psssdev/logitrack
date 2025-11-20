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
import { newFinancialEntrySchema } from '@/lib/schemas';
import { useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { addDoc, collection, serverTimestamp, Timestamp, query, where, getDocs, doc } from 'firebase/firestore';
import { CalendarIcon, Loader2, ChevronsUpDown, Check, Ticket, Wallet } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import type { Vehicle, Client, FinancialEntry, PaymentMethod, Destino, Address } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { cn } from '@/lib/utils';
import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Textarea } from './ui/textarea';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import Link from 'next/link';
import { BusSeatLayout } from './bus-seat-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from './ui/card';
import { Label } from './ui/label';
import { useCollection } from '@/firebase/firestore/use-collection';
import { pickNearestOrigin, type Origin as OriginPick, type ClientLite } from '@/lib/nearest-origin';
import { Badge } from './ui/badge';

type NewFinancialEntryFormValues = Omit<FinancialEntry, 'id' | 'date' | 'travelDate'> & { date?: Date, travelDate?: Date };

const incomeCategories = [
    { id: 'venda-passagem', name: 'Venda de Passagem' },
    { id: 'encomendas', name: 'Encomendas' },
    { id: 'outras-receitas', name: 'Outras Receitas' },
];

const paymentMethodLabels: Record<PaymentMethod, string> = {
  pix: 'PIX',
  dinheiro: 'Dinheiro',
  cartao: 'Cartão',
  boleto: 'Boleto',
  link: 'Link',
  haver: 'A Haver',
};


export function NewFinancialEntryForm({ vehicles, clients, origins, destinations }: { vehicles: Vehicle[], clients: Client[], origins: OriginPick[], destinations: Destino[] }) {
  const { toast } = useToast();
  const router = useRouter();
  const firestore = useFirestore();
  const { companyId } = useUser();
  const [clientPopoverOpen, setClientPopoverOpen] = React.useState(false);
  const [selectedSeats, setSelectedSeats] = React.useState<string[]>([]);
  const [passagemValue, setPassagemValue] = React.useState<number>(0);
  const [suggestMeta, setSuggestMeta] = React.useState<{ km: number; label: string } | null>(null);

  const form = useForm<NewFinancialEntryFormValues>({
    resolver: zodResolver(newFinancialEntrySchema),
    defaultValues: {
      description: '',
      type: 'Entrada', // Hardcoded to 'Entrada'
      amount: 0,
      categoryId: 'venda-passagem',
      selectedSeats: [],
      travelDate: new Date(),
      formaPagamento: 'pix',
      origin: '',
      destination: destinations?.[0]?.address || '',
    },
  });

  const selectedClientId = form.watch('clientId');
  const selectedCategoryId = form.watch('categoryId');
  const selectedVehicleId = form.watch('vehicleId');
  const travelDate = form.watch('travelDate');

  const buses = React.useMemo(() => vehicles.filter(v => v.tipo === 'Ônibus'), [vehicles]);
  const selectedVehicle = React.useMemo(() => vehicles.find(v => v.id === selectedVehicleId), [vehicles, selectedVehicleId]);
  
  // Fetch all sales for the selected vehicle
  const relevantSalesQuery = useMemoFirebase(() => {
    if (!firestore || !selectedVehicleId || !companyId) return null;
    return query(
        collection(firestore, 'companies', companyId, 'financialEntries'),
        where('vehicleId', '==', selectedVehicleId)
    );
  }, [firestore, selectedVehicleId, companyId]);

  const { data: relevantSales } = useCollection<FinancialEntry>(relevantSalesQuery);
  
  const dynamicallyOccupiedSeats = React.useMemo(() => {
    if (!relevantSales || !travelDate) return [];
    
    const salesForDate = relevantSales.filter(sale => 
        sale.travelDate && (isSameDay(sale.travelDate instanceof Timestamp ? sale.travelDate.toDate() : sale.travelDate, travelDate) || (sale.travelDate instanceof Timestamp ? sale.travelDate.toDate() : sale.travelDate) > travelDate)
    );

    return salesForDate.flatMap(sale => sale.selectedSeats || []);
  }, [relevantSales, travelDate]);


  React.useEffect(() => {
    async function fetchClientAddressesAndSuggestOrigin() {
        if (!selectedClientId || origins.length === 0 || !firestore || !companyId) {
            setSuggestMeta(null);
            return;
        };
        const clientRef = doc(firestore, 'companies', companyId, 'clients', selectedClientId);
        const addressesRef = collection(clientRef, 'addresses');
        
        try {
            const [clientSnap, addressesSnap] = await Promise.all([
                // We already have the client data, but let's imagine we need to fetch it all
                clients.find(c => c.id === selectedClientId),
                getDocs(addressesRef)
            ]);

            if (!clientSnap) return;

            const clientAddresses = addressesSnap.docs.map(d => ({...d.data(), id: d.id})) as Address[];
            
            const clientForPicking: ClientLite = {
                id: clientSnap.id,
                defaultOriginId: clientSnap.defaultOriginId,
                addresses: clientAddresses
            };
            
            const res = pickNearestOrigin(clientForPicking, origins);

            if (!res) {
                setSuggestMeta(null);
                if (clientSnap.defaultOriginId) {
                  const defaultOrigin = origins.find(o => o.id === clientSnap.defaultOriginId);
                  if (defaultOrigin) {
                    form.setValue('origin', defaultOrigin.id);
                  }
                }
                return;
            }

            const chosen = origins.find(o => o.id === res.originId);
            if (chosen) {
                form.setValue('origin', chosen.id); // auto-preenche
                const label = clientSnap.defaultOriginId
                ? `${chosen.name} (padrão do cliente)`
                : `${chosen.name} (~${res.km.toFixed(1)} km)`;
                setSuggestMeta({ km: res.km, label });
            } else {
                setSuggestMeta(null);
            }

        } catch (error) {
            console.error("Error suggesting origin:", error);
            setSuggestMeta(null);
        }
    }
    
    fetchClientAddressesAndSuggestOrigin();

  }, [selectedClientId, origins, firestore, form, clients, companyId]);


  // Auto-update description
  React.useEffect(() => {
    if (selectedClientId && selectedCategoryId === 'venda-passagem') {
        const client = clients.find(c => c.id === selectedClientId);
        const seatCount = selectedSeats.length;
        if (client) {
            const desc = `Venda de ${seatCount > 0 ? seatCount : ''} Passagem(ns) para ${client.nome}`.trim();
            form.setValue('description', desc);
        }
    } else if (selectedCategoryId !== 'outras-receitas') {
        const category = incomeCategories.find(c => c.id === selectedCategoryId);
        if (category) {
            form.setValue('description', category.name);
        }
    } else {
        form.setValue('description', '');
    }
  }, [selectedClientId, selectedCategoryId, selectedSeats, clients, form]);

  // Auto-update total amount based on seats and price
  React.useEffect(() => {
    if(selectedCategoryId === 'venda-passagem') {
      const totalAmount = selectedSeats.length * passagemValue;
      form.setValue('amount', totalAmount, { shouldValidate: true });
    }
  }, [selectedSeats, passagemValue, form, selectedCategoryId]);

  // Auto-update selectedSeats in form
  React.useEffect(() => {
    form.setValue('selectedSeats', selectedSeats, { shouldValidate: true });
  }, [selectedSeats, form]);

  async function onSubmit(data: NewFinancialEntryFormValues) {
    if (!firestore || !companyId) {
      toast({ variant: 'destructive', title: 'Erro de conexão' });
      return;
    }
    
    // Manual validation for passagem
    if (data.categoryId === 'venda-passagem' && data.amount <= 0) {
        form.setError('amount', { type: 'manual', message: 'O valor total da passagem deve ser maior que zero.' });
        return;
    }
    if(data.categoryId === 'venda-passagem' && (!data.selectedSeats || data.selectedSeats.length === 0)) {
        form.setError('selectedSeats', { type: 'manual', message: 'Selecione pelo menos um assento.' });
        return;
    }


    try {
      const entriesCollection = collection(firestore, 'companies', companyId, 'financialEntries');
      
      const client = data.clientId ? clients.find(c => c.id === data.clientId) : null;
      
      let finalDescription = data.description;
      if (data.categoryId === 'outras-receitas' && data.otherCategoryDescription) {
        finalDescription = data.otherCategoryDescription;
      }
      
      const { notes, ...restOfData } = data;
      const entryData: any = {
        ...restOfData,
        description: finalDescription,
        clientName: client ? client.nome : undefined,
        date: Timestamp.fromDate(new Date()), // Always use current date for transaction
        travelDate: data.travelDate ? Timestamp.fromDate(data.travelDate) : undefined,
        amount: Math.abs(data.amount),
        createdAt: serverTimestamp(),
      };
      
      if (notes) {
          entryData.notes = notes;
      }

      const newDocRef = await addDoc(entriesCollection, entryData);

      await triggerRevalidation('/financeiro');
      await triggerRevalidation('/veiculos');

      toast({
        title: 'Sucesso!',
        description: 'Venda de passagem registrada. Redirecionando para o comprovante...',
      });
      router.push(`/financeiro/comprovante/${newDocRef.id}`);
    } catch (error: any) {
      console.error('Error creating financial entry:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao registrar receita.',
        description: error.message || 'Ocorreu um erro desconhecido.',
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column */}
        <div className="lg:col-span-1 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Configuração da Venda</CardTitle>
                    <CardDescription>Selecione o cliente, categoria e veículo.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <FormField
                        control={form.control}
                        name="clientId"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Cliente *</FormLabel>
                                <Popover open={clientPopoverOpen} onOpenChange={setClientPopoverOpen}>
                                    <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button
                                        variant="outline"
                                        role="combobox"
                                        className={cn('w-full justify-between', !field.value && 'text-muted-foreground')}
                                        >
                                        {field.value ? clients.find((c) => c.id === field.value)?.nome : 'Associar a um cliente...'}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                    <Command>
                                        <CommandInput placeholder="Buscar cliente..." />
                                        <CommandList><CommandEmpty><div className="p-4 text-center text-sm"><p>Nenhum cliente encontrado.</p><Button variant="link" asChild className="mt-2"><Link href="/clientes/novo">Cadastrar novo cliente</Link></Button></div></CommandEmpty><CommandGroup>
                                            {clients.map((client) => (
                                            <CommandItem value={client.nome} key={client.id} onSelect={() => { form.setValue('clientId', client.id, { shouldValidate: true }); setClientPopoverOpen(false); }}>
                                                <Check className={cn('mr-2 h-4 w-4', client.id === field.value ? 'opacity-100' : 'opacity-0')} />
                                                {client.nome}
                                            </CommandItem>
                                            ))}
                                        </CommandGroup></CommandList>
                                    </Command>
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="categoryId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Categoria *</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                    <SelectTrigger><SelectValue placeholder="Selecione uma categoria" /></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    {incomeCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    {selectedCategoryId === 'venda-passagem' && (
                        <>
                        <FormField
                            control={form.control}
                            name="origin"
                            render={({ field }) => (
                            <FormItem>
                                <div className="flex items-center justify-between">
                                    <FormLabel>Origem *</FormLabel>
                                    {suggestMeta && (
                                        <Badge variant="secondary" className="text-xs">{suggestMeta.label}</Badge>
                                    )}
                                </div>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                    <SelectTrigger><SelectValue placeholder="Selecione a origem" /></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    {origins.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="destination"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Destino *</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                    <SelectTrigger><SelectValue placeholder="Selecione o destino" /></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    {destinations.map(d => <SelectItem key={d.id} value={d.address}>{d.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="vehicleId"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Ônibus *</FormLabel>
                                <Select onValueChange={(value) => { field.onChange(value); setSelectedSeats([]); }} value={field.value}>
                                <FormControl>
                                    <SelectTrigger><SelectValue placeholder="Selecione um ônibus" /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {buses.map(v => <SelectItem key={v.id} value={v.id}>{v.modelo} ({v.placa})</SelectItem>)}
                                </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        </>
                    )}
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Pagamento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                     {selectedCategoryId === 'venda-passagem' ? (
                        <div className="space-y-2">
                            <Label htmlFor="passagemValue">Valor por Passagem (R$)</Label>
                            <Input id="passagemValue" type="number" value={passagemValue} onChange={(e) => setPassagemValue(e.target.valueAsNumber || 0)} />
                        </div>
                     ) : (
                        <FormField
                            control={form.control}
                            name="amount"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Valor (R$) *</FormLabel>
                                <FormControl>
                                <Input type="number" placeholder="0.00" {...field} onChange={e => field.onChange(e.target.valueAsNumber || 0)} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                     )}
                     
                    <FormField
                        control={form.control}
                        name="formaPagamento"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Forma de Pagamento *</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {Object.entries(paymentMethodLabels).map(
                                  ([key, label]) => (
                                    <SelectItem key={key} value={key}>
                                      {label}
                                    </SelectItem>
                                  )
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />


                    {selectedCategoryId === 'venda-passagem' && (
                        <FormField
                            control={form.control}
                            name="travelDate"
                            render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Data da Viagem</FormLabel>
                                <Popover>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                    <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                        {field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus/>
                                </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    )}
                </CardContent>
             </Card>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 space-y-6">
           {selectedCategoryId === 'venda-passagem' ? (
             <>
              {selectedVehicle ? (
                <BusSeatLayout 
                    vehicle={selectedVehicle}
                    occupiedSeats={dynamicallyOccupiedSeats}
                    selectedSeats={selectedSeats}
                    onSeatSelect={setSelectedSeats}
                />
              ) : (
                <Card className="flex items-center justify-center min-h-[300px] border-dashed">
                    <p className="text-muted-foreground">Selecione um ônibus para ver os assentos.</p>
                </Card>
              )}
               {form.formState.errors.selectedSeats && <p className="text-sm font-medium text-destructive">{form.formState.errors.selectedSeats.message}</p>}
             </>
           ) : (
             <Card>
                <CardHeader>
                    <CardTitle>Detalhes da Receita</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {selectedCategoryId === 'outras-receitas' ? (
                        <FormField
                            control={form.control}
                            name="otherCategoryDescription"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Especifique a Receita *</FormLabel>
                                <FormControl><Input placeholder="Ex: Venda de sucata" {...field} value={field.value || ''} /></FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    ) : (
                         <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Descrição *</FormLabel>
                                <FormControl><Input placeholder="Ex: Recebimento de frete" {...field} value={field.value || ''} /></FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    )}
                     <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                        <FormItem>
                        <FormLabel>Notas</FormLabel>
                        <FormControl>
                            <Textarea placeholder="Informações adicionais..." className="resize-none" {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </CardContent>
             </Card>
           )}

           <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Ticket className="h-5 w-5" /> Resumo da Venda</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Cliente:</span>
                            <span className="font-medium">{selectedClientId ? clients.find(c => c.id === selectedClientId)?.nome : 'Não selecionado'}</span>
                        </div>
                         {selectedCategoryId === 'venda-passagem' && (
                             <div className="flex justify-between">
                                <span className="text-muted-foreground">Assentos Selecionados:</span>
                                <span className="font-medium">{selectedSeats.length > 0 ? selectedSeats.join(', ') : 'Nenhum'}</span>
                             </div>
                         )}
                         <div className="flex justify-between items-center pt-4 border-t">
                            <span className="text-base font-semibold">Total a Pagar:</span>
                            <span className="text-2xl font-bold text-primary">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(form.getValues('amount'))}</span>
                         </div>
                         {form.formState.errors.amount && <p className="text-sm font-medium text-destructive text-right">{form.formState.errors.amount.message}</p>}
                    </div>
                </CardContent>
                <CardFooter>
                    <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : <><Wallet className="mr-2"/>Finalizar Venda</>}
                    </Button>
                </CardFooter>
           </Card>
        </div>

      </form>
    </Form>
  );
}
