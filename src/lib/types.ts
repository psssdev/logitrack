import { z } from 'zod';
import { orderSchema, driverSchema, orderStatusSchema, paymentMethodSchema, newOrderSchema, clientSchema, newClientSchema, addressSchema, newAddressSchema, originSchema, newOriginSchema } from './schemas';

export type Order = z.infer<typeof orderSchema>;
export type NewOrder = z.infer<typeof newOrderSchema>;
export type Driver = z.infer<typeof driverSchema>;
export type OrderStatus = z.infer<typeof orderStatusSchema>;
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;
export type Client = z.infer<typeof clientSchema>;
export type NewClient = z.infer<typeof newClientSchema>;
export type Address = z.infer<typeof addressSchema>;
export type NewAddress = z.infer<typeof newAddressSchema>;
export type Origin = z.infer<typeof originSchema>;
export type NewOrigin = z.infer<typeof newOriginSchema>;
