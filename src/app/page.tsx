
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
import { Text, MicVocal, Loader2, ImagePlus, Volume2, StopCircle, AlertTriangle, SparklesIcon, HelpCircle } from 'lucide-react';
import { prepareTextForSpeech } from '@/ai/flows/prepare-text-for-speech-flow';
import { generateAnimatedFrame } from '@/ai/flows/generate-animated-frame-flow';


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

  const [isGeneratingFrame, setIsGeneratingFrame] = useState<boolean>(false);
  const [animatedFramePreview, setAnimatedFramePreview] = useState<string | null>(null);
  const [animationError, setAnimationError] = useState<string | null>(null);
  const [textForAnimatedFrameAndSpeech, setTextForAnimatedFrameAndSpeech] = useState<string | null>(null);
  const [activeDisplayFrame, setActiveDisplayFrame] = useState<'original' | 'animated' | null>(null);
  const [isFlickerAnimationActive, setIsFlickerAnimationActive] = useState<boolean>(false);
  const animationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const { toast } = useToast();

  const isSpeakingRef = useRef(isSpeaking);
  const isSimulatedClonedVoiceSpeakingRef = useRef(isSimulatedClonedVoiceSpeaking);
  const preparedSpeechTextRef = useRef(preparedSpeechText);
  const textForSimulatedClonedVoiceRef = useRef(textForSimulatedClonedVoice);
  const speakingTextRef = useRef(speakingText);
  const imagePreviewRef = useRef<string | null>(null);
  const animatedFramePreviewRef = useRef<string | null>(null);
  const textForAnimatedFrameAndSpeechRef = useRef<string | null>(null);


  useEffect(() => {
    imagePreviewRef.current = imagePreview;
    if (!imagePreview) { 
      setAnimatedFramePreview(null);
      setAnimationError(null);
      setActiveDisplayFrame(null);
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
        animationIntervalRef.current = null;
      }
      setIsFlickerAnimationActive(false);
    } else {
      setActiveDisplayFrame('original'); 
    }
  }, [imagePreview]);

  useEffect(() => {
    animatedFramePreviewRef.current = animatedFramePreview;
  }, [animatedFramePreview]);

  useEffect(() => {
    textForAnimatedFrameAndSpeechRef.current = textForAnimatedFrameAndSpeech;
  }, [textForAnimatedFrameAndSpeech]);

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
      const logVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length === 0) {
          console.warn('No speech synthesis voices currently available. They might load asynchronously.');
        }
      };
      logVoices(); 
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = logVoices;
      } else {
        setTimeout(logVoices, 500); 
      }
    } else {
      setIsSpeechSupported(false);
      console.warn('Speech synthesis not supported by this browser.');
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
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
        animationIntervalRef.current = null;
      }
      setIsFlickerAnimationActive(false);
    };
  }, []);
  
  const resetOutputsDependentOnTextOrImage = useCallback(() => {
    setPreparedSpeechText(null);
    setTextForSimulatedClonedVoice(null); 
    
    setAnimatedFramePreview(null);
    setAnimationError(null);
    setTextForAnimatedFrameAndSpeech(null);
    if (imagePreviewRef.current) {
      setActiveDisplayFrame('original');
    } else {
      setActiveDisplayFrame(null);
    }
    if (animationIntervalRef.current) {
      clearInterval(animationIntervalRef.current);
      animationIntervalRef.current = null;
    }
    setIsFlickerAnimationActive(false);

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
        setActiveDisplayFrame('original'); 
      };
      reader.onerror = () => {
        console.error("FileReader error when trying to load image.");
        setSelectedImage(null); 
        setImagePreview(null);
        setActiveDisplayFrame(null);
        toast({ title: "Image Load Error", description: "Could not read the selected image file.", variant: "destructive" });
      }
      reader.readAsDataURL(file);
    } else {
      setSelectedImage(null);
      setImagePreview(null);
      setActiveDisplayFrame(null);
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
    if (animationIntervalRef.current) {
      clearInterval(animationIntervalRef.current);
      animationIntervalRef.current = null;
    }
    setIsFlickerAnimationActive(false);
    if (animatedFramePreviewRef.current) setActiveDisplayFrame('animated'); else if (imagePreviewRef.current) setActiveDisplayFrame('original');


    setIsGeneratingSpeech(true);
    setPreparedSpeechText(null); 
    setTextForSimulatedClonedVoice(null);
    
    setAnimatedFramePreview(null);
    setAnimationError(null);
    setTextForAnimatedFrameAndSpeech(null);


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

    if (isSpeakingRef.current && speakingTextRef.current === textToSpeak && !isFlickerAnimationActive) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setSpeakingText(null);
      setIsSimulatedClonedVoiceSpeaking(false); 
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
      
      if (isFlickerAnimationActive) { // If flicker is active for another audio, stop it
        if (animationIntervalRef.current) clearInterval(animationIntervalRef.current);
        setIsFlickerAnimationActive(false);
        if (animatedFramePreviewRef.current) setActiveDisplayFrame('animated'); else if (imagePreviewRef.current) setActiveDisplayFrame('original');
      }


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
  }, [isSpeechSupported, toast, isFlickerAnimationActive]); 


  const handleVoiceSampleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) setSelectedVoiceSample(file);
    else setSelectedVoiceSample(null);
    
    setTextForSimulatedClonedVoice(null);
    setAnimatedFramePreview(null); 
    setAnimationError(null);
    setTextForAnimatedFrameAndSpeech(null);
    if (imagePreviewRef.current) setActiveDisplayFrame('original'); else setActiveDisplayFrame(null);
    if (animationIntervalRef.current) {
      clearInterval(animationIntervalRef.current);
      animationIntervalRef.current = null;
    }
    setIsFlickerAnimationActive(false);


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
    if (animationIntervalRef.current) {
      clearInterval(animationIntervalRef.current);
      animationIntervalRef.current = null;
    }
    setIsFlickerAnimationActive(false);
    if (animatedFramePreviewRef.current) setActiveDisplayFrame('animated'); else if (imagePreviewRef.current) setActiveDisplayFrame('original');
    
    setTextForSimulatedClonedVoice(null); 
    setAnimatedFramePreview(null);
    setAnimationError(null);
    setTextForAnimatedFrameAndSpeech(null);
    
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
        setTextForSimulatedClonedVoice(stillUsablePreparedText); 
        toast({ title: "Mock Voice Cloning Complete", description: `Speech based on "${stillUsablePreparedText.substring(0,50)}..." using voice sample "${selectedVoiceSample.name}" is (mock) ready for simulated playback.` });
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

    if (isSimulatedClonedVoiceSpeakingRef.current && !isFlickerAnimationActive) {
        window.speechSynthesis.cancel();
        setIsSimulatedClonedVoiceSpeaking(false);
        setIsSpeaking(false); 
        setSpeakingText(null);
        return;
    }

    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        window.speechSynthesis.cancel();
    }
    
    setIsSimulatedClonedVoiceSpeaking(true); 
    setIsSpeaking(false); 
    setSpeakingText(null); 
    
    if (isFlickerAnimationActive) { // If flicker is active for another audio, stop it
      if (animationIntervalRef.current) clearInterval(animationIntervalRef.current);
      setIsFlickerAnimationActive(false);
      if (animatedFramePreviewRef.current) setActiveDisplayFrame('animated'); else if (imagePreviewRef.current) setActiveDisplayFrame('original');
    }

    setTimeout(() => {
        if (!isSimulatedClonedVoiceSpeakingRef.current) { 
             if (isSimulatedClonedVoiceSpeakingRef.current) { 
                 setIsSimulatedClonedVoiceSpeaking(false);
            }
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

  }, [isSpeechSupported, toast, isFlickerAnimationActive]);

  const anyLoading = isGeneratingSpeech || isCloningVoice || isGeneratingFrame;
  
  const isUsablePreparedTextAvailable = () => 
    preparedSpeechTextRef.current && 
    preparedSpeechTextRef.current.trim() !== "" && 
    !preparedSpeechTextRef.current.toLowerCase().startsWith("no text was provided") && 
    !preparedSpeechTextRef.current.toLowerCase().startsWith("error:");

  const isUsableClonedTextAvailable = () =>
    textForSimulatedClonedVoiceRef.current && textForSimulatedClonedVoiceRef.current.trim() !== "";

  const isTextAvailableForAnimatedFrame = isUsablePreparedTextAvailable() || isUsableClonedTextAvailable();


const handleStopAnimation = useCallback(() => {
    console.log("[AnimatedFrame] User clicked Stop Animating.");
    if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
        animationIntervalRef.current = null;
    }
    setIsFlickerAnimationActive(false);
    
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      window.speechSynthesis.cancel(); // Stop any speech
    }
    setIsSpeaking(false); // Ensure speaking state is false
    setSpeakingText(null);
    // setTextForAnimatedFrameAndSpeech(null); // Keep this to know what *was* animating, or clear? Let's clear.
    // Forcing a clear ensures next "Generate" starts fresh.
    setTextForAnimatedFrameAndSpeech(null);


    // Settle the display on the animated frame if available, otherwise original
    if (animatedFramePreviewRef.current) {
        setActiveDisplayFrame('animated');
    } else if (imagePreviewRef.current) {
        setActiveDisplayFrame('original');
    } else {
        setActiveDisplayFrame(null); // Or a placeholder if neither exists
    }
}, []);


