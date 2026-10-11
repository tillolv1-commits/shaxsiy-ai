import React from 'react';
import { Bot, Radio, ShieldCheck, Sparkles } from 'lucide-react';

interface HeaderProps {
  activeTab: 'simulator' | 'style' | 'knowledge' | 'telegram' | 'logs' | 'history' | 'media' | 'reconciliation';
  setActiveTab: (tab: 'simulator' | 'style' | 'knowledge' | 'telegram' | 'logs' | 'history' | 'media' | 'reconciliation') => void;
  isPolling: boolean;
  botUsername?: string;
  hasBusinessConnection?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isPolling,
  botUsername,
  hasBusinessConnection,
}) => {
  const navItems = [
    { id: 'simulator', label: 'Telegram Simulyator' },
    { id: 'reconciliation', label: '❤️ Yarashtirish & Kechirim' },
    { id: 'media', label: '🎨 AI Media (Rasm/Video)' },
    { id: 'history', label: '🧠 Xotira & Tarix' },
    { id: 'style', label: 'Uslub DNKsi' },
    { id: 'knowledge', label: 'Bilimlar' },
    { id: 'telegram', label: 'Telegram Bot' },
    { id: 'logs', label: 'Jurnal' },
  ] as const;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Bot className="h-5 w-5" />
          </div>
          <span className="text-base font-bold tracking-tight text-white whitespace-nowrap">
            TwinBot AI
          </span>
        </div>

        {/* Zone 2: Navigation Links (single-line, clean buttons) */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-800 text-sky-400 font-semibold shadow-xs border border-slate-700/60'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1-2 Primary Actions */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            {isPolling ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="whitespace-nowrap font-mono">
                    {botUsername ? `@${botUsername}` : 'Telegram Faol'}
                  </span>
                </div>
                {hasBusinessConnection && (
                  <span className="hidden lg:inline text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800 font-mono">
                    Lichka Ulandi
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-slate-400">
                <span className="h-2 w-2 rounded-full bg-slate-600"></span>
                <span className="whitespace-nowrap font-mono text-[11px]">Test Rejimida</span>
              </div>
            )}
          </div>

          <button
            onClick={() => setActiveTab('telegram')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap border ${
              isPolling
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-sky-500 text-slate-950 font-bold border-sky-400 hover:bg-sky-400 shadow-sm'
            }`}
          >
            {isPolling ? 'Botni Boshqarish' : 'Botni Ulang'}
          </button>
        </div>
      </div>

      {/* Mobile nav bar */}
      <div className="flex md:hidden overflow-x-auto border-t border-slate-800/80 px-4 py-2 gap-1.5 scrollbar-none">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`px-3 py-1 text-xs rounded-md whitespace-nowrap transition-colors ${
              activeTab === item.id
                ? 'bg-slate-800 text-sky-400 font-medium'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </header>
  );
};
