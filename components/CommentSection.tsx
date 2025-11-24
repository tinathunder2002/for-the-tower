import React, { useState } from 'react';
import { CommentAnalysis } from '../types';
import { MessageSquare, Loader2, ThumbsUp, ThumbsDown, Minus, Lightbulb, Users } from 'lucide-react';
import clsx from 'clsx';

interface CommentSectionProps {
  comments: string[];
  onCommentsChange: (comments: string[]) => void;
  onAnalyze: () => void;
  analysis: CommentAnalysis | null;
  isAnalyzing: boolean;
}

const CommentSection: React.FC<CommentSectionProps> = ({
  comments,
  onCommentsChange,
  onAnalyze,
  analysis,
  isAnalyzing
}) => {
  const [inputText, setInputText] = useState(comments.join('\n'));

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    onCommentsChange(e.target.value.split('\n').filter(s => s.trim().length > 0));
  };

  const sentimentIcon = (sentiment: string) => {
    switch (sentiment.toLowerCase()) {
      case 'positive': return <ThumbsUp className="w-5 h-5 text-green-400" />;
      case 'negative': return <ThumbsDown className="w-5 h-5 text-red-400" />;
      case 'neutral': return <Minus className="w-5 h-5 text-slate-400" />;
      default: return <MessageSquare className="w-5 h-5 text-yellow-400" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/50">
      <div className="p-4 flex-1 overflow-y-auto">
        {/* Input Section */}
        <div className="mb-6">
          <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
             Comments / Feedback
          </label>
          <textarea
            value={inputText}
            onChange={handleTextChange}
            placeholder="Paste YouTube comments here to analyze audience sentiment..."
            className="w-full h-32 bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-sm text-slate-300 placeholder-slate-600 focus:border-primary focus:ring-0 transition-all resize-none font-mono"
            spellCheck={false}
          />
          <p className="text-[10px] text-slate-500 mt-1.5 flex items-center justify-between">
            <span>{comments.length} comments detected</span>
            <span className="italic">One comment per line</span>
          </p>
        </div>

        {/* Action Button */}
        {!analysis && (
          <button
            onClick={onAnalyze}
            disabled={isAnalyzing || comments.length === 0}
            className={clsx(
              "w-full py-3 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all",
              comments.length > 0 
                ? "bg-primary hover:bg-primaryHover text-white shadow-lg shadow-primary/20" 
                : "bg-slate-800 text-slate-500 cursor-not-allowed"
            )}
          >
            {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lightbulb className="w-4 h-4" />}
            {isAnalyzing ? "Analyzing Sentiment..." : "Analyze Audience Sentiment"}
          </button>
        )}

        {/* Results */}
        {analysis && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Sentiment Card */}
            <div className="bg-surface p-4 rounded-xl border border-slate-700/50 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-white/5 to-transparent rounded-bl-full"></div>
               <div className="flex items-center gap-3 mb-2">
                 {sentimentIcon(analysis.sentiment)}
                 <h3 className="font-semibold text-white">{analysis.sentiment} Sentiment</h3>
               </div>
               <p className="text-sm text-slate-400 leading-relaxed">
                 {analysis.summary}
               </p>
            </div>

            {/* Topics */}
            <div className="bg-surface p-4 rounded-xl border border-slate-700/50">
               <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Key Topics</h4>
               <div className="flex flex-wrap gap-2">
                 {analysis.keyTopics.map((topic, i) => (
                   <span key={i} className="px-2.5 py-1 bg-slate-800 rounded border border-slate-700 text-xs text-slate-300">
                     {topic}
                   </span>
                 ))}
               </div>
            </div>

            {/* Content Suggestions */}
            <div className="bg-gradient-to-br from-primary/10 to-purple-500/10 p-4 rounded-xl border border-primary/20">
               <div className="flex items-center gap-2 mb-3 text-primary-200">
                 <Users className="w-4 h-4" />
                 <h4 className="text-xs font-bold uppercase tracking-wider">Viewer Persona & Requests</h4>
               </div>
               
               <ul className="space-y-2 mb-4">
                 {analysis.viewerRequests.map((req, i) => (
                   <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                     <span className="text-primary mt-0.5">•</span>
                     {req}
                   </li>
                 ))}
               </ul>

               <div className="pt-3 border-t border-white/5">
                 <p className="text-xs text-slate-400 font-medium mb-2">Recommended Next Videos:</p>
                 <div className="space-y-2">
                    {analysis.contentSuggestions.map((sugg, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-white bg-black/20 p-2 rounded">
                        <Lightbulb className="w-3 h-3 text-yellow-400 shrink-0" />
                        {sugg}
                      </div>
                    ))}
                 </div>
               </div>
            </div>
            
            <button
                onClick={onAnalyze}
                disabled={isAnalyzing}
                className="w-full mt-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs rounded transition-colors"
            >
                Re-Analyze
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentSection;
