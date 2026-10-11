import React, { useState } from 'react';
import { Database, Plus, Trash2, ShieldCheck, Phone, Save, Check, RefreshCw } from 'lucide-react';
import { PersonaConfig, KnowledgeItem } from '../types';

interface KnowledgeBaseTabProps {
  persona: PersonaConfig;
  onUpdatePersona: (newConfig: PersonaConfig) => void;
  onSaveToServer: () => Promise<void>;
  isSaving: boolean;
}

export const KnowledgeBaseTab: React.FC<KnowledgeBaseTabProps> = ({
  persona,
  onUpdatePersona,
  onSaveToServer,
  isSaving,
}) => {
  const [newTopic, setNewTopic] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [newRule, setNewRule] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  const addKnowledgeItem = () => {
    if (!newTopic.trim() || !newAnswer.trim()) {
      alert('Iltimos, mavzu va javob ma\'lumotlarini to\'ldiring.');
      return;
    }

    const newItem: KnowledgeItem = {
      id: 'kb-' + Date.now(),
      questionOrTopic: newTopic.trim(),
      answer: newAnswer.trim(),
    };

    onUpdatePersona({
      ...persona,
      knowledgeBase: [...persona.knowledgeBase, newItem],
    });

    setNewTopic('');
    setNewAnswer('');
  };

  const removeKnowledgeItem = (id: string) => {
    onUpdatePersona({
      ...persona,
      knowledgeBase: persona.knowledgeBase.filter((k) => k.id !== id),
    });
  };

  const addRule = () => {
    if (!newRule.trim()) return;
    onUpdatePersona({
      ...persona,
      behaviorRules: [...persona.behaviorRules, newRule.trim()],
    });
    setNewRule('');
  };

  const removeRule = (idx: number) => {
    onUpdatePersona({
      ...persona,
      behaviorRules: persona.behaviorRules.filter((_, i) => i !== idx),
    });
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Top Banner */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Database className="h-5 w-5 text-sky-400" />
            Shaxsiy Bilimlar Bazasi va Xulq-atvor Qoidalari
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
            Telegramda odamlar narxlar, bo'sh vaqtingiz yoki xizmatlaringiz haqida so'raganda,
            AI bu yerdagi aniq ma'lumotlarga tayangan holda sizning nomingizdan to'g'ri javob beradi.
          </p>
        </div>

        <button
          onClick={async () => {
            await onSaveToServer();
            setSaveSuccessMsg('Bilimlar bazasi saqlandi!');
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Knowledge Base Items (FAQ) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-md">
            <h3 className="text-sm font-semibold text-white mb-4">
              Mavjud Faktlar va Javoblar Jadvali ({persona.knowledgeBase.length})
            </h3>

            <div className="space-y-3 mb-6">
              {persona.knowledgeBase.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="p-4 rounded-xl bg-slate-950 border border-slate-800 relative group transition-colors hover:border-slate-700"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-sky-300 flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-sky-400"></span>
                        {item.questionOrTopic}
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed pr-6">{item.answer}</p>
                    </div>

                    <button
                      onClick={() => removeKnowledgeItem(item.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                      title="O'chirish"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Training Templates */}
            <div className="mb-6 p-4 rounded-xl bg-sky-950/30 border border-sky-800/40 space-y-2.5">
              <div className="text-xs font-semibold text-sky-300 flex items-center justify-between">
                <span>⚡ Tayyor o'qitish namunalari (1 marta bosish orqali qo'shish):</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { topic: 'Uchrashuv va ko\'rishish', answer: 'Bugun kechki payt 6-7 larda yoki ertaga ko\'rishsak bo\'ladi, qayerda uchrashishni kelishamiz.' },
                  { topic: 'Qayerdasiz (Joylashuv)', answer: 'Uydaman yoki shahardaman, tinchlikmi biror gap bormidi?' },
                  { topic: 'Ishlar va yangiliklar', answer: 'Xudoga shukur, ishlar joyida bir maromda. O\'zingda nimalar yangilik?' },
                  { topic: 'Qarz so\'rashganda', answer: 'Hozir imkoniyatim yo\'q edi aka/uka, xafa bo\'lmaysiz.' },
                ].map((preset, pIdx) => (
                  <button
                    key={pIdx}
                    onClick={() => {
                      if (!persona.knowledgeBase.some(k => k.questionOrTopic === preset.topic)) {
                        onUpdatePersona({
                          ...persona,
                          knowledgeBase: [
                            ...persona.knowledgeBase,
                            { id: 'kb-' + Date.now() + '-' + pIdx, questionOrTopic: preset.topic, answer: preset.answer }
                          ]
                        });
                      }
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-sky-900/50 hover:bg-sky-800/60 text-sky-200 border border-sky-700/50 text-[11px] transition-colors cursor-pointer text-left"
                  >
                    + {preset.topic}
                  </button>
                ))}
              </div>
            </div>

            {/* Add New Knowledge Item */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
              <h4 className="text-xs font-semibold text-slate-200">Yangi Fakt yoki Mavzu Qo'shish:</h4>
              <input
                type="text"
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                placeholder="Savol yoki mavzu (masalan: Loyiha narxlari, Ish vaqti)..."
                className="w-full text-xs bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
              />
              <textarea
                rows={3}
                value={newAnswer}
                onChange={(e) => setNewAnswer(e.target.value)}
                placeholder="Buning bo'yicha aniq ma'lumot (masalan: Minimal narx 300$, kechki 18:00 dan keyin bo'shman)..."
                className="w-full text-xs bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
              />
              <button
                onClick={addKnowledgeItem}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Bazaga Qo'shish
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Behavior Safeguards & Rules */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-md space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white">Qat'iy Xulq-atvor Qoidalari</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Bot javob berayotganda hech qachon buzmasligi kerak bo'lgan cheklovlar:
            </p>

            <div className="space-y-2">
              {persona.behaviorRules.map((rule, idx) => (
                <div
                  key={idx}
                  className="flex items-start justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300"
                >
                  <div className="flex items-start gap-2 pr-2">
                    <span className="text-emerald-400 font-bold mt-0.5">•</span>
                    <span>{rule}</span>
                  </div>
                  <button
                    onClick={() => removeRule(idx)}
                    className="text-slate-500 hover:text-rose-400 p-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              <input
                type="text"
                value={newRule}
                onChange={(e) => setNewRule(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addRule();
                }}
                placeholder="Yangi qoida (masalan: Hech kimga pasport ma'lumot berilmasin)..."
                className="flex-1 text-xs bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
              />
              <button
                onClick={addRule}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium border border-slate-700 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Qo'shish
              </button>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-md space-y-3">
            <div className="flex items-center gap-2 text-slate-200">
              <Phone className="h-4 w-4 text-sky-400" />
              <h3 className="text-sm font-semibold text-white">Shoshilinch Bog'lanish Ma'lumoti</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Agar vaziyat juda kechiktirib bo'lmaydigan yoki shoshilinch bo'lsa, AI berishi mumkin bo'lgan kontakt:
            </p>
            <input
              type="text"
              value={persona.emergencyContact}
              onChange={(e) => onUpdatePersona({ ...persona, emergencyContact: e.target.value })}
              placeholder="+998 90 123 45 67 yoki @username"
              className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
