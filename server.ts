import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import ytdl from "@distube/ytdl-core";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API constraints: check health
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // API to fetch info about a video
  app.post("/api/info", async (req, res) => {
    const { url } = req.body;
    if (!url || !ytdl.validateURL(url)) {
      return res.status(400).json({ error: "Invalid YouTube URL" });
    }

    try {
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

      res.json({
        title: info.videoDetails.title,
        thumbnail: info.videoDetails.thumbnails?.[info.videoDetails.thumbnails.length - 1]?.url,
        lengthSeconds: info.videoDetails.lengthSeconds,
        author: info.videoDetails.author.name,
        formats: formats,
      });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message || "Failed to fetch video info" });
    }
  });

  // API to download a video
  app.get("/api/download", async (req, res) => {
    const { url, itag } = req.query;
    
    if (!url || typeof url !== 'string' || !ytdl.validateURL(url)) {
      return res.status(400).send("Invalid YouTube URL");
    }

    try {
      const info = await ytdl.getInfo(url);
      const videoTitle = info.videoDetails.title.replace(/[^\w\s-]/gi, '') || 'video';
      
      const format = itag ? parseInt(itag as string, 10) : undefined;
      const downloadOptions = format ? { quality: format } : { filter: "audioandvideo" };
      
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

      ytdl(url, downloadOptions).pipe(res);
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
