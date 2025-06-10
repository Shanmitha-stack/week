
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
import { Text, MicVocal, Loader2, ImagePlus, Volume2, StopCircle, AlertTriangle, Film, Sparkles as AiSparkles } from 'lucide-react';
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

  // States for the third section: AI Animated Frame & Speech (Mock)
  const [isGeneratingFrame, setIsGeneratingFrame] = useState<boolean>(false);
  const [animatedFramePreview, setAnimatedFramePreview] = useState<string | null>(null);
  const [animationError, setAnimationError] = useState<string | null>(null);
  const [activeDisplayFrame, setActiveDisplayFrame] = useState<'original' | 'animated' | null>(null);
  const animationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isFlickerAnimationActive, setIsFlickerAnimationActive] = useState<boolean>(false); // Tracks if flicker is running
  const [currentFrameAudioText, setCurrentFrameAudioText] = useState<string | null>(null);


  const { toast } = useToast();

  const isSpeakingRef = useRef(isSpeaking);
  const isSimulatedClonedVoiceSpeakingRef = useRef(isSimulatedClonedVoiceSpeaking);
  const preparedSpeechTextRef = useRef(preparedSpeechText);
  const textForSimulatedClonedVoiceRef = useRef(textForSimulatedClonedVoice);
  const speakingTextRef = useRef(speakingText);
  const imagePreviewRef = useRef<string | null>(null);
  const animatedFramePreviewRef = useRef<string | null>(null);


  useEffect(() => {
    imagePreviewRef.current = imagePreview;
    if (!imagePreview) { 
      setAnimatedFramePreview(null);
      setAnimationError(null);
      if (isFlickerAnimationActive) stopFlickerAnimation(); // Check if flicker is active before stopping
      setActiveDisplayFrame(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imagePreview, isFlickerAnimationActive]); // Added isFlickerAnimationActive to deps

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
      if (animationIntervalRef.current) { // Clear interval on unmount
        clearInterval(animationIntervalRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const stopFlickerAnimation = useCallback(() => {
    if (animationIntervalRef.current) {
      clearInterval(animationIntervalRef.current);
      animationIntervalRef.current = null;
    }
    setIsFlickerAnimationActive(false);
    // Settle on the animated frame if available, otherwise original, or nothing.
    if (animatedFramePreviewRef.current) {
        setActiveDisplayFrame('animated');
        console.log("Flicker animation stopped. Settled on: animated");
    } else if (imagePreviewRef.current) {
        setActiveDisplayFrame('original');
        console.log("Flicker animation stopped. Settled on: original");
    } else {
        setActiveDisplayFrame(null);
        console.log("Flicker animation stopped. Settled on: null");
    }
  }, []);


  const resetOutputsDependentOnTextOrImage = useCallback(() => {
    setPreparedSpeechText(null);
    setTextForSimulatedClonedVoice(null); 
    
    setAnimatedFramePreview(null);
    setAnimationError(null);
    if (isFlickerAnimationActive) stopFlickerAnimation();
    setActiveDisplayFrame(null);
    setCurrentFrameAudioText(null);


    if (typeof window !== 'undefined' && window.speechSynthesis && (isSpeakingRef.current || isSimulatedClonedVoiceSpeakingRef.current)) {
        window.speechSynthesis.cancel(); 
    }
    setIsSpeaking(false);
    setSpeakingText(null);
    setIsSimulatedClonedVoiceSpeaking(false);
  }, [stopFlickerAnimation, isFlickerAnimationActive]);


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
    if (isFlickerAnimationActive) stopFlickerAnimation();
    if (animatedFramePreviewRef.current) setActiveDisplayFrame('animated');
    else if (imagePreviewRef.current) setActiveDisplayFrame('original');


    setIsGeneratingSpeech(true);
    setPreparedSpeechText(null); 
    setTextForSimulatedClonedVoice(null);
    setAnimatedFramePreview(null); 
    setAnimationError(null);
    setCurrentFrameAudioText(null);


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
    setAnimatedFramePreview(null); 
    setAnimationError(null);
    if (isFlickerAnimationActive) stopFlickerAnimation();
    if (imagePreviewRef.current) setActiveDisplayFrame('original');

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
    if (isFlickerAnimationActive) stopFlickerAnimation(); 
    if (animatedFramePreviewRef.current) setActiveDisplayFrame('animated');
    else if (imagePreviewRef.current) setActiveDisplayFrame('original');
    
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

  }, [isSpeechSupported, toast]);

  const anyLoading = isGeneratingSpeech || isCloningVoice || isGeneratingFrame;
  
  const isUsablePreparedTextAvailable = () => 
    preparedSpeechTextRef.current && 
    preparedSpeechTextRef.current.trim() !== "" && 
    !preparedSpeechTextRef.current.toLowerCase().startsWith("no text was provided") && 
    !preparedSpeechTextRef.current.toLowerCase().startsWith("error:");

  const isUsableClonedTextAvailable = () =>
    textForSimulatedClonedVoiceRef.current && textForSimulatedClonedVoiceRef.current.trim() !== "";

  const isTextAvailableForAIFrameSection = isUsablePreparedTextAvailable() || isUsableClonedTextAvailable();

  const currentAnimatedFrameTextIsSpeaking = isSpeaking && currentFrameAudioText && speakingText === currentFrameAudioText;

  const handleGenerateAnimatedFrameAndSpeak = async () => {
    console.log("Attempting to generate animated frame and speak...");
    let textToSpeakForFrame: string | null = null;
    if (isUsableClonedTextAvailable() && textForSimulatedClonedVoiceRef.current) {
      textToSpeakForFrame = textForSimulatedClonedVoiceRef.current;
    } else if (isUsablePreparedTextAvailable() && preparedSpeechTextRef.current) {
      textToSpeakForFrame = preparedSpeechTextRef.current;
    }

    // If the button is clicked while this specific audio is playing (and flicker is active)
    if (currentAnimatedFrameTextIsSpeaking) {
      console.log("Currently speaking/animating this frame. Stopping it.");
      stopFlickerAnimation();
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        window.speechSynthesis.cancel(); // This will trigger utterance.onend or onerror
      }
      // Explicitly reset speech states as utterance.onend might be delayed
      setIsSpeaking(false);
      setSpeakingText(null);
      setCurrentFrameAudioText(null); // Clear the audio text associated with the frame
      return; 
    }
    
    if (!selectedImage || !imagePreviewRef.current) {
      toast({ title: "Image Required", description: "Please upload an image in the 'Text & Image to Speech Preparation' section.", variant: "destructive" });
      return;
    }
    if (!textToSpeakForFrame) {
      toast({ title: "Audio Text Required", description: "Please use 'Process Input for Speech' or 'Generate Speech with Cloned Voice (Mock)' first.", variant: "destructive" });
      return;
    }

    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false); 
    setSpeakingText(null);
    setIsSimulatedClonedVoiceSpeaking(false); 
    if (isFlickerAnimationActive) stopFlickerAnimation(); 
    
    setIsGeneratingFrame(true);
    setAnimatedFramePreview(null); 
    setAnimationError(null);
    setCurrentFrameAudioText(textToSpeakForFrame); 
    toast({ title: "Generating AI Frame...", description: "AI is creating an expressive frame..." });

    try {
      const textSnippet = textToSpeakForFrame.substring(0, 75); 
      const animationPrompt = `Your task is to generate a single, expressive keyframe image of the person in the provided photo. This keyframe should depict them frozen mid-speech, as if they are just starting to speak the given text. CRITICAL: The mouth shape (viseme) and overall facial expression MUST precisely match the very first sounds/phonemes of the text: "${textSnippet}". The expression should also convey the appropriate emotion for this initial part of the text. Make it look like a high-quality animation cel ready for a speaking scene.`;
      
      console.log("Calling generateAnimatedFrame with prompt:", animationPrompt);
      const { generatedFrameDataUri, errorMessage } = await generateAnimatedFrame({
        originalImageDataUri: imagePreviewRef.current,
        animationPrompt: animationPrompt,
      });

      if (errorMessage) {
        throw new Error(errorMessage);
      }

      if (generatedFrameDataUri) {
        setAnimatedFramePreview(generatedFrameDataUri);
        setActiveDisplayFrame('animated'); 
        toast({ title: "AI Frame Ready!", description: "Preparing to speak...", duration: 2000 });

        if (isSpeechSupported && imagePreviewRef.current && generatedFrameDataUri) {
          console.log("Starting flicker animation and speech.");
          setActiveDisplayFrame('original'); 
          setIsFlickerAnimationActive(true);

          animationIntervalRef.current = setInterval(() => {
            setActiveDisplayFrame(prev => (prev === 'original' ? 'animated' : 'original'));
          }, 300); 

          setTimeout(() => {
            if (!isFlickerAnimationActive || currentFrameAudioText !== textToSpeakForFrame) {
                console.log("Flicker or text changed before speech could start. Aborting speech for this frame.");
                if (!isFlickerAnimationActive) {
                    setIsSpeaking(false);
                    setSpeakingText(null);
                    // stopFlickerAnimation(); // Already handled if !isFlickerAnimationActive is false
                }
                return;
            }

            const utterance = new SpeechSynthesisUtterance(textToSpeakForFrame);
            utterance.onstart = () => {
              console.log("Speech started for animated frame.");
              setIsSpeaking(true); 
              setSpeakingText(textToSpeakForFrame); 
              setIsSimulatedClonedVoiceSpeaking(false);
            };
            utterance.onend = () => {
              console.log("Speech ended for animated frame.");
              setIsSpeaking(false);
              setSpeakingText(null);
              stopFlickerAnimation(); // Stop flicker when speech ends
            };
            utterance.onerror = (event) => {
              console.error("Speech error for animated frame:", event.error);
              if (event.error === 'interrupted') {
                toast({ title: "Speech Interrupted", description: "Animated frame speech was interrupted.", variant: "default" });
              } else {
                toast({ title: "Speech Error", description: `Could not play speech for animated frame. (Error: ${event.error || 'unknown'})`, variant: "destructive" });
              }
              setIsSpeaking(false);
              setSpeakingText(null);
              stopFlickerAnimation(); // Stop flicker on speech error
            };
            window.speechSynthesis.speak(utterance);
          }, 100);
        } else if (!isSpeechSupported) {
             toast({ title: "AI Frame Ready", description: "Browser speech not supported for playback.", variant: "default" });
             // If no speech, flicker would be continuous. Now it won't start or will be stopped.
             // We can decide to not start flicker if no speech, or let it run and user stops it.
             // For now, let's not start flicker if speech is not supported.
             if (animatedFramePreview) setActiveDisplayFrame('animated'); // Show the generated frame
        }

      } else {
        throw new Error("AI generation succeeded but returned no image.");
      }

    } catch (error: any) {
      console.error('[GenerateAnimatedFrame] Error:', error);
      const message = error.message || "Failed to generate or play animated frame.";
      setAnimationError(message);
      setActiveDisplayFrame('original'); 
      toast({ title: "Animation Error", description: message, variant: "destructive" });
      setCurrentFrameAudioText(null); 
      if (isFlickerAnimationActive) stopFlickerAnimation();
    } finally {
      setIsGeneratingFrame(false);
    }
  };
  
  const currentPreparedTextIsSpeaking = isSpeaking && preparedSpeechText && speakingText === preparedSpeechText;
  const currentSimulatedClonedVoiceIsSpeaking = isSimulatedClonedVoiceSpeaking && textForSimulatedClonedVoice;


  const displayImageSrc = activeDisplayFrame === 'animated' && animatedFramePreview
    ? animatedFramePreview
    : imagePreview; 

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
                {imagePreview && activeDisplayFrame !== 'animated' && !animatedFramePreview && ( 
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
                        disabled={anyLoading || isSimulatedClonedVoiceSpeaking || (isFlickerAnimationActive && !currentPreparedTextIsSpeaking) }
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
                    disabled={anyLoading || (isSpeaking && !isSimulatedClonedVoiceSpeakingRef.current) || (isFlickerAnimationActive && !currentSimulatedClonedVoiceIsSpeaking) }
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

          <SectionCard title="AI Animated Frame & Speech (Mock)" icon={<AiSparkles className="text-primary" />}>
            <div className="space-y-4">
               <div>
                <Label htmlFor="animation-info" className="text-base">Image &amp; Audio Source for Animation:</Label>
                 {imagePreview ? (
                    <p className="text-sm text-muted-foreground mt-1" id="animation-info">
                      Using your uploaded image. Audio will be from "Prepared Text" or "Mock Cloned Audio".
                      AI will generate an expressive "speaking" frame.
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1" id="animation-info">
                      Please upload an image and prepare audio text in the sections above.
                    </p>
                  )}
              </div>

              <Button
                onClick={handleGenerateAnimatedFrameAndSpeak}
                disabled={isGeneratingSpeech || isCloningVoice || (isGeneratingFrame || (!currentAnimatedFrameTextIsSpeaking && (!selectedImage || !isTextAvailableForAIFrameSection))) }
                className="w-full sm:w-auto"
              >
                {isGeneratingFrame ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating AI Frame...</>
                ) : currentAnimatedFrameTextIsSpeaking ? (
                  <><StopCircle className="mr-2 h-4 w-4" /> Stop Speaking</>
                ) : (
                  <><AiSparkles className="mr-2 h-4 w-4" />Generate Animated Frame & Play Speech</>
                )}
              </Button>
              
              <div className="mt-6 p-4 border rounded-md bg-muted/30 shadow relative min-h-[250px]">
                <Label className="text-lg font-semibold text-foreground flex items-center gap-2 mb-2">
                  <AiSparkles className="h-5 w-5"/>
                  Animated Output:
                </Label>
                <div className="bg-black rounded-md flex items-center justify-center aspect-video overflow-hidden min-h-[200px] relative">
                  {isGeneratingFrame ? (
                     <div className="flex flex-col items-center justify-center text-center p-4">
                      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                      <p className="text-lg font-semibold text-white">Generating AI Frame...</p>
                      <p className="text-sm text-gray-300">AI is creating an expressive image.</p>
                    </div>
                  ) : displayImageSrc ? (
                     <Image
                        key={displayImageSrc} 
                        src={displayImageSrc}
                        alt={activeDisplayFrame === 'animated' ? "AI generated speaking frame" : "Original uploaded image"}
                        fill
                        style={{ objectFit: 'contain' }}
                        className="rounded-md bg-black"
                        priority={true} 
                        data-ai-hint={activeDisplayFrame === 'animated' ? "animated frame" : "original image"}
                    />
                  ) : ( 
                    <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-4">
                       <ImagePlus className="h-12 w-12 mb-4 text-muted-foreground/50" data-ai-hint="image placeholder" />
                      <p className="text-lg font-semibold">Animated frame will appear here</p>
                      <p className="text-sm">Upload an image, prepare audio, then click the button above.</p>
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
                    Note: This feature uses AI to generate a "speaking" version of your uploaded image. While audio plays, the display will alternate between your original image and this AI-generated image, creating a flicker animation effect. The animation stops when the audio finishes or is manually stopped. It does not produce a continuous video.
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
