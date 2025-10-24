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
import type { NewOrder, Client, Address, Origin } from '@/lib/types';
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
import { ChevronsUpDown, Check, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from './ui/dialog';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

const paymentMethodLabels = {
  pix: 'PIX',
  dinheiro: 'Dinheiro',
  cartao: 'Cartão',
  boleto: 'Boleto',
  link: 'Link de Pagamento',
};

export function NewOrderForm({
  clients,
  origins,
}: {
  clients: Client[];
  origins: Origin[];
}) {
  const { toast } = useToast();
  const router = useRouter();
  const [popoverOpen, setPopoverOpen] = React.useState(false);
  const [addresses, setAddresses] = React.useState<Address[]>([]);
  const [loadingAddresses, setLoadingAddresses] = React.useState(false);
  const [hasCameraPermission, setHasCameraPermission] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  const handleScanSuccess = (scannedValue: string) => {
    form.setValue('numeroNota', scannedValue);
    toast({
      title: 'Código lido com sucesso!',
      description: `Número da nota: ${scannedValue}`,
    });
    // Close dialog
    // In a real implementation you might need to find a way to close the dialog from here.
    // For now, the user has to close it manually.
  };

  const handleOpenScanner = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setHasCameraPermission(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      // NOTE: In a real implementation, you would start a barcode scanning library here.
      // For now, we will simulate a scan after 5 seconds.
      setTimeout(() => {
        handleScanSuccess(Math.random().toString(36).substring(2).toUpperCase());
      }, 5000);
    } catch (error) {
      console.error('Error accessing camera:', error);
      setHasCameraPermission(false);
      toast({
        variant: 'destructive',
        title: 'Acesso à Câmera Negado',
        description:
          'Por favor, habilite a permissão de câmera no seu navegador.',
      });
    }
  };

  const form = useForm<NewOrder>({
    resolver: zodResolver(newOrderSchema),
    defaultValues: {
      origem: origins.length > 0 ? origins[0].address : '',
      destino: '',
      valorEntrega: 0,
      formaPagamento: 'pix',
      observacao: '',
      numeroNota: '',
      motoristaId: undefined,
    },
  });

  React.useEffect(() => {
    if (origins.length > 0) {
      form.setValue('origem', origins[0].address);
    }
  }, [origins, form]);

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
    const handleClientChange = async () => {
      if (selectedClientId) {
        const client = clients.find((c) => c.id === selectedClientId);
        if (client) {
          form.setValue('nomeCliente', client.nome, { shouldValidate: true });
          form.setValue('telefone', client.telefone, { shouldValidate: true });

          setLoadingAddresses(true);
          const clientAddresses = await getAddressesByClientId(client.id);
          setAddresses(clientAddresses);

          if (clientAddresses.length > 0) {
            // Auto-select the first address
            form.setValue('destino', clientAddresses[0].fullAddress);
          } else {
            // Reset destination if no addresses are found
            form.setValue('destino', '');
          }

          setLoadingAddresses(false);
        }
      } else {
        setAddresses([]);
        form.setValue('destino', '');
        form.setValue('nomeCliente', '');
        form.setValue('telefone', '');
      }
    };

    handleClientChange();
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
                        ? clients.find((client) => client.id === field.value)
                            ?.nome
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
                            <div>
                              <p>{client.nome}</p>
                              <p className="text-xs text-muted-foreground">
                                {client.telefone}
                              </p>
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
                  disabled={!selectedClientId || loadingAddresses}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          loadingAddresses
                            ? 'Carregando...'
                            : addresses.length > 0
                            ? 'Selecione um endereço'
                            : 'Cadastre um endereço para o cliente'
                        }
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {addresses.length > 0 ? (
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
                        Nenhum endereço cadastrado
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {selectedClientId &&
                  addresses.length === 0 &&
                  !loadingAddresses && (
                    <Button
                      variant="link"
                      asChild
                      className="p-0 h-auto mt-2 text-sm"
                    >
                      <Link
                        href={`/clientes/${selectedClientId}/enderecos/novo`}
                      >
                        Cadastrar novo endereço
                      </Link>
                    </Button>
                  )}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="numeroNota"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Número da Nota</FormLabel>
                <div className="flex gap-2">
                  <FormControl>
                    <Input placeholder="Nº da nota fiscal" {...field} />
                  </FormControl>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleOpenScanner}
                      >
                        <Camera className="h-4 w-4" />
                        <span className="sr-only">Ler código de acesso</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Ler Código de Acesso</DialogTitle>
                        <DialogDescription>
                          Aponte a câmera para o código de barras ou QR code da
                          nota fiscal.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="my-4">
                        <video
                          ref={videoRef}
                          className="w-full aspect-video rounded-md bg-muted"
                          autoPlay
                          muted
                        />
                        {!hasCameraPermission && (
                          <Alert variant="destructive" className="mt-4">
                            <AlertTitle>Acesso à Câmera Necessário</AlertTitle>
                            <AlertDescription>
                              Por favor, permita o acesso à câmera para usar
                              esta funcionalidade.
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button type="button" variant="secondary">
                            Fechar
                          </Button>
                        </DialogClose>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="valorEntrega"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor da Entrega *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    {...field}
                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
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
