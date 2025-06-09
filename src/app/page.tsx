
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
import { Text, Mic, Loader2, UploadCloud, ImagePlus, Volume2, StopCircle, Smile } from 'lucide-react';
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

  const [staticFaceImage, setStaticFaceImage] = useState<File | null>(null);
  const [staticFaceImagePreview, setStaticFaceImagePreview] = useState<string | null>(null);
  const [animatedVideoResult, setAnimatedVideoResult] = useState<string | null>(null);
  const [isAnimatingFace, setIsAnimatingFace] = useState<boolean>(false);

  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setIsSpeechSupported(true);
    }
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis) {
        if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
          window.speechSynthesis.cancel();
        }
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
    
    if (isSpeaking && typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }

    setIsGeneratingSpeech(true);
    setPreparedSpeechText(null); 
    setAnimatedVideoResult(null); 

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
      
      const shouldSpeak = preparedText && 
                          preparedText.trim() !== "" && 
                          !preparedText.toLowerCase().startsWith("no text was provided") && 
                          !preparedText.toLowerCase().startsWith("error:");

      if (isSpeechSupported && shouldSpeak) {
        const utterance = new SpeechSynthesisUtterance(preparedText);
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = (event) => {
          console.error("Speech synthesis error. Code:", event.error, "Event details:", event);
          toast({ title: "Speech Error", description: "Could not play speech automatically. You can try the 'Speak' button.", variant: "destructive" });
          setIsSpeaking(false);
        };
        window.speechSynthesis.speak(utterance);
        toast({
          title: "Processing Complete",
          description: "Speaking the prepared text...",
          duration: 3000,
        });
      } else if (shouldSpeak) {
        toast({
          title: "Input Processed",
          description: `Prepared text: "${preparedText.substring(0,100)}${preparedText.length > 100 ? '...' : ''}". Browser speech synthesis not supported.`,
          duration: 6000,
        });
      } else {
        toast({
          title: "Input Processed",
          description: preparedText || "An issue occurred while preparing text.", 
          duration: 6000,
        });
      }
    } catch (error) {
      console.error("Error in text-to-speech process:", error);
      const errorMessage = "Error: Could not process input for speech.";
      setPreparedSpeechText(errorMessage);
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
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
    if (preparedSpeechText && preparedSpeechText.trim() !== "" && !preparedSpeechText.toLowerCase().startsWith("error:") && !preparedSpeechText.toLowerCase().startsWith("no text was provided")) {
      const utterance = new SpeechSynthesisUtterance(preparedSpeechText);
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = (event) => {
        console.error("Speech synthesis error. Code:", event.error, "Event details:", event);
        toast({ title: "Speech Error", description: "Could not play speech. Please try again.", variant: "destructive" });
        setIsSpeaking(false);
      };
      window.speechSynthesis.speak(utterance);
    } else {
      toast({ title: "Nothing to Speak", description: "There is no suitable prepared text to speak.", variant: "default" });
    }
  }, [preparedSpeechText, isSpeaking, isSpeechSupported, toast]);

  const handleVoiceSampleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) setSelectedVoiceSample(file);
    else setSelectedVoiceSample(null);
  };

  const handleUploadVoiceSample = async () => {
    if (!selectedVoiceSample) {
      toast({ title: "Voice Sample Required", description: "Please select a voice sample to upload.", variant: "destructive" });
      return;
    }
    setIsUploadingSample(true);
    await new Promise(resolve => setTimeout(resolve, 1500)); // Mock upload
    setIsUploadingSample(false);
    toast({ title: "Sample Uploaded (Mock)", description: "Voice sample upload would be handled here. Voice cloning is not yet implemented." });
  };

  const handleStaticFaceImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setStaticFaceImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setStaticFaceImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setStaticFaceImage(null);
      setStaticFaceImagePreview(null);
    }
  };

  const handleAnimateFace = async () => {
    if (!staticFaceImage) {
      toast({ title: "Static Face Image Required", description: "Please upload a static face image.", variant: "destructive" });
      return;
    }
    const isPreparedTextUsable = preparedSpeechText && 
                                preparedSpeechText.trim() !== "" && 
                                !preparedSpeechText.toLowerCase().startsWith("no text was provided") && 
                                !preparedSpeechText.toLowerCase().startsWith("error:");
    if (!isPreparedTextUsable) {
      toast({ title: "Prepared Speech Text Required", description: "Please process some text for speech first. The animation needs audio context.", variant: "destructive" });
      return;
    }

    setIsAnimatingFace(true);
    setAnimatedVideoResult(null); 

    toast({ title: "Animating Face (Mock)", description: "This is a placeholder. In a real app, this would call a lip-sync service." });
    await new Promise(resolve => setTimeout(resolve, 2500)); 

    const preparedTextSnippet = preparedSpeechText.substring(0, 70) + (preparedSpeechText.length > 70 ? '...' : '');
    let voiceSampleInfo = '';
    if (selectedVoiceSample) {
      voiceSampleInfo = ` with custom voice from "${selectedVoiceSample.name}"`;
    }

    const mockVideoOutput = `Animation using face image "${staticFaceImage.name}", prepared speech: "${preparedTextSnippet}"${voiceSampleInfo}. The animated video would be displayed here. (Mock Output)`;
    setAnimatedVideoResult(mockVideoOutput);

    setIsAnimatingFace(false);
    toast({ title: "Face Animation Complete (Mock)", description: "Video result (mock) is now available." });
  };

  const canAnimateFace = staticFaceImage && 
                         preparedSpeechText && 
                         preparedSpeechText.trim() !== "" && 
                         !preparedSpeechText.toLowerCase().startsWith("no text was provided") && 
                         !preparedSpeechText.toLowerCase().startsWith("error:");

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <main className="flex-grow container mx-auto py-8 px-4">
        <div className="grid gap-8 md:gap-12">
          
          <SectionCard title="Text &amp; Image to Speech Preparation" icon={<Text className="text-primary" />} >
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
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing Input...</>
                ) : (
                  "Process Input for Speech"
                )}
              </Button>
              {preparedSpeechText && (
                <div className="mt-6 p-4 border rounded-md bg-muted/30 shadow">
                  <div className="flex justify-between items-center mb-2">
                    <Label className="text-lg font-semibold text-foreground">Prepared Text for Speech:</Label>
                    {isSpeechSupported && preparedSpeechText.trim() !== "" && !preparedSpeechText.toLowerCase().startsWith("error:") && !preparedSpeechText.toLowerCase().startsWith("no text was provided") && (
                      <Button onClick={handleSpeakPreparedText} variant="outline" size="sm" disabled={isGeneratingSpeech}>
                        {isSpeaking ? <><StopCircle className="mr-2 h-4 w-4" />Stop Speaking</> : <><Volume2 className="mr-2 h-4 w-4" />Speak</>}
                      </Button>
                    )}
                  </div>
                  <p className="text-base whitespace-pre-wrap text-foreground/90">{preparedSpeechText}</p>
                   {!isSpeechSupported && preparedSpeechText && preparedSpeechText.trim() !== "" && !preparedSpeechText.toLowerCase().startsWith("error:") && !preparedSpeechText.toLowerCase().startsWith("no text was provided") && (
                    <p className="mt-3 text-sm text-muted-foreground italic">
                      Your browser does not support speech synthesis. You can use the 'Speak' button if it becomes available.
                    </p>
                  )}
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Lip Sync &amp; Face Animation (Week 2)" icon={<Smile className="text-primary" />} >
            <div className="space-y-4">
              <div>
                <Label htmlFor="static-face-image-input" className="text-base">Upload a static face image:</Label>
                <Input
                  id="static-face-image-input"
                  type="file"
                  accept="image/*"
                  onChange={handleStaticFaceImageChange}
                  className="text-base mt-1 file:text-primary file:font-medium"
                />
                {staticFaceImagePreview && (
                  <div className="mt-2 border rounded-md p-2 inline-block bg-muted/30">
                    <Image
                      src={staticFaceImagePreview}
                      alt="Static face image preview"
                      width={200}
                      height={200}
                      className="rounded-md object-contain max-h-48 w-auto"
                      data-ai-hint="face portrait"
                    />
                  </div>
                )}
              </div>

              <Button 
                onClick={handleAnimateFace} 
                disabled={isAnimatingFace || !canAnimateFace} 
                className="w-full sm:w-auto"
              >
                {isAnimatingFace ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Animating Face...
                  </>
                ) : (
                  "Animate Face with Prepared Speech"
                )}
              </Button>

              {animatedVideoResult && (
                <div className="mt-6 p-4 border rounded-md bg-muted/30 shadow">
                  <Label className="text-lg font-semibold text-foreground">Animation Output:</Label>
                  <p className="text-base whitespace-pre-wrap text-foreground/90 mt-2">{animatedVideoResult}</p>
                  {/* 
                    Future placeholder for actual video player:
                    <video controls src={actualVideoUrlFromState} className="w-full rounded-md mt-2">
                      Your browser does not support the video tag.
                    </video> 
                  */}
                </div>
              )}
               <p className="text-sm text-muted-foreground mt-4">
                This section demonstrates the planned UI for lip-syncing a static face image with the generated audio. The actual animation processing (e.g., using Wav2Lip/SadTalker) would be handled by a backend service, which is not implemented here.
              </p>
            </div>
          </SectionCard>

          <SectionCard title="Upload Voice Sample (for future use)" icon={<Mic className="text-primary" />} >
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
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Uploading...</>
                ) : (
                  <><UploadCloud className="mr-2 h-4 w-4" />Upload Sample</>
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
