

import { z } from 'zod';
import { orderSchema, driverSchema, newDriverSchema, orderStatusSchema, paymentMethodSchema, newOrderSchema, clientSchema, newClientSchema, addressSchema, newAddressFormSchema, originSchema, newOriginSchema, avisameCampaignSchema, avisameDeliverySchema } from './schemas';
import { Timestamp } from 'firebase/firestore';

// Base Order type from schema
export type Order = Omit<z.infer<typeof orderSchema>, 'createdAt' | 'timeline' | 'pagamentos'> & {
    id: string;
    createdAt: Date | Timestamp;
    timeline: {
        status: OrderStatus;
        at: Date | Timestamp;
        userId: string;
    }[];
    pagamentos: {
        valor: number;
        forma: PaymentMethod;
        data: Date | Timestamp;
    }[];
};

// NewOrder type for form creation
export type NewOrder = z.infer<typeof newOrderSchema>;

// Driver type
export type Driver = z.infer<typeof driverSchema>;
export type NewDriver = z.infer<typeof newDriverSchema>;


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
export type Address = Omit<z.infer<typeof addressSchema>, 'createdAt'> & {
  id: string;
  clientId: string;
  latitude: number;
  longitude: number;
  createdAt: Date | Timestamp;
};
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
    codigoPrefixo: string;
    linkBaseRastreio: string;
    createdAt?: Date | Timestamp;
    updatedAt?: Date | Timestamp;
}

// Avisame types
export type AvisameCampaign = Omit<z.infer<typeof avisameCampaignSchema>, 'createdAt' | 'scheduledAt'> & {
    id: string;
    createdAt: Date | Timestamp;
    scheduledAt: Date | Timestamp;
};

export type NewAvisameCampaign = z.infer<typeof avisameCampaignSchema>;
export type AvisameDelivery = z.infer<typeof avisameDeliverySchema>;

    

    

    
