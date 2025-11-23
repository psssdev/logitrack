import { z } from 'zod';
import { orderSchema, driverSchema, newDriverSchema, orderStatusSchema, paymentMethodSchema, newOrderSchema, clientSchema, newClientSchema, addressSchema, newAddressFormSchema, vehicleSchema, baseFinancialEntrySchema, locationSchema, newLocationSchema } from './schemas';
import { Timestamp } from 'firebase/firestore';

export type Payment = {
    amount: number;
    method: PaymentMethod;
    date: Date | Timestamp;
    notes?: string;
}

// Base Order type from schema
export type Order = Omit<z.infer<typeof orderSchema>, 'createdAt' | 'timeline' | 'dataPagamento' | 'payments' | 'messages'> & {
    id: string;
    createdAt: Date | Timestamp;
    dataPagamento?: Date | Timestamp;
    timeline: {
        status: OrderStatus;
        at: Date | Timestamp;
        userId: string;
    }[];
    payments?: Payment[];
    messages?: string[];
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
    defaultOriginId?: string;
    defaultDestinoId?: string;
    addresses?: Address[];
};

// NewClient type for form creation
export type NewClient = z.infer<typeof newClientSchema>;
export type NewClientWithAddress = z.infer<typeof newClientSchema>;


// Address types
export type Address = Omit<z.infer<typeof addressSchema>, 'lat'| 'lng'> & {
    lat?: number;
    lng?: number;
};

export type NewAddress = z.infer<typeof newAddressFormSchema>;


// NewLocation type for form creation
export type NewLocation = z.infer<typeof newLocationSchema>;


// Base Origin type with potential Firestore Timestamp
export type Origin = Omit<z.infer<typeof locationSchema>, 'createdAt' | 'address'> & {
    id: string;
    address: string;
    createdAt: Date | Timestamp;
};

// Base Destino type with potential Firestore Timestamp
export type Destino = Omit<z.infer<typeof locationSchema>, 'createdAt' | 'address' | 'lat' | 'lng'> & {
    id: string;
    address: string;
    createdAt: Date | Timestamp;
};


export type UserProfile = {
    displayName: string;
    email: string;
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
