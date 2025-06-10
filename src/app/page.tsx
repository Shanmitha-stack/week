
"use client";

import React, { useState, ChangeEvent, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import AppHeader from '@/components/AppHeader';
import SectionCard from '@/components/SectionCard';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from "@/hooks/use-toast";
import { Text, MicVocal, Loader2, ImagePlus, Volume2, StopCircle, AlertTriangle, Sparkles, Video } from 'lucide-react';
import { prepareTextForSpeech } from '@/ai/flows/prepare-text-for-speech-flow';
import { generateAnimatedFrame, type GenerateAnimatedFrameOutput } from '@/ai/flows/generate-animated-frame-flow';
import AudioPlayer from '@/components/AudioPlayer';


export default function Home() {
  const [textInput, setTextInput] = useState<string>('');
  const [isGeneratingSpeech, setIsGeneratingSpeech] = useState<boolean>(false);

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [preparedSpeechText, setPreparedSpeechText] = useState<string | null>(null);

  const [selectedVoiceSample, setSelectedVoiceSample] = useState<File | null>(null);
  const [isCloningVoice, setIsCloningVoice] = useState<boolean>(false);
  const [textForSimulatedClonedVoice, setTextForSimulatedClonedVoice] = useState<string | null>(null);
  
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [speakingText, setSpeakingText] = useState<string | null>(null); 
  const [isSimulatedClonedVoiceSpeaking, setIsSimulatedClonedVoiceSpeaking] = useState<boolean>(false);

  const [isSpeechSupported, setIsSpeechSupported] = useState<boolean>(false);

  // State for AI Animated Output section
  const [isGeneratingVideoOutput, setIsGeneratingVideoOutput] = useState<boolean>(false);
  const [expressiveFramePreview, setExpressiveFramePreview] = useState<string | null>(null);
  const [expressiveFrameError, setExpressiveFrameError] = useState<string | null>(null);
  const [mockAudioUrl, setMockAudioUrl] = useState<string | null>(null); // Changed from mockVideoUrl
  const [mockAudioError, setMockAudioError] = useState<string | null>(null); // Changed from mockVideoError
  
  const { toast } = useToast();

  const isSpeakingRef = useRef(isSpeaking);
  const isSimulatedClonedVoiceSpeakingRef = useRef(isSimulatedClonedVoiceSpeaking);
  const preparedSpeechTextRef = useRef(preparedSpeechText);
  const textForSimulatedClonedVoiceRef = useRef(textForSimulatedClonedVoice);
  const speakingTextRef = useRef(speakingText);
  const imagePreviewRef = useRef<string | null>(null);


  useEffect(() => {
    imagePreviewRef.current = imagePreview;
    if (!imagePreview) { 
      setExpressiveFramePreview(null); 
      setMockAudioUrl(null); // Changed from mockVideoUrl
    }
  }, [imagePreview]); 


  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  useEffect(() => {
    isSimulatedClonedVoiceSpeakingRef.current = isSimulatedClonedVoiceSpeaking;
  }, [isSimulatedClonedVoiceSpeaking]);

   useEffect(() => {
    preparedSpeechTextRef.current = preparedSpeechText;
  }, [preparedSpeechText]);

  useEffect(() => {
    textForSimulatedClonedVoiceRef.current = textForSimulatedClonedVoice;
  }, [textForSimulatedClonedVoice]);

  useEffect(() => {
    speakingTextRef.current = speakingText;
  }, [speakingText]);


  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis) {
      setIsSpeechSupported(true);
    } else {
      setIsSpeechSupported(false);
    }

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis) {
         if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
          window.speechSynthesis.cancel(); 
        }
        window.speechSynthesis.onvoiceschanged = null; 
      }
      setIsSpeaking(false); 
      setSpeakingText(null);
      setIsSimulatedClonedVoiceSpeaking(false);
    };
  }, []);
  

  const resetOutputsDependentOnTextOrImage = useCallback(() => {
    setPreparedSpeechText(null);
    setTextForSimulatedClonedVoice(null); 
    
    setExpressiveFramePreview(null); 
    setExpressiveFrameError(null); 
    setMockAudioUrl(null); // Changed from mockVideoUrl
    setMockAudioError(null); // Changed from mockVideoError


    if (typeof window !== 'undefined' && window.speechSynthesis && (isSpeakingRef.current || isSimulatedClonedVoiceSpeakingRef.current)) {
        window.speechSynthesis.cancel(); 
    }
    setIsSpeaking(false); 
    setSpeakingText(null);
    setIsSimulatedClonedVoiceSpeaking(false);
  }, []);


  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImagePreview(result);
      };
      reader.onerror = () => {
        setSelectedImage(null); 
        setImagePreview(null);
        toast({ title: "Image Load Error", description: "Could not read the selected image file.", variant: "destructive" });
      }
      reader.readAsDataURL(file);
    } else {
      setSelectedImage(null);
      setImagePreview(null);
    }
    resetOutputsDependentOnTextOrImage();
  };

  const isPreparedTextUsable = () => {
    const currentPreparedText = preparedSpeechTextRef.current; 
    return currentPreparedText &&
           currentPreparedText.trim() !== "" &&
           !currentPreparedText.toLowerCase().startsWith("no text was provided") &&
           !currentPreparedText.toLowerCase().startsWith("error:");
  };

  const handleTextToSpeech = async () => {
    if (!textInput.trim() && !selectedImage) {
      toast({ title: "Input Required", description: "Please enter some text or select an image.", variant: "destructive" });
      return;
    }

    if (typeof window !== 'undefined' && window.speechSynthesis && (window.speechSynthesis.speaking || window.speechSynthesis.pending) ) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false); 
    setSpeakingText(null);
    setIsSimulatedClonedVoiceSpeaking(false); 
    
    setExpressiveFramePreview(null); 
    setExpressiveFrameError(null);
    setMockAudioUrl(null); // Changed from mockVideoUrl
    setMockAudioError(null); // Changed from mockVideoError


    setIsGeneratingSpeech(true);
    setPreparedSpeechText(null); 
    setTextForSimulatedClonedVoice(null); 


    let imageDataUri: string | undefined = undefined;
    if (imagePreviewRef.current && selectedImage) { 
        imageDataUri = imagePreviewRef.current;
    }

    try {
      const { preparedText } = await prepareTextForSpeech({ text: textInput, imageDataUri });
      setPreparedSpeechText(preparedText); 

      const shouldSpeak = preparedText &&
                          preparedText.trim() !== "" &&
                          !preparedText.toLowerCase().startsWith("no text was provided") &&
                          !preparedText.toLowerCase().startsWith("error:");

      if (isSpeechSupported && shouldSpeak) {
        setIsSpeaking(true); 
        setSpeakingText(preparedText); 
        setIsSimulatedClonedVoiceSpeaking(false); 

        setTimeout(() => {
            if (!isSpeakingRef.current || speakingTextRef.current !== preparedText) {
                 if (isSpeakingRef.current && speakingTextRef.current !== preparedText) {
                    setIsSpeaking(false); 
                    setSpeakingText(null);
                 }
                return;
            }
            const utterance = new SpeechSynthesisUtterance(preparedText);
            utterance.onstart = () => {
              setIsSpeaking(true); 
              setIsSimulatedClonedVoiceSpeaking(false);
              setSpeakingText(preparedText);
            };
            utterance.onend = () => {
              setIsSpeaking(false);
              setSpeakingText(null);
            };
            utterance.onerror = (event) => {
              if (event.error === 'interrupted') {
                toast({ title: "Speech Interrupted", description: "Auto-playback was interrupted.", variant: "default" });
              } else {
                toast({ title: "Speech Error", description: `Could not auto-play speech. (Error: ${event.error || 'unknown'})`, variant: "destructive" });
              }
              setIsSpeaking(false);
              setSpeakingText(null);
            };
            window.speechSynthesis.speak(utterance);
        }, 100); 

        toast({
          title: "Processing Complete",
          description: "Speaking the prepared text...",
          duration: 3000,
        });
      } else if (shouldSpeak) { 
        toast({
          title: "Input Processed",
          description: `Prepared text: "${preparedText.substring(0,100)}${preparedText.length > 100 ? '...' : ''}". Browser speech synthesis not supported or text not suitable for auto-play.`,
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

    const textToSpeak = preparedSpeechTextRef.current; 

    if (isSpeakingRef.current && speakingTextRef.current === textToSpeak) { 
      window.speechSynthesis.cancel(); 
      setIsSpeaking(false);
      setSpeakingText(null);
      return;
    }
    
    const currentPreparedTextIsUsable = textToSpeak && 
                                    textToSpeak.trim() !== "" &&
                                    !textToSpeak.toLowerCase().startsWith("no text was provided") &&
                                    !textToSpeak.toLowerCase().startsWith("error:");

    if (currentPreparedTextIsUsable) { 
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        window.speechSynthesis.cancel(); 
      }
      
      setIsSpeaking(true); 
      setSpeakingText(textToSpeak); 
      setIsSimulatedClonedVoiceSpeaking(false); 

      setTimeout(() => {
        if (!isSpeakingRef.current || speakingTextRef.current !== textToSpeak) { 
           if (isSpeakingRef.current && speakingTextRef.current !== textToSpeak) { 
              setIsSpeaking(false); 
              setSpeakingText(null);
           }
          return;
        }
        const utterance = new SpeechSynthesisUtterance(textToSpeak!);
        utterance.onstart = () => {
          setIsSpeaking(true); 
          setIsSimulatedClonedVoiceSpeaking(false);
          setSpeakingText(textToSpeak);
        };
        utterance.onend = () => {
          setIsSpeaking(false);
          setSpeakingText(null);
        };
        utterance.onerror = (event) => {
          if (event.error === 'interrupted') {
            toast({ title: "Speech Interrupted", description: "Playback was interrupted.", variant: "default" });
          } else {
            toast({ title: "Speech Error", description: `Could not play speech. (Error: ${event.error || 'unknown'})`, variant: "destructive" });
          }
          setIsSpeaking(false);
          setSpeakingText(null);
        };
        window.speechSynthesis.speak(utterance);
      }, 100); 
    } else {
      toast({ title: "Nothing to Speak", description: "There is no suitable prepared text to speak.", variant: "default" });
    }
  }, [isSpeechSupported, toast]); 


  const handleVoiceSampleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) setSelectedVoiceSample(file);
    else setSelectedVoiceSample(null);
    
    setTextForSimulatedClonedVoice(null);

    if (typeof window !== 'undefined' && window.speechSynthesis && (isSpeakingRef.current || isSimulatedClonedVoiceSpeakingRef.current)) {
        window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setSpeakingText(null);
    setIsSimulatedClonedVoiceSpeaking(false);
  };

 const isPreparedTextAvailableAndUsable = () => {
    const currentPreparedText = preparedSpeechTextRef.current; 
    return currentPreparedText &&
           currentPreparedText.trim() !== "" &&
           !currentPreparedText.toLowerCase().startsWith("no text was provided") &&
           !currentPreparedText.toLowerCase().startsWith("error:");
  };

 const handleCloneVoiceAndSynthesize = async () => {
    setIsCloningVoice(true); 
    toast({ title: "Mock Voice Cloning", description: "Initializing voice cloning process..." });
    
    const currentPreparedTextIsUsableAtStart = isPreparedTextAvailableAndUsable();
    const currentPreparedSpeechTextValue = preparedSpeechTextRef.current; 

    if (!selectedVoiceSample) {
      toast({ title: "Voice Sample Required", description: "Please select a voice sample.", variant: "destructive" });
      setIsCloningVoice(false);
      return;
    }
    if (!currentPreparedTextIsUsableAtStart || !currentPreparedSpeechTextValue) { 
      toast({ title: "Prepared Speech Text Required", description: "Please process some text for speech first. Voice cloning needs text to synthesize.", variant: "destructive" });
      setIsCloningVoice(false);
      return;
    }
    
    if (typeof window !== 'undefined' && window.speechSynthesis && (window.speechSynthesis.speaking || window.speechSynthesis.pending)) {
        window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setSpeakingText(null);
    setIsSimulatedClonedVoiceSpeaking(false);
    
    setTextForSimulatedClonedVoice(null); 
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000)); 
      toast({ title: "Mock Voice Cloning", description: "Processing voice sample..." });
      
      await new Promise(resolve => setTimeout(resolve, 1500)); 
      toast({ title: "Mock Voice Cloning", description: "Synthesizing speech with cloned voice..." });
      
      await new Promise(resolve => setTimeout(resolve, 2000)); 

      const stillUsablePreparedText = preparedSpeechTextRef.current; 
      if (stillUsablePreparedText && 
          stillUsablePreparedText.trim() !== "" &&
          !stillUsablePreparedText.toLowerCase().startsWith("no text was provided") &&
          !stillUsablePreparedText.toLowerCase().startsWith("error:")
      ) {
        setTextForSimulatedClonedVoice(currentPreparedSpeechTextValue); 
        toast({ title: "Mock Voice Cloning Complete", description: `Speech based on "${currentPreparedSpeechTextValue.substring(0,50)}..." using voice sample "${selectedVoiceSample.name}" is (mock) ready for simulated playback.` });
      } else {
        setTextForSimulatedClonedVoice(null);
        toast({ title: "Cloning Error", description: "Prepared text became unavailable or invalid during mock cloning. Please try preparing text again.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Cloning Error", description: "An unexpected error occurred during mock voice cloning.", variant: "destructive" });
      setTextForSimulatedClonedVoice(null);
    } finally {
      setIsCloningVoice(false);
    }
  };

  const handlePlaySimulatedClonedVoice = useCallback(() => {
    const currentTextForSimulated = textForSimulatedClonedVoiceRef.current; 

    if (!isSpeechSupported) {
        toast({ title: "Speech Not Supported", description: "Your browser does not support speech synthesis.", variant: "destructive" });
        return;
    }
    if (!currentTextForSimulated) {
        toast({ title: "Nothing to Play", description: "No text was prepared for simulated cloned voice playback.", variant: "destructive" });
        return;
    }

    if (isSimulatedClonedVoiceSpeakingRef.current) { 
        window.speechSynthesis.cancel();
        setIsSimulatedClonedVoiceSpeaking(false);
        return;
    }

    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        window.speechSynthesis.cancel(); 
    }
    
    setIsSimulatedClonedVoiceSpeaking(true); 
    setIsSpeaking(false); 
    setSpeakingText(null); 
    
    setTimeout(() => {
        if (!isSimulatedClonedVoiceSpeakingRef.current) { 
            return;
        }
        if (textForSimulatedClonedVoiceRef.current !== currentTextForSimulated) {
            setIsSimulatedClonedVoiceSpeaking(false); 
            return;
        }

        const utterance = new SpeechSynthesisUtterance(currentTextForSimulated);
        utterance.onstart = () => {
            setIsSimulatedClonedVoiceSpeaking(true); 
            setIsSpeaking(false); 
            setSpeakingText(null); 
        };
        utterance.onend = () => {
            setIsSimulatedClonedVoiceSpeaking(false);
        };
        utterance.onerror = (event) => {
            if (event.error === 'interrupted') {
                toast({ title: "Speech Interrupted", description: "Simulated cloned voice playback was interrupted.", variant: "default" });
            } else {
                toast({ title: "Speech Error", description: `Could not play simulated cloned voice. (Error: ${event.error || 'unknown'})`, variant: "destructive" });
            }
            setIsSimulatedClonedVoiceSpeaking(false);
        };
        window.speechSynthesis.speak(utterance);
    }, 100); 

  }, [isSpeechSupported, toast]);

  const anyLoading = isGeneratingSpeech || isCloningVoice || isGeneratingVideoOutput;
  
  const isUsablePreparedTextAvailable = () => 
    preparedSpeechTextRef.current && 
    preparedSpeechTextRef.current.trim() !== "" && 
    !preparedSpeechTextRef.current.toLowerCase().startsWith("no text was provided") && 
    !preparedSpeechTextRef.current.toLowerCase().startsWith("error:");

  const isUsableClonedTextAvailable = () =>
    textForSimulatedClonedVoiceRef.current && textForSimulatedClonedVoiceRef.current.trim() !== "";

  const getTextForVideoOutput = () => {
    if (isUsableClonedTextAvailable() && textForSimulatedClonedVoiceRef.current) {
      return textForSimulatedClonedVoiceRef.current;
    } 
    else if (isUsablePreparedTextAvailable() && preparedSpeechTextRef.current) {
      return preparedSpeechTextRef.current;
    }
    return null;
  };
  
  const isTextAvailableForVideoSection = !!getTextForVideoOutput();

  const handleGenerateVideoOutput = async () => {
    const textToSpeakForVideo = getTextForVideoOutput();
  
    if (!selectedImage || !imagePreviewRef.current) {
      toast({ title: "Image Required", description: "Please upload an image in the 'Text & Image to Speech Preparation' section.", variant: "destructive" });
      return;
    }
    if (!textToSpeakForVideo) {
      toast({ title: "Audio Text Required", description: "Please use 'Process Input for Speech' or 'Generate Speech with Cloned Voice (Mock)' first.", variant: "destructive" });
      return;
    }
  
    setIsGeneratingVideoOutput(true);
    setExpressiveFramePreview(null);
    setExpressiveFrameError(null);
    setMockAudioUrl(null); // Changed
    setMockAudioError(null); // Changed
    toast({ title: "Generating Animated Output...", description: "AI is creating an expressive frame and preparing mock audio source..." });
  
    let expressiveFrameResult: GenerateAnimatedFrameOutput | null = null;
    let audioApiResult: { videoUrl?: string; message?: string; error?: string } | null = null; // Renamed from videoApiResult for clarity
  
    try {
      // 1. Generate Expressive Still Frame
      const textSnippet = textToSpeakForVideo.substring(0, 150);
      const animationPrompt = `Your primary task is to transform the provided static photo into a single, highly expressive keyframe image. This new image must depict the person as if they are frozen mid-sentence, actively speaking the initial words of this text: "${textSnippet}". CRITICALLY, the generated image needs to show *clear visual changes* from the original photo, especially in the mouth shape (viseme) to precisely match the first phonemes of the text, and in the eye expression to convey engagement in speech. The overall facial expression should be dynamic and appropriate for the act of speaking these initial words. The output MUST be the generated image.`;
      
      expressiveFrameResult = await generateAnimatedFrame({
        originalImageDataUri: imagePreviewRef.current,
        animationPrompt: animationPrompt,
      });
  
      if (expressiveFrameResult.generatedFrameDataUri) {
        setExpressiveFramePreview(expressiveFrameResult.generatedFrameDataUri);
        setExpressiveFrameError(null);
      } else {
        let userFriendlyAiMessage = "The AI couldn't create an image for this request. This can happen sometimes. You could try again, perhaps with different text or a slightly different image.";
        if (expressiveFrameResult.errorType === 'AI_API_ERROR' || expressiveFrameResult.errorType === 'FLOW_EXCEPTION') {
             userFriendlyAiMessage = expressiveFrameResult.errorMessage || "An unexpected error occurred during AI frame generation.";
        } else if (expressiveFrameResult.errorMessage) { // Handles AI_DID_NOT_RETURN_IMAGE more specifically
            userFriendlyAiMessage = expressiveFrameResult.errorMessage; // Use the message from the flow
        }
        console.warn('[GenerateVideoOutput] AI Frame Gen Issue:', expressiveFrameResult.errorMessage || 'No frame data URI.', 'Type:', expressiveFrameResult.errorType);
        setExpressiveFrameError(userFriendlyAiMessage);
        setExpressiveFramePreview(null);
      }

      // 2. Fetch Mock Audio Source URL (from video endpoint)
      const formData = new FormData();
      formData.append('image', selectedImage);
      formData.append('textToSpeak', textToSpeakForVideo);

      const response = await fetch('/api/true-lip-sync-video', {
        method: 'POST',
        body: formData,
      });

      audioApiResult = await response.json();

      if (response.ok && audioApiResult?.videoUrl) {
        setMockAudioUrl(audioApiResult.videoUrl); // Changed
        setMockAudioError(null); // Changed
      } else {
        const errorMsg = audioApiResult?.message || audioApiResult?.error || `Failed to fetch mock audio source (HTTP ${response.status})`;
        console.error('[GenerateVideoOutput] Mock Audio Source Fetch Error:', errorMsg);
        setMockAudioError(errorMsg); // Changed
        setMockAudioUrl(null); // Changed
      }

    } catch (error: any) {
      console.error('[GenerateVideoOutput] General client-side processing error:', error);
      const message = error.message || "An unexpected client-side error occurred.";
      setExpressiveFrameError(prev => prev ? `${prev} ${message}` : message);
      setMockAudioError(prev => prev ? `${prev} ${message}` : message); // Changed
      toast({ title: "Client Error", description: message, variant: "destructive" });
    } finally {
      setIsGeneratingVideoOutput(false);
      let finalToastTitle = "Output Generation Attempted";
      let finalToastDescription = "";
      let finalToastVariant: "default" | "destructive" = "default";

      if (expressiveFrameResult?.generatedFrameDataUri && audioApiResult?.videoUrl) {
        finalToastTitle = "Animated Output Ready";
        finalToastDescription = "Expressive frame and mock audio source are ready.";
      } else {
        finalToastDescription = "Completed with issues: ";
        if (!expressiveFrameResult?.generatedFrameDataUri) finalToastDescription += "Expressive frame generation failed or had issues. ";
        if (!audioApiResult?.videoUrl) finalToastDescription += "Mock audio source fetching failed or had issues. ";
        finalToastVariant = "destructive";
      }
      toast({ title: finalToastTitle, description: finalToastDescription.trim(), variant: finalToastVariant, duration: 5000 });
    }
  };
  

  const currentPreparedTextIsSpeaking = isSpeaking && preparedSpeechText && speakingText === preparedSpeechText;
  const currentSimulatedClonedVoiceIsSpeaking = isSimulatedClonedVoiceSpeaking && textForSimulatedClonedVoice && speakingText === textForSimulatedClonedVoice; 


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
                  onChange={(e) => {
                    setTextInput(e.target.value);
                    resetOutputsDependentOnTextOrImage();
                  }}
                  placeholder="Type or paste your text here..."
                  rows={4}
                  className="text-base mt-1"
                  disabled={anyLoading}
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
                  disabled={anyLoading}
                />
                {imagePreview && ( 
                  <div className={`mt-2 border rounded-md p-2 inline-block bg-muted/30`}>
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
              <Button onClick={handleTextToSpeech} disabled={anyLoading} className="w-full sm:w-auto">
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
                    {isSpeechSupported && isPreparedTextUsable() && (
                      <Button
                        onClick={handleSpeakPreparedText}
                        variant="outline"
                        size="sm"
                        disabled={anyLoading || isSimulatedClonedVoiceSpeaking}
                      >
                        {currentPreparedTextIsSpeaking ? <><StopCircle className="mr-2 h-4 w-4" />Stop Speaking</> : <><Volume2 className="mr-2 h-4 w-4" />Speak</>}
                      </Button>
                    )}
                  </div>
                  <p className="text-base whitespace-pre-wrap text-foreground/90">{preparedSpeechText}</p>
                   {!isSpeechSupported && isPreparedTextUsable() && (
                    <p className="mt-3 text-sm text-muted-foreground italic">
                      Your browser does not support speech synthesis for direct playback here.
                    </p>
                  )}
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Voice Cloning &amp; Synthesis (Mock)" icon={<MicVocal className="text-primary" />}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="voice-sample-input" className="text-base">Upload a voice sample (e.g., .wav, .mp3):</Label>
                <Input
                  id="voice-sample-input"
                  type="file"
                  accept="audio/*"
                  onChange={handleVoiceSampleChange} 
                  className="text-base mt-1 file:text-primary file:font-medium"
                  disabled={anyLoading}
                />
                 <p className="text-xs text-muted-foreground mt-1 italic">Note: This uploaded sample is for simulation purposes. Playback will use a standard browser voice, not the uploaded sample's voice.</p>
                {selectedVoiceSample && (
                  <p className="text-sm text-muted-foreground mt-1">Selected file: {selectedVoiceSample.name}</p>
                )}
              </div>
              <Button
                onClick={handleCloneVoiceAndSynthesize}
                disabled={anyLoading || !selectedVoiceSample || !isPreparedTextAvailableAndUsable()}
                className="w-full sm:w-auto"
              >
                {isCloningVoice ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Cloning Voice...</>
                ) : (
                  <><MicVocal className="mr-2 h-4 w-4" />Generate Speech with Cloned Voice (Mock)</>
                )}
              </Button>
              {textForSimulatedClonedVoice && (
                <div className="mt-4 space-y-2 p-4 border rounded-md bg-muted/30 shadow">
                   <Label className="text-base font-semibold text-foreground">Mock Cloned Audio Output:</Label>
                   <Button
                    onClick={handlePlaySimulatedClonedVoice}
                    variant="outline"
                    size="sm"
                    disabled={anyLoading || (isSpeaking && !isSimulatedClonedVoiceSpeakingRef.current && speakingText !== textForSimulatedClonedVoice)}
                   >
                     {currentSimulatedClonedVoiceIsSpeaking ? <><StopCircle className="mr-2 h-4 w-4" />Stop Simulated Voice</> : <><Volume2 className="mr-2 h-4 w-4" />Play Simulated Cloned Voice</>}
                   </Button>
                   <p className="text-sm text-muted-foreground">
                     This simulates the cloned voice using your browser's standard text-to-speech with the prepared text that was active during 'cloning'.
                  </p>
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard title="AI Animated Output (Mock Audio)" icon={<Video className="text-primary" />}>
            <div className="space-y-4">
               <div>
                <Label htmlFor="animation-info" className="text-base">Image &amp; Audio Source for Output:</Label>
                 {imagePreview ? (
                    <p className="text-sm text-muted-foreground mt-1" id="animation-info">
                      Using your uploaded image and text from "Prepared Text" or "Mock Cloned Audio".
                      AI will generate an expressive still frame. The audio will come from a mock video source.
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1" id="animation-info">
                      Please upload an image and prepare audio text in the sections above.
                    </p>
                  )}
              </div>

              <Button
                onClick={handleGenerateVideoOutput}
                disabled={anyLoading || !selectedImage || !isTextAvailableForVideoSection}
                className="w-full sm:w-auto"
              >
                {isGeneratingVideoOutput ? ( 
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating Output...</>
                ) : (
                  <><Sparkles className="mr-2 h-4 w-4" />Generate Animated Output (Mock Audio)</>
                )}
              </Button>
              
              <div className="mt-6 p-4 border rounded-md bg-muted/30 shadow relative min-h-[250px] space-y-6">
                <div>
                    <Label className="text-lg font-semibold text-foreground flex items-center gap-2 mb-2">
                        <Sparkles className="h-5 w-5"/>
                        AI Expressive Still Frame:
                    </Label>
                    <div className="bg-black rounded-md flex items-center justify-center aspect-video overflow-hidden min-h-[200px] max-h-[300px] relative">
                    {isGeneratingVideoOutput && !expressiveFramePreview && !expressiveFrameError ? ( 
                        <div className="flex flex-col items-center justify-center text-center p-4">
                        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                        <p className="text-lg font-semibold text-white">Generating AI Frame...</p>
                        </div>
                    ) : expressiveFramePreview ? (
                        <Image
                            key={expressiveFramePreview} 
                            src={expressiveFramePreview}
                            alt="AI generated expressive frame"
                            fill
                            style={{ objectFit: 'contain' }}
                            className="rounded-md bg-black"
                            priority={true} 
                            data-ai-hint="expressive speaking frame"
                        />
                    ) : imagePreview && !expressiveFrameError ? (
                         <Image
                            src={imagePreview}
                            alt="Original uploaded image"
                            fill
                            style={{ objectFit: 'contain' }}
                            className="rounded-md bg-black"
                            data-ai-hint="original image"
                        />
                    ) : ( 
                        <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-4">
                        <ImagePlus className="h-12 w-12 mb-4 text-muted-foreground/50" data-ai-hint="image placeholder" />
                        <p className="text-lg font-semibold">Expressive frame will appear here</p>
                        </div>
                    )}
                    </div>
                    {expressiveFrameError && ( 
                    <div className="mt-2 p-3 border border-destructive/50 rounded-md bg-destructive/10 text-destructive text-sm flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5"/>
                        <p>Frame Generation Issue: {expressiveFrameError}</p>
                    </div>
                    )}
                </div>

                <div>
                    <Label className="text-lg font-semibold text-foreground flex items-center gap-2 mb-2">
                        <Volume2 className="h-5 w-5"/>
                        Mock Audio Output (from Video Source):
                    </Label>
                    {isGeneratingVideoOutput && !mockAudioUrl && !mockAudioError ? (
                        <div className="flex flex-col items-center justify-center text-center p-4 text-muted-foreground">
                            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                            <p className="text-md font-semibold">Preparing audio source...</p>
                        </div>
                    ) : mockAudioUrl && !mockAudioError ? (
                        <AudioPlayer key={mockAudioUrl} src={mockAudioUrl} autoPlay />
                    ) : mockAudioError ? (
                        <div className="mt-2 p-3 border border-destructive/50 rounded-md bg-destructive/10 text-destructive text-sm flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5"/>
                            <p>Audio Source Error: {mockAudioError}</p>
                        </div>
                    ) : (
                         <div className="text-center text-muted-foreground p-4 rounded-md border border-dashed">
                            <Volume2 className="h-12 w-12 mb-4 text-muted-foreground/50 mx-auto" data-ai-hint="audio placeholder" />
                            <p className="text-lg font-semibold">Mock audio player will appear here</p>
                        </div>
                    )}
                </div>
                 <p className="text-xs text-muted-foreground mt-2 italic">
                    Note: This feature uses AI to generate an expressive still image based on your upload. 
                    Separately, it fetches a URL for a generic mock video; the audio from this mock video will be played here to simulate a lip-synced output.
                  </p>
              </div>
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

