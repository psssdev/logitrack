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
import type { NewOrder, Client, Address, Origin, Driver } from '@/lib/types';
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
import { addDoc, collection, doc, query, serverTimestamp, orderBy } from 'firebase/firestore';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';

// ===================== helpers e consts =====================

const paymentMethodLabels = {
  pix: 'PIX',
  dinheiro: 'Dinheiro',
  cartao: 'Cartão',
  boleto: 'Boleto',
  link: 'Link de Pagamento',
  haver: 'A Haver',
} as const;

const COMPANY_ID = '1';

const formatCurrency = (value: number | undefined) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const waUrl = (phoneE164: string, message: string) => {
  const cleaned = phoneE164.replace(/\D/g, '');
  const fullPhone = cleaned.startsWith('55') ? cleaned : `55${cleaned}`;
  return `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
};

const mapsUrl = (lat: number, lng: number) => `https://maps.google.com/?q=${lat},${lng}`;

const renderTpl = (tpl: string, vars: Record<string, string>) =>
  tpl.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : ''));

// Opcional: defina um tipo do documento gravado
type OrderDoc = NewOrder & {
  valorEntrega: number;
  valorPago: number;
  pagamentos: any[];
  totalVolumes: number;
  nomeCliente: string;
  telefone: string;
  codigoRastreio: string;
  status: 'PENDENTE' | 'EM_ROTA' | 'ENTREGUE' | string;
  createdAt: any;
  createdBy: string;
  timeline: { status: string; at: any; userId: string }[];
  messages: any[];
  destino: { id: string; full: string } | null;
};

// ===================== componente =====================

