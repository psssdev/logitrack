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
import { addDoc, collection, serverTimestamp, Timestamp } from 'firebase/firestore';
import { CalendarIcon, Loader2, ChevronsUpDown, Check } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import type { FinancialCategory, Vehicle, Client } from '@/lib/types';
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

type NewFinancialEntryFormValues = z.infer<typeof financialEntrySchema>;

const COMPANY_ID = '1';

export function NewFinancialEntryForm({ categories, vehicles, clients }: { categories: FinancialCategory[], vehicles: Vehicle[], clients: Client[] }) {
  const { toast } = useToast();
  const router = useRouter();
  const firestore = useFirestore();
  const [popoverOpen, setPopoverOpen] = React.useState(false);

  const form = useForm<NewFinancialEntryFormValues>({
    resolver: zodResolver(financialEntrySchema.omit({ id: true })),
    defaultValues: {
      description: '',
      type: 'Entrada', // Hardcoded to 'Entrada'
      amount: 0,
      date: new Date(),
    },
  });

  const selectedClientId = form.watch('clientId');

  React.useEffect(() => {
    if (selectedClientId) {
        const client = clients.find(c => c.id === selectedClientId);
        if (client) {
            form.setValue('description', `Venda de Passagem para ${client.nome}`);
        }
    }
  }, [selectedClientId, clients, form]);

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

      await addDoc(entriesCollection, {
        ...data,
        clientName: client ? client.nome : undefined,
        date: Timestamp.fromDate(data.date),
        amount: Math.abs(data.amount), // Ensure amount is positive
        createdAt: serverTimestamp(),
      });

      await triggerRevalidation('/financeiro');

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
                    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
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
                                    setPopoverOpen(false);
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
                  <Input placeholder="Ex: Venda de passagem..." {...field} />
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
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories.filter(c => c.type === 'Entrada').map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

         <FormField
            control={form.control}
            name="vehicleId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Veículo (Opcional)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Associar a um veículo..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                     <SelectItem value="none">Nenhum</SelectItem>
                    {vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.modelo} ({v.placa})</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

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
            {form.formState.isSubmitting ? (
              <Loader2 className="animate-spin" />
            ) : (
              'Salvar Receita'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
