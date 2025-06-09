
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
import { Text, MicVocal, Loader2, ImagePlus, Volume2, StopCircle, Smile, Video, VideoOff } from 'lucide-react';
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

  const [animatedVideoResult, setAnimatedVideoResult] = useState<string | null>(null);
  const [isAnimatingFace, setIsAnimatingFace] = useState<boolean>(false);
  const [mockVideoPlayerImage, setMockVideoPlayerImage] = useState<string | null>(null);

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
    setAnimatedVideoResult(null);
    setMockVideoPlayerImage(null);

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
    setAnimatedVideoResult(null);
    setMockVideoPlayerImage(null);

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
    
    if (textToSpeak && isPreparedTextUsable()) { 
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
        console.log('[handleSpeakPreparedText] setTimeout: Speaking now with text:', textToSpeak);
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
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
    const currentPreparedTextIsUsableAtStart = isPreparedTextUsable(); 
    console.log('[handleCloneVoiceAndSynthesize] Is prepared text usable at start:', currentPreparedTextIsUsableAtStart);
    const currentPreparedSpeechTextValue = preparedSpeechTextRef.current; 
    console.log('[handleCloneVoiceAndSynthesize] Current preparedSpeechText at start (from ref):', currentPreparedSpeechTextValue);

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
    setAnimatedVideoResult(null);
    setMockVideoPlayerImage(null);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000)); 
      toast({ title: "Mock Voice Cloning", description: "Processing voice sample..." });
      
      await new Promise(resolve => setTimeout(resolve, 1500)); 
      toast({ title: "Mock Voice Cloning", description: "Synthesizing speech with cloned voice..." });
      
      await new Promise(resolve => setTimeout(resolve, 2000)); 

      if (currentPreparedSpeechTextValue && 
          currentPreparedSpeechTextValue.trim() !== "" &&
          !currentPreparedSpeechTextValue.toLowerCase().startsWith("no text was provided") &&
          !currentPreparedSpeechTextValue.toLowerCase().startsWith("error:")
      ) {
        setTextForSimulatedClonedVoice(currentPreparedSpeechTextValue); 
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

  const anyLoading = isGeneratingSpeech || isCloningVoice || isAnimatingFace;

  const hasPreparedTextAudio =
    preparedSpeechText &&
    preparedSpeechText.trim() !== "" &&
    !preparedSpeechText.toLowerCase().startsWith("no text was provided") &&
    !preparedSpeechText.toLowerCase().startsWith("error:");

  const hasSimulatedClonedAudio = !!textForSimulatedClonedVoice;

  const isAudioAvailableForAnimation = hasPreparedTextAudio || hasSimulatedClonedAudio;


  const handleAnimateFace = useCallback(async () => {
    console.log('[handleAnimateFace] Initiated.');
    if (!selectedImage) { 
      toast({ title: "Image Required for Animation", description: "Please upload an image in the 'Text & Image to Speech Preparation' section. That image will be used for animation.", variant: "destructive" });
      console.log('[handleAnimateFace] Aborted: No image uploaded in the first section.');
      return;
    }
    
    const audioSourceForAnimation = textForSimulatedClonedVoice
      ? "simulated cloned audio"
      : (hasPreparedTextAudio ? "prepared speech text" : null);

    console.log('[handleAnimateFace] Determined audioSourceForAnimation:', audioSourceForAnimation);
    console.log('[handleAnimateFace] textForSimulatedClonedVoice (state):', textForSimulatedClonedVoice);
    console.log('[handleAnimateFace] hasPreparedTextAudio (derived state):', hasPreparedTextAudio);
    console.log('[handleAnimateFace] preparedSpeechText (state at animation start):', preparedSpeechText);


    if (!audioSourceForAnimation) {
       toast({ title: "Audio Source Required", description: "Audio source required. Please use 'Process Input for Speech' or 'Generate Speech with Cloned Voice (Mock)' first, then try animating.", variant: "destructive" });
       console.log('[handleAnimateFace] Aborted: No audio source text available (neither prepared text nor simulated cloned audio).');
      return;
    }
    
    if (typeof window !== 'undefined' && window.speechSynthesis && (isSpeakingRef.current || isSimulatedClonedVoiceSpeakingRef.current)) {
        console.log('[handleAnimateFace] Cancelling ongoing speech before animation.');
        window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setSpeakingText(null);
    setIsSimulatedClonedVoiceSpeaking(false);

    setIsAnimatingFace(true);
    setAnimatedVideoResult(null); 
    setMockVideoPlayerImage(null); 

    try {
      toast({ title: "Starting Animation Process", description: "Preprocessing face image..." });
      await new Promise(resolve => setTimeout(resolve, 1500));

      toast({ title: "Processing Animation", description: `Generating lip-sync video with ${audioSourceForAnimation}...` });
      await new Promise(resolve => setTimeout(resolve, 2500));

      const audioContextMessageSegment = textForSimulatedClonedVoice
        ? `simulated cloned audio based on text: "${textForSimulatedClonedVoice.substring(0,70)}..."`
        : (hasPreparedTextAudio && preparedSpeechText ? `prepared speech: "${preparedSpeechText.substring(0, 70)}..."` : "available audio context");

      let voiceInfoSegment = '';
      if (textForSimulatedClonedVoice && selectedVoiceSample) {
        voiceInfoSegment = ` (simulated with custom voice from "${selectedVoiceSample.name}")`;
      } else if (hasPreparedTextAudio && selectedVoiceSample) { 
        voiceInfoSegment = ` (standard browser TTS used, voice sample "${selectedVoiceSample.name}" was noted)`;
      } else if (hasPreparedTextAudio) { 
        voiceInfoSegment = ` (standard browser TTS used)`;
      }

      const mockVideoOutputMessage = `Animation using image "${selectedImage.name}", with ${audioContextMessageSegment}${voiceInfoSegment}. The animated video would be displayed here. (Mock Output)`;
      
      console.log('[handleAnimateFace] Mock processing complete. Setting animation results.');
      setAnimatedVideoResult(mockVideoOutputMessage);
      const placeholderImageUrl = `https://placehold.co/640x360.png?t=${Date.now()}`; 
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
  }, [selectedImage, imagePreview, toast, preparedSpeechText, textForSimulatedClonedVoice, selectedVoiceSample, hasPreparedTextAudio, anyLoading]);

  const currentPreparedTextIsSpeaking = isSpeaking && speakingText === preparedSpeechText && preparedSpeechText !== null;
  const currentSimulatedClonedVoiceIsSpeaking = isSimulatedClonedVoiceSpeaking && textForSimulatedClonedVoice !== null;


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
                        disabled={anyLoading || isSimulatedClonedVoiceSpeaking || (!isPreparedTextUsable() && !currentPreparedTextIsSpeaking) }
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
                />
                 <p className="text-xs text-muted-foreground mt-1 italic">Note: This uploaded sample is for simulation purposes. Playback will use a standard browser voice, not the uploaded sample's voice.</p>
                {selectedVoiceSample && (
                  <p className="text-sm text-muted-foreground mt-1">Selected file: {selectedVoiceSample.name}</p>
                )}
              </div>
              <Button
                onClick={handleCloneVoiceAndSynthesize}
                disabled={anyLoading || !selectedVoiceSample || !isPreparedTextUsable()}
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
                    disabled={anyLoading || !textForSimulatedClonedVoice || isSpeaking}
                   >
                     {currentSimulatedClonedVoiceIsSpeaking ? <><StopCircle className="mr-2 h-4 w-4" />Stop Simulated Voice</> : <><Volume2 className="mr-2 h-4 w-4" />Play Simulated Cloned Voice</>}
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
                onClick={handleAnimateFace}
                disabled={anyLoading || !selectedImage || !isAudioAvailableForAnimation}
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
                      key={mockVideoPlayerImage} 
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
                      <p className="text-sm">Upload an image in the first section and ensure audio (prepared speech or mock cloned) is available, then click "Animate Face".</p>
                    </div>
                  )}
                </div>
                {!isAnimatingFace && animatedVideoResult && (
                  <div className="mt-3 space-y-2">
                    <p className="text-sm whitespace-pre-wrap text-foreground/80 bg-background/50 p-3 rounded-md shadow-sm">{animatedVideoResult}</p>
                    {!textForSimulatedClonedVoice && hasPreparedTextAudio && isSpeechSupported && (
                       <Button
                         onClick={handleSpeakPreparedText}
                         variant="outline"
                         size="sm"
                         disabled={anyLoading || isSimulatedClonedVoiceSpeaking}
                        >
                        {currentPreparedTextIsSpeaking ? <><StopCircle className="mr-2 h-4 w-4" />Stop Animation Audio (TTS)</> : <><Volume2 className="mr-2 h-4 w-4" />Play Animation Audio (TTS)</>}
                      </Button>
                    )}
                    {textForSimulatedClonedVoice && isSpeechSupported && (
                       <Button
                        onClick={handlePlaySimulatedClonedVoice}
                        variant="outline"
                        size="sm"
                        disabled={anyLoading || isSpeaking}
                       >
                         {currentSimulatedClonedVoiceIsSpeaking ? <><StopCircle className="mr-2 h-4 w-4" />Stop Animation Audio (Simulated)</> : <><Volume2 className="mr-2 h-4 w-4" />Play Animation Audio (Simulated)</>}
                       </Button>
                    )}
                  </div>
                )}
              </div>
               <p className="text-sm text-muted-foreground mt-4">
                This section demonstrates the planned UI for lip-syncing an image (uploaded in the first section) with the generated audio (either standard TTS or mock cloned voice). The actual animation processing would be handled by a backend service.
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

