
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

const FLICKER_INTERVAL_MS = 250;

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

  const isAnimatedOutputSpeakingRef = useRef(isAnimatedOutputSpeaking);
  const isAnimatedOutputAnimatingRef = useRef(isAnimatedOutputAnimating);
  const animatedOutputAiFrameRef = useRef(animatedOutputAiFrame);
  const flickerIntervalIdAnimatedOutputRef = useRef<NodeJS.Timeout | null>(null);
  const activeFrameForAnimatedOutputRef = useRef<'original' | 'ai'>('original');
  const currentSpeakingTextForAnimatedOutputRef = useRef<string | null>(null);


  const stopFlickerAnimationForAnimatedOutput = useCallback(() => {
    if (flickerIntervalIdAnimatedOutputRef.current) {
      clearInterval(flickerIntervalIdAnimatedOutputRef.current);
      flickerIntervalIdAnimatedOutputRef.current = null;
    }
    setIsAnimatedOutputAnimating(false);
    // When stopping, ensure the AI frame is shown if available, otherwise the original.
    setDisplayedFrameInAnimatedOutput(animatedOutputAiFrameRef.current || imagePreviewRef.current);
  }, []);

  const startFlickerAnimationForAnimatedOutput = useCallback(() => {
    if (!imagePreviewRef.current || !animatedOutputAiFrameRef.current || animatedOutputError) {
      stopFlickerAnimationForAnimatedOutput(); // Ensure it's stopped if conditions aren't met
      return;
    }

    stopFlickerAnimationForAnimatedOutput(); // Clear any existing interval
    setIsAnimatedOutputAnimating(true);
    activeFrameForAnimatedOutputRef.current = 'ai'; // Start with AI frame
    setDisplayedFrameInAnimatedOutput(animatedOutputAiFrameRef.current);

    flickerIntervalIdAnimatedOutputRef.current = setInterval(() => {
      if (activeFrameForAnimatedOutputRef.current === 'original') {
        setDisplayedFrameInAnimatedOutput(animatedOutputAiFrameRef.current);
        activeFrameForAnimatedOutputRef.current = 'ai';
      } else {
        setDisplayedFrameInAnimatedOutput(imagePreviewRef.current);
        activeFrameForAnimatedOutputRef.current = 'original';
      }
    }, FLICKER_INTERVAL_MS);
  }, [animatedOutputError, stopFlickerAnimationForAnimatedOutput]);


  useEffect(() => {
    imagePreviewRef.current = imagePreview;
    if (!imagePreview) { 
      // Stop and clear states for the animated output section if image is removed
      stopFlickerAnimationForAnimatedOutput();
      if (isAnimatedOutputSpeakingRef.current && typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel(); // Cancel only if this section was speaking
      }
      setIsAnimatedOutputSpeaking(false);
      currentSpeakingTextForAnimatedOutputRef.current = null;
      setAnimatedOutputAiFrame(null);
      setAnimatedOutputError(null);
      setDisplayedFrameInAnimatedOutput(null);
    } else {
      // If a new image is uploaded, set it as the base display for the animated output section
      setDisplayedFrameInAnimatedOutput(imagePreview);
      // Clear any old AI frame and error from a previous image for this section
      setAnimatedOutputAiFrame(null);
      setAnimatedOutputError(null);
      // If it was animating/speaking, stop it as the context has changed
      stopFlickerAnimationForAnimatedOutput();
      if (isAnimatedOutputSpeakingRef.current && typeof window !== 'undefined' && window.speechSynthesis) {
         window.speechSynthesis.cancel();
      }
      setIsAnimatedOutputSpeaking(false);
      currentSpeakingTextForAnimatedOutputRef.current = null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imagePreview, stopFlickerAnimationForAnimatedOutput]); 


  useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);
  useEffect(() => { isSimulatedClonedVoiceSpeakingRef.current = isSimulatedClonedVoiceSpeaking; }, [isSimulatedClonedVoiceSpeaking]);
  useEffect(() => { preparedSpeechTextRef.current = preparedSpeechText; }, [preparedSpeechText]);
  useEffect(() => { textForSimulatedClonedVoiceRef.current = textForSimulatedClonedVoice; }, [textForSimulatedClonedVoice]);
  useEffect(() => { speakingTextRef.current = speakingText; }, [speakingText]);

  useEffect(() => { isAnimatedOutputSpeakingRef.current = isAnimatedOutputSpeaking; }, [isAnimatedOutputSpeaking]);
  useEffect(() => { isAnimatedOutputAnimatingRef.current = isAnimatedOutputAnimating; }, [isAnimatedOutputAnimating]);
  useEffect(() => { animatedOutputAiFrameRef.current = animatedOutputAiFrame; }, [animatedOutputAiFrame]);


  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis) {
      setIsSpeechSupported(true);
    } else {
      setIsSpeechSupported(false);
    }

    return () => { // General cleanup
      if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis) {
         if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
          window.speechSynthesis.cancel(); 
        }
        window.speechSynthesis.onvoiceschanged = null; 
      }
      setIsSpeaking(false); 
      setSpeakingText(null);
      setIsSimulatedClonedVoiceSpeaking(false);
      
      stopFlickerAnimationForAnimatedOutput();
      setIsAnimatedOutputSpeaking(false);
      currentSpeakingTextForAnimatedOutputRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  

  const resetOutputsDependentOnTextOrImage = useCallback(() => {
    setPreparedSpeechText(null);
    setTextForSimulatedClonedVoice(null); 
    
    stopFlickerAnimationForAnimatedOutput();
    if (isAnimatedOutputSpeakingRef.current && typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
    setIsAnimatedOutputSpeaking(false);
    currentSpeakingTextForAnimatedOutputRef.current = null;
    setAnimatedOutputAiFrame(null); 
    setAnimatedOutputError(null); 
    setDisplayedFrameInAnimatedOutput(imagePreviewRef.current);


    if (typeof window !== 'undefined' && window.speechSynthesis && (isSpeakingRef.current || isSimulatedClonedVoiceSpeakingRef.current)) {
        window.speechSynthesis.cancel(); 
    }
    setIsSpeaking(false); 
    setSpeakingText(null);
    setIsSimulatedClonedVoiceSpeaking(false);
  }, [stopFlickerAnimationForAnimatedOutput]);


  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImagePreview(result);
        setDisplayedFrameInAnimatedOutput(result); // Initialize display for animated output section
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
    
    // Reset AI animated output section as its source text might change
    stopFlickerAnimationForAnimatedOutput();
    setIsAnimatedOutputSpeaking(false);
    currentSpeakingTextForAnimatedOutputRef.current = null;
    setAnimatedOutputAiFrame(null);
    setAnimatedOutputError(null);
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

    if (typeof window !== 'undefined' && window.speechSynthesis && (isSpeakingRef.current || isSimulatedClonedVoiceSpeakingRef.current || isAnimatedOutputSpeakingRef.current)) {
        window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setSpeakingText(null);
    setIsSimulatedClonedVoiceSpeaking(false);
    setIsAnimatedOutputSpeaking(false);
    currentSpeakingTextForAnimatedOutputRef.current = null;
    stopFlickerAnimationForAnimatedOutput();
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
    currentSpeakingTextForAnimatedOutputRef.current = null;
    stopFlickerAnimationForAnimatedOutput();
    
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
    currentSpeakingTextForAnimatedOutputRef.current = null;
    stopFlickerAnimationForAnimatedOutput();
    
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

  }, [isSpeechSupported, toast, stopFlickerAnimationForAnimatedOutput]);

  
  const isUsablePreparedTextAvailable = () => 
    preparedSpeechTextRef.current && 
    preparedSpeechTextRef.current.trim() !== "" && 
    !preparedSpeechTextRef.current.toLowerCase().startsWith("no text was provided") && 
    !preparedSpeechTextRef.current.toLowerCase().startsWith("error:");

  const isUsableClonedTextAvailable = () =>
    textForSimulatedClonedVoiceRef.current && textForSimulatedClonedVoiceRef.current.trim() !== "";

  const getTextForAnimatedOutput = () => {
    if (isUsableClonedTextAvailable() && textForSimulatedClonedVoiceRef.current) {
      return textForSimulatedClonedVoiceRef.current;
    } 
    else if (isUsablePreparedTextAvailable() && preparedSpeechTextRef.current) {
      return preparedSpeechTextRef.current;
    }
    return null;
  };
  
  const isTextAvailableForAnimatedOutputSection = !!getTextForAnimatedOutput();

  const handleGenerateAndPlayAnimatedOutput = async () => {
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
    setDisplayedFrameInAnimatedOutput(imagePreviewRef.current); // Show original image initially
    
    // Stop any other speech/animation
    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setSpeakingText(null);
    setIsSimulatedClonedVoiceSpeaking(false);
    stopFlickerAnimationForAnimatedOutput(); // Stop this section's animation if it was running
    setIsAnimatedOutputSpeaking(false);
    currentSpeakingTextForAnimatedOutputRef.current = null;

    toast({ title: "Generating Animated Output...", description: "AI is creating an expressive frame and preparing speech..." });
  
    let aiFrameResult: GenerateAnimatedFrameOutput | null = null;
  
    try {
      const textSnippet = textToSpeakForAnimation.substring(0, 150);
      const animationPrompt = `Your primary task is to transform the provided static photo into a single, highly expressive keyframe image. This new image must depict the person as if they are frozen mid-sentence, actively speaking the initial words of this text: "${textSnippet}". CRITICALLY, the generated image needs to show *clear visual changes* from the original photo, especially in the mouth shape (viseme) to precisely match the first phonemes of the text, and in the eye expression to convey engagement in speech. The overall facial expression should be dynamic and appropriate for the act of speaking these initial words. The primary output of this request MUST be the generated image.`;
      
      aiFrameResult = await generateAnimatedFrame({
        originalImageDataUri: imagePreviewRef.current,
        animationPrompt: animationPrompt,
      });
  
      let frameGeneratedSuccessfully = false;
      if (aiFrameResult.generatedFrameDataUri) {
        setAnimatedOutputAiFrame(aiFrameResult.generatedFrameDataUri);
        setDisplayedFrameInAnimatedOutput(aiFrameResult.generatedFrameDataUri); // Show AI frame once loaded
        setAnimatedOutputError(null);
        frameGeneratedSuccessfully = true;
      } else {
        let userFriendlyAiMessage = "The AI couldn't create an image for this request. This can happen sometimes. You could try again, perhaps with different text or a slightly different image.";
        if (aiFrameResult.errorType === 'AI_API_ERROR' || aiFrameResult.errorType === 'FLOW_EXCEPTION') {
             userFriendlyAiMessage = aiFrameResult.errorMessage || "An unexpected error occurred during AI frame generation.";
        } else if (aiFrameResult.errorType === 'AI_DID_NOT_RETURN_IMAGE' && aiFrameResult.errorMessage) {
            userFriendlyAiMessage = aiFrameResult.errorMessage;
        }
        console.warn('[GenerateAnimatedOutput] AI Frame Gen Issue:', userFriendlyAiMessage, 'Type:', aiFrameResult.errorType);
        setAnimatedOutputError(userFriendlyAiMessage);
        setAnimatedOutputAiFrame(null);
        setDisplayedFrameInAnimatedOutput(imagePreviewRef.current); // Fallback to original
      }

      if (isSpeechSupported && textToSpeakForAnimation) {
        const utterance = new SpeechSynthesisUtterance(textToSpeakForAnimation);
        currentSpeakingTextForAnimatedOutputRef.current = textToSpeakForAnimation;

        utterance.onstart = () => {
          setIsAnimatedOutputSpeaking(true);
          if (frameGeneratedSuccessfully && animatedOutputAiFrameRef.current && !animatedOutputError) {
            startFlickerAnimationForAnimatedOutput();
          }
        };
        utterance.onend = () => {
          setIsAnimatedOutputSpeaking(false);
          stopFlickerAnimationForAnimatedOutput();
          currentSpeakingTextForAnimatedOutputRef.current = null;
          setIsGeneratingAnimatedOutput(false); // Only set loading to false after speech ends
        };
        utterance.onerror = (event) => {
          if (event.error === 'interrupted') {
            toast({ title: "Speech Interrupted", description: "Animated output playback was interrupted.", variant: "default" });
          } else {
            toast({ title: "Speech Error", description: `Could not play speech for animated output. (Error: ${event.error || 'unknown'})`, variant: "destructive" });
            setAnimatedOutputError(prev => prev ? `${prev} Speech error: ${event.error || 'unknown'}` : `Speech error: ${event.error || 'unknown'}`);
          }
          setIsAnimatedOutputSpeaking(false);
          stopFlickerAnimationForAnimatedOutput();
          currentSpeakingTextForAnimatedOutputRef.current = null;
          setIsGeneratingAnimatedOutput(false); // Also set loading to false on error
        };
        window.speechSynthesis.speak(utterance);
        toast({ 
          title: frameGeneratedSuccessfully ? "AI Frame Ready!" : "AI Frame Issue", 
          description: `${frameGeneratedSuccessfully ? "Expressive frame generated." : (animatedOutputError || "Could not generate expressive frame.")} Now speaking...`,
          variant: frameGeneratedSuccessfully ? "default" : "destructive",
          duration: 4000 
        });
      } else {
        // No speech, so generation phase is complete
        setIsGeneratingAnimatedOutput(false);
        toast({
          title: frameGeneratedSuccessfully ? "AI Frame Ready" : "AI Frame Generation Failed",
          description: frameGeneratedSuccessfully ? "Expressive frame is ready." : (animatedOutputError || "Could not generate expressive frame."),
          variant: frameGeneratedSuccessfully ? "default" : "destructive",
          duration: 5000
        });
      }

    } catch (error: any) {
      console.error('[GenerateAnimatedOutput] General client-side processing error:', error);
      const message = error.message || "An unexpected client-side error occurred.";
      setAnimatedOutputError(prev => prev ? `${prev} Client error: ${message}` : message);
      toast({ title: "Client Error", description: message, variant: "destructive" });
      setIsGeneratingAnimatedOutput(false);
    }
    // Note: setIsGeneratingAnimatedOutput(false) is handled by speech onend/onerror or directly if no speech
  };

  const handleAnimatedOutputButtonClick = () => {
    if (isGeneratingAnimatedOutput) return; // Prevent action if already generating

    if (isAnimatedOutputSpeaking || isAnimatedOutputAnimating) {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel(); // This will trigger onend/onerror for the current utterance
        }
        stopFlickerAnimationForAnimatedOutput();
        setIsAnimatedOutputSpeaking(false);
        currentSpeakingTextForAnimatedOutputRef.current = null;
        // setIsGeneratingAnimatedOutput(false); // Should already be false or handled by speech events
    } else {
        handleGenerateAndPlayAnimatedOutput();
    }
  };
  
  const anyLoading = isGeneratingSpeech || isCloningVoice || isGeneratingAnimatedOutput;
  const currentPreparedTextIsSpeaking = isSpeaking && preparedSpeechText && speakingText === preparedSpeechText;
  const currentSimulatedClonedVoiceIsSpeaking = isSimulatedClonedVoiceSpeaking && textForSimulatedClonedVoiceRef.current && textForSimulatedClonedVoiceRef.current === textForSimulatedClonedVoiceRef.current;


  let animatedOutputButtonText = "Generate & Play Animated Output";
  if (isGeneratingAnimatedOutput) {
    animatedOutputButtonText = "Generating...";
  } else if (isAnimatedOutputSpeaking && isAnimatedOutputAnimating) {
    animatedOutputButtonText = "Stop Speaking & Animating";
  } else if (isAnimatedOutputAnimating) {
    animatedOutputButtonText = "Stop Animating";
  } else if (isAnimatedOutputSpeaking) {
    animatedOutputButtonText = "Stop Speaking";
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
                  disabled={anyLoading || isAnimatedOutputSpeaking || isAnimatedOutputAnimating}
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
                  disabled={anyLoading || isAnimatedOutputSpeaking || isAnimatedOutputAnimating}
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
                disabled={anyLoading || isAnimatedOutputSpeaking || isAnimatedOutputAnimating} 
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
                        disabled={anyLoading || isSimulatedClonedVoiceSpeaking || isAnimatedOutputSpeaking || isAnimatedOutputAnimating}
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
                  disabled={anyLoading || isAnimatedOutputSpeaking || isAnimatedOutputAnimating}
                />
                 <p className="text-xs text-muted-foreground mt-1 italic">Note: This uploaded sample is for simulation purposes. Playback will use a standard browser voice, not the uploaded sample's voice.</p>
                {selectedVoiceSample && (
                  <p className="text-sm text-muted-foreground mt-1">Selected file: {selectedVoiceSample.name}</p>
                )}
              </div>
              <Button
                onClick={handleCloneVoiceAndSynthesize}
                disabled={anyLoading || !selectedVoiceSample || !isPreparedTextAvailableAndUsable() || isAnimatedOutputSpeaking || isAnimatedOutputAnimating}
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
                    disabled={anyLoading || (isSpeaking && !isSimulatedClonedVoiceSpeakingRef.current && speakingText !== textForSimulatedClonedVoiceRef.current) || isAnimatedOutputSpeaking || isAnimatedOutputAnimating}
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

          <SectionCard title="AI Animated Output & Speech" icon={<Video className="text-primary" />}>
            <div className="space-y-4">
               <div>
                <Label htmlFor="animation-info" className="text-base">Image &amp; Audio Source for Output:</Label>
                 {imagePreview ? (
                    <p className="text-sm text-muted-foreground mt-1" id="animation-info">
                      Using your uploaded image and text from "Prepared Text" or "Mock Cloned Audio".
                      AI will generate an expressive still frame. Your browser will speak the text while animating the image.
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1" id="animation-info">
                      Please upload an image and prepare audio text in the sections above.
                    </p>
                  )}
              </div>

              <Button
                onClick={handleAnimatedOutputButtonClick}
                disabled={isGeneratingAnimatedOutput || !selectedImage || !isTextAvailableForAnimatedOutputSection}
                className="w-full sm:w-auto"
              >
                {isGeneratingAnimatedOutput ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 
                 (isAnimatedOutputSpeaking || isAnimatedOutputAnimating) ? <StopCircle className="mr-2 h-4 w-4" /> : 
                 <Sparkles className="mr-2 h-4 w-4" />}
                {animatedOutputButtonText}
              </Button>
              
              <div className="mt-6 p-4 border rounded-md bg-muted/30 shadow relative min-h-[250px] space-y-6">
                <div>
                    <Label className="text-lg font-semibold text-foreground flex items-center gap-2 mb-2">
                        <Sparkles className="h-5 w-5"/>
                        AI Expressive Still Frame:
                    </Label>
                    <div className="bg-black rounded-md flex items-center justify-center aspect-video overflow-hidden min-h-[200px] max-h-[300px] relative">
                    {isGeneratingAnimatedOutput && !animatedOutputAiFrame && !animatedOutputError ? ( 
                        <div className="flex flex-col items-center justify-center text-center p-4">
                        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                        <p className="text-lg font-semibold text-white">Generating AI Frame...</p>
                        </div>
                    ) : displayedFrameInAnimatedOutput ? (
                        <Image
                            key={displayedFrameInAnimatedOutput} 
                            src={displayedFrameInAnimatedOutput}
                            alt={isAnimatedOutputAnimating ? "Animated expressive frame" : (animatedOutputAiFrame ? "AI generated expressive frame" : "Original uploaded image")}
                            fill
                            style={{ objectFit: 'contain' }}
                            className="rounded-md bg-black"
                            priority={true} 
                            data-ai-hint="expressive speaking frame"
                        />
                    ) : imagePreview && !animatedOutputError ? ( // Fallback if displayedFrameInAnimatedOutput is null but imagePreview exists
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
                    {animatedOutputError && ( 
                    <div className="mt-2 p-3 border border-destructive/50 rounded-md bg-destructive/10 text-destructive text-sm flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5"/>
                        <p>Frame Generation Issue: {animatedOutputError}</p>
                    </div>
                    )}
                </div>
                 <p className="text-xs text-muted-foreground mt-2 italic">
                    This feature uses AI to generate an expressive still image based on your upload. 
                    Your browser's text-to-speech will read the selected text while the image animates by flickering between the original and the AI-generated frame.
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

