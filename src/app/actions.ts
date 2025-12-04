
'use server';

import { generatePassword, type GeneratePasswordInput } from '@/ai/flows/generate-password-flow';

export async function generatePasswordAction(input: GeneratePasswordInput): Promise<{
  password?: string;
  error?: string;
}> {
  try {
    const result = await generatePassword(input);
    return { password: result.password };
  } catch (e) {
    console.error(e);
    return { error: 'Failed to generate a password. Please try again.' };
  }
}
