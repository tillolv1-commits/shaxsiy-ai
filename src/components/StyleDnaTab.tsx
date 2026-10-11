import React, { useState } from 'react';
import { Sparkles, Wand2, Plus, X, Check, Save, MessageSquareText, Layers, RefreshCw } from 'lucide-react';
import { PersonaConfig, StyleAnalysisResult } from '../types';

interface StyleDnaTabProps {
  persona: PersonaConfig;
  onUpdatePersona: (newConfig: PersonaConfig) => void;
  onSaveToServer: () => Promise<void>;
  isSaving: boolean;
}

export const StyleDnaTab: React.FC<StyleDnaTabProps> = ({
  persona,
  onUpdatePersona,
  onSaveToServer,
  isSaving,
}) => {
  const [sampleChatInput, setSampleChatInput] = useState(
    `Azizbek: Salom Tilloxon! Yaxshimisan, bugun ko'rishamizmi?
Men: Salom Azizbek! Rahmat, o'zing yaxshimisan? Bugun kechga tomon bo'shiman, 18:00 larda tel qil, gaplashamiz 👍
Azizbek: Bo'ldi bopti, gaplashamiz.
Men: Gap yo'q, salomat bo'l!`
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<StyleAnalysisResult | null>(null);
  const [newSlangInput, setNewSlangInput] = useState('');
  const [newSampleInput, setNewSampleInput] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  const handleAnalyzeChat = async () => {
    if (!sampleChatInput.trim() || sampleChatInput.trim().length < 15) {
      alert('Iltimos, tahlil qilish uchun o\'zingizning bir nechta xabarlaringizni kiriting.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const res = await fetch('/api/gemini/analyze-style', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sampleText: sampleChatInput }),
      });

      const data = await res.json();
      if (data.analysis) {
        setAnalysisResult(data.analysis);
      }
    } catch (err) {
      console.error('Tahlil xatosi:', err);
      alert('Xatolik yuz berdi. Iltimos qayta urinib ko\'ring.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplyAnalysis = () => {
    if (!analysisResult) return;

    const updated: PersonaConfig = {
      ...persona,
      tone: analysisResult.detectedTone || persona.tone,
      greetingPhrase: analysisResult.typicalGreetings?.[0] || persona.greetingPhrase,
      farewellPhrase: analysisResult.typicalFarewells?.[0] || persona.farewellPhrase,
      emojiUsage: analysisResult.emojiStyle || persona.emojiUsage,
      sentenceLength: analysisResult.averageSentenceLength || persona.sentenceLength,
      slangWords: Array.from(
        new Set([...persona.slangWords, ...(analysisResult.slangAndFavoriteWords || [])])
      ),
      behaviorRules: Array.from(
        new Set([...persona.behaviorRules, ...(analysisResult.recommendedRules || [])])
      ),
    };

    onUpdatePersona(updated);
    setSaveSuccessMsg('AI aniqlagan barcha uslub qoidalari profilingizga tatbiq etildi!');
    setTimeout(() => setSaveSuccessMsg(''), 4000);
  };

  const addSlangWord = () => {
    const word = newSlangInput.trim();
    if (word && !persona.slangWords.includes(word)) {
      onUpdatePersona({
        ...persona,
        slangWords: [...persona.slangWords, word],
      });
      setNewSlangInput('');
    }
  };

  const removeSlangWord = (word: string) => {
    onUpdatePersona({
      ...persona,
      slangWords: persona.slangWords.filter((w) => w !== word),
    });
  };

  const addSampleMessage = () => {
    const msg = newSampleInput.trim();
    if (msg) {
      onUpdatePersona({
        ...persona,
        sampleMessages: [...persona.sampleMessages, msg],
      });
      setNewSampleInput('');
    }
  };

  const removeSampleMessage = (idx: number) => {
    onUpdatePersona({
      ...persona,
      sampleMessages: persona.sampleMessages.filter((_, i) => i !== idx),
    });
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Hero Intro Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-sky-950/40 border border-slate-800 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <img
            src="/src/assets/images/assistant_avatar_1791436908205.jpg"
            alt="AI Digital Twin"
            referrerPolicy="no-referrer"
            className="h-16 w-16 rounded-2xl object-cover border-2 border-sky-500/40 shadow-lg"
          />
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Sizning Shaxsiy AI Uslubingiz (Digital Twin DNA)
              <span className="text-xs font-normal text-sky-400 bg-sky-950/80 px-2 py-0.5 rounded border border-sky-800">
                Gemini 3.8 Flash
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
              Bu bo'limda sun'iy intellektga aynan sizning yozish ohangingiz, salomlashish tartibingiz,
              ishlatadigan slenglaringiz va xabar uzunligingiz o'rgatiladi.
            </p>
          </div>
        </div>

        <button
          onClick={async () => {
            await onSaveToServer();
            setSaveSuccessMsg('O\'zgarishlar serverga muvaffaqiyatli saqlandi!');
            setTimeout(() => setSaveSuccessMsg(''), 3000);
          }}
          disabled={isSaving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-colors shadow-md disabled:opacity-50 cursor-pointer shrink-0"
        >
          {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          O'zgarishlarni Saqlash
        </button>
      </div>

      {saveSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
          <Check className="h-4 w-4 text-emerald-400" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Grid: 2 Main Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: AI Chat Log Analyzer */}
        <div className="lg:col-span-6 space-y-6">
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-md">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
              <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Wand2 className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Yozishmalardan Uslubni Avtomatik Aniqlash</h3>
                <p className="text-xs text-slate-400">Telegramdagi odatiy xabarlaringizni nusxalab qo'ying</p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-300 font-medium block">
                  Namuna xabarlaringiz (Chat matni):
                </label>
                <span className="text-[11px] text-slate-400">Namunani tanlang:</span>
              </div>

              {/* Quick Preset Chats to Test / Learn */}
              <div className="flex flex-wrap gap-1.5 pb-1">
                {[
                  {
                    title: '🤝 Do\'stona ko\'rishish',
                    text: `Javohir: Salom Rahmatulloh! Qalesan, bugun ko'rishamizmi?
Men: Salom jo'ra! Rahmat, zo'r, o'zing tinchmisan? Bugun kechga 6 larda bo'shiman, qayerda ko'rishamiz?
Javohir: Choyxonaga boraylik.
Men: Bo'ldi, kelishdik, 18:30 da o'sha yerda bo'laman 👍`,
                  },
                  {
                    title: '🏙️ Toshkentcha shahar tili',
                    text: `Sardor: Salom bratan! Qattasiz, vaqt bormi gaplashgani?
Men: Salom Sardor! Rahmat o'rto, yaxshi yuribman. Hozir uydaman, bemalol tel qilaver.
Sardor: Bo'ldi bopti, hozir chiqaman.
Men: Gap yo'q, kutaman!`,
                  },
                  {
                    title: '🍏 Vodiycha ehtiromli',
                    text: `Akmaljon: Assalomu alaykum aka, joningiz omonmi?
Men: Va alaykum assalom Akmaljon! Rahmat, xudoga shukur yaxshi yuribmiz. O'zingiz tinch-omonmisiz, ishlar joyidami?
Akmaljon: Rahmat katta aka, bitta maslahat bor edi.
Men: Xo'p bo'ladi uka, bemalol ayting, eshitaman.`,
                  },
                ].map((preset, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSampleChatInput(preset.text)}
                    className="text-[11px] px-2.5 py-1 rounded-md bg-slate-950 hover:bg-slate-800 text-sky-300 border border-slate-800 hover:border-sky-500/50 transition-colors"
                  >
                    {preset.title}
                  </button>
                ))}
              </div>

              <textarea
                rows={6}
                value={sampleChatInput}
                onChange={(e) => setSampleChatInput(e.target.value)}
                placeholder="Telegramdagi bir nechta xabaringizni bu yerga joylang..."
                className="w-full text-xs font-mono bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-sky-500 leading-relaxed"
              />

              <button
                onClick={handleAnalyzeChat}
                disabled={isAnalyzing}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-white font-medium text-xs border border-slate-700/80 flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin text-sky-400" />
                    <span>Gemini AI tahlil qilmoqda...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 text-sky-400" />
                    <span>Mening Uslubimni Tahlil Qilish (AI Extract)</span>
                  </>
                )}
              </button>
            </div>

            {analysisResult && (
              <div className="mt-6 p-4 rounded-xl bg-slate-950/80 border border-sky-500/30 space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-300">Tahlil natijalari:</span>
                  <span className="text-[11px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                    Muvaffaqiyatli aniqlandi
                  </span>
                </div>

                <div className="text-xs space-y-2 text-slate-300">
                  <p>
                    <span className="text-slate-400">Aniqlangan ohang:</span>{' '}
                    <strong className="text-white">{analysisResult.detectedTone}</strong>
                  </p>
                  <p>
                    <span className="text-slate-400">Salomlashish uslubi:</span>{' '}
                    <span className="text-sky-300">{analysisResult.typicalGreetings.join(', ')}</span>
                  </p>
                  <p>
                    <span className="text-slate-400">Tez-tez ishlatiladigan so'zlar:</span>{' '}
                    <span className="text-amber-300 font-mono text-[11px]">
                      {analysisResult.slangAndFavoriteWords.join(', ')}
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-400 italic bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    "{analysisResult.keyStyleObservations}"
                  </p>
                </div>

                <button
                  onClick={handleApplyAnalysis}
                  className="w-full py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Check className="h-4 w-4" />
                  Ushbu Uslubni Profilga O'rnatish
                </button>
              </div>
            )}
          </div>

          {/* Few-Shot Samples Box */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-md">
            <h3 className="text-sm font-semibold text-white mb-2">
              Namuna Javoblaringiz (Few-shot learning)
            </h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              AI aynan shu jumlalaringiz ohangi va ritmiga qarab javob matnini shakllantiradi.
            </p>

            <div className="space-y-2 mb-4">
              {persona.sampleMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200"
                >
                  <span className="italic truncate pr-2">"{msg}"</span>
                  <button
                    onClick={() => removeSampleMessage(idx)}
                    className="text-slate-500 hover:text-rose-400 p-1"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newSampleInput}
                onChange={(e) => setNewSampleInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addSampleMessage();
                }}
                placeholder="Yangi namuna jumla qo'shing..."
                className="flex-1 text-xs bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
              />
              <button
                onClick={addSampleMessage}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Qo'shish
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Parameters and Slang Customization */}
        <div className="lg:col-span-6 space-y-6">
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-md space-y-5">
            <h3 className="text-sm font-semibold text-white pb-3 border-b border-slate-800">
              Shaxsiyat va Muloqot Parametrlari
            </h3>

            {/* Owner Name & Profession */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Ismingiz (Ega):</label>
                <input
                  type="text"
                  value={persona.ownerName}
                  onChange={(e) => onUpdatePersona({ ...persona, ownerName: e.target.value })}
                  className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Profil / Holat:</label>
                <input
                  type="text"
                  value={persona.profession}
                  onChange={(e) => onUpdatePersona({ ...persona, profession: e.target.value })}
                  className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {/* Tone Selector */}
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">Muloqot Ohangi (Tone):</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { id: 'friendly_informal', label: 'Do\'stona va samimiy (aka/uka)' },
                  { id: 'business_casual', label: 'Ishbilarmon va muloyim' },
                  { id: 'strict_formal', label: 'Jiddiy va rasmiy' },
                  { id: 'humorous', label: 'Yengil va hazilkash' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => onUpdatePersona({ ...persona, tone: t.id })}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      persona.tone === t.id
                        ? 'bg-sky-500/10 border-sky-500 text-sky-300 font-semibold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Regional Slang & Dialect Selector */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-sky-300">
                  O'zbek Shevasi va Mintaqaviy Uslub:
                </label>
                <span className="text-[10px] text-slate-400">1-bosishda qo'llash</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  {
                    id: 'toshkent',
                    label: '🏙️ Toshkentcha',
                    desc: 'o\'rto, bratan, gap yo\'',
                    slangs: ['o\'rto', 'bratan', 'gap yo\'q', 'bo\'pti', 'keldik', 'nima gaplar', 'aytgancha', 'chundim'],
                    greeting: 'Salom! Qalesiz?',
                  },
                  {
                    id: 'vodiy',
                    label: '🍏 Vodiycha',
                    desc: 'akam, tuzumisiz, xo\'p',
                    slangs: ['akam', 'uka', 'tuzumisiz', 'xo\'p bo\'ladi', 'joningiz omonmi', 'rahmat', 'xudo xohlasa'],
                    greeting: 'Assalomu alaykum aka! Yaxshimisiz?',
                  },
                  {
                    id: 'samarqand',
                    label: '🏛️ Samarqandcha',
                    desc: 'aka, bo\'ldi, rahmat',
                    slangs: ['aka', 'gap yo\'q', 'bo\'ldi', 'rahmat katta', 'yaxshi', 'bopti', 'xop'],
                    greeting: 'Salom, tuzukmisiz?',
                  },
                  {
                    id: 'friendly_informal',
                    label: '⚡ Do\'stona',
                    desc: 'jo\'ra, tinchlikmi, bopti',
                    slangs: ['aka', 'uka', 'gap yo\'q', 'bo\'ldi', 'rahmat', 'yaxshi', 'bopti', 'xop', 'aytgancha'],
                    greeting: 'Salom! Rahmat, o\'zing yaxshimisan?',
                  },
                ].map((dial) => (
                  <button
                    key={dial.id}
                    type="button"
                    onClick={() => {
                      onUpdatePersona({
                        ...persona,
                        dialectStyle: dial.id as any,
                        slangWords: Array.from(new Set([...persona.slangWords, ...dial.slangs])),
                        greetingPhrase: dial.greeting,
                      });
                    }}
                    className={`p-2 rounded-lg border text-left transition-all text-xs ${
                      persona.dialectStyle === dial.id
                        ? 'bg-sky-500/20 border-sky-400 text-sky-200 font-semibold'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-semibold truncate">{dial.label}</div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">{dial.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Insoniy Xatti-Harakat (Human Realism & Behavior) */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                Insoniy Xatti-Harakat (Real Human Engine)
              </h4>

              {/* Typing delay slider */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="text-slate-400">Javob berishdan oldin kutish (Insoniy yozish):</span>
                  <span className="text-sky-400 font-mono font-semibold">
                    {persona.humanDelaySeconds ?? 2} soniya
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { sec: 0, label: '0s (Tezkor)' },
                    { sec: 2, label: '2s (Tabiiy)' },
                    { sec: 4, label: '4s (Insondek)' },
                  ].map((item) => (
                    <button
                      key={item.sec}
                      type="button"
                      onClick={() => onUpdatePersona({ ...persona, humanDelaySeconds: item.sec })}
                      className={`py-1.5 px-2 rounded-md border text-xs text-center transition-all ${
                        (persona.humanDelaySeconds ?? 2) === item.sec
                          ? 'bg-sky-500/20 border-sky-400 text-sky-300 font-semibold'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Switches */}
              <div className="space-y-2 pt-2 border-t border-slate-850 text-xs">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-300">
                    Xabarni 2 ta qismga bo'lib yuborish (Multi-bubble)
                  </span>
                  <input
                    type="checkbox"
                    checked={persona.splitMessages !== false}
                    onChange={(e) => onUpdatePersona({ ...persona, splitMessages: e.target.checked })}
                    className="accent-sky-500 h-4 w-4 rounded cursor-pointer"
                  />
                </label>
                <p className="text-[10px] text-slate-500 leading-tight">
                  Salom va javob alohida xabar sifatida ketadi, xuddi Telegramda odam yozgandek.
                </p>

                <label className="flex items-center justify-between cursor-pointer pt-1">
                  <span className="text-slate-300">
                    Toshkent vaqti va kun rejimiga moslashuv (Time awareness)
                  </span>
                  <input
                    type="checkbox"
                    checked={persona.timeAwareness !== false}
                    onChange={(e) => onUpdatePersona({ ...persona, timeAwareness: e.target.checked })}
                    className="accent-sky-500 h-4 w-4 rounded cursor-pointer"
                  />
                </label>
                <p className="text-[10px] text-slate-500 leading-tight">
                  Tunda xabar kelsa "yotgandim", ertalab "xayrli tong", kechki payt uchrashuv kontekstini qo'llaydi.
                </p>

                <label className="flex items-center justify-between cursor-pointer pt-1">
                  <span className="text-slate-300">
                    Karta, SMS kod va shaxsiy sir himoyasi (Anti-scam)
                  </span>
                  <input
                    type="checkbox"
                    checked={persona.antiScamGuard !== false}
                    onChange={(e) => onUpdatePersona({ ...persona, antiScamGuard: e.target.checked })}
                    className="accent-sky-500 h-4 w-4 rounded cursor-pointer"
                  />
                </label>
                <p className="text-[10px] text-slate-500 leading-tight">
                  Parol yoki karta so'ralsa xarakter bilan "Yo'q, nimalar deyapsan o'zi" deb rad etadi.
                </p>
              </div>
            </div>

            {/* Greetings & Farewells */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Boshlang'ich salomlashish:</label>
                <input
                  type="text"
                  value={persona.greetingPhrase}
                  onChange={(e) => onUpdatePersona({ ...persona, greetingPhrase: e.target.value })}
                  className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Xayrlashuv iborasi:</label>
                <input
                  type="text"
                  value={persona.farewellPhrase}
                  onChange={(e) => onUpdatePersona({ ...persona, farewellPhrase: e.target.value })}
                  className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {/* Sentence Length & Emojis */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Xabar uzunligi:</label>
                <select
                  value={persona.sentenceLength}
                  onChange={(e) => onUpdatePersona({ ...persona, sentenceLength: e.target.value })}
                  className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="short_telegram">Qisqa (1-3 gap, tezkor Telegram)</option>
                  <option value="medium">O'rtacha me'yorda</option>
                  <option value="detailed">Kengaytirilgan va batafsil</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Emoji ishlatish me'yori:</label>
                <select
                  value={persona.emojiUsage}
                  onChange={(e) => onUpdatePersona({ ...persona, emojiUsage: e.target.value })}
                  className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="moderate">Me'yorida (👍, 😊, 👋)</option>
                  <option value="rare">Juda kam (faqat kerak bo'lsa)</option>
                  <option value="frequent">Ko'p va yorqin</option>
                  <option value="none">Umuman emojilarsiz</option>
                </select>
              </div>
            </div>

            {/* Slang & Favorite Words Chips */}
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">
                Xarakterli so'zlar va iboralaringiz (Slang):
              </label>
              <div className="flex flex-wrap gap-2 p-3 bg-slate-950 border border-slate-800 rounded-xl min-h-[60px] items-center">
                {persona.slangWords.map((word) => (
                  <span
                    key={word}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-850 text-sky-300 border border-slate-700 text-xs"
                  >
                    <span>{word}</span>
                    <button
                      onClick={() => removeSlangWord(word)}
                      className="text-slate-400 hover:text-rose-400 ml-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex gap-2 mt-2.5">
                <input
                  type="text"
                  value={newSlangInput}
                  onChange={(e) => setNewSlangInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addSlangWord();
                  }}
                  placeholder="So'z qo'shish (masalan: gap yo'q, bopti, xop)..."
                  className="flex-1 text-xs bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
                />
                <button
                  onClick={addSlangWord}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium border border-slate-700 cursor-pointer"
                >
                  Qo'shish
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
