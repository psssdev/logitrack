
import { z } from 'zod';

export const storeSchema = z.object({
  id: z.string(),
  name: z.string(),
  ownerId: z.string(),
});

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
    description: z.string().min(1, 'A descrição do item é obrigatória.'),
    quantity: z.coerce.number().int().min(1, 'A quantidade mínima é 1.'),
    value: z.coerce.number().min(0, 'O valor não pode ser negativo.'),
});

const paymentSchema = z.object({
    amount: z.number().positive('O valor do pagamento deve ser positivo.'),
    method: paymentMethodSchema,
    date: z.any(),
    notes: z.string().optional(),
});

export const orderSchema = z.object({
  id: z.string(),
  storeId: z.string().min(1, "A ID da loja é obrigatória."),
  codigoRastreio: z.string().min(1, 'O código de rastreio é obrigatório.'),
  nomeCliente: z.string().min(1, 'O nome do cliente é obrigatório.'),
  telefone: z.string().min(10, 'O número de telefone parece inválido.'),
  origem: z.string().min(1, 'O ponto de origem é obrigatório.'),
  destino: z.string().min(1, 'O ponto de destino é obrigatório.'),
  valorEntrega: z.coerce.number(),
  items: z.array(orderItemSchema).min(1, 'A encomenda precisa ter pelo menos um item.'),
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
  messages: z.array(z.string()).optional(),
  createdAt: z.any(),
  createdBy: z.string(),
  clientId: z.string().min(1, 'É necessário associar a encomenda a um cliente.'),
  dataPagamento: z.any().optional(),
  notasPagamento: z.string().optional(),
  payments: z.array(paymentSchema).optional(),
});

export const newOrderSchema = orderSchema.omit({
  id: true,
  codigoRastreio: true,
  timeline: true,
  createdBy: true,
  pago: true,
  status: true,
  nomeCliente: true,
  telefone: true,
  valorEntrega: true,
  dataPagamento: true,
  notasPagamento: true,
  payments: true,
  messages: true,
}).extend({
    createdAt: z.date().optional(),
});

export const editOrderSchema = newOrderSchema.omit({
    clientId: true,
    storeId: true, // storeId is not editable
});

export const driverSchema = z.object({
  id: z.string(),
  storeId: z.string().min(1, "A ID da loja é obrigatória."),
  nome: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres.'),
  telefone: z.string().min(10, 'O número de telefone parece inválido.'),
  photoUrl: z.string().url('A URL da foto parece inválida.').optional().nullable(),
  ativo: z.boolean(),
});

export const newDriverSchema = driverSchema.omit({ id: true, ativo: true }).extend({
    photoUrl: z.string().optional().nullable(),
});
export const editDriverSchema = newDriverSchema.omit({ storeId: true });


export const clientSchema = z.object({
    id: z.string(),
    storeId: z.string().min(1, "A ID da loja é obrigatória."),
    nome: z.string().min(1, "O nome do cliente é obrigatório."),
    telefone: z.string().min(10, "O número de telefone parece inválido."),
    createdAt: z.any(),
    defaultDestinoId: z.string().optional(),
});

export const newClientSchema = z.object({
    storeId: z.string().min(1, "A ID da loja é obrigatória."),
    nome: z.string().min(1, "O nome do cliente é obrigatório."),
    telefone: z.string().min(10, "O número de telefone parece inválido."),
    defaultDestinoId: z.string().optional().nullable(),
});

export const editClientSchema = newClientSchema.omit({ storeId: true });


