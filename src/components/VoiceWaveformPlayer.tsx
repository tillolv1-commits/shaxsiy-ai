import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Play,
  Pause,
  Loader2,
  Mic,
  Volume2,
  ChevronDown,
  ChevronUp,
  Download,
  RotateCcw,
  Sparkles,
  CheckCheck,
} from 'lucide-react';

interface VoiceWaveformPlayerProps {
  text: string;
  audioUrl?: string;
  senderName?: string;
  timestamp?: string;
  isModel?: boolean;
  voiceName?: string;
  voiceProfile?: 'natural' | 'friendly' | 'professional' | string;
  speakingPace?: number;
  initialExpanded?: boolean;
  onPlayed?: () => void;
}

// Generate realistic pseudo-random but deterministic voice waveform bar heights based on text
function generateWaveformBars(text: string, count = 36): number[] {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }

  const bars: number[] = [];
  for (let i = 0; i < count; i++) {
    const sin1 = Math.sin((i / count) * Math.PI);
    const pseudoRand = Math.abs(Math.sin(hash * 0.01 + i * 1.37) * 0.7 + Math.cos(i * 0.8) * 0.3);
    // Envelope: speech naturally starts lower, peaks in words, has natural pauses
    const envelope = Math.max(0.2, sin1 * 0.95);
    const height = Math.min(100, Math.max(18, Math.round(envelope * pseudoRand * 100)));
    bars.push(height);
  }
  return bars;
}

