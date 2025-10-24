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
  createdAt: z.any(), // Allow Date, string, or Firestore Timestamp
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
    createdAt: z.any(), // Allow Date or Firestore Timestamp
});

export const newClientSchema = clientSchema.omit({
    id: true,
    createdAt: true,
});

export const addressSchema = z.object({
  id: z.string(),
  clientId: z.string(),
  label: z.string().min(1, 'O rótulo é obrigatório'),
  logradouro: z.string().min(1, 'O logradouro é obrigatório'),
  numero: z.string().min(1, 'O número é obrigatório'),
  bairro: z.string().min(1, 'O bairro é obrigatório'),
  cidade: z.string().min(1, 'A cidade é obrigatória'),
  estado: z.string().min(2, 'O estado é obrigatório').max(2, 'UF inválida'),
  cep: z.string().min(8, 'O CEP é obrigatório'),
  fullAddress: z.string(),
});

export const newAddressSchema = addressSchema.omit({
  id: true,
  fullAddress: true,
});

export const originSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'O nome é obrigatório'),
  logradouro: z.string().min(1, 'O logradouro é obrigatório'),
  numero: z.string().min(1, 'O número é obrigatório'),
  bairro: z.string().min(1, 'O bairro é obrigatório'),
  cidade: z.string().min(1, 'A cidade é obrigatória'),
  estado: z.string().min(2, 'O estado é obrigatório').max(2, 'UF inválida'),
  cep: z.string().min(8, 'O CEP é obrigatório'),
  address: z.string(), // This will be the concatenated full address
});

export const newOriginSchema = originSchema.omit({
  id: true,
  address: true, // `address` will be generated in the server action
});
