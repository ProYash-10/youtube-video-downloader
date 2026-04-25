import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import ytdl from "@distube/ytdl-core";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sseClients = new Map<string, express.Response>();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API constraints: check health
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // API to fetch info about a single video
  app.post("/api/info", async (req, res) => {
    const { url } = req.body;
    if (!url || !ytdl.validateURL(url)) {
      return res.status(400).json({ error: "Invalid YouTube URL" });
    }

    try {
      const info = await getVideoInfo(url);
      res.json(info);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message || "Failed to fetch video info" });
    }
  });

  // API to fetch info about multiple videos
  app.post("/api/info/batch", async (req, res) => {
    const { urls } = req.body;
    if (!urls || !Array.isArray(urls)) {
      return res.status(400).json({ error: "Invalid request, 'urls' must be an array" });
    }

    try {
      const uniqueUrls = [...new Set(urls)].filter(url => ytdl.validateURL(url)).slice(0, 50);
      const results = await Promise.allSettled(uniqueUrls.map(url => getVideoInfo(url)));
      
      const successful = results
        .filter(r => r.status === 'fulfilled')
        .map(r => (r as PromiseFulfilledResult<any>).value);
        
      res.json(successful);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message || "Failed to fetch batch video info" });
    }
  });

  async function getVideoInfo(url: string) {
    const info = await ytdl.getInfo(url);
    const formats = info.formats
      .filter((f) => f.hasVideo || f.hasAudio)
      .map((f) => ({
        itag: f.itag,
        mimeType: f.mimeType,
        qualityLabel: f.qualityLabel,
        bitrate: f.bitrate,
        audioBitrate: f.audioBitrate,
        container: f.container,
        hasVideo: f.hasVideo,
        hasAudio: f.hasAudio,
        approxDurationMs: f.approxDurationMs,
        contentLength: f.contentLength,
      }));

    return {
      url: url,
      title: info.videoDetails.title,
      thumbnail: info.videoDetails.thumbnails?.[info.videoDetails.thumbnails.length - 1]?.url,
      lengthSeconds: info.videoDetails.lengthSeconds,
      author: info.videoDetails.author.name,
      formats: formats,
    };
  }

  // SSE endpoint for download progress
  app.get("/api/progress", (req, res) => {
    const { downloadId } = req.query;
    if (!downloadId || typeof downloadId !== 'string') {
       return res.status(400).send("Missing downloadId");
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    res.flushHeaders();

    sseClients.set(downloadId, res);
    res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

    req.on('close', () => {
      sseClients.delete(downloadId);
    });
  });

  // API to download a video
  app.get("/api/download", async (req, res) => {
    const { url, itag, downloadId } = req.query;
    
    if (!url || typeof url !== 'string' || !ytdl.validateURL(url)) {
      return res.status(400).send("Invalid YouTube URL");
    }

    try {
      const info = await ytdl.getInfo(url);
      const videoTitle = info.videoDetails.title.replace(/[^\w\s-]/gi, '') || 'video';
      
      const format = itag ? parseInt(itag as string, 10) : undefined;
      let downloadOptions: any = { filter: "audioandvideo" };
      
      if (format) {
        // Find if this itag exists
        const chosen = info.formats.find(f => f.itag === format);
        if (chosen) {
           downloadOptions = { quality: format };
        } else {
           // Fallback to highest
           downloadOptions = { filter: "audioandvideo", quality: 'highest' };
        }
      }
      
      const chosenFormat = ytdl.chooseFormat(info.formats, downloadOptions);
      if (!chosenFormat) {
        return res.status(404).send("Format not found.");
      }

      const container = chosenFormat.container || 'mp4';
      
      res.header("Content-Disposition", `attachment; filename="${videoTitle}.${container}"`);
      if (chosenFormat.mimeType) {
         res.header("Content-Type", chosenFormat.mimeType.split(';')[0]);
      } else {
         res.header("Content-Type", 'video/mp4');
      }

      const video = ytdl(url, downloadOptions);

      if (downloadId && typeof downloadId === 'string') {
         video.on('progress', (chunkLength, downloaded, total) => {
            const sse = sseClients.get(downloadId);
            if (sse) {
               sse.write(`data: ${JSON.stringify({ type: 'progress', downloaded, total })}\n\n`);
            }
         });
         video.on('end', () => {
            const sse = sseClients.get(downloadId);
            if (sse) {
               sse.write(`data: ${JSON.stringify({ type: 'complete' })}\n\n`);
            }
         });
      }

      video.pipe(res);
    } catch (err: any) {
      console.error(err);
      if (!res.headersSent) {
         res.status(500).send("Error downloading video.");
      }
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
