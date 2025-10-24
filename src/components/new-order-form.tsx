'use client';

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
import type { NewOrder } from '@/lib/types';
import { createOrder } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { drivers } from '@/lib/data';

const paymentMethodLabels = {
  pix: 'PIX',
  dinheiro: 'Dinheiro',
  cartao: 'Cartão',
  boleto: 'Boleto',
  link: 'Link de Pagamento',
};

export function NewOrderForm() {
  const { toast } = useToast();
  const router = useRouter();
  const form = useForm<NewOrder>({
    resolver: zodResolver(newOrderSchema),
    defaultValues: {
      nomeCliente: '',
      telefone: '',
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="nomeCliente"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do Cliente *</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: João da Silva" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="telefone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefone (WhatsApp) *</FormLabel>
                <FormControl>
                  <Input placeholder="(99) 99999-9999" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="origem"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Endereço de Origem *</FormLabel>
                <FormControl>
                  <Input placeholder="Rua de partida, 123" {...field} />
                </FormControl>
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
                <FormControl>
                  <Input placeholder="Avenida de chegada, 456" {...field} />
                </FormControl>
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
                  <Input type="number" step="0.01" {...field} />
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
                    {Object.entries(paymentMethodLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
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
                    {drivers.map(driver => (
                        <SelectItem key={driver.id} value={driver.id}>{driver.nome}</SelectItem>
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
            <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Salvando...' : 'Salvar & Notificar WhatsApp'}
            </Button>
        </div>
      </form>
    </Form>
  );
}
