"use client";

import React, { useState, ChangeEvent, useEffect } from 'react';
import Image from 'next/image';
import AppHeader from '@/components/AppHeader';
import SectionCard from '@/components/SectionCard';
import AudioPlayer from '@/components/AudioPlayer';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from "@/hooks/use-toast";
import { Text, Image as ImageIcon, Mic, Loader2, UploadCloud } from 'lucide-react';

export default function Home() {
  const [textInput, setTextInput] = useState<string>('');
  const [isGeneratingSpeech, setIsGeneratingSpeech] = useState<boolean>(false);
  const [generatedAudioSrc, setGeneratedAudioSrc] = useState<string | null>(null);

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState<boolean>(false);

  const [selectedVoiceSample, setSelectedVoiceSample] = useState<File | null>(null);
  const [isUploadingSample, setIsUploadingSample] = useState<boolean>(false);

  const { toast } = useToast();

  useEffect(() => {
    // Clean up image preview URL when component unmounts or image changes
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  const handleTextToSpeech = async () => {
    if (!textInput.trim()) {
      toast({ title: "Input Required", description: "Please enter some text to convert.", variant: "destructive" });
      return;
    }
    setIsGeneratingSpeech(true);
    setGeneratedAudioSrc(null); // Clear previous audio
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    // Mock TTS: Use a placeholder audio file
    setGeneratedAudioSrc("https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3");
    setIsGeneratingSpeech(false);
    toast({ title: "Speech Generated", description: "Your text has been converted to speech." });
  };

  const handleImageFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
      setImagePreviewUrl(URL.createObjectURL(file));
    } else {
      setSelectedImage(null);
      setImagePreviewUrl(null);
    }
  };

  const handleProcessImage = async () => {
    if (!selectedImage) {
      toast({ title: "Image Required", description: "Please select an image to process.", variant: "destructive" });
      return;
    }
    setIsProcessingImage(true);
    // Simulate API call for OCR and TTS
    await new Promise(resolve => setTimeout(resolve, 2000));
    // For now, mock success, no actual OCR/TTS from image
    setIsProcessingImage(false);
    toast({ title: "Image Processed (Mock)", description: "Image processing and speech synthesis would occur here." });
  };

  const handleVoiceSampleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedVoiceSample(file);
    } else {
      setSelectedVoiceSample(null);
    }
  };

  const handleUploadVoiceSample = async () => {
    if (!selectedVoiceSample) {
      toast({ title: "Voice Sample Required", description: "Please select a voice sample to upload.", variant: "destructive" });
      return;
    }
    setIsUploadingSample(true);
    // Simulate API call for upload
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsUploadingSample(false);
    toast({ title: "Sample Uploaded (Mock)", description: "Voice sample upload would be handled here." });
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <main className="flex-grow container mx-auto py-8 px-4">
        <div className="grid gap-8 md:gap-12">
          {/* Text Input Section */}
          <SectionCard title="Text-to-Speech" icon={<Text className="text-primary" />}>
            <div className="space-y-4">
              <Label htmlFor="text-input" className="text-base">Enter your text below:</Label>
              <Textarea
                id="text-input"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type or paste your text here..."
                rows={6}
                className="text-base"
              />
              <Button onClick={handleTextToSpeech} disabled={isGeneratingSpeech} className="w-full sm:w-auto">
                {isGeneratingSpeech ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Convert to Speech"
                )}
              </Button>
              {generatedAudioSrc && (
                <div className="mt-4">
                  <AudioPlayer src={generatedAudioSrc} autoPlay={true} />
                </div>
              )}
            </div>
          </SectionCard>

          {/* Image Input Section */}
          <SectionCard title="Image-to-Speech (OCR)" icon={<ImageIcon className="text-primary" />}>
            <div className="space-y-4">
              <Label htmlFor="image-input" className="text-base">Upload an image:</Label>
              <Input
                id="image-input"
                type="file"
                accept="image/*"
                onChange={handleImageFileChange}
                className="text-base file:text-primary file:font-medium"
              />
              {imagePreviewUrl && (
                <div className="mt-2 border rounded-md p-2 inline-block bg-muted">
                  <Image
                    src={imagePreviewUrl}
                    alt="Selected image preview"
                    width={200}
                    height={150}
                    className="rounded-md object-contain max-h-[150px]"
                    data-ai-hint="document content"
                  />
                </div>
              )}
              <Button onClick={handleProcessImage} disabled={isProcessingImage || !selectedImage} className="w-full sm:w-auto">
                {isProcessingImage ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing Image...
                  </>
                ) : (
                  "Extract Text & Convert to Speech"
                )}
              </Button>
              <p className="text-sm text-muted-foreground">
                This feature would use OCR to extract text from the image and then convert it to speech. Currently mocked.
              </p>
            </div>
          </SectionCard>

          {/* Voice Sample Upload Section */}
          <SectionCard title="Upload Voice Sample" icon={<Mic className="text-primary" />}>
            <div className="space-y-4">
              <Label htmlFor="voice-sample-input" className="text-base">Upload a voice sample (e.g., .wav, .mp3):</Label>
              <Input
                id="voice-sample-input"
                type="file"
                accept="audio/*"
                onChange={handleVoiceSampleChange}
                className="text-base file:text-primary file:font-medium"
              />
              {selectedVoiceSample && (
                <p className="text-sm text-muted-foreground">Selected file: {selectedVoiceSample.name}</p>
              )}
              <Button onClick={handleUploadVoiceSample} disabled={isUploadingSample || !selectedVoiceSample} className="w-full sm:w-auto">
                {isUploadingSample ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <UploadCloud className="mr-2 h-4 w-4" />
                    Upload Sample
                  </>
                )}
              </Button>
              <p className="text-sm text-muted-foreground">
                Upload your voice samples here for future voice cloning capabilities. Currently mocked.
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
