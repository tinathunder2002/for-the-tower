import React, { useState } from 'react';
import { Upload, FileVideo, AlertCircle, Youtube, Link as LinkIcon, Loader2, Info } from 'lucide-react';
import { downloadVideo } from '../services/videoProcessor';
import clsx from 'clsx';

interface VideoUploaderProps {
  onFileSelect: (file: File, source: 'upload' | 'youtube') => void;
  isProcessing?: boolean;
}

const VideoUploader: React.FC<VideoUploaderProps> = ({ onFileSelect, isProcessing }) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'youtube'>('upload');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('video/')) {
        onFileSelect(file, 'upload');
      } else {
        alert('Please select a valid video file.');
      }
    }
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!youtubeUrl.trim()) return;

    setIsDownloading(true);
    setDownloadError(null);
    
    try {
      const file = await downloadVideo(youtubeUrl);
      onFileSelect(file, 'youtube');
    } catch (error: any) {
      console.error(error);
      setDownloadError(error.message || "Could not load video.");
    } finally {
      setIsDownloading(false);
    }
  };

  const isLoading = isProcessing || isDownloading;

  return (
    <div className="w-full h-full flex flex-col p-1 border-2 border-slate-700 rounded-2xl bg-surface/50 overflow-hidden relative">
      {/* Tabs */}
      <div className="flex border-b border-slate-700/50">
        <button
          onClick={() => setActiveTab('upload')}
          disabled={isLoading}
          className={clsx(
            "flex-1 py-4 flex items-center justify-center gap-2 text-sm font-medium transition-colors outline-none",
            activeTab === 'upload' ? "bg-slate-800 text-white" : "hover:bg-slate-800/50 text-slate-400"
          )}
        >
          <Upload className="w-4 h-4" />
          Upload File
        </button>
        <button
          onClick={() => setActiveTab('youtube')}
          disabled={isLoading}
          className={clsx(
            "flex-1 py-4 flex items-center justify-center gap-2 text-sm font-medium transition-colors outline-none",
            activeTab === 'youtube' ? "bg-slate-800 text-white" : "hover:bg-slate-800/50 text-slate-400"
          )}
        >
          <Youtube className="w-4 h-4" />
          YouTube URL
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
        {activeTab === 'upload' ? (
          <>
             {/* Existing upload UI */}
             <div className="bg-slate-800 p-4 rounded-full mb-6 relative group">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl group-hover:bg-primary/40 transition-all"></div>
                <Upload className="w-12 h-12 text-primary relative z-10" />
             </div>
             
             <h3 className="text-2xl font-bold text-white mb-2">Upload a Video</h3>
             <p className="text-slate-400 mb-8 text-center max-w-md">
               Drag and drop your video here, or click to browse. 
             </p>
        
             <label className={clsx(
               "relative overflow-hidden group cursor-pointer bg-gradient-to-r from-primary to-purple-600 hover:from-primaryHover hover:to-purple-500 text-white font-semibold py-3 px-8 rounded-lg shadow-lg shadow-primary/25 transition-all transform hover:scale-105",
               isLoading ? 'opacity-50 pointer-events-none' : ''
             )}>
               <span className="relative z-10 flex items-center gap-2">
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileVideo className="w-5 h-5" />}
                  {isLoading ? 'Processing...' : 'Select Video File'}
               </span>
               <input 
                 type="file" 
                 accept="video/*" 
                 className="hidden" 
                 onChange={handleFileChange}
                 disabled={isLoading}
               />
             </label>
          </>
        ) : (
          <>
             <div className="bg-slate-800 p-4 rounded-full mb-6 relative group">
                <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl group-hover:bg-red-500/40 transition-all"></div>
                <Youtube className="w-12 h-12 text-red-500 relative z-10" />
             </div>

             <h3 className="text-2xl font-bold text-white mb-2">Import from YouTube</h3>
             <p className="text-slate-400 mb-6 text-center max-w-md text-sm">
               Paste a YouTube link below. <br/>
               <span className="text-yellow-500/80 italic">Note: In this web demo, real YouTube downloading is simulated with a sample video due to browser security.</span>
             </p>

             <form onSubmit={handleUrlSubmit} className="w-full max-w-md flex flex-col gap-4">
               <div className="relative group">
                 <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500 to-purple-600 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-200"></div>
                 <div className="relative flex items-center bg-slate-900 rounded-lg border border-slate-700 focus-within:border-red-500 transition-colors">
                    <LinkIcon className="w-5 h-5 text-slate-500 ml-3" />
                    <input 
                      type="text" 
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full bg-transparent border-none text-white py-3 px-3 focus:ring-0 placeholder-slate-600"
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      disabled={isLoading}
                    />
                 </div>
               </div>

               {downloadError && (
                 <div className="text-red-400 text-xs text-center">
                   {downloadError}
                 </div>
               )}

               <button 
                  type="submit"
                  disabled={isLoading || !youtubeUrl}
                  className={clsx(
                    "w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-8 rounded-lg shadow-lg shadow-red-500/20 transition-all transform hover:scale-[1.02]",
                    (isLoading || !youtubeUrl) ? 'opacity-50 cursor-not-allowed transform-none' : ''
                  )}
               >
                 <span className="flex items-center justify-center gap-2">
                   {isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Youtube className="w-5 h-5" />}
                   {isDownloading ? 'Simulating Download...' : isProcessing ? 'Processing...' : 'Analyze Video (Demo)'}
                 </span>
               </button>
             </form>
          </>
        )}
      </div>

      <div className="bg-slate-900/50 p-4 border-t border-slate-800 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-400 leading-relaxed">
            {activeTab === 'upload' 
              ? "We analyze video frames locally using Gemini 3 Pro to identify viral moments."
              : "Due to CORS restrictions in the browser, direct YouTube downloads are not possible without a backend. This feature demonstrates the workflow using a pre-selected sample video."
            }
        </p>
      </div>
    </div>
  );
};

export default VideoUploader;