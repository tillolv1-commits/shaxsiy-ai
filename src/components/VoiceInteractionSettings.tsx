import React, { useState, useRef } from 'react';
import { Mic, Volume2, Play, Square, Loader2, Sparkles, Check, Heart, Briefcase, Smile, Radio } from 'lucide-react';
import { PersonaConfig } from '../types';

interface VoiceInteractionSettingsProps {
  persona: PersonaConfig;
  onUpdatePersona: (newConfig: PersonaConfig) => void;
  onSaveToServer?: () => Promise<void>;
  isSaving?: boolean;
}

export const VoiceInteractionSettings: React.FC<VoiceInteractionSettingsProps> = ({
  persona,
  onUpdatePersona,
  onSaveToServer,
  isSaving,
}) => {
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const voiceReplyMode = persona.voiceReplyMode !== false; // default true
  const speakingPace = persona.speakingPace ?? 1.0;
  const voiceProfile = persona.voiceProfile ?? 'natural';
  const voiceName = persona.voiceName ?? 'Puck';

  const handleToggleVoiceMode = (enabled: boolean) => {
    onUpdatePersona({
      ...persona,
      voiceReplyMode: enabled,
    });
  };

  const handlePaceChange = (pace: number) => {
    onUpdatePersona({
      ...persona,
      speakingPace: pace,
    });
  };

  const handleProfileChange = (profile: 'natural' | 'friendly' | 'professional') => {
    onUpdatePersona({
      ...persona,
      voiceProfile: profile,
    });
  };

  const handleVoiceNameChange = (name: string) => {
    onUpdatePersona({
      ...persona,
      voiceName: name,
    });
  };

  const handlePlayPreview = async () => {
    if (isPlayingPreview && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlayingPreview(false);
      return;
    }

    setIsLoadingPreview(true);
    setPreviewError(null);

    const sampleText =
      voiceProfile === 'natural'
        ? "Salom jonim, yaxshimisan? Ishlaring joyidami, nimalar qilyapsan?"
        : voiceProfile === 'friendly'
        ? "Salom do'stim! Rahmat, o'zing yaxshimisan? Bugun kechga tomon ko'rishamiz bopti!"
        : "Assalomu alaykum! Xabaringizni oldim, barcha masalalarni tez orada kelishib olamiz.";

    try {
      const res = await fetch('/api/voice/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: sampleText,
          pace: speakingPace,
          profile: voiceProfile,
          voiceName,
        }),
      });

      if (!res.ok) {
        throw new Error('Ovozni yaratishda xatolik yuz berdi');
      }

      const blob = await res.blob();
      const audioUrl = URL.createObjectURL(blob);

      if (audioRef.current) {
        audioRef.current.pause();
      }

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setIsPlayingPreview(false);
      };

      audio.onerror = () => {
        setIsPlayingPreview(false);
        setPreviewError('Ovozni eshittirishda xatolik');
      };

      await audio.play();
      setIsPlayingPreview(true);
    } catch (err: unknown) {
      console.error('Audio preview xatosi:', err);
      setPreviewError(err instanceof Error ? err.message : "Ovozni yuklab bo'lmadi");
    } finally {
      setIsLoadingPreview(false);
    }
  };

  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950/30 border border-slate-800 p-6 shadow-xl relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute -top-16 -right-16 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-sky-500/20 shrink-0">
            <Mic className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-base font-bold text-white tracking-wide">
                Voice Interaction Settings
              </h3>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                24/7 Ovozli Muloqot
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Botning Telegramda faqat o'zbekcha ovozli xabar (Voice Note) yuborishi va ovoz xususiyatlarini sozlash
            </p>
          </div>
        </div>

        {onSaveToServer && (
          <button
            onClick={onSaveToServer}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-colors shadow-md disabled:opacity-50 cursor-pointer shrink-0"
          >
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Ovoz sozlamalarini saqlash
          </button>
        )}
      </div>

      <div className="space-y-6 pt-6">
        {/* 1. Voice Reply Mode Toggle */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Radio className={`h-4 w-4 ${voiceReplyMode ? 'text-emerald-400' : 'text-slate-500'}`} />
              <span className="text-sm font-semibold text-white">
                Faqat Ovozli Xabar Rejimi (Voice Reply Mode)
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  voiceReplyMode
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {voiceReplyMode ? 'YOQILGAN' : "O'CHIRILGAN"}
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Yoqilganda, bot matn yozmasdan suhbatdoshga to'g'ridan-to'g'ri haqiqiy Telegram ovozli xabari (Voice Note) yuboradi.
              Suhbatdosh yuborgan ovozli xabarlarni ham tinglab, ma'nosiga qarab javob qaytaradi.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={voiceReplyMode}
              onChange={(e) => handleToggleVoiceMode(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-12 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
          </label>
        </div>

        {/* 2. Voice Synthesis Profiles */}
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-2.5 flex items-center justify-between">
            <span>Ovoz Sintezi Profili (Voice Synthesis Profile):</span>
            <span className="text-sky-400 font-mono text-[11px] capitalize">{voiceProfile}</span>
          </label>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Natural */}
            <button
              type="button"
              onClick={() => handleProfileChange('natural')}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                voiceProfile === 'natural'
                  ? 'bg-sky-500/10 border-sky-500 text-white shadow-md shadow-sky-500/10'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 font-semibold text-xs text-sky-400 mb-1">
                <Heart className="h-4 w-4" />
                <span>Natural (Tabiiy va Mehrli)</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Sevimli yor yoki yaqin inson bilan suhbatlashish uchun erkalovchi, bosiq va iliq o'zbekcha yigit ovozi.
              </p>
              {voiceProfile === 'natural' && (
                <div className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-sky-400" />
              )}
            </button>

            {/* Friendly */}
            <button
              type="button"
              onClick={() => handleProfileChange('friendly')}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                voiceProfile === 'friendly'
                  ? 'bg-sky-500/10 border-sky-500 text-white shadow-md shadow-sky-500/10'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 font-semibold text-xs text-amber-400 mb-1">
                <Smile className="h-4 w-4" />
                <span>Friendly (Do'stona va Jonli)</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Do'stlar, o'rtoqlar va tanishlar uchun quvnoq, samimiy, dadil va faol suhbat ohangi.
              </p>
              {voiceProfile === 'friendly' && (
                <div className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-amber-400" />
              )}
            </button>

            {/* Professional */}
            <button
              type="button"
              onClick={() => handleProfileChange('professional')}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                voiceProfile === 'professional'
                  ? 'bg-sky-500/10 border-sky-500 text-white shadow-md shadow-sky-500/10'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 font-semibold text-xs text-indigo-400 mb-1">
                <Briefcase className="h-4 w-4" />
                <span>Professional (Jiddiy va Rasmiy)</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Mijozlar, hamkasblar va begona shaxslar uchun aniq diksiya, madaniy va vazmin ohang.
              </p>
              {voiceProfile === 'professional' && (
                <div className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-indigo-400" />
              )}
            </button>
          </div>
        </div>

        {/* 3. Speaking Pace (Gapirish tezligi) */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-sky-400" />
              <span>Gapirish Tezligi (Speaking Pace):</span>
            </label>
            <span className="text-xs font-mono font-bold text-sky-400 bg-sky-950/80 px-2.5 py-0.5 rounded border border-sky-800">
              {speakingPace.toFixed(2)}x {speakingPace < 0.95 ? '(Bosiq)' : speakingPace > 1.1 ? '(Tezkor)' : '(Normal)'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-[11px] text-slate-500 font-mono">0.8x</span>
            <input
              type="range"
              min="0.8"
              max="1.3"
              step="0.05"
              value={speakingPace}
              onChange={(e) => handlePaceChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
            <span className="text-[11px] text-slate-500 font-mono">1.3x</span>
          </div>

          {/* Quick Pace Presets */}
          <div className="flex gap-2 pt-1 flex-wrap">
            <button
              type="button"
              onClick={() => handlePaceChange(0.85)}
              className={`px-3 py-1 rounded-lg text-xs font-medium border cursor-pointer ${
                speakingPace === 0.85
                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/50'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              0.85x Bosiq va sokin
            </button>
            <button
              type="button"
              onClick={() => handlePaceChange(1.0)}
              className={`px-3 py-1 rounded-lg text-xs font-medium border cursor-pointer ${
                speakingPace === 1.0
                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/50'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              1.0x Tabiiy me'yor (Tavsiya)
            </button>
            <button
              type="button"
              onClick={() => handlePaceChange(1.15)}
              className={`px-3 py-1 rounded-lg text-xs font-medium border cursor-pointer ${
                speakingPace === 1.15
                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/50'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              1.15x Tez va jonli
            </button>
          </div>
        </div>

        {/* 4. Voice Model & Interactive Audio Preview */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-950/80 border border-slate-800/80">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-semibold text-white">
                Ovoz Tembrini Tanlash (Voice Timbre):
              </span>
            </div>
            <select
              value={voiceName}
              onChange={(e) => handleVoiceNameChange(e.target.value)}
              className="text-xs bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
            >
              <option value="Puck">Puck — Tabiiy samimiy erkak ovozi (Tavsiya etiladi)</option>
              <option value="Fenrir">Fenrir — Qat'iy va chuqur erkak ovozi</option>
              <option value="Charon">Charon — Vazmin va xotirjam erkak ovozi</option>
              <option value="Kore">Kore — Mayin va yoqimli ayol ovozi</option>
              <option value="Zephyr">Zephyr — Jonli va quvnoq ovoz</option>
            </select>
          </div>

          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handlePlayPreview}
              disabled={isLoadingPreview}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md ${
                isPlayingPreview
                  ? 'bg-rose-500 hover:bg-rose-400 text-white'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
              } disabled:opacity-50`}
            >
              {isLoadingPreview ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Ovoz generatsiya qilinmoqda...</span>
                </>
              ) : isPlayingPreview ? (
                <>
                  <Square className="h-4 w-4 fill-current" />
                  <span>To'xtatish</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-current" />
                  <span>Ovozni sinab ko'rish (Preview)</span>
                </>
              )}
            </button>

            {previewError && (
              <span className="text-[11px] text-rose-400">{previewError}</span>
            )}
          </div>
        </div>

        {/* 5. Telegram Commands Reminder */}
        <div className="p-3.5 rounded-xl bg-sky-950/30 border border-sky-800/40 flex items-start gap-3">
          <div className="h-7 w-7 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 mt-0.5">
            <Mic className="h-4 w-4" />
          </div>
          <div className="text-xs leading-relaxed text-slate-300">
            <span className="font-semibold text-white">Telegram orqali tezkor buyruqlar:</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 mt-1 text-[11px] text-slate-400">
              <div><code className="text-sky-300 font-mono">/ovoz</code> — Faqat ovozli xabar rejimini yoqish</div>
              <div><code className="text-sky-300 font-mono">/matn</code> — Matnli xabar rejimiga o'tish</div>
              <div><code className="text-sky-300 font-mono">/jim</code> — Botni 1 soatga jim qilish (o'zingiz yozishingiz uchun)</div>
              <div><code className="text-sky-300 font-mono">/status</code> — 24/7 navbatchilik va ovoz holatini tekshirish</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
