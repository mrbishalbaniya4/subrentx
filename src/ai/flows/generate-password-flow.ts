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

const prompt = ai.definePrompt({
  name: 'generatePasswordPrompt',
  input: {schema: GeneratePasswordInputSchema},
  output: {schema: GeneratePasswordOutputSchema},
  prompt: `You are an expert password generator. Create a single, strong, random password based on the following criteria. Only return the password and nothing else.

- Length: {{{length}}} characters.
- Include Numbers: {{{includeNumbers}}}.
- Include Symbols: {{{includeSymbols}}}.
- Must include a mix of uppercase and lowercase letters.
`,
});


const generatePasswordFlow = ai.defineFlow(
  {
    name: 'generatePasswordFlow',
    inputSchema: GeneratePasswordInputSchema,
    outputSchema: GeneratePasswordOutputSchema,
  },
  async input => {
    // For simple generation, we can bypass a complex prompt and just generate it.
    // This is more reliable and faster than prompting an LLM.
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    let availableChars = chars;
    if (input.includeNumbers) availableChars += numbers;
    if (input.includeSymbols) availableChars += symbols;

    let password = '';
    for (let i = 0; i < input.length; i++) {
        password += availableChars.charAt(Math.floor(Math.random() * availableChars.length));
    }
    
    // Ensure all required character types are present
    let passwordChars = password.split('');
    if (input.includeNumbers && !/\d/.test(password)) {
        passwordChars[0] = numbers.charAt(Math.floor(Math.random() * numbers.length));
    }
    if (input.includeSymbols && !/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
        passwordChars[1] = symbols.charAt(Math.floor(Math.random() * symbols.length));
    }
    if (!/[A-Z]/.test(password)) {
        passwordChars[2] = chars.charAt(Math.floor(Math.random() * 26));
    }
     if (!/[a-z]/.test(password)) {
        passwordChars[3] = chars.charAt(Math.floor(Math.random() * 26) + 26);
    }
    
    // Shuffle to ensure randomness
    password = passwordChars.sort(() => 0.5 - Math.random()).join('');


    return { password };
  }
);
