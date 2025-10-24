import { z } from 'zod';
import { orderSchema, driverSchema, orderStatusSchema, paymentMethodSchema, newOrderSchema, clientSchema, newClientSchema, addressSchema, newAddressSchema, originSchema, newOriginSchema } from './schemas';
import { Timestamp } from 'firebase/firestore';

// Base Order type from schema
export type Order = z.infer<typeof orderSchema>;

// NewOrder type for form creation
export type NewOrder = z.infer<typeof newOrderSchema>;

// Driver type
export type Driver = z.infer<typeof driverSchema>;

// Enum types
export type OrderStatus = z.infer<typeof orderStatusSchema>;
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

// Base Client type with potential Firestore Timestamp
export type Client = Omit<z.infer<typeof clientSchema>, 'createdAt'> & {
    createdAt: Date | Timestamp;
};

// NewClient type for form creation
export type NewClient = z.infer<typeof newClientSchema>;

// Address types
export type Address = z.infer<typeof addressSchema>;
export type NewAddress = z.infer<typeof newAddressSchema>;

// Base Origin type with potential Firestore Timestamp
export type Origin = Omit<z.infer<typeof originSchema>, 'createdAt'> & {
    createdAt: Date | Timestamp;
};
export type NewOrigin = z.infer<typeof newOriginSchema>;
