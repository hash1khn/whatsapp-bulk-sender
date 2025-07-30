import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';

interface VoiceNotePlayerProps {
  src: string;
  className?: string;
}

export const VoiceNotePlayer: React.FC<VoiceNotePlayerProps> = ({ src, className = '' }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  // Generate waveform data with better visualization
  const generateWaveform = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Generate waveform bars with more realistic pattern
    const barCount = 60;
    const barWidth = width / barCount;
    
    for (let i = 0; i < barCount; i++) {
      // Create more realistic waveform pattern
      const baseHeight = 0.3;
      const variation = 0.7;
      const frequency = 0.1;
      const noise = Math.random() * 0.2;
      
      const barHeight = (baseHeight + variation * Math.sin(i * frequency) + noise) * height;
      const x = i * barWidth + barWidth * 0.15;
      const y = (height - barHeight) / 2;
      
      // Progress calculation
      const progress = currentTime / duration;
      const playedBars = progress * barCount;
      
      // Color based on playback position
      if (i < playedBars) {
        // Played portion - lighter with blue tint
        const alpha = 0.8 + (0.2 * Math.sin(Date.now() * 0.01 + i * 0.5));
        ctx.fillStyle = `rgba(156, 163, 175, ${alpha})`; // Lighter gray with animation
      } else {
        // Unplayed portion - darker
        ctx.fillStyle = '#6B7280';
      }
      
      // Draw rounded bars
      const barW = barWidth * 0.7;
      const radius = barW * 0.3;
      
      ctx.beginPath();
      ctx.roundRect(x, y, barW, barHeight, radius);
      ctx.fill();
    }
    
    // Draw progress indicator with glow effect
    if (duration > 0) {
      const progressX = (currentTime / duration) * width;
      
      // Glow effect
      const gradient = ctx.createRadialGradient(progressX, height / 2, 0, progressX, height / 2, 8);
      gradient.addColorStop(0, 'rgba(59, 130, 246, 0.3)');
      gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(progressX, height / 2, 8, 0, 2 * Math.PI);
      ctx.fill();
      
      // Main progress dot
      ctx.fillStyle = '#3B82F6';
      ctx.beginPath();
      ctx.arc(progressX, height / 2, 4, 0, 2 * Math.PI);
      ctx.fill();
    }
  };

  // Handle playback speed cycling
  const cyclePlaybackSpeed = () => {
    const speeds = [1, 1.5, 2];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    const newSpeed = speeds[nextIndex];
    
    setPlaybackSpeed(newSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = newSpeed;
    }
  };

  // Format time display
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, []);

  // Update waveform on time change
  useEffect(() => {
    generateWaveform();
  }, [currentTime, duration]);

  // Animation loop for smooth waveform updates
  useEffect(() => {
    const animate = () => {
      generateWaveform();
      animationRef.current = requestAnimationFrame(animate);
    };
    
    if (isPlaying) {
      animationRef.current = requestAnimationFrame(animate);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying]);

  // Handle play/pause
  const togglePlayback = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  // Handle seek
  const handleSeek = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!audioRef.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const progress = x / rect.width;
    
    const newTime = progress * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  return (
    <div className={`flex items-center gap-3 p-4 bg-gray-800 rounded-2xl shadow-lg ${className}`}>
      {/* Hidden audio element */}
      <audio ref={audioRef} src={src} preload="metadata" />
      
      {/* Play/Pause Button */}
      <button
        onClick={togglePlayback}
        className="flex-shrink-0 w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105"
        disabled={isLoading}
      >
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-gray-300 border-t-white rounded-full animate-spin" />
        ) : isPlaying ? (
          <Pause className="w-5 h-5 text-white" />
        ) : (
          <Play className="w-5 h-5 text-white ml-0.5" />
        )}
      </button>
      
      {/* Waveform Canvas */}
      <div className="flex-1 relative">
        <canvas
          ref={canvasRef}
          width={240}
          height={48}
          className="w-full h-12 cursor-pointer"
          onClick={handleSeek}
          style={{ imageRendering: 'pixelated' }}
        />
        
        {/* Time Display */}
        <div className="flex justify-between text-xs text-gray-300 mt-2 font-medium">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
      
      {/* Playback Speed Button */}
      <button
        onClick={cyclePlaybackSpeed}
        className="flex-shrink-0 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-full text-xs text-white transition-all duration-200 hover:scale-105 font-medium"
      >
        {playbackSpeed}x
      </button>
    </div>
  );
}; 