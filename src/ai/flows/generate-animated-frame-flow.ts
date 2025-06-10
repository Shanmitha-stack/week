
'use server';
/**
 * @fileOverview Generates a mock "animated" frame from an input image using AI,
 * aiming for natural and expressive speaking animations with attention to lip synchronization
 * with the initial part of the provided text.
 * This is intended for UI demonstration purposes and does not perform actual video animation or true lip-sync.
 *
 * - generateAnimatedFrame - A function that takes an image and a prompt to generate a new image.
 * - GenerateAnimatedFrameInput - The input type.
 * - GenerateAnimatedFrameOutput - The output type.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateAnimatedFrameInputSchema = z.object({
  originalImageDataUri: z
    .string()
    .describe(
      "The original face image as a data URI. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  animationPrompt: z
    .string()
    .describe(
      'A text prompt to guide the AI in generating a new image frame. The prompt should encourage the AI to create a natural, clear, and expressive facial animation that conveys appropriate emotion for the provided text. It should specifically focus on a mouth shape and facial expression that corresponds to the initial sounds of the text, making the lips appear synchronized with the beginning of the speech, as if it\'s a keyframe from an animated video. E.g., "Generate an image of this person as if they are in the middle of speaking the following text. Focus on a natural mouth shape and facial expression that clearly corresponds to the initial sounds of this text, making the lips appear synchronized with the beginning of the speech. Convey appropriate emotion. Imagine this is a keyframe from an animated video. Text: [text snippet]"'
    ),
});
export type GenerateAnimatedFrameInput = z.infer<typeof GenerateAnimatedFrameInputSchema>;

const GenerateAnimatedFrameOutputSchema = z.object({
  generatedFrameDataUri: z.string().optional().describe('The generated image frame as a data URI, if successful.'),
  errorMessage: z.string().optional().describe('An error message if generation failed.'),
});
export type GenerateAnimatedFrameOutput = z.infer<typeof GenerateAnimatedFrameOutputSchema>;

export async function generateAnimatedFrame(input: GenerateAnimatedFrameInput): Promise<GenerateAnimatedFrameOutput> {
  return generateAnimatedFrameFlow(input);
}

const generateAnimatedFrameFlow = ai.defineFlow(
  {
    name: 'generateAnimatedFrameFlow',
    inputSchema: GenerateAnimatedFrameInputSchema,
    outputSchema: GenerateAnimatedFrameOutputSchema,
  },
  async ({ originalImageDataUri, animationPrompt }) => {
    try {
      const { media, text } = await ai.generate({
        model: 'googleai/gemini-2.0-flash-exp', // MUST be this model for image generation
        prompt: [
          { media: { url: originalImageDataUri } },
          { text: animationPrompt },
        ],
        config: {
          responseModalities: ['TEXT', 'IMAGE'], // MUST provide both TEXT and IMAGE
          safetySettings: [ 
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          ],
        },
      });

      if (media && media.url) {
        return { generatedFrameDataUri: media.url };
      } else {
        console.warn('[generateAnimatedFrameFlow] Image generation did not return a media URL. Text response:', text);
        return { errorMessage: `Image generation succeeded but returned no image. AI said: ${text || 'No text response.'}` };
      }
    } catch (error: any) {
      console.error('[generateAnimatedFrameFlow] Error generating mock animated frame:', error);
      const message = error.message || 'An unexpected error occurred during mock frame generation.';
      if (error.finishReason) {
        return { errorMessage: `Generation failed. Reason: ${error.finishReason}. Details: ${message}` };
      }
      return { errorMessage: message };
    }
  }
);

