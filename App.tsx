import React, { useState, useEffect } from 'react';
import { AppState, VideoClip, ProcessingProgress, CommentAnalysis, TranscriptSegment } from './types';
import { extractFramesFromVideo, trimVideo, extractAudio } from './services/videoProcessor';
import { analyzeVideoFrames, generateEmbedding, analyzeVideoComments, generateTranscript } from './services/geminiService';
import { cosineSimilarity } from './utils/vectorUtils';
import VideoUploader from './components/VideoUploader';
import Player from './components/Player';
import ClipList from './components/ClipList';
import CommentSection from './components/CommentSection';
import TranscriptView from './components/TranscriptView';
import { Video, Sparkles, Search, Database, LayoutDashboard, Loader2, PlayCircle, Clock, ListFilter, MessageSquare, Film, FileText, AlignLeft } from 'lucide-react';
import clsx from 'clsx';

const MOCK_COMMENTS = [
  "This is exactly what I was looking for! simple and clean.",
  "The editing at 0:15 is insane, how did you do that?",
  "Can you make a version of this for mobile aspect ratio?",
  "I disagree with the point about timing, but great video overall.",
  "Subscribed! eager to see more.",
  "What camera was this shot on?",
  "The audio levels are a bit low in the middle section.",
  "Make part 2 please!",
  "Viral material right here.",
  "Algorithm brought me here and I'm not disappointed."
];

