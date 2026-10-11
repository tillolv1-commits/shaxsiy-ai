import React, { useState } from 'react';
import { MessageSquare, Search, Filter, RefreshCw, Send, CheckCircle2, Bot, AlertCircle } from 'lucide-react';
import { LogEntry } from '../types';

interface LogsTabProps {
  logs: LogEntry[];
  onRefreshLogs: () => Promise<void>;
  isLoading: boolean;
}

export const LogsTab: React.FC<LogsTabProps> = ({
  logs,
  onRefreshLogs,
  isLoading,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSource, setFilterSource] = useState<'all' | 'telegram_business' | 'telegram_live' | 'simulator'>('all');

  const filteredLogs = logs.filter((log) => {
    const matchesSource = filterSource === 'all' || log.source === filterSource;
    const matchesSearch =
      log.senderName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.incomingText.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.replyText.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSource && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Bar with Filter & Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-sky-400" />
            Kiruvchi va Javob Berilgan Xabarlar Jurnali
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Telegram Business (lichka), bot va simulyatordan o'tgan barcha muloqotlar tarixi ({logs.length} ta xabar)
          </p>
        </div>

        <button
          onClick={onRefreshLogs}
          disabled={isLoading}
          className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Jurnalni Yangilash
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Xabarlar, ism yoki javoblardan qidirish..."
            className="w-full text-xs bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
          />
        </div>

        {/* Source Segmented Control */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto scrollbar-none">
          <button
            onClick={() => setFilterSource('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              filterSource === 'all'
                ? 'bg-slate-800 text-sky-400 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Barchasi ({logs.length})
          </button>
          <button
            onClick={() => setFilterSource('telegram_business')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              filterSource === 'telegram_business'
                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Lichka (Business) ({logs.filter((l) => l.source === 'telegram_business').length})
          </button>
          <button
            onClick={() => setFilterSource('telegram_live')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              filterSource === 'telegram_live'
                ? 'bg-slate-800 text-sky-400 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Bot Chat ({logs.filter((l) => l.source === 'telegram_live').length})
          </button>
          <button
            onClick={() => setFilterSource('simulator')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              filterSource === 'simulator'
                ? 'bg-slate-800 text-sky-400 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Simulyator ({logs.filter((l) => l.source === 'simulator').length})
          </button>
        </div>
      </div>

      {/* Logs Table / Card List */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-md overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            Birorta ham xabar topilmadi.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {filteredLogs.map((log) => (
              <div key={log.id} className="p-5 hover:bg-slate-850/50 transition-colors space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white">{log.senderName}</span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      (ID: {String(log.senderId).slice(0, 10)})
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                        log.source === 'telegram_business'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : log.source === 'telegram_live'
                          ? 'bg-sky-950 text-sky-400 border border-sky-800'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {log.source === 'telegram_business'
                        ? 'Telegram Lichka (Business)'
                        : log.source === 'telegram_live'
                        ? 'Telegram Bot'
                        : 'Simulyator'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono tabular-nums">
                    <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    {log.status === 'failed' ? (
                      <span className="text-rose-400 flex items-center gap-1 font-sans font-medium" title={log.error}>
                        <AlertCircle className="h-3 w-3" /> Yuborilmadi {log.error ? `(${log.error})` : ''}
                      </span>
                    ) : (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Yuborildi
                      </span>
                    )}
                  </div>
                </div>

                {log.status === 'failed' && (
                  <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-rose-200">Telegram Business ruxsati tekshirilsin:</p>
                      <p className="text-[11px] text-rose-300/90 mt-0.5">
                        Telegram ilovangizda: <b>Sozlamalar &rarr; Telegram Business &rarr; Chat-botlar &rarr; @Rahmatulloh_Airobot</b> ga kiring va <b>"Javob berishga ruxsat" (Разрешить отвечать / Can reply)</b> tugmachasi yoqilganligiga ishonch hosil qiling.
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* Incoming */}
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Kiruvchi Savol:</span>
                    <p className="text-slate-200">{log.incomingText}</p>
                  </div>

                  {/* Outgoing AI reply */}
                  <div className="p-3 rounded-xl bg-sky-950/30 border border-sky-800/40 space-y-1">
                    <span className="text-[10px] text-sky-400 uppercase font-semibold flex items-center gap-1">
                      <Bot className="h-3 w-3" /> Sizning Uslubingizdagi AI Javob:
                    </span>
                    <p className="text-sky-100">{log.replyText}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
