
"use client";

import React, { useState, ChangeEvent, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


export default function Home() {
  const searchParams = useSearchParams(); 

  const [textInput, setTextInput] = useState<string>('');
  const [isGeneratingSpeech, setIsGeneratingSpeech] = useState<boolean>(false);

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [preparedSpeechText, setPreparedSpeechText] = useState<string | null>(null);

  const [selectedVoiceSample, setSelectedVoiceSample] = useState<File | null>(null);
  const [isCloningVoice, setIsCloningVoice] = useState<boolean>(false);
  const [textForSimulatedClonedVoice, setTextForSimulatedClonedVoice] = useState<string | null>(null);
  const [isSimulatedClonedVoiceSpeaking, setIsSimulatedClonedVoiceSpeaking] = useState<boolean>(false);


  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [speakingText, setSpeakingText] = useState<string | null>(null);
  const [isSpeechSupported, setIsSpeechSupported] = useState<boolean>(false);

  const [staticFaceImage, setStaticFaceImage] = useState<File | null>(null);
  const [staticFaceImagePreview, setStaticFaceImagePreview] = useState<string | null>(null);
  const [animatedVideoResult, setAnimatedVideoResult] = useState<string | null>(null);
  const [isAnimatingFace, setIsAnimatingFace] = useState<boolean>(false);
  const [mockVideoPlayerImage, setMockVideoPlayerImage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);


  const { toast } = useToast();

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

      logVoices(); // Initial check
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => {
          console.log('Speech synthesis voices changed.');
          logVoices();
        };
      } else {
        // Fallback for browsers that don't support onvoiceschanged well
        setTimeout(logVoices, 500); 
      }

    } else {
      setIsSpeechSupported(false);
      console.warn('Speech synthesis not supported by this browser.');
    }

    // Cleanup function
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis) {
         // Cancel any ongoing or pending speech
         if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
          window.speechSynthesis.cancel();
        }
        // Remove the event listener
        window.speechSynthesis.onvoiceschanged = null; 
      }
      // Reset related states
      setIsSpeaking(false);
      setSpeakingText(null);
      setIsSimulatedClonedVoiceSpeaking(false);
    };
  }, []); // Empty dependency array ensures this runs once on mount and cleans up on unmount
  
  useEffect(() => {
    const getCameraPermission = async () => {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({video: true});
          setHasCameraPermission(true);

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (error) {
          console.error('Error accessing camera:', error);
          setHasCameraPermission(false);
          toast({
            variant: 'destructive',
            title: 'Camera Access Denied',
            description: 'Please enable camera permissions in your browser settings to use this app.',
          });
        }
      } else {
        setHasCameraPermission(false);
        // This case implies navigator.mediaDevices is not available (e.g., non-secure context or very old browser)
        console.log("Camera access not attempted: navigator.mediaDevices not available.");
      }
    };

    // getCameraPermission(); // Call only when the relevant section is active or needed.
                          // For now, let's assume it's triggered by a user action.
  }, [toast]);


  const resetAllOutputs = () => {
    setPreparedSpeechText(null);
    setAnimatedVideoResult(null);
    setMockVideoPlayerImage(null);
    setTextForSimulatedClonedVoice(null);
    setSelectedImage(null);
    setImagePreview(null);

    // Cancel any ongoing speech synthesis
    if (typeof window !== 'undefined' && window.speechSynthesis && (window.speechSynthesis.speaking || window.speechSynthesis.pending)) {
      window.speechSynthesis.cancel();
    }
    // Reset speech-related states
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
    setPreparedSpeechText(null); // Crucial reset
    setAnimatedVideoResult(null);
    setMockVideoPlayerImage(null);
    setTextForSimulatedClonedVoice(null);

    // Cancel any ongoing speech synthesis
    if (typeof window !== 'undefined' && window.speechSynthesis && (isSpeaking || isSimulatedClonedVoiceSpeaking)) {
        window.speechSynthesis.cancel();
    }
    // Reset speech-related states
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
    if (!textInput.trim() && !selectedImage) {
      toast({ title: "Input Required", description: "Please enter some text or select an image.", variant: "destructive" });
      return;
    }

    // Cancel any ongoing speech from any source and reset states
    if (typeof window !== 'undefined' && window.speechSynthesis && (window.speechSynthesis.speaking || window.speechSynthesis.pending) ) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setSpeakingText(null);
    setIsSimulatedClonedVoiceSpeaking(false);    

    setIsGeneratingSpeech(true);
    // Clear previous outputs that will be regenerated or made irrelevant
    setPreparedSpeechText(null); 
    setAnimatedVideoResult(null); 
    setMockVideoPlayerImage(null);
    setTextForSimulatedClonedVoice(null); // If new text is prepared, old cloned voice association is invalid


    let imageDataUri: string | undefined = undefined;
    if (selectedImage) {
      try {
        imageDataUri = await toDataURL(selectedImage);
      } catch (error) {
        console.error("Error converting image to data URI:", error);
        toast({ title: "Image Error", description: "Failed to process image. Please try another.", variant: "destructive" });
        setIsGeneratingSpeech(false);
        return;
      }
    }

    try {
      const { preparedText } = await prepareTextForSpeech({ text: textInput, imageDataUri });
      setPreparedSpeechText(preparedText);

      // Determine if speech should be auto-played
      const shouldSpeak = preparedText &&
                          preparedText.trim() !== "" &&
                          !preparedText.toLowerCase().startsWith("no text was provided") &&
                          !preparedText.toLowerCase().startsWith("error:");

      if (isSpeechSupported && shouldSpeak) {
        // Use setTimeout to ensure any pending cancel() operations have completed
        setTimeout(() => {
            const utterance = new SpeechSynthesisUtterance(preparedText);
            utterance.onstart = () => {
              setIsSpeaking(true);
              setSpeakingText(preparedText);
              setIsSimulatedClonedVoiceSpeaking(false); // Ensure other speech type is off
            };
            utterance.onend = () => {
              setIsSpeaking(false);
              setSpeakingText(null);
            };
            utterance.onerror = (event) => {
              console.error("Speech synthesis error (handleTextToSpeech). Code:", event.error, "Event details:", event);
              toast({ title: "Speech Error", description: "Could not play speech automatically. You can try the 'Speak' button.", variant: "destructive" });
              setIsSpeaking(false);
              setSpeakingText(null);
            };
            window.speechSynthesis.speak(utterance);
        }, 100); // 100ms delay

        toast({
          title: "Processing Complete",
          description: "Speaking the prepared text...",
          duration: 3000,
        });
      } else if (shouldSpeak) {
        // Speech supported but not auto-playing (or shouldSpeak is false but text is valid)
        toast({
          title: "Input Processed",
          description: `Prepared text: "${preparedText.substring(0,100)}${preparedText.length > 100 ? '...' : ''}". Browser speech synthesis not supported or text not suitable for auto-play.`,
          duration: 6000,
        });
      } else {
         // No valid text to speak (e.g., "No text was provided")
         toast({
          title: "Input Processed",
          description: preparedText || "An issue occurred while preparing text.", // Show the actual message from Genkit
          duration: 6000,
        });
      }
    } catch (error) {
      console.error("Error in text-to-speech process:", error);
      const errorMessage = "Error: Could not process input for speech.";
      setPreparedSpeechText(errorMessage); // Show error in the UI
      toast({ title: "Processing Error", description: error instanceof Error ? `${errorMessage} ${error.message}`: errorMessage, variant: "destructive" });
    } finally {
      setIsGeneratingSpeech(false);
    }
  };

  // Memoize this for stable reference in button's disabled prop
  const isPreparedTextUsable = useCallback(() => {
    return preparedSpeechText &&
           preparedSpeechText.trim() !== "" &&
           !preparedSpeechText.toLowerCase().startsWith("no text was provided") &&
           !preparedSpeechText.toLowerCase().startsWith("error:");
  }, [preparedSpeechText]);

  const handleSpeakPreparedText = useCallback(() => {
    if (!isSpeechSupported) {
      toast({ title: "Speech Not Supported", description: "Your browser does not support speech synthesis.", variant: "destructive" });
      return;
    }

    const textToSpeak = preparedSpeechText;

    // If already speaking this specific text, stop it
    if (isSpeaking && speakingText === textToSpeak) { 
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setSpeakingText(null);
      return;
    }
    
    // If trying to speak new text, or replay, and it's usable
    if (textToSpeak && isPreparedTextUsable()) {
      // Cancel any ongoing speech (from any source) and reset all speech states
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        window.speechSynthesis.cancel();
      }
      setIsSpeaking(false); // Ensure this is false before starting new
      setSpeakingText(null);
      setIsSimulatedClonedVoiceSpeaking(false); // Ensure other speech type is off

      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.onstart = () => {
          setIsSpeaking(true);
          setSpeakingText(textToSpeak);
          setIsSimulatedClonedVoiceSpeaking(false); // Explicitly turn off other speech type
        };
        utterance.onend = () => {
          setIsSpeaking(false);
          setSpeakingText(null);
        };
        utterance.onerror = (event) => {
          console.error("Speech synthesis error (from Speak button). Code:", event.error, "Event details:", event);
          toast({ title: "Speech Error", description: "Could not play speech. Please try again.", variant: "destructive" });
          setIsSpeaking(false);
          setSpeakingText(null);
        };
        window.speechSynthesis.speak(utterance);
      }, 100); // 100ms delay
    } else {
      toast({ title: "Nothing to Speak", description: "There is no suitable prepared text to speak.", variant: "default" });
    }
  }, [preparedSpeechText, isSpeaking, speakingText, isSpeechSupported, toast, isSimulatedClonedVoiceSpeaking, isPreparedTextUsable]);


  const handleVoiceSampleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) setSelectedVoiceSample(file);
    else setSelectedVoiceSample(null);
    
    // Reset outputs that depend on this input
    setAnimatedVideoResult(null);
    setMockVideoPlayerImage(null);
    setTextForSimulatedClonedVoice(null);

    // Cancel any ongoing speech synthesis
    if (typeof window !== 'undefined' && window.speechSynthesis && (isSpeaking || isSimulatedClonedVoiceSpeaking)) {
        window.speechSynthesis.cancel();
    }
    // Reset speech-related states
    setIsSpeaking(false);
    setSpeakingText(null);
    setIsSimulatedClonedVoiceSpeaking(false);
  };


 const handleCloneVoiceAndSynthesize = async () => {
    // This toast should appear immediately
    toast({ title: "Mock Voice Cloning", description: "Initializing voice cloning process..." });
    setIsCloningVoice(true); // Set loading state for the button

    console.log('[handleCloneVoiceAndSynthesize] Initiated.');
    console.log('[handleCloneVoiceAndSynthesize] Selected voice sample:', selectedVoiceSample?.name);
    const preparedTextIsCurrentlyUsable = isPreparedTextUsable();
    console.log('[handleCloneVoiceAndSynthesize] Is prepared text usable at start:', preparedTextIsCurrentlyUsable);
    console.log('[handleCloneVoiceAndSynthesize] Current preparedSpeechText at start:', preparedSpeechText);


    if (!selectedVoiceSample) {
      toast({ title: "Voice Sample Required", description: "Please select a voice sample.", variant: "destructive" });
      console.warn('[handleCloneVoiceAndSynthesize] Aborted: No voice sample selected.');
      setIsCloningVoice(false);
      return;
    }
    if (!preparedTextIsCurrentlyUsable) {
      toast({ title: "Prepared Speech Text Required", description: "Please process some text for speech first. Voice cloning needs text to synthesize.", variant: "destructive" });
      console.warn('[handleCloneVoiceAndSynthesize] Aborted: Prepared text is not usable.');
      setIsCloningVoice(false);
      return;
    }
    
    // Cancel any ongoing speech from any source and reset states
    if (typeof window !== 'undefined' && window.speechSynthesis && (window.speechSynthesis.speaking || window.speechSynthesis.pending)) {
        console.log('[handleCloneVoiceAndSynthesize] Cancelling ongoing speech before starting mock cloning.');
        window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setSpeakingText(null);
    setIsSimulatedClonedVoiceSpeaking(false);
    
    // Clear outputs that will be regenerated by this process
    setTextForSimulatedClonedVoice(null); 
    setAnimatedVideoResult(null); 
    setMockVideoPlayerImage(null);
    
    try {
      // Simulate backend processing steps
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate initial processing
      toast({ title: "Mock Voice Cloning", description: "Processing voice sample..." });
      
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate voice analysis
      toast({ title: "Mock Voice Cloning", description: "Synthesizing speech with cloned voice..." });
      
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate synthesis

      // Re-check preparedSpeechText usability just before setting it, using the same criteria
      // This is a defensive check; it should ideally be the same as the initial check.
      if (preparedSpeechText && isPreparedTextUsable()) { // Use the function here too
        setTextForSimulatedClonedVoice(preparedSpeechText); 
        console.log('[handleCloneVoiceAndSynthesize] Successfully set textForSimulatedClonedVoice to:', preparedSpeechText);
        toast({ title: "Mock Voice Cloning Complete", description: `Speech based on "${preparedSpeechText.substring(0,50)}..." using voice sample "${selectedVoiceSample.name}" is (mock) ready for simulated playback.` });
      } else {
        // This case means preparedSpeechText became null or unusable during the simulation,
        // or the isPreparedTextUsable criteria changed unexpectedly.
        setTextForSimulatedClonedVoice(null);
        console.error('[handleCloneVoiceAndSynthesize] Error: preparedSpeechText became unusable or null during mock cloning simulation. Current value:', preparedSpeechText);
        toast({ title: "Cloning Error", description: "Prepared text became unavailable during mock cloning. Please try preparing text again.", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error during mock voice cloning simulation:", error);
      toast({ title: "Cloning Error", description: "An unexpected error occurred during mock voice cloning.", variant: "destructive" });
      setTextForSimulatedClonedVoice(null); // Ensure reset on error
    } finally {
      setIsCloningVoice(false);
      console.log('[handleCloneVoiceAndSynthesize] Completed. isCloningVoice set to false.');
    }
  };

  const handlePlaySimulatedClonedVoice = useCallback(() => {
    console.log('[handlePlaySimulatedClonedVoice] triggered.');
    console.log('isSpeechSupported:', isSpeechSupported);
    console.log('textForSimulatedClonedVoice:', textForSimulatedClonedVoice);
    console.log('isSimulatedClonedVoiceSpeaking (current):', isSimulatedClonedVoiceSpeaking);
    console.log('isSpeaking (other TTS):', isSpeaking);

    if (!isSpeechSupported) {
        toast({ title: "Speech Not Supported", description: "Your browser does not support speech synthesis.", variant: "destructive" });
        return;
    }
    if (!textForSimulatedClonedVoice) {
        toast({ title: "Nothing to Play", description: "No text was prepared for simulated cloned voice playback.", variant: "destructive" });
        return;
    }

    // If already speaking with simulated cloned voice, stop it
    if (isSimulatedClonedVoiceSpeaking) { 
        console.log('[handlePlaySimulatedClonedVoice] Attempting to STOP cloned voice.');
        window.speechSynthesis.cancel(); // This cancels ALL speech, which is fine here.
        setIsSimulatedClonedVoiceSpeaking(false);
        // No need to clear speakingText here as it's for the *other* TTS
        return;
    }

    console.log('[handlePlaySimulatedClonedVoice] Attempting to PLAY cloned voice.');
    // Cancel any other ongoing speech (e.g., standard TTS) and reset all speech states
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) { 
        console.log('[handlePlaySimulatedClonedVoice] Cancelling other speech before playing cloned voice.');
        window.speechSynthesis.cancel();
    }
    setIsSpeaking(false); // Ensure standard TTS is marked as not speaking
    setSpeakingText(null);
    setIsSimulatedClonedVoiceSpeaking(false); // Ensure this is false before starting new

    setTimeout(() => {
        console.log('[handlePlaySimulatedClonedVoice] setTimeout: Speaking now with text:', textForSimulatedClonedVoice);
        const utterance = new SpeechSynthesisUtterance(textForSimulatedClonedVoice);
        utterance.onstart = () => {
            console.log('[handlePlaySimulatedClonedVoice] Utterance started.');
            setIsSimulatedClonedVoiceSpeaking(true);
            setIsSpeaking(false); // Explicitly turn off other speech type
            setSpeakingText(null); // Clear text associated with other speech type
        };
        utterance.onend = () => {
            console.log('[handlePlaySimulatedClonedVoice] Utterance ended.');
            setIsSimulatedClonedVoiceSpeaking(false);
        };
        utterance.onerror = (event) => {
            console.error("[handlePlaySimulatedClonedVoice] Speech synthesis error (Simulated Cloned). Code:", event.error, "Event details:", event);
            toast({ title: "Speech Error", description: "Could not play simulated cloned voice. Check console for details.", variant: "destructive" });
            setIsSimulatedClonedVoiceSpeaking(false); // Reset on error
        };
        window.speechSynthesis.speak(utterance);
    }, 100); // 100ms delay

  }, [isSpeechSupported, textForSimulatedClonedVoice, isSimulatedClonedVoiceSpeaking, toast, isSpeaking]);


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
    // Reset animation-specific outputs
    setAnimatedVideoResult(null); 
    setMockVideoPlayerImage(null);
  };

  const handleAnimateFace = async () => {
    if (!staticFaceImage) {
      toast({ title: "Static Face Image Required", description: "Please upload a static face image.", variant: "destructive" });
      return;
    }

    const audioSourceText = textForSimulatedClonedVoice ? "simulated cloned audio" : (isPreparedTextUsable() ? "prepared speech text" : null);
    if (!audioSourceText) {
       toast({ title: "Audio Source Required", description: `Please process text for speech or perform mock voice cloning first. The animation needs an audio context.`, variant: "destructive" });
      return;
    }
    
    // Cancel any ongoing speech and reset states
    if (typeof window !== 'undefined' && window.speechSynthesis && (isSpeaking || isSimulatedClonedVoiceSpeaking)) {
        window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setSpeakingText(null);
    setIsSimulatedClonedVoiceSpeaking(false);

    setIsAnimatingFace(true);
    setAnimatedVideoResult(null); // Clear previous animation results
    setMockVideoPlayerImage(null);

    try {
      toast({ title: "Starting Animation Process", description: "Preprocessing face image..." });
      await new Promise(resolve => setTimeout(resolve, 1500));

      toast({ title: "Processing Animation", description: `Generating lip-sync video with ${audioSourceText}...` });
      await new Promise(resolve => setTimeout(resolve, 2500));

      // Construct a more detailed message based on available audio context
      const audioContextForMessage = textForSimulatedClonedVoice 
        ? `using simulated cloned audio based on text: "${textForSimulatedClonedVoice.substring(0,70)}..."` 
        : (isPreparedTextUsable() && preparedSpeechText ? `using prepared speech: "${preparedSpeechText.substring(0, 70)}..."` : "with available audio");

      let voiceInfo = '';
      if (textForSimulatedClonedVoice && selectedVoiceSample) {
        voiceInfo = ` (simulated with custom voice from "${selectedVoiceSample.name}")`;
      } else if (isPreparedTextUsable() && selectedVoiceSample) { 
        // If prepared text is usable and a voice sample was selected (even if not "cloned" yet for this animation)
        voiceInfo = ` (standard browser TTS used, voice sample "${selectedVoiceSample.name}" was available for context)`;
      } else if (isPreparedTextUsable()) { 
        // Standard TTS, no voice sample involved or relevant here
        voiceInfo = ` (standard browser TTS used)`;
      }


      const mockVideoOutputMessage = `Animation using face image "${staticFaceImage.name}", ${audioContextForMessage}${voiceInfo}. The animated video would be displayed here. (Mock Output)`;
      setAnimatedVideoResult(mockVideoOutputMessage);
      // Use a timestamp to ensure the placeholder image reloads if the src is the same
      setMockVideoPlayerImage("https://placehold.co/640x360.png?" + new Date().getTime()); 

      toast({ title: "Face Animation Complete (Mock)", description: "Mock video result is now available." });
    } catch (error) {
      console.error("Error during face animation process:", error);
      toast({ title: "Animation Error", description: "An unexpected error occurred during face animation.", variant: "destructive" });
    } finally {
      setIsAnimatingFace(false);
    }
  };

  const anyLoading = isGeneratingSpeech || isCloningVoice || isAnimatingFace;
  const isCurrentPreparedTextSpeaking = isSpeaking && speakingText === preparedSpeechText;


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
                    // Reset outputs dependent on textInput
                    setPreparedSpeechText(null);
                    setTextForSimulatedClonedVoice(null); // Text for cloning depends on prepared text
                    setAnimatedVideoResult(null); // Animation depends on audio source
                    setMockVideoPlayerImage(null);
                    // Cancel and reset speech if text input changes
                    if (typeof window !== 'undefined' && window.speechSynthesis && (isSpeaking || isSimulatedClonedVoiceSpeaking)) {
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
                        disabled={anyLoading || isSimulatedClonedVoiceSpeaking || (!isPreparedTextUsable() && !isCurrentPreparedTextSpeaking) }
                      >
                        {isSpeaking && speakingText === preparedSpeechText ? <><StopCircle className="mr-2 h-4 w-4" />Stop Speaking</> : <><Volume2 className="mr-2 h-4 w-4" />Speak</>}
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
                    disabled={anyLoading || !textForSimulatedClonedVoice || isSpeaking} // Prevent playing if standard TTS is active
                   >
                     {isSimulatedClonedVoiceSpeaking ? <><StopCircle className="mr-2 h-4 w-4" />Stop Simulated Voice</> : <><Volume2 className="mr-2 h-4 w-4" />Play Simulated Cloned Voice</>}
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


          <SectionCard title="Week 2: Face Preprocessing + Lip Sync Video (Audio + Image → Talking Face)" icon={<Smile className="text-primary" />} >
            <div className="space-y-4">
              <div>
                <Label htmlFor="static-face-image-input" className="text-base">Upload a static face image:</Label>
                <Input
                  id="static-face-image-input"
                  type="file"
                  accept="image/*"
                  onChange={handleStaticFaceImageChange}
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
                disabled={anyLoading || !staticFaceImage || (!isPreparedTextUsable() && !textForSimulatedClonedVoice)}
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
                      key={mockVideoPlayerImage} // Ensures re-render if src changes to same value (e.g. timestamped URL)
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
                    {/* Button to play standard TTS if it was the source for animation */}
                    {!textForSimulatedClonedVoice && isPreparedTextUsable() && isSpeechSupported && (
                       <Button
                         onClick={handleSpeakPreparedText} 
                         variant="outline"
                         size="sm"
                         disabled={anyLoading || isSimulatedClonedVoiceSpeaking || (!isCurrentPreparedTextSpeaking && !isPreparedTextUsable()) }
                        >
                        {isSpeaking && speakingText === preparedSpeechText ? <><StopCircle className="mr-2 h-4 w-4" />Stop Speaking Animation Audio</> : <><Volume2 className="mr-2 h-4 w-4" />Play Animation Audio (TTS)</>}
                      </Button>
                    )}
                    {/* Button to play simulated cloned voice if it was the source for animation */}
                    {textForSimulatedClonedVoice && isSpeechSupported && (
                       <Button
                        onClick={handlePlaySimulatedClonedVoice} 
                        variant="outline"
                        size="sm"
                        disabled={anyLoading || isSpeaking} // Prevent playing if standard TTS is active
                       >
                         {isSimulatedClonedVoiceSpeaking ? <><StopCircle className="mr-2 h-4 w-4" />Stop Animation Audio (Simulated)</> : <><Volume2 className="mr-2 h-4 w-4" />Play Animation Audio (Simulated)</>}
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
           <SectionCard title="Week 3: Real-time Avatar Animation (Camera Input + Lip Sync)" icon={<Video className="text-primary" />}>
            <div className="space-y-4">
              <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay muted playsInline />
              {hasCameraPermission === false && (
                <Alert variant="destructive">
                  <AlertTitle>Camera Access Required</AlertTitle>
                  <AlertDescription>
                    Please allow camera access in your browser settings to use this feature. You may need to refresh the page after granting permission.
                  </AlertDescription>
                </Alert>
              )}
              {hasCameraPermission === null && ( // Camera permission check is pending or not yet determined
                 <Alert variant="default">
                  <AlertTitle>Checking Camera Permission</AlertTitle>
                  <AlertDescription>
                    Attempting to access your camera...
                  </AlertDescription>
                </Alert>
              )}
               <p className="text-sm text-muted-foreground mt-4">
                This section is a placeholder for Week 3 functionality involving real-time camera input for avatar animation.
                Camera permission will be requested when this section becomes active. The video feed above will show your camera if permission is granted.
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

