# 🎬 Graphic AI: AI-Powered Video Generator

Graphic AI is an innovative web application that translates natural language prompts into animated video files. It leverages a powerful combination of a large language model (Gemini) for code generation and server-side rendering tools (Puppeteer and FFmpeg) to capture dynamic web content as a video.

## 🌟 Intro

The goal of Graphic AI is to make video creation accessible by allowing users to describe the animation they want, which the AI then instantly codes, renders, and serves back as a downloadable MP4. The system is designed to handle complex, fluid animations by requiring the AI to use the high-performance **GSAP (GreenSock Animation Platform)** library in the generated HTML.

## 🛠️ How It Works

The system follows a three-stage, server-side process:

1.  **Code Generation (Gemini 2.5 Flash):**
    * The user submits a prompt via the frontend (`index.html`, `main.js`).
    * The Node.js server (`app.js`) sends the user's prompt, along with a detailed **System Instruction**, to the Gemini API.
    * The System Instruction primes the model to act as an "elite front-end developer" specializing in GSAP animations and forces it to return *only* a single, complete, and responsive HTML file containing all necessary CSS and JavaScript.

2.  **Headless Rendering (Puppeteer):**
    * The generated HTML code is saved to a temporary file (`generated.html`).
    *  **Puppeteer** is launched in headless mode, navigating to the temporary HTML file.
    * A high-resolution viewport (1920x1080) is used, and a loop captures the animation frame-by-frame (e.g., 30 FPS for 5 seconds) as individual WEBP images.

3.  **Video Encoding (FFmpeg):**
    * Once all frames are captured, the server uses **FFmpeg** to stitch the sequence of WEBP images together into a high-quality, final MP4 video file (using `libx264` codec).
    * The video is saved to the public directory, and its URL is returned to the client.

4.  **Client Presentation:**
    * The frontend receives the video URL and displays the video in an HTML `<video>` player, along with a download link.

## ✨ Features

* **Prompt-to-Video:** Generates dynamic video content from simple text descriptions.
* **High-Quality Animation:** Uses GSAP in the generated code for smooth, professional-grade motion graphics.
* **Full Server-Side Pipeline:** Handles code generation, screen recording, and video encoding seamlessly on the backend.
* **Robust Error Handling:** Includes checks for API failures, server errors, and invalid prompts.
* **Ephemeral Filesystem:** Automatically cleans up temporary HTML files and captured frames after successful or failed video creation.

## 💻 Tech Stack

| Component | Technology | Role |
| :--- | :--- | :--- |
| **Frontend** | **HTML, CSS, JavaScript** | User interface for prompt submission and video playback. |
| **Backend** | **Node.js, Express** | Server hosting, routing, and orchestrating the generation pipeline. |
| **AI Generation** | **Google Gemini 2.5 Flash** | Converts text prompt into GSAP-animated HTML code. |
| **Code Execution** | **Puppeteer** | Headless browser used to execute and capture the generated HTML animation. |
| **Video Encoding** | **FFmpeg** | Command-line utility for stitching captured frames into an MP4 video. |
| **Animation Library** | **GSAP** | Used within the generated HTML for high-performance, complex animations. |

## 🚀 Getting Started

### Prerequisites

