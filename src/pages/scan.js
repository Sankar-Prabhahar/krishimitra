// Google Gemini API Configuration
const GEMINI_API_KEY = "AIzaSyCSN9kYsYv7kKL2tsx3gcxN97VUvEDAG80";
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

const analysisContainer = document.getElementById("analysis-container");
const resultContent = document.getElementById("result-content");
const statusText = document.getElementById("status-text");
const previewImg = document.getElementById("preview-image");

const SYSTEM_PROMPT = `You are a plant-health expert for Indian farmers. Your tasks: 
1. Identify the plant as accurately as possible (never reply 'Unknown'; give the closest possible match). 
2. Detect diseases, pests, or nutrient issues. 
3. Provide clear organic and chemical treatments. Keep answers simple and accurate.

Output format:

**Plant:** [Most likely name]
**Status:** [Healthy / Problem Detected]
**Symptoms:** [Short details]
**Treatment:**
- **Organic:** [Steps]
- **Chemical:** [Steps + safe use]`;

// --- 1. Capture from Node.js Camera ---
async function captureAndAnalyze() {
  showAnalysisUI("Connecting to camera...");

  try {
    // Call your local Node.js server
    const response = await fetch("/capture", { method: "POST" });
    const data = await response.json();

    if (!data.success) throw new Error(data.error || "Capture failed");

    // Show Image
    const imageUrl = data.filename + "?t=" + new Date().getTime();
    previewImg.src = imageUrl;

    // Get Blob for AI
    statusText.textContent = "Downloading frame...";
    const imageRes = await fetch(imageUrl);
    const imageBlob = await imageRes.blob();

    analyzeImage(imageBlob);
  } catch (err) {
    showError("Camera Error: " + err.message);
  }
}

// --- 2. Upload from File ---
function handleFileUpload(input) {
  if (input.files && input.files[0]) {
    const file = input.files[0];
    previewImg.src = URL.createObjectURL(file);
    showAnalysisUI("Preparing image...");
    analyzeImage(file);
  }
}

// --- 3. UI Helpers ---
function showAnalysisUI(msg) {
  analysisContainer.classList.remove("hidden");
  // Scroll to result
  analysisContainer.scrollIntoView({ behavior: "smooth", block: "start" });

  statusText.innerHTML = `<div class="loader"></div> ${msg}`;
  statusText.className = "text-primary font-medium flex items-center";
  resultContent.textContent = ""; // Clear previous result
}

function showError(msg) {
  statusText.innerHTML = `<span class="material-symbols-outlined text-red-500 mr-1">error</span> Error`;
  resultContent.innerHTML = `<span class="text-red-500">${msg}</span>`;
}

// --- 4. AI Analysis (Google Gemini) ---
async function analyzeImage(imageFile) {
  statusText.innerHTML = `<div class="loader"></div> Analyzing with Gemini AI...`;

  try {
    const base64Data = await toBase64(imageFile);

    // Construct Gemini Payload
    const payload = {
      contents: [
        {
          parts: [
            { text: SYSTEM_PROMPT + "\n\nDiagnose this plant." },
            {
              inline_data: {
                mime_type: imageFile.type || "image/jpeg",
                data: base64Data,
              },
            },
          ],
        },
      ],
    };

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message || "AI Analysis failed");
    }

    // Gemini 1.5 response structure
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!answer) {
      throw new Error("No response from AI");
    }

    // Success UI
    statusText.className = "text-green-600 font-bold flex items-center";
    statusText.innerHTML = `<span class="material-symbols-outlined mr-1">check_circle</span> Diagnosis Complete`;

    // Format markdown-like bold text to HTML bold
    const formattedAnswer = answer
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") // Bold **text**
      .replace(/\n/g, "<br>"); // Newlines

    resultContent.innerHTML = formattedAnswer;
  } catch (err) {
    console.error("Gemini Error:", err);
    showError(err.message);
  }
}

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
  });
}
