
"use client";

import React, { useState, ChangeEvent, useEffect } from 'react';
import Image from 'next/image';
import AppHeader from '@/components/AppHeader';
import SectionCard from '@/components/SectionCard';
import AudioPlayer from '@/components/AudioPlayer';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from "@/hooks/use-toast";
import { Text, Mic, Loader2, UploadCloud } from 'lucide-react';
import { prepareTextForSpeech } from '@/ai/flows/prepare-text-for-speech-flow';

export default function Home() {
  const [textInput, setTextInput] = useState<string>('');
  const [isGeneratingSpeech, setIsGeneratingSpeech] = useState<boolean>(false);
  const [generatedAudioSrc, setGeneratedAudioSrc] = useState<string | null>(null);

  const [selectedVoiceSample, setSelectedVoiceSample] = useState<File | null>(null);
  const [isUploadingSample, setIsUploadingSample] = useState<boolean>(false);

  const { toast } = useToast();

  const handleTextToSpeech = async () => {
    if (!textInput.trim()) {
      toast({ title: "Input Required", description: "Please enter some text to convert.", variant: "destructive" });
      return;
    }
    setIsGeneratingSpeech(true);
    setGeneratedAudioSrc(null); 

    try {
      const { preparedText } = await prepareTextForSpeech({ text: textInput });
      console.log("Prepared text for TTS:", preparedText);

      // Simulate API call for actual TTS audio generation using 'preparedText'
      // In a real scenario, 'preparedText' would be sent to a TTS service.
      // For now, we are only preparing the text. Actual audio synthesis is not implemented.
      await new Promise(resolve => setTimeout(resolve, 500)); 
      
      // No audio source is set, as actual TTS is not implemented.
      // setGeneratedAudioSrc("https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"); 
      
      toast({ 
        title: "Text Processed", 
        description: "Your text has been prepared for speech. Actual audio generation is not currently available." 
      });

    } catch (error) {
      console.error("Error in text-to-speech process:", error);
      toast({ title: "Error", description: "Failed to process text for speech.", variant: "destructive" });
    } finally {
      setIsGeneratingSpeech(false);
    }
  };

  const handleVoiceSampleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedVoiceSample(file);
    } else {
      setSelectedVoiceSample(null);
    }
  };

  const handleUploadVoiceSample = async () => {
    if (!selectedVoiceSample) {
      toast({ title: "Voice Sample Required", description: "Please select a voice sample to upload.", variant: "destructive" });
      return;
    }
    setIsUploadingSample(true);
    // Simulate API call for upload
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsUploadingSample(false);
    toast({ title: "Sample Uploaded (Mock)", description: "Voice sample upload would be handled here." });
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <main className="flex-grow container mx-auto py-8 px-4">
        <div className="grid gap-8 md:gap-12">
          {/* Text Input Section */}
          <SectionCard title="Text-to-Speech" icon={<Text className="text-primary" />}>
            <div className="space-y-4">
              <Label htmlFor="text-input" className="text-base">Enter your text below:</Label>
              <Textarea
                id="text-input"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type or paste your text here..."
                rows={6}
                className="text-base"
              />
              <Button onClick={handleTextToSpeech} disabled={isGeneratingSpeech} className="w-full sm:w-auto">
                {isGeneratingSpeech ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Process Text for Speech"
                )}
              </Button>
              {generatedAudioSrc && (
                <div className="mt-4">
                  <AudioPlayer src={generatedAudioSrc} autoPlay={false} />
                </div>
              )}
            </div>
          </SectionCard>

          {/* Voice Sample Upload Section */}
          <SectionCard title="Upload Voice Sample" icon={<Mic className="text-primary" />}>
            <div className="space-y-4">
              <Label htmlFor="voice-sample-input" className="text-base">Upload a voice sample (e.g., .wav, .mp3):</Label>
              <Input
                id="voice-sample-input"
                type="file"
                accept="audio/*"
                onChange={handleVoiceSampleChange}
                className="text-base file:text-primary file:font-medium"
              />
              {selectedVoiceSample && (
                <p className="text-sm text-muted-foreground">Selected file: {selectedVoiceSample.name}</p>
              )}
              <Button onClick={handleUploadVoiceSample} disabled={isUploadingSample || !selectedVoiceSample} className="w-full sm:w-auto">
                {isUploadingSample ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <UploadCloud className="mr-2 h-4 w-4" />
                    Upload Sample
                  </>
                )}
              </Button>
              <p className="text-sm text-muted-foreground">
                Upload your voice samples here for future voice cloning capabilities. Currently mocked.
              </p>
            </div>
          </SectionCard>
        </div>
      </main>
      <footer className="py-6 text-center text-muted-foreground border-t">
        <p>&copy; {new Date().getFullYear()} week1 App. All rights reserved.</p>
      </footer>
    </div>
  );
}
