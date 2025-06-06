
'use server';
/**
 * @fileOverview Prepares text for speech synthesis.
 *
 * - prepareTextForSpeech - A function that takes text input and prepares it for TTS.
 * - PrepareTextForSpeechInput - The input type for the prepareTextForSpeech function.
 * - PrepareTextForSpeechOutput - The return type for the prepareTextForSpeech function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PrepareTextForSpeechInputSchema = z.object({
  text: z.string().describe('The raw text to prepare for speech synthesis.'),
});
export type PrepareTextForSpeechInput = z.infer<typeof PrepareTextForSpeechInputSchema>;

const PrepareTextForSpeechOutputSchema = z.object({
  preparedText: z.string().describe('The text prepared for natural-sounding speech synthesis.'),
});
export type PrepareTextForSpeechOutput = z.infer<typeof PrepareTextForSpeechOutputSchema>;

export async function prepareTextForSpeech(input: PrepareTextForSpeechInput): Promise<PrepareTextForSpeechOutput> {
  return prepareTextForSpeechFlow(input);
}

const prompt = ai.definePrompt({
  name: 'prepareTextForSpeechPrompt',
  input: {schema: PrepareTextForSpeechInputSchema},
  output: {schema: PrepareTextForSpeechOutputSchema},
  prompt: `You are an AI assistant that refines text to be read aloud naturally by a text-to-speech (TTS) engine. Improve the following text for clarity, punctuation, and flow. Ensure the output is plain text, suitable for direct input into a TTS system. Do not use any special markup unless it's simple and universally understood for pauses (e.g., '...'). Text: {{{text}}}`,
});

const prepareTextForSpeechFlow = ai.defineFlow(
  {
    name: 'prepareTextForSpeechFlow',
    inputSchema: PrepareTextForSpeechInputSchema,
    outputSchema: PrepareTextForSpeechOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
