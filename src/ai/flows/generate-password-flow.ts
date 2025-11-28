'use server';

/**
 * @fileOverview Provides a strong password generation utility.
 *
 * - generatePassword - A function that generates a strong, random password.
 * - GeneratePasswordInput - The input type for the generatePassword function.
 * - GeneratePasswordOutput - The return type for the generatePassword function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { generate } from 'genkit/tools';

const GeneratePasswordInputSchema = z.object({
  length: z.number().min(8).max(128).default(16).describe('The desired length of the password.'),
  includeNumbers: z.boolean().default(true).describe('Whether to include numbers in the password.'),
  includeSymbols: z.boolean().default(true).describe('Whether to include symbols in the password.'),
});
export type GeneratePasswordInput = z.infer<typeof GeneratePasswordInputSchema>;

const GeneratePasswordOutputSchema = z.object({
  password: z.string().describe('The generated strong password.'),
});
export type GeneratePasswordOutput = z.infer<typeof GeneratePasswordOutputSchema>;

export async function generatePassword(
  input: GeneratePasswordInput
): Promise<GeneratePasswordOutput> {
  return generatePasswordFlow(input);
}

const generatePasswordFlow = ai.defineFlow(
  {
    name: 'generatePasswordFlow',
    inputSchema: GeneratePasswordInputSchema,
    outputSchema: GeneratePasswordOutputSchema,
  },
  async input => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';

    let availableChars = chars;
    if (input.includeNumbers) {
        availableChars += numbers;
    }
    
    let password = '';
    for (let i = 0; i < input.length; i++) {
        password += availableChars.charAt(Math.floor(Math.random() * availableChars.length));
    }
    
    return { password };
  }
);
