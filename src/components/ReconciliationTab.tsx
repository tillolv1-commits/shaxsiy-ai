import React, { useState, useEffect } from 'react';
import {
  Heart,
  Send,
  Copy,
  Check,
  Sparkles,
  AlertTriangle,
  ExternalLink,
  MessageCircle,
  ShieldAlert,
  Info,
  Mic,
  BookOpen,
  RefreshCw,
  Zap,
  Play,
  Square,
  Timer,
  Activity,
  CheckCircle2,
  Radio,
  Flame,
} from 'lucide-react';
import { AutoPingerStatus } from '../types';

interface LetterTemplate {
  id: string;
  title: string;
  tag: string;
  tone: string;
  text: string;
  advice: string;
}

const DEFAULT_TEMPLATES: LetterTemplate[] = [
  {
    id: 'natural-human-bonu',
    title: "Tabiiy Insoniy Yozish (Sevimli Yorim ❤️)",
    tag: 'Foydalanuvchi talabi ✨',
    tone: 'Samimiy, erkalovchi va xuddi o\'zingizdek',
    text: `Salom go'zalim! Yaxshi yuribsanmi jonim? Nimalar qilyapsan? Seni juda yaxshi ko'raman, kuning xayrli o'tsin asalim ❤️`,
    advice: "Kechir yoki yarashdik deyilmaydi! Go'yo oradagi munosabat doim yaxshidek erkalab, xuddi o'zingizdek yoziladi.",
  },
  {
    id: 'sweet-morning',
    title: 'Go\'zalim deb erkalash & Mehrli salom',
    tag: 'Mehrli & Shirin ❤️',
    tone: 'Mehrli, erkalovchi va samimiy',
    text: `Salom go'zalim! Yaxshi dam olib uyg'ondingmi jonim? Kuning xayrli va xursandchilikka to'la o'tsin. Seni juda yaxshi ko'raman, doim yodingda bo'lsin ❤️`,
    advice: 'Erkalovchi, mehrli va shirin ohang. Yarashilgan munosabat uchun ayni muddao.',
  },
  {
    id: 'date-proposal',
    title: 'Uchrashuv taklifi & E\'tibor',
    tag: 'Birga vaqt o\'tkazish',
    tone: 'Iliq, e\'tiborli va quvnoq',
    text: `Go'zalim, bugun kechga bo'shmisan? Birga aylanib kelsak degandim, senga yoqadigan joyga boramiz. Qachon bo'shashingni aytgin, borib o'zim olib ketaman jonim.`,
    advice: 'E\'tibor va g\'amxo\'rlik bilan uchrashuvga chorlash.',
  },
  {
    id: 'caring-checkin',
    title: 'Mehrli so\'rov & G\'amxo\'rlik',
    tag: 'E\'tiborli',
    tone: 'Sokin, g\'amxo\'r va sevimli',
    text: `Jonim, nima ishlar qilyapsan? Charchab qolmayapsanmi? O'zingni ehtiyot qilgin, biron narsa kerak bo'lsa aytgin darhol. Doim yoningdaman go'zalim.`,
    advice: 'Qiz bolaga mehr va tayanch hissini beradigan shirin so\'zlar.',
  },
  {
    id: 'voice-sweet',
    title: 'Ovozli xabar uchun shirin ssenariy',
    tag: 'Ovozli format',
    tone: 'Jonli, samimiy, mehrli va iliq',
    text: `[Ovozli xabarda tabiiy va shirin o'qish uchun]:
"Salom go'zalim... Seni ovozingni sog'inib yubordim. Qayerdasan jonim, ishlaring yaxshimi? Bo'sh bo'lganingda bitta yozgin, gaplashib olaylik ❤️"`,
    advice: 'Ovozli xabarda qiz bolaga eng yoqimli va iliq ta\'sir qiladi.',
  },
];

