

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
  'haver',
]);

export const orderItemSchema = z.object({
    description: z.string().min(1, 'Descrição é obrigatória'),
    quantity: z.coerce.number().int().min(1, 'Mínimo 1'),
    value: z.coerce.number().min(0, 'Valor deve ser positivo'),
});

const paymentSchema = z.object({
    amount: z.number(),
    method: paymentMethodSchema,
    date: z.any(),
    notes: z.string().optional(),
});

export const orderSchema = z.object({
  id: z.string(),
  codigoRastreio: z.string().min(1, 'Código de Rastreio é obrigatório'),
  nomeCliente: z.string().min(1, 'Nome do cliente é obrigatório'),
  telefone: z.string().min(10, 'Telefone inválido'),
  origem: z.string().min(1, 'Origem é obrigatória'),
  destino: z.string().min(1, 'Destino é obrigatório'),
  valorEntrega: z.coerce.number(), // Can be negative if there are payments
  items: z.array(orderItemSchema).min(1, 'A encomenda deve ter pelo menos um item.'),
  formaPagamento: paymentMethodSchema,
  pago: z.boolean().default(false),
  status: orderStatusSchema.default('PENDENTE'),
  motoristaId: z.string().optional(),
  observacao: z.string().optional(),
  numeroNota: z.string().optional(),
  timeline: z
    .array(
      z.object({
        status: orderStatusSchema,
        at: z.any(),
        userId: z.string(),
      })
    )
    .default([]),
  createdAt: z.any(), // Allow Date, string, or Firestore Timestamp
  createdBy: z.string(),
  companyId: z.string(),
  clientId: z.string(),
  dataPagamento: z.any().optional(),
  notasPagamento: z.string().optional(),
  payments: z.array(paymentSchema).optional(),
});

export const newOrderSchema = orderSchema.omit({
  id: true,
  codigoRastreio: true,
  timeline: true,
  createdAt: true,
  createdBy: true,
  companyId: true,
  pago: true,
  status: true,
  nomeCliente: true, // Will be derived from clientId
  telefone: true, // Will be derived from clientId
  valorEntrega: true, // Will be calculated from items
  dataPagamento: true,
  notasPagamento: true,
  payments: true,
});

export const editOrderSchema = newOrderSchema.omit({
    clientId: true, // Client cannot be changed when editing
});

export const driverSchema = z.object({
  id: z.string(),
  nome: z.string(),
  telefone: z.string(),
  placa: z.string().optional(),
  ativo: z.boolean(),
});

export const clientSchema = z.object({
    id: z.string(),
    nome: z.string().min(1, "Nome é obrigatório"),
    telefone: z.string().min(10, "Telefone inválido"),
    createdAt: z.any(), // Allow Date or Firestore Timestamp
});

export const newAddressSchema = z.object({
  label: z.string().min(1, 'O rótulo é obrigatório'),
  logradouro: z.string().min(1, 'O logradouro é obrigatório'),
  numero: z.string().min(1, 'O número é obrigatório'),
  bairro: z.string().min(1, 'O bairro é obrigatório'),
  cidade: z.string().min(1, 'A cidade é obrigatória'),
  estado: z.string().min(2, 'O estado é obrigatório').max(2, 'UF inválida'),
  cep: z.string().min(8, 'O CEP é obrigatório'),
});


export const newClientSchema = z.object({
    nome: z.string().min(1, "Nome é obrigatório"),
    telefone: z.string().min(10, "Telefone inválido"),
    logradouro: z.string().optional(),
    numero: z.string().optional(),
    bairro: z.string().optional(),
    cidade: z.string().optional(),
    estado: z.string().optional(),
    cep: z.string().optional(),
});

export const editClientSchema = z.object({
    nome: z.string().min(1, "Nome é obrigatório"),
    telefone: z.string().min(10, "Telefone inválido"),
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

export const newAddressFormSchema = addressSchema.omit({
  id: true,
  fullAddress: true,
});

export const originSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'O nome é obrigatório'),
  logradouro: z.string().min(1, 'O logradouro é obrigatório').optional(),
  numero: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  cep: z.string().optional(),
  address: z.string(), // This will be the concatenated full address
  createdAt: z.any(), // Allow Date or Firestore Timestamp
});

export const newOriginSchema = originSchema.omit({
  id: true,
  address: true, // `address` will be generated in the server action
  createdAt: true,
});

export const destinoSchema = originSchema.extend({}); 
export const newDestinoSchema = newOriginSchema.extend({});


export const vehicleSchema = z.object({
  id: z.string(),
  placa: z.string().min(7, 'Placa inválida'),
  modelo: z.string().min(1, 'Modelo é obrigatório'),
  ano: z.coerce.number().int().min(1900, 'Ano inválido').max(new Date().getFullYear() + 1),
  tipo: z.enum(["Ônibus", "Van", "Carro", "Caminhão"]),
  status: z.enum(["Ativo", "Inativo", "Em Manutenção"]),
  seatLayout: z.string().optional(), // JSON string for layout
  occupiedSeats: z.array(z.string()).optional(),
});

export const financialCategorySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'O nome da categoria é obrigatório.'),
  type: z.enum(['Entrada', 'Saída']),
});

export const baseFinancialEntrySchema = z.object({
  description: z.string().optional(),
  amount: z.coerce.number().positive('O valor deve ser maior que zero.'),
  type: z.enum(["Entrada", "Saída"]),
  date: z.date().optional(),
  categoryId: z.string().min(1, 'Categoria é obrigatória'),
  otherCategoryDescription: z.string().optional(),
  vehicleId: z.string().optional(),
  clientId: z.string().optional(),
  clientName: z.string().optional(),
  notes: z.string().optional(),
  selectedSeats: z.array(z.string()).optional(),
  travelDate: z.date().optional(),
  formaPagamento: paymentMethodSchema.optional(),
  origin: z.string().optional(),
  destination: z.string().optional(),
});

export const newFinancialEntrySchema = baseFinancialEntrySchema.refine(data => {
    if (data.categoryId === 'venda-passagem') {
        return !!data.clientId;
    }
    return true;
}, {
    message: "O cliente é obrigatório para vender uma passagem.",
    path: ["clientId"],
}).refine(data => {
    if(data.categoryId === 'venda-passagem') {
        return !!data.vehicleId;
    }
    return true;
}, {
    message: "O ônibus é obrigatório para vender uma passagem.",
    path: ["vehicleId"],
});

export const editFinancialEntrySchema = baseFinancialEntrySchema;

export const financialEntrySchema = baseFinancialEntrySchema.extend({ id: z.string() });
