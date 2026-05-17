import React, { useState, useRef } from "react";
import { ScanLine, Upload, Camera, AlertTriangle, CheckCircle } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "AIzaSyCSN9kYsYv7kKL2tsx3gcxN97VUvEDAG80";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

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

const DiseaseDetection = () => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  const toBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
    });
  };

  const analyzeImage = async (file) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const base64Data = await toBase64(file);

      const payload = {
        contents: [
          {
            parts: [
              { text: SYSTEM_PROMPT + "\n\nDiagnose this plant." },
              {
                inline_data: {
                  mime_type: file.type || "image/jpeg",
                  data: base64Data,
                },
              },
            ],
          },
        ],
      };

      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message || "AI Analysis failed");
      }

      const answer = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!answer) {
        throw new Error("No response from AI");
      }

      const formattedAnswer = answer
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\n/g, "<br>");

      setResult(formattedAnswer);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPreviewUrl(URL.createObjectURL(file));
      analyzeImage(file);
    }
  };

  return (
    <div className="page-container" style={{ padding: "1rem", maxWidth: "600px", margin: "0 auto", paddingBottom: "100px" }}>
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>{t('disease_detection') || 'Disease Detection'}</h1>
        <p style={{ color: "var(--text-light)" }}>Upload a clear photo of your plant's leaves</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <input 
          type="file" 
          accept="image/*" 
          capture="environment"
          ref={fileInputRef} 
          style={{ display: "none" }} 
          onChange={handleFileUpload} 
        />
        
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="btn btn-primary"
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", padding: "1rem", borderRadius: "12px", fontSize: "1.1rem" }}
          disabled={loading}
        >
          <Camera size={24} />
          {loading ? "Analyzing..." : "Take Photo / Upload Image"}
        </button>

        {previewUrl && (
          <div style={{ marginTop: "1.5rem", borderRadius: "12px", overflow: "hidden", border: "1px solid var(--border)" }}>
            <img src={previewUrl} alt="Plant Preview" style={{ width: "100%", height: "auto", display: "block", maxHeight: "300px", objectFit: "cover" }} />
          </div>
        )}

        {loading && (
          <div style={{ padding: "2rem", textAlign: "center" }}>
            <div className="pulse-ring" style={{ margin: "0 auto 1rem", width: "40px", height: "40px" }}></div>
            <p>Scanning plant image...</p>
          </div>
        )}

        {error && (
          <div style={{ padding: "1rem", background: "rgba(239, 68, 68, 0.1)", borderRadius: "8px", color: "var(--color-error)", display: "flex", alignItems: "center", gap: "10px" }}>
            <AlertTriangle size={20} />
            <p>{error}</p>
          </div>
        )}

        {result && (
          <div className="card" style={{ marginTop: "1rem", borderTop: "4px solid var(--color-success)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "1rem" }}>
              <CheckCircle color="var(--color-success)" size={24} />
              <h3 style={{ margin: 0, color: "var(--color-success)" }}>Diagnosis Complete</h3>
            </div>
            <div 
              style={{ lineHeight: "1.6" }}
              dangerouslySetInnerHTML={{ __html: result }} 
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default DiseaseDetection;