export const ReconciliationTab: React.FC = () => {
  const [targetId, setTargetId] = useState('8839785942');
  const [selectedTemplate, setSelectedTemplate] = useState<LetterTemplate>(DEFAULT_TEMPLATES[0]);
  const [customMessage, setCustomMessage] = useState(DEFAULT_TEMPLATES[0].text);
  const [copied, setCopied] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sendResult, setSendResult] = useState<{
    status: 'idle' | 'success' | 'error';
    message?: string;
    details?: string;
  }>({ status: 'idle' });

  // Auto-Pinger State ("Alo deb har sekunda yozib tursin Bonu yozguncha")
  const [autoPing, setAutoPing] = useState<AutoPingerStatus>({
    isActive: false,
    targetId: '8839785942',
    targetName: 'Bonu (Sevgilim)',
    messageText: 'Alo',
    intervalSec: 1,
    sentCount: 0,
    lastSentAt: null,
    lastError: null,
    stoppedReason: null,
    startedAt: null,
    history: [],
  });
  const [pingMessage, setPingMessage] = useState('Alo');
  const [pingInterval, setPingInterval] = useState(1);
  const [isTogglingPing, setIsTogglingPing] = useState(false);
  const [simulatingReply, setSimulatingReply] = useState(false);
  const [simulationResult, setSimulationResult] = useState<{
    bonuMessage?: string;
    botReply?: string;
  } | null>(null);

  // Poll auto-ping status
  const fetchAutoPingStatus = async () => {
    try {
      const res = await fetch('/api/reconciliation/auto-ping/status');
      if (res.ok) {
        const data: AutoPingerStatus = await res.json();
        setAutoPing(data);
      }
    } catch {
      // ignore transient network errors
    }
  };

  useEffect(() => {
    fetchAutoPingStatus();
    const interval = setInterval(fetchAutoPingStatus, 1500);
    return () => clearInterval(interval);
  }, []);

  const handleStartPing = async () => {
    setIsTogglingPing(true);
    setSimulationResult(null);
    try {
      const res = await fetch('/api/reconciliation/auto-ping/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetId: targetId.trim() || '8839785942',
          messageText: pingMessage.trim() || 'Alo',
          intervalSec: pingInterval,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setAutoPing(data.status);
      }
    } catch (e) {
      console.error('Auto-ping start xatosi:', e);
    } finally {
      setIsTogglingPing(false);
    }
  };

  const handleStopPing = async () => {
    setIsTogglingPing(true);
    try {
      const res = await fetch('/api/reconciliation/auto-ping/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: "Foydalanuvchi tomonidan qo'lda to'xtatildi",
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setAutoPing(data.status);
      }
    } catch (e) {
      console.error('Auto-ping stop xatosi:', e);
    } finally {
      setIsTogglingPing(false);
    }
  };

  const handleSimulateBonuReply = async () => {
    setSimulatingReply(true);
    try {
      const res = await fetch('/api/reconciliation/auto-ping/simulate-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          replyText: "Salom Rahmatulloh, yaxshimisiz? Nima qilyapsiz?",
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setAutoPing(data.autoPingStatus);
        setSimulationResult({
          bonuMessage: data.bonuMessage,
          botReply: data.botReply,
        });
      }
    } catch (e) {
      console.error('Simulate reply xatosi:', e);
    } finally {
      setSimulatingReply(false);
    }
  };

  const handleSelectTemplate = (tpl: LetterTemplate) => {
    setSelectedTemplate(tpl);
    setCustomMessage(tpl.text);
    setSendResult({ status: 'idle' });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(customMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleGenerateCustom = async (styleKeyword: string) => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/reconciliation/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetId,
          situation: "Bonu bilan yarashilgan, kechirim so'ramaymiz, go'zalim deb erkalaymiz va mehrli xabar yozamiz",
          style: styleKeyword,
        }),
      });
      const data = await res.json();
      if (data.ok && data.letter) {
        setCustomMessage(data.letter);
      }
    } catch (e) {
      console.error('Generatsiya xatosi:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendViaTelegram = async () => {
    setIsSending(true);
    setSendResult({ status: 'idle' });

    try {
      const res = await fetch('/api/reconciliation/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetChatId: targetId.trim(),
          text: customMessage,
        }),
      });
      const data = await res.json();

      if (data.ok) {
        setSendResult({
          status: 'success',
          message: 'Xabar Telegram orqali muvaffaqiyatli yetkazildi!',
          details: 'Telegram API xabarni qabul qildi.',
        });
      } else {
        setSendResult({
          status: 'error',
          message: 'Telegram orqali yuborish cheklovi: ' + (data.error || 'chat not found'),
          details:
            "Telegram xavfsizlik qoidasi: Bot begona profilga birinchi bo'lib to'g'ridan-to'g'ri yozolmaydi (chat not found). Quyidagi 'Nusxa olish' tugmasi orqali shaxsiy Telegram akkauntingizdan yuborishingiz yoki Telegram Business ulangan bo'lishi lozim.",
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSendResult({
        status: 'error',
        message: 'Tarmoq xatosi: ' + msg,
        details: "Shaxsiy Telegram ilovangiz orqali to'g'ridan-to'g'ri yuborishingiz tavsiya etiladi.",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Hero Banner */}
      <div className="rounded-2xl border border-rose-500/20 bg-gradient-to-r from-rose-950/40 via-slate-900 to-slate-900 p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-400 border border-rose-500/20">
              <Heart className="h-3.5 w-3.5 fill-rose-400" />
              <span>❤️ Yarashildi! Sevimli Yor & "Go'zalim" Markazi</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
              Bonu (8839785942) bilan Yarashildi — "Go'zalim" Rejimi
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Xafagarchiliklar va og'ir kunlar ortda qoldi! Endi Bonuga qaytib "kechir" deb uzr so'ralmaydi — faqat "Go'zalim", "jonim", "asalim" deb erkalab, mehrli va sevimli yigit sifatida javob qaytariladi.
            </p>
          </div>

          <div className="rounded-xl border border-rose-500/30 bg-rose-950/50 p-4 text-center min-w-[200px]">
            <span className="text-xs text-rose-300 block font-medium">Sevgilim ID:</span>
            <span className="text-lg font-mono font-bold text-white tracking-wider">{targetId}</span>
            <span className="text-[11px] text-rose-200/80 block mt-1 font-semibold">Bonu (Go'zalim ❤️) — Yarashilgan</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ACTIVE FEATURE: "Go'zalim" Mehrli Muloqot & Tezkor Aloqa Rejimi */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border-2 border-rose-500/40 bg-gradient-to-b from-rose-950/30 to-slate-900/90 p-5 md:p-7 shadow-xl shadow-rose-950/30 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-rose-500/20">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${autoPing.isActive ? 'bg-rose-500/20 border-rose-500 animate-pulse' : 'bg-rose-950/40 border-rose-500/40'}`}>
              <Heart className="h-5 w-5 text-rose-400 fill-rose-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base md:text-lg font-bold text-white">
                  ❤️ Bonu Bilan Muloqot & "Go'zalim" Rejimi
                </h2>
                {autoPing.isActive ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">
                    <span className="h-2 w-2 rounded-full bg-rose-400 animate-ping"></span>
                    FAOL YOZILMOQDA
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
                    ❤️ Yarashilgan (Go'zalim rejimi faol)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Bonu nima deb yozsa ham, unga <strong className="text-rose-300">"Go'zalim", "jonim", "asalim" deb erkalab, mehr bilan</strong> tabiiy insondek javob qaytariladi.
              </p>
            </div>
          </div>

          {/* Real-time Counter Badge */}
          <div className="flex items-center gap-3 bg-slate-950/80 px-4 py-2.5 rounded-xl border border-slate-800 self-start md:self-auto">
            <Activity className="h-4 w-4 text-rose-400" />
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-mono">Yuborilgan xabarlar</span>
              <span className="text-base font-bold font-mono text-rose-300">
                {autoPing.sentCount} <span className="text-xs font-normal text-slate-400">ta</span>
              </span>
            </div>
          </div>
        </div>

        {/* Stopped Notification or Reason */}
        {autoPing.stoppedReason && !autoPing.isActive && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/30 p-4 text-xs flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-emerald-300 block text-sm">
                To'xtash holati:
              </span>
              <p className="text-emerald-100/90 leading-relaxed font-medium">
                {autoPing.stoppedReason}
              </p>
            </div>
          </div>
        )}

        {/* Live Simulation Banner if Bonu answered */}
        {simulationResult && (
          <div className="rounded-xl border border-sky-500/40 bg-sky-950/30 p-4 space-y-3">
            <div className="flex items-center gap-2 text-sky-300 font-bold text-xs uppercase tracking-wider">
              <MessageCircle className="h-4 w-4" />
              <span>Simulyatsiya natijasi: Bonu javob berdi & To'xtadi</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400 block font-mono text-[11px]">Bonu (8839785942):</span>
                <p className="text-white font-medium mt-0.5">{simulationResult.bonuMessage}</p>
              </div>
              <div className="bg-rose-950/40 p-3 rounded-lg border border-rose-500/30">
                <span className="text-rose-400 block font-mono text-[11px]">Sizning botingiz (Tabiiy insoniy javob):</span>
                <p className="text-rose-100 font-medium mt-0.5">{simulationResult.botReply}</p>
              </div>
            </div>
          </div>
        )}

        {/* Feature Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
          <div className="rounded-lg bg-emerald-950/40 border border-emerald-500/30 px-2.5 py-1.5 text-emerald-300 font-medium flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>24/7 Uzluksiz faol</span>
          </div>
          <div className="rounded-lg bg-indigo-950/40 border border-indigo-500/30 px-2.5 py-1.5 text-indigo-300 font-medium flex items-center gap-1.5">
            <span>🛡️</span>
            <span>Siz yozganda bot jim turadi</span>
          </div>
          <div className="rounded-lg bg-rose-950/40 border border-rose-500/30 px-2.5 py-1.5 text-rose-300 font-medium flex items-center gap-1.5">
            <span>🚫</span>
            <span>Yarashdik/Kechir demaydi</span>
          </div>
          <div className="rounded-lg bg-amber-950/40 border border-amber-500/30 px-2.5 py-1.5 text-amber-300 font-medium flex items-center gap-1.5">
            <span>✨</span>
            <span>Xuddi o'zingizdek yozadi</span>
          </div>
        </div>

        {/* Controls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Text Input */}
          <div className="md:col-span-5 space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Yuboriladigan xabar:</span>
              <span className="text-[11px] text-rose-400 font-mono">Standart: "Alo" / "Go'zalim ❤️"</span>
            </label>
            <input
              type="text"
              value={pingMessage}
              disabled={autoPing.isActive}
              onChange={(e) => setPingMessage(e.target.value)}
              placeholder="Masalan: Alo yoki Salom go'zalim ❤️"
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-sm text-white font-medium focus:border-rose-500 focus:outline-hidden disabled:opacity-60"
            />
            {/* Quick Presets */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {["Alo", "Salom go'zalim ❤️", "Jonim qandaysan?", "Asalim nima qilyapsan?", "Seni yaxshi ko'raman ❤️"].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  disabled={autoPing.isActive}
                  onClick={() => setPingMessage(preset)}
                  className="px-2 py-0.5 rounded-md text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition disabled:opacity-40"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Interval Selector */}
          <div className="md:col-span-3 space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Timer className="h-3.5 w-3.5 text-rose-400" />
              <span>Interval (Vaqt):</span>
            </label>
            <select
              value={pingInterval}
              disabled={autoPing.isActive}
              onChange={(e) => setPingInterval(Number(e.target.value))}
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2.5 text-xs text-white font-medium focus:border-rose-500 focus:outline-hidden disabled:opacity-60"
            >
              <option value={1}>⚡ Har 1 sekundda (Foydalanuvchi talabi)</option>
              <option value={2}>Har 2 sekundda</option>
              <option value={3}>Har 3 sekundda (Tavsiya etiladi)</option>
              <option value={5}>Har 5 sekundda</option>
            </select>
            <span className="text-[10px] text-slate-400 block">Telegram chekloviga mos</span>
          </div>

          {/* Action Trigger Buttons */}
          <div className="md:col-span-4 flex flex-col sm:flex-row items-stretch gap-2.5 pt-1 md:pt-4">
            {!autoPing.isActive ? (
              <button
                disabled={isTogglingPing}
                onClick={handleStartPing}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-rose-950 transition disabled:opacity-50"
              >
                {isTogglingPing ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 fill-white" />
                )}
                <span>"Alo" deb yozishni boshlash</span>
              </button>
            ) : (
              <button
                disabled={isTogglingPing}
                onClick={handleStopPing}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-rose-500/50 px-4 py-3 text-xs font-bold text-rose-300 shadow-md transition disabled:opacity-50 animate-pulse"
              >
                {isTogglingPing ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Square className="h-4 w-4 fill-rose-300" />
                )}
                <span>To'xtatish (Hozir yozmoqda)</span>
              </button>
            )}

            {/* Test Simulation Button */}
            <button
              disabled={simulatingReply}
              onClick={handleSimulateBonuReply}
              title="Bonu javob yozgandagi holatni simulyatsiya qilish"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 px-3 py-3 text-xs font-medium text-slate-300 border border-slate-700 transition disabled:opacity-50"
            >
              {simulatingReply ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              )}
              <span className="hidden sm:inline">Test: Bonu yozishi</span>
              <span className="sm:hidden">Test</span>
            </button>
          </div>
        </div>

        {/* Ping Stream / Live Logs Preview */}
        {autoPing.history.length > 0 && (
          <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="h-3.5 w-3.5 text-rose-400" />
                Oxirgi yuborish oqimi ({autoPing.history.length} ta qayd)
              </span>
              {autoPing.lastSentAt && (
                <span className="text-slate-500 font-mono text-[10px]">
                  Oxirgi: {new Date(autoPing.lastSentAt).toLocaleTimeString()}
                </span>
              )}
            </div>

            <div className="max-h-28 overflow-y-auto space-y-1 font-mono text-[11px] pr-1">
              {autoPing.history.slice(0, 8).map((h) => (
                <div
                  key={h.id}
                  className={`flex items-center justify-between px-2.5 py-1 rounded-md border text-[11px] ${
                    h.status === 'sent'
                      ? 'bg-slate-900/60 border-slate-800 text-slate-300'
                      : h.status === 'stopped'
                      ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300 font-sans'
                      : 'bg-amber-950/30 border-amber-500/20 text-amber-200 font-sans'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-[10px] text-slate-500">
                      {new Date(h.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="font-bold">"{h.text}"</span>
                    {h.note && <span className="text-slate-400 text-[10px] truncate">({h.note})</span>}
                  </div>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-semibold shrink-0 ${
                      h.status === 'sent'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : h.status === 'stopped'
                        ? 'bg-sky-500/10 text-sky-400'
                        : 'bg-amber-500/10 text-amber-400'
                    }`}
                  >
                    {h.status === 'sent' ? 'Yuborildi' : h.status === 'stopped' ? "To'xtadi" : 'Urinish'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Reconciled Couple Advice Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-4">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm mb-2">
            <CheckCircle2 className="h-4 w-4" />
            <span>1. Qaytib "Kechir" Demang</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Yarashib bo'lingan, o'tmishdagi xatolar unutilgan. Qayta-qayta uzr so'rab o'sha og'riqli kunlarni eslatish
            yaramaydi. Endi faqat quvonch va kelajak haqida gapiring.
          </p>
        </div>

        <div className="rounded-xl border border-rose-500/20 bg-rose-950/20 p-4">
          <div className="flex items-center gap-2 text-rose-400 font-semibold text-sm mb-2">
            <Heart className="h-4 w-4 fill-rose-400" />
            <span>2. "Go'zalim" Deb Erkalang</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Bonuga erkalab "go'zalim", "jonim", "asalim" deb mehr bering. Qiz bola doim sevilayotganini va unga e'tibor
            berilayotganini his qilib turishi kerak.
          </p>
        </div>

        <div className="rounded-xl border border-sky-500/20 bg-sky-950/20 p-4">
          <div className="flex items-center gap-2 text-sky-400 font-semibold text-sm mb-2">
            <Sparkles className="h-4 w-4" />
            <span>3. Ko'proq Ko'rishish & E'tibor</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Birga aylanish, yoqimli uchrashuvlar qilish va yuzma-yuz gaplashish munosabatni har qanday xabardan
            kuchliroq mustahkamlaydi.
          </p>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Template Selector (Left Column) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Muloqot & Erkalash Uslublari
            </span>
            <span className="text-[11px] text-slate-500">{DEFAULT_TEMPLATES.length} ta tayyor xabar</span>
          </div>

          <div className="space-y-2.5">
            {DEFAULT_TEMPLATES.map((tpl) => {
              const isSelected = selectedTemplate.id === tpl.id;
              return (
                <button
                  key={tpl.id}
                  onClick={() => handleSelectTemplate(tpl)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                    isSelected
                      ? 'border-rose-500/60 bg-rose-950/30 text-white shadow-sm ring-1 ring-rose-500/20'
                      : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white">{tpl.title}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                      {tpl.tag}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{tpl.advice}</p>
                </button>
              );
            })}
          </div>

          {/* AI Generator Shortcuts */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3.5 space-y-2 mt-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-rose-300">
              <Sparkles className="h-3.5 w-3.5" />
              <span>AI bilan mehrli xabar tuzish ("Go'zalim" rejimi)</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                disabled={isGenerating}
                onClick={() => handleGenerateCustom('Go\'zalim deb erkalash, mehrli, shirin va sevimli yor kabi')}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-left transition disabled:opacity-50"
              >
                🌸 Go'zalim deb erkalash
              </button>
              <button
                disabled={isGenerating}
                onClick={() => handleGenerateCustom('Shirin salom, mehrli e\'tibor va sog\'inch haqida')}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-left transition disabled:opacity-50"
              >
                💖 Shirin salom & Mehr
              </button>
              <button
                disabled={isGenerating}
                onClick={() => handleGenerateCustom('Bugun kechga uchrashuvga, aylanishga taklif qilish')}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-left transition disabled:opacity-50"
              >
                ☕ Uchrashuv taklifi
              </button>
              <button
                disabled={isGenerating}
                onClick={() => handleGenerateCustom('Ovozli xabar uchun qisqa, shirin va mehrli')}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-left transition disabled:opacity-50"
              >
                🎙️ Ovozli erkalash
              </button>
            </div>
            {isGenerating && (
              <div className="flex items-center gap-2 text-xs text-rose-400 pt-1">
                <RefreshCw className="h-3 w-3 animate-spin" />
                <span>AI tabiiy insoniy maktub tuzmoqda...</span>
              </div>
            )}
          </div>
        </div>

        {/* Message Editor & Dispatcher (Right Column) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 space-y-4">
            {/* Header with target ID input */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-rose-500 fill-rose-500" />
                <span className="text-sm font-bold text-white">{selectedTemplate.title}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">Telegram ID:</span>
                <input
                  type="text"
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  placeholder="Telegram ID"
                  className="w-32 rounded-md bg-slate-950 border border-slate-700 px-2.5 py-1 text-xs text-white font-mono focus:border-rose-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Message Area */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                <span>Maktub matni (Tahrirlashingiz mumkin):</span>
                <span className="text-[11px] text-slate-500">{customMessage.length} ta belgi</span>
              </label>
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={11}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 p-4 text-sm text-slate-100 leading-relaxed focus:border-rose-500/80 focus:ring-1 focus:ring-rose-500/20 focus:outline-hidden font-sans"
              />
            </div>

            {/* Psychological note for this template */}
            <div className="rounded-lg bg-slate-950/80 border border-slate-800 p-3 text-xs text-slate-400 flex items-start gap-2.5">
              <BookOpen className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-200">Uslub tavsiyasi: </span>
                {selectedTemplate.advice}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 px-3.5 py-2 text-xs font-semibold text-white transition border border-slate-700"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Nusxa olindi!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Matndan nusxa olish</span>
                    </>
                  )}
                </button>

                <a
                  href={`tg://openmessage?user_id=${targetId}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-sky-950/60 hover:bg-sky-900/80 px-3.5 py-2 text-xs font-semibold text-sky-300 transition border border-sky-800/60"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  <span>Telegramda ochish</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              <button
                disabled={isSending}
                onClick={handleSendViaTelegram}
                className="inline-flex items-center gap-2 rounded-lg bg-rose-600 hover:bg-rose-500 px-4 py-2 text-xs font-semibold text-white transition shadow-sm disabled:opacity-50"
              >
                {isSending ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Yuborilmoqda...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>Telegram orqali yuborishga urinish</span>
                  </>
                )}
              </button>
            </div>

            {/* Result Box */}
            {sendResult.status !== 'idle' && (
              <div
                className={`rounded-xl p-4 border text-xs space-y-1.5 ${
                  sendResult.status === 'success'
                    ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300'
                    : 'border-amber-500/30 bg-amber-950/20 text-amber-200'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold">
                  {sendResult.status === 'success' ? (
                    <Check className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                  )}
                  <span>{sendResult.message}</span>
                </div>
                {sendResult.details && (
                  <p className="text-slate-300 leading-relaxed pl-6">{sendResult.details}</p>
                )}
              </div>
            )}
          </div>

          {/* Auto-Repentance Guarantee */}
          <div className="rounded-xl border border-rose-500/20 bg-rose-950/10 p-4 flex items-start gap-3">
            <Heart className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <span className="font-semibold text-rose-300 block">
                Maxsus Xavfsizlik Rejimi Yoqilgan (ID: 8839785942 - Bonu)
              </span>
              <p className="text-slate-300 leading-relaxed">
                Agar Bonu sizning Telegramingizga (yoki botingizga) biron so'z yozsa, tizim darhol buni
                aniqlaydi, <strong className="text-rose-300">har sekundlik "Alo" yozishni to'xtatadi</strong> va unga xuddi insondek (Rahmatullohning o'zidek), hech qanday badiiy dramalarsiz, qaytib hech qachon xiyonat qilmaslikka qat'iy erkakcha so'z bergan holda, yuzma-yuz gaplashib olish taklifi bilan samimiy javob qaytaradi.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
