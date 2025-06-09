
"use client";

import React, { useState, ChangeEvent, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
// import { useSearchParams } from 'next/navigation'; // No longer explicitly used
import AppHeader from '@/components/AppHeader';
import SectionCard from '@/components/SectionCard';
// import AudioPlayer from '@/components/AudioPlayer'; // No longer directly used
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from "@/hooks/use-toast";
import { Text, MicVocal, Loader2, UploadCloud, ImagePlus, Volume2, StopCircle, Smile, Video, VideoOff } from 'lucide-react';
import { prepareTextForSpeech } from '@/ai/flows/prepare-text-for-speech-flow';
// import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


export default function Home() {
  // const searchParams = useSearchParams(); // Explicitly calling, though not used, as per previous diagnostic step.

  const [textInput, setTextInput] = useState<string>('');
  const [isGeneratingSpeech, setIsGeneratingSpeech] = useState<boolean>(false);

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [preparedSpeechText, setPreparedSpeechText] = useState<string | null>(null);

  const [selectedVoiceSample, setSelectedVoiceSample] = useState<File | null>(null);
  const [isCloningVoice, setIsCloningVoice] = useState<boolean>(false);
  const [textForSimulatedClonedVoice, setTextForSimulatedClonedVoice] = useState<string | null>(null);
  
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [speakingText, setSpeakingText] = useState<string | null>(null); // Tracks the text content of the standard TTS utterance
  const [isSimulatedClonedVoiceSpeaking, setIsSimulatedClonedVoiceSpeaking] = useState<boolean>(false); // Tracks if simulated cloned voice is speaking

  const [isSpeechSupported, setIsSpeechSupported] = useState<boolean>(false);

  const [staticFaceImage, setStaticFaceImage] = useState<File | null>(null);
  const [staticFaceImagePreview, setStaticFaceImagePreview] = useState<string | null>(null);
  const [animatedVideoResult, setAnimatedVideoResult] = useState<string | null>(null);
  const [isAnimatingFace, setIsAnimatingFace] = useState<boolean>(false);
  const [mockVideoPlayerImage, setMockVideoPlayerImage] = useState<string | null>(null);

  const { toast } = useToast();

  // Refs to hold the latest state for use in setTimeout/event callbacks
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
        setTimeout(logVoices, 500); // Fallback check if onvoiceschanged is not supported
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
        window.speechSynthesis.onvoiceschanged = null; // Clean up event listener
      }
      // Reset relevant states on unmount
      setIsSpeaking(false);
      setSpeakingText(null);
      setIsSimulatedClonedVoiceSpeaking(false);
    };
  }, []);
  
  const resetAllOutputs = () => {
    setPreparedSpeechText(null);
    setAnimatedVideoResult(null);
    setMockVideoPlayerImage(null);
    setTextForSimulatedClonedVoice(null);
    // Keep selectedImage, imagePreview, staticFaceImage, staticFaceImagePreview as they are user inputs
    // selectedVoiceSample is also a user input

    if (typeof window !== 'undefined' && window.speechSynthesis && (window.speechSynthesis.speaking || window.speechSynthesis.pending)) {
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
      reader.readAsDataURL(file);
    } else {
      setSelectedImage(null);
      setImagePreview(null);
    }
    // Reset outputs that depend on this input
    setPreparedSpeechText(null);
    setTextForSimulatedClonedVoice(null); 
    setAnimatedVideoResult(null);
    setMockVideoPlayerImage(null);

    if (typeof window !== 'undefined' && window.speechSynthesis && (isSpeakingRef.current || isSimulatedClonedVoiceSpeakingRef.current)) {
        window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setSpeakingText(null);
    setIsSimulatedClonedVoiceSpeaking(false);
  };

  const toDataURL = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleTextToSpeech = async () => {
    if (!textInput.trim() && !selectedImage && !staticFaceImagePreview) {
      toast({ title: "Input Required", description: "Please enter some text or select an image (either in this section or in the face animation section).", variant: "destructive" });
      return;
    }

    // Cancel any ongoing speech and reset speech states
    if (typeof window !== 'undefined' && window.speechSynthesis && (window.speechSynthesis.speaking || window.speechSynthesis.pending) ) {
      console.log('[handleTextToSpeech] Cancelling any ongoing browser speech before processing new input.');
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false); // Reset standard TTS state
    setSpeakingText(null);
    setIsSimulatedClonedVoiceSpeaking(false); // Reset simulated cloned voice state

    setIsGeneratingSpeech(true);
    setPreparedSpeechText(null); // Clear previous prepared text
    // Reset other outputs that might become stale
    setTextForSimulatedClonedVoice(null);
    setAnimatedVideoResult(null);
    setMockVideoPlayerImage(null);

    let imageDataUri: string | undefined = undefined;
    if (selectedImage) { // Prioritize image selected in this section
      try {
        imageDataUri = await toDataURL(selectedImage);
        console.log('[handleTextToSpeech] Using locally selected image for speech context.');
      } catch (error) {
        console.error("Error converting local selectedImage to data URI:", error);
        toast({ title: "Image Error", description: "Failed to process locally selected image. Please try another.", variant: "destructive" });
        setIsGeneratingSpeech(false);
        return;
      }
    } else if (staticFaceImagePreview) { // Fallback to static face image if no local image
      imageDataUri = staticFaceImagePreview; // This is already a data URI
      console.log('[handleTextToSpeech] No local image selected. Using uploaded static face image for speech context.');
      toast({
        title: "Using Face Image for Context",
        description: "No image selected in this section; using the uploaded static face image as context for speech preparation.",
        duration: 5000,
      });
    } else {
      console.log('[handleTextToSpeech] No image provided for context.');
    }


    try {
      const { preparedText } = await prepareTextForSpeech({ text: textInput, imageDataUri });
      setPreparedSpeechText(preparedText); // This will update preparedSpeechTextRef.current via its own useEffect

      const shouldSpeak = preparedText &&
                          preparedText.trim() !== "" &&
                          !preparedText.toLowerCase().startsWith("no text was provided") &&
                          !preparedText.toLowerCase().startsWith("error:");

      if (isSpeechSupported && shouldSpeak) {
        // States are set before setTimeout to reflect immediate intent
        setIsSpeaking(true); 
        setSpeakingText(preparedText); // This updates speakingTextRef via its useEffect
        setIsSimulatedClonedVoiceSpeaking(false);

        setTimeout(() => {
            // Check refs for the most current state inside setTimeout
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
              // States already set reflecting intent
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
  

  const isPreparedTextUsable = useCallback(() => {
    const currentPreparedText = preparedSpeechTextRef.current; // Use ref for latest value
    return currentPreparedText &&
           currentPreparedText.trim() !== "" &&
           !currentPreparedText.toLowerCase().startsWith("no text was provided") &&
           !currentPreparedText.toLowerCase().startsWith("error:");
  }, []); // No direct state dependencies, relies on ref

  const handleSpeakPreparedText = useCallback(() => {
    if (!isSpeechSupported) {
      toast({ title: "Speech Not Supported", description: "Your browser does not support speech synthesis.", variant: "destructive" });
      return;
    }

    const textToSpeak = preparedSpeechTextRef.current; // Use ref for latest value

    // If already speaking this exact text, stop it.
    if (isSpeakingRef.current && speakingTextRef.current === textToSpeak) {
      console.log('[handleSpeakPreparedText] Attempting to STOP standard TTS because it is currently speaking this text.');
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setSpeakingText(null);
      return;
    }
    
    // If trying to speak new text, or starting fresh
    if (textToSpeak && isPreparedTextUsable()) {
      console.log('[handleSpeakPreparedText] Attempting to PLAY standard TTS with text:', textToSpeak);
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        console.log('[handleSpeakPreparedText] Cancelling other/pending browser speech before playing new standard TTS.');
        window.speechSynthesis.cancel();
      }
      
      // Set states to reflect intent *before* setTimeout
      setIsSpeaking(true);
      setSpeakingText(textToSpeak); // This will update speakingTextRef
      setIsSimulatedClonedVoiceSpeaking(false); // Ensure other speech type is off

      setTimeout(() => {
        // Check refs for the most current state inside setTimeout
        if (!isSpeakingRef.current || speakingTextRef.current !== textToSpeak) {
          console.log('[handleSpeakPreparedText] Speak request was cancelled or text changed before execution. Current isSpeakingRef:', isSpeakingRef.current, 'Current speakingTextRef:', speakingTextRef.current, 'Target textToSpeak:', textToSpeak);
           if (isSpeakingRef.current && speakingTextRef.current !== textToSpeak) { // If still "speaking" but a different text, stop it.
              setIsSpeaking(false); 
              setSpeakingText(null);
           }
          return;
        }
        console.log('[handleSpeakPreparedText] setTimeout: Speaking now with text:', textToSpeak);
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.onstart = () => {
          console.log('[handleSpeakPreparedText] Utterance started.');
          // States already set reflecting intent
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
  }, [isSpeechSupported, toast, isPreparedTextUsable]);


  const handleVoiceSampleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) setSelectedVoiceSample(file);
    else setSelectedVoiceSample(null);
    
    // Reset outputs that might depend on this or become stale
    setTextForSimulatedClonedVoice(null);
    setAnimatedVideoResult(null);
    setMockVideoPlayerImage(null);

    if (typeof window !== 'undefined' && window.speechSynthesis && (isSpeakingRef.current || isSimulatedClonedVoiceSpeakingRef.current)) {
        window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setSpeakingText(null);
    setIsSimulatedClonedVoiceSpeaking(false);
  };


 const handleCloneVoiceAndSynthesize = async () => {
    setIsCloningVoice(true); 
    toast({ title: "Mock Voice Cloning", description: "Initializing voice cloning process..." });

    console.log('[handleCloneVoiceAndSynthesize] Initiated.');
    console.log('[handleCloneVoiceAndSynthesize] Selected voice sample:', selectedVoiceSample?.name);
    const currentPreparedTextIsUsable = isPreparedTextUsable(); // Uses ref via callback
    console.log('[handleCloneVoiceAndSynthesize] Is prepared text usable at start:', currentPreparedTextIsUsable);
    const currentPreparedSpeechTextValue = preparedSpeechTextRef.current; // Capture current value from ref
    console.log('[handleCloneVoiceAndSynthesize] Current preparedSpeechText at start (from ref):', currentPreparedSpeechTextValue);

    if (!selectedVoiceSample) {
      toast({ title: "Voice Sample Required", description: "Please select a voice sample.", variant: "destructive" });
      console.warn('[handleCloneVoiceAndSynthesize] Aborted: No voice sample selected.');
      setIsCloningVoice(false);
      return;
    }
    if (!currentPreparedTextIsUsable || !currentPreparedSpeechTextValue) { // Use captured value for check
      toast({ title: "Prepared Speech Text Required", description: "Please process some text for speech first. Voice cloning needs text to synthesize.", variant: "destructive" });
      console.warn('[handleCloneVoiceAndSynthesize] Aborted: Prepared text is not usable or null. Value was:', currentPreparedSpeechTextValue);
      setIsCloningVoice(false);
      return;
    }
    
    // Cancel any ongoing speech and reset speech states
    if (typeof window !== 'undefined' && window.speechSynthesis && (window.speechSynthesis.speaking || window.speechSynthesis.pending)) {
        console.log('[handleCloneVoiceAndSynthesize] Cancelling ongoing speech before starting mock cloning.');
        window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setSpeakingText(null);
    setIsSimulatedClonedVoiceSpeaking(false);
    
    // Reset potentially stale outputs
    setTextForSimulatedClonedVoice(null); 
    setAnimatedVideoResult(null);
    setMockVideoPlayerImage(null);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate initial processing
      toast({ title: "Mock Voice Cloning", description: "Processing voice sample..." });
      
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate core cloning
      toast({ title: "Mock Voice Cloning", description: "Synthesizing speech with cloned voice..." });
      
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate finalization

      // Use the preparedSpeechText captured at the *start* of this function
      if (currentPreparedSpeechTextValue && 
          currentPreparedSpeechTextValue.trim() !== "" &&
          !currentPreparedSpeechTextValue.toLowerCase().startsWith("no text was provided") &&
          !currentPreparedSpeechTextValue.toLowerCase().startsWith("error:")
      ) {
        setTextForSimulatedClonedVoice(currentPreparedSpeechTextValue); // Updates textForSimulatedClonedVoiceRef
        console.log('[handleCloneVoiceAndSynthesize] Successfully set textForSimulatedClonedVoice to:', currentPreparedSpeechTextValue);
        toast({ title: "Mock Voice Cloning Complete", description: `Speech based on "${currentPreparedSpeechTextValue.substring(0,50)}..." using voice sample "${selectedVoiceSample.name}" is (mock) ready for simulated playback.` });
      } else {
        setTextForSimulatedClonedVoice(null);
        console.error('[handleCloneVoiceAndSynthesize] Error: preparedSpeechText (captured at start) became unusable or null during mock cloning simulation. Current value from start was:', currentPreparedSpeechTextValue);
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
    const currentTextForSimulated = textForSimulatedClonedVoiceRef.current; // Use ref for latest value
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

    // If already speaking this simulated voice, stop it.
    if (isSimulatedClonedVoiceSpeakingRef.current) {
        console.log('[handlePlaySimulatedClonedVoice] Attempting to STOP simulated cloned voice because it is currently speaking.');
        window.speechSynthesis.cancel();
        setIsSimulatedClonedVoiceSpeaking(false);
        // speakingText is not relevant here as it's for the other TTS
        return;
    }

    console.log('[handlePlaySimulatedClonedVoice] Attempting to PLAY simulated cloned voice with text:', currentTextForSimulated);
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        console.log('[handlePlaySimulatedClonedVoice] Cancelling other/pending browser speech before playing new simulated cloned voice.');
        window.speechSynthesis.cancel();
    }
    
    // Set states to reflect intent *before* setTimeout
    setIsSimulatedClonedVoiceSpeaking(true);
    setIsSpeaking(false); // Ensure other speech type is off
    setSpeakingText(null); // Clear standard TTS text tracker

    setTimeout(() => {
        // Check ref for the most current state inside setTimeout
        if (!isSimulatedClonedVoiceSpeakingRef.current) {
            console.log('[handlePlaySimulatedClonedVoice] setTimeout: Play request for simulated cloned voice was cancelled before execution. Current isSimulatedClonedVoiceSpeakingRef:', isSimulatedClonedVoiceSpeakingRef.current);
            return;
        }
        // Also ensure the text hasn't changed due to some other rapid action (though less likely for this specific state)
        if (textForSimulatedClonedVoiceRef.current !== currentTextForSimulated) {
            console.log('[handlePlaySimulatedClonedVoice] setTimeout: Text for simulated voice changed before execution. Aborting.');
            setIsSimulatedClonedVoiceSpeaking(false);
            return;
        }

        console.log('[handlePlaySimulatedClonedVoice] setTimeout: Speaking now with text:', currentTextForSimulated);
        const utterance = new SpeechSynthesisUtterance(currentTextForSimulated);
        utterance.onstart = () => {
            console.log('[handlePlaySimulatedClonedVoice] Utterance started.');
            // States already set reflecting intent
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
    // Reset outputs that might depend on this or become stale
    setAnimatedVideoResult(null);
    setMockVideoPlayerImage(null);
    // If the face image changes, any speech prepared using it as context might be stale, but we don't reset preparedSpeechText here
    // as it's more directly tied to the text input section.
  };

  const handleAnimateFace = async () => {
    console.log('[handleAnimateFace] Initiated.');
    if (!staticFaceImage) {
      toast({ title: "Static Face Image Required", description: "Please upload a static face image.", variant: "destructive" });
      console.log('[handleAnimateFace] Aborted: No static face image.');
      return;
    }
    
    const currentTextForSimulatedVal = textForSimulatedClonedVoiceRef.current; // Use ref
    const currentPreparedTextIsUsableVal = isPreparedTextUsable(); // Use ref via callback
    const currentPreparedSpeechTextVal = preparedSpeechTextRef.current; // Use ref

    const audioSourceText = currentTextForSimulatedVal ? "simulated cloned audio" : (currentPreparedTextIsUsableVal ? "prepared speech text" : null);
    console.log('[handleAnimateFace] Determined audioSourceText:', audioSourceText);
    console.log('[handleAnimateFace] textForSimulatedClonedVoice (from ref):', currentTextForSimulatedVal);
    console.log('[handleAnimateFace] isPreparedTextUsable():', currentPreparedTextIsUsableVal);
    console.log('[handleAnimateFace] preparedSpeechText (at animation start, from ref):', currentPreparedSpeechTextVal);


    if (!audioSourceText) {
       toast({ title: "Audio Source Required", description: `Please process text for speech or perform mock voice cloning first. The animation needs an audio context.`, variant: "destructive" });
       console.log('[handleAnimateFace] Aborted: No audio source text available (neither prepared text nor simulated cloned audio).');
      return;
    }
    
    // Cancel any ongoing speech and reset speech states
    if (typeof window !== 'undefined' && window.speechSynthesis && (isSpeakingRef.current || isSimulatedClonedVoiceSpeakingRef.current)) {
        console.log('[handleAnimateFace] Cancelling ongoing speech before animation.');
        window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setSpeakingText(null);
    setIsSimulatedClonedVoiceSpeaking(false);

    setIsAnimatingFace(true);
    setAnimatedVideoResult(null); // Clear previous animation result
    setMockVideoPlayerImage(null); // Clear previous mock video image

    try {
      toast({ title: "Starting Animation Process", description: "Preprocessing face image..." });
      await new Promise(resolve => setTimeout(resolve, 1500));

      toast({ title: "Processing Animation", description: `Generating lip-sync video with ${audioSourceText}...` });
      await new Promise(resolve => setTimeout(resolve, 2500));

      const audioContextMessageSegment = currentTextForSimulatedVal
        ? `simulated cloned audio based on text: "${currentTextForSimulatedVal.substring(0,70)}..."`
        : (currentPreparedTextIsUsableVal && currentPreparedSpeechTextVal ? `prepared speech: "${currentPreparedSpeechTextVal.substring(0, 70)}..."` : "available audio context");

      let voiceInfoSegment = '';
      if (currentTextForSimulatedVal && selectedVoiceSample) {
        voiceInfoSegment = ` (simulated with custom voice from "${selectedVoiceSample.name}")`;
      } else if (currentPreparedTextIsUsableVal && selectedVoiceSample) { // Standard TTS was used, but voice sample was present for context
        voiceInfoSegment = ` (standard browser TTS used, voice sample "${selectedVoiceSample.name}" was noted)`;
      } else if (currentPreparedTextIsUsableVal) { // Standard TTS used, no voice sample involved
        voiceInfoSegment = ` (standard browser TTS used)`;
      }

      const mockVideoOutputMessage = `Animation using face image "${staticFaceImage.name}", with ${audioContextMessageSegment}${voiceInfoSegment}. The animated video would be displayed here. (Mock Output)`;
      
      console.log('[handleAnimateFace] Mock processing complete. Setting animation results.');
      setAnimatedVideoResult(mockVideoOutputMessage);
      const placeholderImageUrl = `https://placehold.co/640x360.png?t=${new Date().getTime()}`; 
      setMockVideoPlayerImage(placeholderImageUrl);
      console.log('[handleAnimateFace] mockVideoPlayerImage set to:', placeholderImageUrl);
      console.log('[handleAnimateFace] animatedVideoResult set to:', mockVideoOutputMessage);

      toast({ title: "Face Animation Complete (Mock)", description: "Mock video result is now available." });
    } catch (error) {
      console.error("Error during face animation process:", error);
      toast({ title: "Animation Error", description: "An unexpected error occurred during face animation.", variant: "destructive" });
      setAnimatedVideoResult(null);
      setMockVideoPlayerImage(null);
    } finally {
      setIsAnimatingFace(false);
      console.log('[handleAnimateFace] Completed. isAnimatingFace set to false.');
    }
  };

  const anyLoading = isGeneratingSpeech || isCloningVoice || isAnimatingFace;
  const isCurrentPreparedTextSpeaking = isSpeakingRef.current && speakingTextRef.current === preparedSpeechTextRef.current;
  const isCurrentSimulatedClonedVoiceSpeaking = isSimulatedClonedVoiceSpeakingRef.current && textForSimulatedClonedVoiceRef.current;


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
                    // Reset dependent outputs when text input changes
                    setPreparedSpeechText(null);
                    setTextForSimulatedClonedVoice(null);
                    setAnimatedVideoResult(null);
                    setMockVideoPlayerImage(null);
                    if (typeof window !== 'undefined' && window.speechSynthesis && (isSpeakingRef.current || isSimulatedClonedVoiceSpeakingRef.current)) {
                        window.speechSynthesis.cancel();
                    }
                    setIsSpeaking(false);
                    setSpeakingText(null);
                    setIsSimulatedClonedVoiceSpeaking(false);
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
                  onChange={handleImageChange} // Resets relevant outputs internally
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
              <Button onClick={handleTextToSpeech} disabled={anyLoading} className="w-full sm:w-auto">
                {isGeneratingSpeech ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing Input...</>
                ) : (
                  "Process Input for Speech"
                )}
              </Button>
              {preparedSpeechTextRef.current && (
                <div className="mt-6 p-4 border rounded-md bg-muted/30 shadow">
                  <div className="flex justify-between items-center mb-2">
                    <Label className="text-lg font-semibold text-foreground">Prepared Text for Speech:</Label>
                    {isSpeechSupported && isPreparedTextUsable() && (
                      <Button
                        onClick={handleSpeakPreparedText}
                        variant="outline"
                        size="sm"
                        // Disable if any global loading, or simulated voice is speaking, 
                        // or if this text is not usable (unless it's currently speaking this text, then allow stop)
                        disabled={anyLoading || isSimulatedClonedVoiceSpeakingRef.current || (!isPreparedTextUsable() && !isCurrentPreparedTextSpeaking) }
                      >
                        {isCurrentPreparedTextSpeaking ? <><StopCircle className="mr-2 h-4 w-4" />Stop Speaking</> : <><Volume2 className="mr-2 h-4 w-4" />Speak</>}
                      </Button>
                    )}
                  </div>
                  <p className="text-base whitespace-pre-wrap text-foreground/90">{preparedSpeechTextRef.current}</p>
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
                  onChange={handleVoiceSampleChange} // Resets relevant outputs internally
                  className="text-base mt-1 file:text-primary file:font-medium"
                />
                 <p className="text-xs text-muted-foreground mt-1 italic">Note: This uploaded sample is for simulation purposes. Playback will use a standard browser voice, not the uploaded sample's voice.</p>
                {selectedVoiceSample && (
                  <p className="text-sm text-muted-foreground mt-1">Selected file: {selectedVoiceSample.name}</p>
                )}
              </div>
              <Button
                onClick={handleCloneVoiceAndSynthesize}
                // Disable if any global loading, no voice sample, or no usable prepared text
                disabled={anyLoading || !selectedVoiceSample || !isPreparedTextUsable()}
                className="w-full sm:w-auto"
              >
                {isCloningVoice ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Cloning Voice...</>
                ) : (
                  <><MicVocal className="mr-2 h-4 w-4" />Generate Speech with Cloned Voice (Mock)</>
                )}
              </Button>
              {textForSimulatedClonedVoiceRef.current && (
                <div className="mt-4 space-y-2 p-4 border rounded-md bg-muted/30 shadow">
                   <Label className="text-base font-semibold text-foreground">Mock Cloned Audio Output:</Label>
                   <Button
                    onClick={handlePlaySimulatedClonedVoice}
                    variant="outline"
                    size="sm"
                    // Disable if any global loading, no text for simulated voice, or standard TTS is speaking
                    disabled={anyLoading || !textForSimulatedClonedVoiceRef.current || isSpeakingRef.current}
                   >
                     {isCurrentSimulatedClonedVoiceSpeaking ? <><StopCircle className="mr-2 h-4 w-4" />Stop Simulated Voice</> : <><Volume2 className="mr-2 h-4 w-4" />Play Simulated Cloned Voice</>}
                   </Button>
                   <p className="text-sm text-muted-foreground">
                     This simulates the cloned voice using your browser's standard text-to-speech with the prepared text that was active during 'cloning'.
                  </p>
                </div>
              )}
              <p className="text-sm text-muted-foreground pt-2">
                This section demonstrates the UI for voice cloning.
                1. First, use "Process Input for Speech" in the section above to prepare text. This makes the prepared text available.
                2. Then, upload a voice sample here.
                3. Finally, click "Generate Speech with Cloned Voice (Mock)". This simulates a backend voice cloning process and makes the previously prepared text available for simulated playback using the button above. Actual voice cloning is not implemented.
              </p>
            </div>
          </SectionCard>


          <SectionCard title="Face Preprocessing + Lip Sync Video (Audio + Image → Talking Face)" icon={<Smile className="text-primary" />} >
            <div className="space-y-4">
              <div>
                <Label htmlFor="static-face-image-input" className="text-base">Upload a static face image:</Label>
                <Input
                  id="static-face-image-input"
                  type="file"
                  accept="image/*"
                  onChange={handleStaticFaceImageChange} // Resets relevant outputs internally
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
                 // Disable if any global loading, no static face image, or no audio source (neither usable prepared text nor simulated cloned voice text)
                disabled={anyLoading || !staticFaceImage || (!isPreparedTextUsable() && !textForSimulatedClonedVoiceRef.current)}
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
                      key={mockVideoPlayerImage} // Key ensures re-render if src changes to same value but needs refresh
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
                  <div className="mt-3 space-y-2">
                    <p className="text-sm whitespace-pre-wrap text-foreground/80 bg-background/50 p-3 rounded-md shadow-sm">{animatedVideoResult}</p>
                    {/* Playback buttons for the audio used in animation */}
                    {!textForSimulatedClonedVoiceRef.current && isPreparedTextUsable() && isSpeechSupported && (
                       <Button
                         onClick={handleSpeakPreparedText}
                         variant="outline"
                         size="sm"
                         disabled={anyLoading || isSimulatedClonedVoiceSpeakingRef.current || (!isCurrentPreparedTextSpeaking && !isPreparedTextUsable()) }
                        >
                        {isCurrentPreparedTextSpeaking ? <><StopCircle className="mr-2 h-4 w-4" />Stop Animation Audio (TTS)</> : <><Volume2 className="mr-2 h-4 w-4" />Play Animation Audio (TTS)</>}
                      </Button>
                    )}
                    {textForSimulatedClonedVoiceRef.current && isSpeechSupported && (
                       <Button
                        onClick={handlePlaySimulatedClonedVoice}
                        variant="outline"
                        size="sm"
                        disabled={anyLoading || isSpeakingRef.current}
                       >
                         {isCurrentSimulatedClonedVoiceSpeaking ? <><StopCircle className="mr-2 h-4 w-4" />Stop Animation Audio (Simulated)</> : <><Volume2 className="mr-2 h-4 w-4" />Play Animation Audio (Simulated)</>}
                       </Button>
                    )}
                  </div>
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
}

