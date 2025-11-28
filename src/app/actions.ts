'use server';

import { suggestExpirationDate } from '@/ai/flows/suggest-expiration-date';
import { generatePassword } from '@/ai/flows/generate-password-flow';

export async function suggestDateAction(itemDescription: string): Promise<{
  suggestedDate?: string;
  error?: string;
}> {
  if (!itemDescription) {
    return { error: 'Item description is required.' };
  }
  try {
    const result = await suggestExpirationDate({ itemDescription });
    return { suggestedDate: result.suggestedExpirationDate };
  } catch (e) {
    console.error(e);
    return { error: 'Failed to suggest a date. Please try again.' };
  }
}

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
