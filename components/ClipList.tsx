import React from 'react';
import { VideoClip } from '../types';
import { PlayCircle, Star, Hash, AlignLeft, Sparkles } from 'lucide-react';
import clsx from 'clsx';

interface ClipListProps {
  clips: VideoClip[];
  activeClip: VideoClip | null;
  onClipSelect: (clip: VideoClip) => void;
}

const ClipList: React.FC<ClipListProps> = ({ clips, activeClip, onClipSelect }) => {
  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4 h-full overflow-y-auto pr-2 pb-20">
      {clips.map((clip) => {
        const isActive = activeClip?.id === clip.id;
        return (
          <div
            key={clip.id}
            onClick={() => onClipSelect(clip)}
            className={clsx(
              "group relative p-4 rounded-xl border transition-all cursor-pointer duration-200 ease-in-out",
              isActive 
                ? "bg-surfaceHighlight border-primary/50 shadow-lg shadow-primary/10 ring-1 ring-primary/20" 
                : "bg-surface border-slate-800 hover:border-slate-600 hover:bg-slate-800/50"
            )}
          >
            <div className="flex justify-between items-start mb-2">
               <div className="flex items-center gap-2 flex-1 min-w-0">
                 <div className={clsx(
                   "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                   clip.viralityScore > 85 ? "bg-green-500/20 text-green-400" : 
                   clip.viralityScore > 70 ? "bg-yellow-500/20 text-yellow-400" : "bg-slate-700 text-slate-300"
                 )}>
                   {clip.viralityScore}
                 </div>
                 <h4 className={clsx("font-semibold text-white transition-all", isActive ? "whitespace-normal" : "truncate")}>
                    {clip.title}
                 </h4>
               </div>
               <span className="text-xs text-slate-500 font-mono bg-slate-900 px-2 py-1 rounded shrink-0 ml-2">
                 {formatTime(clip.startTime)} - {formatTime(clip.endTime)}
               </span>
            </div>

            <p className={clsx("text-sm text-slate-400 mb-3 transition-all", isActive ? "" : "line-clamp-2")}>
              {clip.summary}
            </p>

            <div className="flex flex-wrap gap-2 mb-3">
              {(isActive ? clip.tags : clip.tags.slice(0, 3)).map(tag => (
                <span key={tag} className="text-[10px] uppercase tracking-wider text-slate-400 bg-slate-900/80 px-1.5 py-0.5 rounded flex items-center gap-1">
                  <Hash className="w-2.5 h-2.5" /> {tag}
                </span>
              ))}
              {!isActive && clip.tags.length > 3 && (
                 <span className="text-[10px] text-slate-500 px-1.5 py-0.5 self-center">+{clip.tags.length - 3}</span>
              )}
            </div>

            {isActive && (
                <div className="mb-3 p-3 bg-slate-900/40 rounded border border-white/5 animate-in fade-in slide-in-from-top-1 duration-300">
                    <div className="flex items-center gap-1.5 text-xs text-primary/80 mb-1.5 uppercase font-bold tracking-wider">
                        <Sparkles className="w-3 h-3" />
                        <span>Analysis</span>
                    </div>
                    <p className="text-xs text-slate-300 italic leading-relaxed">
                        "{clip.reasoning}"
                    </p>
                </div>
            )}
            
            {/* Transcript Stub / "Srt" preview */}
            <div className="p-2 bg-black/30 rounded border border-white/5">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                    <AlignLeft className="w-3 h-3" />
                    <span className="uppercase tracking-widest text-[10px]">Auto-Caption</span>
                </div>
                <p className={clsx("text-xs text-slate-300 italic", isActive ? "" : "line-clamp-1")}>
                    "{clip.transcriptStub}"
                </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ClipList;