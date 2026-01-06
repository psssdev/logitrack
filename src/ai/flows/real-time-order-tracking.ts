'use server';

/**
 * @fileOverview A real-time order tracking AI agent.
 *
 * - getRealTimeOrderStatus - A function that handles the real-time order status process.
 * - RealTimeOrderTrackingInput - The input type for the getRealTimeOrderStatus function.
 * - RealTimeOrderTrackingOutput - The return type for the getRealTimeOrderStatus function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RealTimeOrderTrackingInputSchema = z.object({
  orderId: z.string().describe('The ID of the order to track.'),
  currentLocation: z.string().describe('The current location of the order.'),
  destination: z.string().describe('The final destination of the order.'),
});
export type RealTimeOrderTrackingInput = z.infer<
  typeof RealTimeOrderTrackingInputSchema
>;

const RealTimeOrderTrackingOutputSchema = z.object({
  estimatedArrivalTime: z.string().describe('The estimated time of arrival.'),
  status: z.string().describe('The current status of the order.'),
  predictiveStatus: z
    .string()
    .describe(
      'A predictive status of the order, considering traffic, weather, and other road events.'
    ),
});
export type RealTimeOrderTrackingOutput = z.infer<
  typeof RealTimeOrderTrackingOutputSchema
>;

export async function getRealTimeOrderStatus(
  input: RealTimeOrderTrackingInput
): Promise<RealTimeOrderTrackingOutput> {
  return realTimeOrderTrackingFlow(input);
}

const prompt = ai.definePrompt({
  name: 'realTimeOrderTrackingPrompt',
  input: {schema: RealTimeOrderTrackingInputSchema},
  output: {schema: RealTimeOrderTrackingOutputSchema},
  prompt: `You are an AI assistant providing real-time order tracking information.

  Provide an estimated time of arrival, the current status of the order, and a predictive status considering traffic, weather, and other road events.

  Order ID: {{{orderId}}}
  Current Location: {{{currentLocation}}}
  Destination: {{{destination}}}
  `,
});

const realTimeOrderTrackingFlow = ai.defineFlow(
  {
    name: 'realTimeOrderTrackingFlow',
    inputSchema: RealTimeOrderTrackingInputSchema,
    outputSchema: RealTimeOrderTrackingOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
