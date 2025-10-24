import { z } from 'zod';
import { orderSchema, driverSchema, orderStatusSchema, paymentMethodSchema, newOrderSchema } from './schemas';

export type Order = z.infer<typeof orderSchema>;
export type NewOrder = z.infer<typeof newOrderSchema>;
export type Driver = z.infer<typeof driverSchema>;
export type OrderStatus = z.infer<typeof orderStatusSchema>;
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;
