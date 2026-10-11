import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Image as ImageIcon,
  Video,
  Download,
  Send,
  RefreshCw,
  Copy,
  Check,
  Maximize2,
  Trash2,
  Palette,
  Film,
  Compass,
  Zap,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { GeneratedMedia } from '../types';

interface MediaStudioTabProps {
  ownerChatId?: string | number;
  botUsername?: string;
}

const SAMPLE_IMAGE_PROMPTS = [
  "Toshkent City 2050-yil: osmono'par binolar, uchuvchi elektromobillar va neon chiroqlar",
  "Registon maydoni shom paytida: oltin rangli chiroqlar, fotorealistik 8K",
  "Chimyondagi qorli tog'lar cho'qqisi uzra quyosh chiqishi, epik kinomatografik manzara",
  "Futuristik kiberpank uslubidagi o'zbek milliy chopon kiygan dasturchi yigit",
  "Chiroyli qora rangli zamonaviy sportkar tog' serpantin yo'lida, quyosh botishi",
];

const SAMPLE_VIDEO_PROMPTS = [
  "Koinotda asta suzib yurgan astronavt, orqasida aylanayotgan Yer sayyorasi",
  "Toshkent teleminorasi uzra dron orqali tungi shahar bo'ylab parvoz",
  "Yugurayotgan yovvoyi oq tulpor gulzorlar ichida, sekinlashtirilgan harakat (slow-motion)",
  "Kiberpank shaharda yomg'ir ostida ketayotgan neon nurli mashina",
  "Bahorgi tog' yonbag'rida ochilayotgan qizil lolalar va mayin shabada",
];

const STYLES = [
  { id: 'photorealistic', label: '📸 Fotorealistik (8K)', promptSuffix: 'photorealistic, ultra detailed 8k photography, cinematic lighting, masterpiece' },
  { id: '3d-render', label: '🎨 3D Render', promptSuffix: '3D animation style, octane render, vivid colors, smooth textures, pixar quality' },
  { id: 'cyberpunk', label: '⚡ Kiberpank & Neon', promptSuffix: 'cyberpunk style, vibrant neon glow, dark futuristic aesthetic, high contrast' },
  { id: 'anime', label: '🌸 Anime Art', promptSuffix: 'high quality modern anime style, Makoto Shinkai aesthetic, rich atmospheric lighting' },
  { id: 'uzbek-heritage', label: '🏛️ Milliy Art', promptSuffix: 'oriental aesthetic, historic Central Asian motifs, rich turquoise and gold ornaments' },
  { id: 'minimalist', label: '✨ Minimalizm', promptSuffix: 'clean minimalist vector art, elegant composition, muted pastel tones' },
];

const RATIOS = [
  { id: '1:1', label: '1:1 Kvadrat (Avatar / Post)' },
  { id: '16:9', label: '16:9 Keng (YouTube / Ekran)' },
  { id: '9:16', label: '9:16 Tik (Stories / Reels)' },
  { id: '4:3', label: '4:3 Standart' },
];

