
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
import { Text, MicVocal, Loader2, ImagePlus, Volume2, StopCircle, AlertTriangle, Video, SparklesIcon } from 'lucide-react';
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

  // States for AI Animated Frame section
  const [isGeneratingFrame, setIsGeneratingFrame] = useState<boolean>(false);
  const [animatedFramePreview, setAnimatedFramePreview] = useState<string | null>(null);
  const [animationError, setAnimationError] = useState<string | null>(null);
  const [activeDisplayFrame, setActiveDisplayFrame] = useState<string | null>(null);
  const animationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [currentAnimationTextSource, setCurrentAnimationTextSource] = useState<string | null>(null);
  
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
    if (!imagePreview) { // If original image is removed, clear dependent states
      setAnimatedFramePreview(null);
      setActiveDisplayFrame(null);
      setAnimationError(null);
      setCurrentAnimationTextSource(null);
    } else {
       // If imagePreview is set (or changes), and no animated frame is showing, set active display to original preview
      if (!animatedFramePreviewRef.current) {
        setActiveDisplayFrame(imagePreview);
      }
    }
  }, [imagePreview]);

  useEffect(() => {
    animatedFramePreviewRef.current = animatedFramePreview;
     // If an animated frame is generated, it becomes the primary display unless animation is active
    if (animatedFramePreview && !animationIntervalRef.current) {
      setActiveDisplayFrame(animatedFramePreview);
    }
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
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
        animationIntervalRef.current = null;
      }
    };
  }, []);
  
  const resetOutputsDependentOnTextOrImage = useCallback(() => {
    setPreparedSpeechText(null);
    setTextForSimulatedClonedVoice(null); 
    setAnimatedFramePreview(null);
    setAnimationError(null);
    setCurrentAnimationTextSource(null);
    if (imagePreviewRef.current) {
        setActiveDisplayFrame(imagePreviewRef.current);
    } else {
        setActiveDisplayFrame(null);
    }


    if (typeof window !== 'undefined' && window.speechSynthesis && (isSpeakingRef.current || isSimulatedClonedVoiceSpeakingRef.current)) {
        window.speechSynthesis.cancel(); 
    }
    setIsSpeaking(false);
    setSpeakingText(null);
    setIsSimulatedClonedVoiceSpeaking(false);

    if (animationIntervalRef.current) {
      clearInterval(animationIntervalRef.current);
      animationIntervalRef.current = null;
    }
  }, []);


  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImagePreview(result);
        setActiveDisplayFrame(result); // Set initial display to uploaded image
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

    setIsGeneratingSpeech(true);
    setPreparedSpeechText(null); 
    setTextForSimulatedClonedVoice(null);
    
    setAnimatedFramePreview(null);
    setAnimationError(null);
    setCurrentAnimationTextSource(null);
    if (imagePreviewRef.current) setActiveDisplayFrame(imagePreviewRef.current);
    if (animationIntervalRef.current) clearInterval(animationIntervalRef.current);

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
      if (animationIntervalRef.current) clearInterval(animationIntervalRef.current); // Stop any animation from other sections


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
    setAnimatedFramePreview(null); // Reset animated frame if voice sample changes
    setAnimationError(null);
    setCurrentAnimationTextSource(null);
    if (imagePreviewRef.current) setActiveDisplayFrame(imagePreviewRef.current);


    if (typeof window !== 'undefined' && window.speechSynthesis && (isSpeakingRef.current || isSimulatedClonedVoiceSpeakingRef.current)) {
        window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setSpeakingText(null);
    setIsSimulatedClonedVoiceSpeaking(false);
    if (animationIntervalRef.current) clearInterval(animationIntervalRef.current);
  };

 const isPreparedTextAvailableAndUsable = () => {
    const currentPreparedText = preparedSpeechTextRef.current; // Use ref for up-to-date value
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
    
    setTextForSimulatedClonedVoice(null); 
    setAnimatedFramePreview(null); 
    setAnimationError(null);
    setCurrentAnimationTextSource(null);
    if (imagePreviewRef.current) setActiveDisplayFrame(imagePreviewRef.current);
    if (animationIntervalRef.current) clearInterval(animationIntervalRef.current);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000)); 
      toast({ title: "Mock Voice Cloning", description: "Processing voice sample..." });
      
      await new Promise(resolve => setTimeout(resolve, 1500)); 
      toast({ title: "Mock Voice Cloning", description: "Synthesizing speech with cloned voice..." });
      
      await new Promise(resolve => setTimeout(resolve, 2000)); 

      const stillUsablePreparedText = preparedSpeechTextRef.current; // Check ref again
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
    if (animationIntervalRef.current) clearInterval(animationIntervalRef.current);


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

  const isTextAvailableForAnimation = isUsablePreparedTextAvailable() || isUsableClonedTextAvailable();


  const handleGenerateAnimatedFrameAndSpeak = async () => {
    setAnimationError(null);
    setAnimatedFramePreview(null);
    setCurrentAnimationTextSource(null);
    if (imagePreviewRef.current) setActiveDisplayFrame(imagePreviewRef.current);


    let textToSpeakForAnimation: string | null = null;
    if (isUsableClonedTextAvailable() && textForSimulatedClonedVoiceRef.current) {
      textToSpeakForAnimation = textForSimulatedClonedVoiceRef.current;
    } else if (isUsablePreparedTextAvailable() && preparedSpeechTextRef.current) {
      textToSpeakForAnimation = preparedSpeechTextRef.current;
    }

    if (!imagePreviewRef.current) {
      toast({ title: "Image Required", description: "Please upload an image in the 'Text & Image to Speech Preparation' section.", variant: "destructive" });
      return;
    }
    if (!textToSpeakForAnimation) {
      toast({ title: "Audio Text Required", description: "Please use 'Process Input for Speech' or 'Generate Speech with Cloned Voice (Mock)' first to prepare text for animation.", variant: "destructive" });
      return;
    }
    
    if (typeof window !== 'undefined' && window.speechSynthesis && (window.speechSynthesis.speaking || window.speechSynthesis.pending)) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setSpeakingText(null);
    setIsSimulatedClonedVoiceSpeaking(false);
    if (animationIntervalRef.current) clearInterval(animationIntervalRef.current);

    setIsGeneratingFrame(true);
    toast({ title: "Generating Animated Frame...", description: "AI is creating a speaking pose..." });

    try {
      const textSnippet = textToSpeakForAnimation.substring(0, 150);
      const animationPrompt = `Generate an image of this person speaking the following text with a natural and expressive animation, suitable for the first frame of a short video. Text: "${textSnippet}"`;
      
      const { generatedFrameDataUri, errorMessage } = await generateAnimatedFrame({
        originalImageDataUri: imagePreviewRef.current,
        animationPrompt: animationPrompt,
      });

      if (errorMessage) {
        throw new Error(errorMessage);
      }

      if (generatedFrameDataUri) {
        setAnimatedFramePreview(generatedFrameDataUri);
        setActiveDisplayFrame(generatedFrameDataUri); // Show the generated frame immediately
        setCurrentAnimationTextSource(textToSpeakForAnimation);
        toast({ title: "Frame Generated", description: "Preparing to speak and animate..." });

        // Speak the text
        if (isSpeechSupported) {
            setIsSpeaking(true);
            setSpeakingText(textToSpeakForAnimation); // Set speaking text for this animation
            setIsSimulatedClonedVoiceSpeaking(false);

            setTimeout(() => {
                if (!isSpeakingRef.current || speakingTextRef.current !== textToSpeakForAnimation) {
                    if(isSpeakingRef.current && speakingTextRef.current !== textToSpeakForAnimation) {
                        setIsSpeaking(false);
                        setSpeakingText(null);
                    }
                    if (animationIntervalRef.current) clearInterval(animationIntervalRef.current);
                    setActiveDisplayFrame(animatedFramePreviewRef.current || imagePreviewRef.current);
                    return;
                }

                const utterance = new SpeechSynthesisUtterance(textToSpeakForAnimation!);
                utterance.onstart = () => {
                    console.log("Speech started for animated frame. Starting flicker.");
                    setIsSpeaking(true);
                    setSpeakingText(textToSpeakForAnimation);
                    setIsSimulatedClonedVoiceSpeaking(false);
                    
                    // Start flicker animation
                    if (animationIntervalRef.current) clearInterval(animationIntervalRef.current);
                    setActiveDisplayFrame(imagePreviewRef.current); // Start with original

                    animationIntervalRef.current = setInterval(() => {
                        setActiveDisplayFrame(prev => {
                            const nextFrame = prev === imagePreviewRef.current ? animatedFramePreviewRef.current : imagePreviewRef.current;
                            return nextFrame || imagePreviewRef.current; // Fallback to original image
                        });
                    }, 300); // Flicker speed
                };
                utterance.onend = () => {
                    console.log("Speech ended for animated frame. Stopping flicker.");
                    setIsSpeaking(false);
                    setSpeakingText(null);
                    if (animationIntervalRef.current) clearInterval(animationIntervalRef.current);
                    animationIntervalRef.current = null;
                    // Settle on the generated frame if available, otherwise original
                    setActiveDisplayFrame(animatedFramePreviewRef.current || imagePreviewRef.current); 
                };
                utterance.onerror = (event) => {
                    console.error("Speech error for animated frame:", event.error);
                    if (event.error === 'interrupted') {
                        toast({ title: "Speech Interrupted", description: "Animated frame speech was interrupted.", variant: "default" });
                    } else {
                        toast({ title: "Speech Error", description: `Could not play animated frame speech. (Error: ${event.error || 'unknown'})`, variant: "destructive" });
                    }
                    setIsSpeaking(false);
                    setSpeakingText(null);
                    if (animationIntervalRef.current) clearInterval(animationIntervalRef.current);
                    animationIntervalRef.current = null;
                    setActiveDisplayFrame(animatedFramePreviewRef.current || imagePreviewRef.current);
                };
                window.speechSynthesis.speak(utterance);
            }, 100);
        } else {
            toast({ title: "Frame Generated, Speech Not Supported", description: "Browser speech synthesis not available.", variant: "default" });
        }
      } else {
        throw new Error("AI did not return a frame.");
      }
    } catch (error: any) {
      console.error("[handleGenerateAnimatedFrameAndSpeak] Error:", error);
      const message = error.message || "An unexpected error occurred during frame generation or speech.";
      setAnimationError(message);
      toast({ title: "Animation Error", description: message, variant: "destructive" });
      setActiveDisplayFrame(imagePreviewRef.current); // Revert to original image on error
      if (animationIntervalRef.current) clearInterval(animationIntervalRef.current);

    } finally {
      setIsGeneratingFrame(false);
    }
  };
  
  const currentPreparedTextIsSpeaking = isSpeaking && speakingText === preparedSpeechText && preparedSpeechText !== null;
  const currentSimulatedClonedVoiceIsSpeaking = isSimulatedClonedVoiceSpeaking && !!textForSimulatedClonedVoice;
  
  // Check if the audio being spoken is the one associated with the current animated frame
  const currentAnimatedFrameTextIsSpeaking = 
    isSpeaking &&
    speakingText === currentAnimationTextSource && 
    currentAnimationTextSource !== null &&
    animatedFramePreview !== null;


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
                        disabled={anyLoading || isSimulatedClonedVoiceSpeaking || isGeneratingFrame }
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
                    disabled={anyLoading || (isSpeaking && !isSimulatedClonedVoiceSpeakingRef.current) || isGeneratingFrame }
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

          <SectionCard title="AI Animated Frame & Speech (Mock)" icon={<SparklesIcon className="text-primary" />} >
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
                      Please upload an image in the "Text &amp; Image to Speech Preparation" section. That image will be used for animation.
                    </p>
                  )}
              </div>

              <Button
                onClick={handleGenerateAnimatedFrameAndSpeak}
                disabled={anyLoading || !selectedImage || !isTextAvailableForAnimation || (isSpeaking && !currentAnimatedFrameTextIsSpeaking)}
                className="w-full sm:w-auto"
              >
                {isGeneratingFrame ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating Frame...</>
                ) : currentAnimatedFrameTextIsSpeaking ? (
                  <><StopCircle className="mr-2 h-4 w-4" /> Stop Speaking & Animating</>
                ) : (
                  <><SparklesIcon className="mr-2 h-4 w-4" />Generate Animated Frame & Play Speech</>
                )}
              </Button>
              { !anyLoading && (!selectedImage || !isTextAvailableForAnimation) && (
                <p className="text-xs text-muted-foreground mt-1">
                  To enable: Ensure an image is uploaded, and audio text has been prepared (either via "Process Input for Speech" or "Generate Speech with Cloned Voice (Mock)").
                </p>
              )}
              
              <div className="mt-6 p-4 border rounded-md bg-muted/30 shadow relative">
                <Label className="text-lg font-semibold text-foreground flex items-center gap-2 mb-2">
                  <Video className="h-5 w-5"/> {/* Using Video icon for consistency, though it's an image animation */}
                  Animation Output:
                </Label>
                <div className="bg-black rounded-md flex items-center justify-center aspect-video overflow-hidden min-h-[200px] relative">
                  {isGeneratingFrame && !activeDisplayFrame ? (
                    <div className="flex flex-col items-center justify-center text-center p-4">
                      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                      <p className="text-lg font-semibold text-white">Generating AI Frame...</p>
                      <p className="text-sm text-gray-300">Please wait, AI is working.</p>
                    </div>
                  ) : activeDisplayFrame ? (
                    <Image
                        src={activeDisplayFrame}
                        alt="Animated frame or original image"
                        fill
                        style={{ objectFit: 'contain' }}
                        className="rounded-md"
                        priority={isGeneratingFrame || currentAnimatedFrameTextIsSpeaking} // Prioritize loading if actively generating/animating
                        key={activeDisplayFrame} // Force re-render if src changes
                        data-ai-hint="animated portrait"
                      />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-4">
                       <ImagePlus className="h-12 w-12 mb-4 text-muted-foreground/50" data-ai-hint="image placeholder" />
                      <p className="text-lg font-semibold">Animation will appear here</p>
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

