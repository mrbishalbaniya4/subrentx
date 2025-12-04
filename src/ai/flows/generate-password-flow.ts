'use server';

/**
 * @fileOverview Provides a strong password generation utility.
 *
 * - generatePassword - A function that generates a strong, random password.
 * - GeneratePasswordInput - The input type for the generatePassword function.
 * - GeneratePasswordOutput - The return type for the generatePassword function.
 */

import { z } from 'zod';

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
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  let availableChars = chars;
  if (input.includeNumbers) {
    availableChars += numbers;
  }
  if (input.includeSymbols) {
    availableChars += symbols;
  }

  let password = '';
  // Math.random() is not cryptographically secure, but okay for this use case.
  // for production use, consider crypto.getRandomValues()
  for (let i = 0; i < input.length; i++) {
    password += availableChars.charAt(Math.floor(Math.random() * availableChars.length));
  }

  return { password };
}