export const addressSchema = z.object({
  id: z.string(),
  storeId: z.string().min(1, "A ID da loja é obrigatória."),
  clientId: z.string(),
  label: z.string().min(1, 'O rótulo do endereço é obrigatório (ex: Casa, Trabalho).'),
  logradouro: z.string().min(1, 'O logradouro é obrigatório.'),
  numero: z.string().min(1, 'O número é obrigatório.'),
  bairro: z.string().min(1, 'O bairro é obrigatório.'),
  cidade: z.string().min(1, 'A cidade é obrigatória.'),
  estado: z.string().length(2, 'O estado (UF) deve ter 2 letras.'),
  cep: z.string().min(8, 'O CEP deve ter pelo menos 8 dígitos.'),
  fullAddress: z.string(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
});

export const newAddressFormSchema = addressSchema.omit({
  id: true,
  fullAddress: true,
});

export const locationSchema = z.object({
  id: z.string().optional(),
  storeId: z.string().min(1, "A ID da loja é obrigatória."),
  name: z.string().min(1, 'O nome do local é obrigatório.'),
  logradouro: z.string().min(1, 'O logradouro é obrigatório.'),
  numero: z.string().min(1, 'O número é obrigatório.'),
  bairro: z.string().min(1, 'O bairro é obrigatório.'),
  cidade: z.string().min(1, 'A cidade é obrigatória.'),
  estado: z.string().length(2, 'O estado (UF) deve ter 2 letras.'),
  cep: z.string().min(8, 'O CEP deve ter pelo menos 8 dígitos.'),
  address: z.string().optional(),
  createdAt: z.any().optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
});

export const newLocationSchema = z.object({
  storeId: z.string().min(1, "A ID da loja é obrigatória."),
  name: z.string().min(1, "O nome do local é obrigatório."),
  logradouro: z.string().min(1, "O logradouro é obrigatório."),
  numero: z.string().min(1, "O número é obrigatório."),
  bairro: z.string().min(1, "O bairro é obrigatório."),
  cidade: z.string().min(1, "A cidade é obrigatória."),
  estado: z.string().length(2, 'O estado (UF) deve ter 2 letras.'),
  cep: z.string().min(8, 'O CEP deve ter pelo menos 8 dígitos.'),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
});


export const vehicleSchema = z.object({
  id: z.string(),
  storeId: z.string().min(1, "A ID da loja é obrigatória."),
  placa: z.string().min(7, 'A placa deve ter 7 caracteres.'),
  modelo: z.string().min(1, 'O modelo é obrigatório.'),
  ano: z.coerce.number().int().min(1900, 'O ano de fabricação é inválido.').max(new Date().getFullYear() + 1, 'O ano de fabricação não pode ser no futuro.'),
  tipo: z.enum(["Ônibus", "Van", "Carro", "Caminhão"]),
  status: z.enum(["Ativo", "Inativo", "Em Manutenção"]),
  seatLayout: z.string().optional(),
  occupiedSeats: z.array(z.string()).optional(),
});

export const financialCategorySchema = z.object({
  id: z.string().optional(),
  storeId: z.string().min(1, "A ID da loja é obrigatória."),
  name: z.string().min(1, 'O nome da categoria é obrigatório.'),
  type: z.enum(['Entrada', 'Saída']),
});

export const baseFinancialEntrySchema = z.object({
  storeId: z.string().min(1, "A ID da loja é obrigatória."),
  description: z.string().optional(),
  amount: z.coerce.number().positive('O valor deve ser maior que zero.'),
  type: z.enum(["Entrada", "Saída"]),
  date: z.date({ required_error: "A data da transação é obrigatória."}).optional(),
  categoryId: z.string().min(1, 'A categoria é obrigatória.'),
  otherCategoryDescription: z.string().optional(),
  vehicleId: z.string().optional(),
  clientId: z.string().optional(),
  clientName: z.string().optional(),
  driverId: z.string().optional(),
  driverName: z.string().optional(),
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
    message: "É necessário selecionar um cliente para vender uma passagem.",
    path: ["clientId"],
}).refine(data => {
    if(data.categoryId === 'venda-passagem') {
        return !!data.vehicleId;
    }
    return true;
}, {
    message: "É necessário selecionar um ônibus para vender uma passagem.",
    path: ["vehicleId"],
}).refine(data => {
    if(data.categoryId === 'venda-passagem') {
        return !!data.origin;
    }
    return true;
}, {
    message: "É necessário selecionar um ponto de origem.",
    path: ["origin"],
});


export const editFinancialEntrySchema = baseFinancialEntrySchema.omit({ storeId: true });

export const financialEntrySchema = baseFinancialEntrySchema.extend({ id: z.string() });

export const companySchema = z.object({
  nomeFantasia: z.string().min(1, 'O nome fantasia é obrigatório.'),
  razaoSocial: z.string().min(1, 'A razão social é obrigatória.'),
  cnpj: z.string().min(14, 'O CNPJ deve ter 14 dígitos.').max(18, 'O CNPJ parece longo demais.'),
  chavePix: z.string().min(1, 'A chave Pix é obrigatória.').optional(),
  endereco: z.string().optional(),
  telefone: z.string().optional(),
  codigoPrefixo: z.string().min(2, 'O prefixo deve ter pelo menos 2 caracteres.').max(5, 'O prefixo deve ter no máximo 5 caracteres.'),
  linkBaseRastreio: z.string().url('A URL base de rastreio deve ser um link válido.'),
  msgCobranca: z.string().optional(),
  msgRecebido: z.string().optional(),
  msgAvisame: z.string().optional(),
  msgEmRota: z.string().optional(),
});

export const pixKeySchema = z.object({
  storeId: z.string().min(1, "A ID da loja é obrigatória."),
  name: z.string().min(1, 'O nome da chave é obrigatório.'),
  key: z.string().min(1, 'A chave Pix é obrigatória.'),
  type: z.enum(["CNPJ", "Email", "Telefone", "Aleatória"]),
  isPrimary: z.boolean().default(false),
});
