'use server';

import { generatePassword } from '@/ai/flows/generate-password-flow';

export async function generatePasswordAction(): Promise<{
  password?: string;
  error?: string;
}> {
  try {
    const result = await generatePassword({
      length: 6,
      includeNumbers: true,
      includeSymbols: false,
    });
    return { password: result.password };
  } catch (e) {
    console.error(e);
    return { error: 'Failed to generate a password. Please try again.' };
  }
}
