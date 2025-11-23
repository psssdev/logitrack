'use client';

import * as React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { editOrderSchema } from '@/lib/schemas';
import type { Order, Origin, Address, Driver } from '@/lib/types';
import { triggerRevalidation } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Loader2, Trash2, PlusCircle } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { updateDoc, collection, doc, query } from 'firebase/firestore';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';

type EditOrderFormValues = z.infer<typeof editOrderSchema>;

const paymentMethodLabels = {
  pix: 'PIX',
  dinheiro: 'Dinheiro',
  cartao: 'Cartão',
  boleto: 'Boleto',
  link: 'Link de Pagamento',
  haver: 'A Haver',
};

const formatCurrency = (value: number | undefined) => {
  if (typeof value !== 'number') return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export function EditOrderForm({
  order,
  origins,
}: {
  order: Order;
  origins: Origin[];
}) {
  const { toast } = useToast();
  const router = useRouter();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const form = useForm<EditOrderFormValues>({
    resolver: zodResolver(editOrderSchema),
    defaultValues: {
      origem: order.origem,
      destino: order.destino,
      items: order.items,
      formaPagamento: order.formaPagamento,
      observacao: order.observacao,
      numeroNota: order.numeroNota,
      motoristaId: order.motoristaId,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const items = form.watch('items');
  const totalValue = items.reduce(
    (acc, item) => acc + (item.quantity || 0) * (item.value || 0),
    0
  );

  const addressesQuery = useMemoFirebase(() => {
    if (!firestore || !order.clientId || isUserLoading || !user) return null;
    return query(
      collection(
        firestore,
        'clients',
        order.clientId,
        'addresses'
      )
    );
  }, [firestore, order.clientId, isUserLoading, user]);

  const { data: addresses, isLoading: loadingAddresses } =
    useCollection<Address>(addressesQuery);
    
    const { data: drivers, isLoading: loadingDrivers } = useCollection<Driver>(
        useMemoFirebase(() => {
            if(!firestore || !user || isUserLoading) return null;
            return collection(firestore, 'drivers');
        }, [firestore, user, isUserLoading])
    );

  async function onSubmit(data: EditOrderFormValues) {
    if (!firestore) {
      toast({
        variant: 'destructive',
        title: 'Erro de conexão',
        description: 'Não foi possível conectar ao banco de dados.',
      });
      return;
    }

    try {
      const orderRef = doc(
        firestore,
        'orders',
        order.id
      );

      const updatedData = {
        ...data,
        valorEntrega: totalValue,
      };

      await updateDoc(orderRef, updatedData);

      await triggerRevalidation(`/encomendas`);
      await triggerRevalidation(`/encomendas/${order.id}`);
      await triggerRevalidation('/inicio');

      toast({
        title: 'Sucesso!',
        description: 'Encomenda atualizada.',
      });
      router.push(`/encomendas/${order.id}`);
    } catch (error: any) {
      console.error('Error updating order:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar encomenda.',
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
            name="origem"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Endereço de Origem *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um endereço de origem" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {origins.map((origin) => (
                      <SelectItem key={origin.id} value={origin.address}>
                        {origin.name} - {origin.address}
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
            name="destino"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Endereço de Destino *</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={loadingAddresses}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          loadingAddresses
                            ? 'Carregando endereços...'
                            : 'Selecione um endereço'
                        }
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {addresses && addresses.length > 0 ? (
                      addresses.map((address) => (
                        <SelectItem
                          key={address.id}
                          value={address.fullAddress}
                        >
                          {address.label} - {address.fullAddress}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-address" disabled>
                        {loadingAddresses
                          ? 'Carregando...'
                          : 'Nenhum endereço cadastrado'}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4">
          <div className="flex justify-between items-center">
            <FormLabel>Itens da Encomenda</FormLabel>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => append({ description: '', quantity: 1, value: 0 })}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Adicionar Item
            </Button>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/2">Descrição</TableHead>
                  <TableHead>Qtd.</TableHead>
                  <TableHead>Valor Unit.</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead>
                    <span className="sr-only">Ações</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field, index) => {
                  const item = items[index];
                  const subtotal = (item?.quantity || 0) * (item?.value || 0);

                  return (
                    <TableRow key={field.id}>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`items.${index}.description`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="Descrição do item"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`items.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  type="number"
                                  {...field}
                                  onChange={(e) =>
                                    field.onChange(e.target.valueAsNumber || 1)
                                  }
                                  className="w-20"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`items.${index}.value`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  type="number"
                                  {...field}
                                  onChange={(e) =>
                                    field.onChange(e.target.valueAsNumber || 0)
                                  }
                                  className="w-24"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(subtotal)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(index)}
                          disabled={fields.length <= 1}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3} className="font-semibold text-right">
                    Total
                  </TableCell>
                  <TableCell className="text-right font-bold text-lg">
                    {formatCurrency(totalValue)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="numeroNota"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Número da Nota</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Nº da nota fiscal"
                    {...field}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <FormField
            control={form.control}
            name="motoristaId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Motorista</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={loadingDrivers}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={loadingDrivers ? "Carregando..." : "Atribuir motorista..."} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
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
        </div>

        <FormField
          control={form.control}
          name="observacao"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observação</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Ex: Entregar na portaria, pacote frágil, etc."
                  className="resize-none"
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
          <Button
            type="submit"
            size="lg"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? (
              <Loader2 className="animate-spin" />
            ) : (
              'Salvar Alterações'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
