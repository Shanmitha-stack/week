
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
import { Text, MicVocal, Loader2, ImagePlus, Volume2, StopCircle, AlertTriangle, Sparkles } from 'lucide-react';
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

  const [isGeneratingFrame, setIsGeneratingFrame] = useState<boolean>(false);
  const [animatedFramePreview, setAnimatedFramePreview] = useState<string | null>(null);
  const [animationError, setAnimationError] = useState<string | null>(null);
  const [currentFrameAudioText, setCurrentFrameAudioText] = useState<string | null>(null);
  
  const [activeDisplayFrame, setActiveDisplayFrame] = useState<string | null>(null);
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
  const animationErrorRef = useRef(animationError);
  const currentFrameAudioTextRef = useRef(currentFrameAudioText);

  const stopFlickerAnimation = useCallback(() => {
    if (animationIntervalRef.current) {
      clearInterval(animationIntervalRef.current);
      animationIntervalRef.current = null;
    }
    setIsFlickerAnimationActive(false);

    if (animationErrorRef.current && imagePreviewRef.current) {
      setActiveDisplayFrame(imagePreviewRef.current); 
    } else if (animatedFramePreviewRef.current) {
      setActiveDisplayFrame(animatedFramePreviewRef.current); 
    } else if (imagePreviewRef.current) {
      setActiveDisplayFrame(imagePreviewRef.current); 
    } else {
      setActiveDisplayFrame(null); 
    }
  }, []); 


  const startFlickerAnimation = useCallback(() => {
    if (!imagePreviewRef.current || !animatedFramePreviewRef.current || animationErrorRef.current) return;
    stopFlickerAnimation(); 
    setIsFlickerAnimationActive(true);
    
    animationIntervalRef.current = setInterval(() => {
      setActiveDisplayFrame(prev => 
        prev === imagePreviewRef.current ? animatedFramePreviewRef.current : imagePreviewRef.current
      );
    }, 250); 
  }, [stopFlickerAnimation]);


  useEffect(() => {
    currentFrameAudioTextRef.current = currentFrameAudioText;
  }, [currentFrameAudioText]);

  useEffect(() => {
    animationErrorRef.current = animationError;
  }, [animationError]);

  useEffect(() => {
    imagePreviewRef.current = imagePreview;
    if (!imagePreview) { 
      setAnimatedFramePreview(null);
      setActiveDisplayFrame(null);
      if (isFlickerAnimationActive) stopFlickerAnimation();
    } else {
      if (!isFlickerAnimationActive) {
         if (animatedFramePreviewRef.current && (!speakingTextRef.current || speakingTextRef.current !== currentFrameAudioTextRef.current)) {
          setActiveDisplayFrame(animatedFramePreviewRef.current);
        } else {
          setActiveDisplayFrame(imagePreview);
        }
      }
    }
  }, [imagePreview, isFlickerAnimationActive, stopFlickerAnimation]); 

  useEffect(() => {
    animatedFramePreviewRef.current = animatedFramePreview;
     if (!animatedFramePreview && !isFlickerAnimationActive) {
        setActiveDisplayFrame(imagePreviewRef.current); 
    } else if (animatedFramePreview && !isFlickerAnimationActive && (!speakingTextRef.current || speakingTextRef.current !== currentFrameAudioTextRef.current)) {
        setActiveDisplayFrame(animatedFramePreview);
    }
  }, [animatedFramePreview, isFlickerAnimationActive]);


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
          // Voices might load asynchronously
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
      if (isFlickerAnimationActive) stopFlickerAnimation(); // Use ref version if issues, but useCallback should be stable
    };
  }, [isFlickerAnimationActive, stopFlickerAnimation]); // Added stopFlickerAnimation to dependencies
  

  const resetOutputsDependentOnTextOrImage = useCallback(() => {
    setPreparedSpeechText(null);
    setTextForSimulatedClonedVoice(null); 
    
    setAnimatedFramePreview(null);
    setCurrentFrameAudioText(null); 
    setAnimationError(null);
    setActiveDisplayFrame(imagePreviewRef.current); 
    if (isFlickerAnimationActive) stopFlickerAnimation();


    if (typeof window !== 'undefined' && window.speechSynthesis && (isSpeakingRef.current || isSimulatedClonedVoiceSpeakingRef.current)) {
        window.speechSynthesis.cancel(); 
    }
    setIsSpeaking(false);
    setSpeakingText(null);
    setIsSimulatedClonedVoiceSpeaking(false);
  }, [stopFlickerAnimation, isFlickerAnimationActive]); // Added stopFlickerAnimation to dependencies


  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImagePreview(result);
        setActiveDisplayFrame(result);
      };
      reader.onerror = () => {
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
    
    setAnimatedFramePreview(null); 
    setAnimationError(null);
    setActiveDisplayFrame(imagePreviewRef.current);


    setIsGeneratingSpeech(true);
    setPreparedSpeechText(null); 
    setTextForSimulatedClonedVoice(null); 
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

    if (isSpeakingRef.current && speakingTextRef.current === textToSpeak && !isFlickerAnimationActive) { 
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
      if (isFlickerAnimationActive) stopFlickerAnimation(); 

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
  }, [isSpeechSupported, toast, stopFlickerAnimation, isFlickerAnimationActive]); 


  const handleVoiceSampleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) setSelectedVoiceSample(file);
    else setSelectedVoiceSample(null);
    
    setTextForSimulatedClonedVoice(null);
    if (isFlickerAnimationActive) stopFlickerAnimation(); 


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
    if (isFlickerAnimationActive) stopFlickerAnimation(); 
    
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

  }, [isSpeechSupported, toast, stopFlickerAnimation, isFlickerAnimationActive]);

  const anyLoading = isGeneratingSpeech || isCloningVoice || isGeneratingFrame;
  
  const isUsablePreparedTextAvailable = () => 
    preparedSpeechTextRef.current && 
    preparedSpeechTextRef.current.trim() !== "" && 
    !preparedSpeechTextRef.current.toLowerCase().startsWith("no text was provided") && 
    !preparedSpeechTextRef.current.toLowerCase().startsWith("error:");

  const isUsableClonedTextAvailable = () =>
    textForSimulatedClonedVoiceRef.current && textForSimulatedClonedVoiceRef.current.trim() !== "";

  const getTextForAIFrame = () => {
    if (isUsableClonedTextAvailable() && textForSimulatedClonedVoiceRef.current) {
      return textForSimulatedClonedVoiceRef.current;
    } else if (isUsablePreparedTextAvailable() && preparedSpeechTextRef.current) {
      return preparedSpeechTextRef.current;
    }
    return null;
  };
  
  const isTextAvailableForAIFrameSection = !!getTextForAIFrame();


  const handleGenerateAnimatedFrameAndSpeak = async () => {
    const textToSpeakForFrame = getTextForAIFrame();
    
    const currentAudioIsActiveAndAnimating = isSpeakingRef.current && 
                                           speakingTextRef.current === textToSpeakForFrame && 
                                           isFlickerAnimationActive;
    if (currentAudioIsActiveAndAnimating) {
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        window.speechSynthesis.cancel(); 
      }
      setIsSpeaking(false);
      setSpeakingText(null);
      stopFlickerAnimation(); 
      // Since speech is stopped, also ensure loading state is false if it was tied to this action
      if (isGeneratingFrame) setIsGeneratingFrame(false);
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
    setActiveDisplayFrame(imagePreviewRef.current); 
    setCurrentFrameAudioText(textToSpeakForFrame); 
    toast({ title: "Generating AI Frame...", description: "AI is creating an expressive frame..." });

    let generatedFrameDataUri: string | null = null;
    let flowErrorType: GenerateAnimatedFrameOutput['errorType'] = undefined;
    let flowErrorMessage: string | null = null;
    let userFriendlyAiMessage: string | null = null;

    try {
      const textSnippet = textToSpeakForFrame.substring(0, 150); 
      const animationPrompt = `Your primary task is to transform the provided static photo into a single, highly expressive keyframe image. This new image must depict the person as if they are frozen mid-sentence, actively speaking the initial words of this text: "${textSnippet}". CRITICALLY, the generated image needs to show *clear visual changes* from the original photo, especially in the mouth shape (viseme) to precisely match the first phonemes of the text, and in the eye expression to convey engagement in speech. The overall facial expression should be dynamic and appropriate for the act of speaking these initial words. The output MUST be the generated image.`;
      
      const result = await generateAnimatedFrame({
          originalImageDataUri: imagePreviewRef.current,
          animationPrompt: animationPrompt,
      });

      generatedFrameDataUri = result.generatedFrameDataUri || null;
      flowErrorType = result.errorType;
      flowErrorMessage = result.errorMessage || null;

      if (generatedFrameDataUri) {
        setAnimatedFramePreview(generatedFrameDataUri);
        setAnimationError(null); 
        setActiveDisplayFrame(generatedFrameDataUri);
      } else if (flowErrorMessage) {
        userFriendlyAiMessage = flowErrorType === 'AI_DID_NOT_RETURN_IMAGE' ?
            "The AI couldn't create an image for this request. This can happen sometimes. You could try again, perhaps with different text or a slightly different image."
            : flowErrorMessage;
        
        if (flowErrorType === 'AI_DID_NOT_RETURN_IMAGE') {
            console.warn('[GenerateAnimatedFrame] AI Flow Info (Model did not return image):', flowErrorMessage);
        } else {
            console.error(`[GenerateAnimatedFrame] AI Flow Error (${flowErrorType || 'Unknown'}):`, flowErrorMessage);
        }
        setAnimationError(userFriendlyAiMessage);
        setAnimatedFramePreview(null);
        setActiveDisplayFrame(imagePreviewRef.current); 
      } else { 
        const unexpectedMsg = "AI frame generation completed without an image or a specific error message.";
        console.warn('[GenerateAnimatedFrame] Unexpected outcome from AI flow:', unexpectedMsg);
        setAnimationError(unexpectedMsg);
        userFriendlyAiMessage = unexpectedMsg;
        setAnimatedFramePreview(null);
        setActiveDisplayFrame(imagePreviewRef.current); 
      }

      if (isSpeechSupported && textToSpeakForFrame) {
        setTimeout(() => {
          if (currentFrameAudioTextRef.current !== textToSpeakForFrame) {
            setIsGeneratingFrame(false); // Stop loading if context changed before speech
            return; 
          }

          let toastDesc = "Speaking...";
          let toastTitle = "AI Frame Ready!";
          let toastVariant: "default" | "destructive" = "default";

          if (generatedFrameDataUri) {
            // toastTitle already "AI Frame Ready!"
          } else if (flowErrorMessage) { 
            toastTitle = flowErrorType === 'AI_DID_NOT_RETURN_IMAGE' ? "AI Image Not Generated" : "Animation Error";
            toastDesc = `${userFriendlyAiMessage || flowErrorMessage}. Now speaking the text.`;
            toastVariant = flowErrorType === 'AI_DID_NOT_RETURN_IMAGE' ? "default" : "destructive";
          } else { 
            toastTitle = "Speaking Text";
            toastDesc = "Playing audio. Frame generation had an unexpected outcome.";
          }
          toast({ title: toastTitle, description: toastDesc, variant: toastVariant, duration: generatedFrameDataUri ? 3000: 5000 });

          const utterance = new SpeechSynthesisUtterance(textToSpeakForFrame!);
          utterance.onstart = () => {
              setIsSpeaking(true); 
              setSpeakingText(textToSpeakForFrame); 
              setIsSimulatedClonedVoiceSpeaking(false);
              if(animatedFramePreviewRef.current && !animationErrorRef.current) {
                  startFlickerAnimation();
              } else {
                  setActiveDisplayFrame(imagePreviewRef.current); 
                  stopFlickerAnimation(); 
              }
          };
          utterance.onend = () => {
              setIsSpeaking(false);
              setSpeakingText(null);
              stopFlickerAnimation();
              setIsGeneratingFrame(false); 
          };
          utterance.onerror = (event) => {
              const speechErrorMsg = `Speech error: ${event.error || 'unknown'}`;
              console.error('[GenerateAnimatedFrame] Speech Synthesis Error:', speechErrorMsg);
              if (!animationErrorRef.current) { 
                  setAnimationError(speechErrorMsg);
                  toast({ title: "Speech Error", description: speechErrorMsg, variant: "destructive" });
              } else {
                  toast({ title: "Speech Error during Animation", description: speechErrorMsg, variant: "destructive" });
              }
              setIsSpeaking(false);
              setSpeakingText(null);
              stopFlickerAnimation();
              setIsGeneratingFrame(false); 
          };
          window.speechSynthesis.speak(utterance);
        }, 100); 
      } else { // Speech not supported or no text available
          setIsGeneratingFrame(false); 
          if (textToSpeakForFrame && !isSpeechSupported) {
              let toastDesc = "Browser speech not supported for playback.";
              let toastTitle = generatedFrameDataUri ? "AI Frame Ready" : (flowErrorMessage ? (flowErrorType === 'AI_DID_NOT_RETURN_IMAGE' ? "AI Image Not Generated" : "Animation Error") : "Text Ready");
              let toastVariant : "default" | "destructive" = (flowErrorMessage && flowErrorType !== 'AI_DID_NOT_RETURN_IMAGE') ? "destructive" : "default";
              if (flowErrorMessage && !generatedFrameDataUri) {
                toastDesc = `${userFriendlyAiMessage || flowErrorMessage}. Browser speech not supported.`;
              } else if (!generatedFrameDataUri && !flowErrorMessage) {
                toastDesc = "Browser speech not supported. Frame generation had an unexpected outcome.";
              }
              toast({ title: toastTitle, description: toastDesc, variant: toastVariant });
          } else if (!textToSpeakForFrame) {
             toast({ title: "Nothing to Animate/Speak", description: "No text available from previous steps for animation.", variant: "default" });
          }
          // Ensure correct frame is displayed if speech is skipped
          if (generatedFrameDataUri) setActiveDisplayFrame(generatedFrameDataUri); 
          else if (imagePreviewRef.current) setActiveDisplayFrame(imagePreviewRef.current);
      }
    } catch (error: any) { 
      console.error('[GenerateAnimatedFrame] General client-side processing error:', error);
      const message = error.message || "An unexpected client-side error occurred during frame generation.";
      setAnimationError(message);
      toast({ title: "Client Error", description: message, variant: "destructive" });
      setAnimatedFramePreview(null);
      setActiveDisplayFrame(imagePreviewRef.current); 
      setIsGeneratingFrame(false); 
    } 
    // Note: isGeneratingFrame is now set to false within each logical path:
    // 1. Inside speech utterance.onend/onerror.
    // 2. If speech is skipped (e.g., not supported, no text).
    // 3. In the main catch block for broader errors.
  };
  
  const currentPreparedTextIsSpeaking = isSpeaking && preparedSpeechText && speakingText === preparedSpeechText && !isFlickerAnimationActive;
  const currentSimulatedClonedVoiceIsSpeaking = isSimulatedClonedVoiceSpeaking && textForSimulatedClonedVoice && !isFlickerAnimationActive;
  const currentAnimatedFrameTextIsSpeakingAndAnimating = isSpeaking && currentFrameAudioText && speakingText === currentFrameAudioText && isFlickerAnimationActive;


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
                        disabled={anyLoading || isSimulatedClonedVoiceSpeaking || currentAnimatedFrameTextIsSpeakingAndAnimating}
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
                    disabled={anyLoading || (isSpeaking && !isSimulatedClonedVoiceSpeakingRef.current && !isFlickerAnimationActive) || currentAnimatedFrameTextIsSpeakingAndAnimating}
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

          <SectionCard title="AI Animated Frame &amp; Speech (Mock)" icon={<Sparkles className="text-primary" />}>
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
                disabled={isGeneratingSpeech || isCloningVoice || (isGeneratingFrame || (!selectedImage || !isTextAvailableForAIFrameSection))}
                className="w-full sm:w-auto"
              >
                {isGeneratingFrame ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating AI Frame...</>
                ) : currentAnimatedFrameTextIsSpeakingAndAnimating ? (
                  <><StopCircle className="mr-2 h-4 w-4" /> Stop Speaking</>
                ) : (
                  <><Sparkles className="mr-2 h-4 w-4" />Generate Animated Frame &amp; Play Speech</>
                )}
              </Button>
              
              <div className="mt-6 p-4 border rounded-md bg-muted/30 shadow relative min-h-[250px]">
                <Label className="text-lg font-semibold text-foreground flex items-center gap-2 mb-2">
                  <Sparkles className="h-5 w-5"/>
                  Animated Output:
                </Label>
                <div className="bg-black rounded-md flex items-center justify-center aspect-video overflow-hidden min-h-[200px] relative">
                  {isGeneratingFrame && !activeDisplayFrame && !animationError ? ( 
                     <div className="flex flex-col items-center justify-center text-center p-4">
                      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                      <p className="text-lg font-semibold text-white">Generating AI Frame...</p>
                      <p className="text-sm text-gray-300">AI is creating an expressive image.</p>
                    </div>
                  ) : activeDisplayFrame ? (
                     <Image
                        key={activeDisplayFrame} 
                        src={activeDisplayFrame}
                        alt={isFlickerAnimationActive ? "Animated speaking sequence" : (animatedFramePreview && activeDisplayFrame === animatedFramePreview ? "AI generated speaking frame" : "Original uploaded image")}
                        fill
                        style={{ objectFit: 'contain' }}
                        className="rounded-md bg-black"
                        priority={true} 
                        data-ai-hint={isFlickerAnimationActive ? "animated frame" : (animatedFramePreview && activeDisplayFrame === animatedFramePreview ? "speaking frame" : "original image")}
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

