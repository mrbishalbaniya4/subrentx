'use server';

/**
 * @fileOverview Provides expiration date suggestions based on item descriptions.
 *
 * - suggestExpirationDate - A function that suggests an expiration date based on the item description.
 * - SuggestExpirationDateInput - The input type for the suggestExpirationDate function.
 * - SuggestExpirationDateOutput - The return type for the suggestExpirationDate function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestExpirationDateInputSchema = z.object({
  itemDescription: z
    .string()
    .describe('The description of the item for which to suggest an expiration date.'),
});
export type SuggestExpirationDateInput = z.infer<typeof SuggestExpirationDateInputSchema>;

const SuggestExpirationDateOutputSchema = z.object({
  suggestedExpirationDate: z
    .string()
    .describe('The suggested expiration date in ISO 8601 format (YYYY-MM-DD).'),
  reasoning: z
    .string()
    .describe('The reasoning behind the suggested expiration date.'),
});
export type SuggestExpirationDateOutput = z.infer<typeof SuggestExpirationDateOutputSchema>;

export async function suggestExpirationDate(
  input: SuggestExpirationDateInput
): Promise<SuggestExpirationDateOutput> {
  return suggestExpirationDateFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestExpirationDatePrompt',
  input: {schema: SuggestExpirationDateInputSchema},
  output: {schema: SuggestExpirationDateOutputSchema},
  prompt: `You are an AI assistant that suggests expiration dates for items based on their description.

  Given the following item description, suggest a reasonable expiration date in YYYY-MM-DD format and explain your reasoning.

  Item Description: {{{itemDescription}}}
  `,
});

const suggestExpirationDateFlow = ai.defineFlow(
  {
    name: 'suggestExpirationDateFlow',
    inputSchema: SuggestExpirationDateInputSchema,
    outputSchema: SuggestExpirationDateOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
