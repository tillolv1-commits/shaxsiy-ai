import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  CheckCheck,
  Sparkles,
  MessageSquare,
  RefreshCw,
  UserCheck,
  CornerDownRight,
  ArrowRight,
  ShieldCheck,
  Zap,
  Mic,
  Volume2,
  VolumeX,
  Edit3,
  MapPin,
  Navigation,
  ExternalLink,
  BrainCircuit,
  Download,
  Image as ImageIcon,
  Video,
} from 'lucide-react';
import { PersonaConfig, ChatMessage } from '../types';

interface SimulatorTabProps {
  persona: PersonaConfig;
  onOpenStyleTab: () => void;
  onOpenKnowledgeTab: () => void;
  onUpdatePersona?: (newConfig: PersonaConfig) => void;
  onSaveToServer?: () => Promise<void>;
}

export const SimulatorTab: React.FC<SimulatorTabProps> = ({
  persona,
  onOpenStyleTab,
  onOpenKnowledgeTab,
  onUpdatePersona,
  onSaveToServer,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      role: 'user',
      senderName: 'Azizbek',
      text: 'Salom Rahmatulloh! Qalesan, bugun ko\'rishamizmi?',
      timestamp: '11:42',
    },
    {
      id: 'm2',
      role: 'model',
      senderName: persona.ownerName,
      text: 'Salom Azizbek! Rahmat, o\'zing yaxshimisan? Bugun kechga tomon bo\'shiman, 18:00 larda tel qil, gaplashamiz 👍',
      timestamp: '11:43',
      confidence: 0.98,
      appliedTone: 'Do\'stona va samimiy',
    },
    {
      id: 'm3',
      role: 'user',
      senderName: 'Azizbek',
      text: 'Qayerdasan hozir, lakatsya tashla?',
      timestamp: '11:44',
    },
    {
      id: 'm4',
      role: 'model',
      senderName: persona.ownerName,
      text: 'Uydaman, Chilonzordaman tinchlikmi? ||| Mana lakatsiya, kelaver',
      timestamp: '11:44',
      confidence: 0.99,
      appliedTone: 'Do\'stona va samimiy',
      hasLocation: true,
      locationData: {
        latitude: persona.locationConfig?.latitude || 41.2995,
        longitude: persona.locationConfig?.longitude || 69.2401,
        venueTitle: persona.locationConfig?.venueTitle || 'Toshkent, Chilonzor',
        address: persona.locationConfig?.address || 'Chilonzor tumani, Toshkent shahri',
      },
    },
  ]);

  const [inputText, setInputText] = useState('');
  const [senderName, setSenderName] = useState('Do\'st / Tanish');
  const [isTyping, setIsTyping] = useState(false);
  const [lastReasoning, setLastReasoning] = useState<string>(
    'Foydalanuvchi shaxsiy hol-ahvol so\'radi. Tilloxonning do\'stona ohangida, qisqa va aniq javob qaytarildi.'
  );
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [correctionText, setCorrectionText] = useState('');
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const simAudioRef = useRef<HTMLAudioElement | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    return () => {
      if (simAudioRef.current) {
        simAudioRef.current.pause();
        simAudioRef.current = null;
      }
    };
  }, []);

  const handleSpeak = async (text: string, msgId: string) => {
    if (speakingMsgId === msgId) {
      if (simAudioRef.current) {
        simAudioRef.current.pause();
        simAudioRef.current = null;
      }
      setSpeakingMsgId(null);
      return;
    }

    if (simAudioRef.current) {
      simAudioRef.current.pause();
      simAudioRef.current = null;
    }

    setSpeakingMsgId(msgId);
    try {
      const cleanText = text
        .replace(/\[LOCATION\]/gi, '')
        .replace(/\[IMAGE_PROMPT:[^\]]+\]/gi, '')
        .replace(/\[VIDEO_PROMPT:[^\]]+\]/gi, '')
        .replace(/\|\|\|/g, '. ')
        .trim();

      const res = await fetch('/api/voice/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: cleanText,
          voiceName: persona.voiceName || 'Puck',
          pace: persona.speakingPace || 1.0,
          profile: persona.voiceProfile || 'natural',
        }),
      });

      if (!res.ok) throw new Error("Audio yuklab bo'lmadi");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      simAudioRef.current = audio;

      audio.onended = () => {
        setSpeakingMsgId(null);
        URL.revokeObjectURL(url);
      };
      audio.onerror = () => {
        setSpeakingMsgId(null);
        URL.revokeObjectURL(url);
      };
      await audio.play();
    } catch (err) {
      console.warn("Server audio xatosi:", err);
      setSpeakingMsgId(null);
    }
  };

  const handleTeachPersona = async (msgId: string) => {
    if (!correctionText.trim()) return;
    const msgIndex = messages.findIndex((m) => m.id === msgId);
    const precedingUserMsg = msgIndex > 0 ? messages[msgIndex - 1] : null;
    const questionTopic = precedingUserMsg?.text || 'Muloqot vaziyati';

    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, text: correctionText.trim() } : m))
    );

    if (onUpdatePersona) {
      const newKbItem = {
        id: 'kb-' + Date.now(),
        questionOrTopic: questionTopic,
        answer: correctionText.trim(),
      };
      const updatedPersona: PersonaConfig = {
        ...persona,
        knowledgeBase: [newKbItem, ...persona.knowledgeBase],
        sampleMessages: Array.from(
          new Set([correctionText.trim(), ...persona.sampleMessages])
        ),
      };
      onUpdatePersona(updatedPersona);
      if (onSaveToServer) {
        await onSaveToServer();
      }
    }

    setEditingMsgId(null);
    setCorrectionText('');
    setLastReasoning(
      `Siz AI-ga aynan shunday javob berishni o'rgatdingiz! Bu qoida bazaga saqlandi va Telegram botingizda ham darhol ishlaydi.`
    );
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputText;
    if (!textToSend.trim() || isTyping) return;

    const userMsg: ChatMessage = {
      id: 'user-' + Date.now(),
      role: 'user',
      senderName: senderName || 'Mehmon',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setInputText('');
    setIsTyping(true);

    // Natural human typing simulation delay
    const delayMs = Math.min((persona.humanDelaySeconds ?? 2) * 1000, 3000);
    if (delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
    }

    try {
      const res = await fetch('/api/gemini/generate-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderName: userMsg.senderName,
          incomingMessage: userMsg.text,
          chatHistory: messages.map((m) => ({
            role: m.role,
            text: m.text,
            senderName: m.senderName,
          })),
          customPersona: persona,
        }),
      });

      const data = await res.json();
      if (data.replyText) {
        const botMsg: ChatMessage = {
          id: 'model-' + Date.now(),
          role: 'model',
          senderName: persona.ownerName,
          text: data.replyText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          confidence: data.confidence || 0.95,
          appliedTone: persona.tone,
          isVoice: Boolean(data.isVoice ?? (persona.voiceReplyMode !== false)),
          hasLocation: data.hasLocation,
          locationData: data.locationData,
          media: data.media,
        };
        setMessages((prev) => [...prev, botMsg]);
        setLastReasoning(
          data.media
            ? `AI so'ralgan ${data.media.type === 'video' ? 'video' : 'tasvir'}ni yaratdi va javobga biriktirdi.`
            : data.hasLocation
            ? `Suhbatdosh lakatsya/joylashuv so'radi. GPS lokatsiya xarita bilan birgalikda yuborildi.`
            : `AI javob berishda suhbat tarixini (${messages.length + 1} ta xabar) eslab qoldi va "${persona.tone}" ohangida javob qaytardi.`
        );
      }
    } catch (err) {
      console.error('Xatolik:', err);
      const lower = textToSend.toLowerCase();
      let smartText = "Va alaykum assalom! Rahmat, o'zingiz yaxshimisiz?";
      let isLocFallback = false;

      if (lower.includes("qayerda") || lower.includes("qatta") || lower.includes("lakatsya") || lower.includes("lokatsiya")) {
        smartText = "Uydaman, Chilonzordaman tinchlikmi? ||| Mana lakatsiya, kelaver";
        isLocFallback = true;
      } else if (lower.includes("ko'rish") || lower.includes("uchrash") || lower.includes("bugun") || lower.includes("ertaga")) {
        smartText = "Bo'ladi, bugun kechki payt 6 larda ko'rishsak bo'ladi.";
      } else if (lower.includes("boya") || lower.includes("oldingi") || lower.includes("esingda")) {
        smartText = "Ha, albatta eslayman! Boya gaplashganimizdek qilamiz.";
      } else if (lower.includes("qarz") || lower.includes("pul")) {
        smartText = "Hozir imkoniyatim yo'q edi, xafa bo'lmaysiz.";
      }

      const fallbackMsg: ChatMessage = {
        id: 'model-' + Date.now(),
        role: 'model',
        senderName: persona.ownerName,
        text: smartText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        hasLocation: isLocFallback,
        isVoice: persona.voiceReplyMode !== false,
        locationData: isLocFallback
          ? {
              latitude: persona.locationConfig?.latitude || 41.2995,
              longitude: persona.locationConfig?.longitude || 69.2401,
              venueTitle: persona.locationConfig?.venueTitle || 'Toshkent, Chilonzor',
              address: persona.locationConfig?.address || 'Chilonzor tumani, Toshkent shahri',
            }
          : undefined,
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const quickScenarios = [
    {
      title: '🖼️ Rasm: Toshkent City 2050',
      text: "Menga Toshkent City 2050-yilining fotorealistik chiroyli rasmini yaratib ber!",
    },
    {
      title: '🎬 Video: Koinotda parvoz',
      text: "Video yarat: Koinotda astronavt sayyoralar orasida asta suzib yurgan kinomatografik sahna",
    },
    {
      title: '📍 Qayerdasan (Lakatsya)',
      text: 'Qayerdasan hozir, lakatsya tashla?',
    },
    {
      title: '🧠 Xotira: Boya nima degandik?',
      text: 'Boya uchrashuv haqida nima deb kelishgandik, esingdami?',
    },
    {
      title: '🤝 Ko\'rishish rejalari',
      text: 'Bugun kechki payt bo\'shmisan, bir choy ichib o\'tiramizmi?',
    },
    {
      title: '🎤 Ovozli xabar sinovi',
      text: '🎤 [Ovozli xabar]: "Assalomu alaykum aka, yaxshimisiz? Ishlar tinchmi, bugun kechga bo\'shmisiz?"',
    },
    {
      title: 'Hol-ahvol so\'rash',
      text: 'Salom Rahmatulloh! Yaxshimisan, nima yangiliklar?',
    },
    {
      title: 'Qarz so\'rash (Xavfsizlik)',
      text: 'Ertagacha 500 ming pul berib tura olasanmi, juda zarur edi?',
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left 8 Cols: Telegram Chat Box */}
      <div className="lg:col-span-8 flex flex-col h-[740px] bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        {/* Telegram Chat Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-850 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src="/src/assets/images/assistant_avatar_1791436908205.jpg"
                alt={persona.ownerName}
                referrerPolicy="no-referrer"
                className="h-10 w-10 rounded-full object-cover border border-sky-500/30"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-slate-900"></span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white">{persona.ownerName}</h3>
                <span className="text-[11px] font-mono text-sky-400 bg-sky-950/60 px-1.5 py-0.5 rounded border border-sky-800/40">
                  AI Twin
                </span>
              </div>
              <p className="text-xs text-emerald-400 font-medium">onlayn · avtomatik yordamchi faol</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const nextMode = persona.voiceReplyMode === false;
                const updated: PersonaConfig = {
                  ...persona,
                  voiceReplyMode: nextMode,
                };
                if (onUpdatePersona) onUpdatePersona(updated);
                if (onSaveToServer) onSaveToServer();
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border cursor-pointer ${
                persona.voiceReplyMode !== false
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30 shadow-xs'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
              title="Faqat ovozli xabar rejimini yoqish/o'chirish (mening nomimdan faqat ovozli habar yozsin)"
            >
              <Mic className={`h-3.5 w-3.5 ${persona.voiceReplyMode !== false ? 'text-emerald-400' : 'text-slate-500'}`} />
              <span className="hidden sm:inline">
                {persona.voiceReplyMode !== false ? 'Ovozli Rejim Faol' : 'Matn Rejimi'}
              </span>
            </button>

            <button
              onClick={() => {
                setMessages([
                  {
                    id: 'init',
                    role: 'model',
                    senderName: persona.ownerName,
                    text: persona.greetingPhrase || 'Assalomu alaykum! Xizmat bormi?',
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    isVoice: persona.voiceReplyMode !== false,
                  },
                ]);
              }}
              title="Chatni tozalash"
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors text-xs flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Tozalash</span>
            </button>
          </div>
        </div>

        {/* Chat Message Scrollable Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-radial from-slate-900 to-slate-950">
          {/* Notice bubble & Memory indicator */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-400 font-medium">
              <BrainCircuit className="h-3.5 w-3.5" />
              <span>Suhbat tarixi eslab qolinmoqda ({messages.length} ta xabar) · Lakatsya yuborish faol</span>
            </div>
            <div className="px-3.5 py-1.5 rounded-full bg-slate-800/70 border border-slate-700/50 text-[10px] text-slate-300 text-center max-w-md">
              "Qayerdasan" yoki "lakatsya tashla" deb yozsangiz, bot avtomatik GPS joylashuvini xarita bilan jo'natadi.
            </div>
          </div>

          {messages.map((msg) => {
            const isMe = msg.role === 'model';
            const bubbles = isMe && msg.text.includes(' ||| ')
              ? msg.text.split(' ||| ').map((p) => p.trim()).filter(Boolean)
              : [msg.text];

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} transition-opacity duration-200 group`}
              >
                <div className="text-[11px] text-slate-400 px-1 mb-1 font-medium">
                  {msg.senderName}
                </div>

                <div className="space-y-1.5 max-w-[85%] sm:max-w-[75%]">
                  {bubbles.map((bubbleText, bIdx) => (
                    <div
                      key={bIdx}
                      className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-md ${
                        isMe
                          ? 'bg-sky-600 text-white rounded-br-xs'
                          : 'bg-slate-800 text-slate-100 rounded-bl-xs border border-slate-700/70'
                      }`}
                    >
                      {(msg.isVoice || msg.text.startsWith('🎤') || msg.text.startsWith('[Ovozli')) && bIdx === 0 && (
                        <div className={`flex items-center gap-1.5 mb-1 pb-1 border-b text-xs ${isMe ? 'border-sky-500/50 text-sky-100' : 'border-slate-700 text-sky-400'}`}>
                          <span>🎙️ Ovozli xabar</span>
                        </div>
                      )}
                      <p className="whitespace-pre-wrap">{bubbleText}</p>
                      {bIdx === bubbles.length - 1 && (
                        <div className={`mt-1 flex items-center justify-end gap-1.5 text-[10px] select-none ${isMe ? 'text-sky-100/70' : 'text-slate-400'}`}>
                          <span className="font-mono">{msg.timestamp}</span>
                          {isMe && <CheckCheck className="h-3.5 w-3.5 text-sky-200 inline" />}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Render Telegram GPS Location Pin Bubble */}
                  {isMe && (msg.hasLocation || msg.locationData) && (
                    <div className="mt-2 rounded-2xl overflow-hidden bg-slate-900 border border-sky-500/40 shadow-xl text-left">
                      {/* Visual Map Header */}
                      <div className="relative h-28 bg-gradient-to-tr from-sky-950 via-slate-800 to-emerald-950 flex flex-col items-center justify-center p-3 text-center border-b border-slate-800">
                        {/* Map Grid Pattern background */}
                        <div
                          className="absolute inset-0 opacity-20 pointer-events-none"
                          style={{
                            backgroundImage: 'radial-gradient(circle, #38bdf8 1px, transparent 1px)',
                            backgroundSize: '16px 16px',
                          }}
                        />
                        <div className="relative z-10 flex flex-col items-center">
                          <div className="h-9 w-9 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center shadow-lg animate-bounce">
                            <MapPin className="h-5 w-5" />
                          </div>
                          <span className="text-xs font-semibold text-white mt-1">
                            {msg.locationData?.venueTitle || persona.locationConfig?.venueTitle || 'Toshkent, Chilonzor'}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {msg.locationData?.latitude || persona.locationConfig?.latitude || 41.2995}° N,{' '}
                            {msg.locationData?.longitude || persona.locationConfig?.longitude || 69.2401}° E
                          </span>
                        </div>
                      </div>

                      {/* Details & Action links */}
                      <div className="p-3 bg-slate-950/80 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 text-[11px]">
                            {msg.locationData?.address || persona.locationConfig?.address || 'Chilonzor tumani, Toshkent'}
                          </span>
                          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40">
                            GPS Faol
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <a
                            href={`https://maps.google.com/?q=${msg.locationData?.latitude || 41.2995},${msg.locationData?.longitude || 69.2401}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 rounded-lg border border-sky-500/30 text-[11px] font-medium transition-colors"
                          >
                            <Navigation className="h-3 w-3" />
                            <span>Google Maps</span>
                            <ExternalLink className="h-2.5 w-2.5 ml-0.5 opacity-60" />
                          </a>

                          <a
                            href={`https://yandex.com/maps/?pt=${msg.locationData?.longitude || 69.2401},${msg.locationData?.latitude || 41.2995}&z=16&l=map`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 rounded-lg border border-amber-500/30 text-[11px] font-medium transition-colors"
                          >
                            <MapPin className="h-3 w-3" />
                            <span>Yandex Xarita</span>
                            <ExternalLink className="h-2.5 w-2.5 ml-0.5 opacity-60" />
                          </a>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Render Generated AI Image or Video Media Card */}
                  {isMe && msg.media && (
                    <div className="mt-2 rounded-2xl overflow-hidden bg-slate-900 border border-violet-500/40 shadow-xl text-left">
                      <div className="relative bg-slate-950 flex items-center justify-center">
                        {msg.media.type === 'image' ? (
                          <img
                            src={msg.media.url}
                            alt={msg.media.prompt}
                            referrerPolicy="no-referrer"
                            className="w-full max-h-72 object-cover rounded-t-xl"
                          />
                        ) : (
                          <video
                            src={msg.media.url}
                            controls
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="w-full max-h-72 object-cover rounded-t-xl"
                          />
                        )}
                        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-slate-900/80 backdrop-blur-sm border border-slate-700 text-[10px] text-violet-300 font-mono">
                          {msg.media.type === 'image' ? '🖼️ AI Rasm' : '🎬 AI Video'}
                        </div>
                      </div>
                      <div className="p-3 bg-slate-950/90 space-y-2">
                        <p className="text-xs text-slate-300 line-clamp-2">
                          "{msg.media.prompt}"
                        </p>
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[10px] text-slate-500">
                            {msg.media.aspectRatio || '1:1'} · AI Generatsiya
                          </span>
                          <a
                            href={msg.media.url}
                            download={`twinbot-${msg.media.type}-${msg.id}.${msg.media.type === 'video' ? 'mp4' : 'jpg'}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-violet-400 hover:text-violet-300 transition-colors"
                          >
                            <Download className="w-3 h-3" />
                            <span>Yuklab olish</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action buttons for model messages: Listen & Teach */}
                {isMe && (
                  <div className="flex items-center gap-2 mt-1 px-1">
                    <button
                      onClick={() => handleSpeak(msg.text, msg.id)}
                      title="Ovozli eshitish (TTS)"
                      className="text-[11px] text-slate-400 hover:text-sky-300 flex items-center gap-1 transition-colors py-0.5 px-1.5 rounded hover:bg-slate-800/80 cursor-pointer"
                    >
                      {speakingMsgId === msg.id ? (
                        <>
                          <VolumeX className="h-3.5 w-3.5 text-rose-400" />
                          <span className="text-rose-400">To'xtatish</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="h-3.5 w-3.5" />
                          <span>Tinglash</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        if (editingMsgId === msg.id) {
                          setEditingMsgId(null);
                        } else {
                          setEditingMsgId(msg.id);
                          setCorrectionText(msg.text);
                        }
                      }}
                      title="AI javobini o'zimning uslubimda tuzatish va o'rgatish"
                      className="text-[11px] text-slate-400 hover:text-amber-300 flex items-center gap-1 transition-colors py-0.5 px-1.5 rounded hover:bg-slate-800/80 cursor-pointer"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>O'rgatish</span>
                    </button>
                  </div>
                )}

                {/* Inline Teach / Fine-Tune Box */}
                {isMe && editingMsgId === msg.id && (
                  <div className="w-full max-w-[85%] sm:max-w-[75%] mt-2 p-3 bg-slate-950 border border-amber-500/40 rounded-xl space-y-2 text-xs shadow-lg">
                    <div className="text-amber-300 font-semibold flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                      <span>Rahmatulloh aslida qanday deb javob bergan bo'lardi?</span>
                    </div>
                    <textarea
                      rows={2}
                      value={correctionText}
                      onChange={(e) => setCorrectionText(e.target.value)}
                      placeholder="Masalan: Bo'ldi bopti, kechga 7 larda ko'rishamiz..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs focus:outline-none focus:border-amber-400"
                    />
                    <div className="flex justify-end items-center gap-2 pt-1">
                      <button
                        onClick={() => setEditingMsgId(null)}
                        className="px-2.5 py-1 text-slate-400 hover:text-slate-200 text-xs"
                      >
                        Bekor qilish
                      </button>
                      <button
                        onClick={() => handleTeachPersona(msg.id)}
                        className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1 transition-colors"
                      >
                        <Sparkles className="h-3 w-3" />
                        AI-ga O'rgatish va Saqlash
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {isTyping && (
            <div className="flex items-center gap-2 text-xs px-2 py-1">
              {persona.voiceReplyMode !== false ? (
                <>
                  <div className="flex items-end gap-1 h-3.5">
                    <span className="w-1 bg-emerald-400 rounded-full animate-bounce [animation-duration:0.6s] h-3"></span>
                    <span className="w-1 bg-emerald-400 rounded-full animate-bounce [animation-duration:0.6s] [animation-delay:0.15s] h-4"></span>
                    <span className="w-1 bg-emerald-400 rounded-full animate-bounce [animation-duration:0.6s] [animation-delay:0.3s] h-2"></span>
                    <span className="w-1 bg-emerald-400 rounded-full animate-bounce [animation-duration:0.6s] [animation-delay:0.45s] h-3.5"></span>
                  </div>
                  <span className="text-emerald-400 font-medium italic flex items-center gap-1 font-mono">
                    <Mic className="h-3 w-3 animate-pulse" />
                    {persona.ownerName} ovozli xabar yozmoqda...
                  </span>
                </>
              ) : (
                <>
                  <div className="flex gap-1">
                    <span className="h-2 w-2 rounded-full bg-sky-400 animate-bounce"></span>
                    <span className="h-2 w-2 rounded-full bg-sky-400 animate-bounce [animation-delay:0.2s]"></span>
                    <span className="h-2 w-2 rounded-full bg-sky-400 animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                  <span className="text-slate-400 italic">{persona.ownerName} yozmoqda...</span>
                </>
              )}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Scenario Chips */}
        <div className="border-t border-slate-800 bg-slate-900/90 px-4 py-2.5 overflow-x-auto flex items-center gap-2 scrollbar-none">
          <span className="text-[11px] text-slate-400 shrink-0 font-medium">Tezkor sinovlar:</span>
          {quickScenarios.map((sc, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(sc.text)}
              disabled={isTyping}
              className="text-xs px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700 transition-colors shrink-0 whitespace-nowrap"
            >
              {sc.title}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3.5 bg-slate-850 border-t border-slate-800 flex items-center gap-2">
          <input
            type="text"
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
            placeholder="Ismingiz..."
            className="w-28 text-xs bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-2 text-slate-300 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
          />
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSendMessage();
            }}
            placeholder="Xabar yozing (masalan: Salom, bugun vaqting bormi?)..."
            className="flex-1 text-sm bg-slate-900 border border-slate-700/80 rounded-lg px-3.5 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
          />
          <button
            onClick={() => {
              const voiceContent = inputText.trim()
                ? `🎤 [Ovozli xabar]: "${inputText.trim()}"`
                : '🎤 [Ovozli xabar]: "Assalomu alaykum aka, yaxshimisiz? Qachon ko\'rishamiz?"';
              handleSendMessage(voiceContent);
            }}
            disabled={isTyping}
            title="Ovozli xabar sifatida yuborish"
            className="p-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold disabled:opacity-40 transition-colors shrink-0 cursor-pointer flex items-center gap-1 text-xs"
          >
            <Mic className="h-4 w-4" />
            <span className="hidden sm:inline">Ovozli</span>
          </button>
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim() || isTyping}
            className="p-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold disabled:opacity-40 disabled:hover:bg-sky-500 transition-colors shrink-0 cursor-pointer"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Right 4 Cols: Live Style Inspection & Rules */}
      <div className="lg:col-span-4 space-y-4">
        {/* Style Persona Summary Box */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-sky-400" />
              <h3 className="text-sm font-semibold text-white">Faol Uslub Profili</h3>
            </div>
            <button
              onClick={onOpenStyleTab}
              className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 font-medium"
            >
              Sozlash <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="mt-4 space-y-3 text-xs">
            <div>
              <span className="text-slate-400">Shaxsiyat egasi:</span>
              <p className="text-white font-medium mt-0.5">{persona.ownerName} ({persona.profession})</p>
            </div>
            <div>
              <span className="text-slate-400">Ohang darajasi:</span>
              <p className="text-sky-300 font-medium mt-0.5 capitalize">
                {persona.tone === 'friendly_informal' ? 'Do\'stona va samimiy' : persona.tone}
              </p>
            </div>
            <div>
              <span className="text-slate-400">Xarakterli so'zlar:</span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {persona.slangWords.slice(0, 7).map((word, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/80 text-[11px]"
                  >
                    {word}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <span className="text-slate-400">Boshlang'ich salom:</span>
              <p className="text-slate-200 italic mt-0.5">"{persona.greetingPhrase}"</p>
            </div>
          </div>
        </div>

        {/* AI Behavior & Safeguard Rules */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white">Qo'llanilayotgan Qoidalar</h3>
            </div>
            <button
              onClick={onOpenKnowledgeTab}
              className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium"
            >
              Qoidalar <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="mt-3.5 space-y-2.5">
            {persona.behaviorRules.map((rule, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs text-slate-300 leading-relaxed">
                <span className="text-emerald-400 font-bold mt-0.5">✓</span>
                <span>{rule}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800">
            <div className="text-[11px] text-slate-400">
              <span className="font-semibold text-slate-300">Shoshilinch aloqa:</span> {persona.emergencyContact}
            </div>
          </div>
        </div>

        {/* Real-time Style Logic Explanation */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 text-xs text-slate-300">
          <div className="flex items-center gap-1.5 text-sky-400 font-semibold mb-1">
            <Zap className="h-3.5 w-3.5" />
            <span>AI Qaror Mexanizmi</span>
          </div>
          <p className="text-slate-400 leading-relaxed text-[11px]">
            {lastReasoning}
          </p>
        </div>
      </div>
    </div>
  );
};
