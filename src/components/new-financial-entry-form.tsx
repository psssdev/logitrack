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
import { financialEntrySchema } from '@/lib/schemas';
import { useFirestore } from '@/firebase';
import { addDoc, collection, serverTimestamp, Timestamp, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { CalendarIcon, Loader2, ChevronsUpDown, Check } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import type { Vehicle, Client } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
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
import { Separator } from './ui/separator';

type NewFinancialEntryFormValues = z.infer<typeof financialEntrySchema>;

const COMPANY_ID = '1';

const incomeCategories = [
    { id: 'venda-passagem', name: 'Venda de Passagem' },
    { id: 'encomendas', name: 'Encomendas' },
    { id: 'outras-receitas', name: 'Outras Receitas' },
];


export function NewFinancialEntryForm({ vehicles, clients }: { vehicles: Vehicle[], clients: Client[] }) {
  const { toast } = useToast();
  const router = useRouter();
  const firestore = useFirestore();
  const [clientPopoverOpen, setClientPopoverOpen] = React.useState(false);
  const [selectedSeats, setSelectedSeats] = React.useState<string[]>([]);

  const form = useForm<NewFinancialEntryFormValues>({
    resolver: zodResolver(financialEntrySchema.omit({ id: true })),
    defaultValues: {
      description: '',
      type: 'Entrada', // Hardcoded to 'Entrada'
      amount: 0,
      date: new Date(),
      categoryId: 'venda-passagem',
      selectedSeats: []
    },
  });

  const selectedClientId = form.watch('clientId');
  const selectedCategoryId = form.watch('categoryId');
  const selectedVehicleId = form.watch('vehicleId');

  const buses = React.useMemo(() => vehicles.filter(v => v.tipo === 'Ônibus'), [vehicles]);
  const selectedVehicle = React.useMemo(() => vehicles.find(v => v.id === selectedVehicleId), [vehicles, selectedVehicleId]);


  React.useEffect(() => {
    if (selectedClientId && selectedCategoryId === 'venda-passagem') {
        const client = clients.find(c => c.id === selectedClientId);
        if (client) {
            form.setValue('description', `Venda de Passagem para ${client.nome}`);
        }
    }
  }, [selectedClientId, selectedCategoryId, clients, form]);

  React.useEffect(() => {
    form.setValue('selectedSeats', selectedSeats);
  }, [selectedSeats, form]);


  async function onSubmit(data: Omit<NewFinancialEntryFormValues, 'id'>) {
    if (!firestore) {
      toast({
        variant: 'destructive',
        title: 'Erro de conexão',
        description: 'Não foi possível conectar ao banco de dados.',
      });
      return;
    }

    try {
      const entriesCollection = collection(firestore, 'companies', COMPANY_ID, 'financialEntries');
      
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
        date: Timestamp.fromDate(data.date),
        amount: Math.abs(data.amount), // Ensure amount is positive
        createdAt: serverTimestamp(),
      };
      if (notes) {
          entryData.notes = notes;
      }


      await addDoc(entriesCollection, entryData);
      
      // Update occupied seats on vehicle
      if (data.vehicleId && data.selectedSeats && data.selectedSeats.length > 0) {
        const vehicleRef = doc(firestore, 'companies', COMPANY_ID, 'vehicles', data.vehicleId);
        await updateDoc(vehicleRef, {
            occupiedSeats: arrayUnion(...data.selectedSeats)
        });
      }


      await triggerRevalidation('/financeiro');
      await triggerRevalidation('/veiculos');

      toast({
        title: 'Sucesso!',
        description: 'Nova receita registrada.',
      });
      router.push('/financeiro');
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-2">
           <FormField
            control={form.control}
            name="clientId"
            render={({ field }) => (
                <FormItem className="flex flex-col">
                    <FormLabel>Cliente (Opcional)</FormLabel>
                    <Popover open={clientPopoverOpen} onOpenChange={setClientPopoverOpen}>
                        <PopoverTrigger asChild>
                        <FormControl>
                            <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                                'w-full justify-between',
                                !field.value && 'text-muted-foreground'
                            )}
                            >
                            {field.value
                                ? clients.find((client) => client.id === field.value)
                                    ?.nome
                                : 'Associar a um cliente...'}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                            <CommandInput placeholder="Buscar cliente..." />
                            <CommandList>
                            <CommandEmpty>
                                <div className="p-4 text-center text-sm">
                                <p>Nenhum cliente encontrado.</p>
                                <Button variant="link" asChild className="mt-2">
                                    <Link href="/clientes/novo">
                                    Cadastrar novo cliente
                                    </Link>
                                </Button>
                                </div>
                            </CommandEmpty>
                            <CommandGroup>
                                {clients.map((client) => (
                                <CommandItem
                                    value={client.nome}
                                    key={client.id}
                                    onSelect={() => {
                                    form.setValue('clientId', client.id);
                                    setClientPopoverOpen(false);
                                    }}
                                >
                                    <Check
                                    className={cn(
                                        'mr-2 h-4 w-4',
                                        client.id === field.value
                                        ? 'opacity-100'
                                        : 'opacity-0'
                                    )}
                                    />
                                    {client.nome}
                                </CommandItem>
                                ))}
                            </CommandGroup>
                            </CommandList>
                        </Command>
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                </FormItem>
            )}
           />
           <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor (R$) *</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="0.00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
         <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descrição *</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Venda de passagem..." {...field} disabled={selectedCategoryId === 'venda-passagem'}/>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

        <div className="grid gap-4 md:grid-cols-2">
            <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data da Transação</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP", { locale: ptBR })
                        ) : (
                          <span>Escolha uma data</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date > new Date() || date < new Date("1900-01-01")
                      }
                      initialFocus
                    />
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
                        <SelectTrigger>
                            <SelectValue placeholder="Selecione uma categoria" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {incomeCategories.map(c => (
                            <SelectItem key={c.id} value={c.id}>
                                {c.name}
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
            )}
           />
        </div>
        
        {selectedCategoryId === 'outras-receitas' && (
             <FormField
                control={form.control}
                name="otherCategoryDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição da Receita *</FormLabel>
                    <FormControl>
                      <Input placeholder="Especifique a natureza da receita" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
        )}


        <Separator />
        
        {selectedCategoryId === 'venda-passagem' && (
            <div className='space-y-4'>
                <FormField
                    control={form.control}
                    name="vehicleId"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Ônibus *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="Selecione um ônibus para ver os assentos" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {buses.map(v => <SelectItem key={v.id} value={v.id}>{v.modelo} ({v.placa})</SelectItem>)}
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                
                {selectedVehicle && (
                    <BusSeatLayout 
                        vehicle={selectedVehicle}
                        selectedSeats={selectedSeats}
                        onSeatSelect={setSelectedSeats}
                    />
                )}
            </div>
        )}

         <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
            <FormItem>
              <FormLabel>Notas</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Informações adicionais sobre a receita."
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />


        <div className="flex justify-end pt-4">
          <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : 'Salvar Receita'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
