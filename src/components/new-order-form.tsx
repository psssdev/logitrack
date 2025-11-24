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
import { newOrderSchema } from '@/lib/schemas';
import type { NewOrder, Client, Address, Origin, Driver, Destino } from '@/lib/types';
import { triggerRevalidation } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
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
import {
  ChevronsUpDown,
  Check,
  Camera,
  Loader2,
  Trash2,
  PlusCircle,
  Send,
} from 'lucide-react';
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
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { addDoc, collection, doc, query, serverTimestamp } from 'firebase/firestore';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';

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
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

const openWhatsApp = (phone: string, message: string) => {
    const cleanedPhone = phone.replace(/\D/g, '');
    const fullPhone = cleanedPhone.startsWith('55') ? cleanedPhone : `55${cleanedPhone}`;
    const url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
}

const itemDescriptionOptions = ['Pacote', 'Fardo', 'Caixa'];

export function NewOrderForm({
  clients,
  origins,
  destinos,
}: {
  clients: Client[];
  origins: Origin[];
  destinos: Destino[];
}) {
  const { toast } = useToast();
  const router = useRouter();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const [popoverOpen, setPopoverOpen] = React.useState(false);
  const [hasCameraPermission, setHasCameraPermission] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [submitAction, setSubmitAction] = React.useState<'save' | 'save-and-send'>('save');

  const form = useForm<NewOrder>({
    resolver: zodResolver(newOrderSchema),
    defaultValues: {
      origem: origins.length > 0 ? origins[0].address : '',
      destino: '',
      items: [{ description: 'Pacote', quantity: 1, value: 0 }],
      formaPagamento: 'haver',
      observacao: '',
      numeroNota: '',
      motoristaId: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const selectedClientId = form.watch('clientId');
  const items = form.watch('items');
  const totalValue = items.reduce((acc, item) => acc + ((item.quantity || 0) * (item.value || 0)), 0);

  const addressesQuery = useMemoFirebase(() => {
    if (!firestore || !selectedClientId || isUserLoading || !user) return null;
    return query(
      collection(
        firestore,
        'clients',
        selectedClientId,
        'addresses'
      )
    );
  }, [firestore, selectedClientId, isUserLoading, user]);

  const { data: addresses, isLoading: loadingAddresses } =
    useCollection<Address>(addressesQuery);

  const { data: drivers, isLoading: loadingDrivers } = useCollection<Driver>(useMemoFirebase(() => {
    if (!firestore || isUserLoading || !user) return null;
    return collection(firestore, 'drivers');
  }, [firestore, isUserLoading, user]));

  // Auto-select destination based on client's addresses
  React.useEffect(() => {
    if (selectedClientId) {
      const selectedClient = clients.find(c => c.id === selectedClientId);
      if (selectedClient?.defaultDestinoId) {
        const defaultDestino = addresses?.find(a => a.id === selectedClient.defaultDestinoId) || destinos.find(d => d.id === selectedClient.defaultDestinoId);
        if (defaultDestino) {
          form.setValue('destino', defaultDestino.address || (defaultDestino as Address).fullAddress);
          return;
        }
      }
      if (addresses && addresses.length > 0) {
        const mainAddress = addresses.find(a => a.principal) || addresses[0];
        if (mainAddress) {
          form.setValue('destino', mainAddress.fullAddress);
        }
      } else {
        form.setValue('destino', '');
      }
    }
  }, [addresses, form, selectedClientId, clients, destinos]);


  const handleOpenScanner = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setHasCameraPermission(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Erro ao aceder à câmera:', error);
      setHasCameraPermission(false);
      toast({
        variant: 'destructive',
        title: 'Acesso à Câmera Negado',
        description:
          'Por favor, habilite a permissão de câmera nas configurações do seu navegador para usar esta funcionalidade.',
      });
    }
  };

  React.useEffect(() => {
    if (origins.length > 0 && !form.getValues('origem')) {
      form.setValue('origem', origins[0].address);
    }
  }, [origins, form]);

  async function onSubmit(data: NewOrder) {
    if (!firestore || !user) {
      toast({
        variant: 'destructive',
        title: 'Erro de Conexão',
        description: 'Não foi possível conectar à base de dados. Por favor, tente novamente.',
      });
      return;
    }

    try {
      const client = clients.find((c) => c.id === data.clientId);
      if (!client) {
        form.setError('clientId', { type: 'manual', message: 'Cliente não encontrado. Por favor, selecione um cliente válido.' });
        toast({
          variant: 'destructive',
          title: 'Cliente Inválido',
          description: 'O cliente selecionado não foi encontrado.',
        });
        return;
      }

      const trackingPrefix = 'TR'; // Using static prefix as company data fetch was removed
      const trackingCode = `${trackingPrefix}-${Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase()}`;

      const ordersCollection = collection(
        firestore,
        'orders'
      );
      const newOrderData = {
        ...data,
        motoristaId: data.motoristaId === 'null' ? null : data.motoristaId,
        valorEntrega: totalValue,
        nomeCliente: client.nome,
        telefone: client.telefone,
        codigoRastreio: trackingCode,
        status: 'PENDENTE',
        pago: false,
        createdAt: serverTimestamp(),
        createdBy: user.uid,
        timeline: [
          { status: 'PENDENTE', at: new Date(), userId: user.uid },
        ],
        messages: [],
      };

      const newDocRef = await addDoc(ordersCollection, newOrderData);

      await triggerRevalidation('/encomendas');
      await triggerRevalidation('/dashboard');
      await triggerRevalidation('/financeiro');

      if (submitAction === 'save-and-send') {
        const trackingLink = `https://seusite.com/rastreio/${trackingCode}`; // Static URL
        const totalValueFormatted = formatCurrency(totalValue);
        const totalVolumes = data.items.reduce((acc, item) => acc + (item.quantity || 0), 0).toString();
        
        const messageTemplate = "Olá {cliente}! Recebemos sua encomenda de {volumes} volume(s) com o código {codigo}. O valor da entrega é de {valor}. Acompanhe em: {link}";
        let message = messageTemplate;
        message = message.replace('{cliente}', client.nome);
        message = message.replace('{codigo}', trackingCode);
        message = message.replace('{link}', trackingLink);
        message = message.replace('{valor}', totalValueFormatted);
        message = message.replace('{volumes}', totalVolumes);

        openWhatsApp(client.telefone, message);

        toast({
            title: 'Encomenda Criada e Notificação Enviada!',
            description: 'A encomenda foi registada e a notificação está pronta para ser enviada via WhatsApp.',
        });

        router.push(`/encomendas`);
      } else {
        toast({
            title: 'Encomenda Criada com Sucesso!',
            description: 'Agora pode rever os detalhes e enviar o comprovativo ao cliente.',
        });
        router.push(`/encomendas/comprovante/${newDocRef.id}`);
      }


    } catch (error: any) {
      console.error('Erro ao criar encomenda:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao Criar Encomenda',
        description: 'Não foi possível registar a encomenda. Por favor, verifique os dados e tente novamente.',
      });
    }
  }

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
                <FormLabel>Ponto de Origem da Encomenda *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um ponto de origem" />
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
                <FormLabel>Destino da Encomenda (Endereço do Cliente) *</FormLabel>
                 <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={!selectedClientId || loadingAddresses}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          !selectedClientId
                            ? 'Selecione um cliente primeiro'
                            : loadingAddresses
                            ? 'A carregar...'
                            : 'Selecione um endereço'
                        }
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {addresses && addresses.length > 0 ? (
                      addresses.map((loc) => (
                        <SelectItem
                          key={loc.id}
                          value={(loc as Address).fullAddress}
                        >
                          {(loc as Address).label} - {(loc as Address).fullAddress}
                        </SelectItem>
                      ))
                    ) : (
                      destinos.map((loc) => (
                         <SelectItem
                          key={loc.id}
                          value={loc.address}
                        >
                          {loc.name} - {loc.address}
                        </SelectItem>
                      ))
                    )}
                     {selectedClientId && !loadingAddresses && (!addresses || addresses.length === 0) && (!destinos || destinos.length === 0) && (
                         <SelectItem value="no-location" disabled>Nenhum endereço ou destino encontrado</SelectItem>
                     )}
                  </SelectContent>
                </Select>
                {selectedClientId &&
                  !loadingAddresses &&
                  (!addresses || addresses.length === 0) && (
                    <Button
                      variant="link"
                      asChild
                      className="p-0 h-auto mt-2 text-sm"
                    >
                      <Link
                        href={`/clientes/${selectedClientId}/enderecos/novo`}
                      >
                        Cadastrar novo endereço para este cliente
                      </Link>
                    </Button>
                  )}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid gap-4">
            <div className="flex justify-between items-center">
                <FormLabel>Itens da Encomenda</FormLabel>
                <Button type="button" size="sm" variant="outline" onClick={() => append({ description: 'Pacote', quantity: 1, value: 0 })}>
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
                            <TableHead><span className="sr-only">Ações</span></TableHead>
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
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Selecione o tipo"/>
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {itemDescriptionOptions.map(option => (
                                                            <SelectItem key={option} value={option}>{option}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
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
                                                    <Input type="number" {...field} onChange={e => field.onChange(e.target.valueAsNumber || 1)} className="w-20" />
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
                                                    <Input type="number" {...field}  onChange={e => field.onChange(e.target.valueAsNumber || 0)} className="w-24" />
                                                </FormControl>
                                                 <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </TableCell>
                                <TableCell className="text-right font-medium">{formatCurrency(subtotal)}</TableCell>
                                <TableCell className="text-right">
                                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length <= 1}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        )})}
                    </TableBody>
                    <TableFooter>
                        <TableRow>
                            <TableCell colSpan={3} className="font-semibold text-right">Total</TableCell>
                            <TableCell className="text-right font-bold text-lg">{formatCurrency(totalValue)}</TableCell>
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
                <div className="flex gap-2">
                  <FormControl>
                    <Input
                      placeholder="Nº da nota fiscal (opcional)"
                      {...field}
                      value={field.value ?? ''}
                    />
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
                        <DialogTitle>Ler Código de Acesso da Nota Fiscal</DialogTitle>
                        <DialogDescription>
                          Aponte a câmera para o código de barras ou QR code da
                          nota fiscal. A leitura ainda não está implementada.
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
                      <SelectValue placeholder={loadingDrivers ? "A carregar..." : "Atribuir a um motorista..."} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="null">Nenhum</SelectItem>
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
                  placeholder="Ex: Entregar na portaria, pacote frágil, etc. (opcional)"
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
                variant="outline"
                disabled={form.formState.isSubmitting}
                onClick={() => setSubmitAction('save-and-send')}
            >
                {form.formState.isSubmitting && submitAction === 'save-and-send' ? <Loader2 className="animate-spin" /> : <><Send className="mr-2" /> Salvar e Enviar</>}
            </Button>
            <Button
                type="submit"
                size="lg"
                disabled={form.formState.isSubmitting}
                onClick={() => setSubmitAction('save')}
            >
                {form.formState.isSubmitting && submitAction === 'save' ? <Loader2 className="animate-spin" /> : 'Salvar Encomenda'}
            </Button>
        </div>
      </form>
    </Form>
  );
}