const handleGenerateAnimatedFrameAndSpeak = async () => {
    // This function is now only for GENERATING. Stopping is handled by handleStopAnimation.

    // Defensive clear of any previous interval and ensure flicker state is false.
    if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
        animationIntervalRef.current = null;
    }
    setIsFlickerAnimationActive(false); // Ensure it's reset before a new generation

    let textToSpeakForFrame: string | null = null;
    if (isUsableClonedTextAvailable() && textForSimulatedClonedVoiceRef.current) {
      textToSpeakForFrame = textForSimulatedClonedVoiceRef.current;
    } else if (isUsablePreparedTextAvailable() && preparedSpeechTextRef.current) {
      textToSpeakForFrame = preparedSpeechTextRef.current;
    }

    if (!imagePreviewRef.current) {
      toast({ title: "Image Required", description: "Please upload an image in the 'Text & Image to Speech Preparation' section.", variant: "destructive" });
      return;
    }
    if (!textToSpeakForFrame) {
      toast({ title: "Audio Text Required", description: "Please use 'Process Input for Speech' or 'Generate Speech with Cloned Voice (Mock)' first to prepare text for animation.", variant: "destructive" });
      return;
    }
    
    // Stop any other ongoing browser speech synthesis from other sections
    if (typeof window !== 'undefined' && window.speechSynthesis && (window.speechSynthesis.speaking || window.speechSynthesis.pending)) {
      console.log("[AnimatedFrame] Stopping other ongoing speech synthesis before starting new.");
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false); // Reset speaking state for other sections
    setSpeakingText(null);
    setIsSimulatedClonedVoiceSpeaking(false); 
    
    // Reset states for the new animation cycle
    // setAnimatedFramePreview(null); // Keep previous frame until new one is ready or error.
    setAnimationError(null);
    setTextForAnimatedFrameAndSpeech(null); // Clear association with previous text

    setIsGeneratingFrame(true);
    toast({ title: "Generating Animated Frame...", description: "AI is creating a speaking pose..." });

    const textSnippetForPrompt = textToSpeakForFrame.substring(0, 75);
    const animationPrompt = `Generate an image of this person as if they are in the middle of speaking the following text. Focus on a natural mouth shape and facial expression that clearly corresponds to the initial sounds of this text, making the lips appear synchronized with the beginning of the speech. Convey appropriate emotion. Imagine this is a keyframe from an animated video. Text: "${textSnippetForPrompt}"`;

    try {
      const result = await generateAnimatedFrame({
        originalImageDataUri: imagePreviewRef.current,
        animationPrompt: animationPrompt,
      });

      if (result.errorMessage || !result.generatedFrameDataUri) {
        const errorToShow = result.errorMessage || "AI failed to generate an image.";
        setAnimationError(errorToShow);
        toast({ title: "Animation Frame Error", description: errorToShow, variant: "destructive" });
        setActiveDisplayFrame('original'); 
        if (animationIntervalRef.current) { // Ensure flicker stops on error
            clearInterval(animationIntervalRef.current);
            animationIntervalRef.current = null;
        }
        setIsFlickerAnimationActive(false);
        return;
      }

      setAnimatedFramePreview(result.generatedFrameDataUri);
      setTextForAnimatedFrameAndSpeech(textToSpeakForFrame); 
      setActiveDisplayFrame('animated'); 

      toast({ title: "Frame Generated", description: "Playing speech with animation...", duration: 2000});

      if (isSpeechSupported) {
        setTimeout(() => {
          // Check if context changed (e.g. user clicked stop or started new generation)
          if (textForAnimatedFrameAndSpeechRef.current !== textToSpeakForFrame || !result.generatedFrameDataUri) {
            console.log("[AnimatedFrame] Context changed before speech could start. Aborting speech and flicker for this attempt.");
             if (animationIntervalRef.current) {
                clearInterval(animationIntervalRef.current);
                animationIntervalRef.current = null;
            }
            setIsFlickerAnimationActive(false); // Ensure flicker is marked as inactive
            // Settle on whatever is current best frame
            if (animatedFramePreviewRef.current) setActiveDisplayFrame('animated');
            else if (imagePreviewRef.current) setActiveDisplayFrame('original');
            return;
          }

          console.log(`[AnimatedFrame] Starting speech & flicker for: "${textToSpeakForFrame.substring(0,30)}..."`);
          setActiveDisplayFrame('original'); // Start flicker with original
          
          // Ensure no old interval is running before starting a new one
          if (animationIntervalRef.current) clearInterval(animationIntervalRef.current);
          
          animationIntervalRef.current = setInterval(() => {
            setActiveDisplayFrame(prev => (prev === 'original' && animatedFramePreviewRef.current) ? 'animated' : 'original');
          }, 300); 
          setIsFlickerAnimationActive(true); 

          const utterance = new SpeechSynthesisUtterance(textToSpeakForFrame);
          utterance.onstart = () => {
            console.log("[AnimatedFrame] Speech started event.");
            setIsSpeaking(true); 
            setSpeakingText(textToSpeakForFrame);
          };
          utterance.onend = () => {
            console.log("[AnimatedFrame] Speech ended event. Flicker continues.");
            setIsSpeaking(false);
            setSpeakingText(null);
            // Flicker continues, isFlickerAnimationActive remains true. textForAnimatedFrameAndSpeech remains set.
          };
          utterance.onerror = (event) => {
            console.error("[AnimatedFrame] Speech error event. Flicker may continue.", event.error);
            if (event.error === 'interrupted') {
                toast({ title: "Speech Interrupted", description: "Animated frame speech was interrupted.", variant: "default" });
            } else {
                toast({ title: "Speech Error", description: `Could not play animated frame speech. (Error: ${event.error || 'unknown'})`, variant: "destructive" });
            }
            setIsSpeaking(false);
            setSpeakingText(null);
            // Flicker continues. Fallback display if AI frame was problematic might be needed here.
            if (!animatedFramePreviewRef.current && imagePreviewRef.current) {
                setActiveDisplayFrame('original');
            }
          };
          window.speechSynthesis.speak(utterance);
        }, 100);
      } else {
        toast({ title: "Speech Not Supported", description: "Browser speech synthesis not available for playback.", variant: "default" });
        // If no speech, flicker should still start if frame was generated
        if (result.generatedFrameDataUri) {
            console.log("[AnimatedFrame] Speech not supported, but starting flicker animation.");
            setActiveDisplayFrame('original');
            if (animationIntervalRef.current) clearInterval(animationIntervalRef.current);
            animationIntervalRef.current = setInterval(() => {
                setActiveDisplayFrame(prev => (prev === 'original' && animatedFramePreviewRef.current) ? 'animated' : 'original');
            }, 300);
            setIsFlickerAnimationActive(true);
        }
      }

    } catch (error: any) {
      console.error('[AnimatedFrame] Error in generation pipeline:', error);
      const message = error.message || "An unexpected error occurred during frame generation or speech.";
      setAnimationError(message);
      toast({ title: "Animation/Speech Error", description: message, variant: "destructive" });
      setActiveDisplayFrame('original');
      if (animationIntervalRef.current) { 
        clearInterval(animationIntervalRef.current);
        animationIntervalRef.current = null;
      }
      setIsFlickerAnimationActive(false);
    } finally {
      setIsGeneratingFrame(false);
    }
  };
  
  const currentPreparedTextIsSpeakingWithNoAnimation = isSpeaking && preparedSpeechText && speakingText === preparedSpeechText && !isFlickerAnimationActive;
  const currentSimulatedClonedVoiceIsSpeakingWithNoAnimation = isSimulatedClonedVoiceSpeaking && textForSimulatedClonedVoice && !isFlickerAnimationActive;


  let displaySrc: string | null = null;
  if (activeDisplayFrame === 'animated' && animatedFramePreview) {
    displaySrc = animatedFramePreview;
  } else if (imagePreview) { // Prioritize original if activeDisplayFrame is 'original' or if animated isn't available
    displaySrc = imagePreview;
  } else if (animatedFramePreview) { // Fallback if activeDisplayFrame is null but animated is available
    displaySrc = animatedFramePreview;
  }
  

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
                {imagePreview && !animatedFramePreview && !isFlickerAnimationActive && (
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
                        disabled={anyLoading || isSimulatedClonedVoiceSpeaking || isFlickerAnimationActive || isGeneratingFrame }
                      >
                        {currentPreparedTextIsSpeakingWithNoAnimation ? <><StopCircle className="mr-2 h-4 w-4" />Stop Speaking</> : <><Volume2 className="mr-2 h-4 w-4" />Speak</>}
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
                    disabled={anyLoading || (isSpeaking && !isSimulatedClonedVoiceSpeakingRef.current && !isFlickerAnimationActive) || isFlickerAnimationActive || isGeneratingFrame }
                   >
                     {currentSimulatedClonedVoiceIsSpeakingWithNoAnimation ? <><StopCircle className="mr-2 h-4 w-4" />Stop Simulated Voice</> : <><Volume2 className="mr-2 h-4 w-4" />Play Simulated Cloned Voice</>}
                   </Button>
                   <p className="text-sm text-muted-foreground">
                     This simulates the cloned voice using your browser's standard text-to-speech with the prepared text that was active during 'cloning'.
                  </p>
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard title="AI Animated Frame &amp; Speech (Mock)" icon={<SparklesIcon className="text-primary" />} >
            <div className="space-y-4">
               <div>
                <Label htmlFor="animation-image-source" className="text-base">Image Source for Animation:</Label>
                 {imagePreview ? (
                    <div className="mt-1">
                      <p className="text-sm text-muted-foreground mb-1" id="animation-image-source">
                        Using image uploaded in the "Text &amp; Image to Speech Preparation" section.
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1" id="animation-image-source">
                      Please upload an image in the "Text &amp; Image to Speech Preparation" section. That image will be used for the animation.
                    </p>
                  )}
              </div>

              <Button
                onClick={isFlickerAnimationActive ? handleStopAnimation : handleGenerateAnimatedFrameAndSpeak}
                disabled={ (isGeneratingFrame || isGeneratingSpeech || isCloningVoice) && !isFlickerAnimationActive } // Disable generate if any other loading, but enable stop if flicker is active
                className="w-full sm:w-auto"
              >
                {isGeneratingFrame && !isFlickerAnimationActive ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating Frame...</>
                ) : isFlickerAnimationActive ? (
                  <><StopCircle className="mr-2 h-4 w-4" /> {isSpeaking ? 'Stop Speaking & Animating' : 'Stop Animating'}</>
                ) : (
                  <><SparklesIcon className="mr-2 h-4 w-4" />Generate Animated Frame & Play Speech</>
                )}
              </Button>
              { !isFlickerAnimationActive && !isGeneratingFrame && (!selectedImage || !isTextAvailableForAnimatedFrame) && (
                <p className="text-xs text-muted-foreground mt-1">
                  To enable: Ensure an image is uploaded, and audio text has been prepared (either via "Process Input for Speech" or "Generate Speech with Cloned Voice (Mock)").
                </p>
              )}
              
              <div className="mt-6 p-4 border rounded-md bg-muted/30 shadow relative">
                <Label className="text-lg font-semibold text-foreground flex items-center gap-2 mb-2">
                  <SparklesIcon className="h-5 w-5"/>
                  Animated Output:
                </Label>
                <div className="bg-black rounded-md flex items-center justify-center aspect-video overflow-hidden min-h-[200px] relative">
                  {isGeneratingFrame && !isFlickerAnimationActive && !animatedFramePreview ? (
                    <div className="flex flex-col items-center justify-center text-center p-4">
                      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                      <p className="text-lg font-semibold text-white">Generating AI Frame...</p>
                      <p className="text-sm text-gray-300">AI is creating a speaking pose.</p>
                    </div>
                  ) : displaySrc ? (
                     <Image
                        key={displaySrc + (isFlickerAnimationActive ? activeDisplayFrame : '')} 
                        src={displaySrc}
                        alt={activeDisplayFrame === 'animated' ? "AI generated animated frame" : "Uploaded image"}
                        fill
                        style={{ objectFit: 'contain' }}
                        className="rounded-md bg-black"
                        priority={activeDisplayFrame === 'animated'} 
                        data-ai-hint={activeDisplayFrame === 'animated' ? "ai generated speaking" : "original uploaded"}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-4">
                       <HelpCircle className="h-12 w-12 mb-4 text-muted-foreground/50" data-ai-hint="help placeholder" />
                      <p className="text-lg font-semibold">Animated frame will appear here</p>
                      <p className="text-sm">Upload an image, prepare audio text, then click "Generate Animated Frame".</p>
                    </div>
                  )}
                </div>
                {animationError && !isGeneratingFrame && (
                  <div className="mt-2 p-3 border border-destructive/50 rounded-md bg-destructive/10 text-destructive text-sm flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5"/>
                    <p>{animationError}</p>
                  </div>
                )}
                 <p className="text-xs text-muted-foreground mt-2 italic">
                    Note: This feature uses AI to generate an expressive 'speaking' version of your uploaded image. While audio plays (and can continue after), the display will alternate between your original image and this AI-generated image, creating a flicker animation. Click 'Stop Animating' to end the effect. This simulates speaking with expression and is not a continuous video.
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

