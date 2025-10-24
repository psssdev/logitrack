import { z } from 'zod';

export const orderStatusSchema = z.enum([
  'PENDENTE',
  'EM_ROTA',
  'ENTREGUE',
  'CANCELADA',
]);
export const paymentMethodSchema = z.enum([
  'pix',
  'dinheiro',
  'cartao',
  'boleto',
  'link',
]);

export const orderSchema = z.object({
  id: z.string(),
  codigoRastreio: z.string().min(1, 'Código de Rastreio é obrigatório'),
  nomeCliente: z.string().min(1, 'Nome do cliente é obrigatório'),
  telefone: z.string().min(10, 'Telefone inválido'),
  origem: z.string().min(1, 'Origem é obrigatória'),
  destino: z.string().min(1, 'Destino é obrigatório'),
  valorEntrega: z.coerce.number().min(0, 'Valor da entrega deve ser positivo'),
  formaPagamento: paymentMethodSchema,
  pago: z.boolean().default(false),
  status: orderStatusSchema.default('PENDENTE'),
  motoristaId: z.string().optional(),
  observacao: z.string().optional(),
  timeline: z
    .array(
      z.object({
        status: orderStatusSchema,
        at: z.date(),
        userId: z.string(),
      })
    )
    .default([]),
  messages: z
    .array(
      z.object({
        to: z.string(),
        body: z.string(),
        templateKey: z.string(),
        at: z.date(),
        providerMessageId: z.string().optional(),
      })
    )
    .default([]),
  createdAt: z.date(),
  createdBy: z.string(),
  companyId: z.string(),
});

export const newOrderSchema = orderSchema.omit({
  id: true,
  codigoRastreio: true,
  timeline: true,
  messages: true,
  createdAt: true,
  createdBy: true,
  companyId: true,
  pago: true,
  status: true,
  nomeCliente: true, // Will be derived from clientId
  telefone: true, // Will be derived from clientId
}).extend({
    clientId: z.string({ required_error: 'Selecione um cliente.' }),
});

export const driverSchema = z.object({
  id: z.string(),
  nome: z.string(),
  telefone: z.string(),
  placa: z.string().optional(),
  ativo: z.boolean(),
  companyId: z.string(),
});

export const clientSchema = z.object({
    id: z.string(),
    nome: z.string().min(1, "Nome é obrigatório"),
    telefone: z.string().min(10, "Telefone inválido"),
    createdAt: z.date(),
});

export const newClientSchema = clientSchema.omit({
    id: true,
    createdAt: true,
});

export const addressSchema = z.object({
  id: z.string(),
  clientId: z.string(),
  label: z.string().min(1, 'O rótulo é obrigatório'),
  fullAddress: z.string().min(1, 'O endereço é obrigatório'),
});

export const newAddressSchema = addressSchema.omit({
  id: true,
});
