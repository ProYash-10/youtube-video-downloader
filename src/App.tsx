import React, { useState, FormEvent, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Download,
  Search,
  Video,
  Music,
  Loader2,
  AlertCircle,
  FileVideo2,
  Film,
  HardDriveDownload,
  Copy,
  Check,
  ChevronDown,
  ChevronUp
} from "lucide-react";

interface Format {
  itag: number;
  mimeType: string;
  qualityLabel: string;
  bitrate: number;
  audioBitrate: number;
  container: string;
  hasVideo: boolean;
  hasAudio: boolean;
  approxDurationMs?: string;
  contentLength?: string;
}

interface VideoInfo {
  url: string;
  title: string;
  thumbnail: string;
  lengthSeconds: string;
  author: string;
  formats: Format[];
}

interface DownloadState {
  downloaded: number;
  total: number;
  active: boolean;
}

export default function App() {
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [videos, setVideos] = useState<VideoInfo[]>([]);
  const [expandedVideos, setExpandedVideos] = useState<Set<string>>(new Set());
  const [downloads, setDownloads] = useState<Record<string, DownloadState>>({});
  const [copied, setCopied] = useState(false);

  const fetchVideoInfo = async (e: FormEvent) => {
    e.preventDefault();
    const urls = inputText.split(/[\n, ]+/).map(u => u.trim()).filter(Boolean);
    if (!urls.length) return;

    setLoading(true);
    setError("");
    setVideos([]);
    setExpandedVideos(new Set()); // start collapsed or auto-expand if single

    try {
      const res = await fetch("/api/info/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ urls }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch video info");
      }

      setVideos(data);
      if (data.length === 1) {
        setExpandedVideos(new Set([data[0].url]));
      }

    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyUrl = () => {
    if (!inputText) return;
    navigator.clipboard.writeText(inputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatFileSize = (bytes?: string | number) => {
    if (bytes === undefined || bytes === null || bytes === "0") return "Unknown size";
    const size = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
    if (size === 0) return "0 B";
    const i = Math.floor(Math.log(size) / Math.log(1024));
    return `${(size / Math.pow(1024, i)).toFixed(2)} ${["B", "KB", "MB", "GB", "TB"][i]}`;
  };

  const handleDownload = (videoUrl: string, itag?: number) => {
    const downloadId = Math.random().toString(36).substring(2, 15);
    
    setDownloads(prev => ({
      ...prev,
      [videoUrl]: { downloaded: 0, total: 0, active: true }
    }));

    const es = new EventSource(`/api/progress?downloadId=${downloadId}`);
    
    es.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'progress') {
        setDownloads(prev => ({
          ...prev,
          [videoUrl]: { 
            downloaded: data.downloaded, 
            total: data.total, 
            active: true 
          }
        }));
      }
      if (data.type === 'complete') {
        setDownloads(prev => ({
          ...prev,
          [videoUrl]: { ...prev[videoUrl], active: false }
        }));
        es.close();
      }
    };

    es.onerror = () => {
       es.close();
    };

    const downloadUrl = `/api/download?url=${encodeURIComponent(videoUrl)}&downloadId=${downloadId}${itag ? `&itag=${itag}` : ""}`;
    
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const toggleExpand = (url: string) => {
    setExpandedVideos(prev => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  const handleDownloadAll = () => {
    videos.forEach(v => {
      handleDownload(v.url);
    });
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 font-sans selection:bg-rose-500/30 pb-20">
      {/* Background Decorative Graphic */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none flex justify-center items-start">
        <div className="w-[1000px] h-[500px] bg-rose-500/20 blur-[120px] rounded-[100%] opacity-30 animate-pulse -translate-y-1/2"></div>
      </div>

      <main className="relative z-10 max-w-5xl mx-auto px-6 py-16 md:py-24">
        {/* Header section */}
        <div className="text-center space-y-4 mb-12">
          <div className="inline-flex items-center justify-center p-3 bg-neutral-900 border border-neutral-800 rounded-2xl mb-4 shadow-xl">
            <Film className="w-8 h-8 text-rose-500" strokeWidth={1.5} />
          </div>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-white">
            Fetch. Download. <span className="text-rose-500">Batch.</span>
          </h1>
          <p className="text-neutral-400 text-lg max-w-xl mx-auto font-medium">
            Paste one or multiple YouTube URLs below. Extract high-quality video and audio formats instantly.
          </p>
        </div>

        {/* Input section */}
        <motion.form 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          onSubmit={fetchVideoInfo} 
          className="relative group max-w-3xl mx-auto"
        >
          <div className="absolute -inset-0.5 bg-gradient-to-r from-rose-500 to-orange-500 rounded-2xl opacity-30 group-focus-within:opacity-100 transition duration-500 blur-sm"></div>
          <div className="relative bg-neutral-900 rounded-2xl shadow-2xl p-2 border border-neutral-800 focus-within:border-neutral-700 transition-colors flex flex-col sm:flex-row gap-2 items-end sm:items-center">
            <div className="flex-1 w-full pl-2">
              <textarea
                placeholder="https://www.youtube.com/watch?v=...&#10;https://www.youtube.com/watch?v=..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="w-full bg-transparent px-2 py-4 text-white placeholder:text-neutral-600 focus:outline-none font-mono text-sm sm:text-base resize-none min-h-[56px]"
                rows={inputText.split('\n').length > 1 ? Math.min(inputText.split('\n').length, 5) : 1}
                required
              />
            </div>
            
            <div className="flex items-center gap-2 p-2 sm:p-0 w-full sm:w-auto flex-col sm:flex-row justify-end">
              <div className="flex w-full gap-2 justify-end">
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  disabled={!inputText}
                  className="p-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl transition-colors disabled:opacity-50 border border-neutral-700"
                  title="Copy URL(s)"
                >
                  {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                </button>
                
                <button
                  type="submit"
                  disabled={loading || !inputText}
                  className="bg-white hover:bg-neutral-200 text-neutral-950 font-semibold px-6 py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:scale-105 active:scale-95 whitespace-nowrap w-full sm:w-auto"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Parsing...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      <span>Fetch Video{inputText.includes('\n') || inputText.includes(',') ? 's' : ''}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.form>

        {/* Error message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              className="max-w-2xl mx-auto mt-6"
            >
              <div className="flex items-center gap-3 text-red-400 bg-red-950/30 border border-red-900/50 p-4 rounded-xl">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="text-sm font-medium">{error}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Batch Actions */}
        <AnimatePresence>
           {videos.length > 1 && (
             <motion.div
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="mt-12 flex items-center justify-between max-w-4xl mx-auto"
             >
                <h2 className="text-xl font-bold flex items-center gap-2">
                   <Film className="w-5 h-5 text-rose-500" />
                   Batch Results ({videos.length})
                </h2>
                <button
                  onClick={handleDownloadAll}
                  className="bg-neutral-800 hover:bg-neutral-700 text-white font-medium px-4 py-2 rounded-lg flex items-center gap-2 transition-colors border border-neutral-700"
                >
                   <HardDriveDownload className="w-4 h-4" />
                   <span className="hidden sm:inline">Download All (Default Quality)</span>
                   <span className="sm:hidden">Download All</span>
                </button>
             </motion.div>
           )}
        </AnimatePresence>

        {/* Results section */}
        <AnimatePresence>
          {videos.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              className={`mt-8 grid gap-6 ${videos.length === 1 ? 'max-w-4xl mx-auto' : 'max-w-4xl mx-auto'}`}
            >
              {videos.map((videoInfo, index) => {
                const isExpanded = expandedVideos.has(videoInfo.url);
                const downloadState = downloads[videoInfo.url];
                const progressPercent = downloadState && downloadState.total ? (downloadState.downloaded / downloadState.total) * 100 : 0;
                
                return (
                 <motion.div 
                   key={index}
                   layout
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   className="bg-neutral-900/80 backdrop-blur-xl border border-neutral-800 rounded-3xl overflow-hidden flex flex-col transition-colors hover:border-neutral-700"
                 >
                   {/* Compact Header Row */}
                   <div className="p-4 flex flex-col md:flex-row gap-4 items-start md:items-center">
                     <div className="relative w-full md:w-56 aspect-video shrink-0 rounded-xl overflow-hidden bg-neutral-950 border border-neutral-800 hidden sm:block">
                       {videoInfo.thumbnail ? (
                         <img 
                           src={videoInfo.thumbnail} 
                           alt={videoInfo.title} 
                           className="object-cover w-full h-full"
                         />
                       ) : (
                         <div className="w-full h-full flex items-center justify-center">
                           <FileVideo2 className="w-8 h-8 text-neutral-800" />
                         </div>
                       )}
                       <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                       <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-mono border border-white/10">
                         {Math.floor(parseInt(videoInfo.lengthSeconds) / 60)}:
                         {String(parseInt(videoInfo.lengthSeconds) % 60).padStart(2, '0')}
                       </div>
                     </div>

                     <div className="flex-1 min-w-0 flex flex-col justify-center w-full">
                       <h2 className="text-lg font-bold leading-tight line-clamp-2" title={videoInfo.title}>
                         {videoInfo.title}
                       </h2>
                       <p className="text-neutral-400 mt-1 text-sm font-medium flex items-center gap-2">
                         <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                         {videoInfo.author}
                       </p>
                     </div>

                     <div className="flex flex-row items-center gap-2 w-full md:w-auto mt-2 md:mt-0 justify-end">
                       <button 
                         onClick={() => handleDownload(videoInfo.url)}
                         className="flex-1 md:flex-none bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 font-medium px-4 py-3 md:py-2.5 rounded-xl transition-all border border-rose-500/20 flex items-center justify-center gap-2"
                         title="Download Best Quality"
                       >
                         <HardDriveDownload className="w-4 h-4" />
                         <span>Download</span>
                       </button>
                       <button
                         onClick={() => toggleExpand(videoInfo.url)}
                         className="p-3 md:p-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl transition-colors border border-neutral-700 shrink-0"
                       >
                         {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                       </button>
                     </div>
                   </div>

                   {/* Progress Bar Area */}
                   <AnimatePresence>
                     {downloadState && downloadState.active && (
                       <motion.div 
                         initial={{ height: 0, opacity: 0 }}
                         animate={{ height: "auto", opacity: 1 }}
                         exit={{ height: 0, opacity: 0 }}
                         className="px-4 pb-4"
                       >
                         <div className="flex items-center justify-between text-xs text-neutral-400 mb-2 font-mono">
                           <span>Downloading...</span>
                           <span>{formatFileSize(downloadState.downloaded)} / {formatFileSize(downloadState.total)}</span>
                         </div>
                         <div className="w-full bg-neutral-950 rounded-full h-2 border border-neutral-800 overflow-hidden">
                           <div 
                             className="bg-gradient-to-r from-rose-500 to-orange-500 h-2 rounded-full transition-all duration-300 ease-out relative"
                             style={{ width: `${Math.max(progressPercent, 2)}%` }}
                           >
                              {/* animated shimmer on progress bar */}
                              <div className="absolute inset-0 bg-white/20 w-full animate-pulse"></div>
                           </div>
                         </div>
                       </motion.div>
                     )}
                   </AnimatePresence>

                   {/* Expanded Formats list */}
                   <AnimatePresence>
                     {isExpanded && (
                       <motion.div
                         initial={{ height: 0, opacity: 0 }}
                         animate={{ height: "auto", opacity: 1 }}
                         exit={{ height: 0, opacity: 0 }}
                         className="border-t border-neutral-800 bg-neutral-900/50"
                       >
                         <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Video Formats */}
                            <div>
                               <h3 className="text-sm font-bold flex items-center gap-2 text-white/80 mb-3 uppercase tracking-wider">
                                 <Video className="w-4 h-4 text-blue-400" /> Video
                               </h3>
                               <div className="grid gap-2">
                                 {videoInfo.formats
                                  .filter(f => f.hasVideo)
                                  .sort((a, b) => parseInt(b.qualityLabel || "0") - parseInt(a.qualityLabel || "0"))
                                  .slice(0, 8)
                                  .map((format, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-neutral-900 border border-neutral-800 rounded-xl hover:border-neutral-700 transition-colors group">
                                      <div className="flex flex-col">
                                        <span className="font-semibold flex items-center gap-2 text-sm text-neutral-200">
                                          {format.qualityLabel || 'Unknown'} 
                                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-neutral-800 text-neutral-400 uppercase">
                                            {format.container}
                                          </span>
                                        </span>
                                        <span className="text-[11px] text-neutral-500 font-medium mt-0.5">
                                          {format.hasAudio ? 'Inc. Audio' : 'Video Only'} • {formatFileSize(format.contentLength)}
                                        </span>
                                      </div>
                                      <button
                                        onClick={() => handleDownload(videoInfo.url, format.itag)}
                                        className="p-2 bg-neutral-800 group-hover:bg-blue-500/20 group-hover:text-blue-400 text-neutral-400 rounded-lg transition-colors shrink-0"
                                      >
                                        <Download className="w-4 h-4" />
                                      </button>
                                    </div>
                                  ))}
                               </div>
                            </div>
                            
                            {/* Audio Formats */}
                            <div>
                               <h3 className="text-sm font-bold flex items-center gap-2 text-white/80 mb-3 uppercase tracking-wider">
                                 <Music className="w-4 h-4 text-indigo-400" /> Audio Only
                               </h3>
                               <div className="grid gap-2">
                                 {videoInfo.formats
                                    .filter(f => !f.hasVideo && f.hasAudio)
                                    .sort((a, b) => (b.audioBitrate || 0) - (a.audioBitrate || 0))
                                    .slice(0, 5)
                                    .map((format, idx) => (
                                      <div key={idx} className="flex items-center justify-between p-3 bg-neutral-900 border border-neutral-800 rounded-xl hover:border-neutral-700 transition-colors group">
                                        <div className="flex flex-col">
                                          <span className="font-semibold flex items-center gap-2 text-sm text-neutral-200">
                                            {format.audioBitrate} kbps
                                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-neutral-800 text-neutral-400 uppercase">
                                              {format.container}
                                            </span>
                                          </span>
                                          <span className="text-[11px] text-neutral-500 font-medium mt-0.5">
                                            {formatFileSize(format.contentLength)}
                                          </span>
                                        </div>
                                        <button
                                          onClick={() => handleDownload(videoInfo.url, format.itag)}
                                          className="p-2 bg-neutral-800 group-hover:bg-indigo-500/20 group-hover:text-indigo-400 text-neutral-400 rounded-lg transition-colors shrink-0"
                                        >
                                          <Download className="w-4 h-4" />
                                        </button>
                                      </div>
                                    ))}
                               </div>
                            </div>
                         </div>
                       </motion.div>
                     )}
                   </AnimatePresence>
                 </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Footer info text if empty */}
        {videos.length === 0 && !loading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-24 text-center"
          >
            <p className="text-neutral-600 text-sm font-medium">
              This tool utilizes the backend to stream files securely without violating CORS rules.
            </p>
          </motion.div>
        )}
      </main>
    </div>
  );
}
