
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
import { Text, MicVocal, Loader2, ImagePlus, Volume2, StopCircle, Video, VideoOff, AlertTriangle, Info } from 'lucide-react';
import { prepareTextForSpeech } from '@/ai/flows/prepare-text-for-speech-flow';


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

  const [isGeneratingVideo, setIsGeneratingVideo] = useState<boolean>(false);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [videoGenerationError, setVideoGenerationError] = useState<string | null>(null);
  
  const { toast } = useToast();

  const isSpeakingRef = useRef(isSpeaking);
  const isSimulatedClonedVoiceSpeakingRef = useRef(isSimulatedClonedVoiceSpeaking);
  const preparedSpeechTextRef = useRef(preparedSpeechText);
  const textForSimulatedClonedVoiceRef = useRef(textForSimulatedClonedVoice);
  const speakingTextRef = useRef(speakingText);

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
      setIsSpeaking(false);
      setSpeakingText(null);
      setIsSimulatedClonedVoiceSpeaking(false);
    };
  }, []);
  
  const resetAllOutputsDependentOnTextOrImage = () => {
    setPreparedSpeechText(null);
    setTextForSimulatedClonedVoice(null); 
    setGeneratedVideoUrl(null);
    setVideoGenerationError(null);

    if (typeof window !== 'undefined' && window.speechSynthesis && (isSpeakingRef.current || isSimulatedClonedVoiceSpeakingRef.current)) {
        window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setSpeakingText(null);
    setIsSimulatedClonedVoiceSpeaking(false);
  };


  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.onerror = () => {
        console.error("FileReader error when trying to load image.");
        setSelectedImage(null); 
        setImagePreview(null);
        toast({ title: "Image Load Error", description: "Could not read the selected image file.", variant: "destructive" });
      }
      reader.readAsDataURL(file);
    } else {
      setSelectedImage(null);
      setImagePreview(null);
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
    setGeneratedVideoUrl(null);
    setVideoGenerationError(null);

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
    setGeneratedVideoUrl(null);
    setVideoGenerationError(null);

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
    setGeneratedVideoUrl(null);
    setVideoGenerationError(null);
    
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

  const anyLoading = isGeneratingSpeech || isCloningVoice || isGeneratingVideo;

  const isTextAvailableForVideoGeneration =
    (preparedSpeechText && preparedSpeechText.trim() !== "" && !preparedSpeechText.toLowerCase().startsWith("no text was provided") && !preparedSpeechText.toLowerCase().startsWith("error:")) ||
    (textForSimulatedClonedVoice && textForSimulatedClonedVoice.trim() !== "");


  const handleGenerateVideo = async () => {
    console.log('[handleGenerateVideo] START. States:', { selectedImageName: selectedImage?.name, imagePreviewAvailable: !!imagePreview });
    setVideoGenerationError(null); 

    const currentHasPreparedTextAudio = preparedSpeechText && preparedSpeechText.trim() !== "" && !preparedSpeechText.toLowerCase().startsWith("no text was provided") && !preparedSpeechText.toLowerCase().startsWith("error:");
    const currentHasSimulatedClonedAudio = !!(textForSimulatedClonedVoice && textForSimulatedClonedVoice.trim() !== "");
    
    let textToSpeakForVideo: string | null = null;
    if (currentHasSimulatedClonedAudio && textForSimulatedClonedVoice) {
      textToSpeakForVideo = textForSimulatedClonedVoice;
      console.log(`[handleGenerateVideo] Using "simulated cloned audio" text for video generation.`);
    } else if (currentHasPreparedTextAudio && preparedSpeechText) {
      textToSpeakForVideo = preparedSpeechText;
      console.log(`[handleGenerateVideo] Using "prepared speech text" for video generation.`);
    }

    if (!selectedImage) { 
      toast({ title: "Image Required for Video", description: "Please upload an image in the 'Text & Image to Speech Preparation' section. That image will be used for animation.", variant: "destructive" });
      console.log('[handleGenerateVideo] Aborted: No image selected.');
      return;
    }
    if (!textToSpeakForVideo) {
       toast({ title: "Audio Text Required for Video", description: "Please use 'Process Input for Speech' or 'Generate Speech with Cloned Voice (Mock)' first to prepare text, then try generating video.", variant: "destructive" });
       console.log('[handleGenerateVideo] Aborted: No audio source text available.');
      return;
    }
    
    if (typeof window !== 'undefined' && window.speechSynthesis && (isSpeakingRef.current || isSimulatedClonedVoiceSpeakingRef.current)) {
        console.log('[handleGenerateVideo] Cancelling ongoing browser speech before video generation attempt.');
        window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setSpeakingText(null);
    setIsSimulatedClonedVoiceSpeaking(false);

    setIsGeneratingVideo(true);
    setGeneratedVideoUrl(null); 
    console.log('[handleGenerateVideo] Cleared generatedVideoUrl, isGeneratingVideo is true.');

    try {
      toast({ title: "Starting Video Generation", description: "Contacting backend for lip-sync video processing..." });
      
      const formData = new FormData();
      formData.append('image', selectedImage);
      formData.append('textToSpeak', textToSpeakForVideo);

      console.log('[handleGenerateVideo] Sending request to /api/true-lip-sync-video');
      
      const response = await fetch('/api/true-lip-sync-video', { 
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          console.warn('[handleGenerateVideo] Could not parse JSON from error response.');
        }
        const errorMessage = errorData?.message || `Backend error: ${response.status} ${response.statusText || 'Status text unavailable'}`;
        console.error('[handleGenerateVideo] Backend request failed:', errorMessage, ...(errorData ? [errorData] : [`Status: ${response.status}`]));
        setVideoGenerationError(errorMessage);
        toast({ title: "Video Generation Failed", description: errorMessage, variant: "destructive" });
        return; 
      }

      const result = await response.json();
      console.log('[handleGenerateVideo] Backend response successful:', result);

      if (result.videoUrl) {
        setGeneratedVideoUrl(result.videoUrl);
        toast({ title: "Video Generation Successful", description: "Video is now available for playback." });
      } else {
        const errMsg = result.message || "Backend did not return a video URL but request was OK.";
        console.error('[handleGenerateVideo]', errMsg, result);
        setVideoGenerationError(errMsg);
        toast({ title: "Video Generation Issue", description: errMsg, variant: "destructive" });
      }

    } catch (error: any) {
      console.error("[handleGenerateVideo] CRITICAL ERROR in try block (e.g., network issue):", error);
      const message = error.message || "An unexpected error occurred during video generation.";
      setVideoGenerationError(message);
      toast({ title: "Video Generation Error", description: message, variant: "destructive" });
    } finally {
      console.log('[handleGenerateVideo] In finally block. Setting isGeneratingVideo to false.');
      setIsGeneratingVideo(false);
    }
  };

  const currentPreparedTextIsSpeaking = isSpeaking && speakingText === preparedSpeechText && preparedSpeechText !== null;
  const currentSimulatedClonedVoiceIsSpeaking = isSimulatedClonedVoiceSpeaking && !!textForSimulatedClonedVoice;

  console.log('[Home render] States before JSX:', {
    isGeneratingVideo,
    generatedVideoUrl_value: generatedVideoUrl,
    videoGenerationError,
    isGeneratingSpeech,
    isCloningVoice,
    preparedSpeechText_value: preparedSpeechText ? preparedSpeechText.substring(0,50) + "..." : null,
    textForSimulatedClonedVoice_value: textForSimulatedClonedVoice ? textForSimulatedClonedVoice.substring(0,50) + "..." : null,
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
                  disabled={anyLoading || isGeneratingVideo}
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
                  disabled={anyLoading || isGeneratingVideo}
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
                        disabled={anyLoading || isSimulatedClonedVoiceSpeaking }
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
                    disabled={anyLoading || isSpeaking}
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


          <SectionCard title="Face Preprocessing + Lip Sync Video (Audio + Image → Talking Face)" icon={<Video className="text-primary" />} >
            <div className="space-y-4">
              <div>
                <Label htmlFor="animation-image-source" className="text-base">Image Source for Animation:</Label>
                 {imagePreview && selectedImage ? (
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
                onClick={handleGenerateVideo}
                disabled={anyLoading || !selectedImage || !isTextAvailableForVideoGeneration}
                className="w-full sm:w-auto"
              >
                {isGeneratingVideo ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Video...
                  </>
                ) : (
                  "Generate Lip-Sync Video (Backend)"
                )}
              </Button>
              { !anyLoading && (!selectedImage || !isTextAvailableForVideoGeneration) && (
                <p className="text-xs text-muted-foreground mt-1">
                  To enable video generation: Ensure an image is uploaded in the first section, and that audio text has been prepared (either via "Process Input for Speech" or "Generate Speech with Cloned Voice (Mock)").
                </p>
              )}

              <div className="mt-6 p-4 border rounded-md bg-muted/30 shadow">
                <Label className="text-lg font-semibold text-foreground flex items-center gap-2 mb-2">
                  <Video className="h-5 w-5"/>
                  Video Animation Output:
                </Label>
                <div className="bg-black rounded-md flex items-center justify-center aspect-video overflow-hidden min-h-[200px]">
                  {isGeneratingVideo ? (
                    <div className="flex flex-col items-center justify-center text-center p-4">
                      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                      <p className="text-lg font-semibold text-white">Generating Video...</p>
                      <p className="text-sm text-gray-300">Please wait, contacting backend for video processing.</p>
                    </div>
                  ) : generatedVideoUrl ? (
                    <video
                      key={generatedVideoUrl} 
                      src={generatedVideoUrl}
                      controls
                      autoPlay
                      loop
                      muted // Muted helps with autoplay policies in browsers
                      className="object-contain w-full h-full"
                      onLoadedData={() => console.log('[Video Player] Video data loaded for:', generatedVideoUrl)}
                      onError={(e) => {
                        console.error('[Video Player] Error loading video:', generatedVideoUrl, e);
                        setVideoGenerationError('Error playing the generated video. The URL might be invalid or the video format unsupported.');
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-4">
                      <VideoOff className="h-12 w-12 mb-4" data-ai-hint="video placeholder" />
                      <p className="text-lg font-semibold">Video will appear here</p>
                      <p className="text-sm">Upload an image, prepare audio text, then click "Generate Lip-Sync Video".</p>
                    </div>
                  )}
                </div>
                {videoGenerationError && !isGeneratingVideo && (
                  <div className="mt-2 p-3 border border-destructive/50 rounded-md bg-destructive/10 text-destructive text-sm flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5"/>
                    <p>{videoGenerationError}</p>
                  </div>
                )}
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