export function NewOrderForm({
  clients,
  origins,
}: {
  clients: Client[];
  origins: Origin[];
}) {
  const { toast } = useToast();
  const router = useRouter();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const [popoverOpen, setPopoverOpen] = React.useState(false);
  const [hasCameraPermission, setHasCameraPermission] = React.useState(false);
  const [submitAction, setSubmitAction] = React.useState<'save' | 'save-and-send'>('save');

  const videoRef = React.useRef<HTMLVideoElement>(null);

  const form = useForm<NewOrder>({
    resolver: zodResolver(newOrderSchema),
    defaultValues: {
      origem: origins.length > 0 ? origins[0].address : '',
      destino: '', // guardaremos o ID do endereço
      items: [{ description: '', quantity: 1, value: 0 }],
      formaPagamento: 'pix',
      observacao: '',
      numeroNota: '',
      motoristaId: undefined, // normalizaremos 'none' -> undefined
      clientId: undefined,
    },
    mode: 'onChange',
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' });

  const selectedClientId = form.watch('clientId');
  const items = form.watch('items');

  const totalValue = React.useMemo(
    () => (items || []).reduce((acc, item) => acc + ((item.quantity || 0) * (item.value || 0)), 0),
    [items]
  );

  const totalVolumes = React.useMemo(
    () => (items || []).reduce((acc, item) => acc + (item.quantity || 0), 0),
    [items]
  );

  // ---- drivers
  const driversQuery = useMemoFirebase(() => {
    if (!firestore || isUserLoading) return null;
    return query(collection(firestore, 'companies', COMPANY_ID, 'drivers'), orderBy('nome'));
  }, [firestore, isUserLoading]);

  const { data: drivers, isLoading: isLoadingDrivers } = useCollection<Driver>(driversQuery);

  // ---- addresses do cliente selecionado
  const addressesQuery = useMemoFirebase(() => {
    if (!firestore || !selectedClientId || isUserLoading) return null;
    return query(collection(firestore, 'companies', COMPANY_ID, 'clients', selectedClientId, 'addresses'));
  }, [firestore, selectedClientId, isUserLoading]);

  const { data: addresses, isLoading: loadingAddresses } = useCollection<Address>(addressesQuery);

  // define destino default pelo primeiro endereço do cliente (ID)
  React.useEffect(() => {
    if (!addresses) return;
    if (addresses.length > 0) {
      if (!form.getValues('destino')) {
        form.setValue('destino', addresses[0].id);
      }
    } else {
      form.setValue('destino', '');
    }
  }, [addresses, form]);

  // define origem default pela primeira origem disponível
  React.useEffect(() => {
    if (origins.length > 0 && !form.getValues('origem')) {
      form.setValue('origem', origins[0].address);
    }
  }, [origins, form]);

  // ---- camera: abrir/fechar
  const handleOpenScanner = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setHasCameraPermission(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setHasCameraPermission(false);
      toast({
        variant: 'destructive',
        title: 'Acesso à Câmera Negado',
        description: 'Por favor, habilite a permissão de câmera no seu navegador.',
      });
    }
  };

  const stopScanner = React.useCallback(() => {
    const stream = (videoRef.current?.srcObject as MediaStream | null) || null;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  React.useEffect(() => {
    return () => stopScanner();
  }, [stopScanner]);

  // ---- submit
  async function onSubmit(data: NewOrder) {
    if (!firestore || !user) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Usuário não autenticado ou falha na conexão.',
      });
      return;
    }

    // validações extras
    const client = clients.find((c) => c.id === data.clientId);
    if (!client) {
      toast({ variant: 'destructive', title: 'Selecione um cliente válido' });
      return;
    }

    if (!data.destino) {
      toast({ variant: 'destructive', title: 'Selecione um endereço de destino' });
      return;
    }

    if (!items.length || totalValue <= 0) {
      toast({ variant: 'destructive', title: 'Adicione ao menos um item com quantidade/valor válidos' });
      return;
    }

    try {
      const driverId = data.motoristaId === 'none' ? undefined : data.motoristaId;

      const address = addresses?.find((a) => a.id === data.destino) || null;
      const destino = address ? { id: address.id, full: address.fullAddress } : null;

      const createdAtTimestamp = serverTimestamp();

      // código de rastreio (pode trocar por nanoid se preferir)
      const trackingPrefix = 'TR';
      const randomPart = Math.random().toString(36).substring(2, 10).toUpperCase();
      const trackingCode = `${trackingPrefix}-${randomPart}`;

      const ordersCollection = collection(firestore, 'companies', COMPANY_ID, 'orders');

      const orderData: OrderDoc = {
        ...data,
        motoristaId: driverId,
        destino,
        valorEntrega: totalValue,
        valorPago: 0,
        pagamentos: [],
        totalVolumes,
        nomeCliente: client.nome,
        telefone: client.telefone,
        codigoRastreio: trackingCode,
        status: 'PENDENTE',
        createdAt: createdAtTimestamp,
        createdBy: user.uid,
        timeline: [{ status: 'PENDENTE', at: new Date(), userId: user.uid }],
        messages: [],
      };

      if (!driverId) delete (orderData as any).motoristaId;

      const newDocRef = await addDoc(ordersCollection, orderData);

      await Promise.all([
        triggerRevalidation('/encomendas'),
        triggerRevalidation('/dashboard'),
        triggerRevalidation('/financeiro'),
      ]);

      if (submitAction === 'save-and-send') {
        // preparar aba antes para evitar bloqueio de popup
        const newTab = window.open('', '_blank');

        const trackingLink = `https://seusite.com/rastreio/${trackingCode}`; // ajuste para seu domínio real
        const totalValueFormatted = formatCurrency(totalValue);
        const volumesStr = String(totalVolumes);

        const messageTemplate =
          'Olá {cliente}! Recebemos sua encomenda de {volumes} volume(s) com o código {codigo}. O valor da entrega é de {valor}. Acompanhe em: {link}';

        const message = renderTpl(messageTemplate, {
          cliente: client.nome,
          volumes: volumesStr,
          codigo: trackingCode,
          valor: totalValueFormatted,
          link: trackingLink,
        });

        const url = waUrl(client.telefone, message);
        if (newTab) newTab.location.href = url;

        toast({ title: 'Sucesso!', description: 'Encomenda criada e notificação enviada.' });
        router.push(`/encomendas`);
      } else {
        toast({ title: 'Sucesso!', description: 'Encomenda criada. Agora, revise e envie o comprovante.' });
        router.push(`/encomendas/comprovante/${newDocRef.id}`);
      }
    } catch (error: any) {
      console.error('Error creating order:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao criar encomenda.',
        description: error?.message || 'Ocorreu um erro desconhecido.',
      });
    }
  }

  // estados para habilitar/desabilitar botões
  const isSubmitting = form.formState.isSubmitting;
  const canSubmit = !!form.watch('clientId') && !!form.watch('destino') && items.length > 0;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
        {/* CLIENTE */}
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
                      className={cn('w-full justify-between', !field.value && 'text-muted-foreground')}
                    >
                      {field.value ? clients.find((c) => c.id === field.value)?.nome : 'Selecione um cliente'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
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
                            key={client.id}
                            value={client.nome}
                            onSelect={() => {
                              form.setValue('clientId', client.id, { shouldDirty: true, shouldValidate: true });
                              form.setValue('destino', ''); // reset ao trocar cliente
                              setPopoverOpen(false);
                            }}
                          >
                            <Check
                              className={cn('mr-2 h-4 w-4', client.id === field.value ? 'opacity-100' : 'opacity-0')}
                              aria-hidden="true"
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

        {/* ORIGEM / DESTINO */}
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
                          !selectedClientId
                            ? 'Selecione um cliente primeiro'
                            : loadingAddresses
                            ? 'Carregando endereços...'
                            : 'Selecione um endereço'
                        }
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {addresses && addresses.length > 0 ? (
                      addresses.map((address) => (
                        <SelectItem key={address.id} value={address.id}>
                          {address.label} - {address.fullAddress}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="__no_address__" disabled>
                        {loadingAddresses ? 'Carregando...' : 'Nenhum endereço cadastrado'}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {selectedClientId && !loadingAddresses && (!addresses || addresses.length === 0) && (
                  <Button variant="link" asChild className="p-0 h-auto mt-2 text-sm">
                    <Link href={`/clientes/${selectedClientId}/enderecos/novo`}>Cadastrar novo endereço</Link>
                  </Button>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* ITENS */}
        <div className="grid gap-4">
          <div className="flex justify-between items-center">
            <FormLabel>Itens da Encomenda</FormLabel>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => append({ description: '', quantity: 1, value: 0 })}
            >
              <PlusCircle className="mr-2 h-4 w-4" aria-hidden="true" />
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
                {fields.map((f, index) => {
                  const item = items[index];
                  const subtotal = ((item?.quantity || 0) * (item?.value || 0)) || 0;

                  return (
                    <TableRow key={f.id}>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`items.${index}.description`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input {...field} placeholder="Descrição do item" />
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
                                  min={1}
                                  step={1}
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 1)}
                                  className="w-20"
                                  aria-label="Quantidade"
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
                                  min={0}
                                  step="0.01"
                                  {...field}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  className="w-24"
                                  aria-label="Valor unitário"
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
                          aria-label="Remover item"
                          title="Remover item"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3} className="font-semibold text-right">
                    Total ({totalVolumes} {totalVolumes === 1 ? 'volume' : 'volumes'})
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

        {/* NF-e & Scanner */}
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="numeroNota"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Número da Nota</FormLabel>
                <div className="flex gap-2">
                  <FormControl>
                    <Input placeholder="Nº da nota fiscal" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="icon" onClick={handleOpenScanner} aria-label="Abrir câmera">
                        <Camera className="h-4 w-4" aria-hidden="true" />
                        <span className="sr-only">Ler código de acesso</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent onInteractOutside={stopScanner} onEscapeKeyDown={stopScanner}>
                      <DialogHeader>
                        <DialogTitle>Ler Código de Acesso</DialogTitle>
                        <DialogDescription>
                          Aponte a câmera para o código de barras ou QR code da nota fiscal.
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
                              Por favor, permita o acesso à câmera para usar esta funcionalidade.
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button type="button" variant="secondary" onClick={stopScanner}>
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

          {/* Pagamento */}
          <FormField
            control={form.control}
            name="formaPagamento"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Forma de Pagamento *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(paymentMethodLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Motorista */}
        <div className="grid gap-4 md:grid-cols-3">
          <FormField
            control={form.control}
            name="motoristaId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Motorista</FormLabel>
                <Select
                  onValueChange={(v) => field.onChange(v === 'none' ? undefined : v)}
                  value={field.value ?? 'none'}
                  disabled={isLoadingDrivers}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Atribuir motorista..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
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

        {/* Observação */}
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

        {/* Ações */}
        <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6 md:justify-end">
          <div className="text-sm text-muted-foreground md:mr-auto">
            <span className="font-medium">{items.length}</span> item(s),{' '}
            <span className="font-medium">{totalVolumes}</span>{' '}
            {totalVolumes === 1 ? 'volume' : 'volumes'} —{' '}
            <span className="font-semibold">{formatCurrency(totalValue)}</span>
          </div>
          <Button
            type="submit"
            size="lg"
            variant="outline"
            disabled={isSubmitting || !canSubmit}
            onClick={() => setSubmitAction('save-and-send')}
          >
            {isSubmitting && submitAction === 'save-and-send' ? (
              <Loader2 className="animate-spin" />
            ) : (
              <>
                <Send className="mr-2" aria-hidden="true" /> Salvar e Enviar
              </>
            )}
          </Button>
          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting || !canSubmit}
            onClick={() => setSubmitAction('save')}
          >
            {isSubmitting && submitAction === 'save' ? <Loader2 className="animate-spin" /> : 'Salvar Encomenda'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
