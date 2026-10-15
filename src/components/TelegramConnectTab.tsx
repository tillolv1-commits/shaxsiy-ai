import React, { useState } from 'react';
import { Send, Key, CheckCircle2, AlertCircle, Play, Square, ExternalLink, HelpCircle, Shield, Sparkles, RefreshCw, Smartphone, Check, Zap } from 'lucide-react';
import { TelegramBotInfo, BusinessConnectionInfo } from '../types';

interface TelegramConnectTabProps {
  botToken: string;
  setBotToken: (token: string) => void;
  botInfo: TelegramBotInfo | null;
  businessConnection: BusinessConnectionInfo | null;
  isPolling: boolean;
  onVerifyBot: (token: string) => Promise<boolean>;
  onTogglePolling: (enable: boolean) => Promise<void>;
  stats: {
    totalReceived: number;
    totalReplied: number;
    lastActiveAt: string | null;
  };
}

export const TelegramConnectTab: React.FC<TelegramConnectTabProps> = ({
  botToken,
  setBotToken,
  botInfo,
  businessConnection,
  isPolling,
  onVerifyBot,
  onTogglePolling,
  stats,
}) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifySuccess, setVerifySuccess] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [businessCheckStep, setBusinessCheckStep] = useState<number>(1);
  const [isSettingMenuButton, setIsSettingMenuButton] = useState(false);
  const [menuButtonSuccess, setMenuButtonSuccess] = useState<string | null>(null);
  const [menuButtonError, setMenuButtonError] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [menuMode, setMenuMode] = useState<'commands' | 'web_app'>('commands');

  const miniAppUrl = typeof window !== 'undefined'
    ? window.location.origin
    : 'https://ais-dev-m5typlarwcoemrtehsvjgf-798886787643.asia-southeast1.run.app';

  const handleSetMenuButton = async (selectedMode: 'commands' | 'web_app' = menuMode) => {
    if (!botToken.trim()) {
      setMenuButtonError('Avval yuqoridagi bot tokenini kiriting va tasdiqlang.');
      return;
    }
    setIsSettingMenuButton(true);
    setMenuButtonSuccess(null);
    setMenuButtonError(null);
    try {
      const res = await fetch('/api/telegram/set-menu-button', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: botToken.trim(),
          miniAppUrl,
          mode: selectedMode,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setMenuButtonSuccess(
          selectedMode === 'commands'
            ? "Ajoyib! Telegramda botning pastki menyusi 'Buyruqlar menyusi'ga o'rnatildi (100% xatosiz ishlaydi)."
            : "Ajoyib! Mini App veb-manzili botning pastki chap menyusiga biriktirildi."
        );
      } else {
        setMenuButtonError(data.error || 'Menyu tugmasini biriktirishda xatolik yuz berdi.');
      }
    } catch (err: unknown) {
      setMenuButtonError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSettingMenuButton(false);
    }
  };

  const handleVerify = async () => {
    if (!botToken.trim()) {
      setVerifyError('Iltimos, Telegram Bot Tokenini kiriting.');
      return;
    }

    setIsVerifying(true);
    setVerifyError(null);
    setVerifySuccess(false);

    try {
      const ok = await onVerifyBot(botToken.trim());
      if (ok) {
        setVerifySuccess(true);
        // Automatically set Mini App menu button on the bot!
        try {
          await fetch('/api/telegram/set-menu-button', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ botToken: botToken.trim(), miniAppUrl }),
          });
          setMenuButtonSuccess('Mini App muvaffaqiyatli bot menyusiga biriktirildi!');
        } catch (e) {
          console.error(e);
        }
      } else {
        setVerifyError('Bot tokeni tasdiqlanmadi. Token to\'g\'riligini tekshiring.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setVerifyError(msg);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleToggle = async (enable: boolean) => {
    setIsToggling(true);
    try {
      await onTogglePolling(enable);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-sky-950/70 via-slate-900 to-slate-900 border border-sky-800/40 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Key className="h-5 w-5" />
            </span>
            <h2 className="text-lg font-bold text-white">Telegram Bot Integratsiyasi</h2>
          </div>
          <p className="text-xs text-slate-300 mt-2 max-w-2xl leading-relaxed">
            Telegram botingizni ulang va real vaqt rejimida avtomatik javob berishni faollashtiring.
            Kim yozsa, server Gemini AI orqali sizning uslubingizda avtomatik xabar qaytaradi.
          </p>
        </div>

        {/* Polling Toggle Control */}
        <div className="flex items-center gap-3 shrink-0">
          {isPolling ? (
            <button
              onClick={() => handleToggle(false)}
              disabled={isToggling}
              className="px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-semibold text-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Square className="h-4 w-4" />
              Avtomatik Javobni To'xtatish
            </button>
          ) : (
            <button
              onClick={() => handleToggle(true)}
              disabled={isToggling || !botToken}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors shadow-lg flex items-center gap-2 disabled:opacity-40 cursor-pointer"
            >
              {isToggling ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-slate-950" />}
              Avtomatik Javobni Yoqish
            </button>
          )}
        </div>
      </div>

      {/* 1-Usul: Telegram Business Direct Connection Module */}
      <div className="rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-emerald-500/30 p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Smartphone className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">
                  1-Usul: Telegram Business orqali Shaxsiy Lichkaga To'g'ridan-to'g'ri Ulash
                </h3>
                <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                  Rasmiy & Xavfsiz
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Birov sizning shaxsiy Telegramingizga yozganda, AI to'g'ridan-to'g'ri sizning nomingizdan javob yozadi
              </p>
            </div>
          </div>

          <div>
            {businessConnection ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                Lichka Muvaffaqiyatli Ulandi
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-850 border border-slate-700 text-slate-300 text-xs font-medium">
                <Zap className="h-3.5 w-3.5 text-amber-400" />
                Ulanish kutilyapti
              </span>
            )}
          </div>
        </div>

        {/* 3 Steps Guide for Telegram Business */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-sky-400 font-mono">01-Qadam</span>
              <span className="text-[10px] text-slate-500 font-mono">@BotFather</span>
            </div>
            <strong className="text-xs text-white block">Business Mode'ni yoqing</strong>
            <p className="text-xs text-slate-300 leading-relaxed">
              Telegramda <strong>@BotFather</strong> ga kiring: <code className="text-sky-300">/mybots</code> &rarr; botingizni tanlang &rarr; <strong>Bot Settings</strong> &rarr; <strong>Business Mode</strong> &rarr; <strong>Turn ON</strong> bosing.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 font-mono">02-Qadam</span>
              <span className="text-[10px] text-slate-500 font-mono">Telegram App</span>
            </div>
            <strong className="text-xs text-white block">Sozlamalarga botni qo'shing</strong>
            <p className="text-xs text-slate-300 leading-relaxed">
              Shaxsiy Telegramingizda: <strong>Sozlamalar</strong> &rarr; <strong>Telegram Business</strong> &rarr; <strong>Chat-botlar (Chatbots)</strong> bo'limiga kiring va botingiz: <code className="text-emerald-300">@{botInfo?.username || 'bot_username'}</code> ni tanlang.
            </p>
            <div className="p-2 rounded-lg bg-amber-950/40 border border-amber-600/40 text-[11px] text-amber-200">
              ⚠️ <b>MUHIM:</b> Chatbot sahifasida <b>"Javob berishga ruxsat" (Разрешить отвечать / Can reply)</b> yoqilgan bo'lishi shart! Aks holda bot "yozmoqda" chiqargani bilan xabarni lichkaga yetkaza olmaydi.
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-400 font-mono">03-Qadam</span>
              <span className="text-[10px] text-slate-500 font-mono">Tayyor!</span>
            </div>
            <strong className="text-xs text-white block">Avtomatik javob faol</strong>
            <p className="text-xs text-slate-300 leading-relaxed">
              Yuqoridagi <strong>"Avtomatik Javobni Yoqish"</strong> tugmasini bosing. Endi shaxsiy lichkangizga kelgan har bir savolga AI sizning o'rningizga sizning uslubingizda javob qaytaradi!
            </p>
          </div>
        </div>

        {businessConnection && (
          <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-300 flex items-center justify-between">
            <div>
              <strong>Faol Telegram Business ulangan akkaunt:</strong>{' '}
              <span>{businessConnection.user?.first_name} {businessConnection.user?.username ? `(@${businessConnection.user.username})` : ''}</span>
            </div>
            <span className="text-xs font-mono text-emerald-400">ID: {businessConnection.id.slice(0, 12)}...</span>
          </div>
        )}
      </div>

      {/* Real-time Bot Status Card */}
      {isPolling && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <div>
              <p className="text-xs font-bold text-emerald-300">Telegram Bot Onlayn va Faol!</p>
              <p className="text-[11px] text-slate-400">
                Telegramdan kelgan har bir yangi xabarga AI avtomatik sizning nomingizdan javob bermoqda.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs font-mono text-slate-300">
            <div>
              <span className="text-slate-400 block text-[10px]">Qabul qilingan:</span>
              <strong className="text-white text-sm tabular-nums">{stats.totalReceived}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Javob berilgan:</span>
              <strong className="text-emerald-400 text-sm tabular-nums">{stats.totalReplied}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Token Input & Verification Section */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-md space-y-6">
        <h3 className="text-sm font-semibold text-white">BotFather API Tokenini Kiritish</h3>

        <div className="space-y-2">
          <label className="text-xs text-slate-300 block font-medium">Telegram Bot Token:</label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="password"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz..."
              className="flex-1 text-xs font-mono bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
            />
            <button
              onClick={handleVerify}
              disabled={isVerifying || !botToken.trim()}
              className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              {isVerifying ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Tokenni Tekshirish
            </button>
          </div>
        </div>

        {verifyError && (
          <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{verifyError}</span>
          </div>
        )}

        {botInfo && (
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-sm">
                TG
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">{botInfo.first_name}</h4>
                <p className="text-xs font-mono text-sky-400">@{botInfo.username}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <a
                href={`https://t.me/${botInfo.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors"
              >
                Telegramda ochish <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Telegram Mini App (TMA) Module */}
      <div className="rounded-2xl bg-gradient-to-b from-sky-950/40 via-slate-900 to-slate-950 border border-sky-500/30 p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">
                  Telegram Mini App & Menyu Boshqaruvi
                </h3>
                <span className="text-[10px] font-mono text-sky-300 bg-sky-950/80 px-2 py-0.5 rounded border border-sky-800">
                  Buyruqlar & Web App
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Telegram bot menyusini boshqarish va ilovani to'g'ridan-to'g'ri ochish
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleSetMenuButton('commands')}
              disabled={isSettingMenuButton || !botToken}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors shadow-md disabled:opacity-40 cursor-pointer shrink-0"
              title="100% ishonchli: /start, /status, /yarashdim, /alo, /stop"
            >
              <Check className="h-4 w-4" />
              📋 Buyruqlar Menyusi (100% Kafolatlangan)
            </button>
            <button
              onClick={() => handleSetMenuButton('web_app')}
              disabled={isSettingMenuButton || !botToken}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 transition-colors disabled:opacity-40 cursor-pointer shrink-0"
            >
              <Smartphone className="h-4 w-4 text-sky-400" />
              📱 Mini App Tugmasi
            </button>
          </div>
        </div>

        {/* Diagnosis & Help Box */}
        <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs space-y-2">
          <div className="flex items-center gap-2 font-semibold text-amber-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
            <span>Nega Mini App Telegram ichida ochilmay qolishi mumkin?</span>
          </div>
          <p className="text-[11px] leading-relaxed text-amber-200/90">
            Google AI Studio rivojlantirish muhiti xavfsizlik siyosati (Google hisobiga kirish va iframe cheklovlari) sababli, Telegram ichki WebView oynasida ba'zan oq ekran ko'rinishi mumkin.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
            <div className="p-2.5 rounded-lg bg-slate-950/70 border border-amber-500/20">
              <strong className="text-emerald-400 block mb-0.5">✅ 1-yechim (Brauzerda ochish):</strong>
              Quyidagi havolani nusxalab Google Chrome yoki Safari orqali to'g'ridan-to'g'ri oching.
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950/70 border border-amber-500/20">
              <strong className="text-sky-400 block mb-0.5">✅ 2-yechim (Telegram chatida):</strong>
              Botga <code className="text-sky-300">/yarashdim</code>, <code className="text-sky-300">/alo</code>, <code className="text-sky-300">/stop</code> yozib, to'liq boshqaring!
            </div>
          </div>
        </div>

        {menuButtonSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{menuButtonSuccess}</span>
          </div>
        )}

        {menuButtonError && (
          <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
            <span>{menuButtonError}</span>
          </div>
        )}

        {/* Mini App URL Display */}
        <div className="space-y-2">
          <label className="text-xs text-slate-300 block font-medium">Boshqaruv Havolasi (Brauzer & Web App URL):</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-mono text-sky-300 truncate select-all">
              {miniAppUrl}
            </div>
            <a
              href={miniAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              <ExternalLink className="h-4 w-4" />
              Brauzerda Ochish
            </a>
            <button
              onClick={() => {
                navigator.clipboard.writeText(miniAppUrl);
                setCopiedUrl(true);
                setTimeout(() => setCopiedUrl(false), 2500);
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              {copiedUrl ? <Check className="h-4 w-4 text-emerald-400" /> : null}
              {copiedUrl ? 'Nusxalandi!' : 'Havoladan Nusxa Olish'}
            </button>
          </div>
        </div>

        {/* Two Mini App Options explanation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
            <strong className="text-xs text-sky-300 block flex items-center gap-1.5">
              <span>1. Bot Menyu Tugmasi (Tezkor usul)</span>
            </strong>
            <p className="text-xs text-slate-300 leading-relaxed text-[11px]">
              Yuqoridagi <strong>"Bot Menyu Tugmasiga O'rnatish"</strong> tugmasini bossangiz, botingizning pastki chap burchagida doimiy <strong>"Mini App"</strong> tugmasi paydo bo'ladi. Har qanday foydalanuvchi bir bosishda ilovani Telegram ichida ochadi!
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
            <strong className="text-xs text-emerald-300 block flex items-center gap-1.5">
              <span>2. BotFather orqali Mustaqil Mini App (`/newapp`)</span>
            </strong>
            <p className="text-xs text-slate-300 leading-relaxed text-[11px]">
              Telegramda <strong>@BotFather</strong> ga kirib <code>/newapp</code> buyrug'ini yuboring. Botingizni tanlang, rasm yuklang va yuqoridagi Mini App havolasini kiriting. Natijada sizda maxsus <code>t.me/botingiz/app</code> havolasi hosil bo'ladi!
            </p>
          </div>
        </div>
      </div>

      {/* Step by step guide */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-md space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-sky-400" />
          Botni Qanday Ochish Kerak? (3 daqiqalik qo'llanma)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="text-xs font-bold text-sky-400">01. BotFather ga kiring</span>
            <p className="text-xs text-slate-300 leading-relaxed">
              Telegram qidiruvidan <strong className="text-white">@BotFather</strong> rasmiy botiga o'ting va Start bosing.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="text-xs font-bold text-sky-400">02. /newbot buyrug'i</span>
            <p className="text-xs text-slate-300 leading-relaxed">
              Botga ism tanlang (masalan, "Tilloxon AI Yordamchi") va username bering (oxiri <code className="text-sky-300">_bot</code> bilan tugashi kerak).
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="text-xs font-bold text-sky-400">03. Tokenni kiriting</span>
            <p className="text-xs text-slate-300 leading-relaxed">
              BotFather bergan API tokenni yuqoridagi maydonga kiriting va "Avtomatik Javobni Yoqish" tugmasini bosing!
            </p>
          </div>
        </div>

        {/* Direct Personal Account & Telegram Business explanation */}
        <div className="mt-4 p-5 rounded-xl bg-slate-950 border border-sky-500/30 space-y-3">
          <div className="flex items-center gap-2 text-sky-400 font-bold text-xs">
            <Sparkles className="h-4 w-4" />
            <span>Mening Shaxsiy Telegramimga (Lichkamga) bog'lana oladimi?</span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Ha, bu 2 xil xavfsiz usul orqali amalga oshiriladi:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
              <strong className="text-emerald-400 block font-semibold">
                1. Telegram Business Chatbots (To'g'ridan-to'g'ri lichka)
              </strong>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                Telegram Sozlamalari &rarr; <strong>Telegram Business</strong> &rarr; <strong>Chat-botlar</strong> bo'limiga kiring va ushbu botingiz usernameini qo'shing. Shunda shaxsiy lichkangizga yozgan odamlarga bot to'g'ridan-to'g'ri sizning nomingizdan javob beradi!
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
              <strong className="text-sky-400 block font-semibold">
                2. Profil Bio orqali Yordamchi (Virtual Vakil)
              </strong>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                Akkauntingiz bio qismiga: <code className="text-sky-300">"Tezkor savollar uchun shaxsiy AI yordamchim: @{botInfo?.username || 'botingiz_username'}"</code> deb qo'yasiz.
              </p>
            </div>
          </div>

          <div className="pt-2 text-[11px] text-slate-400 flex items-center gap-2">
            <Shield className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <span>Tizim shaxsiy parolingiz yoki SMS kodlaringizni so'ramaydi — bu sizning Telegramingiz daxlsizligi va xavfsizligini 100% ta'minlaydi.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
