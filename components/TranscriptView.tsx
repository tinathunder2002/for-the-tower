import React, { useRef, useEffect } from 'react';
import { TranscriptSegment } from '../types';
import clsx from 'clsx';
import { AlignLeft, Search } from 'lucide-react';

interface TranscriptViewProps {
  transcript: TranscriptSegment[];
  currentTime: number;
  onSegmentClick: (time: number) => void;
  searchQuery: string;
}

const TranscriptView: React.FC<TranscriptViewProps> = ({ 
  transcript, 
  currentTime, 
  onSegmentClick,
  searchQuery
}) => {
  const activeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentTime]);

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() 
        ? <span key={i} className="bg-yellow-500/30 text-yellow-200 rounded px-0.5">{part}</span> 
        : part
    );
  };

  if (transcript.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-500 p-8 text-center">
        <AlignLeft className="w-12 h-12 mb-4 opacity-20" />
        <p>No transcript available for this video.</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-1 pb-20">
      {transcript.map((segment, index) => {
        const isActive = currentTime >= segment.startTime && currentTime < segment.endTime;
        const isMatch = searchQuery && segment.text.toLowerCase().includes(searchQuery.toLowerCase());

        return (
          <div
            key={index}
            ref={isActive ? activeRef : null}
            onClick={() => onSegmentClick(segment.startTime)}
            className={clsx(
              "p-2 rounded-lg cursor-pointer transition-colors flex gap-3 group border border-transparent",
              isActive 
                ? "bg-primary/10 border-primary/20" 
                : "hover:bg-slate-800/50",
              isMatch && !isActive ? "bg-slate-800/80 border-slate-700" : ""
            )}
          >
            <span className={clsx(
              "text-xs font-mono shrink-0 pt-0.5 w-12 text-right",
              isActive ? "text-primary-300" : "text-slate-600 group-hover:text-slate-500"
            )}>
              {formatTime(segment.startTime)}
            </span>
            <p className={clsx(
              "text-sm leading-relaxed",
              isActive ? "text-white" : "text-slate-400 group-hover:text-slate-300"
            )}>
              {highlightText(segment.text, searchQuery)}
            </p>
          </div>
        );
      })}
    </div>
  );
};

export default TranscriptView;
