
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
import { Text, MicVocal, Loader2, ImagePlus, Volume2, StopCircle, AlertTriangle, Sparkles } from 'lucide-react';
import { prepareTextForSpeech } from '@/ai/flows/prepare-text-for-speech-flow';
import { generateAnimatedFrame, type GenerateAnimatedFrameOutput } from '@/ai/flows/generate-animated-frame-flow';


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

  // States for "AI Animated Output & Speech" section
  const [isGeneratingAnimatedOutput, setIsGeneratingAnimatedOutput] = useState<boolean>(false);
  const [animatedOutputAiFrame, setAnimatedOutputAiFrame] = useState<string | null>(null);
  const [animatedOutputError, setAnimatedOutputError] = useState<string | null>(null);
  const [isAnimatedOutputSpeaking, setIsAnimatedOutputSpeaking] = useState<boolean>(false);
  const [isAnimatedOutputAnimating, setIsAnimatedOutputAnimating] = useState<boolean>(false);
  const [displayedFrameInAnimatedOutput, setDisplayedFrameInAnimatedOutput] = useState<string | null>(null);
  
  const { toast } = useToast();

  const isSpeakingRef = useRef(isSpeaking);
  const isSimulatedClonedVoiceSpeakingRef = useRef(isSimulatedClonedVoiceSpeaking);
  const preparedSpeechTextRef = useRef(preparedSpeechText);
  const textForSimulatedClonedVoiceRef = useRef(textForSimulatedClonedVoice);
  const speakingTextRef = useRef(speakingText);
  const imagePreviewRef = useRef<string | null>(null);
  
  const animatedOutputAiFrameRef = useRef(animatedOutputAiFrame);
  const isAnimatedOutputSpeakingRef = useRef(isAnimatedOutputSpeaking);
  const isAnimatedOutputAnimatingRef = useRef(isAnimatedOutputAnimating);
  const animatedOutputSpeakingTextContentRef = useRef<string | null>(null);
  const displayedFrameInAnimatedOutputRef = useRef(displayedFrameInAnimatedOutput);
  const animatedOutputFlickerIntervalRef = useRef<NodeJS.Timeout | null>(null);


  useEffect(() => {
    imagePreviewRef.current = imagePreview;
    if (!imagePreview) { 
      setAnimatedOutputAiFrame(null);
      setAnimatedOutputError(null);
      setDisplayedFrameInAnimatedOutput(null);
      if (isAnimatedOutputSpeakingRef.current || isAnimatedOutputAnimatingRef.current) {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
        setIsAnimatedOutputSpeaking(false);
        if (animatedOutputFlickerIntervalRef.current) {
          clearInterval(animatedOutputFlickerIntervalRef.current);
          animatedOutputFlickerIntervalRef.current = null;
        }
        setIsAnimatedOutputAnimating(false);
      }
    }
  }, [imagePreview]); 


  useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);
  useEffect(() => { isSimulatedClonedVoiceSpeakingRef.current = isSimulatedClonedVoiceSpeaking; }, [isSimulatedClonedVoiceSpeaking]);
  useEffect(() => { preparedSpeechTextRef.current = preparedSpeechText; }, [preparedSpeechText]);
  useEffect(() => { textForSimulatedClonedVoiceRef.current = textForSimulatedClonedVoice; }, [textForSimulatedClonedVoice]);
  useEffect(() => { speakingTextRef.current = speakingText; }, [speakingText]);

  useEffect(() => { animatedOutputAiFrameRef.current = animatedOutputAiFrame; }, [animatedOutputAiFrame]);
  useEffect(() => { isAnimatedOutputSpeakingRef.current = isAnimatedOutputSpeaking; }, [isAnimatedOutputSpeaking]);
  useEffect(() => { isAnimatedOutputAnimatingRef.current = isAnimatedOutputAnimating; }, [isAnimatedOutputAnimating]);
  useEffect(() => { displayedFrameInAnimatedOutputRef.current = displayedFrameInAnimatedOutput; }, [displayedFrameInAnimatedOutput]);


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
      setIsAnimatedOutputSpeaking(false);
      if (animatedOutputFlickerIntervalRef.current) {
        clearInterval(animatedOutputFlickerIntervalRef.current);
      }
      setIsAnimatedOutputAnimating(false);
    };
  }, []);
  

  const resetOutputsDependentOnTextOrImage = useCallback(() => {
    setPreparedSpeechText(null);
    setTextForSimulatedClonedVoice(null); 
    
    setAnimatedOutputAiFrame(null);
    setAnimatedOutputError(null);
    setDisplayedFrameInAnimatedOutput(imagePreviewRef.current); // Reset to original if available

    if (typeof window !== 'undefined' && window.speechSynthesis) {
        if (isSpeakingRef.current || isSimulatedClonedVoiceSpeakingRef.current || isAnimatedOutputSpeakingRef.current ) {
            window.speechSynthesis.cancel(); 
        }
    }
    setIsSpeaking(false); 
    setSpeakingText(null);
    setIsSimulatedClonedVoiceSpeaking(false);
    setIsAnimatedOutputSpeaking(false);

    if (animatedOutputFlickerIntervalRef.current) {
      clearInterval(animatedOutputFlickerIntervalRef.current);
      animatedOutputFlickerIntervalRef.current = null;
    }
    setIsAnimatedOutputAnimating(false);
  }, []);


  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImagePreview(result);
        setDisplayedFrameInAnimatedOutput(result); // Set initial frame for animated output
      };
      reader.onerror = () => {
        setSelectedImage(null); 
        setImagePreview(null);
        setDisplayedFrameInAnimatedOutput(null);
        toast({ title: "Image Load Error", description: "Could not read the selected image file.", variant: "destructive" });
      }
      reader.readAsDataURL(file);
    } else {
      setSelectedImage(null);
      setImagePreview(null);
      setDisplayedFrameInAnimatedOutput(null);
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
    setIsAnimatedOutputSpeaking(false); // Stop animated output speech too
    
    setAnimatedOutputAiFrame(null); // Clear AI frame from other section
    setAnimatedOutputError(null);
    if (animatedOutputFlickerIntervalRef.current) {
      clearInterval(animatedOutputFlickerIntervalRef.current);
      animatedOutputFlickerIntervalRef.current = null;
    }
    setIsAnimatedOutputAnimating(false);
    setDisplayedFrameInAnimatedOutput(imagePreviewRef.current);


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
              let toastMessage = `Could not auto-play speech. (Error: ${event.error || 'unknown'})`;
              let toastTitle = "Speech Error";
              let toastVariant: "destructive" | "default" = "destructive";
              if (event.error === 'interrupted') {
                toastTitle = "Speech Interrupted";
                toastMessage = "Auto-playback was interrupted.";
                toastVariant = "default";
              }
              toast({ title: toastTitle, description: toastMessage, variant: toastVariant });
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
      setIsAnimatedOutputSpeaking(false); // Stop other speech


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
          let toastMessage = `Could not play speech. (Error: ${event.error || 'unknown'})`;
          let toastTitle = "Speech Error";
          let toastVariant: "destructive" | "default" = "destructive";
          if (event.error === 'interrupted') {
            toastTitle = "Speech Interrupted";
            toastMessage = "Playback was interrupted.";
            toastVariant = "default";
          }
          toast({ title: toastTitle, description: toastMessage, variant: toastVariant });
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

    if (typeof window !== 'undefined' && window.speechSynthesis && (isSpeakingRef.current || isSimulatedClonedVoiceSpeakingRef.current || isAnimatedOutputSpeakingRef.current)) {
        window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setSpeakingText(null);
    setIsSimulatedClonedVoiceSpeaking(false);
    setIsAnimatedOutputSpeaking(false);
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
    setIsAnimatedOutputSpeaking(false);
    
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
    setIsAnimatedOutputSpeaking(false);
    
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
            let toastMessage = `Could not play simulated cloned voice. (Error: ${event.error || 'unknown'})`;
            let toastTitle = "Speech Error";
            let toastVariant: "destructive" | "default" = "destructive";
            if (event.error === 'interrupted') {
                toastTitle = "Speech Interrupted";
                toastMessage = "Simulated cloned voice playback was interrupted.";
                toastVariant = "default";
            }
            toast({ title: toastTitle, description: toastMessage, variant: toastVariant });
            setIsSimulatedClonedVoiceSpeaking(false);
        };
        window.speechSynthesis.speak(utterance);
    }, 100); 

  }, [isSpeechSupported, toast]);

  
  const getTextForAnimatedOutput = () => {
    if (textForSimulatedClonedVoiceRef.current && textForSimulatedClonedVoiceRef.current.trim() !== "") {
      return textForSimulatedClonedVoiceRef.current;
    } 
    else if (preparedSpeechTextRef.current && preparedSpeechTextRef.current.trim() !== "" && !preparedSpeechTextRef.current.toLowerCase().startsWith("no text was provided") && !preparedSpeechTextRef.current.toLowerCase().startsWith("error:")) {
      return preparedSpeechTextRef.current;
    }
    return null;
  };
  
  const stopAnimatedOutputFlicker = useCallback(() => {
    if (animatedOutputFlickerIntervalRef.current) {
      clearInterval(animatedOutputFlickerIntervalRef.current);
      animatedOutputFlickerIntervalRef.current = null;
    }
    setIsAnimatedOutputAnimating(false);
    setDisplayedFrameInAnimatedOutput(imagePreviewRef.current || animatedOutputAiFrameRef.current); // Show AI frame if original is gone
  }, []);

  const startAnimatedOutputFlicker = useCallback(() => {
    if (!imagePreviewRef.current || !animatedOutputAiFrameRef.current) {
      stopAnimatedOutputFlicker();
      return;
    }
    stopAnimatedOutputFlicker(); // Clear any existing interval
    setIsAnimatedOutputAnimating(true);
    animatedOutputFlickerIntervalRef.current = setInterval(() => {
      setDisplayedFrameInAnimatedOutput(prev => 
        prev === imagePreviewRef.current ? animatedOutputAiFrameRef.current : imagePreviewRef.current
      );
    }, 250); // Flicker interval
  }, [stopAnimatedOutputFlicker]);


  const handleGenerateAnimatedOutputAndSpeak = async () => {
    const textToSpeak = getTextForAnimatedOutput();
  
    if (!selectedImage || !imagePreviewRef.current) {
      toast({ title: "Image Required", description: "Please upload an image in the 'Text & Image to Speech Preparation' section.", variant: "destructive" });
      return;
    }
    if (!textToSpeak) {
      toast({ title: "Audio Text Required", description: "Please use 'Process Input for Speech' or 'Generate Speech with Cloned Voice (Mock)' first to generate text.", variant: "destructive" });
      return;
    }
  
    setIsGeneratingAnimatedOutput(true);
    setAnimatedOutputAiFrame(null);
    setAnimatedOutputError(null);
    animatedOutputSpeakingTextContentRef.current = textToSpeak;
    
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
          window.speechSynthesis.cancel();
      }
    }
    setIsSpeaking(false); // Stop other speech
    setSpeakingText(null);
    setIsSimulatedClonedVoiceSpeaking(false); // Stop other speech
    setIsAnimatedOutputSpeaking(false);
    stopAnimatedOutputFlicker();
    setDisplayedFrameInAnimatedOutput(imagePreviewRef.current); // Show original initially

    toast({ title: "Generating Output...", description: "AI is creating an expressive frame and preparing speech..." });
  
    let aiFrameResult: GenerateAnimatedFrameOutput | null = null;

    try {
      // 1. Generate AI Still Frame
      try {
        const textSnippet = textToSpeak.substring(0, 150);
        const animationPrompt = `Your primary task is to transform the provided static photo into a single, highly expressive keyframe image. This new image must depict the person as if they are frozen mid-sentence, actively speaking the initial words of this text: "${textSnippet}". CRITICALLY, the generated image needs to show *clear visual changes* from the original photo, especially in the mouth shape (viseme) to precisely match the first phonemes of the text, and in the eye expression to convey engagement in speech. The overall facial expression should be dynamic and appropriate for the act of speaking these initial words. The primary output of this request MUST be the generated image.`;
        
        aiFrameResult = await generateAnimatedFrame({
          originalImageDataUri: imagePreviewRef.current,
          animationPrompt: animationPrompt,
        });
    
        if (aiFrameResult.generatedFrameDataUri) {
          setAnimatedOutputAiFrame(aiFrameResult.generatedFrameDataUri);
          setDisplayedFrameInAnimatedOutput(aiFrameResult.generatedFrameDataUri); // Show AI frame once loaded
        } else {
            let userFriendlyAiMessage = "The AI couldn't create an image for this request. This can happen sometimes. You could try again, perhaps with different text or a slightly different image.";
            if (aiFrameResult.errorMessage) {
                userFriendlyAiMessage = aiFrameResult.errorMessage.includes("AI model processed the request but did not return an image") 
                    ? "The AI model processed the request but did not return an image. You can try again." 
                    : aiFrameResult.errorMessage;
            }
            console.warn('[GenerateAnimatedOutput] AI Frame Gen Issue:', aiFrameResult.errorMessage || 'AI model did not return an image.', 'Type:', aiFrameResult.errorType);
            setAnimatedOutputError(userFriendlyAiMessage);
            toast({ title: "AI Image Not Generated", description: userFriendlyAiMessage, variant: "default", duration: 7000 });
            setDisplayedFrameInAnimatedOutput(imagePreviewRef.current); // Revert to original
        }
      } catch (frameError: any) {
        console.error('[GenerateAnimatedOutput] Error during AI frame generation call:', frameError);
        const message = frameError.message || "Failed to generate AI expressive frame.";
        setAnimatedOutputError(message);
        toast({ title: "AI Frame Error", description: message, variant: "destructive" });
        setIsGeneratingAnimatedOutput(false);
        setDisplayedFrameInAnimatedOutput(imagePreviewRef.current); // Revert to original
        return; // Stop if frame generation fails critically
      }

      // 2. Play Speech & Start Animation
      if (isSpeechSupported && textToSpeak) {
        if (aiFrameResult?.generatedFrameDataUri) {
             toast({ title: "AI Frame Ready!", description: "Speaking the text with animation...", duration: 4000 });
        } else {
             toast({ title: "AI Frame Failed", description: "Speaking the text with original image...", duration: 5000 });
        }

        // Slight delay to ensure state updates for AI frame are processed
        setTimeout(() => {
          if (animatedOutputSpeakingTextContentRef.current !== textToSpeak || !isGeneratingAnimatedOutputRef.current) {
            // If text changed or generation was cancelled
            setIsGeneratingAnimatedOutput(false);
            return;
          }

          const utterance = new SpeechSynthesisUtterance(textToSpeak);
          utterance.onstart = () => {
            setIsAnimatedOutputSpeaking(true);
            if (animatedOutputAiFrameRef.current && imagePreviewRef.current) { // Only animate if both frames exist
              startAnimatedOutputFlicker();
            }
          };
          utterance.onend = () => {
            setIsAnimatedOutputSpeaking(false);
            stopAnimatedOutputFlicker();
            setIsGeneratingAnimatedOutput(false); 
          };
          utterance.onerror = (event) => {
            let toastMessage = `Could not play animated output speech. (Error: ${event.error || 'unknown'})`;
            let toastTitle = "Animated Speech Error";
            let toastVariant: "destructive" | "default" = "destructive";
            if (event.error === 'interrupted') {
              toastTitle = "Animated Speech Interrupted";
              toastMessage = "Animated output playback was interrupted.";
              toastVariant = "default";
            }
            toast({ title: toastTitle, description: toastMessage, variant: toastVariant });
            setIsAnimatedOutputSpeaking(false);
            stopAnimatedOutputFlicker();
            setIsGeneratingAnimatedOutput(false);
          };
          window.speechSynthesis.speak(utterance);
        }, 100);
      } else {
        toast({ title: "Speech Not Available", description: "Browser speech not supported or no text for animation.", duration: 5000 });
        setIsGeneratingAnimatedOutput(false); // End loading if not speaking
      }

    } catch (error: any) { 
      console.error('[GenerateAnimatedOutput] General client-side processing error:', error);
      const message = error.message || "An unexpected client-side error occurred.";
      setAnimatedOutputError(message);
      toast({ title: "Client Error", description: message, variant: "destructive" });
      setIsGeneratingAnimatedOutput(false);
      setDisplayedFrameInAnimatedOutput(imagePreviewRef.current);
    } 
    // isGeneratingAnimatedOutput is set to false inside speech handlers or if speech is skipped
  };

  const handleStopAnimatedOutput = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel(); // This will trigger onend/onerror for the utterance
    }
    setIsAnimatedOutputSpeaking(false); // Explicitly set, as cancel might be async
    stopAnimatedOutputFlicker();
    // isGeneratingAnimatedOutput should already be false if we are in a "stoppable" state
    // If it was mid-generation, the button wouldn't be for stopping.
    // If it's clicked after generation and speech has ended but animation is manually kept, 
    // then isGeneratingAnimatedOutput is false.
  };
  
  
  const anyLoading = isGeneratingSpeech || isCloningVoice || isGeneratingAnimatedOutput;
  const currentPreparedTextIsSpeaking = isSpeaking && preparedSpeechText && speakingText === preparedSpeechText;
  const currentSimulatedClonedVoiceIsSpeaking = isSimulatedClonedVoiceSpeaking && textForSimulatedClonedVoiceRef.current && textForSimulatedClonedVoiceRef.current === textForSimulatedClonedVoiceRef.current;

  const isGeneratingAnimatedOutputRef = useRef(isGeneratingAnimatedOutput);
  useEffect(() => { isGeneratingAnimatedOutputRef.current = isGeneratingAnimatedOutput; }, [isGeneratingAnimatedOutput]);


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
              <Button 
                onClick={handleTextToSpeech} 
                disabled={anyLoading} 
                className="w-full sm:w-auto"
               >
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
                        disabled={anyLoading || isSimulatedClonedVoiceSpeaking || isAnimatedOutputSpeaking }
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
                    disabled={anyLoading || (isSpeaking && !isSimulatedClonedVoiceSpeakingRef.current && speakingText !== textForSimulatedClonedVoiceRef.current) || isAnimatedOutputSpeaking }
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

          <SectionCard title="AI Animated Output & Speech" icon={<Sparkles className="text-primary" />}>
            <div className="space-y-4">
               <div>
                <Label htmlFor="animated-output-info" className="text-base">Image &amp; Audio Source for Output:</Label>
                 {imagePreview ? (
                    <p className="text-sm text-muted-foreground mt-1" id="animated-output-info">
                      Using your uploaded image for AI expressive frame generation and flicker animation. Audio will be synthesized from prepared text.
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1" id="animated-output-info">
                      Please upload an image and prepare audio text in the sections above.
                    </p>
                  )}
              </div>

              <Button
                onClick={isAnimatedOutputSpeaking || isAnimatedOutputAnimating ? handleStopAnimatedOutput : handleGenerateAnimatedOutputAndSpeak}
                disabled={(isGeneratingAnimatedOutput && !(isAnimatedOutputSpeaking || isAnimatedOutputAnimating)) || !imagePreview || !getTextForAnimatedOutput()}
                className="w-full sm:w-auto"
              >
                {isGeneratingAnimatedOutput && !(isAnimatedOutputSpeaking || isAnimatedOutputAnimating) ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating Output...</>
                ) : isAnimatedOutputSpeaking || isAnimatedOutputAnimating ? (
                    <><StopCircle className="mr-2 h-4 w-4" />Stop Speaking & Animating</>
                ) : (
                    <><Sparkles className="mr-2 h-4 w-4" />Generate & Play Animated Output</>
                )}
              </Button>
              
              <div className="mt-6 p-4 border rounded-md bg-muted/30 shadow relative min-h-[250px] space-y-6">
                <div>
                    <Label className="text-lg font-semibold text-foreground flex items-center gap-2 mb-2">
                        <ImagePlus className="h-5 w-5"/>
                        Animated Image:
                    </Label>
                    <div className="bg-black rounded-md flex items-center justify-center aspect-video overflow-hidden min-h-[200px] max-h-[300px] relative">
                    {isGeneratingAnimatedOutput && !displayedFrameInAnimatedOutput && !animatedOutputError ? ( 
                        <div className="flex flex-col items-center justify-center text-center p-4">
                        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                        <p className="text-lg font-semibold text-white">Generating AI Frame...</p>
                        </div>
                    ) : displayedFrameInAnimatedOutput ? (
                        <Image
                            key={displayedFrameInAnimatedOutput} 
                            src={displayedFrameInAnimatedOutput}
                            alt="AI generated expressive frame or original image"
                            fill
                            style={{ objectFit: 'contain' }}
                            className="rounded-md bg-black"
                            priority={true} 
                            data-ai-hint="animated expressive speaking frame"
                        />
                    ) : imagePreviewRef.current ? ( 
                         <Image
                            src={imagePreviewRef.current}
                            alt="Original uploaded image (AI frame pending or issue)"
                            fill
                            style={{ objectFit: 'contain' }}
                            className="rounded-md bg-black"
                            data-ai-hint="original image"
                        />
                    ) : ( 
                        <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-4">
                        <ImagePlus className="h-12 w-12 mb-4 text-muted-foreground/50" data-ai-hint="image placeholder" />
                        <p className="text-lg font-semibold">Animated output will appear here</p>
                        </div>
                    )}
                    </div>
                </div>
                
                {animatedOutputError && ( 
                  <div className="mt-2 p-3 border border-destructive/50 rounded-md bg-destructive/10 text-destructive text-sm flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5"/>
                      <p>Output Generation Issue: {animatedOutputError}</p>
                  </div>
                )}
                 <p className="text-xs text-muted-foreground mt-2 italic">
                    This feature generates an AI expressive still frame from your image, animates it through flickering, and plays browser-synthesized audio from your prepared text.
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
