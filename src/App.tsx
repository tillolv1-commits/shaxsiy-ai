import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { SimulatorTab } from './components/SimulatorTab';
import { StyleDnaTab } from './components/StyleDnaTab';
import { KnowledgeBaseTab } from './components/KnowledgeBaseTab';
import { TelegramConnectTab } from './components/TelegramConnectTab';
import { LogsTab } from './components/LogsTab';
import { MediaStudioTab } from './components/MediaStudioTab';
import { ChatHistoryTab } from './components/ChatHistoryTab';
import { ReconciliationTab } from './components/ReconciliationTab';
import { PersonaConfig, TelegramBotInfo, LogEntry, BusinessConnectionInfo } from './types';

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        initDataUnsafe?: {
          user?: {
            id?: number;
            first_name?: string;
            last_name?: string;
            username?: string;
          };
        };
        themeParams?: Record<string, string>;
      };
    };
  }
}

const DEFAULT_PERSONA: PersonaConfig = {
  ownerName: 'Rahmatulloh',
  profession: 'Shaxsiy profil',
  language: 'uz-lat',
  tone: 'friendly_informal',
  slangWords: ['aka', 'uka', 'gap yo\'q', 'bo\'ldi', 'rahmat', 'yaxshi', 'bopti', 'xop', 'aytgancha'],
  greetingPhrase: 'Assalomu alaykum! Yaxshimisiz?',
  farewellPhrase: 'Salomat bo\'ling, ko\'rishguncha!',
  emojiUsage: 'moderate',
  sentenceLength: 'short_telegram',
  knowledgeBase: [
    {
      id: 'kb-1',
      questionOrTopic: 'Hol-ahvol va salomlashuv',
      answer: 'Rahmat, xudoga shukur yaxshi yuribman. Doim samimiy va ochiqko\'ngilman.',
    },
    {
      id: 'kb-2',
      questionOrTopic: 'Ko\'rishish yoki uchrashuv taklifi',
      answer: 'Bugun kechki payt soat 6-7 larda yoki ertaga ko\'rishsak bo\'ladi, qayerda uchrashishni kelishib olamiz.',
    },
    {
      id: 'kb-3',
      questionOrTopic: 'Qayerdaligim haqida so\'rashsa',
      answer: 'Uydaman yoki shahardaman, tinchlikmi deb so\'rang.',
    },
    {
      id: 'kb-4',
      questionOrTopic: 'Qarz yoki pul so\'rashsa',
      answer: 'Hozir imkoniyatim yo\'q edi, xafa bo\'lmaysiz deb muloyim rad eting.',
    },
  ],
  behaviorRules: [
    'Suhbatdosh nima deb yozsa, aynan o\'sha gapning MA\'NOSIGA mos, to\'g\'ri va mantiqiy javob bering',
    'Bir xil gapni ("band edim" kabi) har safar takrorlash qat\'iyan man etiladi — har xil gapga har xil, vaziyatga mos javob bering',
    'Hech qachon bot ekanligingizni oshkor qilmang, to\'g\'ridan-to\'g\'ri Rahmatullohning o\'zidek samimiy yozing',
    'Telegramda uzun rasmiy gaplar yozmang, qisqa va lo\'nda (1-2 gap) jonli o\'zbekcha yozing',
    'Tabiiy so\'zlashuv ohangini saqlang ("bopti", "xop", "gap yo\'q", "bo\'ldi", "aytgancha")',
  ],
  sampleMessages: [
    'Va alaykum assalom! Rahmat, o\'zingiz yaxshimisiz? Nima yangiliklar?',
    'Bo\'ladi, bugun kechga 6 larda ko\'rishsak bo\'ladi 👍',
    'Uydaman, tinchlikmi nima gap?',
    'Bo\'ldi tushundim, kelishdik bopti.',
    'Rahmat katta, salomat bo\'ling!',
  ],
  emergencyContact: '+998 90 000 00 00',
  autoReplyMode: 'always',
  humanDelaySeconds: 2,
  splitMessages: true,
  timeAwareness: true,
  dialectStyle: 'friendly_informal',
  antiScamGuard: true,
  mediaGeneration: {
    enabled: true,
    allowImages: true,
    allowVideos: true,
    defaultStyle: 'Fotorealistik (8K)',
  },
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'simulator' | 'style' | 'knowledge' | 'telegram' | 'logs' | 'history' | 'media' | 'reconciliation'>('simulator');
  const [persona, setPersona] = useState<PersonaConfig>(DEFAULT_PERSONA);
  const [botToken, setBotToken] = useState<string>('8987651378:AAGiOkcOdjnC9fBvrMygJ7iBvNpygETPBTw');
  const [botInfo, setBotInfo] = useState<TelegramBotInfo | null>({
    id: 8987651378,
    first_name: 'Rahmatulloh Ai.',
    username: 'Rahmatulloh_Airobot',
  });
  const [businessConnection, setBusinessConnection] = useState<BusinessConnectionInfo | null>({
    id: 'conn_5275538732',
    user: {
      id: 5275538732,
      first_name: 'Tilloxon',
    },
    user_chat_id: 5275538732,
    is_enabled: true,
    can_reply: true,
  });
  const [isPolling, setIsPolling] = useState<boolean>(true);
  const [stats, setStats] = useState({
    totalReceived: 0,
    totalReplied: 0,
    lastActiveAt: null as string | null,
  });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Fetch initial status from server
  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/telegram/status');
      const data = await res.json();
      if (data) {
        setIsPolling(Boolean(data.isPolling));
        if (data.botInfo) setBotInfo(data.botInfo);
        if (data.businessConnection) setBusinessConnection(data.businessConnection);
        if (data.stats) setStats(data.stats);
        if (data.personaConfig) {
          setPersona((prev) => ({ ...prev, ...data.personaConfig }));
        }
      }
    } catch (err) {
      console.error('Status olishda xato:', err);
    }
  };

  const fetchLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const res = await fetch('/api/telegram/logs');
      const data = await res.json();
      if (data && Array.isArray(data.logs)) {
        setLogs(data.logs);
      }
      if (data?.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Loglarni olishda xato:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    // Initialize Telegram WebApp SDK if opened inside Telegram
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
    }

    fetchStatus();
    fetchLogs();

    // Poll logs every 5 seconds if live telegram polling is on
    const interval = setInterval(() => {
      fetchLogs();
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  const handleSavePersona = async () => {
    setIsSaving(true);
    try {
      await fetch('/api/persona/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(persona),
      });
    } catch (err) {
      console.error('Saqlashda xato:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleVerifyBot = async (token: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/telegram/verify-bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken: token }),
      });
      const data = await res.json();
      if (data.ok && data.bot) {
        setBotInfo(data.bot);
        setBotToken(token);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Tekshirishda xato:', err);
      return false;
    }
  };

  const handleTogglePolling = async (enable: boolean) => {
    try {
      const res = await fetch('/api/telegram/toggle-polling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enable, botToken }),
      });
      const data = await res.json();
      if (data.ok) {
        setIsPolling(Boolean(data.isPolling));
        if (data.bot) setBotInfo(data.bot);
      }
    } catch (err) {
      console.error('Polling toggle xatosi:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isPolling={isPolling}
        botUsername={botInfo?.username}
        hasBusinessConnection={Boolean(businessConnection)}
      />

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'simulator' && (
          <SimulatorTab
            persona={persona}
            onOpenStyleTab={() => setActiveTab('style')}
            onOpenKnowledgeTab={() => setActiveTab('knowledge')}
            onUpdatePersona={setPersona}
            onSaveToServer={handleSavePersona}
          />
        )}

        {activeTab === 'reconciliation' && (
          <ReconciliationTab />
        )}

        {activeTab === 'media' && (
          <MediaStudioTab
            ownerChatId={businessConnection?.user_chat_id || 5275538732}
            botUsername={botInfo?.username}
          />
        )}

        {activeTab === 'history' && (
          <ChatHistoryTab ownerName={persona.ownerName} />
        )}

        {activeTab === 'style' && (
          <StyleDnaTab
            persona={persona}
            onUpdatePersona={setPersona}
            onSaveToServer={handleSavePersona}
            isSaving={isSaving}
          />
        )}

        {activeTab === 'knowledge' && (
          <KnowledgeBaseTab
            persona={persona}
            onUpdatePersona={setPersona}
            onSaveToServer={handleSavePersona}
            isSaving={isSaving}
          />
        )}

        {activeTab === 'telegram' && (
          <TelegramConnectTab
            botToken={botToken}
            setBotToken={setBotToken}
            botInfo={botInfo}
            businessConnection={businessConnection}
            isPolling={isPolling}
            onVerifyBot={handleVerifyBot}
            onTogglePolling={handleTogglePolling}
            stats={stats}
          />
        )}

        {activeTab === 'logs' && (
          <LogsTab
            logs={logs}
            onRefreshLogs={fetchLogs}
            isLoading={isLoadingLogs}
          />
        )}
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>TwinBot AI · Shaxsiy Telegram AI Yordamchi Tizimi</span>
          <span className="font-mono text-[11px] text-slate-500">Gemini 3.8 Flash Engine · Telegram Bot API</span>
        </div>
      </footer>
    </div>
  );
}
