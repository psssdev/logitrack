import { z } from 'zod';
import { orderSchema, driverSchema, orderStatusSchema, paymentMethodSchema, newOrderSchema, clientSchema, newClientSchema, addressSchema, newAddressFormSchema, originSchema, newOriginSchema, vehicleSchema, baseFinancialEntrySchema } from './schemas';
import { Timestamp } from 'firebase/firestore';

export type Payment = {
    amount: number;
    method: PaymentMethod;
    date: Date | Timestamp;
    notes?: string;
}

// Base Order type from schema
export type Order = Omit<z.infer<typeof orderSchema>, 'createdAt' | 'timeline' | 'dataPagamento' | 'payments'> & {
    id: string;
    createdAt: Date | Timestamp;
    dataPagamento?: Date | Timestamp;
    timeline: {
        status: OrderStatus;
        at: Date | Timestamp;
        userId: string;
    }[];
    payments?: Payment[];
};

// NewOrder type for form creation
export type NewOrder = z.infer<typeof newOrderSchema>;

// Driver type
export type Driver = z.infer<typeof driverSchema>;

// Enum types
export type OrderStatus = z.infer<typeof orderStatusSchema>;
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

// Base Client type with potential Firestore Timestamp
export type Client = Omit<z.infer<typeof clientSchema>, 'createdAt'> & {
    id: string;
    createdAt: Date | Timestamp;
};

// NewClient type for form creation
export type NewClient = z.infer<typeof newClientSchema>;
export type NewClientWithAddress = z.infer<typeof newClientSchema>;


// Address types
export type Address = z.infer<typeof addressSchema>;
export type NewAddress = z.infer<typeof newAddressFormSchema>;

// Base Origin type with potential Firestore Timestamp
export type Origin = Omit<z.infer<typeof originSchema>, 'createdAt'> & {
    id: string;
    createdAt: Date | Timestamp;
};
export type NewOrigin = z.infer<typeof newOriginSchema>;

// Company type, derived from the JSON schema
export type Company = {
    id: string;
    nomeFantasia: string;
    cnpj?: string;
    logoUrl?: string;
    cep?: string;
    logradouro?: string;
    numero?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
    msgRecebido?: string;
    msgEmRota?: string;
    msgEntregue?: string;
    msgChegueiCidade?: string;
    msgCobranca?: string;
    codigoPrefixo: string;
    linkBaseRastreio: string;
    createdAt?: Date | Timestamp;
    updatedAt?: Date | Timestamp;
};

export type UserProfile = {
    displayName: string;
    email: string;
    companyId: string;
    role: string;
}

// Vehicle type with seat layout
export type SeatLayout = {
    lowerDeck?: { [key: string]: (string | null)[] };
    upperDeck?: { [key: string]: (string | null)[] };
};

export type Vehicle = Omit<z.infer<typeof vehicleSchema>, 'seatLayout'> & {
    id: string;
    seatLayout?: SeatLayout;
};

export type FinancialCategory = {
    id: string;
    name: string;
    type: 'Entrada' | 'Saída';
}

export type FinancialEntry = Omit<z.infer<typeof baseFinancialEntrySchema>, 'date' | 'travelDate'> & {
    id: string;
    date: Date | Timestamp;
    travelDate?: Date | Timestamp;
};
