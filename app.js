const express = require("express");
const puppeteer = require("puppeteer");
const { setTimeout } = require("node:timers/promises");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const crypto = require("crypto");
const helmet = require("helmet");
require("dotenv").config();
const {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} = require("@google/generative-ai");

const app = express();
const PORT = process.env.PORT || 3000;

// --- Config & AI Setup ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// --- Middleware ---
app.use(helmet({ contentSecurityPolicy: false })); // CSP disabled for CDN script loading
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Ensure temp and public directories exist
const TEMP_BASE_DIR = path.join(__dirname, "temp");
const PUBLIC_VIDEO_DIR = path.join(__dirname, "public", "videos");
[TEMP_BASE_DIR, PUBLIC_VIDEO_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

/**
 * Executes shell commands (FFmpeg)
 */
function executeCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) reject(new Error(`FFmpeg Error: ${stderr}`));
      else resolve(stdout);
    });
  });
}

/**
 * Core Logic: Generates video from HTML
 */
async function generateVideo(htmlContent, sessionId) {
  const workDir = path.join(TEMP_BASE_DIR, sessionId);
  const videoFileName = `video_${sessionId}.mp4`;
  const videoPath = path.join(PUBLIC_VIDEO_DIR, videoFileName);

  const settings = {
    fps: 30,
    duration: 5,
    width: 1280, // 720p for better performance/speed ratio
    height: 720,
  };

  fs.mkdirSync(workDir, { recursive: true });
  const htmlPath = path.join(workDir, "index.html");
  fs.writeFileSync(htmlPath, htmlContent);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: settings.width, height: settings.height });
    await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle0" });

    const totalFrames = settings.fps * settings.duration;
    console.log(`[${sessionId}] Capturing ${totalFrames} frames...`);

    for (let i = 0; i < totalFrames; i++) {
      const framePath = path.join(
        workDir,
        `frame_${String(i).padStart(5, "0")}.webp`,
      );
      await page.screenshot({ path: framePath, type: "webp", quality: 80 });
      // Small delay to allow JS animations to progress
      await setTimeout(1000 / settings.fps);
    }

    const inputPattern = path.join(workDir, "frame_%05d.webp");
    const ffmpegCmd = `ffmpeg -y -framerate ${settings.fps} -i "${inputPattern}" -c:v libx264 -pix_fmt yuv420p -crf 23 "${videoPath}"`;

    await executeCommand(ffmpegCmd);
    return `/videos/${videoFileName}`;
  } finally {
    if (browser) await browser.close();
    // Cleanup temp frames
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}

app.post("/generate", async (req, res) => {
  const { prompt } = req.body;
  const sessionId = crypto.randomUUID();

  if (!prompt || prompt.length < 5) {
    return res.status(400).json({ error: "Prompt is too short." });
  }

  try {
    const systemInstruction = `You are a creative developer. Create a single-file HTML/CSS/JS animation using GSAP. 
        Return ONLY raw HTML. No markdown, no backticks, no explanations. 
        Include: <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      systemInstruction,
      generationConfig: { temperature: 0.4, maxOutputTokens: 8000 },
    });

    let html = result.response.text();
    // Sanitize: AI sometimes wraps code in ```html blocks despite instructions
    html = html.replace(/```html|```/g, "").trim();

    const videoUrl = await generateVideo(html, sessionId);
    res.json({ videoUrl });
  } catch (error) {
    console.error("Process Error:", error);
    res
      .status(500)
      .json({
        error: "Failed to generate video. Please try a different prompt.",
      });
  }
});

app.listen(PORT, () => console.log(`Server live at http://localhost:${PORT}`));
