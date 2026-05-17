const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const bcrypt = require("bcryptjs");
const path = require("path");
const bodyParser = require("body-parser");
const fs = require("fs");
const axios = require("axios");
const { spawn } = require("child_process");
const { v4: uuidv4 } = require("uuid");
const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// ==========================================
// 1. CONFIGURATION & DATABASE
// ==========================================
let config = {
  supabaseUrl: process.env.SUPABASE_URL || "https://xxrwkdgnjtujkstaqeyd.supabase.co",
  supabaseKey: process.env.SUPABASE_KEY || "sb_publishable_4ByeIYU4TTOFEBIr_uGung_l5IxPTV8"
};

try {
  if (fs.existsSync("config.json")) {
    const rawData = fs.readFileSync("config.json");
    const fileConfig = JSON.parse(rawData);
    config = { ...config, ...fileConfig };
    console.log("✅ Loaded configuration from config.json");
  }
} catch (error) {
  console.error("❌ Error parsing config.json:", error);
}

const supabase = createClient(config.supabaseUrl, config.supabaseKey);
console.log("✅ Configured Supabase client");

// ==========================================
// 3. AUTHENTICATION ROUTES
// ==========================================

// Register
app.post("/api/register", async (req, res) => {
  const { fullName, email, password } = req.body;

  if (!fullName || !email || !password) {
    return res.json({ success: false, message: "All fields are required" });
  }

  try {
    const { data: existingUser } = await supabase
      .from("users")
      .select("email")
      .eq("email", email)
      .single();

    if (existingUser) {
      return res.json({ success: false, message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const { error } = await supabase
      .from("users")
      .insert([{ fullName, email, password: hashedPassword, plants: [] }]);

    if (error) throw error;
    res.json({ success: true, message: "Registration successful!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Login
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (!user || error) {
      return res.json({ success: false, message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.json({ success: false, message: "Invalid credentials" });
    }

    res.json({
      success: true,
      message: "Login successful!",
      user: { name: user.fullName, email: user.email },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ==========================================
// 4. PROFILE & SETTINGS ROUTES
// ==========================================

// Update Name
app.put("/api/update-profile", async (req, res) => {
  const { email, newName } = req.body;
  try {
    const { data: user, error } = await supabase
      .from("users")
      .update({ fullName: newName })
      .eq("email", email)
      .select()
      .single();

    if (error || !user) {
      return res.json({ success: false, message: "User not found" });
    }

    res.json({
      success: true,
      message: "Profile updated",
      user: { name: user.fullName, email: user.email },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Change Password
app.put("/api/change-password", async (req, res) => {
  const { email, currentPassword, newPassword } = req.body;
  try {
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (error || !user) {
      return res.json({ success: false, message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.json({ success: false, message: "Incorrect current password" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const { error: updateError } = await supabase
      .from("users")
      .update({ password: hashedPassword })
      .eq("email", email);

    if (updateError) throw updateError;
    res.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ==========================================
// 5. PLANT MANAGEMENT ROUTES (CRUD)
// ==========================================

// Add Plant
app.post("/api/add-plant", async (req, res) => {
  const { email, plant } = req.body;
  try {
    const { data: user, error } = await supabase
      .from("users")
      .select("plants")
      .eq("email", email)
      .single();

    if (error || !user) {
      return res.json({ success: false, message: "User not found" });
    }

    const newPlant = { ...plant, _id: uuidv4() };
    const updatedPlants = [...(user.plants || []), newPlant];

    const { error: updateError } = await supabase
      .from("users")
      .update({ plants: updatedPlants })
      .eq("email", email);

    if (updateError) throw updateError;
    res.json({ success: true, message: "Plant added!", plants: updatedPlants });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Get Plants
app.post("/api/get-plants", async (req, res) => {
  const { email } = req.body;
  try {
    const { data: user, error } = await supabase
      .from("users")
      .select("plants")
      .eq("email", email)
      .single();

    if (error || !user) {
      return res.json({ success: false, message: "User not found" });
    }

    res.json({ success: true, plants: user.plants || [] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Edit Plant
app.put("/api/edit-plant", async (req, res) => {
  const { email, plantId, updatedData } = req.body;
  try {
    const { data: user, error } = await supabase
      .from("users")
      .select("plants")
      .eq("email", email)
      .single();

    if (error || !user) {
      return res.json({ success: false, message: "User not found" });
    }

    const plants = user.plants || [];
    const index = plants.findIndex((p) => p._id === plantId);

    if (index === -1) {
      return res.json({ success: false, message: "Plant not found" });
    }

    plants[index] = { ...plants[index], ...updatedData };

    const { error: updateError } = await supabase
      .from("users")
      .update({ plants })
      .eq("email", email);

    if (updateError) throw updateError;
    res.json({ success: true, message: "Plant updated!", plants });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Delete Plant
app.delete("/api/delete-plant", async (req, res) => {
  const { email, plantId } = req.body;
  try {
    const { data: user, error } = await supabase
      .from("users")
      .select("plants")
      .eq("email", email)
      .single();

    if (error || !user) {
      return res.json({ success: false, message: "User not found" });
    }

    const plants = (user.plants || []).filter((p) => p._id !== plantId);

    const { error: updateError } = await supabase
      .from("users")
      .update({ plants })
      .eq("email", email);

    if (updateError) throw updateError;
    res.json({ success: true, message: "Plant deleted", plants });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});
// --- CONFIGURATION ---
// Your camera IP details
const CAM_HOST = "http://10.110.145.110:8080";
const SNAPSHOT_URL = `${CAM_HOST}/?action=snapshot`;

// Enable JSON parsing for potential future use
app.use(express.json());

// Serve static files (HTML, CSS, JS, and the captured image)
app.use(express.static(path.join(__dirname, "public")));

// Route: Handle the Capture Request
app.post("/capture", async (req, res) => {
  try {
    console.log("Capturing frame from camera...");

    // Fetch the snapshot from the IP camera
    const response = await axios({
      method: "GET",
      url: SNAPSHOT_URL,
      responseType: "stream",
    });

    // Save (overwrite) the image as 'plant.jpg' in the public folder
    const imagePath = path.join(__dirname, "public", "plant.jpg");
    const writer = fs.createWriteStream(imagePath);

    response.data.pipe(writer);

    writer.on("finish", () => {
      console.log("Image saved to public/plant.jpg");
      res.json({ success: true, filename: "plant.jpg" });
    });

    writer.on("error", (err) => {
      console.error("File write error:", err);
      res.status(500).json({ success: false, error: "Failed to write file" });
    });
  } catch (error) {
    console.error("Camera connection failed:", error.message);
    res
      .status(500)
      .json({ success: false, error: "Could not connect to camera." });
  }
});
// ==========================================
// 6. INDIC-TTS API (AI4Bharat Integration)
// ==========================================
app.post("/api/tts", async (req, res) => {
  const { text, language, messageId } = req.body;

  if (!text) return res.status(400).json({ success: false, error: "No text provided" });

  // Map app language codes to Indic-TTS model folders
  const langMap = {
    "hi-IN": "hindi",
    "ta-IN": "tamil",
    "te-IN": "telugu",
    "bn-IN": "bengali",
    "gu-IN": "gujarati",
    "mr-IN": "marathi",
    "kn-IN": "kannada",
    "pa-IN": "punjabi"
  };

  const indicLang = langMap[language] || "hindi";
  const fileName = `tts_${messageId || uuidv4()}.wav`.replace(/[^a-z0-9._-]/gi, '_');
  const outPath = path.join(__dirname, "public", "audio", fileName);

  // Ensure audio directory exists
  const audioDir = path.join(__dirname, "public", "audio");
  if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });

  console.log(`🎙️ Synthesizing (${indicLang}): "${text.substring(0, 30)}..."`);

  // Invoke Python Worker
  const pythonExecutable = process.platform === "win32" ? "python" : "python3";
  const workerPath = path.join(__dirname, "scripts", "tts_worker.py");
  
  // Quick check for models before spawning
  const langMapInv = {
    "hindi": "hi-IN", "tamil": "ta-IN", "telugu": "te-IN", "bengali": "bn-IN",
    "gujarati": "gu-IN", "marathi": "mr-IN", "kannada": "kn-IN", "punjabi": "pa-IN"
  };
  
  const modelsPath = path.join(__dirname, "models", "indic-tts", indicLang);
  const hasLocalModel = fs.existsSync(path.join(modelsPath, "fastpitch", "best_model.pth"));

  if (hasLocalModel) {
    const pythonProcess = spawn(pythonExecutable, [
      workerPath,
      "--text", text,
      "--lang", indicLang,
      "--out", outPath
    ]);

    let errorData = "";
    pythonProcess.stderr.on("data", (data) => { errorData += data.toString(); });

    pythonProcess.on("error", async (err) => {
      console.error("❌ Failed to start TTS Worker:", err.message);
      await handleRemoteFallback(text, language, outPath, res, fileName);
    });

    pythonProcess.on("close", async (code) => {
      if (code === 0) {
        if (!res.headersSent) res.json({ success: true, audioUrl: `/audio/${fileName}` });
      } else {
        console.error("❌ TTS Worker failed, trying remote fallback:", errorData);
        if (!res.headersSent) await handleRemoteFallback(text, language, outPath, res, fileName);
      }
    });
  } else {
    console.warn(`🎙️ Local model for ${indicLang} missing. Using remote fallback.`);
    await handleRemoteFallback(text, language, outPath, res, fileName);
  }
});

// Remote TTS Fallback (Google Translate)
async function handleRemoteFallback(text, language, outPath, res, fileName) {
  if (res.headersSent) return;
  
  try {
    const lang = language.split("-")[0];
    // Google Translate TTS has a limit of ~200 characters
    const safeText = text.substring(0, 200);
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&q=${encodeURIComponent(safeText)}`;
    
    console.log(`🌐 Fetching remote TTS (${lang}): "${safeText.substring(0, 30)}..."`);
    
    const response = await axios({
      method: "GET",
      url: url,
      responseType: "stream",
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 10000 
    });

    const writer = fs.createWriteStream(outPath);
    response.data.pipe(writer);

    writer.on("finish", () => {
      console.log(`✅ Remote TTS saved: ${fileName}`);
      if (!res.headersSent) res.json({ success: true, audioUrl: `/audio/${fileName}`, fallback: true });
    });

    writer.on("error", (err) => {
      console.error("❌ Audio writer error:", err.message);
      if (!res.headersSent) res.status(500).json({ success: false, error: "Audio file writing failed" });
    });
  } catch (error) {
    console.error("❌ Remote fallback failed:", error.response?.status || error.message);
    if (!res.headersSent) {
      res.status(500).json({ 
        success: false, 
        error: "Remote synthesis failed", 
        details: error.response?.status === 400 ? "Text too long or invalid language" : error.message 
      });
    }
  }
}

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
