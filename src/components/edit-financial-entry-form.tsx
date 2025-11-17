
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
import { editFinancialEntrySchema } from '@/lib/schemas';
import { useFirestore } from '@/firebase';
import { updateDoc, doc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { CalendarIcon, Loader2, ChevronsUpDown, Check } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import type { Vehicle, Client, FinancialEntry, PaymentMethod, FinancialCategory, Driver } from '@/lib/types';
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

type EditFinancialEntryFormValues = Omit<FinancialEntry, 'id' | 'date' | 'travelDate'> & { date?: Date, travelDate?: Date };

const COMPANY_ID = '1';

const paymentMethodLabels: Record<PaymentMethod, string> = {
  pix: 'PIX',
  dinheiro: 'Dinheiro',
  cartao: 'Cartão',
  boleto: 'Boleto',
  link: 'Link',
  haver: 'A Haver',
};


export function EditFinancialEntryForm({ entry, vehicles, clients, categories, drivers }: { entry: FinancialEntry, vehicles: Vehicle[], clients: Client[], categories: FinancialCategory[], drivers: Driver[] }) {
  const { toast } = useToast();
  const router = useRouter();
  const firestore = useFirestore();
  const [clientPopoverOpen, setClientPopoverOpen] = React.useState(false);

  const form = useForm<EditFinancialEntryFormValues>({
    resolver: zodResolver(editFinancialEntrySchema),
    defaultValues: {
      ...entry,
      date: entry.date instanceof Timestamp ? entry.date.toDate() : (entry.date ? new Date(entry.date) : undefined),
      travelDate: entry.travelDate instanceof Timestamp ? entry.travelDate.toDate() : (entry.travelDate ? new Date(entry.travelDate) : undefined),
    },
  });

  const selectedCategoryId = form.watch('categoryId');

  async function onSubmit(data: EditFinancialEntryFormValues) {
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Erro de conexão' });
      return;
    }

    try {
      const entryRef = doc(firestore, 'companies', COMPANY_ID, 'financialEntries', entry.id);
      
      const client = data.clientId ? clients.find(c => c.id === data.clientId) : null;
      const driver = data.driverId ? drivers.find(d => d.id === data.driverId) : null;
      
      let finalDescription = data.description;
      if (data.categoryId === 'outras-receitas' && data.otherCategoryDescription) {
        finalDescription = data.otherCategoryDescription;
      }
      
      const { notes, ...restOfData } = data;
      const entryData: any = {
        ...restOfData,
        description: finalDescription,
        clientName: client ? client.nome : undefined,
        driverName: driver ? driver.nome : undefined,
        date: data.date ? Timestamp.fromDate(data.date) : serverTimestamp(),
        travelDate: data.travelDate ? Timestamp.fromDate(data.travelDate) : undefined,
        amount: Math.abs(data.amount),
        updatedAt: serverTimestamp(),
      };
      
      if (notes) {
          entryData.notes = notes;
      }

      await updateDoc(entryRef, entryData);

      await triggerRevalidation('/financeiro');

      toast({
        title: 'Sucesso!',
        description: 'Lançamento atualizado.',
      });
      router.push('/financeiro');
    } catch (error: any) {
      console.error('Error updating financial entry:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar lançamento.',
        description: error.message || 'Ocorreu um erro desconhecido.',
      });
    }
  }

  const availableCategories = React.useMemo(() => {
    if (!categories) return [];
    return [...categories]
      .filter(c => c.type === entry.type)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [categories, entry.type]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
             <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                <FormItem className="flex flex-col">
                    <FormLabel>Data da Transação</FormLabel>
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
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                            {availableCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
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
        </div>

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
        
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
                control={form.control}
                name="driverId"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Motorista (Opcional)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                            <FormControl>
                            <SelectTrigger><SelectValue placeholder="Selecione um motorista" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="">Nenhum</SelectItem>
                                {drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>

        <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="ghost" asChild>
                <Link href="/financeiro">Cancelar</Link>
            </Button>
            <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : 'Salvar Alterações'}
            </Button>
        </div>

      </form>
    </Form>
  );
}
