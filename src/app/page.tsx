
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
import { Text, MicVocal, Loader2, ImagePlus, Volume2, StopCircle, AlertTriangle, Sparkles, Video, Film, UploadCloud, MessageSquareQuote } from 'lucide-react';
import { prepareTextForSpeech } from '@/ai/flows/prepare-text-for-speech-flow';
import { generateAnimatedFrame, type GenerateAnimatedFrameOutput } from '@/ai/flows/generate-animated-frame-flow';

import { storage, auth, functions as firebaseFunctions } from '@/lib/firebase'; // Firebase Storage, Auth, and Functions
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { httpsCallable, connectFunctionsEmulator as fbConnectFunctionsEmulator, type HttpsError } from 'firebase/functions';
import { signInAnonymously, type User } from 'firebase/auth';


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


  // States for Firebase Lip-Sync Video section (Callable Function)
  const [isGeneratingFirebaseVideo, setIsGeneratingFirebaseVideo] = useState<boolean>(false);
  const [firebaseVideoUrl, setFirebaseVideoUrl] = useState<string | null>(null);
  const [firebaseVideoError, setFirebaseVideoError] = useState<string | null>(null);

  // States for "True Lip-Sync Video Generation (Placeholder)" section
  const [isGeneratingTrueLipSyncVideo, setIsGeneratingTrueLipSyncVideo] = useState<boolean>(false);
  const [trueLipSyncVideoUrl, setTrueLipSyncVideoUrl] = useState<string | null>(null);
  const [trueLipSyncVideoError, setTrueLipSyncVideoError] = useState<string | null>(null);

  // States for Firebase Storage Upload section
  const [storageImageFile, setStorageImageFile] = useState<File | null>(null);
  const [storageAudioFile, setStorageAudioFile] = useState<File | null>(null);
  const [isUploadingToStorage, setIsUploadingToStorage] = useState<boolean>(false);
  const [uploadStatusMessage, setUploadStatusMessage] = useState<string | null>(null);
  const [uploadedFileUrls, setUploadedFileUrls] = useState<{ image?: string; audio?: string } | null>(null);
  
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
  const isGeneratingAnimatedOutputRef = useRef(isGeneratingAnimatedOutput);


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
      setFirebaseVideoUrl(null);
      setFirebaseVideoError(null);
      setTrueLipSyncVideoUrl(null);
      setTrueLipSyncVideoError(null);
    } else {
      if (!isAnimatedOutputAnimatingRef.current && !isGeneratingAnimatedOutputRef.current) {
        setDisplayedFrameInAnimatedOutput(imagePreview);
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
  useEffect(() => { isGeneratingAnimatedOutputRef.current = isGeneratingAnimatedOutput; }, [isGeneratingAnimatedOutput]);


  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis) {
      setIsSpeechSupported(true);
    } else {
      setIsSpeechSupported(false);
    }
    
    const functionsEmulatorUrl = process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_URL;
    if (functionsEmulatorUrl && firebaseFunctions) {
      try {
        const urlString = functionsEmulatorUrl.startsWith('http://') || functionsEmulatorUrl.startsWith('https://')
          ? functionsEmulatorUrl
          : `http://${functionsEmulatorUrl}`; 
        const url = new URL(urlString);
        const host = url.hostname;
        const port = parseInt(url.port, 10);

        if (!host || isNaN(port) || port <= 0) {
          throw new Error('Invalid host or port derived from emulator URL.');
        }
        
        console.log(`Attempting to connect Firebase Functions emulator to host: ${host}, port: ${port}`);
        fbConnectFunctionsEmulator(firebaseFunctions, host, port);
        toast({ title: "Emulator Connected", description: `Firebase Functions emulator connected to ${host}:${port}`, duration: 3000 });
      } catch (e: any) {
        console.error("Error parsing or connecting to Firebase Functions emulator URL:", functionsEmulatorUrl, e);
        toast({ 
          title: "Emulator Config Error", 
          description: `Could not connect to Firebase Functions emulator. Check URL format: '${functionsEmulatorUrl}'. Error: ${e.message}`, 
          variant: "destructive", 
          duration: 8000 
        });
      }
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  

  const resetOutputsDependentOnTextOrImage = useCallback(() => {
    setPreparedSpeechText(null);
    setTextForSimulatedClonedVoice(null); 
    
    setAnimatedOutputAiFrame(null);
    setAnimatedOutputError(null);
    if (!isAnimatedOutputAnimatingRef.current && !isGeneratingAnimatedOutputRef.current) {
      setDisplayedFrameInAnimatedOutput(imagePreviewRef.current); 
    }

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

    setFirebaseVideoUrl(null);
    setFirebaseVideoError(null);
    setTrueLipSyncVideoUrl(null);
    setTrueLipSyncVideoError(null);
  }, []);


  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImagePreview(result);
        if (!isAnimatedOutputAnimatingRef.current && !isGeneratingAnimatedOutputRef.current) {
          setDisplayedFrameInAnimatedOutput(result); 
        }
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
    
    if (isAnimatedOutputSpeakingRef.current || isAnimatedOutputAnimatingRef.current) {
      handleStopAnimatedOutput();
    }
    
    setIsGeneratingSpeech(true);
    setPreparedSpeechText(null); 
    setTextForSimulatedClonedVoice(null); 
    setFirebaseVideoUrl(null);
    setFirebaseVideoError(null);
    setTrueLipSyncVideoUrl(null);
    setTrueLipSyncVideoError(null);


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
    } catch (error: any) {
      let userMessage = "An AI processing error occurred while preparing your input. This might be due to the AI model having trouble with the provided image (if any) or text. You could try again with a different image, modify the text, or try without an image. If the problem persists, the AI service could be temporarily unavailable.";
      let detailedErrorMessage = (error as Error).message;
      if (detailedErrorMessage?.includes("AI model processed the request but did not return an image") || detailedErrorMessage?.includes("did not return a media URL") || detailedErrorMessage?.toLowerCase().includes("invalid image data")) {
          userMessage = "The AI model had an issue, possibly with the image. Please try a different image, a smaller image, a different format (e.g. JPG/PNG), or try preparing text without an image.";
      } else if (detailedErrorMessage?.includes("Deadline Exceeded") || detailedErrorMessage?.includes("upstream timeout")) {
          userMessage = "The AI request timed out. This might be a temporary issue. Please try again in a moment.";
      }
      setPreparedSpeechText("Error: Could not process input for speech. " + detailedErrorMessage);
      console.error("Processing Error in 'handleTextToSpeech' (calling prepareTextForSpeech flow):", error);
      toast({
        title: "AI Processing Error",
        description: userMessage,
        variant: "destructive",
        duration: 12000 
      });
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
      if (isAnimatedOutputSpeakingRef.current) {
        handleStopAnimatedOutput();
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
    setFirebaseVideoUrl(null);
    setFirebaseVideoError(null);
    setTrueLipSyncVideoUrl(null);
    setTrueLipSyncVideoError(null);

    if (typeof window !== 'undefined' && window.speechSynthesis && (isSpeakingRef.current || isSimulatedClonedVoiceSpeakingRef.current || isAnimatedOutputSpeakingRef.current)) {
        window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setSpeakingText(null);
    setIsSimulatedClonedVoiceSpeaking(false);
    if (isAnimatedOutputSpeakingRef.current || isAnimatedOutputAnimatingRef.current) {
        handleStopAnimatedOutput();
    }
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
    if (isAnimatedOutputSpeakingRef.current || isAnimatedOutputAnimatingRef.current) {
      handleStopAnimatedOutput();
    }
    
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
    if (isAnimatedOutputSpeakingRef.current || isAnimatedOutputAnimatingRef.current) {
        handleStopAnimatedOutput();
    }
    
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
    if (preparedSpeechTextRef.current &&
        preparedSpeechTextRef.current.trim() !== "" &&
        !preparedSpeechTextRef.current.toLowerCase().startsWith("no text was provided") &&
        !preparedSpeechTextRef.current.toLowerCase().startsWith("error:")) {
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
    setDisplayedFrameInAnimatedOutput(animatedOutputAiFrameRef.current || imagePreviewRef.current); 
  }, []);

  const startAnimatedOutputFlicker = useCallback(() => {
    if (!imagePreviewRef.current || !animatedOutputAiFrameRef.current) {
      stopAnimatedOutputFlicker(); 
      return;
    }
    stopAnimatedOutputFlicker(); 
    setIsAnimatedOutputAnimating(true);
    setDisplayedFrameInAnimatedOutput(animatedOutputAiFrameRef.current);
    animatedOutputFlickerIntervalRef.current = setInterval(() => {
      setDisplayedFrameInAnimatedOutput(prev => 
        prev === imagePreviewRef.current ? animatedOutputAiFrameRef.current : imagePreviewRef.current
      );
    }, 250); 
  }, [stopAnimatedOutputFlicker]);


  const handleGenerateAnimatedOutputAndSpeak = async () => {
    const textToSpeak = getTextForAnimatedOutput();
  
    if (!selectedImage || !imagePreviewRef.current) {
      toast({ title: "Image Required", description: "Please upload an image in the 'Text & Image to Speech Preparation' section.", variant: "destructive" });
      return;
    }
    if (!textToSpeak) {
      toast({ title: "Audio Text Required", description: "Please use 'Process Input for Speech' first to generate text for the animation.", variant: "destructive" });
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
    setIsSpeaking(false); 
    setSpeakingText(null);
    setIsSimulatedClonedVoiceSpeaking(false); 
    setIsAnimatedOutputSpeaking(false);
    stopAnimatedOutputFlicker();
    setDisplayedFrameInAnimatedOutput(imagePreviewRef.current); 

    toast({ title: "Generating Output...", description: "AI is creating an expressive frame and preparing speech..." });
  
    let aiFrameResult: GenerateAnimatedFrameOutput | null = null;

    try {
      try {
        const textSnippet = textToSpeak.substring(0, 150); 
        const animationPrompt = `Your primary task is to transform the provided static photo into a single, highly expressive keyframe image. This new image must depict the person as if they are frozen mid-sentence, actively speaking the initial words of this text: "${textSnippet}". CRITICALLY, the generated image needs to show *clear visual changes* from the original photo, especially in the mouth shape (viseme) to precisely match the first phonemes of the text, and in the eye expression to convey engagement in speech. The overall facial expression should be dynamic and appropriate for the act of speaking these initial words. The output MUST be the generated image.`;
        
        aiFrameResult = await generateAnimatedFrame({
          originalImageDataUri: imagePreviewRef.current,
          animationPrompt: animationPrompt,
        });
    
        if (aiFrameResult.generatedFrameDataUri) {
          setAnimatedOutputAiFrame(aiFrameResult.generatedFrameDataUri);
        } else {
            let userFriendlyAiMessage = "The AI couldn't create an image for this request. This can happen sometimes. You could try again, perhaps with different text or a slightly different image.";
            if (aiFrameResult.errorMessage) {
              if (aiFrameResult.errorMessage.includes("AI model processed the request but did not return an image")) {
                 userFriendlyAiMessage = "The AI model processed the request but did not return an image. You can try again.";
              } else if (aiFrameResult.errorMessage.includes("AI API call failed")) {
                 userFriendlyAiMessage = `AI Image Generation Failed: ${aiFrameResult.errorMessage}. You can try again.`;
              } else {
                 userFriendlyAiMessage = aiFrameResult.errorMessage;
              }
            }
            console.warn('[GenerateAnimatedOutput] AI Frame Gen Issue:', aiFrameResult.errorMessage || 'AI model did not return an image.', 'Type:', aiFrameResult.errorType);
            setAnimatedOutputError(userFriendlyAiMessage);
            toast({ title: "AI Image Not Generated", description: userFriendlyAiMessage, variant: aiFrameResult.errorType === 'AI_API_ERROR' ? "destructive" : "default", duration: 7000 });
            setDisplayedFrameInAnimatedOutput(imagePreviewRef.current); 
        }
      } catch (frameError: any) {
        console.error('[GenerateAnimatedOutput] Error during AI frame generation call:', frameError);
        const message = frameError.message || "Failed to generate AI expressive frame.";
        setAnimatedOutputError(message);
        toast({ title: "AI Frame Error", description: message, variant: "destructive" });
        setIsGeneratingAnimatedOutput(false);
        setDisplayedFrameInAnimatedOutput(imagePreviewRef.current); 
        return; 
      }

      if (isSpeechSupported && textToSpeak) {
        if (aiFrameResult?.generatedFrameDataUri) {
             toast({ title: "AI Frame Ready!", description: "Speaking the text with animation...", duration: 4000 });
        } else {
             toast({ title: "AI Frame Failed", description: "Speaking the text with original image...", duration: 5000 });
        }

        setTimeout(() => {
          if (animatedOutputSpeakingTextContentRef.current !== textToSpeak || !isGeneratingAnimatedOutputRef.current) {
            if (isGeneratingAnimatedOutputRef.current) setIsGeneratingAnimatedOutput(false); 
            return;
          }

          const utterance = new SpeechSynthesisUtterance(textToSpeak);
          utterance.onstart = () => {
            setIsAnimatedOutputSpeaking(true);
            if (animatedOutputAiFrameRef.current && imagePreviewRef.current) { 
              startAnimatedOutputFlicker();
            } else {
              setDisplayedFrameInAnimatedOutput(imagePreviewRef.current);
            }
          };
          utterance.onend = () => {
            setIsAnimatedOutputSpeaking(false);
            setIsGeneratingAnimatedOutput(false); 
          };
          utterance.onerror = (event) => {
            let toastMessage = `Could not play animated output speech. (Error: ${event.error || 'unknown'})`;
            let toastTitle = "Animated Speech Error";
            let toastVariant: "destructive" | "default" = "destructive";
            if (event.error === 'interrupted') {
              toastTitle = "Speech Interrupted";
              toastMessage = "Animated output playback was interrupted, possibly by a new speech request or action.";
              toastVariant = "default";
            }
            toast({ title: toastTitle, description: toastMessage, variant: toastVariant, duration: event.error === 'interrupted' ? 5000: 7000 });
            setIsAnimatedOutputSpeaking(false);
            stopAnimatedOutputFlicker();
            setIsGeneratingAnimatedOutput(false);
            setDisplayedFrameInAnimatedOutput(imagePreviewRef.current); 
          };
          window.speechSynthesis.speak(utterance);
        }, 100);
      } else {
        toast({ title: "Speech Not Available", description: "Browser speech not supported or no text for animation.", duration: 5000 });
        setIsGeneratingAnimatedOutput(false); 
        setDisplayedFrameInAnimatedOutput(animatedOutputAiFrameRef.current || imagePreviewRef.current);
      }

    } catch (error: any) { 
      console.error('[GenerateAnimatedOutput] General client-side processing error:', error);
      const message = error.message || "An unexpected client-side error occurred.";
      setAnimatedOutputError(message);
      toast({ title: "Client Error", description: message, variant: "destructive" });
      setIsGeneratingAnimatedOutput(false);
      setDisplayedFrameInAnimatedOutput(imagePreviewRef.current); 
    } 
  };

  const handleStopAnimatedOutput = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel(); 
    }
    setIsAnimatedOutputSpeaking(false); 
    stopAnimatedOutputFlicker();
    if (isGeneratingAnimatedOutputRef.current) setIsGeneratingAnimatedOutput(false);
    setDisplayedFrameInAnimatedOutput(imagePreviewRef.current || animatedOutputAiFrameRef.current); 
  };


  const handleGenerateFirebaseLipSyncVideo = async () => {
    if (!selectedImage || !imagePreviewRef.current) {
      toast({ title: "Image Required", description: "Please upload an image.", variant: "destructive" });
      return;
    }
    if (!selectedVoiceSample) {
      toast({ title: "Voice Sample Required", description: "Please select a voice sample in the 'Voice Cloning' section.", variant: "destructive" });
      return;
    }

    setIsGeneratingFirebaseVideo(true);
    setFirebaseVideoUrl(null);
    setFirebaseVideoError(null);
    
    let currentUser: User | null = auth.currentUser;

    if (!currentUser) {
      toast({ title: "Attempting Anonymous Sign-In", description: "No user signed in. Attempting to sign in anonymously for this action..." });
      try {
        const userCredential = await signInAnonymously(auth);
        currentUser = userCredential.user;
        if (currentUser) {
          toast({ title: "Anonymous Sign-In Successful", description: "Proceeding with video generation.", duration: 3000 });
        } else {
           throw new Error("Anonymous sign-in completed but currentUser is still null."); // Should not happen
        }
      } catch (anonError: any) {
        console.error("[Callable Call] Anonymous sign-in failed:", anonError);
        const errorMessage = anonError.message || "Unknown error during anonymous sign-in.";
        let finalErrorMessage = `Anonymous sign-in failed: ${errorMessage}. Cannot call function. (Code: ${anonError.code || 'N/A'})`;
        setFirebaseVideoError(finalErrorMessage);
        toast({ title: "Anonymous Sign-In Failed", description: finalErrorMessage, variant: "destructive", duration: 8000 });
        setIsGeneratingFirebaseVideo(false);
        return;
      }
    }
      
    if (!currentUser) { // Should be redundant given above, but as a safeguard
      setFirebaseVideoError("Authentication failed. No user available after sign-in attempt.");
      toast({ title: "Authentication Error", description: "No user available after sign-in attempt. Please try again.", variant: "destructive" });
      setIsGeneratingFirebaseVideo(false);
      return;
    }
    
    toast({ title: "Requesting Video (Callable)...", description: `Authenticated as UID: ${currentUser.uid.substring(0,10)}... (Anonymous: ${currentUser.isAnonymous})` });
    console.log(`[Callable Call] User UID: ${currentUser.uid} (Is Anonymous: ${currentUser.isAnonymous})`);
    console.log("[Callable Call] Invoking 'prepareLipSyncVideo' Firebase Callable Function with audioFileName:", selectedVoiceSample.name, "and imageId:", selectedImage.name);
    
    try {
      const callPrepareLipSyncVideo = httpsCallable(firebaseFunctions, 'prepareLipSyncVideo');
      const result = await callPrepareLipSyncVideo({
        audioFileName: selectedVoiceSample.name,
        imageId: selectedImage.name || "uploaded_image" 
      });

      const data = result.data as { mockVideoUrl?: string; message?: string; dataReceived?: any; error?: string }; 
      console.log("[Callable Call] Response received from 'prepareLipSyncVideo':", data);

      if (data && data.mockVideoUrl) {
        setFirebaseVideoUrl(data.mockVideoUrl);
        toast({ title: "Callable Function Success", description: data.message || "Mock video URL received.", duration: 5000 });
      } else {
        const noUrlErrorMsg = data?.message || data?.error || "Callable Function did not return a video URL or had an issue.";
        console.error("[Callable Call] Callable Function response missing mockVideoUrl or malformed:", data);
        setFirebaseVideoError(`Callable Function Response Issue: ${noUrlErrorMsg}`);
        toast({ title: "Callable Function Response Issue", description: noUrlErrorMsg, variant: "destructive" });
      }

    } catch (error: any) { // Catches HttpsError from callable function
      console.error("[Callable Call] Error calling 'prepareLipSyncVideo' Firebase Callable Function:", error);
      const httpsError = error as HttpsError;
      let finalErrorMessage = "An unexpected error occurred when calling the Firebase Function.";
      let toastTitle = "Callable Function Error";

      if (httpsError.code && httpsError.message) {
        toastTitle = `Function Error: ${httpsError.code}`;
        finalErrorMessage = `Firebase Function Error: ${httpsError.message} (Code: ${httpsError.code})`;
        if (httpsError.details) {
          finalErrorMessage += ` Details: ${JSON.stringify(httpsError.details)}`;
        }
        if (httpsError.code === 'unauthenticated') {
            finalErrorMessage += " The function reported an unauthenticated user. This could be due to a session issue or if anonymous sign-in failed silently. Ensure you are signed in (even anonymously).";
        } else if (httpsError.code === 'unavailable') {
           finalErrorMessage += " The function might be deploying or temporarily unavailable. Check emulator status or Firebase Console.";
        } else if (httpsError.code === 'internal') {
           finalErrorMessage += " The function encountered an internal error. Check function logs in the emulator or Firebase Console.";
        } else if (httpsError.code === 'invalid-argument') {
            finalErrorMessage += " The function reported invalid arguments. Sent: audioFileName='" + selectedVoiceSample.name + "', imageId='" + (selectedImage.name || "uploaded_image") + "'. Details: " + (httpsError.details ? JSON.stringify(httpsError.details) : 'N/A');
        }
      } else if (error.message) { 
        finalErrorMessage = `Client-side error calling function: ${error.message}`;
      }
      
      setFirebaseVideoError(finalErrorMessage);
      toast({ title: toastTitle, description: finalErrorMessage, variant: "destructive", duration: 10000 });
    } finally {
      setIsGeneratingFirebaseVideo(false);
    }
  };

  const handleGenerateTrueLipSyncVideo = async () => {
    if (!selectedImage) {
      toast({ title: "Image Required", description: "Please upload an image in the first section.", variant: "destructive" });
      return;
    }
    if (!selectedVoiceSample) {
      toast({ title: "Voice Sample Required", description: "Please upload a voice sample in the 'Voice Cloning' section.", variant: "destructive" });
      return;
    }

    setIsGeneratingTrueLipSyncVideo(true);
    setTrueLipSyncVideoUrl(null);
    setTrueLipSyncVideoError(null);
    toast({ title: "Generating True Lip-Sync Video...", description: "Please wait." });

    const formData = new FormData();
    formData.append('image', selectedImage);
    formData.append('audio', selectedVoiceSample);

    try {
      const response = await fetch('/api/true-lip-sync-video', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || `HTTP error! status: ${response.status}`);
      }

      if (result.videoUrl) {
        setTrueLipSyncVideoUrl(result.videoUrl);
        toast({ title: "True Lip-Sync Video Ready (Placeholder)", description: "Mock video URL received from placeholder backend." });
      } else {
        throw new Error(result.message || "Placeholder backend did not return a video URL.");
      }
    } catch (error: any) {
      console.error("Error generating true lip-sync video:", error);
      const errorMessage = error.message || "An unexpected error occurred.";
      setTrueLipSyncVideoError(errorMessage);
      toast({ title: "True Lip-Sync Video Error", description: errorMessage, variant: "destructive" });
    } finally {
      setIsGeneratingTrueLipSyncVideo(false);
    }
  };
  
  
  const handleStorageImageFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) setStorageImageFile(file);
    else setStorageImageFile(null);
    setUploadStatusMessage(null);
    setUploadedFileUrls(null);
  };

  const handleStorageAudioFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) setStorageAudioFile(file);
    else setStorageAudioFile(null);
    setUploadStatusMessage(null);
    setUploadedFileUrls(null);
  };

  const handleUploadFilesToStorage = async () => {
    if (!storageImageFile && !storageAudioFile) {
      toast({ title: "No Files Selected", description: "Please select an image and/or an audio file to upload.", variant: "destructive" });
      return;
    }
    if (!process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) {
        toast({ title: "Configuration Error", description: "Firebase Storage bucket is not configured. Please check your .env file.", variant: "destructive" });
        return;
    }


    setIsUploadingToStorage(true);
    setUploadStatusMessage("Starting upload...");
    setUploadedFileUrls(null);
    toast({ title: "Uploading Files...", description: "Please wait." });

    let imageDownloadUrl: string | undefined = undefined;
    let audioDownloadUrl: string | undefined = undefined;

    try {
      if (storageImageFile) {
        setUploadStatusMessage(`Uploading image: ${storageImageFile.name}...`);
        const imageFilePath = `uploads/images/${Date.now()}_${storageImageFile.name}`;
        const imageFileRef = storageRef(storage, imageFilePath);
        await uploadBytes(imageFileRef, storageImageFile);
        imageDownloadUrl = await getDownloadURL(imageFileRef);
        toast({ title: "Image Uploaded", description: `Successfully uploaded ${storageImageFile.name}.` });
        setUploadStatusMessage(`Image ${storageImageFile.name} uploaded.`);
      }

      if (storageAudioFile) {
        setUploadStatusMessage(`Uploading audio: ${storageAudioFile.name}...`);
        const audioFilePath = `uploads/audio/${Date.now()}_${storageAudioFile.name}`;
        const audioFileRef = storageRef(storage, audioFilePath);
        await uploadBytes(audioFileRef, storageAudioFile);
        audioDownloadUrl = await getDownloadURL(audioFileRef);
        toast({ title: "Audio Uploaded", description: `Successfully uploaded ${storageAudioFile.name}.` });
         setUploadStatusMessage(imageDownloadUrl ? `Image and audio ${storageAudioFile.name} uploaded.` : `Audio ${storageAudioFile.name} uploaded.`);
      }
      
      setUploadedFileUrls({ image: imageDownloadUrl, audio: audioDownloadUrl });
      if (imageDownloadUrl || audioDownloadUrl) {
        setUploadStatusMessage("All selected files uploaded successfully!");
      } else {
        setUploadStatusMessage("No files were selected for upload.");
      }

    } catch (error: any) {
      console.error("Error uploading to Firebase Storage:", error);
      const errorMessage = error.message || "An unexpected error occurred during upload.";
      setUploadStatusMessage(`Upload failed: ${errorMessage}`);
      toast({ title: "Upload Error", description: errorMessage, variant: "destructive" });
    } finally {
      setIsUploadingToStorage(false);
    }
  };
  
  const anyLoading = isGeneratingSpeech || isCloningVoice || isGeneratingAnimatedOutput || isGeneratingFirebaseVideo || isGeneratingTrueLipSyncVideo || isUploadingToStorage;
  const currentPreparedTextIsSpeaking = isSpeaking && preparedSpeechText && speakingText === preparedSpeechText;
  const currentSimulatedClonedVoiceIsSpeaking = isSimulatedClonedVoiceSpeaking && textForSimulatedClonedVoiceRef.current && textForSimulatedClonedVoiceRef.current === textForSimulatedClonedVoiceRef.current;


  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <main className="flex-grow container mx-auto py-8 px-4">
        <div className="grid gap-8 md:gap-12">

          <SectionCard title="Text &amp; Image to Speech Preparation" icon={<MessageSquareQuote className="text-primary" />} >
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
                    disabled={anyLoading || isSpeaking || isAnimatedOutputSpeaking }
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
                      Using your uploaded image for AI expressive frame generation and flicker animation. Audio will be synthesized from the text generated by "Process Input for Speech".
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1" id="animated-output-info">
                      Please upload an image and prepare audio text in the sections above.
                    </p>
                  )}
              </div>

              <Button
                onClick={isAnimatedOutputSpeaking || isAnimatedOutputAnimating ? handleStopAnimatedOutput : handleGenerateAnimatedOutputAndSpeak}
                disabled={ isGeneratingAnimatedOutput || !imagePreview || !getTextForAnimatedOutput() || isGeneratingFirebaseVideo || isSpeaking || isSimulatedClonedVoiceSpeaking }
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
                    {isGeneratingAnimatedOutput && !displayedFrameInAnimatedOutput && !animatedOutputError && !isAnimatedOutputSpeaking ? ( 
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
                    This feature generates an AI expressive still frame from your image, animates it through flickering, and plays browser-synthesized audio from the text generated by "Process Input for Speech". The animation will continue after speech until stopped.
                  </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Lip-Sync Video Generation (Callable Function)" icon={<Film className="text-primary" />}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="firebase-video-info" className="text-base">Image &amp; Audio Source for Backend Video:</Label>
                {(imagePreview && selectedVoiceSample) ? (
                  <p className="text-sm text-muted-foreground mt-1" id="firebase-video-info">
                    Uses your uploaded image and the voice sample from the "Voice Cloning" section to request a mock video from the Firebase Callable Function. If you are not signed in, an anonymous sign-in will be attempted.
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground mt-1" id="firebase-video-info">
                    Please upload an image (first section) AND a voice sample (second section).
                  </p>
                )}
              </div>
              <Button
                onClick={handleGenerateFirebaseLipSyncVideo}
                disabled={anyLoading || !imagePreview || !selectedVoiceSample}
                className="w-full sm:w-auto"
              >
                {isGeneratingFirebaseVideo ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Requesting from Callable Function...</>
                ) : (
                  <><Film className="mr-2 h-4 w-4" />Generate Mock Lip-Sync Video (Callable)</>
                )}
              </Button>

              {firebaseVideoUrl && (
                <div className="mt-6 p-4 border rounded-md bg-muted/30 shadow space-y-2">
                  <Label className="text-lg font-semibold text-foreground">Mock Video from Callable Function:</Label>
                  <video
                    key={firebaseVideoUrl}
                    src={firebaseVideoUrl}
                    controls
                    autoPlay
                    className="w-full rounded-md aspect-video bg-black"
                    onError={(e) => {
                      const videoElement = e.target as HTMLVideoElement;
                      let errorMsg = "Error playing video.";
                      if (videoElement.error) {
                         errorMsg = `Video error: ${videoElement.error.message} (code: ${videoElement.error.code})`;
                      }
                      setFirebaseVideoError(errorMsg); 
                      toast({ title: "Video Playback Error", description: errorMsg, variant: "destructive" });
                    }}
                  >
                    Your browser does not support the video tag.
                  </video>
                  <p className="text-xs text-muted-foreground italic">
                    This video is a mock response from an authenticated Firebase Callable Function simulating a backend lip-sync process using the uploaded image and voice sample name.
                  </p>
                </div>
              )}
              {firebaseVideoError && ( 
                <div className="mt-2 p-3 border border-destructive/50 rounded-md bg-destructive/10 text-destructive text-sm space-y-1">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                    <p className="font-semibold">Callable Function or Video Error:</p>
                  </div>
                  <p>{firebaseVideoError}</p>
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard title="True Lip-Sync Video Generation (Placeholder)" icon={<Video className="text-primary" />}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="true-lip-sync-info" className="text-base">Image &amp; Voice Source for Video:</Label>
                {(imagePreview && selectedVoiceSample) ? (
                  <p className="text-sm text-muted-foreground mt-1" id="true-lip-sync-info">
                    Uses the image from "Text & Image to Speech Preparation" and the voice sample from "Voice Cloning" to request a mock lip-synced video from a placeholder backend API.
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground mt-1" id="true-lip-sync-info">
                    Please upload an image in the first section AND a voice sample in the "Voice Cloning" section.
                  </p>
                )}
              </div>
              <Button
                onClick={handleGenerateTrueLipSyncVideo}
                disabled={anyLoading || !selectedImage || !selectedVoiceSample}
                className="w-full sm:w-auto"
              >
                {isGeneratingTrueLipSyncVideo ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating Placeholder Video...</>
                ) : (
                  <><Video className="mr-2 h-4 w-4" />Generate True Lip-Sync Video (Placeholder)</>
                )}
              </Button>

              {trueLipSyncVideoUrl && (
                <div className="mt-6 p-4 border rounded-md bg-muted/30 shadow space-y-2">
                  <Label className="text-lg font-semibold text-foreground">Mock Video from Placeholder API:</Label>
                  <video
                    key={trueLipSyncVideoUrl}
                    src={trueLipSyncVideoUrl}
                    controls
                    autoPlay
                    className="w-full rounded-md aspect-video bg-black"
                    onError={(e) => {
                      const videoElement = e.target as HTMLVideoElement;
                      let errorMsg = "Error playing video.";
                      if (videoElement.error) {
                         errorMsg = `Video error: ${videoElement.error.message} (code: ${videoElement.error.code})`;
                      }
                      setTrueLipSyncVideoError(errorMsg);
                      toast({ title: "Video Playback Error", description: errorMsg, variant: "destructive" });
                    }}
                  >
                    Your browser does not support the video tag.
                  </video>
                  <p className="text-xs text-muted-foreground italic">
                    This video is a mock response from a placeholder backend API simulating a true lip-sync process with an image and an audio file.
                  </p>
                </div>
              )}
              {trueLipSyncVideoError && (
                <div className="mt-2 p-3 border border-destructive/50 rounded-md bg-destructive/10 text-destructive text-sm space-y-1">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                    <p className="font-semibold">Placeholder Video Generation Error:</p>
                  </div>
                  <p>{trueLipSyncVideoError}</p>
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard title="File Upload to Firebase Storage" icon={<UploadCloud className="text-primary" />}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="storage-image-input" className="text-base flex items-center gap-2">
                  <ImagePlus className="h-5 w-5 text-muted-foreground" />
                  Select Image File:
                </Label>
                <Input
                  id="storage-image-input"
                  type="file"
                  accept="image/*"
                  onChange={handleStorageImageFileChange}
                  className="text-base mt-1 file:text-primary file:font-medium"
                  disabled={anyLoading}
                />
                {storageImageFile && <p className="text-sm text-muted-foreground mt-1">Selected: {storageImageFile.name}</p>}
              </div>

              <div>
                <Label htmlFor="storage-audio-input" className="text-base flex items-center gap-2">
                  <MicVocal className="h-5 w-5 text-muted-foreground" />
                  Select Audio File:
                </Label>
                <Input
                  id="storage-audio-input"
                  type="file"
                  accept="audio/*"
                  onChange={handleStorageAudioFileChange}
                  className="text-base mt-1 file:text-primary file:font-medium"
                  disabled={anyLoading}
                />
                {storageAudioFile && <p className="text-sm text-muted-foreground mt-1">Selected: {storageAudioFile.name}</p>}
              </div>

              <Button
                onClick={handleUploadFilesToStorage}
                disabled={anyLoading || (!storageImageFile && !storageAudioFile)}
                className="w-full sm:w-auto"
              >
                {isUploadingToStorage ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Uploading...</>
                ) : (
                  <><UploadCloud className="mr-2 h-4 w-4" />Upload Files to Storage</>
                )}
              </Button>

              {uploadStatusMessage && (
                <p className={`mt-2 text-sm ${uploadedFileUrls ? 'text-green-600' : 'text-destructive'}`}>
                  {uploadStatusMessage}
                </p>
              )}

              {uploadedFileUrls && (
                <div className="mt-4 space-y-2 p-3 border rounded-md bg-muted/20">
                  <Label className="text-base font-semibold">Uploaded File URLs:</Label>
                  {uploadedFileUrls.image && (
                    <div>
                      <p className="text-sm font-medium">Image:</p>
                      <a href={uploadedFileUrls.image} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline break-all">
                        {uploadedFileUrls.image}
                      </a>
                    </div>
                  )}
                  {uploadedFileUrls.audio && (
                    <div>
                      <p className="text-sm font-medium">Audio:</p>
                      <a href={uploadedFileUrls.audio} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline break-all">
                        {uploadedFileUrls.audio}
                      </a>
                    </div>
                  )}
                   <p className="text-xs text-muted-foreground mt-2 italic">
                    These files are now in Firebase Storage. Uploading to specific paths can be configured to trigger Firebase Functions for further processing (e.g., lip-sync).
                  </p>
                </div>
              )}
               <p className="text-xs text-muted-foreground mt-1 italic">
                This section demonstrates uploading files. Ensure your Firebase Storage is set up and security rules allow uploads from your app.
                You'll also need to populate your <code>.env</code> file with Firebase client configuration values.
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

