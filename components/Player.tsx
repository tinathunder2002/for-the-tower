import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Repeat, Download, Loader2 } from 'lucide-react';
import { VideoClip } from '../types';

interface PlayerProps {
  videoFile: File | null;
  activeClip: VideoClip | null;
  onDownloadClip?: () => void;
  isDownloading?: boolean;
  onTimeUpdate?: (time: number) => void;
}

const Player: React.FC<PlayerProps> = ({ videoFile, activeClip, onDownloadClip, isDownloading, onTimeUpdate }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  // Load video file
  useEffect(() => {
    if (videoFile) {
      const url = URL.createObjectURL(videoFile);
      setVideoUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [videoFile]);

  // Handle active clip changes
  useEffect(() => {
    if (activeClip && videoRef.current) {
      videoRef.current.currentTime = activeClip.startTime;
      videoRef.current.play().catch(e => console.log("Auto-play prevented"));
      setIsPlaying(true);
    }
  }, [activeClip]);

  // Time update loop for clip boundaries and progress
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const currentTime = video.currentTime;
      setProgress((currentTime / video.duration) * 100);
      
      // Notify parent
      onTimeUpdate?.(currentTime);

      // Loop clip
      if (activeClip && currentTime >= activeClip.endTime) {
        video.currentTime = activeClip.startTime;
        video.play();
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', () => setDuration(video.duration));
    
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [activeClip, onTimeUpdate]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!videoUrl) return <div className="w-full h-full bg-black rounded-xl flex items-center justify-center text-slate-600">No Video Loaded</div>;

  return (
    <div className="relative group w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-slate-800">
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full object-contain"
        onClick={togglePlay}
        playsInline
      />
      
      {/* Overlay Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-slate-700 rounded-full mb-4 cursor-pointer relative group/progress">
          <div 
            className="h-full bg-primary rounded-full relative"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover/progress:opacity-100 transition-opacity" />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={togglePlay} className="text-white hover:text-primary transition-colors">
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </button>
            
            <div className="flex items-center gap-2 group/vol">
               <button onClick={toggleMute} className="text-white hover:text-slate-300 transition-colors">
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
            </div>

            <span className="text-xs text-slate-300 font-medium">
              {videoRef.current ? formatTime(videoRef.current.currentTime) : '0:00'} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {activeClip && (
              <div className="flex items-center gap-2">
                 <button 
                  onClick={(e) => { e.stopPropagation(); onDownloadClip?.(); }}
                  disabled={isDownloading}
                  className="flex items-center gap-1.5 px-3 py-1 bg-white/10 hover:bg-white/20 rounded border border-white/10 text-xs text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Download Clip"
                 >
                   {isDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                   <span>Download</span>
                 </button>
                 <div className="flex items-center gap-1.5 px-2 py-1 bg-primary/20 rounded border border-primary/30 text-xs text-primary-200">
                   <Repeat className="w-3 h-3" />
                   <span>Looping</span>
                 </div>
              </div>
            )}
            <button className="text-white hover:text-slate-300">
              <Maximize className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Center Play Button (only when paused) */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/10">
            <Play className="w-6 h-6 text-white ml-1" />
          </div>
        </div>
      )}
    </div>
  );
};

export default Player;
