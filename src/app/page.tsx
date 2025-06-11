
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
import { Text, MicVocal, Loader2, ImagePlus, Volume2, StopCircle, AlertTriangle, Sparkles, Film } from 'lucide-react';
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

  // Refs for "AI Animated Output & Speech" section
  const animatedOutputAiFrameRef = useRef(animatedOutputAiFrame);
  const isAnimatedOutputSpeakingRef = useRef(isAnimatedOutputSpeaking);
  const isAnimatedOutputAnimatingRef = useRef(isAnimatedOutputAnimating);
  const animatedOutputSpeakingTextRef = useRef<string | null>(null); // Stores the text being spoken by this section
  const animatedOutputFlickerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const displayedFrameInAnimatedOutputRef = useRef(displayedFrameInAnimatedOutput);


  useEffect(() => {
    imagePreviewRef.current = imagePreview;
    if (!imagePreview) { 
      setAnimatedOutputAiFrame(null);
      setAnimatedOutputError(null);
      setDisplayedFrameInAnimatedOutput(null);
      stopAnimatedOutputFlicker();
      if (typeof window !== 'undefined' && window.speechSynthesis && isAnimatedOutputSpeakingRef.current) {
        window.speechSynthesis.cancel();
        setIsAnimatedOutputSpeaking(false);
      }
    } else {
      setAnimatedOutputAiFrame(null);
      setAnimatedOutputError(null);
      setDisplayedFrameInAnimatedOutput(imagePreview); // Show original if preview changes
       if (isAnimatedOutputAnimatingRef.current) { // If it was animating, restart with new base
         // This might be too aggressive, consider if animation should just stop
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
      stopAnimatedOutputFlicker();
    };
  }, []);
  

  const resetOutputsDependentOnTextOrImage = useCallback(() => {
    setPreparedSpeechText(null);
    setTextForSimulatedClonedVoice(null); 
    
    setAnimatedOutputAiFrame(null);
    setAnimatedOutputError(null);
    if (imagePreviewRef.current) {
        setDisplayedFrameInAnimatedOutput(imagePreviewRef.current);
    } else {
        setDisplayedFrameInAnimatedOutput(null);
    }
    stopAnimatedOutputFlicker();


    if (typeof window !== 'undefined' && window.speechSynthesis) {
        if (isSpeakingRef.current || isSimulatedClonedVoiceSpeakingRef.current || isAnimatedOutputSpeakingRef.current ) {
            window.speechSynthesis.cancel(); 
        }
    }
    setIsSpeaking(false); 
    setSpeakingText(null);
    setIsSimulatedClonedVoiceSpeaking(false);
    setIsAnimatedOutputSpeaking(false);
  }, []);


  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImagePreview(result);
        setDisplayedFrameInAnimatedOutput(result); // Initialize animated output display
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
    setIsAnimatedOutputSpeaking(false);
    stopAnimatedOutputFlicker();
    
    setAnimatedOutputAiFrame(null);
    setAnimatedOutputError(null);

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
              setIsAnimatedOutputSpeaking(false);
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
      setIsAnimatedOutputSpeaking(false);
      stopAnimatedOutputFlicker();


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
          setIsAnimatedOutputSpeaking(false);
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
    stopAnimatedOutputFlicker();
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
    stopAnimatedOutputFlicker();
    
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
    stopAnimatedOutputFlicker();
    
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
            setIsAnimatedOutputSpeaking(false);
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
  
  const isTextAvailableForAnimatedOutput = !!getTextForAnimatedOutput();

  const startAnimatedOutputFlicker = () => {
    if (animatedOutputFlickerIntervalRef.current) clearInterval(animatedOutputFlickerIntervalRef.current);
    if (!imagePreviewRef.current || !animatedOutputAiFrameRef.current) {
        setIsAnimatedOutputAnimating(false);
        return;
    }

    setIsAnimatedOutputAnimating(true);
    let isOriginal = true;
    setDisplayedFrameInAnimatedOutput(animatedOutputAiFrameRef.current); // Start with AI frame

    animatedOutputFlickerIntervalRef.current = setInterval(() => {
        if (!isAnimatedOutputAnimatingRef.current) { // Check ref for immediate stop
             if(animatedOutputFlickerIntervalRef.current) clearInterval(animatedOutputFlickerIntervalRef.current);
             return;
        }
        isOriginal = !isOriginal;
        setDisplayedFrameInAnimatedOutput(isOriginal ? imagePreviewRef.current : animatedOutputAiFrameRef.current);
    }, 250); // Flicker interval
  };

  const stopAnimatedOutputFlicker = useCallback(() => {
    if (animatedOutputFlickerIntervalRef.current) {
      clearInterval(animatedOutputFlickerIntervalRef.current);
      animatedOutputFlickerIntervalRef.current = null;
    }
    setIsAnimatedOutputAnimating(false);
    // Ensure the final displayed frame is the AI one if available, otherwise original
    if (animatedOutputAiFrameRef.current) {
        setDisplayedFrameInAnimatedOutput(animatedOutputAiFrameRef.current);
    } else if (imagePreviewRef.current) {
        setDisplayedFrameInAnimatedOutput(imagePreviewRef.current);
    }
  }, []);


  const handleGenerateAnimatedOutputAndSpeak = async () => {
    const textToSpeakForAnimation = getTextForAnimatedOutput();
  
    if (!selectedImage || !imagePreviewRef.current) {
      toast({ title: "Image Required", description: "Please upload an image in the 'Text & Image to Speech Preparation' section.", variant: "destructive" });
      return;
    }
    if (!textToSpeakForAnimation) {
      toast({ title: "Audio Text Required", description: "Please use 'Process Input for Speech' or 'Generate Speech with Cloned Voice (Mock)' first.", variant: "destructive" });
      return;
    }
  
    setIsGeneratingAnimatedOutput(true);
    setAnimatedOutputAiFrame(null);
    setAnimatedOutputError(null);
    stopAnimatedOutputFlicker(); // Stop any previous animation
    setDisplayedFrameInAnimatedOutput(imagePreviewRef.current); // Reset to original
    
    if (typeof window !== 'undefined' && window.speechSynthesis) {
        if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
            window.speechSynthesis.cancel();
        }
    }
    setIsSpeaking(false);
    setSpeakingText(null);
    setIsSimulatedClonedVoiceSpeaking(false);
    setIsAnimatedOutputSpeaking(false);
    animatedOutputSpeakingTextRef.current = null;

    toast({ title: "Generating Output...", description: "AI is creating an expressive frame and preparing speech..." });
  
    let aiFrameResult: GenerateAnimatedFrameOutput | null = null;

    try {
      // 1. Generate AI Still Frame
      try {
        const textSnippet = textToSpeakForAnimation.substring(0, 150);
        const animationPrompt = `Your primary task is to transform the provided static photo into a single, highly expressive keyframe image. This new image must depict the person as if they are frozen mid-sentence, actively speaking the initial words of this text: "${textSnippet}". CRITICALLY, the generated image needs to show *clear visual changes* from the original photo, especially in the mouth shape (viseme) to precisely match the first phonemes of the text, and in the eye expression to convey engagement in speech. The overall facial expression should be dynamic and appropriate for the act of speaking these initial words. The output MUST be the generated image.`;
        
        aiFrameResult = await generateAnimatedFrame({
          originalImageDataUri: imagePreviewRef.current,
          animationPrompt: animationPrompt,
        });
    
        if (aiFrameResult.generatedFrameDataUri) {
          setAnimatedOutputAiFrame(aiFrameResult.generatedFrameDataUri);
          setDisplayedFrameInAnimatedOutput(aiFrameResult.generatedFrameDataUri); // Show AI frame once loaded
        } else {
          let userFriendlyAiMessage = "The AI couldn't create an image for this request. You could try again with different text or image.";
          if (aiFrameResult.errorMessage) {
              userFriendlyAiMessage = aiFrameResult.errorMessage.includes("AI model processed the request but did not return an image") ? "The AI model processed the request but did not return an image. You can try again." : aiFrameResult.errorMessage;
          }
          console.warn('[GenerateAnimatedOutput] AI Frame Gen Issue:', userFriendlyAiMessage, 'Type:', aiFrameResult.errorType);
          setAnimatedOutputError(userFriendlyAiMessage);
          toast({ title: "AI Frame Issue", description: userFriendlyAiMessage, variant: "default", duration: 7000 });
        }
      } catch (frameError: any) {
        console.error('[GenerateAnimatedOutput] Error during AI frame generation call:', frameError);
        const message = frameError.message || "Failed to generate AI expressive frame.";
        setAnimatedOutputError(message);
        toast({ title: "AI Frame Error", description: message, variant: "destructive" });
        setIsGeneratingAnimatedOutput(false); // Critical failure
        return;
      }

      // 2. Speak the text
      if (isSpeechSupported && textToSpeakForAnimation) {
        animatedOutputSpeakingTextRef.current = textToSpeakForAnimation; // Store text being spoken
        
        // Small delay to allow AI frame to potentially render if successful
        setTimeout(() => {
            if (!animatedOutputSpeakingTextRef.current) { // Check if operation was cancelled or changed
                 setIsGeneratingAnimatedOutput(false);
                 return;
            }
            
            const utterance = new SpeechSynthesisUtterance(textToSpeakForAnimation);
            utterance.onstart = () => {
              setIsAnimatedOutputSpeaking(true);
              setIsGeneratingAnimatedOutput(false); // Initial setup done
              if (animatedOutputAiFrameRef.current && !animatedOutputError) { // Only animate if AI frame is good
                startAnimatedOutputFlicker();
              }
              let toastDesc = "Speaking and animating...";
              if (animatedOutputError || !animatedOutputAiFrameRef.current) {
                toastDesc = "Speaking text (AI frame issue, no animation).";
              }
              toast({ title: "Output Ready", description: toastDesc, duration: 3000});

            };
            utterance.onend = () => {
              setIsAnimatedOutputSpeaking(false);
              // Keep animation running by default, stopFlicker is handled by button or new generation
              // stopAnimatedOutputFlicker(); // No longer stop flicker here
              // setIsGeneratingAnimatedOutput(false); // Already set false onstart
            };
            utterance.onerror = (event) => {
              let toastMessage = `Speech error: ${event.error || 'unknown'}.`;
              let toastTitle = "Speech Playback Error";
              let toastVariant: "destructive" | "default" = "destructive";
              if (event.error === 'interrupted') {
                toastTitle = "Speech Interrupted";
                toastMessage = "Playback was stopped.";
                toastVariant = "default";
              }
              toast({ title: toastTitle, description: toastMessage, variant: toastVariant, duration: 5000 });
              setIsAnimatedOutputSpeaking(false);
              stopAnimatedOutputFlicker();
              setIsGeneratingAnimatedOutput(false);
            };
            window.speechSynthesis.speak(utterance);
        }, 100);
      } else {
        // No speech support or no text, just show frame if generated
        setIsGeneratingAnimatedOutput(false);
        if (!isSpeechSupported && textToSpeakForAnimation) {
            toast({ title: "Speech Not Supported", description: "Browser speech synthesis not available. AI Frame (if generated) is displayed.", duration: 5000});
        } else if (animatedOutputAiFrameRef.current && !animatedOutputError) {
            toast({ title: "AI Frame Ready", description: "AI expressive frame generated and displayed.", duration: 4000 });
        } else if (!animatedOutputError) {
             // This case means AI frame succeeded but no image, and no speech.
             toast({ title: "Processing Note", description: "AI frame generated (no image returned by AI). No text to speak.", duration: 5000});
        }
      }

    } catch (error: any) { 
      console.error('[GenerateAnimatedOutput] General client-side processing error:', error);
      const message = error.message || "An unexpected client-side error occurred.";
      setAnimatedOutputError(message);
      toast({ title: "Client Error", description: message, variant: "destructive" });
      setIsGeneratingAnimatedOutput(false);
      stopAnimatedOutputFlicker();
      setIsAnimatedOutputSpeaking(false);
    }
  };
  
  const handleAnimatedOutputButtonClick = () => {
    if (isGeneratingAnimatedOutput) return; // Already processing

    if (isAnimatedOutputSpeakingRef.current || isAnimatedOutputAnimatingRef.current) {
        // Stop speech if playing
        if (isAnimatedOutputSpeakingRef.current && typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel();
            setIsAnimatedOutputSpeaking(false);
            animatedOutputSpeakingTextRef.current = null;
        }
        // Stop animation if animating
        if (isAnimatedOutputAnimatingRef.current) {
            stopAnimatedOutputFlicker();
        }
        toast({ title: "Output Stopped", description: "Animation and speech (if active) have been stopped.", duration: 2000 });
    } else {
        handleGenerateAnimatedOutputAndSpeak();
    }
  };
  
  const anyLoading = isGeneratingSpeech || isCloningVoice || isGeneratingAnimatedOutput;
  const currentPreparedTextIsSpeaking = isSpeaking && preparedSpeechText && speakingText === preparedSpeechText;
  const currentSimulatedClonedVoiceIsSpeaking = isSimulatedClonedVoiceSpeaking && textForSimulatedClonedVoiceRef.current && textForSimulatedClonedVoiceRef.current === textForSimulatedClonedVoiceRef.current;


  let animatedOutputButtonText = "Generate & Play Animated Output";
  if (isGeneratingAnimatedOutput) {
    animatedOutputButtonText = "Generating AI Frame...";
  } else if (isAnimatedOutputSpeakingRef.current && isAnimatedOutputAnimatingRef.current) {
    animatedOutputButtonText = "Stop Speaking & Animating";
  } else if (isAnimatedOutputSpeakingRef.current) {
    animatedOutputButtonText = "Stop Speaking";
  } else if (isAnimatedOutputAnimatingRef.current) {
    animatedOutputButtonText = "Stop Animating";
  }


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
                        disabled={anyLoading || isSimulatedClonedVoiceSpeaking || isAnimatedOutputSpeakingRef.current }
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
                    disabled={anyLoading || (isSpeaking && !isSimulatedClonedVoiceSpeakingRef.current && speakingText !== textForSimulatedClonedVoiceRef.current) || isAnimatedOutputSpeakingRef.current }
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
                      Using your uploaded image. AI will generate an expressive frame. Browser will speak the text with flicker animation.
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1" id="animated-output-info">
                      Please upload an image and prepare audio text in the sections above.
                    </p>
                  )}
              </div>

              <Button
                onClick={handleAnimatedOutputButtonClick}
                disabled={anyLoading && !isAnimatedOutputSpeakingRef.current && !isAnimatedOutputAnimatingRef.current } // Disable only if another main process is loading
                className="w-full sm:w-auto"
              >
                {isGeneratingAnimatedOutput && !isAnimatedOutputSpeakingRef.current && !isAnimatedOutputAnimatingRef.current ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 
                 (isAnimatedOutputSpeakingRef.current || isAnimatedOutputAnimatingRef.current) ? <StopCircle className="mr-2 h-4 w-4"/> : <Sparkles className="mr-2 h-4 w-4" />}
                {animatedOutputButtonText}
              </Button>
              
              <div className="mt-6 p-4 border rounded-md bg-muted/30 shadow relative min-h-[250px] space-y-6">
                <div>
                    <Label className="text-lg font-semibold text-foreground flex items-center gap-2 mb-2">
                        <Sparkles className="h-5 w-5"/>
                        Animated Image:
                    </Label>
                    <div className="bg-black rounded-md flex items-center justify-center aspect-video overflow-hidden min-h-[200px] max-h-[300px] relative">
                    {isGeneratingAnimatedOutput && !animatedOutputAiFrame && !animatedOutputError && !displayedFrameInAnimatedOutputRef.current ? ( 
                        <div className="flex flex-col items-center justify-center text-center p-4">
                        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                        <p className="text-lg font-semibold text-white">Generating AI Frame...</p>
                        </div>
                    ) : displayedFrameInAnimatedOutputRef.current ? (
                        <Image
                            key={displayedFrameInAnimatedOutputRef.current} 
                            src={displayedFrameInAnimatedOutputRef.current}
                            alt={isAnimatedOutputAnimatingRef.current ? "Animated speaking frame" : (animatedOutputAiFrameRef.current ? "AI generated expressive frame" : "Original uploaded image")}
                            fill
                            style={{ objectFit: 'contain' }}
                            className="rounded-md bg-black"
                            priority={true} 
                            data-ai-hint="expressive speaking frame"
                        />
                    ) : imagePreviewRef.current && !animatedOutputError ? ( 
                         <Image
                            src={imagePreviewRef.current}
                            alt="Original uploaded image (AI frame pending or failed)"
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
                    This feature generates an AI expressive still frame from your image.
                    Your browser then speaks the text while the image flickers between the original and the AI frame to simulate animation.
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