function App() {
  // State
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [file, setFile] = useState<File | null>(null);
  const [clips, setClips] = useState<VideoClip[]>([]);
  const [activeClip, setActiveClip] = useState<VideoClip | null>(null);
  const [progress, setProgress] = useState<ProcessingProgress>({ stage: '', progress: 0 });
  
  // Transcript State
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [currentTime, setCurrentTime] = useState(0);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [filteredClips, setFilteredClips] = useState<VideoClip[]>([]);

  // Sorting State
  const [sortOrder, setSortOrder] = useState<'time' | 'viral'>('time');

  // Download State
  const [isDownloading, setIsDownloading] = useState(false);

  // Sidebar Tabs
  const [activeSidebarTab, setActiveSidebarTab] = useState<'clips' | 'transcript' | 'comments'>('clips');

  // Comments State
  const [comments, setComments] = useState<string[]>([]);
  const [commentAnalysis, setCommentAnalysis] = useState<CommentAnalysis | null>(null);
  const [isAnalyzingComments, setIsAnalyzingComments] = useState(false);

  // Helper to sort clips
  const sortClips = (list: VideoClip[], order: 'time' | 'viral') => {
    const sorted = [...list];
    if (order === 'viral') {
      return sorted.sort((a, b) => b.viralityScore - a.viralityScore);
    }
    return sorted.sort((a, b) => a.startTime - b.startTime);
  };

  // Handlers
  const handleFileSelect = async (selectedFile: File, source: 'upload' | 'youtube') => {
    setFile(selectedFile);
    setAppState(AppState.PROCESSING);

    // Reset previous session data
    setClips([]);
    setActiveClip(null);
    setTranscript([]);
    setCommentAnalysis(null);
    
    // Set mock comments if youtube source
    if (source === 'youtube') {
      setComments(MOCK_COMMENTS);
    } else {
      setComments([]);
    }
    
    try {
      // 1. Extract Frames
      setProgress({ stage: 'Extracting frames...', progress: 0 });
      const frames = await extractFramesFromVideo(selectedFile, 4, 45, (p) => {
        setProgress({ stage: 'Extracting frames...', progress: p });
      });

      // 2. Analyze with Gemini (Visual)
      setAppState(AppState.ANALYZING);
      setProgress({ stage: 'Gemini is analyzing video content...', progress: 0 });
      
      const videoElement = document.createElement('video');
      videoElement.src = URL.createObjectURL(selectedFile);
      await new Promise(r => videoElement.onloadedmetadata = r);
      const duration = videoElement.duration;

      const generatedClips = await analyzeVideoFrames(frames, duration);
      
      // 3. Extract Audio & Transcribe
      setProgress({ stage: 'Transcribing audio...', progress: 50 });
      let generatedTranscript: TranscriptSegment[] = [];
      try {
        const audioBase64 = await extractAudio(selectedFile);
        generatedTranscript = await generateTranscript(audioBase64);
        setTranscript(generatedTranscript);
      } catch (e) {
        console.warn("Audio transcription failed, continuing without it.", e);
      }

      // 4. Generate embeddings for search
      setProgress({ stage: 'Indexing into vector database...', progress: 90 });
      const clipsWithEmbeddings = await Promise.all(generatedClips.map(async (clip) => {
        const textToEmbed = `${clip.title} ${clip.summary} ${clip.tags.join(' ')} ${clip.reasoning}`;
        const embedding = await generateEmbedding(textToEmbed);
        return { ...clip, embedding };
      }));

      // Initial Sort
      const sortedClips = sortClips(clipsWithEmbeddings, sortOrder);

      setClips(sortedClips);
      setFilteredClips(sortedClips);
      if (sortedClips.length > 0) setActiveClip(sortedClips[0]);
      
      setAppState(AppState.READY);

    } catch (error) {
      console.error(error);
      setAppState(AppState.ERROR);
    }
  };

  const handleAnalyzeComments = async () => {
    if (comments.length === 0) return;
    setIsAnalyzingComments(true);
    try {
      const result = await analyzeVideoComments(comments);
      setCommentAnalysis(result);
    } catch (e) {
      console.error("Failed to analyze comments", e);
      alert("Failed to analyze comments. Please check your API key.");
    } finally {
      setIsAnalyzingComments(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setFilteredClips(sortClips(clips, sortOrder));
      return;
    }

    setIsSearching(true);
    try {
      // 1. Vector Search on Clips
      const queryEmbedding = await generateEmbedding(searchQuery);
      
      let matchedClips = clips.map(clip => {
        const score = clip.embedding ? cosineSimilarity(queryEmbedding, clip.embedding) : 0;
        return { ...clip, score };
      });

      const queryLower = searchQuery.toLowerCase();

      // 2. Keyword Search in Transcript
      // Find time ranges where transcript matches the query
      const matchingTranscriptSegments = transcript.filter(seg => 
        seg.text.toLowerCase().includes(queryLower)
      );

      // Boost score if clip overlaps with matching transcript segment
      matchedClips = matchedClips.map(clip => {
        const hasTranscriptMatch = matchingTranscriptSegments.some(seg => 
            (seg.startTime >= clip.startTime && seg.startTime < clip.endTime) ||
            (seg.endTime > clip.startTime && seg.endTime <= clip.endTime) ||
            (clip.startTime >= seg.startTime && clip.endTime <= seg.endTime)
        );
        
        // Also check stub
        const hasStubMatch = clip.transcriptStub.toLowerCase().includes(queryLower);

        if (hasTranscriptMatch || hasStubMatch) {
            return { ...clip, score: clip.score + 0.5 }; // Boost
        }
        return clip;
      });

      // Filter logic: Must have some relevance
      const threshold = 0.3; // Arbitrary threshold
      const finalFiltered = matchedClips.filter(c => c.score > threshold || c.transcriptStub.toLowerCase().includes(queryLower));

      // Re-sort
      const finalClips = sortClips(finalFiltered, sortOrder);
      
      setFilteredClips(finalClips);
      // Switch to clips tab to show results if not already
      if (activeSidebarTab !== 'clips') setActiveSidebarTab('clips');

    } catch (e) {
      console.error("Search failed", e);
      // Fallback
      const queryLower = searchQuery.toLowerCase();
      const matchedClips = clips.filter(clip => 
        clip.transcriptStub.toLowerCase().includes(queryLower)
      );
      setFilteredClips(sortClips(matchedClips, sortOrder));
    } finally {
      setIsSearching(false);
    }
  };

  const handleDownloadClip = async () => {
    if (!file || !activeClip) return;
    
    setIsDownloading(true);
    try {
      const blob = await trimVideo(file, activeClip.startTime, activeClip.endTime);
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeClip.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_opus_clip.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed", error);
      alert("Failed to create clip. Please ensure your browser supports SharedArrayBuffer (cross-origin isolation) required for video processing.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleTranscriptSegmentClick = (time: number) => {
    // We need to pass this to the Player.
    // However, Player is uncontrolled for seek except via activeClip change.
    // For now, we will update the active clip if the time falls into one, 
    // OR we just find the clip that contains this time and set it active.
    const clipAtTime = clips.find(c => time >= c.startTime && time < c.endTime);
    if (clipAtTime) {
        setActiveClip(clipAtTime);
        // Note: The player loops the clip. If we want precise seek within clip, 
        // we'd need to expose a seek method or prop on Player. 
        // For this feature, just jumping to the relevant clip is good UX.
    }
  };

  // Re-sort when sortOrder changes
  useEffect(() => {
    setFilteredClips(prev => sortClips(prev, sortOrder));
  }, [sortOrder]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
        handleSearch();
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // Automatically select the first clip when the list changes (e.g. search, sort, init)
  useEffect(() => {
    if (appState === AppState.READY && filteredClips.length > 0) {
      setActiveClip(filteredClips[0]);
    }
  }, [filteredClips, appState]);

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-background text-slate-200 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-16 border-b border-slate-800 bg-surface/50 backdrop-blur-md flex items-center justify-between px-6 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-tr from-primary to-purple-400 rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
            <Video className="text-white w-5 h-5" />
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">OpusAI</span>
        </div>
        
        {appState === AppState.READY && (
           <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 bg-slate-800/50 rounded-full border border-slate-700">
                <Database className="w-3.5 h-3.5 text-secondary" />
                <span className="text-slate-400">Vector Index Active</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 bg-slate-800/50 rounded-full border border-slate-700">
                <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-slate-400">Gemini 3.0 Pro</span>
              </div>
           </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative">
        {appState === AppState.IDLE && (
          <div className="h-full flex items-center justify-center p-6">
             <div className="w-full max-w-2xl h-[400px]">
                <VideoUploader onFileSelect={handleFileSelect} />
             </div>
          </div>
        )}

        {(appState === AppState.PROCESSING || appState === AppState.ANALYZING) && (
          <div className="h-full flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-md text-center space-y-8">
              <div className="relative w-24 h-24 mx-auto">
                 <div className="absolute inset-0 border-4 border-slate-800 rounded-full"></div>
                 <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin"></div>
                 <Loader2 className="absolute inset-0 m-auto text-primary w-8 h-8 animate-pulse" />
              </div>
              
              <div className="space-y-2">
                 <h2 className="text-2xl font-bold text-white animate-pulse">{progress.stage}</h2>
                 <p className="text-slate-400">Analyzing visual patterns and audio...</p>
              </div>

              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-primary to-purple-400 h-full transition-all duration-500 ease-out" 
                  style={{ width: `${progress.progress}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {appState === AppState.ERROR && (
           <div className="h-full flex flex-col items-center justify-center">
             <div className="text-red-400 text-xl mb-4">Something went wrong.</div>
             <button 
               onClick={() => setAppState(AppState.IDLE)}
               className="px-6 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition"
             >
               Try Again
             </button>
           </div>
        )}

        {appState === AppState.READY && (
          <div className="h-full flex flex-col lg:flex-row">
            {/* Left: Player & Stats */}
            <div className="flex-1 p-6 flex flex-col overflow-y-auto">
               <div className="mb-6">
                 <Player 
                   videoFile={file} 
                   activeClip={activeClip} 
                   onDownloadClip={handleDownloadClip}
                   isDownloading={isDownloading}
                   onTimeUpdate={setCurrentTime}
                 />
               </div>
               
               {activeClip && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-surface p-6 rounded-xl border border-slate-800">
                        <div className="flex justify-between items-start mb-2 gap-4">
                           <h3 className="text-lg font-semibold text-white leading-tight">{activeClip.title}</h3>
                           <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-900 rounded-md border border-slate-800 text-xs font-mono text-slate-400 shrink-0">
                              <Clock className="w-3.5 h-3.5" />
                              <span>{formatTime(activeClip.startTime)} - {formatTime(activeClip.endTime)}</span>
                           </div>
                        </div>
                        <p className="text-slate-400 text-sm leading-relaxed mb-4">{activeClip.summary}</p>
                        <div className="flex flex-wrap gap-2">
                           {activeClip.tags.map(tag => (
                             <span key={tag} className="px-2 py-1 bg-slate-900 rounded text-xs text-slate-300">#{tag}</span>
                           ))}
                        </div>
                    </div>

                    <div className="bg-surface p-6 rounded-xl border border-slate-800">
                       <h4 className="text-xs font-bold uppercase text-slate-500 mb-4 tracking-wider">Virality Analysis</h4>
                       
                       <div className="flex items-center gap-4 mb-6">
                         <div className="relative w-16 h-16 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90">
                              <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-800" />
                              <circle 
                                cx="32" cy="32" r="28" 
                                stroke="currentColor" strokeWidth="4" fill="transparent" 
                                className={clsx("transition-all duration-1000", activeClip.viralityScore > 80 ? "text-green-500" : "text-yellow-500")}
                                strokeDasharray={175.9}
                                strokeDashoffset={175.9 - (175.9 * activeClip.viralityScore) / 100}
                              />
                            </svg>
                            <span className="absolute text-sm font-bold text-white">{activeClip.viralityScore}</span>
                         </div>
                         <div className="flex-1">
                           <p className="text-sm text-slate-300 italic">"{activeClip.reasoning}"</p>
                         </div>
                       </div>

                       <div className="bg-black/40 p-3 rounded-lg border border-slate-800/50">
                          <p className="text-xs text-slate-500 uppercase mb-1 font-bold">Transcript (AI Generated)</p>
                          <p className="text-sm text-slate-300 font-serif leading-relaxed">
                            {activeClip.transcriptStub}
                          </p>
                       </div>
                    </div>
                 </div>
               )}
            </div>

            {/* Right: Sidebar */}
            <div className="w-full lg:w-96 border-l border-slate-800 bg-surface/30 flex flex-col">
               {/* Sidebar Tabs */}
               <div className="flex border-b border-slate-800">
                  <button
                    onClick={() => setActiveSidebarTab('clips')}
                    className={clsx(
                      "flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2",
                      activeSidebarTab === 'clips' 
                        ? "border-primary text-white bg-slate-800/30" 
                        : "border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/30"
                    )}
                  >
                    <Film className="w-4 h-4" />
                    Clips
                  </button>
                  <button
                    onClick={() => setActiveSidebarTab('transcript')}
                    className={clsx(
                      "flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2",
                      activeSidebarTab === 'transcript' 
                        ? "border-primary text-white bg-slate-800/30" 
                        : "border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/30"
                    )}
                  >
                    <FileText className="w-4 h-4" />
                    Transcript
                  </button>
                  <button
                    onClick={() => setActiveSidebarTab('comments')}
                    className={clsx(
                      "flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2",
                      activeSidebarTab === 'comments' 
                        ? "border-primary text-white bg-slate-800/30" 
                        : "border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/30"
                    )}
                  >
                    <MessageSquare className="w-4 h-4" />
                    Comments
                  </button>
               </div>

               {/* Content Area */}
               <div className="flex-1 overflow-hidden">
                  {/* Search Bar (Shared for Clips and Transcript) */}
                  {(activeSidebarTab === 'clips' || activeSidebarTab === 'transcript') && (
                      <div className="p-4 border-b border-slate-800">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input 
                              type="text"
                              placeholder={activeSidebarTab === 'clips' ? "Search transcripts..." : "Search text..."}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-primary transition-colors"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {isSearching && (
                              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <Loader2 className="w-3 h-3 text-slate-500 animate-spin" />
                              </div>
                            )}
                          </div>
                      </div>
                  )}

                 {activeSidebarTab === 'clips' ? (
                      /* Clips List */
                      <div className="h-full flex flex-col p-4">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500 bg-slate-900 px-2 py-0.5 rounded-full">{filteredClips.length} clips</span>
                            </div>

                            {/* Sort Control */}
                            <div className="flex items-center gap-2">
                                <ListFilter className="w-3.5 h-3.5 text-slate-500" />
                                <select 
                                    value={sortOrder}
                                    onChange={(e) => setSortOrder(e.target.value as 'time' | 'viral')}
                                    className="bg-slate-900 border border-slate-700 text-xs text-slate-300 rounded px-2 py-1 outline-none focus:border-primary cursor-pointer hover:border-slate-500 transition-colors"
                                >
                                    <option value="time">Chronological</option>
                                    <option value="viral">Virality Score</option>
                                </select>
                            </div>
                          </div>
                          <ClipList 
                            clips={filteredClips} 
                            activeClip={activeClip} 
                            onClipSelect={setActiveClip}
                          />
                      </div>
                 ) : activeSidebarTab === 'transcript' ? (
                    <TranscriptView 
                        transcript={transcript}
                        currentTime={currentTime}
                        onSegmentClick={handleTranscriptSegmentClick}
                        searchQuery={searchQuery}
                    />
                 ) : (
                   <CommentSection 
                      comments={comments}
                      onCommentsChange={setComments}
                      onAnalyze={handleAnalyzeComments}
                      analysis={commentAnalysis}
                      isAnalyzing={isAnalyzingComments}
                   />
                 )}
               </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;