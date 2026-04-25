/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, FormEvent } from "react";
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
  HardDriveDownload
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
  title: string;
  thumbnail: string;
  lengthSeconds: string;
  author: string;
  formats: Format[];
}

export default function App() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);

  const fetchVideoInfo = async (e: FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setLoading(true);
    setError("");
    setVideoInfo(null);

    try {
      const res = await fetch("/api/info", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch video info");
      }

      setVideoInfo(data);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes?: string) => {
    if (!bytes) return "Unknown size";
    const size = parseInt(bytes, 10);
    if (size === 0) return "0 B";
    const i = Math.floor(Math.log(size) / Math.log(1024));
    return `${(size / Math.pow(1024, i)).toFixed(2)} ${["B", "KB", "MB", "GB", "TB"][i]}`;
  };

  const handleDownload = (itag?: number) => {
    if (!url) return;
    const downloadUrl = `/api/download?url=${encodeURIComponent(url)}${itag ? `&itag=${itag}` : ""}`;
    window.location.href = downloadUrl;
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 font-sans selection:bg-rose-500/30">
      {/* Background Decorative Graphic */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none flex justify-center items-start">
        <div className="w-[1000px] h-[500px] bg-rose-500/20 blur-[120px] rounded-[100%] opacity-30 animate-pulse -translate-y-1/2"></div>
      </div>

      <main className="relative z-10 max-w-4xl mx-auto px-6 py-16 md:py-24">
        {/* Header section */}
        <div className="text-center space-y-4 mb-12">
          <div className="inline-flex items-center justify-center p-3 bg-neutral-900 border border-neutral-800 rounded-2xl mb-4 shadow-xl">
            <Film className="w-8 h-8 text-rose-500" strokeWidth={1.5} />
          </div>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-white">
            Fetch. Download. <span className="text-rose-500">Keep.</span>
          </h1>
          <p className="text-neutral-400 text-lg max-w-xl mx-auto font-medium">
            Paste a YouTube URL below to extract high-quality video and audio formats instantly. No ads, no nonsense.
          </p>
        </div>

        {/* Input section */}
        <motion.form 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          onSubmit={fetchVideoInfo} 
          className="relative group max-w-2xl mx-auto"
        >
          <div className="absolute -inset-0.5 bg-gradient-to-r from-rose-500 to-orange-500 rounded-full opacity-30 group-focus-within:opacity-100 transition duration-500 blur-sm"></div>
          <div className="relative flex items-center bg-neutral-900 rounded-full shadow-2xl p-2 border border-neutral-800 focus-within:border-neutral-700 transition-colors">
            <div className="pl-4 pr-2 text-neutral-500">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              placeholder="https://www.youtube.com/watch?v=..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1 bg-transparent px-2 py-3 text-white placeholder:text-neutral-600 focus:outline-none font-mono text-sm sm:text-base selection:bg-rose-500/30"
              required
            />
            <button
              type="submit"
              disabled={loading || !url}
              className="bg-white hover:bg-neutral-200 text-neutral-950 font-semibold px-6 py-2.5 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:scale-105 active:scale-95"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Fetching...</span>
                </>
              ) : (
                <>
                  <Video className="w-4 h-4" />
                  <span>Parse</span>
                </>
              )}
            </button>
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

        {/* Results section */}
        <AnimatePresence>
          {videoInfo && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              className="mt-16 grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              {/* Media Preview Card */}
              <div className="lg:col-span-5">
                <div className="bg-neutral-900/80 backdrop-blur-xl border border-neutral-800 p-4 rounded-3xl sticky top-8">
                  <div className="relative aspect-video rounded-2xl overflow-hidden bg-neutral-950 border border-neutral-800">
                    {videoInfo.thumbnail ? (
                      <img 
                        src={videoInfo.thumbnail} 
                        alt={videoInfo.title} 
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FileVideo2 className="w-12 h-12 text-neutral-800" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                    <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md text-xs font-mono border border-white/10">
                      {Math.floor(parseInt(videoInfo.lengthSeconds) / 60)}:
                      {String(parseInt(videoInfo.lengthSeconds) % 60).padStart(2, '0')}
                    </div>
                  </div>
                  <div className="mt-5 px-1">
                    <h2 className="text-xl font-bold leading-snug line-clamp-2">
                      {videoInfo.title}
                    </h2>
                    <p className="text-neutral-400 mt-2 text-sm font-medium flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                      {videoInfo.author}
                    </p>
                  </div>
                  
                  {/* Default Download Action */}
                  <div className="mt-6">
                    <button 
                      onClick={() => handleDownload()}
                      className="w-full bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-400 hover:to-orange-400 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-rose-500/20 flex items-center justify-center gap-2"
                    >
                      <HardDriveDownload className="w-5 h-5" />
                      Download Best Quality (Default)
                    </button>
                  </div>
                </div>
              </div>

              {/* Formats List */}
              <div className="lg:col-span-7 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-white">
                    <Video className="w-5 h-5 text-blue-400" />
                    Video Options
                  </h3>
                  <div className="mt-4 grid gap-3">
                    {videoInfo.formats
                      .filter(f => f.hasVideo)
                      .sort((a, b) => {
                        const aRes = parseInt(a.qualityLabel || "0");
                        const bRes = parseInt(b.qualityLabel || "0");
                        return bRes - aRes;
                      })
                      .map((format, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 bg-neutral-900 border border-neutral-800 rounded-2xl hover:border-neutral-700 transition-colors">
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold flex items-center gap-2 text-base">
                              {format.qualityLabel || 'Unknown'} 
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono tracking-wider font-bold bg-neutral-800 text-neutral-400 uppercase">
                                {format.container}
                              </span>
                            </span>
                            <span className="text-xs text-neutral-500 font-medium">
                              {format.hasAudio ? 'Includes Audio' : 'No Audio (Video Only)'} • {formatFileSize(format.contentLength)}
                            </span>
                          </div>
                          <button
                            onClick={() => handleDownload(format.itag)}
                            className="p-3 bg-neutral-800/50 hover:bg-neutral-800 text-white rounded-xl transition-colors shrink-0"
                            title="Download this format"
                          >
                            <Download className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="pt-6 border-t border-neutral-800">
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-white">
                    <Music className="w-5 h-5 text-indigo-400" />
                    Audio-Only Options
                  </h3>
                  <div className="mt-4 grid gap-3">
                    {videoInfo.formats
                      .filter(f => !f.hasVideo && f.hasAudio)
                      .sort((a, b) => (b.audioBitrate || 0) - (a.audioBitrate || 0))
                      .map((format, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 bg-neutral-900 border border-neutral-800 rounded-2xl hover:border-neutral-700 transition-colors">
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold flex items-center gap-2 text-base">
                              {format.audioBitrate} kbps
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono tracking-wider font-bold bg-neutral-800 text-neutral-400 uppercase">
                                {format.container}
                              </span>
                            </span>
                            <span className="text-xs text-neutral-500 font-medium">
                              Audio Only • {formatFileSize(format.contentLength)}
                            </span>
                          </div>
                          <button
                            onClick={() => handleDownload(format.itag)}
                            className="p-3 bg-neutral-800/50 hover:bg-neutral-800 text-white rounded-xl transition-colors shrink-0"
                            title="Download audio"
                          >
                            <Download className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Footer info text if empty */}
        {!videoInfo && !loading && (
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

