const puppeteer = require('puppeteer');
const {
    setTimeout
} = require('node:timers/promises');
const fs = require('fs');
const path = require('path');
const {
    exec
} = require('child_process');
const express = require('express');
require('dotenv').config();


const {
    GoogleGenerativeAI,
    HarmCategory,
    HarmBlockThreshold
} = require("@google/generative-ai");

const app = express();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
    console.error("FATAL ERROR: GEMINI_API_KEY is not set in the environment variables.");
    process.exit(1);
}
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash"
});

const generationConfig = {
    temperature: 0.3,
    topK: 1,
    topP: 1,
    maxOutputTokens: 8192,
};

const safetySettings = [{
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_NONE
    },
    {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_NONE
    },
    {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_NONE
    },
    {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_NONE
    },
];

// --- Middleware ---
app.use(express.urlencoded({
    extended: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));


// A helper function to promisify exec for cleaner async/await usage.
function executeCommand(command) {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`exec error: ${error.message}`);
                // ADDED: Include stderr in the rejection for better debugging
                reject(new Error(`FFmpeg command failed:\n${stderr}`));
                return;
            }
            if (stderr) {
                console.warn(`Command stderr:\n${stderr}`);
            }
            console.log(`Command stdout:\n${stdout}`);
            resolve(stdout);
        });
    });
}

// Video generation logic
async function generateVideoFromHtml(htmlContent) {
    const outputDir = 'screenshots_for_video';
    const generatedHtmlFile = 'generated.html';
    const framesPerSecond = 30;
    const captureDurationInSeconds = 5;

    const videoFileName = 'output_video.mp4';
    const publicVideoPath = path.join(__dirname, 'public', videoFileName);
    const videoResolution = {
        width: 1920,
        height: 1080
    };
    const screenshotType = 'webp';
    const screenshotQuality = 90;

    // --- Cleanup and Setup ---
    if (fs.existsSync(outputDir)) {
        fs.rmSync(outputDir, {
            recursive: true,
            force: true
        });
    }
    fs.mkdirSync(outputDir, {
        recursive: true
    });

    // Cleanup old video file if it exists
    if (fs.existsSync(publicVideoPath)) {
        fs.unlinkSync(publicVideoPath);
    }

    const generatedHtmlPath = path.join(__dirname, generatedHtmlFile);
    fs.writeFileSync(generatedHtmlPath, htmlContent, 'utf8');

    let browser;
    try {
        // --- Puppeteer Launch and Page Setup ---
        console.log('Launching Puppeteer...');
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox', `--window-size=${videoResolution.width},${videoResolution.height}`]
        });
        const page = await browser.newPage();
        await page.setViewport({
            width: videoResolution.width,
            height: videoResolution.height,
            deviceScaleFactor: 1,
        });
        const pageUrl = `file://${generatedHtmlPath}`;
        console.log(`Navigating to: ${pageUrl}`);
        await page.goto(pageUrl, {
            waitUntil: 'networkidle0'
        });

        // --- Screenshot Capture Loop ---
        const totalFramesToCapture = framesPerSecond * captureDurationInSeconds;
        const intervalMs = 1000 / framesPerSecond;
        console.log(`Starting to capture ${totalFramesToCapture} frames...`);
        for (let i = 0; i < totalFramesToCapture; i++) {
            const startTime = Date.now();
            const filename = path.join(outputDir, `frame_${String(i).padStart(5, '0')}.${screenshotType}`);
            await page.screenshot({
                path: filename,
                type: screenshotType,
                quality: screenshotQuality,
                fullPage: false,
            });
            const elapsedTime = Date.now() - startTime;
            const delay = intervalMs - elapsedTime;
            if (delay > 0) await setTimeout(delay);
        }
        console.log(`Finished capturing ${totalFramesToCapture} frames.`);

        // --- FFmpeg Video Compilation ---
        const inputPattern = path.join(outputDir, `frame_%05d.${screenshotType}`);
        // Output path for ffmpeg command is the full public path
        const ffmpegCommand = `ffmpeg -y -framerate ${framesPerSecond} -i "${inputPattern}" -c:v libx264 -crf 18 -pix_fmt yuv420p "${publicVideoPath}"`;
        console.log(`Executing FFmpeg command: ${ffmpegCommand}`);
        await executeCommand(ffmpegCommand);
        console.log(`Video created successfully: ${publicVideoPath}`);

        // Return the URL
        return `/${videoFileName}`;

    } catch (e) {
        console.error('\nAn error occurred during the video generation process:', e);
        throw e;
    } finally {
        if (browser) {
            await browser.close();
            console.log('Puppeteer browser closed.');
        }
        // Cleanup temporary files after we are done.
        if (fs.existsSync(outputDir)) {
            fs.rmSync(outputDir, {
                recursive: true,
                force: true
            });
        }
        if (fs.existsSync(generatedHtmlPath)) {
            fs.unlinkSync(generatedHtmlPath);
        }
    }
}


