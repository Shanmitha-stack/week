
'use server';
/**
 * @fileOverview Prepares text, optionally augmented by an image, for speech synthesis.
 *
 * - prepareTextForSpeech - A function that takes text and/or an image and prepares it for TTS.
 * - PrepareTextForSpeechInput - The input type for the prepareTextForSpeech function.
 * - PrepareTextForSpeechOutput - The return type for the prepareTextForSpeech function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PrepareTextForSpeechInputSchema = z.object({
  text: z.string().describe('The raw text to prepare for speech synthesis. Can be empty if imageDataUri is provided.'),
  imageDataUri: z.string().optional().describe("An image related to the text, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'. Optional."),
});
export type PrepareTextForSpeechInput = z.infer<typeof PrepareTextForSpeechInputSchema>;

const PrepareTextForSpeechOutputSchema = z.object({
  preparedText: z.string().describe('The text prepared for natural-sounding speech synthesis, potentially incorporating image content.'),
});
export type PrepareTextForSpeechOutput = z.infer<typeof PrepareTextForSpeechOutputSchema>;

export async function prepareTextForSpeech(input: PrepareTextForSpeechInput): Promise<PrepareTextForSpeechOutput> {
  return prepareTextForSpeechFlow(input);
}

const prompt = ai.definePrompt({
  name: 'prepareTextForSpeechPrompt',
  input: {schema: PrepareTextForSpeechInputSchema},
  output: {schema: PrepareTextForSpeechOutputSchema},
  prompt: `You are an AI assistant that refines text to be read aloud naturally by a text-to-speech (TTS) engine.

{{#if text}}
User-provided text: {{{text}}}
{{else}}
No direct text was provided by the user.
{{/if}}

{{#if imageDataUri}}
An image was also provided. Analyze the image and generate a concise description or extract relevant information from it.
Image content: {{media url=imageDataUri}}
{{else}}
No image was provided.
{{/if}}

Based on the available inputs (text and/or image), create a combined narrative.
- If both text and image are present, ensure the image-derived text flows naturally with the user-provided text, or describes the image in context of the text.
- If only an image is present, provide a description of the image.
- If only text is present, use that text.
- If neither text nor image is provided, the output should be a statement like "No input was provided to prepare for speech."

Then, improve this resulting text for clarity, punctuation, and flow. Ensure the output is plain text, suitable for direct input into a TTS system. Do not use any special markup unless it's simple and universally understood for pauses (e.g., '...'). The final output should be the prepared text ready for speech.
If no inputs were provided, the preparedText should reflect that, e.g., "No textual or visual input was available to process for speech."
`,
});

const prepareTextForSpeechFlow = ai.defineFlow(
  {
    name: 'prepareTextForSpeechFlow',
    inputSchema: PrepareTextForSpeechInputSchema,
    outputSchema: PrepareTextForSpeechOutputSchema,
  },
  async input => {
    if (!input.text && !input.imageDataUri) {
      return { preparedText: "No textual or visual input was available to process for speech." };
    }
    const {output} = await prompt(input);
    return output!;
  }
);
