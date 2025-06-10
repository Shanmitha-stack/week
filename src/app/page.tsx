
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
import { Text, MicVocal, Loader2, ImagePlus, Volume2, StopCircle, AlertTriangle, Image as ImageIcon, Film } from 'lucide-react';
import { prepareTextForSpeech } from '@/ai/flows/prepare-text-for-speech-flow';
import { generateAnimatedFrame, GenerateAnimatedFrameInput } from '@/ai/flows/generate-animated-frame-flow';


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
  
  const [activeDisplayFrame, setActiveDisplayFrame] = useState<string | null>(null);
  
  const { toast } = useToast();

  const isSpeakingRef = useRef(isSpeaking);
  const isSimulatedClonedVoiceSpeakingRef = useRef(isSimulatedClonedVoiceSpeaking);
  const preparedSpeechTextRef = useRef(preparedSpeechText);
  const textForSimulatedClonedVoiceRef = useRef(textForSimulatedClonedVoice);
  const speakingTextRef = useRef(speakingText);

  const imagePreviewRef = useRef<string | null>(null);
  const animatedFramePreviewRef = useRef<string | null>(null);
  const animationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    imagePreviewRef.current = imagePreview;
    if (!animatedFramePreview) { // If animated frame is cleared, ensure active display reflects original
      setActiveDisplayFrame(imagePreview);
    }
  }, [imagePreview, animatedFramePreview]);

  useEffect(() => {
    animatedFramePreviewRef.current = animatedFramePreview;
  }, [animatedFramePreview]);

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
      console.log('Speech synthesis supported.');

      const logVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        console.log('Available speech synthesis voices:', voices);
        if (voices.length === 0) {
          console.warn('No speech synthesis voices currently available. They might load asynchronously.');
        }
      };

      logVoices(); 
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => {
          console.log('Speech synthesis voices changed.');
          logVoices();
        };
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
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
        animationIntervalRef.current = null;
      }
      setIsSpeaking(false);
      setSpeakingText(null);
      setIsSimulatedClonedVoiceSpeaking(false);
    };
  }, []);
  
  const resetAllOutputsDependentOnTextOrImage = useCallback(() => {
    setPreparedSpeechText(null);
    setTextForSimulatedClonedVoice(null); 
    setAnimatedFramePreview(null);
    setAnimationError(null);
    setActiveDisplayFrame(imagePreviewRef.current); 

    if (animationIntervalRef.current) {
      clearInterval(animationIntervalRef.current);
      animationIntervalRef.current = null;
    }

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
        setAnimatedFramePreview(null); 
        setActiveDisplayFrame(result); 
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
    resetAllOutputsDependentOnTextOrImage();
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
      console.log('[handleTextToSpeech] Cancelling any ongoing browser speech before processing new input.');
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false); 
    setSpeakingText(null);
    setIsSimulatedClonedVoiceSpeaking(false); 

    setIsGeneratingSpeech(true);
    setPreparedSpeechText(null); 
    setTextForSimulatedClonedVoice(null);
    
    setAnimatedFramePreview(null);
    setAnimationError(null);
    setActiveDisplayFrame(imagePreviewRef.current); 
    if (animationIntervalRef.current) {
      clearInterval(animationIntervalRef.current);
      animationIntervalRef.current = null;
    }


    let imageDataUri: string | undefined = undefined;
    if (imagePreview && selectedImage) { 
        imageDataUri = imagePreview;
        console.log('[handleTextToSpeech] Using image from "Text & Image" section for speech context.');
    } else {
      console.log('[handleTextToSpeech] No image provided for context.');
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
                 console.log('[handleTextToSpeech auto-play] Auto-play speak request was cancelled or text changed before execution. Current isSpeakingRef:', isSpeakingRef.current, 'Current speakingTextRef:', speakingTextRef.current, 'Target preparedText:', preparedText);
                 if (isSpeakingRef.current && speakingTextRef.current !== preparedText) {
                    setIsSpeaking(false); 
                    setSpeakingText(null);
                 }
                return;
            }
            console.log('[handleTextToSpeech auto-play] setTimeout: Speaking now with text:', preparedText);
            const utterance = new SpeechSynthesisUtterance(preparedText);
            utterance.onstart = () => {
              console.log('[handleTextToSpeech auto-play] Utterance started.');
              setIsSpeaking(true); 
              setIsSimulatedClonedVoiceSpeaking(false);
              setSpeakingText(preparedText);
            };
            utterance.onend = () => {
              console.log('[handleTextToSpeech auto-play] Utterance ended.');
              setIsSpeaking(false);
              setSpeakingText(null);
            };
            utterance.onerror = (event) => {
              if (event.error === 'interrupted') {
                console.warn("Speech synthesis warning (handleTextToSpeech auto-play interrupted). Code:", event.error, "Event details:", event);
                toast({ title: "Speech Interrupted", description: "Auto-playback was interrupted.", variant: "default" });
              } else {
                console.error("Speech synthesis error (handleTextToSpeech auto-play). Code:", event.error, "Event details:", event);
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

    const textToSpeak = preparedSpeechTextRef.current; 

    if (isSpeakingRef.current && speakingTextRef.current === textToSpeak) {
      console.log('[handleSpeakPreparedText] Attempting to STOP standard TTS because it is currently speaking this text.');
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
      console.log('[handleSpeakPreparedText] Attempting to PLAY standard TTS with text:', textToSpeak);
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        console.log('[handleSpeakPreparedText] Cancelling other/pending browser speech before playing new standard TTS.');
        window.speechSynthesis.cancel();
      }
      
      setIsSpeaking(true); 
      setSpeakingText(textToSpeak); 
      setIsSimulatedClonedVoiceSpeaking(false); 

      setTimeout(() => {
        if (!isSpeakingRef.current || speakingTextRef.current !== textToSpeak) { 
          console.log('[handleSpeakPreparedText] Speak request was cancelled or text changed before execution. Current isSpeakingRef:', isSpeakingRef.current, 'Current speakingTextRef:', speakingTextRef.current, 'Target textToSpeak:', textToSpeak);
           if (isSpeakingRef.current && speakingTextRef.current !== textToSpeak) { 
              setIsSpeaking(false); 
              setSpeakingText(null);
           }
          return;
        }
        console.log('[handleSpeakPreparedText] setTimeout: Speaking now with text:', textToSpeak!);
        const utterance = new SpeechSynthesisUtterance(textToSpeak!);
        utterance.onstart = () => {
          console.log('[handleSpeakPreparedText] Utterance started.');
          setIsSpeaking(true); 
          setIsSimulatedClonedVoiceSpeaking(false);
          setSpeakingText(textToSpeak);
        };
        utterance.onend = () => {
          console.log('[handleSpeakPreparedText] Utterance ended.');
          setIsSpeaking(false);
          setSpeakingText(null);
        };
        utterance.onerror = (event) => {
          if (event.error === 'interrupted') {
            console.warn("Speech synthesis warning (from Speak button interrupted). Code:", event.error, "Event details:", event);
            toast({ title: "Speech Interrupted", description: "Playback was interrupted.", variant: "default" });
          } else {
            console.error("Speech synthesis error (from Speak button). Code:", event.error, "Event details:", event);
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
    setAnimatedFramePreview(null);
    setAnimationError(null);
    setActiveDisplayFrame(imagePreviewRef.current); 
     if (animationIntervalRef.current) {
      clearInterval(animationIntervalRef.current);
      animationIntervalRef.current = null;
    }

    if (typeof window !== 'undefined' && window.speechSynthesis && (isSpeakingRef.current || isSimulatedClonedVoiceSpeakingRef.current)) {
        window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setSpeakingText(null);
    setIsSimulatedClonedVoiceSpeaking(false);
  };

 const isPreparedTextAvailableAndUsable = () => {
    const currentPreparedText = preparedSpeechText; 
    return currentPreparedText &&
           currentPreparedText.trim() !== "" &&
           !currentPreparedText.toLowerCase().startsWith("no text was provided") &&
           !currentPreparedText.toLowerCase().startsWith("error:");
  };

 const handleCloneVoiceAndSynthesize = async () => {
    setIsCloningVoice(true); 
    toast({ title: "Mock Voice Cloning", description: "Initializing voice cloning process..." });

    console.log('[handleCloneVoiceAndSynthesize] Initiated.');
    console.log('[handleCloneVoiceAndSynthesize] Selected voice sample:', selectedVoiceSample?.name);
    
    const currentPreparedTextIsUsableAtStart = isPreparedTextAvailableAndUsable();
    console.log('[handleCloneVoiceAndSynthesize] Is prepared text usable at start (using direct state):', currentPreparedTextIsUsableAtStart);
    const currentPreparedSpeechTextValue = preparedSpeechText; 
    console.log('[handleCloneVoiceAndSynthesize] Current preparedSpeechText at start (from direct state):', currentPreparedSpeechTextValue);


    if (!selectedVoiceSample) {
      toast({ title: "Voice Sample Required", description: "Please select a voice sample.", variant: "destructive" });
      console.warn('[handleCloneVoiceAndSynthesize] Aborted: No voice sample selected.');
      setIsCloningVoice(false);
      return;
    }
    if (!currentPreparedTextIsUsableAtStart || !currentPreparedSpeechTextValue) { 
      toast({ title: "Prepared Speech Text Required", description: "Please process some text for speech first. Voice cloning needs text to synthesize.", variant: "destructive" });
      console.warn('[handleCloneVoiceAndSynthesize] Aborted: Prepared text is not usable or null. Value was:', currentPreparedSpeechTextValue);
      setIsCloningVoice(false);
      return;
    }
    
    if (typeof window !== 'undefined' && window.speechSynthesis && (window.speechSynthesis.speaking || window.speechSynthesis.pending)) {
        console.log('[handleCloneVoiceAndSynthesize] Cancelling ongoing speech before starting mock cloning.');
        window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setSpeakingText(null);
    setIsSimulatedClonedVoiceSpeaking(false);
    
    setTextForSimulatedClonedVoice(null); 
    setAnimatedFramePreview(null); 
    setAnimationError(null);
    setActiveDisplayFrame(imagePreviewRef.current); 
    if (animationIntervalRef.current) {
      clearInterval(animationIntervalRef.current);
      animationIntervalRef.current = null;
    }
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000)); 
      toast({ title: "Mock Voice Cloning", description: "Processing voice sample..." });
      
      await new Promise(resolve => setTimeout(resolve, 1500)); 
      toast({ title: "Mock Voice Cloning", description: "Synthesizing speech with cloned voice..." });
      
      await new Promise(resolve => setTimeout(resolve, 2000)); 

      const stillUsablePreparedText = preparedSpeechText;
      if (stillUsablePreparedText && 
          stillUsablePreparedText.trim() !== "" &&
          !stillUsablePreparedText.toLowerCase().startsWith("no text was provided") &&
          !stillUsablePreparedText.toLowerCase().startsWith("error:")
      ) {
        setTextForSimulatedClonedVoice(stillUsablePreparedText); 
        console.log('[handleCloneVoiceAndSynthesize] Successfully set textForSimulatedClonedVoice to:', stillUsablePreparedText);
        toast({ title: "Mock Voice Cloning Complete", description: `Speech based on "${stillUsablePreparedText.substring(0,50)}..." using voice sample "${selectedVoiceSample.name}" is (mock) ready for simulated playback.` });
      } else {
        setTextForSimulatedClonedVoice(null);
        console.error('[handleCloneVoiceAndSynthesize] Error: preparedSpeechText became unusable or null during mock cloning simulation. Current value from direct state was:', stillUsablePreparedText);
        toast({ title: "Cloning Error", description: "Prepared text became unavailable or invalid during mock cloning. Please try preparing text again.", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error during mock voice cloning simulation:", error);
      toast({ title: "Cloning Error", description: "An unexpected error occurred during mock voice cloning.", variant: "destructive" });
      setTextForSimulatedClonedVoice(null);
    } finally {
      setIsCloningVoice(false);
      console.log('[handleCloneVoiceAndSynthesize] Completed. isCloningVoice set to false.');
    }
  };

  const handlePlaySimulatedClonedVoice = useCallback(() => {
    console.log('[handlePlaySimulatedClonedVoice] triggered.');
    const currentTextForSimulated = textForSimulatedClonedVoiceRef.current; 
    console.log('[handlePlaySimulatedClonedVoice] isSpeechSupported:', isSpeechSupported);
    console.log('[handlePlaySimulatedClonedVoice] textForSimulatedClonedVoice (from ref):', currentTextForSimulated);
    console.log('[handlePlaySimulatedClonedVoice] isSimulatedClonedVoiceSpeaking (current state from ref):', isSimulatedClonedVoiceSpeakingRef.current);
    console.log('[handlePlaySimulatedClonedVoice] isSpeaking (other TTS, current state from ref):', isSpeakingRef.current);

    if (!isSpeechSupported) {
        toast({ title: "Speech Not Supported", description: "Your browser does not support speech synthesis.", variant: "destructive" });
        return;
    }
    if (!currentTextForSimulated) {
        toast({ title: "Nothing to Play", description: "No text was prepared for simulated cloned voice playback.", variant: "destructive" });
        return;
    }

    if (isSimulatedClonedVoiceSpeakingRef.current) {
        console.log('[handlePlaySimulatedClonedVoice] Attempting to STOP simulated cloned voice because it is currently speaking.');
        window.speechSynthesis.cancel();
        setIsSimulatedClonedVoiceSpeaking(false);
        setIsSpeaking(false); 
        setSpeakingText(null);
        return;
    }

    console.log('[handlePlaySimulatedClonedVoice] Attempting to PLAY simulated cloned voice with text:', currentTextForSimulated);
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        console.log('[handlePlaySimulatedClonedVoice] Cancelling other/pending browser speech before playing new simulated cloned voice.');
        window.speechSynthesis.cancel();
    }
    
    setIsSimulatedClonedVoiceSpeaking(true); 
    setIsSpeaking(false); 
    setSpeakingText(null); 

    setTimeout(() => {
        if (!isSimulatedClonedVoiceSpeakingRef.current) { 
            console.log('[handlePlaySimulatedClonedVoice] setTimeout: Play request for simulated cloned voice was cancelled before execution. Current isSimulatedClonedVoiceSpeakingRef:', isSimulatedClonedVoiceSpeakingRef.current);
             if (isSimulatedClonedVoiceSpeakingRef.current) { 
                 setIsSimulatedClonedVoiceSpeaking(false);
            }
            return;
        }
        if (textForSimulatedClonedVoiceRef.current !== currentTextForSimulated) {
            console.warn('[handlePlaySimulatedClonedVoice] setTimeout: Text for simulated voice changed before execution. Aborting. Expected:', currentTextForSimulated, 'Got:', textForSimulatedClonedVoiceRef.current);
            setIsSimulatedClonedVoiceSpeaking(false);
            return;
        }

        console.log('[handlePlaySimulatedClonedVoice] setTimeout: Speaking now with text:', currentTextForSimulated);
        const utterance = new SpeechSynthesisUtterance(currentTextForSimulated);
        utterance.onstart = () => {
            console.log('[handlePlaySimulatedClonedVoice] Utterance started.');
            setIsSimulatedClonedVoiceSpeaking(true); 
            setIsSpeaking(false);
            setSpeakingText(null); 
        };
        utterance.onend = () => {
            console.log('[handlePlaySimulatedClonedVoice] Utterance ended.');
            setIsSimulatedClonedVoiceSpeaking(false);
        };
        utterance.onerror = (event) => {
            if (event.error === 'interrupted') {
                console.warn("[handlePlaySimulatedClonedVoice] Speech synthesis warning (Simulated Cloned interrupted). Code:", event.error, "Event details:", event);
                toast({ title: "Speech Interrupted", description: "Simulated cloned voice playback was interrupted.", variant: "default" });
            } else {
                console.error("[handlePlaySimulatedClonedVoice] Speech synthesis error (Simulated Cloned). Code:", event.error, "Event details:", event);
                toast({ title: "Speech Error", description: `Could not play simulated cloned voice. (Error: ${event.error || 'unknown'})`, variant: "destructive" });
            }
            setIsSimulatedClonedVoiceSpeaking(false);
        };
        window.speechSynthesis.speak(utterance);
    }, 100); 

  }, [isSpeechSupported, toast]);

  const anyLoading = isGeneratingSpeech || isCloningVoice || isGeneratingFrame;
  
  const isUsablePreparedTextAvailable = () => 
    preparedSpeechText && 
    preparedSpeechText.trim() !== "" && 
    !preparedSpeechText.toLowerCase().startsWith("no text was provided") && 
    !preparedSpeechText.toLowerCase().startsWith("error:");

  const isUsableClonedTextAvailable = () =>
    textForSimulatedClonedVoice && textForSimulatedClonedVoice.trim() !== "";

  const isTextAvailableForAnimation = isUsablePreparedTextAvailable() || isUsableClonedTextAvailable();


  const handleGenerateAnimatedFrameAndSpeak = async () => {
    console.log('[handleGenerateAnimatedFrameAndSpeak] START.');
    setAnimationError(null); 

    let textToSpeakForAnimation: string | null = null;
    if (isUsableClonedTextAvailable() && textForSimulatedClonedVoice) {
      textToSpeakForAnimation = textForSimulatedClonedVoice;
      console.log(`[handleGenerateAnimatedFrameAndSpeak] Using "simulated cloned audio" text for animation: "${textToSpeakForAnimation.substring(0,30)}..."`);
    } else if (isUsablePreparedTextAvailable() && preparedSpeechText) {
      textToSpeakForAnimation = preparedSpeechText;
      console.log(`[handleGenerateAnimatedFrameAndSpeak] Using "prepared speech text" for animation: "${textToSpeakForAnimation.substring(0,30)}..."`);
    }

    if (isSpeakingRef.current && speakingTextRef.current === textToSpeakForAnimation && animatedFramePreviewRef.current) {
        console.log('[handleGenerateAnimatedFrameAndSpeak] Action: STOP speaking for animated frame.');
        window.speechSynthesis.cancel(); 
        setIsSpeaking(false);
        setSpeakingText(null);
        setIsSimulatedClonedVoiceSpeaking(false);
        if (animationIntervalRef.current) { // Stop animation if already running
            clearInterval(animationIntervalRef.current);
            animationIntervalRef.current = null;
        }
        setActiveDisplayFrame(animatedFramePreviewRef.current || imagePreviewRef.current); // Settle on current/original frame
        return; 
    }
    
    if (!imagePreviewRef.current || !selectedImage) { 
      toast({ title: "Image Required for Animation", description: "Please upload an image in the 'Text & Image to Speech Preparation' section.", variant: "destructive" });
      console.log('[handleGenerateAnimatedFrameAndSpeak] Aborted: No image selected.');
      return;
    }
    if (!textToSpeakForAnimation) {
       toast({ title: "Audio Text Required for Animation", description: "Please use 'Process Input for Speech' or 'Generate Speech with Cloned Voice (Mock)' first to prepare text.", variant: "destructive" });
       console.log('[handleGenerateAnimatedFrameAndSpeak] Aborted: No audio source text available.');
      return;
    }
    
    if (typeof window !== 'undefined' && window.speechSynthesis && (window.speechSynthesis.speaking || window.speechSynthesis.pending)) {
        console.log('[handleGenerateAnimatedFrameAndSpeak] Cancelling ongoing browser speech before animation generation attempt.');
        window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setSpeakingText(null);
    setIsSimulatedClonedVoiceSpeaking(false);

    setIsGeneratingFrame(true);
    setAnimatedFramePreview(null); 
    setActiveDisplayFrame(imagePreviewRef.current); 
    console.log('[handleGenerateAnimatedFrameAndSpeak] Cleared animatedFramePreview, isGeneratingFrame is true.');
    if (animationIntervalRef.current) { // Clear any existing animation interval
        clearInterval(animationIntervalRef.current);
        animationIntervalRef.current = null;
    }

    try {
      toast({ title: "Starting AI Frame Generation", description: "Generating animated frame with AI..." });
      
      const animationPrompt = `Generate a frame of this person as if they are naturally speaking the words: "${textToSpeakForAnimation.substring(0, 70)}${textToSpeakForAnimation.length > 70 ? "..." : ""}". The image should capture a natural and engaging speaking expression, conveying appropriate emotion for the text. Ensure the facial expression and mouth shape are consistent with someone actively speaking these words, as if it's a still frame from a video. Maintain the original person's likeness and the image style.`;
      
      const input: GenerateAnimatedFrameInput = {
        originalImageDataUri: imagePreviewRef.current, 
        animationPrompt: animationPrompt,
      };

      console.log('[handleGenerateAnimatedFrameAndSpeak] Calling generateAnimatedFrame Genkit flow with prompt:', animationPrompt);
      const result = await generateAnimatedFrame(input);

      if (result.generatedFrameDataUri) {
        setAnimatedFramePreview(result.generatedFrameDataUri); 
        // setActiveDisplayFrame(result.generatedFrameDataUri); // Display generated frame immediately before speech starts
        toast({ title: "AI Frame Generation Successful", description: "Animated frame generated. Preparing to speak..." });

        if (isSpeechSupported) {
          setIsSimulatedClonedVoiceSpeaking(false); 
          setIsSpeaking(true); 
          setSpeakingText(textToSpeakForAnimation); 

          setTimeout(() => {
            if (!isSpeakingRef.current || speakingTextRef.current !== textToSpeakForAnimation) {
              console.log('[AnimatedFrame Speak] Speak request cancelled or text changed. Current isSpeakingRef:', isSpeakingRef.current, 'speakingTextRef:', speakingTextRef.current);
              if (isSpeakingRef.current && animatedFramePreviewRef.current) { 
                setIsSpeaking(false); 
                setSpeakingText(null); 
              }
              return;
            }
            console.log('[AnimatedFrame Speak] setTimeout: Speaking now with text:', textToSpeakForAnimation!);
            const utterance = new SpeechSynthesisUtterance(textToSpeakForAnimation!);
            
            utterance.onstart = () => { 
              console.log('[AnimatedFrame Speak] Utterance started. Beginning animation.'); 
              setIsSpeaking(true); 
              setSpeakingText(textToSpeakForAnimation);
              setIsSimulatedClonedVoiceSpeaking(false);

              if (imagePreviewRef.current && animatedFramePreviewRef.current) {
                const originalImg = imagePreviewRef.current;
                const speakingImg = animatedFramePreviewRef.current;
                
                setActiveDisplayFrame(originalImg); // Start flicker by showing original image first
                
                if (animationIntervalRef.current) clearInterval(animationIntervalRef.current);
                animationIntervalRef.current = setInterval(() => {
                  if (!imagePreviewRef.current || !animatedFramePreviewRef.current) { // Check if refs are still valid
                    if (animationIntervalRef.current) clearInterval(animationIntervalRef.current);
                    animationIntervalRef.current = null;
                    setActiveDisplayFrame(animatedFramePreviewRef.current || imagePreviewRef.current); // Settle on whichever is available
                    return;
                  }
                  setActiveDisplayFrame(currentFrame => currentFrame === originalImg ? speakingImg : originalImg);
                }, 300); 
                console.log('[AnimatedFrame Speak] Animation interval started.');
              } else {
                console.warn('[AnimatedFrame Speak] Cannot start animation: original or speaking frame missing.');
                setActiveDisplayFrame(animatedFramePreviewRef.current || imagePreviewRef.current);
              }
            };
            utterance.onend = () => { 
              console.log('[AnimatedFrame Speak] Utterance ended. Stopping animation.'); 
              setIsSpeaking(false); 
              setSpeakingText(null); 
              if (animationIntervalRef.current) {
                clearInterval(animationIntervalRef.current);
                animationIntervalRef.current = null;
                console.log('[AnimatedFrame Speak] Animation interval cleared on end.');
              }
              setActiveDisplayFrame(animatedFramePreviewRef.current || imagePreviewRef.current); // Settle on generated (if available) or original
            };
            utterance.onerror = (event) => {
              if (event.error === 'interrupted') {
                console.warn("Speech synthesis warning (AnimatedFrame Speak interrupted). Code:", event.error, "Event details:", event);
                toast({ title: "Speech Interrupted", description: "Animated frame playback was interrupted.", variant: "default" });
              } else {
                console.error("Speech synthesis error (AnimatedFrame Speak). Code:", event.error, "Event details:", event);
                toast({ title: "Speech Error", description: `Could not play speech for animated frame. (Error: ${event.error || 'unknown'})`, variant: "destructive" });
              }
              setIsSpeaking(false); 
              setSpeakingText(null);
              if (animationIntervalRef.current) {
                clearInterval(animationIntervalRef.current);
                animationIntervalRef.current = null;
                 console.log('[AnimatedFrame Speak] Animation interval cleared on error.');
              }
              setActiveDisplayFrame(animatedFramePreviewRef.current || imagePreviewRef.current); // Settle on generated (if available) or original
            };
            window.speechSynthesis.speak(utterance);
          }, 100);
        } else {
          toast({ title: "Frame Generated", description: "Browser speech synthesis not supported for playback.", variant: "default" });
          setActiveDisplayFrame(animatedFramePreviewRef.current || imagePreviewRef.current); // Show generated frame if no speech
        }

      } else {
        const errMsg = result.errorMessage || "AI frame generation failed to return an image.";
        console.error('[handleGenerateAnimatedFrameAndSpeak]', errMsg, result);
        setAnimationError(errMsg);
        setActiveDisplayFrame(imagePreviewRef.current); 
        toast({ title: "AI Frame Generation Failed", description: errMsg, variant: "destructive" });
      }

    } catch (error: any) {
      console.error("[handleGenerateAnimatedFrameAndSpeak] CRITICAL ERROR in try block:", error);
      const message = error.message || "An unexpected error occurred during AI frame generation.";
      setAnimationError(message);
      setActiveDisplayFrame(imagePreviewRef.current); 
      toast({ title: "Animation Error", description: message, variant: "destructive" });
    } finally {
      console.log('[handleGenerateAnimatedFrameAndSpeak] In finally block. Setting isGeneratingFrame to false.');
      setIsGeneratingFrame(false);
    }
  };

  const currentPreparedTextIsSpeaking = isSpeaking && speakingText === preparedSpeechText && preparedSpeechText !== null;
  const currentSimulatedClonedVoiceIsSpeaking = isSimulatedClonedVoiceSpeaking && !!textForSimulatedClonedVoice;
  
  const getSpeakingTextForCurrentAnimatedFrame = (): string | null => {
    // Check if we are currently speaking and an animated frame is present
    if (isSpeaking && speakingText && animatedFramePreviewRef.current) { 
        const sourceTextForAnimation = 
            (isUsableClonedTextAvailable() && textForSimulatedClonedVoiceRef.current) ||
            (isUsablePreparedTextAvailable() && preparedSpeechTextRef.current);
        
        // If the currently speaking text matches the text used for the animation frame
        if (speakingText === sourceTextForAnimation) {
            return speakingText;
        }
    }
    return null;
  };
  const speakingTextForCurrentAnimatedFrame = getSpeakingTextForCurrentAnimatedFrame();
  const currentAnimatedFrameTextIsSpeaking = !!speakingTextForCurrentAnimatedFrame;


  console.log('[Home render] States for UI:', {
    isGeneratingFrame,
    animatedFramePreview_available: !!animatedFramePreview,
    animationError,
    isGeneratingSpeech,
    isCloningVoice,
    preparedSpeechText_value: preparedSpeechText ? preparedSpeechText.substring(0,30) + "..." : null,
    textForSimulatedClonedVoice_value: textForSimulatedClonedVoice ? textForSimulatedClonedVoice.substring(0,30) + "..." : null,
    isSpeaking,
    speakingText_value: speakingText ? speakingText.substring(0,30) + "..." : null,
    currentAnimatedFrameTextIsSpeaking,
    isTextAvailableForAnimation,
    activeDisplayFrame_available: !!activeDisplayFrame,
  });

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
                    resetAllOutputsDependentOnTextOrImage();
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
                        disabled={anyLoading || isSimulatedClonedVoiceSpeaking || currentAnimatedFrameTextIsSpeaking }
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
                    disabled={anyLoading || (isSpeaking && !isSimulatedClonedVoiceSpeakingRef.current) || currentAnimatedFrameTextIsSpeaking}
                   >
                     {currentSimulatedClonedVoiceSpeaking ? <><StopCircle className="mr-2 h-4 w-4" />Stop Simulated Voice</> : <><Volume2 className="mr-2 h-4 w-4" />Play Simulated Cloned Voice</>}
                   </Button>
                   <p className="text-sm text-muted-foreground">
                     This simulates the cloned voice using your browser's standard text-to-speech with the prepared text that was active during 'cloning'.
                  </p>
                </div>
              )}
            </div>
          </SectionCard>


          <SectionCard title="AI Animated Frame & Speech (Mock)" icon={<Film className="text-primary" />} >
            <div className="space-y-4">
              <div>
                <Label htmlFor="animation-image-source" className="text-base">Image Source for Animation:</Label>
                 {imagePreview ? (
                    <div className="mt-2 border rounded-md p-2 inline-block bg-muted/30">
                      <p className="text-sm text-muted-foreground mb-1">
                        Using image uploaded in the "Text &amp; Image to Speech Preparation" section:
                      </p>
                      <Image
                        src={imagePreview}
                        alt="Image for animation (from first section)"
                        width={200}
                        height={200}
                        className="rounded-md object-contain max-h-48 w-auto"
                        data-ai-hint="face portrait"
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1" id="animation-image-source">
                      Please upload an image in the "Text &amp; Image to Speech Preparation" section. That image will be used for animation.
                    </p>
                  )}
              </div>

              <Button
                onClick={handleGenerateAnimatedFrameAndSpeak}
                disabled={anyLoading || !selectedImage || !isTextAvailableForAnimation || (isSpeaking && !currentAnimatedFrameTextIsSpeaking && !isSimulatedClonedVoiceSpeaking) }
                className="w-full sm:w-auto"
              >
                {isGeneratingFrame ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating AI Frame...
                  </>
                ) : currentAnimatedFrameTextIsSpeaking ? (
                   <> <StopCircle className="mr-2 h-4 w-4" /> Stop Speaking </>
                ) : (
                  "Generate Animated Frame & Play Speech"
                )}
              </Button>
              { !anyLoading && (!selectedImage || !isTextAvailableForAnimation) && (
                <p className="text-xs text-muted-foreground mt-1">
                  To enable animation: Ensure an image is uploaded in the first section, and that audio text has been prepared (either via "Process Input for Speech" or "Generate Speech with Cloned Voice (Mock)").
                </p>
              )}
              
              <div className="mt-6 p-4 border rounded-md bg-muted/30 shadow relative">
                <Label className="text-lg font-semibold text-foreground flex items-center gap-2 mb-2">
                  <ImageIcon className="h-5 w-5"/>
                  AI Animated Frame Output:
                </Label>
                <div className="bg-black rounded-md flex items-center justify-center aspect-video overflow-hidden min-h-[200px] relative">
                  {isGeneratingFrame && !activeDisplayFrame ? ( // Show loader only if no frame is yet active (e.g. initial load)
                    <div className="flex flex-col items-center justify-center text-center p-4">
                      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                      <p className="text-lg font-semibold text-white">Generating AI Frame...</p>
                      <p className="text-sm text-gray-300">Please wait, AI is processing the image.</p>
                    </div>
                  ) : activeDisplayFrame ? (
                    <Image
                      key={activeDisplayFrame} 
                      src={activeDisplayFrame}
                      alt={activeDisplayFrame === imagePreviewRef.current ? "Uploaded image" : "AI Generated animated frame"}
                      fill
                      style={{ objectFit: 'contain' }}
                      className="rounded-md"
                      data-ai-hint={activeDisplayFrame === imagePreviewRef.current ? "uploaded image" : "animated portrait"}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-4">
                      <ImageIcon className="h-12 w-12 mb-4" data-ai-hint="image placeholder" />
                      <p className="text-lg font-semibold">AI Animated Frame will appear here</p>
                      <p className="text-sm">Upload an image, prepare audio text, then click "Generate Animated Frame & Play Speech".</p>
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
                    Note: This feature uses AI to generate a "speaking" version of your uploaded image. While audio plays, the display will alternate between your original image and this AI-generated image, creating a flicker animation effect. It does not produce a continuous video.
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