* Node.js (LTS recommended)
* FFmpeg (must be installed and accessible in the system's PATH)
* A Google AI Studio API Key (set as an environment variable)

### Setup and Installation

1.  **Clone the repository:**
    ```bash
    git clone <your-repo-url>
    cd graphic-ai
    ```
2.  **Install dependencies:**
    ```bash
    npm install express puppeteer @google/generative-ai dotenv
    ```
3.  **Configure API Key:**
    Create a `.env` file in the root directory and add your key:
    ```
    GEMINI_API_KEY="YOUR_API_KEY_HERE"
    ```
4.  **Run the server:**
    ```bash
    node app.js
    ```

### Usage

1.  Open your browser to the local address output by the server (e.g., `http://localhost:3000`).
2.  Enter a descriptive prompt (e.g., "A geometric pattern rotates slowly and scales up, changing color from blue to gold over 5 seconds.")
3.  Click "Generate Video." The server will handle the AI generation, browser rendering, and encoding, returning the final MP4.

## 📐 System Design and Architecture

### Layered Flow

The architecture is a **request-driven pipeline**, where a single user request triggers a multi-step, synchronous server process:

`Client Request -> Express Route -> Gemini API (Code) -> Filesystem Write -> Puppeteer (Render Frames) -> FFmpeg (Encode Video) -> Filesystem Cleanup -> Client Response`

### Inter-Process Dependencies

* **Node.js / Express:** Manages the entire orchestration and HTTP communication.
* **Puppeteer:** Launched as a child process by Node.js. It requires control over a Chrome instance to capture the UI.
* **FFmpeg:** Executed via `child_process.exec`. Its success is paramount to the final output and its command line must be precisely formatted for the input pattern of the captured frames.

### Potential System Improvements

* **Asynchronous Processing:** Implement a job queue (e.g., Redis, BullMQ) for video generation. This would prevent the HTTP request from timing out and allow for long, complex videos to be processed in the background.
* **Streaming/Preview:** Instead of waiting for the full MP4, implement a mechanism to return a low-quality or preview version of the generated HTML instantly, allowing the user to see the animation immediately while the MP4 is encoded.

## 📊 DSA Analysis and Potential Improvements

The project's complexity lies in system design and external tool management, rather than complex Data Structures or Algorithms.

| Component | Data Structure/Algorithm | Analysis/Context |
| :--- | :--- | :--- |
| **Frame Capture** | Simple sequential loop (`for` loop) with a timing delay. | The timing (FPS) is critical. The loop calculates the required interval time (`1000 / FPS`) and subtracts the actual screenshot capture time to ensure the next capture happens precisely on schedule, minimizing frame jitter. |
| **Video Encoding** | Array of image files (WEBP). | FFmpeg uses a file sequence pattern (`frame_%05d.webp`) to read the array of images sequentially. The quality (`-crf 18`) and pixel format (`yuv420p`) parameters directly impact the video size and visual quality. |

### Potential DSA Improvements

* **Caching of GSAP Components:** If similar prompts are requested frequently (e.g., "bouncing ball"), the generated code could be cached based on a hash of the prompt and system instruction, reducing redundant Gemini API calls (and latency).

## 📈 Performance Metrics

Performance is dominated by the two main server-side bottlenecks:

| Metric | Description | Expected Value / Impact |
| :--- | :--- | :--- |
| **Generation Latency** | Time from `POST /generate` to final MP4 delivery. | **High (5-15 seconds minimum).** Dominated by the Gemini API call (~2-5s), Puppeteer execution, and the intensive FFmpeg encoding time. |
| **API Accuracy** | How closely the generated HTML code matches the animation described in the prompt. | **Very High.** This is guaranteed by the highly specific and restrictive System Instruction provided to the Gemini model, forcing it to focus only on GSAP animation and layout rules. |
| **Frames Per Second (FPS)** | The playback smoothness of the final MP4. | **Target: 30 FPS.** Maintained by the precise timing loop in the Puppeteer execution stage. |
| **Resolution** | The size of the output video. | **Fixed at 1920x1080 (Full HD).** |

## ⚖️ Trade-offs: Why Use That?

| Trade-off | Rationale for Current Choice |
| :--- | :--- |
| **LLM Code vs. Template Code** | **Chosen:** Full LLM Code Generation. While templates are safer, this approach maximizes creative flexibility, allowing the AI to invent unique animations that go far beyond a pre-defined template system. |
| **WEBP Frames vs. PNG/JPEG** | **Chosen:** WEBP. It offers superior compression and smaller file sizes compared to PNG, while retaining excellent quality (set via the `quality: 90` parameter) needed for smooth video encoding. |
| **GSAP vs. Pure CSS** | **Chosen:** GSAP. Used explicitly in the System Instruction because it handles complex, synchronized timeline animations, which is often difficult to achieve with pure CSS and offers higher runtime performance. |
| **Puppeteer vs. Headless WebKit** | **Chosen:** Puppeteer (Headless Chrome). Offers the most robust and production-ready environment for running and capturing complex, modern JavaScript (like GSAP), ensuring high compatibility with the generated code. |

## 🔮 Future Updates

* **Audio/Music Synthesis:** Allow users to specify a mood or music style in the prompt, and use a Text-to-Speech (TTS) or Music Generation API to create an accompanying audio track that is mixed with the video via FFmpeg.
* **Iterative Editing:** Implement a mechanism where the user can provide follow-up prompts (e.g., "Change the color scheme to green and purple" or "Make it twice as fast") and the server edits the previous HTML code rather than generating it from scratch.
* **Multi-Scene Videos:** Extend the prompt system to support multiple scenes, where the AI generates multiple HTML files, and FFmpeg is used to concatenate them into a single, seamless video.