export const MediaStudioTab: React.FC<MediaStudioTabProps> = ({ ownerChatId, botUsername }) => {
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState(STYLES[0].id);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [currentMedia, setCurrentMedia] = useState<GeneratedMedia | null>(null);
  const [gallery, setGallery] = useState<GeneratedMedia[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sendSuccessId, setSendSuccessId] = useState<string | null>(null);
  const [isSendingToTelegram, setIsSendingToTelegram] = useState(false);
  const [previewModalUrl, setPreviewModalUrl] = useState<{ url: string; type: 'image' | 'video'; prompt: string } | null>(null);

  // Load past media gallery
  useEffect(() => {
    fetchGallery();
  }, []);

  const fetchGallery = async () => {
    try {
      const res = await fetch('/api/media/gallery');
      const data = await res.json();
      if (data && Array.isArray(data.gallery)) {
        setGallery(data.gallery);
        if (!currentMedia && data.gallery.length > 0) {
          setCurrentMedia(data.gallery[0]);
        }
      }
    } catch (err) {
      console.warn("Galereyani yuklashda xato:", err);
    }
  };

  const handleEnhancePrompt = async () => {
    if (!prompt.trim()) return;
    setIsEnhancing(true);
    try {
      const res = await fetch('/api/media/enhance-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, type: mediaType }),
      });
      const data = await res.json();
      if (data && data.enhancedPrompt) {
        setPrompt(data.enhancedPrompt);
      }
    } catch (err) {
      console.error("Promptni boyitishda xato:", err);
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    const selectedStyleObj = STYLES.find((s) => s.id === selectedStyle);
    const styleSuffix = selectedStyleObj ? selectedStyleObj.promptSuffix : '';

    if (mediaType === 'image') {
      setProgressMsg("AI tasvir yaratilmoqda (yuqori aniqlikda)...");
      try {
        const res = await fetch('/api/media/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: `${prompt.trim()}, ${styleSuffix}`,
            aspectRatio,
            style: selectedStyleObj?.label,
          }),
        });
        const data = await res.json();
        if (data.ok && data.media) {
          setCurrentMedia(data.media);
          setGallery((prev) => [data.media, ...prev]);
        } else {
          alert("Rasm yaratishda xatolik: " + (data.error || 'Nomaʼlum xato'));
        }
      } catch (err: any) {
        alert("Server bilan bog'lanishda xato: " + err.message);
      } finally {
        setIsGenerating(false);
        setProgressMsg('');
      }
    } else {
      // Video generation
      setProgressMsg("AI video kadrlari render qilinmoqda (bu bir necha soniya vaqt oladi)...");
      try {
        const res = await fetch('/api/media/generate-video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: `${prompt.trim()}, ${styleSuffix}`,
            aspectRatio: aspectRatio === '9:16' ? '9:16' : '16:9',
          }),
        });
        const data = await res.json();
        if (data.ok && data.media) {
          setCurrentMedia(data.media);
          setGallery((prev) => [data.media, ...prev]);
        } else {
          alert("Video yaratishda xatolik: " + (data.error || 'Nomaʼlum xato'));
        }
      } catch (err: any) {
        alert("Server bilan bog'lanishda xato: " + err.message);
      } finally {
        setIsGenerating(false);
        setProgressMsg('');
      }
    }
  };

  const handleSendToTelegram = async (item: GeneratedMedia) => {
    setIsSendingToTelegram(true);
    try {
      const res = await fetch('/api/media/send-to-telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaUrl: item.url,
          type: item.type,
          caption: `✨ TwinBot AI tomonidan yaratildi: "${item.prompt.slice(0, 80)}..."`,
          chatId: ownerChatId,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setSendSuccessId(item.id);
        setTimeout(() => setSendSuccessId(null), 3000);
      } else {
        alert("Telegramga yuborishda xato: " + (data.error || 'Xabar yuborilmadi'));
      }
    } catch (err: any) {
      alert("Telegram xatosi: " + err.message);
    } finally {
      setIsSendingToTelegram(false);
    }
  };

  const handleCopyPrompt = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Studio Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-950 via-indigo-950 to-slate-900 border border-violet-800/40 p-6 md:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-20 w-72 h-72 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-400/30 text-violet-300 text-xs font-medium mb-3">
              <Sparkles className="w-3.5 h-3.5 text-violet-400 animate-pulse" />
              <span>Yangi Imkoniyat: Sun'iy Intellekt Media Generatsiya</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              AI Rasm va Video Studio
            </h1>
            <p className="mt-2 text-sm text-slate-300 max-w-2xl leading-relaxed">
              Bot orqali ham, ushbu studio orqali ham ixtiyoriy g'oyangizni bir necha soniyada yuqori sifatli rasmga yoki videoga aylantiring. Tayyor natijani darhol Telegram botingizga yuborishingiz yoki yuklab olishingiz mumkin.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Telegramda: <code className="text-emerald-400 font-mono">/rasm</code> yoki <code className="text-emerald-400 font-mono">/video</code></span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Generator Controls */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            {/* Mode Tabs: Rasm vs Video */}
            <div className="flex p-1 bg-slate-950 rounded-xl border border-slate-800/80">
              <button
                type="button"
                onClick={() => {
                  setMediaType('image');
                  if (aspectRatio === '16:9' && mediaType === 'video') setAspectRatio('1:1');
                }}
                className={`flex-1 flex items-center justify-center gap-2.5 py-3 rounded-lg text-sm font-semibold transition-all ${
                  mediaType === 'image'
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                <span>Rasm Generatsiya</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMediaType('video');
                  setAspectRatio('16:9');
                }}
                className={`flex-1 flex items-center justify-center gap-2.5 py-3 rounded-lg text-sm font-semibold transition-all ${
                  mediaType === 'video'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Video className="w-4 h-4" />
                <span>Video Generatsiya</span>
              </button>
            </div>

            {/* Prompt Input Box */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  {mediaType === 'image' ? "Tasvir ta'rifi (Prompt)" : "Video sahnasi ta'rifi (Prompt)"}
                </label>
                <button
                  type="button"
                  onClick={handleEnhancePrompt}
                  disabled={isEnhancing || !prompt.trim()}
                  className="inline-flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 disabled:opacity-50 transition-colors"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isEnhancing ? 'animate-spin' : ''}`} />
                  <span>{isEnhancing ? 'Boyitilmoqda...' : 'Promptni AI bilan boyitish'}</span>
                </button>
              </div>

              <div className="relative">
                <textarea
                  rows={4}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={
                    mediaType === 'image'
                      ? "Masalan: Toshkent City osmono'par binolari uzra quyosh botishi, kiberpank uslubida, 8K ultra aniqlik..."
                      : "Masalan: Tungi koinotda sayyoralar orasida uchayotgan fazoviy kema, kinomatografik yorug'lik..."
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all resize-none font-sans"
                />
              </div>
            </div>

            {/* Quick Suggestions */}
            <div className="space-y-2">
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-slate-400" />
                <span>Tezkor g'oyalar (bosing va sinab ko'ring):</span>
              </span>
              <div className="flex flex-wrap gap-2">
                {(mediaType === 'image' ? SAMPLE_IMAGE_PROMPTS : SAMPLE_VIDEO_PROMPTS).map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPrompt(sample)}
                    className="text-left text-xs bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg transition-colors truncate max-w-full"
                  >
                    💡 {sample}
                  </button>
                ))}
              </div>
            </div>

            {/* Style Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-indigo-400" />
                <span>Vizual Uslub (Style)</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {STYLES.map((style) => (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => setSelectedStyle(style.id)}
                    className={`py-2 px-3 text-xs rounded-xl border text-left transition-all ${
                      selectedStyle === style.id
                        ? 'bg-violet-600/20 border-violet-500 text-violet-200 font-medium'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                    }`}
                  >
                    {style.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Aspect Ratio */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5 text-pink-400" />
                <span>O'lcham va Nisbat (Aspect Ratio)</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {RATIOS.map((ratio) => (
                  <button
                    key={ratio.id}
                    type="button"
                    onClick={() => setAspectRatio(ratio.id)}
                    className={`py-2 px-2.5 text-xs rounded-xl border text-center transition-all ${
                      aspectRatio === ratio.id
                        ? 'bg-pink-600/20 border-pink-500 text-pink-200 font-medium'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                    }`}
                  >
                    {ratio.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Action Button */}
            <button
              type="button"
              disabled={isGenerating || !prompt.trim()}
              onClick={handleGenerate}
              className={`w-full py-3.5 rounded-xl text-white font-semibold flex items-center justify-center gap-2 text-sm shadow-xl transition-all ${
                isGenerating || !prompt.trim()
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : mediaType === 'image'
                  ? 'bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 shadow-violet-900/30'
                  : 'bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 hover:from-purple-500 hover:to-rose-500 shadow-pink-900/30'
              }`}
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>{progressMsg || "Yaratilmoqda..."}</span>
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  <span>
                    {mediaType === 'image' ? "AI Tasvirni Yaratish (Generate)" : "AI Videoni Yaratish (Generate)"}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Active Preview & Telegram Send */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <span>Natija Ko'rinishi</span>
                {currentMedia && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                    {currentMedia.type === 'image' ? '🖼️ Rasm' : '🎬 Video'}
                  </span>
                )}
              </h2>
              {currentMedia && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewModalUrl({ url: currentMedia.url, type: currentMedia.type, prompt: currentMedia.prompt })}
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition-colors"
                    title="To'liq o'lchamda ko'rish"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Visual Screen Box */}
            <div className="relative w-full aspect-square sm:aspect-video lg:aspect-square bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center group">
              {isGenerating ? (
                <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full border-4 border-violet-600/30 border-t-violet-500 animate-spin" />
                    <Sparkles className="w-6 h-6 text-violet-400 absolute inset-0 m-auto animate-pulse" />
                  </div>
                  <p className="text-sm font-medium text-slate-200">{progressMsg || "Generatsiya ketmoqda..."}</p>
                  <p className="text-xs text-slate-500 max-w-xs">
                    Neyrotarmoq sizning g'oyangizni pikselma-piksel chizmoqda
                  </p>
                </div>
              ) : currentMedia ? (
                currentMedia.type === 'image' ? (
                  <img
                    src={currentMedia.url}
                    alt={currentMedia.prompt}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover rounded-xl transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <video
                    src={currentMedia.url}
                    controls
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover rounded-xl"
                  />
                )
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center space-y-3 text-slate-500">
                  <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <p className="text-sm font-medium text-slate-400">Hozircha media yaratilmadi</p>
                  <p className="text-xs max-w-xs">
                    Chap tarafdan ta'rif yozing va "Yaratish" tugmasini bosing
                  </p>
                </div>
              )}
            </div>

            {/* Media Metadata & Actions */}
            {currentMedia && (
              <div className="space-y-4 pt-1">
                <div className="bg-slate-950 rounded-xl p-3 border border-slate-800/80">
                  <p className="text-xs text-slate-300 font-medium line-clamp-2">
                    "{currentMedia.prompt}"
                  </p>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{new Date(currentMedia.createdAt).toLocaleTimeString()}</span>
                    <span>{currentMedia.aspectRatio || '1:1'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Download */}
                  <a
                    href={currentMedia.url}
                    download={`ai-twinbot-${currentMedia.type}-${Date.now()}.${currentMedia.type === 'video' ? 'mp4' : 'jpg'}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                  >
                    <Download className="w-4 h-4 text-slate-400" />
                    <span>Yuklab olish</span>
                  </a>

                  {/* Send to Telegram */}
                  <button
                    type="button"
                    disabled={isSendingToTelegram}
                    onClick={() => handleSendToTelegram(currentMedia)}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-xs font-semibold shadow-md transition-all"
                  >
                    {sendSuccessId === currentMedia.id ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                        <span>Yuborildi!</span>
                      </>
                    ) : isSendingToTelegram ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Yuborilmoqda...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Telegramga yuborish</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Gallery Section */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Film className="w-5 h-5 text-violet-400" />
              <span>Yaratilgan Media Galereyasi</span>
            </h2>
            <p className="text-xs text-slate-400">
              Ushbu bot orqali avval yaratilgan rasmlar va video lavhalar to'plami
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
            {gallery.length} ta media
          </span>
        </div>

        {gallery.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            Hozircha hech qanday rasm yoki video generatsiya qilinmagan. Yuqorida yangi tasvir yarating!
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {gallery.map((item) => (
              <div
                key={item.id}
                onClick={() => setCurrentMedia(item)}
                className={`group relative aspect-square rounded-xl overflow-hidden cursor-pointer border transition-all ${
                  currentMedia?.id === item.id
                    ? 'ring-2 ring-violet-500 border-violet-400 scale-[1.02]'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {item.type === 'image' ? (
                  <img
                    src={item.url}
                    alt={item.prompt}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-slate-950 flex items-center justify-center">
                    <Video className="w-8 h-8 text-pink-400" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-end">
                  <span className="text-[10px] text-white font-medium line-clamp-1">
                    {item.prompt}
                  </span>
                  <span className="text-[9px] text-slate-400">
                    {item.type === 'image' ? 'Rasm' : 'Video'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen View Modal */}
      {previewModalUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setPreviewModalUrl(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <p className="text-xs text-slate-300 font-medium truncate max-w-lg">
                {previewModalUrl.prompt}
              </p>
              <button
                type="button"
                onClick={() => setPreviewModalUrl(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>
            <div className="p-2 flex items-center justify-center bg-black">
              {previewModalUrl.type === 'image' ? (
                <img
                  src={previewModalUrl.url}
                  alt={previewModalUrl.prompt}
                  referrerPolicy="no-referrer"
                  className="max-h-[75vh] w-auto object-contain rounded-lg"
                />
              ) : (
                <video
                  src={previewModalUrl.url}
                  controls
                  autoPlay
                  className="max-h-[75vh] w-auto object-contain rounded-lg"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
