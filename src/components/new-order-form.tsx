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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { newOrderSchema } from '@/lib/schemas';
import type { NewOrder, Client, Address } from '@/lib/types';
import { createOrder, getAddressesByClientId } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { drivers } from '@/lib/data';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ChevronsUpDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const paymentMethodLabels = {
  pix: 'PIX',
  dinheiro: 'Dinheiro',
  cartao: 'Cartão',
  boleto: 'Boleto',
  link: 'Link de Pagamento',
};

export function NewOrderForm({ clients }: { clients: Client[] }) {
  const { toast } = useToast();
  const router = useRouter();
  const [popoverOpen, setPopoverOpen] = React.useState(false);
  const [addresses, setAddresses] = React.useState<Address[]>([]);
  const [loadingAddresses, setLoadingAddresses] = React.useState(false);

  const form = useForm<NewOrder>({
    resolver: zodResolver(newOrderSchema),
    defaultValues: {
      origem: '',
      destino: '',
      valorEntrega: 0,
      formaPagamento: 'pix',
      observacao: '',
      motoristaId: undefined,
    },
  });

  async function onSubmit(data: NewOrder) {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });

    const result = await createOrder(formData);

    if (result?.message.includes('sucesso')) {
      toast({
        title: 'Sucesso!',
        description: 'Encomenda criada e cliente notificado.',
      });
      router.push('/encomendas');
    } else {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar encomenda.',
        description: result?.message || 'Ocorreu um erro desconhecido.',
      });
    }
  }

  const selectedClientId = form.watch('clientId');

  React.useEffect(() => {
    if (selectedClientId) {
      const client = clients.find((c) => c.id === selectedClientId);
      if (client) {
        form.setValue('nomeCliente', client.nome, { shouldValidate: true });
        form.setValue('telefone', client.telefone, { shouldValidate: true });

        const fetchAddresses = async () => {
            setLoadingAddresses(true);
            const clientAddresses = await getAddressesByClientId(client.id);
            setAddresses(clientAddresses);
            setLoadingAddresses(false);
        }
        fetchAddresses();
      }
    } else {
        setAddresses([]);
    }
  }, [selectedClientId, clients, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
        <FormField
          control={form.control}
          name="clientId"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Cliente *</FormLabel>
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
                        ? clients.find((client) => client.id === field.value)?.nome
                        : 'Selecione um cliente'}
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
                                <Link href="/clientes/novo">Cadastrar novo cliente</Link>
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
                            <div>
                                <p>{client.nome}</p>
                                <p className="text-xs text-muted-foreground">{client.telefone}</p>
                            </div>
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

        <div className="grid gap-4 md:grid-cols-2">
            <FormField
            control={form.control}
            name="origem"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Endereço de Origem *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!selectedClientId || loadingAddresses}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder={loadingAddresses ? "Carregando..." : "Selecione um endereço"} />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                    {addresses.map(address => (
                        <SelectItem key={address.id} value={address.fullAddress}>
                        {address.label} - {address.fullAddress}
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
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!selectedClientId || loadingAddresses}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder={loadingAddresses ? "Carregando..." : "Selecione um endereço"} />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                    {addresses.map(address => (
                        <SelectItem key={address.id} value={address.fullAddress}>
                         {address.label} - {address.fullAddress}
                        </SelectItem>
                    ))}
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
            name="valorEntrega"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor da Entrega *</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} onChange={e => field.onChange(e.target.valueAsNumber)} />
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
          <FormField
            control={form.control}
            name="motoristaId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Motorista</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Atribuir motorista..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {drivers.map((driver) => (
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
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end">
          <Button
            type="submit"
            size="lg"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting
              ? 'Salvando...'
              : 'Salvar & Notificar WhatsApp'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
