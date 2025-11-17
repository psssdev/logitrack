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
import { baseFinancialEntrySchema } from '@/lib/schemas';
import { useFirestore } from '@/firebase';
import { addDoc, collection, serverTimestamp, Timestamp } from 'firebase/firestore';
import { CalendarIcon, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import type { Vehicle, FinancialCategory, FinancialEntry, Driver } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Textarea } from './ui/textarea';
import Link from 'next/link';

type NewExpenseFormValues = Omit<FinancialEntry, 'id' | 'date'> & { date: Date };

const COMPANY_ID = '1';

export function NewExpenseForm({ categories, vehicles, drivers }: { categories: FinancialCategory[], vehicles: Vehicle[], drivers: Driver[] }) {
  const { toast } = useToast();
  const router = useRouter();
  const firestore = useFirestore();

  const form = useForm<NewExpenseFormValues>({
    resolver: zodResolver(baseFinancialEntrySchema),
    defaultValues: {
      description: '',
      type: 'Saída',
      amount: 0,
      date: new Date(),
      categoryId: '',
      otherCategoryDescription: '',
      vehicleId: '',
      driverId: '',
      notes: '',
    },
  });
  
  const selectedCategoryId = form.watch('categoryId');

  // Sort categories client-side
  const sortedCategories = React.useMemo(() => {
    if (!categories) return [];
    return [...categories].sort((a, b) => a.name.localeCompare(b.name));
  }, [categories]);

  async function onSubmit(data: NewExpenseFormValues) {
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Erro de conexão' });
      return;
    }

    try {
      const entriesCollection = collection(firestore, 'companies', COMPANY_ID, 'financialEntries');
      
      const category = categories.find(c => c.id === data.categoryId);
      const driver = drivers.find(d => d.id === data.driverId);
      
      const entryData = {
        ...data,
        description: data.otherCategoryDescription || category?.name || data.description,
        date: Timestamp.fromDate(data.date),
        amount: Math.abs(data.amount),
        vehicleId: data.vehicleId || null,
        driverId: data.driverId || null,
        driverName: driver ? driver.nome : undefined,
        createdAt: serverTimestamp(),
      };

      await addDoc(entriesCollection, entryData);

      await triggerRevalidation('/financeiro');

      toast({
        title: 'Sucesso!',
        description: 'Nova despesa registrada.',
      });
      router.push('/financeiro');
    } catch (error: any) {
      console.error('Error creating financial entry:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao registrar despesa.',
        description: error.message || 'Ocorreu um erro desconhecido.',
      });
    }
  }

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
                    <Input type="number" placeholder="0.00" {...field} onChange={e => field.onChange(e.target.valueAsNumber || 0)} autoFocus />
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
        
        <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Categoria *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                        <SelectTrigger><SelectValue placeholder="Selecione uma categoria de despesa" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {sortedCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            <SelectItem value="outra">Outra...</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
            )}
        />
        {selectedCategoryId === 'outra' && (
            <FormField
                control={form.control}
                name="otherCategoryDescription"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Especifique a Categoria *</FormLabel>
                        <FormControl><Input placeholder="Ex: Compra de pneu" {...field} value={field.value || ''} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        )}
        
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
                control={form.control}
                name="vehicleId"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Veículo (Opcional)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                            <SelectTrigger><SelectValue placeholder="Selecione um veículo para associar" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="nenhum">Nenhum</SelectItem>
                                {vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.modelo} ({v.placa})</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="driverId"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Motorista (Opcional)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                            <SelectTrigger><SelectValue placeholder="Selecione um motorista para associar" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="nenhum">Nenhum</SelectItem>
                                {drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>

         <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
            <FormItem>
            <FormLabel>Notas</FormLabel>
            <FormControl>
                <Textarea placeholder="Informações adicionais sobre a despesa..." className="resize-none" {...field} value={field.value ?? ''} />
            </FormControl>
            <FormMessage />
            </FormItem>
        )}
        />

        <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="ghost" asChild>
                <Link href="/financeiro">Cancelar</Link>
            </Button>
            <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : 'Salvar Despesa'}
            </Button>
        </div>

      </form>
    </Form>
  );
}
