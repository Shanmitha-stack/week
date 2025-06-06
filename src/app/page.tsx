
"use client";

import React, { useState, ChangeEvent, useEffect, useCallback } from 'react';
import Image from 'next/image';
import AppHeader from '@/components/AppHeader';
import SectionCard from '@/components/SectionCard';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from "@/hooks/use-toast";
import { Text, Mic, Loader2, UploadCloud, ImagePlus, Volume2, StopCircle } from 'lucide-react';
import { prepareTextForSpeech } from '@/ai/flows/prepare-text-for-speech-flow';

export default function Home() {
  const [textInput, setTextInput] = useState<string>('');
  const [isGeneratingSpeech, setIsGeneratingSpeech] = useState<boolean>(false);
  
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [preparedSpeechText, setPreparedSpeechText] = useState<string | null>(null);

  const [selectedVoiceSample, setSelectedVoiceSample] = useState<File | null>(null);
  const [isUploadingSample, setIsUploadingSample] = useState<boolean>(false);

  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState<boolean>(false);

  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setIsSpeechSupported(true);
    }
    // Cleanup speech synthesis on component unmount or if speaking is interrupted
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedImage(null);
      setImagePreview(null);
    }
  };

  const toDataURL = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleTextToSpeech = async () => {
    if (!textInput.trim() && !selectedImage) {
      toast({ title: "Input Required", description: "Please enter some text or select an image.", variant: "destructive" });
      return;
    }
    
    // Stop any ongoing speech
    if (isSpeaking && typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }

    setIsGeneratingSpeech(true);
    setPreparedSpeechText(null); 

    let imageDataUri: string | undefined = undefined;
    if (selectedImage) {
      try {
        imageDataUri = await toDataURL(selectedImage);
      } catch (error) {
        console.error("Error converting image to data URI:", error);
        toast({ title: "Error", description: "Failed to process image.", variant: "destructive" });
        setIsGeneratingSpeech(false);
        return;
      }
    }

    try {
      const { preparedText } = await prepareTextForSpeech({ text: textInput, imageDataUri });
      setPreparedSpeechText(preparedText);
      
      toast({ 
        title: "Input Processed for Speech", 
        description: `The text has been refined by AI and is shown below. ${isSpeechSupported ? "You can now use the 'Speak' button to hear it." : "Browser speech synthesis is not supported."}`,
        duration: 6000, 
      });

    } catch (error) {
      console.error("Error in text-to-speech process:", error);
      setPreparedSpeechText("Error: Could not process input for speech.");
      toast({ title: "Error", description: "Failed to process input for speech. See details below.", variant: "destructive" });
    } finally {
      setIsGeneratingSpeech(false);
    }
  };

  const handleSpeakPreparedText = useCallback(() => {
    if (!isSpeechSupported) {
      toast({ title: "Speech Not Supported", description: "Your browser does not support speech synthesis.", variant: "destructive" });
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    if (preparedSpeechText && preparedSpeechText.trim() !== "") {
      const utterance = new SpeechSynthesisUtterance(preparedSpeechText);
      utterance.onstart = () => {
        setIsSpeaking(true);
      };
      utterance.onend = () => {
        setIsSpeaking(false);
      };
      utterance.onerror = (event) => {
        console.error("Speech synthesis error:", event);
        toast({ title: "Speech Error", description: "Could not play speech. Please try again.", variant: "destructive" });
        setIsSpeaking(false);
      };
      window.speechSynthesis.speak(utterance);
    } else {
      toast({ title: "Nothing to Speak", description: "There is no prepared text to speak.", variant: "default" });
    }
  }, [preparedSpeechText, isSpeaking, isSpeechSupported, toast]);


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
    // Simulate upload
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsUploadingSample(false);
    toast({ title: "Sample Uploaded (Mock)", description: "Voice sample upload would be handled here. Voice cloning is not yet implemented." });
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <main className="flex-grow container mx-auto py-8 px-4">
        <div className="grid gap-8 md:gap-12">
          {/* Text and Image Input Section */}
          <SectionCard title="Text & Image to Speech Preparation" icon={<Text className="text-primary" />}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="text-input" className="text-base">Enter your text:</Label>
                <Textarea
                  id="text-input"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Type or paste your text here..."
                  rows={4}
                  className="text-base mt-1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="image-input" className="text-base flex items-center gap-2">
                  <ImagePlus className="h-5 w-5 text-muted-foreground" />
                  Optional: Add an image (image content will NOT be described in speech output)
                </Label>
                <Input
                  id="image-input"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="text-base file:text-primary file:font-medium"
                />
                {imagePreview && (
                  <div className="mt-2 border rounded-md p-2 inline-block bg-muted/30">
                    <Image
                      src={imagePreview}
                      alt="Selected image preview"
                      width={200}
                      height={200}
                      className="rounded-md object-contain max-h-48 w-auto"
                      data-ai-hint="image preview"
                    />
                  </div>
                )}
              </div>
              
              <Button onClick={handleTextToSpeech} disabled={isGeneratingSpeech} className="w-full sm:w-auto">
                {isGeneratingSpeech ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing Input...
                  </>
                ) : (
                  "Process Input for Speech"
                )}
              </Button>

              {preparedSpeechText && (
                <div className="mt-6 p-4 border rounded-md bg-muted/30 shadow">
                  <div className="flex justify-between items-center mb-2">
                    <Label className="text-lg font-semibold text-foreground">Prepared Text for Speech:</Label>
                    {isSpeechSupported && preparedSpeechText.trim() !== "" && (
                      <Button
                        onClick={handleSpeakPreparedText}
                        variant="outline"
                        size="sm"
                        disabled={isGeneratingSpeech} 
                      >
                        {isSpeaking ? (
                          <>
                            <StopCircle className="mr-2 h-4 w-4" />
                            Stop Speaking
                          </>
                        ) : (
                          <>
                            <Volume2 className="mr-2 h-4 w-4" />
                            Speak
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                  <p className="text-base whitespace-pre-wrap text-foreground/90">{preparedSpeechText}</p>
                   {!isSpeechSupported && preparedSpeechText.trim() !== "" && (
                    <p className="mt-3 text-sm text-muted-foreground italic">
                      Your browser does not support speech synthesis.
                    </p>
                  )}
                </div>
              )}
            </div>
          </SectionCard>

          {/* Voice Sample Upload Section */}
          <SectionCard title="Upload Voice Sample (for future use)" icon={<Mic className="text-primary" />}>
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
                Upload your voice samples here. Voice cloning functionality is not yet implemented. This section is for demonstrating future capabilities.
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