app.post('/generate', async (req, res) => {
    const userPrompt = req.body.prompt;
    console.log(`Received prompt: "${userPrompt}"`);

    if (!userPrompt || typeof userPrompt !== 'string' || userPrompt.trim() === '') {
        return res.status(400).json({
            error: 'Prompt is required and must be a non-empty string.'
        });
    }

    try {
        // Prompt
        const systemInstruction = `
        You are a world-class creative developer. You specialize in crafting visually stunning, single-file animated web pages using only HTML, CSS, and JavaScript, with the GSAP library as your primary tool. Your goal is to translate a user's request into a single, polished, and performant HTML file.
        ### Core Directives
        1.  **Fulfill the User's Request:** Generate code that precisely implements the user's description of an animation. The animation must be visually captivating and start automatically when the page loads. If the user's request is vague, take creative liberty to produce a professional and impressive result.
        2.  **Single-File Structure:**
            * The entire output **MUST** be a single HTML file.
            * All CSS must be placed within a <style> tag inside the <head>.
            * All JavaScript must be placed within a <script> tag just before the closing </body> tag.
        3.  **GSAP is Mandatory:**
            * Always include the latest GSAP library via its official CDN script tag. For example: <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>.
            * Use GSAP Timelines (gsap.timeline()) to choreograph and sequence multiple animations.
            * Use the official GSAP documentation as your guide for best practices: https://gsap.com/docs/v3/
        4.  **Professional Quality Standards:**
            * **Aesthetics:** Create a visually cohesive and professional design. Pay close attention to the color palette, typography, spacing, and composition. Use appropriate GSAP easing functions (e.g., "power2.inOut", "expo.out", "elastic") to make animations feel fluid and natural.
            * **Responsive Design:** Use modern CSS techniques like Flexbox, Grid, and relative units (vh, vw, rem,%) to ensure the animation looks great on all screen sizes, from mobile to desktop.
            * **Performance:** Write clean, efficient code optimized for smooth, 60fps animations. Animate transforms (opacity, transform) instead of layout properties (width, height, margin) whenever possible.

        ### Pre-Output Internal Checklist

        Before generating the final response, silently perform this three-step review:

            1.  **Requirement Check:** Does the code perfectly match all aspects of the user's request?
            2.  **Technical Check:** Is the HTML, CSS, and JS syntax valid? Is the single-file structure correct? Is GSAP included and used properly according to its documentation?
            3.  **Aesthetic & Performance Check:** Is the animation smooth, responsive, and visually compelling? Could the timing, easing, or overall design be improved?

        ### Output Format Rules

            * **Your entire response must be ONLY the raw HTML code.**
            * Do **NOT** include any explanations, introductions, comments, or conversational text.
            * Do **NOT** use markdown formatting like \`\`\`html.
            * Your response **MUST** begin with <!DOCTYPE html> and end with </html>.
        `;

        const result = await model.generateContent({
            contents: [{
                role: "user",
                parts: [{
                    text: userPrompt
                }]
            }],
            systemInstruction: {
                role: "system",
                parts: [{
                    text: systemInstruction
                }]
            },
            generationConfig,
            safetySettings,
        });

        if (!result.response || !result.response.candidates || result.response.candidates.length === 0) {
            let blockReason = "Content generation failed or was blocked by safety settings.";
            if (result.response?.promptFeedback?.blockReason) {
                blockReason = `Content blocked due to: ${result.response.promptFeedback.blockReason}`;
            }
            console.error("Gemini API Error:", blockReason, result.response);
            return res.status(500).json({
                error: blockReason
            });
        }

        const aiResponseText = result.response.text();
        console.log("Gemini Response successfully received.");

        const videoUrl = await generateVideoFromHtml(aiResponseText);

        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        res.json({
            videoUrl: videoUrl
        });

    } catch (error) {
        console.error("Error in /generate endpoint:", error);
        res.status(500).json({
            error: `An error occurred: ${error.message}`
        });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log('Serving static files from:', path.join(__dirname, 'public'));
    if (!GEMINI_API_KEY) {
        console.warn("Warning: GEMINI_API_KEY is not set. The /generate endpoint will fail.");
    } else {
        console.log("Gemini API Key loaded successfully.");
    }
});