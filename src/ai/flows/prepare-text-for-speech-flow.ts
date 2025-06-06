
'use server';
/**
 * @fileOverview Prepares text, optionally augmented by an image, for speech synthesis.
 * The image content will NOT be described or included in the prepared speech text.
 *
 * - prepareTextForSpeech - A function that takes text and/or an image and prepares ONLY the text for TTS.
 * - PrepareTextForSpeechInput - The input type for the prepareTextForSpeech function.
 * - PrepareTextForSpeechOutput - The return type for the prepareTextForSpeech function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PrepareTextForSpeechInputSchema = z.object({
  text: z.string().describe('The raw text to prepare for speech synthesis. Can be empty.'),
  imageDataUri: z.string().optional().describe("An image related to the text, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'. Optional. This image will NOT be described in the speech output."),
});
export type PrepareTextForSpeechInput = z.infer<typeof PrepareTextForSpeechInputSchema>;

const PrepareTextForSpeechOutputSchema = z.object({
  preparedText: z.string().describe('The text prepared for natural-sounding speech synthesis. This will be based SOLELY on the input text, not the image.'),
});
export type PrepareTextForSpeechOutput = z.infer<typeof PrepareTextForSpeechOutputSchema>;

export async function prepareTextForSpeech(input: PrepareTextForSpeechInput): Promise<PrepareTextForSpeechOutput> {
  return prepareTextForSpeechFlow(input);
}

const prompt = ai.definePrompt({
  name: 'prepareTextForSpeechPrompt',
  input: {schema: PrepareTextForSpeechInputSchema},
  output: {schema: PrepareTextForSpeechOutputSchema},
  prompt: `You are an AI assistant that refines user-provided text to be read aloud naturally by a text-to-speech (TTS) engine. Your primary goal is to improve the provided text for clarity, punctuation, and flow.

{{#if text}}
User-provided text: {{{text}}}
Please refine this text. The output should be plain text, suitable for direct input into a TTS system. Avoid any special markup unless it's simple and universally understood for pauses (e.g., '...').
{{else}}
No text was provided by the user.
{{/if}}

{{#if imageDataUri}}
An image was also provided (you can see it here: {{media url=imageDataUri}}). However, per instructions, do not describe the image or use its content in the speech output. The speech output must be based solely on the text provided by the user, if any.
{{/if}}

If text was provided and is not empty or just whitespace, the preparedText should be the refined version of that text.
If no text was provided, or if the text was empty or only whitespace (even if an image was present), the preparedText should be a clear statement indicating this, such as: "No text was provided to prepare for speech."
`,
});

const prepareTextForSpeechFlow = ai.defineFlow(
  {
    name: 'prepareTextForSpeechFlow',
    inputSchema: PrepareTextForSpeechInputSchema,
    outputSchema: PrepareTextForSpeechOutputSchema,
  },
  async input => {
    // The prompt is designed to handle cases where text is empty or missing.
    const {output} = await prompt(input);
    return output!;
  }
);

