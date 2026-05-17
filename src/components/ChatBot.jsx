import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Mic, MicOff, Bot, User, Volume2, VolumeX, StopCircle, Loader2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { generateAIResponse } from '../services/aiService';
 
const ChatBot = () => {
  const [isOpen, setIsOpen]       = useState(false);
  const [messages, setMessages]   = useState([]);
  const [input, setInput]         = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [location, setLocation]   = useState(null);
  const [weather, setWeather]     = useState(null);
 
  // TTS State
  const [isAutoSpeak, setIsAutoSpeak] = useState(true);
   const [isSpeaking, setIsSpeaking]   = useState(false);
   const [isGeneratingAudio, setIsGeneratingAudio] = useState(null); // Stores messageId being synthesized
   const audioRef = useRef(new Audio());
 
  const { language, setLanguage, languages, t } = useLanguage();
 
  const messagesEndRef  = useRef(null);
  const recognitionRef  = useRef(null);
 
  // API configuration
  const WEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY || "1c0ff9c24c32fb28e6644ec4110fd944";
  const VOICE_RSS_KEY = import.meta.env.VITE_VOICE_RSS_KEY;
 
  // ============================================================
  // TTS
  // ============================================================
  const speakText = async (text, langCode, messageId = null) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (!text) return;

    // Use SpeechSynthesis as absolute fallback if backend is unavailable
    const fallbackTTS = () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = langCode;
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
      }
    };

    setIsGeneratingAudio(messageId || 'auto');

    try {
      // Call local Indic-TTS API
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language: langCode, messageId })
      });

      if (!response.ok) throw new Error('Backend synthesis failed');
      const data = await response.json();

      if (data.success && data.audioUrl) {
        audioRef.current.src = data.audioUrl;
        audioRef.current.playbackRate = 1.0;
        setIsSpeaking(true);
        audioRef.current.play().catch((err) => {
          console.warn("Audio playback failed, using browser fallback:", err);
          fallbackTTS();
        });
        audioRef.current.onended = () => setIsSpeaking(false);
        audioRef.current.onerror = () => setIsSpeaking(false);
      } else {
        throw new Error(data.error || 'Synthesis error');
      }
    } catch (e) {
      console.error("Local TTS failed, trying fallback:", e);
      fallbackTTS();
    } finally {
      setIsGeneratingAudio(null);
    }
  };
 
  const stopSpeaking = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };
 
  // ============================================================
  // Greeting — resets on language change
  // ============================================================
  useEffect(() => {
    const greetings = {
      'en-IN': 'Hello! I am Krishi Mitra. Ask me anything about farming! 🌾',
      'hi-IN': 'नमस्ते! मैं आपका कृषि मित्र हूं। मुझसे खेती के बारे में कुछ भी पूछें! 🌾',
      'gu-IN': 'નમસ્તે! હું તમારો કૃષિ મિત્ર છું. મને ખેતી વિશે કંઈ પણ પૂછો! 🌾',
      'ta-IN': 'வணக்கம்! நான் உங்கள் கிருஷி மித்ரா. விவசாயம் பற்றி எதையும் கேளுங்கள்! 🌾',
      'te-IN': 'నమస్కారం! నేను మీ కృషి మిత్ర. వ్యవసాయం గురించి నన్ను ఏమైనా అడగండి! 🌾',
      'kn-IN': 'ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ ಕೃಷಿ ಮಿತ್ರ. ಕೃಷಿಯ ಬಗ್ಗೆ ಏನೇ ಕೇಳಿ! 🌾',
      'mr-IN': 'नमस्कार! मी तुमचा कृषी मित्र आहे. मला शेतीबद्दल काहीही विचारा! 🌾',
      'bn-IN': 'নমস্কার! আমি আপনার কৃষি মিত্র। আমাকে চাষাবাদ সম্পর্কে যা খুশি জিজ্ঞাসা করুন! 🌾',
      'pa-IN': 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ ਤੁਹਾਡਾ ਕ੍ਰਿਸ਼ੀ ਮਿੱਤਰ ਹਾਂ। ਮੈਨੂੰ ਖੇਤੀ ਬਾਰੇ ਕੁਝ ਵੀ ਪੁੱਛੋ! 🌾',
    };
 
    const greetingText = greetings[language] || greetings['en-IN'];
    stopSpeaking();
    setMessages([{ id: Date.now(), type: 'bot', text: greetingText, time: new Date() }]);
    if (isAutoSpeak && isOpen) {
      setTimeout(() => speakText(greetingText, language, 'greeting'), 800);
    }
  }, [language]);
 
  // Auto-speak on open
  useEffect(() => {
    if (isAutoSpeak && isOpen && messages.length > 0) {
      const last = messages[messages.length - 1];
      if (last.type === 'bot') speakText(last.text, language, last.id);
    }
  }, [isOpen]);
 
  // ============================================================
  // Weather fetch
  // FIX: added null/error guard so a failed fetch doesn't crash
  // ============================================================
  useEffect(() => {
    const getAndFetch = (lat, lon) => {
      setLocation({ lat, lng: lon });
      fetchWeather(lat, lon);
    };
 
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => getAndFetch(pos.coords.latitude, pos.coords.longitude),
        ()    => getAndFetch(23.0225, 72.5714)
      );
    } else {
      getAndFetch(23.0225, 72.5714);
    }
  }, []);
 
  const fetchWeather = async (lat, lon) => {
    // Guard: if the API key is missing, skip silently
    if (!WEATHER_API_KEY) {
      console.warn('VITE_OPENWEATHER_API_KEY is not set — weather disabled.');
      return;
    }
    try {
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${WEATHER_API_KEY}`
      );
      if (!res.ok) throw new Error(`Weather API ${res.status}`);
      const data = await res.json();
      // Guard: ensure data.main exists before reading .temp
      if (!data?.main) throw new Error('Unexpected weather response shape');
      setWeather({
        temp:      Math.round(data.main.temp),
        condition: data.weather?.[0]?.main ?? 'Clear',
        humidity:  data.main.humidity,
        city:      data.name ?? 'Your location',
      });
    } catch (e) {
      console.error('Weather fetch failed:', e.message);
      // Leave weather as null — UI shows "Online" fallback
    }
  };
 
  // ============================================================
  // Speech recognition
  // ============================================================
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous     = false;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.onresult = (e) => {
      const transcript = Array.from(e.results).map((r) => r[0].transcript).join('');
      setInput(transcript);
    };
    recognitionRef.current.onend   = () => setIsListening(false);
    recognitionRef.current.onerror = () => setIsListening(false);
  }, []);
 
  const toggleListening = () => {
    if (!recognitionRef.current) { alert('Voice input not supported'); return; }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      stopSpeaking();
      recognitionRef.current.lang = language;
      recognitionRef.current.start();
      setIsListening(true);
    }
  };
 
  // ============================================================
  // Send message
  // ============================================================
  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    stopSpeaking();
 
    const userMessage = { id: Date.now(), type: 'user', text: input, time: new Date() };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
 
    const langName = languages.find((l) => l.code === language)?.name || 'English';
 
    // FIX: safe access — weather may be null if fetch failed/key missing
    const weatherCtx = weather
      ? `${weather.city}, ${weather.temp}°C`
      : 'location unknown';

    const systemPrompt = `You are Krishi Mitra AI. You MUST respond ONLY in ${langName}. Context: ${weatherCtx}. Keep it concise (under 50 words). Plain text only. NO JSON.`;

    try {
      const botResponse = await generateAIResponse(input, language, systemPrompt);
      
      if (!botResponse) throw new Error('Empty response');
      
      const botMessage  = { id: Date.now() + 1, type: 'bot', text: botResponse, time: new Date() };
      setMessages((prev) => [...prev, botMessage]);
      if (isAutoSpeak) speakText(botResponse, language, botMessage.id);
    } catch (error) {
      console.error('API Error:', error);
      setMessages((prev) => [...prev, {
        id: Date.now() + 1, type: 'bot',
        text: 'Connection error. Please try again.', time: new Date(),
      }]);
    }
 
    setIsLoading(false);
  };
 
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
 
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };
 
  const formatTime = (date) =>
    new Date(date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
 
  // ============================================================
  // Render
  // ============================================================
  return (
    <>
      <div className={`chatbot-panel ${isOpen ? 'open' : ''}`}>
        <div className="chatbot-header">
          <div className="chatbot-header-info">
            <Bot size={24} />
            <div>
              <h3>{t('chatbot_title')}</h3>
              <span className="chatbot-status">
                {weather ? `${weather.city} • ${weather.temp}°C` : 'Online'}
              </span>
            </div>
          </div>
          <div className="chatbot-header-actions">
            <button
              onClick={() => { const s = !isAutoSpeak; setIsAutoSpeak(s); if (!s) stopSpeaking(); }}
              className="chatbot-action-btn"
              title={isAutoSpeak ? 'Mute Auto-Speak' : 'Enable Auto-Speak'}
            >
              {isAutoSpeak ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <select
              className="chatbot-lang-select"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              {languages.map((l) => <option key={l.code} value={l.code}>{l.native}</option>)}
            </select>
            <button className="chatbot-exit-btn" onClick={() => { setIsOpen(false); stopSpeaking(); }}>
              <span>Exit</span>
              <X size={16} />
            </button>
          </div>
        </div>
 
        <div className="chatbot-messages">
          {messages.map((msg) => (
            <div key={msg.id} className={`chatbot-message ${msg.type}`}>
              <div className="message-avatar">
                {msg.type === 'bot' ? <Bot size={18} /> : <User size={18} />}
              </div>
              <div className="message-content">
                <p>{msg.text}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="message-time">{formatTime(msg.time)}</span>
                  {msg.type === 'bot' && (
                    <button 
                      onClick={() => isSpeaking ? stopSpeaking() : speakText(msg.text, language, msg.id)} 
                      className={`ml-2 transition-all ${isSpeaking ? 'text-red-500' : 'opacity-60 hover:opacity-100'}`}
                      title={isSpeaking ? "Stop" : "Read Aloud"}
                      disabled={isGeneratingAudio === msg.id}
                    >
                      {isGeneratingAudio === msg.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : isSpeaking ? (
                        <StopCircle size={14} />
                      ) : (
                        <Volume2 size={14} />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="chatbot-message bot">
              <div className="message-avatar"><Bot size={18} /></div>
              <div className="message-content typing">
                <span></span><span></span><span></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
 
        {isSpeaking && (
          <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-10">
            <button onClick={stopSpeaking} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-full shadow-lg flex items-center gap-2 text-xs transition-all animate-bounce">
              <StopCircle size={14} /> Stop Speaking
            </button>
          </div>
        )}
 
        <div className="chatbot-input-area">
          <button className={`chatbot-voice-btn ${isListening ? 'listening' : ''}`} onClick={toggleListening} title="Voice Input">
            {isListening ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={t('chat_placeholder')}
            disabled={isLoading}
          />
          <button className="chatbot-send-btn" onClick={sendMessage} disabled={isLoading || !input.trim()}>
            {isLoading ? <Loader2 size={20} className="spin" /> : <Send size={20} />}
          </button>
        </div>
      </div>
 
      <button className={`chatbot-fab ${isOpen ? 'hidden' : ''}`} onClick={() => setIsOpen(true)}>
        <MessageSquare size={24} />
      </button>
    </>
  );
};
 
export default ChatBot;