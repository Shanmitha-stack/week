'use server';

/**
 * @fileOverview Improves text input for clarity and grammar.
 *
 * - improveTextInput - A function that takes text input and improves it.
 * - ImproveTextInputInput - The input type for the improveTextInput function.
 * - ImproveTextInputOutput - The return type for the improveTextInput function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ImproveTextInputInputSchema = z.object({
  text: z.string().describe('The text to improve.'),
});
export type ImproveTextInputInput = z.infer<typeof ImproveTextInputInputSchema>;

const ImproveTextInputOutputSchema = z.object({
  improvedText: z.string().describe('The improved text.'),
});
export type ImproveTextInputOutput = z.infer<typeof ImproveTextInputOutputSchema>;

export async function improveTextInput(input: ImproveTextInputInput): Promise<ImproveTextInputOutput> {
  return improveTextInputFlow(input);
}

const prompt = ai.definePrompt({
  name: 'improveTextInputPrompt',
  input: {schema: ImproveTextInputInputSchema},
  output: {schema: ImproveTextInputOutputSchema},
  prompt: `Improve the following text for clarity and grammar, ensuring it is suitable for use in an important document:\n\n{{{text}}}`,
});

const improveTextInputFlow = ai.defineFlow(
  {
    name: 'improveTextInputFlow',
    inputSchema: ImproveTextInputInputSchema,
    outputSchema: ImproveTextInputOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
