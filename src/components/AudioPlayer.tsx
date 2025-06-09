
"use client";

import type { FC } from 'react';
import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Loader2, Volume2, VolumeX, Volume1 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface AudioPlayerProps {
  src: string | null;
  autoPlay?: boolean;
}

const AudioPlayer: FC<AudioPlayerProps> = ({ src, autoPlay = false }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(0.5);

  useEffect(() => {
    // Treat null, undefined, or empty/whitespace-only src as invalid
    if (src && src.trim() !== "") {
      const newAudio = new Audio(src);
      audioRef.current = newAudio;
      setIsLoading(true);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);

      newAudio.volume = isMuted ? 0 : volume;

      const handleLoadedMetadata = () => {
        if (audioRef.current) setDuration(audioRef.current.duration);
      };
      const handleTimeUpdate = () => {
        if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
      };
      const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
        if (audioRef.current) audioRef.current.currentTime = 0;
      };
      const handleCanPlayThrough = () => {
        setIsLoading(false);
        if (autoPlay && audioRef.current) {
          audioRef.current.play().catch(error => console.error("AudioPlayer: Autoplay failed:", error));
          setIsPlaying(true);
        }
      };
      const handleError = (e: Event) => {
        setIsLoading(false);
        const audioElement = e.target as HTMLAudioElement;
        const mediaError = audioElement.error;
        console.error(
          "AudioPlayer Error Details:",
          {
            code: mediaError?.code,
            message: mediaError?.message,
            currentSrc: audioElement.currentSrc,
            srcAttempted: audioElement.src, // or just src prop value if needed
          }
        );
      };
      const handleLoadStart = () => setIsLoading(true);

      newAudio.addEventListener('loadedmetadata', handleLoadedMetadata);
      newAudio.addEventListener('timeupdate', handleTimeUpdate);
      newAudio.addEventListener('ended', handleEnded);
      newAudio.addEventListener('canplaythrough', handleCanPlayThrough);
      newAudio.addEventListener('error', handleError);
      newAudio.addEventListener('loadstart', handleLoadStart);
      
      newAudio.load();

      return () => {
        newAudio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        newAudio.removeEventListener('timeupdate', handleTimeUpdate);
        newAudio.removeEventListener('ended', handleEnded);
        newAudio.removeEventListener('canplaythrough', handleCanPlayThrough);
        newAudio.removeEventListener('error', handleError);
        newAudio.removeEventListener('loadstart', handleLoadStart);
        if (audioRef.current) {
          audioRef.current.pause();
          // It's good practice to remove the src to prevent further loading attempts by the browser for the old object
          if (audioRef.current.src) { // Check if src is already set
             try {
                audioRef.current.src = ''; // Detach source
             } catch (err) {
                // some browsers might throw error when src is set to empty on unmounted element
             }
          }
          audioRef.current.removeAttribute('src'); // More robust way to clear
          audioRef.current.load(); // Abort pending/ongoing network requests for the audio element
          audioRef.current = null;
        }
      };
    } else {
      // Handles null, undefined, or empty/whitespace-only src
      if (audioRef.current) {
        audioRef.current.pause();
        if (audioRef.current.src) {
           try {
              audioRef.current.src = '';
           } catch(err) {/* ignore */}
        }
        audioRef.current.removeAttribute('src');
        audioRef.current.load();
        audioRef.current = null;
      }
      setIsPlaying(false);
      setDuration(0);
      setCurrentTime(0);
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, autoPlay]); // autoPlay is a dependency

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const togglePlayPause = () => {
    if (!audioRef.current || isLoading) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(console.error);
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current && !isLoading && duration > 0) { // ensure duration is valid
      const newTime = value[0];
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (isMuted) {
      const newVolume = prevVolume > 0 ? prevVolume : 0.5;
      setVolume(newVolume);
      setIsMuted(false);
    } else {
      setPrevVolume(volume);
      setVolume(0);
      setIsMuted(true);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time) || time === Infinity || time < 0) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const VolumeIconDisplay: FC = () => {
    if (isMuted || volume === 0) return <VolumeX className="h-5 w-5" />;
    if (volume < 0.5) return <Volume1 className="h-5 w-5" />;
    return <Volume2 className="h-5 w-5" />;
  };
  
  // Do not render if src is invalid AND not loading AND audioRef is not set
  // This condition helps prevent rendering when the component is essentially inactive or errored early.
  if ((!src || src.trim() === "") && !isLoading && !audioRef.current) {
    return null;
  }


  return (
    <div className="flex items-center gap-3 p-3 border rounded-lg shadow-sm bg-card w-full">
      <Button onClick={togglePlayPause} variant="ghost" size="icon" disabled={isLoading || (!src || src.trim() === "")} aria-label={isPlaying ? "Pause" : "Play"}>
        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
      </Button>
      <div className="flex-grow mx-2">
        <Slider
          value={[currentTime]}
          max={duration > 0 ? duration : 1} // Prevent max 0 for slider
          step={0.1}
          onValueChange={handleSeek}
          disabled={isLoading || (!src || src.trim() === "") || duration === 0}
          aria-label="Audio progress"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 w-32">
        <Button onClick={toggleMute} variant="ghost" size="icon" disabled={isLoading || (!src || src.trim() === "")} aria-label={isMuted ? "Unmute" : "Mute"}>
          <VolumeIconDisplay />
        </Button>
        <Slider
            value={[isMuted ? 0 : volume]}
            max={1}
            step={0.01}
            onValueChange={handleVolumeChange}
            disabled={isLoading || (!src || src.trim() === "")}
            aria-label="Volume"
            className="w-full"
        />
      </div>
    </div>
  );
};

export default AudioPlayer;

    