export const VoiceWaveformPlayer: React.FC<VoiceWaveformPlayerProps> = ({
  text,
  audioUrl: initialAudioUrl,
  senderName = 'Rahmatulloh',
  timestamp,
  isModel = true,
  voiceName = 'Puck',
  voiceProfile = 'natural',
  speakingPace = 1.0,
  initialExpanded = false,
  onPlayed,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [showTranscript, setShowTranscript] = useState(initialExpanded);
  const [audioUrl, setAudioUrl] = useState<string | null>(initialAudioUrl || null);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const bars = useMemo(() => generateWaveformBars(text, 36), [text]);

  // Clean text by stripping location/media tags for speech and display
  const cleanText = useMemo(() => {
    return text
      .replace(/\[LOCATION\]/gi, '')
      .replace(/\[IMAGE_PROMPT:[^\]]+\]/gi, '')
      .replace(/\[VIDEO_PROMPT:[^\]]+\]/gi, '')
      .replace(/\|\|\|/g, '. ')
      .trim();
  }, [text]);

  // Estimated duration if audio metadata not yet loaded (avg 130 words per minute)
  const estimatedDuration = useMemo(() => {
    const wordCount = Math.max(1, cleanText.split(/\s+/).length);
    const seconds = Math.max(2, Math.round((wordCount / (135 * (speakingPace || 1.0))) * 60));
    return seconds;
  }, [cleanText, speakingPace]);

  // Cleanup audio object on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const fetchAudioIfNeeded = async (): Promise<string> => {
    if (audioUrl) return audioUrl;

    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/voice/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: cleanText,
          pace: speakingPace,
          profile: voiceProfile,
          voiceName,
        }),
      });

      if (!res.ok) {
        throw new Error("Ovoz serveridan yuklab bo'lmadi");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      return url;
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlay = async () => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    try {
      let currentUrl = audioUrl;
      if (!currentUrl) {
        currentUrl = await fetchAudioIfNeeded();
      }

      if (!audioRef.current || audioRef.current.src !== currentUrl) {
        const audio = new Audio(currentUrl);
        audioRef.current = audio;

        audio.playbackRate = playbackSpeed;

        audio.ontimeupdate = () => {
          setCurrentTime(audio.currentTime);
        };

        audio.onloadedmetadata = () => {
          if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
            setDuration(audio.duration);
          }
        };

        audio.onended = () => {
          setIsPlaying(false);
          setCurrentTime(0);
        };

        audio.onerror = () => {
          console.warn("Audio playback error, speech synthesis fallback");
          setIsPlaying(false);
          playWithWebSpeechFallback();
        };
      }

      audioRef.current.playbackRate = playbackSpeed;
      await audioRef.current.play();
      setIsPlaying(true);
      if (onPlayed) onPlayed();
    } catch (err: unknown) {
      console.warn("HTML5 audio failed, fallback to Web Speech:", err);
      playWithWebSpeechFallback();
    }
  };

  // Fallback to Web SpeechSynthesis if server audio is blocked
  const playWithWebSpeechFallback = () => {
    if (!('speechSynthesis' in window)) {
      setError("Ovozni eshittirish imkoni bo'lmadi");
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'uz-UZ';
    utterance.rate = playbackSpeed * (speakingPace || 1.0);

    const startTime = Date.now();
    const estSec = estimatedDuration;

    setIsPlaying(true);

    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      setCurrentTime(Math.min(elapsed, estSec));
      if (!window.speechSynthesis.speaking) {
        clearInterval(interval);
        setIsPlaying(false);
        setCurrentTime(0);
      }
    }, 100);

    utterance.onend = () => {
      clearInterval(interval);
      setIsPlaying(false);
      setCurrentTime(0);
    };

    utterance.onerror = () => {
      clearInterval(interval);
      setIsPlaying(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const handleSeek = (index: number) => {
    const totalSec = duration > 0 ? duration : estimatedDuration;
    const seekTime = (index / bars.length) * totalSec;
    setCurrentTime(seekTime);

    if (audioRef.current) {
      audioRef.current.currentTime = seekTime;
    }
  };

  const handleCycleSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    const speeds = [1.0, 1.25, 1.5, 2.0];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    const newSpeed = speeds[nextIdx];
    setPlaybackSpeed(newSpeed);

    if (audioRef.current) {
      audioRef.current.playbackRate = newSpeed;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const activeDuration = duration > 0 ? duration : estimatedDuration;
  const progressRatio = activeDuration > 0 ? Math.min(1, currentTime / activeDuration) : 0;
  const activeBarIndex = Math.floor(progressRatio * bars.length);

  return (
    <div className="w-full max-w-md select-none">
      {/* Outer Voice Message Bubble */}
      <div
        className={`rounded-2xl p-3.5 shadow-lg border transition-all duration-300 relative overflow-hidden ${
          isModel
            ? 'bg-gradient-to-br from-sky-900/90 via-slate-900 to-sky-950/90 border-sky-500/40 text-white rounded-br-xs'
            : 'bg-gradient-to-br from-slate-850 via-slate-900 to-slate-950 border-slate-700/70 text-slate-100 rounded-bl-xs'
        }`}
      >
        {/* Subtle Ambient Wave Background Glow when Playing */}
        {isPlaying && (
          <div className="absolute inset-0 bg-gradient-to-r from-sky-500/10 via-emerald-500/15 to-transparent pointer-events-none animate-pulse" />
        )}

        {/* Top Header Badge */}
        <div className="flex items-center justify-between mb-2 text-[10px] font-medium tracking-wide">
          <div className="flex items-center gap-1.5 text-sky-300 font-mono">
            <span className="relative flex h-2 w-2">
              {isPlaying ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-400" />
              )}
            </span>
            <Mic className="h-3 w-3 text-sky-400" />
            <span>{isModel ? `${senderName} (Ovozli xabar)` : 'Ovozli xabar'}</span>
          </div>

          <div className="flex items-center gap-1 text-slate-400 font-mono text-[9px]">
            <span className="px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700/60 text-slate-300">
              {voiceProfile === 'friendly' ? 'Do\'stona' : voiceProfile === 'professional' ? 'Rasmiy' : 'Tabiiy'}
            </span>
            {speakingPace !== 1.0 && (
              <span className="px-1 py-0.5 rounded bg-slate-800/80 text-sky-300">
                {speakingPace}x
              </span>
            )}
          </div>
        </div>

        {/* Core Player Control Row: Play Button + Animated Waveform */}
        <div className="flex items-center gap-3 relative z-10">
          {/* Play / Pause Circular Button */}
          <button
            onClick={togglePlay}
            disabled={isLoading}
            className={`h-11 w-11 rounded-full flex items-center justify-center transition-all transform active:scale-95 shadow-md shrink-0 cursor-pointer ${
              isPlaying
                ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/30 ring-2 ring-emerald-400/50'
                : 'bg-sky-500 hover:bg-sky-400 text-white shadow-sky-500/20'
            }`}
            title={isPlaying ? "To'xtatish" : "Ovozli xabarni tinglash"}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : isPlaying ? (
              <Pause className="h-5 w-5 fill-current" />
            ) : (
              <Play className="h-5 w-5 fill-current ml-0.5" />
            )}
          </button>

          {/* Interactive Dynamic Waveform Bars */}
          <div className="flex-1 flex flex-col justify-center">
            <div
              className="h-10 flex items-center gap-[2.5px] cursor-pointer group py-1"
              title="Ixtiyoriy nuqtaga o'tish uchun bosing"
            >
              {bars.map((barHeight, idx) => {
                const isPassed = idx <= activeBarIndex;
                const isCurrent = idx === activeBarIndex && isPlaying;

                // When playing, add living micro-oscillation to bars
                const dynamicScale = isPlaying
                  ? Math.sin(idx * 0.5 + currentTime * 8) * 0.25 + 1
                  : 1;

                const heightPct = Math.min(100, Math.max(15, barHeight * dynamicScale));

                return (
                  <div
                    key={idx}
                    onClick={() => handleSeek(idx)}
                    className="flex-1 h-full flex items-center justify-center py-0.5 group-hover:opacity-90 transition-opacity"
                  >
                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full rounded-full transition-all duration-100 ${
                        isCurrent
                          ? 'bg-emerald-400 shadow-sm shadow-emerald-400/60 scale-y-110'
                          : isPassed
                          ? 'bg-gradient-to-t from-sky-400 to-emerald-400'
                          : 'bg-slate-700/70 hover:bg-slate-600'
                      }`}
                    />
                  </div>
                );
              })}
            </div>

            {/* Time Indicators & Speed Toggle */}
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-0.5">
              <span>
                {formatTime(currentTime)}
                <span className="text-slate-500 mx-1">/</span>
                <span className="text-slate-300">{formatTime(activeDuration)}</span>
              </span>

              <div className="flex items-center gap-1.5">
                {/* Speed toggle pill */}
                <button
                  onClick={handleCycleSpeed}
                  className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded-md bg-slate-800/90 hover:bg-slate-700 text-sky-300 hover:text-sky-200 border border-slate-700/80 transition-colors cursor-pointer"
                  title="Ijro tezligini o'zgartirish"
                >
                  {playbackSpeed}x
                </button>

                {/* Direct audio download if available */}
                {audioUrl && (
                  <a
                    href={audioUrl}
                    download={`ovoz-${Date.now()}.ogg`}
                    className="p-1 text-slate-400 hover:text-sky-300 transition-colors"
                    title="Ovozli faylni yuklab olish"
                  >
                    <Download className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Expandable Message Transcript */}
        <div className="mt-2.5 pt-2 border-t border-sky-500/20 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowTranscript(!showTranscript)}
              className="text-[11px] text-sky-300/80 hover:text-sky-200 flex items-center gap-1 font-medium transition-colors cursor-pointer"
            >
              <span>{showTranscript ? "Matnni yashirish" : "Matnni ko'rish"}</span>
              {showTranscript ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>

            {timestamp && (
              <div className="flex items-center gap-1 text-[10px] text-sky-200/60 font-mono">
                <span>{timestamp}</span>
                {isModel && <CheckCheck className="h-3 w-3 text-sky-300 inline" />}
              </div>
            )}
          </div>

          {showTranscript && (
            <div className="mt-1 p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-200 leading-relaxed font-sans animate-in fade-in slide-in-from-top-1 duration-200">
              <p className="whitespace-pre-wrap">{cleanText}</p>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-1 text-[10px] text-rose-400 font-mono text-center">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};
