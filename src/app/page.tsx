
"use client";

import React, { useState, ChangeEvent, useEffect, useCallback } from 'react';
import Image from 'next/image';
import AppHeader from '@/components/AppHeader';
import SectionCard from '@/components/SectionCard';
import AudioPlayer from '@/components/AudioPlayer';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from "@/hooks/use-toast";
import { Text, Mic, Loader2, UploadCloud, ImagePlus, Volume2, StopCircle, Smile, Video, VideoOff, MicVocal } from 'lucide-react';
import { prepareTextForSpeech } from '@/ai/flows/prepare-text-for-speech-flow';

export default function Home() {
  const [textInput, setTextInput] = useState<string>('');
  const [isGeneratingSpeech, setIsGeneratingSpeech] = useState<boolean>(false);
  
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [preparedSpeechText, setPreparedSpeechText] = useState<string | null>(null);

  const [selectedVoiceSample, setSelectedVoiceSample] = useState<File | null>(null);
  const [isCloningVoice, setIsCloningVoice] = useState<boolean>(false);
  const [clonedAudioUrl, setClonedAudioUrl] = useState<string | null>(null);


  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState<boolean>(false);

  const [staticFaceImage, setStaticFaceImage] = useState<File | null>(null);
  const [staticFaceImagePreview, setStaticFaceImagePreview] = useState<string | null>(null);
  const [animatedVideoResult, setAnimatedVideoResult] = useState<string | null>(null);
  const [isAnimatingFace, setIsAnimatingFace] = useState<boolean>(false);
  const [mockVideoPlayerImage, setMockVideoPlayerImage] = useState<string | null>(null);


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
    setAnimatedVideoResult(null);
    setMockVideoPlayerImage(null);
    setClonedAudioUrl(null);
    // If an image is changed, any previously prepared text might need re-evaluation,
    // so we clear preparedSpeechText here to force reprocessing.
    // Alternatively, one might choose to keep it if the text is independent.
    // For this app, let's assume changing the image means re-preparing.
    setPreparedSpeechText(null); 
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
    setMockVideoPlayerImage(null);
    setClonedAudioUrl(null);


    let imageDataUri: string | undefined = undefined;
    if (selectedImage) {
      try {
        imageDataUri = await toDataURL(selectedImage);
      } catch (error) {
        console.error("Error converting image to data URI:", error);
        toast({ title: "Image Error", description: "Failed to process image. Please try another.", variant: "destructive" });
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
      toast({ title: "Processing Error", description: error instanceof Error ? `${errorMessage} ${error.message}`: errorMessage, variant: "destructive" });
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
    setAnimatedVideoResult(null);
    setMockVideoPlayerImage(null);
    setClonedAudioUrl(null);
  };
  
  const isPreparedTextUsable = preparedSpeechText && 
                               preparedSpeechText.trim() !== "" && 
                               !preparedSpeechText.toLowerCase().startsWith("no text was provided") && 
                               !preparedSpeechText.toLowerCase().startsWith("error:");

  const handleCloneVoiceAndSynthesize = async () => {
    if (!selectedVoiceSample) {
      toast({ title: "Voice Sample Required", description: "Please select a voice sample.", variant: "destructive" });
      return;
    }
    if (!isPreparedTextUsable) {
      toast({ title: "Prepared Speech Text Required", description: "Please process some text for speech first. Voice cloning needs text to synthesize.", variant: "destructive" });
      return;
    }

    setIsCloningVoice(true);
    setClonedAudioUrl(null);
    setAnimatedVideoResult(null); 
    setMockVideoPlayerImage(null);

    try {
      toast({ title: "Mock Voice Cloning", description: "Initializing voice cloning process..." });
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast({ title: "Mock Voice Cloning", description: "Processing voice sample..." });
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast({ title: "Mock Voice Cloning", description: "Synthesizing speech with cloned voice..." });
      await new Promise(resolve => setTimeout(resolve, 2000));

      setClonedAudioUrl("mock-cloned-audio.wav"); 
      toast({ title: "Mock Voice Cloning Complete", description: `Speech based on "${preparedSpeechText!.substring(0,50)}..." using voice sample "${selectedVoiceSample.name}" is (mock) ready.` });
    } catch (error) {
      console.error("Error during mock voice cloning:", error);
      toast({ title: "Cloning Error", description: "An unexpected error occurred during mock voice cloning.", variant: "destructive" });
    } finally {
      setIsCloningVoice(false);
    }
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
    setAnimatedVideoResult(null);
    setMockVideoPlayerImage(null);
  };

  const handleAnimateFace = async () => {
    if (!staticFaceImage) {
      toast({ title: "Static Face Image Required", description: "Please upload a static face image.", variant: "destructive" });
      return;
    }
    
    const audioSourceText = clonedAudioUrl ? "cloned audio" : (isPreparedTextUsable ? "prepared speech text" : "valid audio source");
    if (!isPreparedTextUsable && !clonedAudioUrl) {
       toast({ title: "Audio Source Required", description: `Please process text for speech or perform mock voice cloning first. The animation needs an audio context.`, variant: "destructive" });
      return;
    }

    setIsAnimatingFace(true);
    setAnimatedVideoResult(null);
    setMockVideoPlayerImage(null); 

    try {
      toast({ title: "Starting Animation Process", description: "Preprocessing face image..." });
      await new Promise(resolve => setTimeout(resolve, 1500)); 

      toast({ title: "Processing Animation", description: `Generating lip-sync video with ${audioSourceText}...` });
      await new Promise(resolve => setTimeout(resolve, 2500)); 

      const preparedTextSnippet = preparedSpeechText ? preparedSpeechText.substring(0, 70) + (preparedSpeechText.length > 70 ? '...' : '') : "N/A";
      let voiceInfo = '';
      if (clonedAudioUrl && selectedVoiceSample) {
        voiceInfo = ` with custom cloned voice from "${selectedVoiceSample.name}"`;
      } else if (isPreparedTextUsable && selectedVoiceSample) {
        voiceInfo = ` (using standard TTS, voice sample "${selectedVoiceSample.name}" provided for context if backend supported it)`;
      } else if (isPreparedTextUsable) {
        voiceInfo = ` (standard browser TTS used)`;
      }
      
      const audioContextForMessage = clonedAudioUrl ? `using mock cloned audio` : (isPreparedTextUsable ? `using prepared speech: "${preparedTextSnippet}"` : "with available audio");

      const mockVideoOutputMessage = `Animation using face image "${staticFaceImage.name}", ${audioContextForMessage}${voiceInfo}. The animated video would be displayed here. (Mock Output)`;
      setAnimatedVideoResult(mockVideoOutputMessage);
      setMockVideoPlayerImage("https://placehold.co/640x360.png");

      toast({ title: "Face Animation Complete (Mock)", description: "Mock video result is now available." });
    } catch (error) {
      console.error("Error during face animation process:", error);
      toast({ title: "Animation Error", description: "An unexpected error occurred during face animation.", variant: "destructive" });
    } finally {
      setIsAnimatingFace(false);
    }
  };

  const canAnimateFace = staticFaceImage && (isPreparedTextUsable || clonedAudioUrl);


  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <main className="flex-grow container mx-auto py-8 px-4">
        <div className="grid gap-8 md:gap-12">
          
          <SectionCard title="Text & Image to Speech Preparation" icon={<Text className="text-primary" />} >
            <div className="space-y-4">
              <div>
                <Label htmlFor="text-input" className="text-base">Enter your text:</Label>
                <Textarea
                  id="text-input"
                  value={textInput}
                  onChange={(e) => {
                    setTextInput(e.target.value);
                    setPreparedSpeechText(null);
                    setAnimatedVideoResult(null);
                    setMockVideoPlayerImage(null);
                    setClonedAudioUrl(null);
                  }}
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
                      <Button onClick={handleSpeakPreparedText} variant="outline" size="sm" disabled={isGeneratingSpeech || isCloningVoice || isAnimatingFace}>
                        {isSpeaking ? <><StopCircle className="mr-2 h-4 w-4" />Stop Speaking</> : <><Volume2 className="mr-2 h-4 w-4" />Speak</>}
                      </Button>
                    )}
                  </div>
                  <p className="text-base whitespace-pre-wrap text-foreground/90">{preparedSpeechText}</p>
                   {!isSpeechSupported && preparedSpeechText && preparedSpeechText.trim() !== "" && !preparedSpeechText.toLowerCase().startsWith("error:") && !preparedSpeechText.toLowerCase().startsWith("no text was provided") && (
                    <p className="mt-3 text-sm text-muted-foreground italic">
                      Your browser does not support speech synthesis. 
                    </p>
                  )}
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Voice Cloning & Synthesis (Mock)" icon={<MicVocal className="text-primary" />}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="voice-sample-input" className="text-base">Upload a voice sample (e.g., .wav, .mp3):</Label>
                <Input
                  id="voice-sample-input"
                  type="file"
                  accept="audio/*"
                  onChange={handleVoiceSampleChange}
                  className="text-base mt-1 file:text-primary file:font-medium"
                />
                {selectedVoiceSample && (
                  <p className="text-sm text-muted-foreground mt-1">Selected file: {selectedVoiceSample.name}</p>
                )}
              </div>
              <Button 
                onClick={handleCloneVoiceAndSynthesize} 
                disabled={isCloningVoice || !selectedVoiceSample || !isPreparedTextUsable || isGeneratingSpeech || isAnimatingFace} 
                className="w-full sm:w-auto"
              >
                {isCloningVoice ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Cloning Voice...</>
                ) : (
                  <><MicVocal className="mr-2 h-4 w-4" />Generate Speech with Cloned Voice (Mock)</>
                )}
              </Button>
              {clonedAudioUrl && (
                <div className="mt-4 space-y-2">
                   <Label className="text-base font-semibold text-foreground">Mock Cloned Audio Output:</Label>
                  <AudioPlayer src={clonedAudioUrl} />
                   <p className="text-sm text-muted-foreground">
                    This audio player is for demonstration. The audio source is a mock placeholder.
                    Actual voice cloning would generate a unique audio file here.
                  </p>
                </div>
              )}
              <p className="text-sm text-muted-foreground pt-2">
                This section demonstrates the UI for voice cloning. Upload a voice sample and ensure text is prepared in the section above. 
                The "Generate Speech" button simulates a backend voice cloning process and displays a placeholder audio player. Actual voice cloning is not implemented.
              </p>
            </div>
          </SectionCard>


          <SectionCard title="Week 2: Face Preprocessing + Lip Sync Video (Audio + Image → Talking Face)" icon={<Smile className="text-primary" />} >
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
                disabled={isAnimatingFace || !canAnimateFace || isGeneratingSpeech || isCloningVoice} 
                className="w-full sm:w-auto"
              >
                {isAnimatingFace ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Animating Face...
                  </>
                ) : (
                  "Animate Face with Audio"
                )}
              </Button>

              <div className="mt-6 p-4 border rounded-md bg-muted/30 shadow">
                <Label className="text-lg font-semibold text-foreground flex items-center gap-2 mb-2">
                  <Video className="h-5 w-5"/>
                  Mock Animation Output:
                </Label>
                <div className="bg-black rounded-md flex items-center justify-center aspect-video overflow-hidden min-h-[200px]">
                  {isAnimatingFace ? (
                    <div className="flex flex-col items-center justify-center text-center p-4">
                      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                      <p className="text-lg font-semibold text-white">Generating Animation...</p>
                      <p className="text-sm text-gray-300">Please wait, this may take a moment.</p>
                    </div>
                  ) : mockVideoPlayerImage ? (
                    <Image
                      src={mockVideoPlayerImage}
                      alt="Mock video placeholder"
                      width={640}
                      height={360}
                      className="object-contain"
                      data-ai-hint="video placeholder"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-4">
                      <VideoOff className="h-12 w-12 mb-4" />
                      <p className="text-lg font-semibold">Animation will appear here</p>
                      <p className="text-sm">Upload a face image and ensure audio (prepared speech or mock cloned) is available, then click "Animate Face".</p>
                    </div>
                  )}
                </div>
                {!isAnimatingFace && animatedVideoResult && (
                  <p className="text-sm whitespace-pre-wrap text-foreground/80 mt-3 bg-background/50 p-3 rounded-md shadow-sm">{animatedVideoResult}</p>
                )}
              </div>
               <p className="text-sm text-muted-foreground mt-4">
                This section demonstrates the planned UI for lip-syncing a static face image with the generated audio (either standard TTS or mock cloned voice). The actual animation processing would be handled by a backend service.
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

    