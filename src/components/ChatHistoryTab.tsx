import React, { useState, useEffect, useRef } from 'react';
import {
  BrainCircuit,
  MessageSquare,
  Search,
  RefreshCw,
  Trash2,
  Plus,
  MapPin,
  Clock,
  User,
  ShieldCheck,
  CheckCheck,
  Navigation,
  ExternalLink,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { ChatSession } from '../types';

interface ChatHistoryTabProps {
  ownerName?: string;
  voiceName?: string;
  voiceProfile?: string;
  speakingPace?: number;
}

export const ChatHistoryTab: React.FC<ChatHistoryTabProps> = ({
  ownerName = 'Rahmatulloh',
  voiceName = 'Puck',
  voiceProfile = 'natural',
  speakingPace = 1.0,
}) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [playingMsgId, setPlayingMsgId] = useState<string | null>(null);
  const chatAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (chatAudioRef.current) {
        chatAudioRef.current.pause();
        chatAudioRef.current = null;
      }
    };
  }, []);

  const handlePlayVoice = async (text: string, msgId: string) => {
    if (playingMsgId === msgId) {
      if (chatAudioRef.current) {
        chatAudioRef.current.pause();
        chatAudioRef.current = null;
      }
      setPlayingMsgId(null);
      return;
    }

    if (chatAudioRef.current) {
      chatAudioRef.current.pause();
      chatAudioRef.current = null;
    }

    setPlayingMsgId(msgId);
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
          voiceName: voiceName || 'Puck',
          pace: speakingPace || 1.0,
          profile: voiceProfile || 'natural',
        }),
      });

      if (!res.ok) throw new Error("Audio yuklab bo'lmadi");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      chatAudioRef.current = audio;

      audio.onended = () => {
        setPlayingMsgId(null);
        URL.revokeObjectURL(url);
      };
      audio.onerror = () => {
        setPlayingMsgId(null);
        URL.revokeObjectURL(url);
      };
      await audio.play();
    } catch (err) {
      console.warn("Audio xatosi:", err);
      setPlayingMsgId(null);
    }
  };

  const fetchSessions = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/chats');
      const data = await res.json();
      if (data && Array.isArray(data.sessions)) {
        setSessions(data.sessions);
        if (data.sessions.length > 0 && !selectedChatId) {
          setSelectedChatId(data.sessions[0].chatId);
        }
      }
    } catch (e) {
      console.error('Chat tarixini olishda xatolik:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const selectedSession = sessions.find((s) => String(s.chatId) === String(selectedChatId));

  const handleClearHistory = async (chatId: string | number) => {
    if (!confirm('Haqiqatan ham ushbu suhbatdosh xotirasi va tarixini tozalamoqchimisiz?')) return;
    try {
      await fetch(`/api/chats/${chatId}/clear`, { method: 'POST' });
      fetchSessions();
    } catch (e) {
      console.error('Tozalashda xato:', e);
    }
  };

  const handleAddMemoryNote = async (chatId: string | number) => {
    if (!newNoteText.trim()) return;
    try {
      await fetch(`/api/chats/${chatId}/add-note`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: newNoteText.trim() }),
      });
      setNewNoteText('');
      setIsAddingNote(false);
      fetchSessions();
    } catch (e) {
      console.error('Eslatma qo\'shishda xato:', e);
    }
  };

  const filteredSessions = sessions.filter(
    (s) =>
      s.senderName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(s.chatId).includes(searchTerm) ||
      s.messages.some((m) => m.text.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-emerald-400" />
            <span>Suhbatlar Tarixi va AI Xotira Markazi</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Bot har bir suhbatdosh bilan bo'lgan muloqotni eslab qoladi va oldingi mavzularga asoslanib javob beradi ({sessions.length} ta do'st/kontakt saqlangan)
          </p>
        </div>

        <button
          onClick={fetchSessions}
          disabled={isLoading}
          className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Xotirani Yangilash
        </button>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (4 cols): Contacts / Chat Sessions List */}
        <div className="lg:col-span-4 flex flex-col h-[700px] bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
          {/* Search Bar */}
          <div className="p-3 bg-slate-850 border-b border-slate-800">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Suhbatdoshlar yoki xabarlardan qidirish..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Sessions List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
            {filteredSessions.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                Suhbatlar topilmadi. Telegram botingiz orqali yoki Simulyatorda xabar yozing.
              </div>
            ) : (
              filteredSessions.map((session) => {
                const isSelected = String(session.chatId) === String(selectedChatId);
                const lastMsg = session.messages[session.messages.length - 1];

                return (
                  <div
                    key={session.chatId}
                    onClick={() => setSelectedChatId(session.chatId)}
                    className={`p-3.5 transition-all cursor-pointer flex flex-col gap-1.5 ${
                      isSelected
                        ? 'bg-slate-800/90 border-l-4 border-l-emerald-400'
                        : 'hover:bg-slate-850/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-white">
                          {session.senderName.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs font-semibold text-white">
                          {session.senderName}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">
                        {session.messages.length} xabar
                      </span>
                    </div>

                    {lastMsg && (
                      <p className="text-[11px] text-slate-400 truncate pl-9">
                        <span className="text-slate-500">{lastMsg.role === 'model' ? `${ownerName}: ` : ''}</span>
                        {lastMsg.hasLocation ? '📍 [Lokatsiya yuborildi]' : lastMsg.text}
                      </p>
                    )}

                    <div className="flex items-center gap-2 pl-9 pt-0.5">
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                          session.source === 'telegram_business'
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                            : session.source === 'telegram_live'
                              ? 'bg-sky-950 text-sky-300 border-sky-800'
                              : 'bg-purple-950 text-purple-300 border-purple-800'
                        }`}
                      >
                        {session.source === 'telegram_business'
                          ? 'Telegram Lichka'
                          : session.source === 'telegram_live'
                            ? 'Telegram Bot'
                            : 'Simulyator'}
                      </span>

                      {session.memoryNotes?.length > 0 && (
                        <span className="text-[9px] text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/40 flex items-center gap-1 font-mono">
                          <BrainCircuit className="h-2.5 w-2.5" />
                          {session.memoryNotes.length} xotira
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column (8 cols): Selected Chat Details, Memory Facts & Full Thread */}
        <div className="lg:col-span-8 flex flex-col h-[700px] bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
          {selectedSession ? (
            <>
              {/* Top Contact Bar */}
              <div className="px-5 py-3.5 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-sm">
                    {selectedSession.senderName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-white">
                        {selectedSession.senderName}
                      </h3>
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                        ID: {selectedSession.chatId}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      <span>Oxirgi faollik: {new Date(selectedSession.lastMessageAt).toLocaleTimeString()}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsAddingNote(!isAddingNote)}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-amber-300 text-xs font-medium rounded-lg border border-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Xotira Qo'shish</span>
                  </button>

                  <button
                    onClick={() => handleClearHistory(selectedSession.chatId)}
                    title="Tarixni tozalash"
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-850 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Memory Notes Card */}
              <div className="bg-slate-950/80 border-b border-slate-800 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
                    <BrainCircuit className="h-3.5 w-3.5" />
                    <span>AI Eslab Qolgan Ma'lumotlar (Memory Notes):</span>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    AI ushbu faktlarni keyingi javoblarida hisobga oladi
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {selectedSession.memoryNotes && selectedSession.memoryNotes.length > 0 ? (
                    selectedSession.memoryNotes.map((note, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-1"
                      >
                        <Sparkles className="h-3 w-3 text-amber-400" />
                        {note}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-500 text-xs italic">
                      Hozircha maxsus eslatmalar yo'q. Suhbat davomida avtomatik qo'shiladi yoki yuqoridagi tugma orqali yozishingiz mumkin.
                    </span>
                  )}
                </div>

                {/* Inline Add Note Form */}
                {isAddingNote && (
                  <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center gap-2">
                    <input
                      type="text"
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      placeholder="Yangi eslatma (masalan: Do'stim Sardor, 18:00 ga ko'rishamiz)..."
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                    />
                    <button
                      onClick={() => handleAddMemoryNote(selectedSession.chatId)}
                      disabled={!newNoteText.trim()}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors cursor-pointer disabled:opacity-40"
                    >
                      Saqlash
                    </button>
                    <button
                      onClick={() => setIsAddingNote(false)}
                      className="px-2 py-1.5 text-slate-400 hover:text-white text-xs"
                    >
                      Bekor
                    </button>
                  </div>
                )}
              </div>

              {/* Message Thread Container */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-radial from-slate-900 to-slate-950">
                {selectedSession.messages.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-xs">
                    Ushbu suhbat tarixi bo'sh.
                  </div>
                ) : (
                  selectedSession.messages.map((msg) => {
                    const isMe = msg.role === 'model';
                    const bubbles = isMe && msg.text.includes(' ||| ')
                      ? msg.text.split(' ||| ').map((p) => p.trim()).filter(Boolean)
                      : [msg.text];

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}
                      >
                        <div className="text-[11px] text-slate-400 px-1 font-medium">
                          {isMe ? `${ownerName} (AI)` : selectedSession.senderName}
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

                          {/* Listen button for AI responses */}
                          {isMe && (
                            <div className="flex items-center justify-end gap-1 px-1">
                              <button
                                onClick={() => handlePlayVoice(msg.text, msg.id)}
                                className="text-[11px] text-slate-400 hover:text-sky-300 flex items-center gap-1 transition-colors py-0.5 px-2 rounded hover:bg-slate-800/80 cursor-pointer"
                                title="O'zbekcha ovozda eshitish"
                              >
                                {playingMsgId === msg.id ? (
                                  <>
                                    <VolumeX className="h-3.5 w-3.5 text-rose-400" />
                                    <span className="text-rose-400">To'xtatish</span>
                                  </>
                                ) : (
                                  <>
                                    <Volume2 className="h-3.5 w-3.5" />
                                    <span>Ovozli eshitish</span>
                                  </>
                                )}
                              </button>
                            </div>
                          )}

                          {/* Location Card if present */}
                          {(msg.hasLocation || msg.locationData) && (
                            <div className="mt-2 rounded-2xl overflow-hidden bg-slate-900 border border-sky-500/40 shadow-xl text-left">
                              <div className="relative h-24 bg-gradient-to-tr from-sky-950 via-slate-800 to-emerald-950 flex flex-col items-center justify-center p-3 text-center border-b border-slate-800">
                                <div className="h-8 w-8 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center shadow-lg">
                                  <MapPin className="h-4 w-4" />
                                </div>
                                <span className="text-xs font-semibold text-white mt-1">
                                  {msg.locationData?.venueTitle || 'Toshkent, Chilonzor'}
                                </span>
                                <span className="text-[10px] font-mono text-slate-400">
                                  {msg.locationData?.latitude || 41.2995}° N, {msg.locationData?.longitude || 69.2401}° E
                                </span>
                              </div>

                              <div className="p-3 bg-slate-950/80 flex items-center justify-between text-xs">
                                <span className="text-slate-400 text-[11px]">
                                  {msg.locationData?.address || 'Chilonzor tumani, Toshkent'}
                                </span>
                                <a
                                  href={`https://maps.google.com/?q=${msg.locationData?.latitude || 41.2995},${msg.locationData?.longitude || 69.2401}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300 font-medium"
                                >
                                  <span>Xarita</span>
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 text-xs">
              <BrainCircuit className="h-10 w-10 text-slate-700 mb-2" />
              <span>Suhbatdoshni tanlang</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
