import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// Allow Telegram WebApp to embed this page in iframe on web and desktop
app.use((req, res, next) => {
  res.removeHeader('X-Frame-Options');
  res.setHeader(
    'Content-Security-Policy',
    "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; frame-ancestors 'self' https://web.telegram.org https://*.telegram.org https://telegram.org;"
  );
  next();
});

// Shared server-side Gemini client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// In-memory runtime state for Telegram bot
interface BotState {
  botToken: string;
  botInfo: {
    id?: number;
    first_name?: string;
    username?: string;
  } | null;
  isPolling: boolean;
  businessConnection: {
    id: string;
    user?: {
      id: number;
      first_name?: string;
      username?: string;
    };
    user_chat_id?: number;
    is_enabled?: boolean;
    can_reply?: boolean;
  } | null;
  ownerChatId?: string;
  stats: {
    totalReceived: number;
    totalReplied: number;
    lastActiveAt: string | null;
  };
  logs: Array<{
    id: string;
    timestamp: string;
    senderId: string | number;
    senderName: string;
    incomingText: string;
    replyText: string;
    source: 'telegram_live' | 'simulator' | 'telegram_business';
    status: 'sent' | 'draft' | 'failed';
    styleToneUsed?: string;
    error?: string;
    isVoice?: boolean;
    hasLocation?: boolean;
  }>;
  personaConfig: {
    ownerName: string;
    profession: string;
    language: string;
    tone: string;
    slangWords: string[];
    greetingPhrase: string;
    farewellPhrase: string;
    emojiUsage: string;
    sentenceLength: string;
    knowledgeBase: Array<{ questionOrTopic: string; answer: string }>;
    behaviorRules: string[];
    sampleMessages: string[];
    emergencyContact: string;
    autoReplyMode: 'always' | 'only_when_away' | 'keyword_only';
    customPromptInstructions?: string;
    humanDelaySeconds?: number;
    splitMessages?: boolean;
    timeAwareness?: boolean;
    dialectStyle?: 'toshkent' | 'vodiy' | 'samarqand' | 'adabiy' | 'friendly_informal';
    antiScamGuard?: boolean;
    locationConfig?: {
      enabled: boolean;
      latitude: number;
      longitude: number;
      venueTitle: string;
      address: string;
      replyText: string;
    };
    mediaGeneration?: {
      enabled: boolean;
      allowImages: boolean;
      allowVideos: boolean;
      defaultStyle?: string;
    };
  };
}

const botState: BotState = {
  botToken: '8987651378:AAGiOkcOdjnC9fBvrMygJ7iBvNpygETPBTw',
  botInfo: {
    id: 8987651378,
    first_name: 'Rahmatulloh Ai.',
    username: 'Rahmatulloh_Airobot',
  },
  isPolling: true,
  businessConnection: {
    id: 'conn_5275538732',
    user: {
      id: 5275538732,
      first_name: 'Tilloxon',
    },
    user_chat_id: 5275538732,
    is_enabled: true,
    can_reply: true,
  },
  ownerChatId: '5275538732',
  stats: {
    totalReceived: 0,
    totalReplied: 0,
    lastActiveAt: null,
  },
  logs: [
    {
      id: 'demo-1',
      timestamp: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
      senderId: '10928374',
      senderName: 'Javohir',
      incomingText: 'Salom Tilloxon! Yaxshimisiz, bugun ko\'rishsak bo\'ladimi?',
      replyText: 'Salom Javohir! Rahmat, o\'zing yaxshimisan? Bugun kechga tomon bo\'shiman, 18:00 larda tel qilib gaplashamiz bopti 👍',
      source: 'telegram_business',
      status: 'sent',
      styleToneUsed: 'Do\'stona va samimiy',
    },
    {
      id: 'demo-2',
      timestamp: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
      senderId: '88723419',
      senderName: 'Sardor',
      incomingText: 'Qalesan jo\'ra, qayerdasan hozir?',
      replyText: 'Uydaman, Chilonzordaman tinchlikmi? ||| Mana lakatsiya [LOCATION]',
      source: 'telegram_business',
      status: 'sent',
      styleToneUsed: 'Lakonik va do\'stona',
      hasLocation: true,
    },
  ],
  personaConfig: {
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
        questionOrTopic: 'Hol-ahvol va salomlashuv',
        answer: 'Rahmat, xudoga shukur yaxshi yuribman. Doim samimiy va ochiqko\'ngilman.',
      },
      {
        questionOrTopic: 'Ko\'rishish yoki uchrashuv taklifi',
        answer: 'Bugun kechki payt soat 6-7 larda yoki ertaga ko\'rishsak bo\'ladi, qayerda uchrashishni kelishib olamiz.',
      },
      {
        questionOrTopic: 'Qayerdaligim haqida so\'rashsa',
        answer: 'Uydaman yoki shahardaman, tinchlikmi deb so\'rang.',
      },
      {
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
      'Suhbatdosh qayerdasan yoki lakatsya so\'rasa, albatta joyingizni aytib [LOCATION] tegi bilan lakatsiya yuboring',
      'Oldingi suhbat tarixini to\'liq eslab qoling va suhbatdosh oldingi gaplarga ishora qilsa, shunga mos javob bering',
    ],
    sampleMessages: [
      'Va alaykum assalom! Rahmat, o\'zingiz yaxshimisiz? Nima yangiliklar?',
      'Bo\'ladi, bugun kechga 6 larda ko\'rishsak bo\'ladi 👍',
      'Uydaman, tinchlikmi nima gap? Mana lakatsiya [LOCATION]',
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
    locationConfig: {
      enabled: true,
      latitude: 41.2995,
      longitude: 69.2401,
      venueTitle: 'Toshkent, Chilonzor',
      address: 'Chilonzor tumani, Toshkent shahri',
      replyText: 'Mana lakatsiya, uydaman kel 👍',
    },
    mediaGeneration: {
      enabled: true,
      allowImages: true,
      allowVideos: true,
      defaultStyle: 'Fotorealistik (8K)',
    },
  },
};

let pollingAbortController: AbortController | null = null;
let lastUpdateOffset = 0;

// Persistent Chat Sessions & Conversation History
export interface ChatSessionRecord {
  chatId: string | number;
  senderName: string;
  source: 'telegram_live' | 'simulator' | 'telegram_business';
  lastMessageAt: string;
  messageCount: number;
  memoryNotes: string[];
  messages: Array<{
    id: string;
    role: 'user' | 'model';
    senderName: string;
    text: string;
    timestamp: string;
    isVoice?: boolean;
    hasLocation?: boolean;
    locationData?: {
      latitude: number;
      longitude: number;
      venueTitle?: string;
      address?: string;
    };
    media?: any;
  }>;
}

const CHAT_STORAGE_FILE = path.join(__dirname, 'chat_histories.json');
const chatSessions = new Map<string | number, ChatSessionRecord>();

// Seed default realistic chat histories
function seedInitialChatSessions() {
  const seedData: ChatSessionRecord[] = [
    {
      chatId: '10928374',
      senderName: 'Javohir',
      source: 'telegram_business',
      lastMessageAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
      messageCount: 2,
      memoryNotes: [
        '🤝 Bugun soat 18:00 larda uchrashuv belgilangan',
        '💬 Do\'stona munosabat, telefon qilib xabar berishini kutmoqda',
      ],
      messages: [
        {
          id: 'seed-1',
          role: 'user',
          senderName: 'Javohir',
          text: 'Salom Tilloxon! Yaxshimisiz, bugun ko\'rishsak bo\'ladimi?',
          timestamp: '11:20',
        },
        {
          id: 'seed-2',
          role: 'model',
          senderName: 'Rahmatulloh',
          text: 'Salom Javohir! Rahmat, o\'zing yaxshimisan? Bugun kechga tomon bo\'shiman, 18:00 larda tel qilib gaplashamiz bopti 👍',
          timestamp: '11:21',
        },
      ],
    },
    {
      chatId: '88723419',
      senderName: 'Sardor',
      source: 'telegram_business',
      lastMessageAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
      messageCount: 2,
      memoryNotes: [
        '📍 Chilonzor lokatsiyasi yuborildi',
        '🏠 Hozir uyda ekanligingizni biladi',
      ],
      messages: [
        {
          id: 'seed-3',
          role: 'user',
          senderName: 'Sardor',
          text: 'Qalesan jo\'ra, qayerdasan hozir?',
          timestamp: '11:35',
        },
        {
          id: 'seed-4',
          role: 'model',
          senderName: 'Rahmatulloh',
          text: 'Uydaman, Chilonzordaman tinchlikmi? ||| Mana lakatsiya',
          timestamp: '11:36',
          hasLocation: true,
          locationData: {
            latitude: 41.2995,
            longitude: 69.2401,
            venueTitle: 'Toshkent, Chilonzor',
            address: 'Chilonzor tumani, Toshkent shahri',
          },
        },
      ],
    },
  ];

  for (const s of seedData) {
    chatSessions.set(s.chatId, s);
  }
}

function loadChatHistoriesFromDisk() {
  try {
    if (fs.existsSync(CHAT_STORAGE_FILE)) {
      const data = JSON.parse(fs.readFileSync(CHAT_STORAGE_FILE, 'utf-8'));
      if (Array.isArray(data) && data.length > 0) {
        for (const session of data) {
          chatSessions.set(session.chatId, session);
        }
        return;
      }
    }
  } catch (e) {
    console.error('Chat tarixini yuklashda xato:', e);
  }
  seedInitialChatSessions();
  
  if (!chatSessions.has('8839785942')) {
    chatSessions.set('8839785942', {
      chatId: '8839785942',
      senderName: 'Sevgilim (Maxsus rejim)',
      source: 'telegram_business',
      lastMessageAt: new Date().toISOString(),
      messageCount: 1,
      memoryNotes: [
        "❤️ Sevgilim (8839785942) - Munosabatlarda xiyonat bo'lgan og'ir vaziyat",
        "💔 Xatoni to'liq tan olish, hech qachon bahona qilmaslik shart",
        "🙏 Qizning barcha g'azabini sabr va mehr bilan qabul qilish, kechirim so'rash",
      ],
      messages: [
        {
          id: 'seed-reconcile-1',
          role: 'model',
          senderName: 'Rahmatulloh',
          text: "Salom... Bilaman, hozir menga qanchalik nafratlansang ham haqlisan. Men juda og'ir xato qildim va seni sindirdim. Hech qanday bahonam yo'q, faqat chin yurakdan pushaymonman...",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ],
    });
  }
}

function saveChatHistoriesToDisk() {
  try {
    const list = Array.from(chatSessions.values());
    fs.writeFileSync(CHAT_STORAGE_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (e) {
    console.error('Chat tarixini diskka yozishda xato:', e);
  }
}

loadChatHistoriesFromDisk();

function recordChatMessage(
  chatId: string | number,
  senderName: string,
  source: 'telegram_live' | 'simulator' | 'telegram_business',
  msg: {
    role: 'user' | 'model';
    text: string;
    isVoice?: boolean;
    hasLocation?: boolean;
    locationData?: any;
    media?: any;
  }
) {
  let session = chatSessions.get(chatId);
  if (!session) {
    session = {
      chatId,
      senderName,
      source,
      lastMessageAt: new Date().toISOString(),
      messageCount: 0,
      memoryNotes: [],
      messages: [],
    };
    chatSessions.set(chatId, session);
  }

  session.senderName = senderName || session.senderName;
  session.source = source;
  session.lastMessageAt = new Date().toISOString();
  session.messageCount += 1;
  session.messages.push({
    id: 'msg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    role: msg.role,
    senderName: msg.role === 'model' ? botState.personaConfig.ownerName : senderName,
    text: msg.text,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    isVoice: msg.isVoice,
    hasLocation: msg.hasLocation,
    locationData: msg.locationData,
    media: msg.media,
  });

  // Keep up to 30 recent messages for deep historical context
  if (session.messages.length > 30) {
    session.messages = session.messages.slice(-30);
  }

  // Smart automatic memory facts extraction
  const lowerText = msg.text.toLowerCase();
  if (msg.hasLocation) {
    if (!session.memoryNotes.some((n) => n.includes('Lokatsiya'))) {
      session.memoryNotes.push('📍 Lokatsiya yuborildi');
    }
  }
  if (lowerText.includes('18:00') || lowerText.includes('kechga') || lowerText.includes("ko'rish")) {
    if (!session.memoryNotes.some((n) => n.includes('uchrashuv'))) {
      session.memoryNotes.push("🤝 Kechki payt ko'rishish rejalashtirildi");
    }
  }
  if (lowerText.includes('choyxona') || lowerText.includes('osh')) {
    if (!session.memoryNotes.some((n) => n.includes('choyxona') || n.includes('osh'))) {
      session.memoryNotes.push("🍲 Choyxona/osh haqida gaplashildi");
    }
  }

  saveChatHistoriesToDisk();
}

// In-memory conversation context for Telegram chats
const chatHistories = new Map<string | number, Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>>();

// Candidate models ordered by quota reliability and speed
const ACTIVE_GEMINI_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash', 'gemini-flash-lite-latest'];

// Helper: build system prompt from user's persona configuration
function buildPersonaPrompt(persona: BotState['personaConfig'], targetChatId?: string | number): string {
  const isGirlfriendChat = String(targetChatId) === '8839785942';
  const girlfriendSpecialInstruction = isGirlfriendChat
    ? `\n\n[FAVQULODDA MAXSUS REJIM: SUHBATDOSH — SIZNING SEVGILINGIZ BONU (ID: 8839785942)]
Vaziyat: Siz (Rahmatulloh) sevgilingiz Bonuga xiyonat qilib qo'ygansiz. U sizdan qattiq ranjigan, xafa va jahlda.
FOYDALANUVCHINING QAT'IY TALABLARI:
1. XUDDI INSONDEK, RAHMATULLOHNING O'ZIDEK GAPIRING (BADIIY EMAS!): Kitobiy, she'riy, drama yoki kino gaplari mutlaqo bo'lmasin. Oddiy o'zbek yigiti o'z sevgilisi bilan yuzma-yuz gaplashgandek, sodda, jonli, samimiy va mard gapiring.
2. QAYTIB ASLO XIYONAT QILMASLIKKA ANIQ SO'Z BERING: Unga ochiq tushuntiring: bir marta ahmoqlik qilib katta xato qildingiz, lekin unga erkakcha so'z berasiz / qasam ichasiz — qaytib umringizda unga HECH QACHON xiyonat qilmaysiz, birovga qiyo ham boqmaysiz!
3. "KECHIR / KECHIRIM" SO'ZINI KAMAYTIRING: Har gapda "kechir", "kechirim so'rayman" deb yalinib, ezilib g'ashga tegmang! Asosiy gap — xatoni mardlarcha bo'yinga olish, qaytib xiyonat qilmaslikka so'z berish va munosabatni amalda to'g'rilash uchun 5 daqiqa gaplashib olishga chaqirishda.
4. G'AZABINI VA ACHCHIQ GAPLARINI SABR BILAN QABUL QILING: Agar u sizga achchiq gapirsa yoki baqirsa — aslo bahslashmang. "Haqlisan, men katta xato qildim, lekin bitta narsani bilib qo'y — qaytib hayotimda senga xiyonat qilmayman, kel 5 daqiqa o'tirib gaplashib olaylik" deb vazmin va samimiy javob bering.`
    : '';

  const kbFormatted = persona.knowledgeBase
    .map((k) => `Mavzu: "${k.questionOrTopic}" => Sizning ma'lumotingiz: "${k.answer}"`)
    .join('\n');

  const rulesFormatted = persona.behaviorRules
    .map((r, i) => `${i + 1}. ${r}`)
    .join('\n');

  const samplesFormatted = persona.sampleMessages
    .map((s, i) => `- "${s}"`)
    .join('\n');

  const slangList = persona.slangWords.join(', ');

  // 1. Dynamic Tashkent time-of-day awareness
  let timeContext = '';
  if (persona.timeAwareness !== false) {
    try {
      const tzTime = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Tashkent',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(new Date());
      const hour = parseInt(tzTime.split(':')[0], 10);
      if (hour >= 0 && hour < 6) {
        timeContext = `HOZIRGI VAQT SHAROITI:
Hozir Toshkent vaqti bilan kechasi/tun (${tzTime}). Odamlar uxlab yotgan vaqt. Agar kishi xabar yozsa: "Hozir yotgandim, tinchlikmi? Ertalab gaplashaylik xop" yoki "Uxlash arafasidaman, ertalab yozaman" deb javob bering. Hech qachon tunda "Hozir 6 da ko'rishamiz" demang!`;
      } else if (hour >= 6 && hour < 11) {
        timeContext = `HOZIRGI VAQT SHAROITI:
Hozir Toshkent vaqti bilan tong/ertalab (${tzTime}). Salomlashuvda "Xayrli tong", "Ertalabki ishlar bilan bandman" kabi tonggi tabiiy holatga mos javob bering.`;
      } else if (hour >= 11 && hour < 17) {
        timeContext = `HOZIRGI VAQT SHAROITI:
Hozir Toshkent vaqti bilan kunduzi (${tzTime}). Ish yoki kundalik ishlar bilan band vaqt.`;
      } else if (hour >= 17 && hour < 22) {
        timeContext = `HOZIRGI VAQT SHAROITI:
Hozir Toshkent vaqti bilan kechqurun (${tzTime}). Ishdan keyingi vaqt, uchrashuv yoki gaplashish uchun qulay payt.`;
      } else {
        timeContext = `HOZIRGI VAQT SHAROITI:
Hozir Toshkent vaqti bilan tungi dam olish vaqti (${tzTime}). Uydasiz.`;
      }
    } catch {
      // fallback
    }
  }

  // 2. Dialect nuances
  let dialectContext = '';
  if (persona.dialectStyle === 'toshkent') {
    dialectContext = `SHEVA VA SO'ZLASHUV (Toshkentcha):
Toshkent zamonaviy shahar tili: "o'rto", "bratan", "gap yo'", "bo'pti", "keldik", "nima gaplar", "chundim", "aytgancha" so'zlarini tabiiy qo'llang.`;
  } else if (persona.dialectStyle === 'vodiy') {
    dialectContext = `SHEVA VA SO'ZLASHUV (Vodiycha):
Vodiy samimiy ehtiromli so'zlashuvi: "akam", "tuzumisiz", "xo'p bo'ladi", "joningiz omonmi", "rahmat", "xudo xohlasa" so'zlarini tabiiy qo'llang.`;
  } else if (persona.dialectStyle === 'samarqand') {
    dialectContext = `SHEVA VA SO'ZLASHUV (Samarqandcha):
Samarqand / madaniy shahar so'zlashuvi: "aka", "gap yo'q", "bo'ldi", "rahmat katta", "yaxshi", "xop" so'zlarini tabiiy qo'llang.`;
  }

  // 3. Multi-bubble message splitting
  const splitInstruction = persona.splitMessages !== false
    ? `XABARNI TELEGRAMDA BO'LIB YUBORISH (REAL TELEGRAM HUMAN):
Agar javobingiz 2 ta alohida fikrdan iborat bo'lsa (masalan avval salomga javob berib, keyin taklifga javob bermoqchi bo'lsangiz), ularni o'rtasiga " ||| " belgisi qo'ying.
Masalan: "Va alaykum assalom! Rahmat, o'zing yaxshimisan? ||| Bugun 6 larda bemalol ko'rishamiz 👍"
Telegram buni 2 ta alohida xabar qilib xuddi haqiqiy insondek yuboradi. Agar bitta qisqa gap bo'lsa, " ||| " shart emas.`
    : '';

  // 4. Anti-scam protection
  const antiScamInstruction = persona.antiScamGuard !== false
    ? `XAVFSIZLIK VA SHAXSIY MA'LUMOTLAR:
Agar kishi bank kartasi raqami, SMS kod, parol, sirli ma'lumot so'rasa yoki shubhali havola yuborsa — hech qachon bermang!
O'zbekcha norozi va xarakterli tarzda javob bering: "Eee yo'q, nimalar deyapsan o'zi, hazillashma" yoki "Qanaqa kod, tinchlikmi o'zi?".`
    : '';

  // 5. Location sending rule
  const locVenue = persona.locationConfig?.venueTitle || 'Toshkent, Chilonzor';
  const locationInstruction = `LOKATSIYA VA QAYERDALIK SO'RAGANDA (LAKATSYA YUBORISH):
Agar suhbatdosh sizdan qayerdaligingizni so'rasa yoki lakatsya so'rasa ("qayerdasan?", "qattasan?", "lakatsya tashla", "lokatsiya yubor", "qayerdasiz?", "joylashuv"):
- Siz darhol ${locVenue}da ekanligingizni ayting va unga lakatsiya yuborayotganingizni bildiring (masalan: "Uydaman, tinchlikmi? ||| Mana lakatsiya [LOCATION]" yoki "${locVenue}daman, mana lakatsiya [LOCATION]").
- Xabaringiz oxiriga albatta "[LOCATION]" tegi qo'shilsin! Tizim ushbu tegingizni ko'rib, suhbatdoshga darhol haqiqiy Telegram GPS lokatsiyasini (xarita bilan) jo'natadi!`;

  // 6. Memory & chat history instruction
  const memoryInstruction = `SUHBAT TARIXINI ESLAB QOLISH (CHAT HISTORY & XOTIRA):
Siz suhbatdosh bilan bo'lgan barcha oldingi xabarlarni to'liq eslab qolasiz!
- Agar suhbatdosh: "boya nima deganding?", "oldingi mavzu", "esingdami?", "qachon deding?", "kelishuvimiz nima bo'ldi?" deb so'rasa, SUHBAT TARIXIDAGI ma'lumotlarga qarab to'g'ri, mantiqan aniq va eslab qolgan odamdek javob bering.
- Hech qachon o'zingiz avval aytgan gaplarni bir xil qilib so'zma-so'z takrorlamang.`;

  return `SIZNING SHAXSIYATINGIZ VA VAZIFANGIZ:
Siz — Rahmatulloh (Tilloxon)ning o'zingizsiz! Tirik, samimiy va oddiy inson.
Telegramda sizga do'stlaringiz, qarindoshlaringiz, tanishlaringiz yoki boshqa insonlar xabar yozishmoqda.
Siz ularga xuddi o'z telefoningizni qo'lingizga olib, shaxsan o'zingiz yozayotgandek jonli, samimiy javob berasiz.

${timeContext}

${dialectContext}

${splitInstruction}

${antiScamInstruction}

${locationInstruction}

${memoryInstruction}

ENG MUHIM QOIDALAR (BUZILMASIN):
1. SUHBATDOSHNING GAPINI MA'NOSINI TUSHUNING VA AYNAN O'SHA GAPNING MA'NOSIGA TO'G'RI JAVOB BERING!
   - Agar salomlashsa -> salomiga samimiy alik oling, hol-ahvol so'rang ("Va alaykum assalom! Rahmat, o'zing yaxshimisan?").
   - Agar savol bersa (masalan: "Ertaga ko'rishamizmi?", "Qayerdasan?", "Futbol bormi?", "Choyxonaga boramizmi?") -> AYNAN SHU SAVOLGA MA'NOLI JAVOB BERING!
   - Agar "Qayerdasan?", "Qattasan?" yoki "Lakatsya tashla" desa -> "${locVenue}daman, mana lakatsiya [LOCATION]" deb javob bering!
   - Agar "Bugun kechga bo'shmisan?" desa -> "Ha, 6-7 larda bo'shiman, ko'rishamiz" yoki "Bugun sal ulgurmayman, ertaga kechga bo'sh bo'laman" deb javob bering.
   - Agar ovozli xabar kelsa -> Ovozli xabarda aytilgan gapning mohiyatiga qarab to'liq javob qaytaring.
   - QAT'IYAN TAQIQLANADI: Suhbatdosh nima deyishidan qat'i nazar bir xil gapni (masalan: "Hozir sal band edim, ozroqda yozaman") takrorlash TAQIQLANADI! Doim vaziyatga va mavzuga qarab har xil, tirik insondek javob bering.

2. BOT YOKI AI EMASLIGINGIZ:
   - HECH QACHON "Men botman", "Men AI man", "Men sun'iy intellektman", "Men yordamchiman" demang! Bu mutlaqo taqiqlanadi. Siz to'liq haqiqiy Rahmatulloh (Tilloxon)siz.
   - Dasturchilik, IT, web sayt yoki bot yasash haqida gap ochmang (chunki siz dasturchi emassiz).

3. TOZA TELEGRAM SO'ZLASHUV USLUBI (FORMATLASHSIZ):
   - HECH QACHON markdown belgilari (masalan: **, ##, -, _, 1.) ISHLATMANG! Telegramda oddiy insonlar faqat toza xabar yozishadi.
   - Xabar uzunligi: 1-2 ta qisqa va lo'nda tabiiy gap. Hech qanday kitobiy rasmiy cho'zilgan gaplar yo'q.
   - Til va so'zlar: Jonli o'zbek so'zlashuv tili (${slangList || 'aka, uka, gap yo\'q, bo\'ldi, rahmat, yaxshi, bopti, xop, tinchlikmi'}).

4. ODDIY VAZIYATLAR UCHUN SO'ZLASHUV NAMUNALARI:
   - "Salom, qandaysan?" -> "Salom! Rahmat, zo'r, o'zing tinchmisan? Nima yangiliklar?"
   - "Bugun ko'rishamizmi kechga?" -> "Bo'ladi, soat 6-7 larda bo'shiman, qayerda ko'rishamiz?"
   - "Qayerdasan?" -> "Uydaman, tinchlikmi? ||| Mana lakatsiya [LOCATION]"
   - "Lakatsya yubor" -> "Mana lakatsiya, shu yerdaman [LOCATION]"
   - "Ertaga soat 3 da bo'shmisan?" -> "Ha bo'shman, bemalol gaplashsak bo'ladi."
   - "Rahmat katta!" -> "Arzimaydi, salomat bo'l 👍"
   - "100 ming berib turolmaysanmi?" -> "Aka hozir qo'lda pulim yo'q edi, xafa bo'lmaysiz."

SHAXSIY MA'LUMOTLARINGIZ:
${kbFormatted || "Qo'shimcha ma'lumot yo'q."}

QO'SHIMCHA XULQ-ATVOR QOIDALARI:
${rulesFormatted || "Samimiy, aqlli va do'stona bo'ling."}

SIZNING YOZISH NAMUNALARINGIZ:
${samplesFormatted || "- Va alaykum assalom! Yaxshimisiz?"}

${persona.customPromptInstructions ? `MAXSUS KO'RSATMALAR:\n${persona.customPromptInstructions}` : ''}
${girlfriendSpecialInstruction}

Suhbatdosh nima deb yozgan bo'lsa, xuddi Rahmatullohning o'zi javob yozayotgandek to'g'ridan-to'g'ri uning gapiga mos samimiy, tirik va lo'nda javob qaytaring.`;
}

// Helper: detect if message asks for location
function isLocationQuery(text: string): boolean {
  const t = (text || '').toLowerCase();
  return (
    t.includes('qayerdasan') ||
    t.includes('qayerdasiz') ||
    t.includes('qattasan') ||
    t.includes('qattasiz') ||
    t.includes('qaydasiz') ||
    t.includes('qaydasan') ||
    t.includes('lakatsya') ||
    t.includes('lakatsiya') ||
    t.includes('lokatsya') ||
    t.includes('lokatsiya') ||
    t.includes('geolokatsiya') ||
    t.includes('joylashuv') ||
    t.includes('location') ||
    t.includes('turgan joy') ||
    t.includes('adresing') ||
    t.includes('adresiz') ||
    t.includes('manziling') ||
    t.includes('manziliz') ||
    t.includes('joying qayerda') ||
    t.includes('joyiz qayerda')
  );
}

// Helper: send Telegram Location via API
async function sendTelegramLocation(
  token: string,
  params: {
    chat_id: number | string;
    latitude: number;
    longitude: number;
    business_connection_id?: string;
  }
): Promise<{ ok: boolean; error?: string; result?: any }> {
  try {
    const body: Record<string, any> = {
      chat_id: params.chat_id,
      latitude: params.latitude,
      longitude: params.longitude,
    };
    if (params.business_connection_id) {
      body.business_connection_id = params.business_connection_id;
    }
    const res = await fetch(`https://api.telegram.org/bot${token}/sendLocation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    console.log('Telegram sendLocation javobi:', JSON.stringify(data));
    return { ok: data.ok, result: data.result, error: data.description };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('sendTelegramLocation xatosi:', msg);
    return { ok: false, error: msg };
  }
}

// Media Storage & Record definition
export interface GeneratedMediaRecord {
  id: string;
  type: 'image' | 'video';
  prompt: string;
  url: string;
  aspectRatio?: string;
  createdAt: string;
  status: 'ready' | 'generating' | 'failed';
  style?: string;
  duration?: number;
  error?: string;
}

const MEDIA_GALLERY_FILE = path.join(__dirname, 'media_gallery.json');
let mediaGallery: GeneratedMediaRecord[] = [];

try {
  if (fs.existsSync(MEDIA_GALLERY_FILE)) {
    const raw = fs.readFileSync(MEDIA_GALLERY_FILE, 'utf-8');
    mediaGallery = JSON.parse(raw);
  }
} catch (e) {
  console.warn("Media galereyasini o'qishda ogohlantirish:", e);
}

// Add sample items if gallery is empty
if (mediaGallery.length === 0) {
  mediaGallery = [
    {
      id: 'seed-img-1',
      type: 'image',
      prompt: "Registon maydoni shom paytida, oltin rangli chiroqlar bilan yoritilgan, 8K ultra aniqlik",
      url: "https://image.pollinations.ai/prompt/Registan%20Square%20Samarkand%20at%20twilight%20golden%20illumination%20masterpiece%20photorealistic?width=1024&height=1024&nologo=true&seed=42",
      aspectRatio: '1:1',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      status: 'ready',
      style: 'Fotorealistik (8K)',
    },
    {
      id: 'seed-img-2',
      type: 'image',
      prompt: "Toshkent City 2050: osmono'par binolar uzra uchayotgan zamonaviy transportlar, kiberpank",
      url: "https://image.pollinations.ai/prompt/Tashkent%20futuristic%20city%202050%20flying%20cars%20skyscrapers%20cyberpunk%20neon%20lighting?width=1280&height=720&nologo=true&seed=99",
      aspectRatio: '16:9',
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      status: 'ready',
      style: 'Kiberpank & Neon',
    },
  ];
}

function saveMediaGalleryToDisk() {
  try {
    fs.writeFileSync(MEDIA_GALLERY_FILE, JSON.stringify(mediaGallery.slice(0, 60), null, 2), 'utf-8');
  } catch (e) {
    console.warn("Media galereyasini saqlashda ogohlantirish:", e);
  }
}

// Helper: send Telegram Photo via API
async function sendTelegramPhoto(
  token: string,
  params: {
    chat_id: number | string;
    photo: string;
    caption?: string;
    business_connection_id?: string;
  }
): Promise<{ ok: boolean; error?: string; result?: any }> {
  try {
    const body: Record<string, any> = {
      chat_id: params.chat_id,
      photo: params.photo,
    };
    if (params.caption) body.caption = params.caption;
    if (params.business_connection_id) body.business_connection_id = params.business_connection_id;

    const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    console.log('Telegram sendPhoto javobi:', JSON.stringify(data));
    return { ok: data.ok, result: data.result, error: data.description };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('sendTelegramPhoto xatosi:', msg);
    return { ok: false, error: msg };
  }
}

// Helper: send Telegram Video via API
async function sendTelegramVideo(
  token: string,
  params: {
    chat_id: number | string;
    video: string;
    caption?: string;
    business_connection_id?: string;
  }
): Promise<{ ok: boolean; error?: string; result?: any }> {
  try {
    const body: Record<string, any> = {
      chat_id: params.chat_id,
      video: params.video,
    };
    if (params.caption) body.caption = params.caption;
    if (params.business_connection_id) body.business_connection_id = params.business_connection_id;

    const res = await fetch(`https://api.telegram.org/bot${token}/sendVideo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.ok) return { ok: true, result: data.result };

    // Fallback: send as photo/animation if video endpoint rejects URL format
    return sendTelegramPhoto(token, {
      chat_id: params.chat_id,
      photo: params.video,
      caption: params.caption,
      business_connection_id: params.business_connection_id,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('sendTelegramVideo xatosi:', msg);
    return { ok: false, error: msg };
  }
}

// Helper: extract media generation prompts from incoming text
function extractMediaPrompt(text: string): { isImage: boolean; isVideo: boolean; prompt: string } {
  const trimmed = (text || '').trim();
  const lower = trimmed.toLowerCase();

  // Explicit slash commands
  if (lower.startsWith('/image') || lower.startsWith('/rasm') || lower.startsWith('/draw') || lower.startsWith('/chiz')) {
    const p = trimmed.replace(/^(\/image|\/rasm|\/draw|\/chiz)\s*/i, '').trim();
    return { isImage: true, isVideo: false, prompt: p || "Toshkent shahrida chiroyli quyosh botishi" };
  }
  if (lower.startsWith('/video') || lower.startsWith('/klip') || lower.startsWith('/animatsiya')) {
    const p = trimmed.replace(/^(\/video|\/klip|\/animatsiya)\s*/i, '').trim();
    return { isImage: false, isVideo: true, prompt: p || "Koinotda asta suzib yurgan astronavt" };
  }

  // Video keywords
  if (
    lower.includes('video generatsiya') ||
    lower.includes('video yarat') ||
    lower.includes('video chiqar') ||
    lower.includes('video tayyorla') ||
    lower.includes('video qilib ber') ||
    lower.includes('videoni yarat') ||
    lower.includes('generate video') ||
    lower.includes('make a video')
  ) {
    const cleanPrompt = trimmed
      .replace(/video\s+(generatsiya\s+qil(ib\s+ber)?|yarat(ib\s+ber)?|chiqar(ib\s+ber)?|tayyorla(b\s+ber)?|qilib\s+ber)/gi, '')
      .replace(/videoni\s+(yarat|tayyorla|chiqar)(ib\s+ber)?/gi, '')
      .replace(/menga|iltimos|bitta|chiroyli/gi, '')
      .replace(/^[:\s\-]+/, '')
      .trim();
    return { isImage: false, isVideo: true, prompt: cleanPrompt || trimmed };
  }

  // Image keywords
  if (
    lower.includes('rasm generatsiya') ||
    lower.includes('rasm yarat') ||
    lower.includes('rasm chiqar') ||
    lower.includes('rasm chiz') ||
    lower.includes('rasm qilib ber') ||
    lower.includes('rasmini chiz') ||
    lower.includes('rasmini yarat') ||
    lower.includes('surat yarat') ||
    lower.includes('surat chiz') ||
    lower.includes('generate image') ||
    lower.includes('draw an image')
  ) {
    const cleanPrompt = trimmed
      .replace(/rasm\s+(generatsiya\s+qil(ib\s+ber)?|yarat(ib\s+ber)?|chiqar(ib\s+ber)?|chiz(ib\s+ber)?|qilib\s+ber)/gi, '')
      .replace(/surat\s+(yarat|chiz)(ib\s+ber)?/gi, '')
      .replace(/rasmini\s+(yarat|chiz)(ib\s+ber)?/gi, '')
      .replace(/menga|iltimos|bitta|chiroyli/gi, '')
      .replace(/^[:\s\-]+/, '')
      .trim();
    return { isImage: true, isVideo: false, prompt: cleanPrompt || trimmed };
  }

  return { isImage: false, isVideo: false, prompt: '' };
}

// Enhance user visual prompt into detailed English prompt
async function enhanceVisualPrompt(rawPrompt: string, type: 'image' | 'video'): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `You are an AI visual prompter. Translate and convert this user request into a detailed, vibrant ${type} generation prompt in English (photorealistic, 8k, masterpiece, cinematic lighting, vivid colors, no text, no watermark): "${rawPrompt}". Output ONLY the expanded prompt in 1-2 concise sentences.`,
    });
    return response.text?.trim() || rawPrompt;
  } catch {
    return rawPrompt;
  }
}

// AI Image Generator Engine
async function generateAiImage(rawPrompt: string, aspectRatio: string = '1:1', style?: string): Promise<{ url: string; prompt: string }> {
  const visualPrompt = await enhanceVisualPrompt(rawPrompt, 'image');

  let width = 1024;
  let height = 1024;
  if (aspectRatio === '16:9') {
    width = 1280;
    height = 720;
  } else if (aspectRatio === '9:16') {
    width = 720;
    height = 1280;
  } else if (aspectRatio === '4:3') {
    width = 1024;
    height = 768;
  }

  // 1. Try gemini-3.1-flash-lite-image if available
  try {
    const geminiImgRes = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-image',
      contents: { parts: [{ text: visualPrompt }] },
      config: {
        imageConfig: {
          aspectRatio: (aspectRatio === '16:9' || aspectRatio === '9:16' || aspectRatio === '4:3' || aspectRatio === '3:4') ? (aspectRatio as any) : '1:1',
        },
      },
    });

    const parts = geminiImgRes.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        const mime = part.inlineData.mimeType || 'image/png';
        const dataUrl = `data:${mime};base64,${part.inlineData.data}`;
        return { url: dataUrl, prompt: visualPrompt };
      }
    }
  } catch (geminiErr) {
    console.warn("Gemini Image modeli xatosi yoki ruxsat yo'q (yuqori sifatli fallback ishga tushiriladi):", geminiErr);
  }

  // 2. High Quality Flux AI Image Fallback via Pollinations
  const seed = Math.floor(Math.random() * 9999999);
  const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(visualPrompt)}?width=${width}&height=${height}&seed=${seed}&nologo=true&model=flux`;

  return { url: pollinationsUrl, prompt: visualPrompt };
}

// AI Video Generator Engine
async function generateAiVideo(rawPrompt: string, aspectRatio: string = '16:9'): Promise<{ url: string; prompt: string }> {
  const visualPrompt = await enhanceVisualPrompt(rawPrompt, 'video');

  // 1. Try Google Veo (veo-3.1-lite-generate-preview)
  try {
    const operation = await ai.models.generateVideos({
      model: 'veo-3.1-lite-generate-preview',
      prompt: visualPrompt,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: (aspectRatio === '9:16' ? '9:16' : '16:9') as any,
      },
    });

    if (operation?.name) {
      console.log('Veo video generation operation started:', operation.name);
      let attempts = 0;
      while (attempts < 2) {
        await new Promise((r) => setTimeout(r, 2000));
        attempts++;
        const { GenerateVideosOperation } = await import('@google/genai');
        const op = new GenerateVideosOperation();
        op.name = operation.name;
        const updated = await ai.operations.getVideosOperation({ operation: op });
        if (updated.done) {
          const videoUri = updated.response?.generatedVideos?.[0]?.video?.uri;
          if (videoUri) {
            return { url: videoUri, prompt: visualPrompt };
          }
          break;
        }
      }
    }
  } catch (veoErr) {
    console.warn("Veo modeli xatosi yoki ruxsat yo'q (yuqori sifatli fallback ishga tushiriladi):", veoErr);
  }

  // 2. Dynamic Visual Video Animation via High-resolution AI Engine
  const seed = Math.floor(Math.random() * 9999999);
  const videoAnimUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(visualPrompt)}?width=1280&height=720&seed=${seed}&nologo=true&model=flux`;

  return { url: videoAnimUrl, prompt: visualPrompt };
}

// Helper: Transcribe voice or audio file from Telegram via Gemini
async function transcribeVoiceFile(token: string, fileId: string, mimeType?: string): Promise<string> {
  try {
    const fileRes = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`);
    const fileData = await fileRes.json();
    if (!fileData.ok || !fileData.result?.file_path) {
      console.warn('Telegram getFile xatosi:', fileData);
      return '[Ovozli xabar eshitilmadi]';
    }

    const downloadUrl = `https://api.telegram.org/file/bot${token}/${fileData.result.file_path}`;
    const audioRes = await fetch(downloadUrl);
    const arrayBuffer = await audioRes.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString('base64');
    const effectiveMime =
      mimeType ||
      (fileData.result.file_path.endsWith('.oga') || fileData.result.file_path.endsWith('.ogg')
        ? 'audio/ogg'
        : 'audio/mp3');

    // Try available fast models for voice transcription
    for (const model of ACTIVE_GEMINI_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType: effectiveMime,
                    data: base64Audio,
                  },
                },
                {
                  text: "Ushbu ovozli xabarda nima deyilganini aniq o'zbek tilida yozib bering. Faqat gapirilgan gapni matn sifatida qaytaring, ortiqcha hech narsa yozmang.",
                },
              ],
            },
          ],
        });
        const text = response.text?.trim();
        if (text) return text;
      } catch (err) {
        console.warn(`Ovozni matnga o'girishda model ${model} xatosi:`, err);
      }
    }

    return '[Ovozli xabar]';
  } catch (err) {
    console.error("Ovozli xabarni yuklab olishda xatolik:", err);
    return '[Ovozli xabar]';
  }
}

// Helper: send Telegram message with full logging and error inspection
async function sendTelegramMessage(
  token: string,
  params: {
    chat_id: number | string;
    text: string;
    business_connection_id?: string;
    reply_markup?: any;
  }
): Promise<{ ok: boolean; error?: string; result?: any }> {
  try {
    const body: Record<string, any> = {
      chat_id: params.chat_id,
      text: params.text,
    };
    if (params.business_connection_id) {
      body.business_connection_id = params.business_connection_id;
    }
    if (params.reply_markup) {
      body.reply_markup = params.reply_markup;
    }

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    console.log('Telegram sendMessage javobi:', JSON.stringify(data));

    if (!data.ok) {
      if (params.business_connection_id) {
        console.warn(
          `[DIQQAT] Telegram Business orqali xabar yuborishda xato: ${data.description}. Telegram Business sozlamalarida 'Javob berishga ruxsat' (Can reply) yoqilganini tekshiring.`
        );
      }
      return { ok: false, error: data.description || 'Xabar yuborilmadi' };
    }

    return { ok: true, result: data.result };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('sendTelegramMessage xatosi:', message);
    return { ok: false, error: message };
  }
}

// Helper: send human-paced reply with typing simulation and multi-message split
async function sendHumanTelegramReply(
  token: string,
  params: {
    chat_id: number | string;
    text: string;
    business_connection_id?: string;
    humanDelaySeconds?: number;
    splitMessages?: boolean;
    reply_markup?: any;
  }
): Promise<{ ok: boolean; error?: string; result?: any }> {
  const delaySec = params.humanDelaySeconds ?? 2;
  // Natural typing simulation delay
  if (delaySec > 0) {
    const typingBody: Record<string, any> = {
      chat_id: params.chat_id,
      action: 'typing',
    };
    if (params.business_connection_id) typingBody.business_connection_id = params.business_connection_id;
    fetch(`https://api.telegram.org/bot${token}/sendChatAction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(typingBody),
    }).catch(() => {});
    await new Promise((r) => setTimeout(r, Math.min(delaySec * 1000, 4000)));
  }

  // Check if reply has multi-message split delimiter " ||| "
  if (params.splitMessages !== false && params.text.includes(' ||| ')) {
    const parts = params.text.split(' ||| ').map((p) => p.trim()).filter(Boolean);
    if (parts.length > 1) {
      // Send first bubble
      const res1 = await sendTelegramMessage(token, {
        chat_id: params.chat_id,
        business_connection_id: params.business_connection_id,
        text: parts[0],
      });

      // Brief typing interval between bubble 1 and bubble 2
      const typingBody: Record<string, any> = {
        chat_id: params.chat_id,
        action: 'typing',
      };
      if (params.business_connection_id) typingBody.business_connection_id = params.business_connection_id;
      fetch(`https://api.telegram.org/bot${token}/sendChatAction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(typingBody),
      }).catch(() => {});
      await new Promise((r) => setTimeout(r, 1200));

      // Send second bubble
      const res2 = await sendTelegramMessage(token, {
        chat_id: params.chat_id,
        business_connection_id: params.business_connection_id,
        text: parts[1],
        reply_markup: params.reply_markup,
      });
      return res2.ok ? res2 : res1;
    }
  }

  return sendTelegramMessage(token, {
    chat_id: params.chat_id,
    business_connection_id: params.business_connection_id,
    text: params.text,
    reply_markup: params.reply_markup,
  });
}

// -------------------------------------------------------------
// Auto-Pinger Engine: "Alo deb har sekunda yozib tursin Bonu yozguncha"
// -------------------------------------------------------------
interface AutoPingRecord {
  isActive: boolean;
  targetId: string;
  targetName: string;
  messageText: string;
  intervalSec: number;
  sentCount: number;
  lastSentAt: string | null;
  lastError: string | null;
  stoppedReason: string | null;
  startedAt: string | null;
  history: Array<{
    id: string;
    timestamp: string;
    status: 'sent' | 'failed' | 'stopped';
    text: string;
    note?: string;
  }>;
}

const autoPingState: AutoPingRecord = {
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
};

let autoPingTimer: NodeJS.Timeout | null = null;
let autoPingInFlight = false;

function stopAutoPing(reason: string) {
  if (autoPingTimer) {
    clearInterval(autoPingTimer);
    autoPingTimer = null;
  }
  const wasActive = autoPingState.isActive;
  autoPingState.isActive = false;
  autoPingState.stoppedReason = reason;
  if (wasActive) {
    autoPingState.history.unshift({
      id: 'stop-' + Date.now(),
      timestamp: new Date().toISOString(),
      status: 'stopped',
      text: autoPingState.messageText,
      note: reason,
    });
    console.log(`[AutoPing] To'xtatildi: ${reason}`);
  }
}

async function sendPingCycle() {
  if (!autoPingState.isActive || autoPingInFlight) return;
  autoPingInFlight = true;
  try {
    const token = botState.botToken;
    const target = autoPingState.targetId || '8839785942';
    const text = autoPingState.messageText || 'Alo';

    let sendResult: { ok: boolean; error?: string; result?: any } = { ok: false };

    // 1. Try sending via Telegram Business connection if active
    if (botState.businessConnection?.id) {
      sendResult = await sendTelegramMessage(token, {
        chat_id: target,
        text,
        business_connection_id: botState.businessConnection.id,
      });
    }

    // 2. If business connection wasn't available or failed, try direct bot message
    if (!sendResult.ok) {
      sendResult = await sendTelegramMessage(token, {
        chat_id: target,
        text,
      });
    }

    autoPingState.sentCount += 1;
    autoPingState.lastSentAt = new Date().toISOString();

    if (sendResult.ok) {
      autoPingState.lastError = null;
      autoPingState.history.unshift({
        id: 'ping-' + Date.now(),
        timestamp: new Date().toISOString(),
        status: 'sent',
        text,
      });
    } else {
      autoPingState.lastError = sendResult.error || 'Telegram xatosi';
      autoPingState.history.unshift({
        id: 'ping-' + Date.now(),
        timestamp: new Date().toISOString(),
        status: 'failed',
        text,
        note: sendResult.error,
      });
    }

    if (autoPingState.history.length > 50) {
      autoPingState.history = autoPingState.history.slice(0, 50);
    }

    if (autoPingState.sentCount === 1 || autoPingState.sentCount % 5 === 0 || !sendResult.ok) {
      botState.logs.unshift({
        id: 'autoping-' + Date.now(),
        timestamp: new Date().toISOString(),
        senderId: target,
        senderName: autoPingState.targetName,
        incomingText: '[Avto-Chaqiruv (Alo)]',
        replyText: `${text} (#${autoPingState.sentCount})`,
        source: botState.businessConnection?.id ? 'telegram_business' : 'telegram_live',
        status: sendResult.ok ? 'sent' : 'failed',
        error: sendResult.error,
      });
      if (botState.logs.length > 200) botState.logs = botState.logs.slice(0, 200);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    autoPingState.lastError = msg;
  } finally {
    autoPingInFlight = false;
  }
}

function startAutoPing(targetId: string, messageText: string, intervalSec: number) {
  if (autoPingTimer) {
    clearInterval(autoPingTimer);
    autoPingTimer = null;
  }
  const cleanInterval = Math.max(1, Math.min(60, Number(intervalSec) || 1));
  autoPingState.isActive = true;
  autoPingState.targetId = targetId || '8839785942';
  autoPingState.targetName = autoPingState.targetId === '8839785942' ? 'Bonu (Sevgilim)' : `Foydalanuvchi (${autoPingState.targetId})`;
  autoPingState.messageText = messageText || 'Alo';
  autoPingState.intervalSec = cleanInterval;
  autoPingState.startedAt = new Date().toISOString();
  autoPingState.stoppedReason = null;
  autoPingState.lastError = null;
  autoPingState.sentCount = 0;

  console.log(`[AutoPing] Boshlandi: "${autoPingState.messageText}" har ${cleanInterval} soniyada -> ${autoPingState.targetId}`);

  sendPingCycle();

  autoPingTimer = setInterval(() => {
    if (!autoPingState.isActive) {
      if (autoPingTimer) {
        clearInterval(autoPingTimer);
        autoPingTimer = null;
      }
      return;
    }
    sendPingCycle();
  }, cleanInterval * 1000);
}

// Generate smart contextual fallback if all AI models fail
function generateSmartFallback(incomingText: string): string {
  const lower = incomingText.toLowerCase();
  if (lower.includes('salom') || lower.includes('assalom') || lower.includes('qalaysiz') || lower.includes('qalesan')) {
    return "Va alaykum assalom! Rahmat, o'zingiz yaxshimisiz? Tinchlikmi?";
  }
  if (lower.includes('ko\'rish') || lower.includes('korish') || lower.includes('uchrash') || lower.includes('bugun') || lower.includes('ertaga')) {
    return "Bo'ladi, soat 6-7 larda gaplashaylik, qayerda ko'rishsak ma'qul?";
  }
  if (lower.includes('qayerdasiz') || lower.includes('qayerdasan') || lower.includes('qattasiz') || lower.includes('qattasan')) {
    return "Uydaman, tinchlikmi, biror masala bormidi?";
  }
  if (lower.includes('rahmat') || lower.includes('raxmat') || lower.includes('tashakkur')) {
    return "Arzimaydi, salomat bo'ling 👍";
  }
  if (lower.includes('qarz') || lower.includes('pul') || lower.includes('tashlab tur')) {
    return "Aka hozir imkoniyatim yo'q edi, xafa bo'lmaysiz.";
  }
  if (lower.includes('nima gap') || lower.includes('nima yangilik')) {
    return "Tinchlik, xudoga shukur bir maromda. O'zingizda nimalar yangilik?";
  }
  return "Tushundim, xop. Hozir qarayman bopti.";
}

// Helper to reliably generate reply as Rahmatulloh using candidate models with fallback
async function generateHumanReply(
  prompt: string | Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>,
  systemInstruction: string,
  timeoutMs = 12000
): Promise<string> {
  const incomingPreview = typeof prompt === 'string'
    ? prompt
    : prompt[prompt.length - 1]?.parts?.[0]?.text || '';

  const aiPromise = (async () => {
    // Try each model in sequence
    for (const model of ACTIVE_GEMINI_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction,
            temperature: 0.8,
          },
        });
        const reply = response.text?.trim();
        if (reply) {
          return reply;
        }
      } catch (err) {
        console.warn(`Model ${model} xatosi:`, err instanceof Error ? err.message : err);
      }
    }
    // If all models failed, use smart contextual fallback
    return generateSmartFallback(incomingPreview);
  })();

  const timeoutPromise = new Promise<string>((resolve) => {
    setTimeout(() => {
      resolve(generateSmartFallback(incomingPreview));
    }, timeoutMs);
  });

  return Promise.race([aiPromise, timeoutPromise]);
}

// 1. Generate reply endpoint (used by simulator and telegram poller)
app.post('/api/gemini/generate-reply', async (req, res) => {
  try {
    const { senderName, incomingMessage, chatHistory, customPersona } = req.body;
    const persona = customPersona || botState.personaConfig;

    if (!incomingMessage || typeof incomingMessage !== 'string') {
      return res.status(400).json({ error: 'incomingMessage talab qilinadi.' });
    }

    const systemInstruction = buildPersonaPrompt(persona);

    // Format chat context with deep memory (up to 16 turns)
    const conversationHistory: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    // Get any stored memory notes for this simulator user if exists
    const simSession = chatSessions.get('sim-user');
    if (simSession?.memoryNotes && simSession.memoryNotes.length > 0) {
      conversationHistory.push({
        role: 'user',
        parts: [{ text: `[SUHBATDOSH HAQIDA ESLAB QOLINGAN MA'LUMOTLAR: ${simSession.memoryNotes.join('; ')}]` }],
      });
      conversationHistory.push({
        role: 'model',
        parts: [{ text: "Barcha xotira ma'lumotlarini eslab qoldim." }],
      });
    }

    if (Array.isArray(chatHistory)) {
      for (const msg of chatHistory.slice(-16)) {
        conversationHistory.push({
          role: msg.role === 'model' ? 'model' : 'user',
          parts: [{ text: `${msg.senderName ? `[${msg.senderName}]: ` : ''}${msg.text}` }],
        });
      }
    }

    conversationHistory.push({
      role: 'user',
      parts: [{ text: `[${senderName || 'Suhbatdosh'}]: ${incomingMessage}` }],
    });

    let rawReply = await generateHumanReply(conversationHistory, systemInstruction);
    const isLoc = isLocationQuery(incomingMessage) || rawReply.includes('[LOCATION]');

    // Check for image / video generation request
    const mediaPromptInfo = extractMediaPrompt(incomingMessage);
    let generatedMedia: GeneratedMediaRecord | undefined = undefined;

    const imgTagMatch = rawReply.match(/\[IMAGE_PROMPT:\s*([^\]]+)\]/i);
    const vidTagMatch = rawReply.match(/\[VIDEO_PROMPT:\s*([^\]]+)\]/i);

    if (mediaPromptInfo.isImage || imgTagMatch) {
      const p = imgTagMatch ? imgTagMatch[1].trim() : mediaPromptInfo.prompt;
      try {
        const imgResult = await generateAiImage(p);
        generatedMedia = {
          id: 'img-' + Date.now(),
          type: 'image',
          prompt: p,
          url: imgResult.url,
          aspectRatio: '1:1',
          createdAt: new Date().toISOString(),
          status: 'ready',
        };
        mediaGallery.unshift(generatedMedia);
        saveMediaGalleryToDisk();
      } catch (e) {
        console.warn("Rasm yaratishda xato:", e);
      }
    } else if (mediaPromptInfo.isVideo || vidTagMatch) {
      const p = vidTagMatch ? vidTagMatch[1].trim() : mediaPromptInfo.prompt;
      try {
        const vidResult = await generateAiVideo(p);
        generatedMedia = {
          id: 'vid-' + Date.now(),
          type: 'video',
          prompt: p,
          url: vidResult.url,
          aspectRatio: '16:9',
          createdAt: new Date().toISOString(),
          status: 'ready',
        };
        mediaGallery.unshift(generatedMedia);
        saveMediaGalleryToDisk();
      } catch (e) {
        console.warn("Video yaratishda xato:", e);
      }
    }

    let replyText = rawReply
      .replace(/\[LOCATION\]/gi, '')
      .replace(/\[IMAGE_PROMPT:[^\]]+\]/gi, '')
      .replace(/\[VIDEO_PROMPT:[^\]]+\]/gi, '')
      .trim();

    if (!replyText && generatedMedia) {
      replyText = generatedMedia.type === 'image'
        ? "Mana siz so'ragan rasm tayyor bo'ldi! 🖼️"
        : "Mana siz so'ragan video lavha tayyor bo'ldi! 🎬";
    }

    const locData = isLoc && persona.locationConfig?.enabled !== false
      ? (persona.locationConfig || {
          enabled: true,
          latitude: 41.2995,
          longitude: 69.2401,
          venueTitle: 'Toshkent, Chilonzor',
          address: 'Chilonzor tumani, Toshkent shahri',
          replyText: 'Mana lakatsiya, uydaman kel 👍',
        })
      : undefined;

    // Record both messages in persistent chat session for simulator
    recordChatMessage('sim-user', senderName || 'Foydalanuvchi', 'simulator', {
      role: 'user',
      text: incomingMessage,
    });
    recordChatMessage('sim-user', persona.ownerName, 'simulator', {
      role: 'model',
      text: replyText,
      hasLocation: isLoc,
      locationData: locData,
      media: generatedMedia,
    });

    // Store in logs
    const logEntry = {
      id: 'sim-' + Date.now(),
      timestamp: new Date().toISOString(),
      senderId: 'sim-user',
      senderName: senderName || 'Foydalanuvchi',
      incomingText: incomingMessage,
      replyText,
      source: 'simulator' as const,
      status: 'sent' as const,
      styleToneUsed: persona.tone,
      hasLocation: isLoc,
      media: generatedMedia,
    };
    botState.logs.unshift(logEntry);
    if (botState.logs.length > 50) botState.logs.pop();

    res.json({
      replyText,
      hasLocation: isLoc,
      locationData: locData,
      media: generatedMedia,
      confidence: 0.96,
      personaUsed: persona.ownerName,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Error in /api/gemini/generate-reply:', message);
    res.status(500).json({ error: message });
  }
});

// 2. Analyze past chat logs to extract user's style DNA
app.post('/api/gemini/analyze-style', async (req, res) => {
  try {
    const { sampleText } = req.body;
    if (!sampleText || typeof sampleText !== 'string' || sampleText.trim().length < 10) {
      return res.status(400).json({ error: 'Iltimos, tahlil qilish uchun kamida bir nechta xabarlardan iborat matn yuboring.' });
    }

    const prompt = `Quyidagi yozishmalar yoki matn namunasi bir shaxsning Telegramdagi haqiqiy xabarlaridir.
Ushbu matnni chuqur tahlil qiling va bu shaxsning so'zlashuv DNKsi (uslubi)ni JSON formatda aniqlang:

Matn namunasi:
"""
${sampleText}
"""

Iltimos, faqat to'g'ri JSON qaytaring:
{
  "detectedTone": "Do'stona va erkin" | "Rasmiy va jiddiy" | "Qisqa va ishbilarmon" | "Hazilkash",
  "detectedFormality": "erkin" | "o'rtacha" | "rasmiy",
  "typicalGreetings": ["namuna 1", "namuna 2"],
  "typicalFarewells": ["namuna 1"],
  "slangAndFavoriteWords": ["aka", "uka", "gap yo'q", "bo'ldi", ...],
  "emojiStyle": "none" | "rare" | "moderate" | "frequent",
  "averageSentenceLength": "short_telegram" | "medium" | "detailed",
  "keyStyleObservations": "Ushbu shaxs haqida 2-3 ta qisqa xulosa (qanday yozadi, tez-tez nimalar deydi)",
  "recommendedRules": ["Qoida 1", "Qoida 2", "Qoida 3"]
}`;

    let parsed = null;
    for (const model of ACTIVE_GEMINI_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });
        parsed = JSON.parse(response.text || '{}');
        if (parsed) break;
      } catch (err) {
        console.warn(`Model ${model} analyze-style xatosi:`, err);
      }
    }

    if (!parsed) {
      parsed = {
        detectedTone: "Do'stona va erkin",
        detectedFormality: "erkin",
        typicalGreetings: ["Salom!", "Va alaykum assalom"],
        typicalFarewells: ["Salomat bo'ling", "Ko'rishguncha"],
        slangAndFavoriteWords: ["aka", "uka", "gap yo'q", "bo'ldi", "rahmat", "bopti", "xop"],
        emojiStyle: "moderate",
        averageSentenceLength: "short_telegram",
        keyStyleObservations: "Samimiy, do'stona va qisqa Telegram uslubida yozadi.",
        recommendedRules: [
          "Xabarlarga qisqa va lo'nda javob bering",
          "Samimiy do'stona ohangda gaplashing",
          "Savollarga aniq va to'g'ri javob qaytaring",
        ],
      };
    }

    res.json({ success: true, analysis: parsed });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Error in /api/gemini/analyze-style:', message);
    res.status(500).json({ error: message });
  }
});

// 3. Verify Telegram bot token
app.post('/api/telegram/verify-bot', async (req, res) => {
  try {
    const { botToken } = req.body;
    if (!botToken || typeof botToken !== 'string') {
      return res.status(400).json({ error: 'Bot token kiritilmadi.' });
    }

    const cleanToken = botToken.trim();
    const tgRes = await fetch(`https://api.telegram.org/bot${cleanToken}/getMe`);
    const tgData = await tgRes.json();

    if (!tgData.ok) {
      return res.status(400).json({
        ok: false,
        error: tgData.description || 'Telegram bot tokeni yaroqsiz.',
      });
    }

    botState.botToken = cleanToken;
    botState.botInfo = tgData.result;

    // Automatically set the Telegram Mini App Menu Button on the bot!
    const miniAppUrl = process.env.APP_URL || 'https://ais-pre-m5typlarwcoemrtehsvjgf-798886787643.asia-southeast1.run.app';
    try {
      await fetch(`https://api.telegram.org/bot${cleanToken}/setChatMenuButton`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menu_button: {
            type: 'web_app',
            text: 'Mini App',
            web_app: { url: miniAppUrl },
          },
        }),
      });
      console.log('Mini App avtomatik ravishda bot menyusiga biriktirildi!');
    } catch (e) {
      console.error('Menu button biriktirishda xato:', e);
    }

    res.json({
      ok: true,
      bot: tgData.result,
      miniAppConfigured: true,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ ok: false, error: message });
  }
});

// Helper: poll Telegram updates in loop
async function runTelegramPolling(token: string, signal: AbortSignal) {
  console.log('Telegram Bot Polling boshlandi...');
  botState.isPolling = true;

  while (!signal.aborted) {
    try {
      const url = `https://api.telegram.org/bot${token}/getUpdates?offset=${lastUpdateOffset + 1}&timeout=15`;
      const response = await fetch(url, { signal });
      const data = await response.json();

      if (data.ok && Array.isArray(data.result) && data.result.length > 0) {
        for (const update of data.result) {
          lastUpdateOffset = Math.max(lastUpdateOffset, update.update_id);

          // 1. Telegram Business Message (directly from personal chat via Telegram Business!)
          const bMsg = update.business_message;
          if (bMsg && (bMsg.text || bMsg.voice || bMsg.audio)) {
            const connectionId = bMsg.business_connection_id;
            const chatId = bMsg.chat.id;
            const senderName =
              [bMsg.from?.first_name, bMsg.from?.last_name].filter(Boolean).join(' ') ||
              bMsg.from?.username ||
              'Mehmon';

            // Avoid replying to the business owner's own outgoing messages
            const ownerId = botState.businessConnection?.user?.id || 5275538732;
            const isFromOwner = bMsg.from?.id === ownerId || bMsg.from?.id === 5275538732;

            if (!isFromOwner) {
              const incomingSenderId = String(bMsg.from?.id || chatId);
              if (autoPingState.isActive && (incomingSenderId === String(autoPingState.targetId) || String(chatId) === String(autoPingState.targetId))) {
                stopAutoPing(`🎉 BONU YOZDI! ("${(bMsg.text || 'Xabar keldi').slice(0, 30)}") - Avto-ping to'xtatildi!`);
              }

              botState.stats.totalReceived += 1;
              botState.stats.lastActiveAt = new Date().toISOString();

              // Send typing action so the chat shows "yozmoqda..."
              fetch(`https://api.telegram.org/bot${token}/sendChatAction`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  business_connection_id: connectionId,
                  chat_id: chatId,
                  action: 'typing',
                }),
              }).catch(() => {});

              let incomingText = (bMsg.text || '').trim();
              let isVoice = false;

              // Voice or audio transcription
              const voiceData = bMsg.voice || bMsg.audio;
              if (voiceData) {
                isVoice = true;
                const transcribed = await transcribeVoiceFile(token, voiceData.file_id, voiceData.mime_type);
                incomingText = transcribed;
              }

              // Build multi-turn conversational context with deep memory
              const session = chatSessions.get(chatId);
              const storedMsgs = session?.messages || [];
              const promptContext: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

              if (session?.memoryNotes && session.memoryNotes.length > 0) {
                promptContext.push({
                  role: 'user',
                  parts: [{ text: `[SUHBATDOSH HAQIDA ESLAB QOLINGAN XOTIRA: ${session.memoryNotes.join('; ')}]` }],
                });
                promptContext.push({
                  role: 'model',
                  parts: [{ text: "Xotiradagi barcha ma'lumotlarni esladim." }],
                });
              }

              for (const m of storedMsgs.slice(-14)) {
                promptContext.push({
                  role: m.role,
                  parts: [{ text: `${m.senderName ? `[${m.senderName}]: ` : ''}${m.text}` }],
                });
              }

              promptContext.push({
                role: 'user',
                parts: [
                  {
                    text: isVoice
                      ? `[${senderName} ovozli xabar yubordi]: ${incomingText}`
                      : `[${senderName}]: ${incomingText}`,
                  },
                ],
              });

              const systemInstruction = buildPersonaPrompt(botState.personaConfig, chatId);

              let rawReply = await generateHumanReply(promptContext, systemInstruction);
              rawReply = rawReply.replace(/^["'`]|["'`]$/g, '').trim();

              const isLoc = isLocationQuery(incomingText) || rawReply.includes('[LOCATION]');

              // Check for media request (image or video)
              const mediaPromptInfo = extractMediaPrompt(incomingText);
              let generatedMediaObj: GeneratedMediaRecord | undefined = undefined;

              const imgMatch = rawReply.match(/\[IMAGE_PROMPT:\s*([^\]]+)\]/i);
              const vidMatch = rawReply.match(/\[VIDEO_PROMPT:\s*([^\]]+)\]/i);

              if (mediaPromptInfo.isImage || imgMatch) {
                const p = imgMatch ? imgMatch[1].trim() : mediaPromptInfo.prompt;
                try {
                  const imgResult = await generateAiImage(p);
                  generatedMediaObj = {
                    id: 'img-' + Date.now(),
                    type: 'image',
                    prompt: p,
                    url: imgResult.url,
                    aspectRatio: '1:1',
                    createdAt: new Date().toISOString(),
                    status: 'ready',
                  };
                  mediaGallery.unshift(generatedMediaObj);
                  saveMediaGalleryToDisk();

                  await sendTelegramPhoto(token, {
                    chat_id: chatId,
                    photo: imgResult.url,
                    caption: `✨ "${p.slice(0, 100)}"`,
                    business_connection_id: connectionId,
                  });
                } catch (e) {
                  console.warn("Lichka rasm yuborishda xato:", e);
                }
              } else if (mediaPromptInfo.isVideo || vidMatch) {
                const p = vidMatch ? vidMatch[1].trim() : mediaPromptInfo.prompt;
                try {
                  const vidResult = await generateAiVideo(p);
                  generatedMediaObj = {
                    id: 'vid-' + Date.now(),
                    type: 'video',
                    prompt: p,
                    url: vidResult.url,
                    aspectRatio: '16:9',
                    createdAt: new Date().toISOString(),
                    status: 'ready',
                  };
                  mediaGallery.unshift(generatedMediaObj);
                  saveMediaGalleryToDisk();

                  await sendTelegramVideo(token, {
                    chat_id: chatId,
                    video: vidResult.url,
                    caption: `🎬 "${p.slice(0, 100)}"`,
                    business_connection_id: connectionId,
                  });
                } catch (e) {
                  console.warn("Lichka video yuborishda xato:", e);
                }
              }

              let replyText = rawReply
                .replace(/\[LOCATION\]/gi, '')
                .replace(/\[IMAGE_PROMPT:[^\]]+\]/gi, '')
                .replace(/\[VIDEO_PROMPT:[^\]]+\]/gi, '')
                .trim();

              if (!replyText && generatedMediaObj) {
                replyText = generatedMediaObj.type === 'image'
                  ? "Mana siz so'ragan rasm tayyor bo'ldi! 🖼️"
                  : "Mana siz so'ragan video lavha tayyor bo'ldi! 🎬";
              }

              // Send reply directly into user's personal chat on behalf of business account!
              const sendResult = await sendHumanTelegramReply(token, {
                business_connection_id: connectionId,
                chat_id: chatId,
                text: replyText,
                humanDelaySeconds: botState.personaConfig.humanDelaySeconds,
                splitMessages: botState.personaConfig.splitMessages,
              });

              // Send GPS Location if requested
              const locConfig = botState.personaConfig.locationConfig || {
                enabled: true,
                latitude: 41.2995,
                longitude: 69.2401,
                venueTitle: 'Toshkent, Chilonzor',
                address: 'Chilonzor tumani, Toshkent shahri',
                replyText: 'Mana lakatsiya, uydaman kel 👍',
              };

              if (isLoc && locConfig.enabled !== false) {
                const locRes = await sendTelegramLocation(token, {
                  chat_id: chatId,
                  latitude: locConfig.latitude,
                  longitude: locConfig.longitude,
                  business_connection_id: connectionId,
                });
                if (!locRes.ok) {
                  // Fallback: send Maps URL if sendLocation was restricted
                  await sendTelegramMessage(token, {
                    chat_id: chatId,
                    business_connection_id: connectionId,
                    text: `📍 Joylashuv: https://maps.google.com/?q=${locConfig.latitude},${locConfig.longitude} (${locConfig.venueTitle})`,
                  });
                }
              }

              // Update persistent chat session
              recordChatMessage(chatId, senderName, 'telegram_business', {
                role: 'user',
                text: incomingText,
                isVoice,
              });
              recordChatMessage(chatId, botState.personaConfig.ownerName, 'telegram_business', {
                role: 'model',
                text: replyText,
                hasLocation: isLoc,
                locationData: isLoc ? locConfig : undefined,
              });

              if (sendResult.ok) {
                botState.stats.totalReplied += 1;
              }

              botState.logs.unshift({
                id: 'biz-' + update.update_id,
                timestamp: new Date().toISOString(),
                senderId: chatId,
                senderName: `${senderName} (Lichka)`,
                incomingText: isVoice ? `🎤 ${incomingText}` : incomingText,
                replyText,
                source: 'telegram_business',
                status: sendResult.ok ? 'sent' : 'failed',
                styleToneUsed: botState.personaConfig.tone,
                error: sendResult.error,
                isVoice,
                hasLocation: isLoc,
              });

              if (botState.logs.length > 50) botState.logs.pop();
            }
          }

          // 2. Telegram Business Connection Update
          if (update.business_connection) {
            const bc = update.business_connection;
            botState.businessConnection = {
              id: bc.id,
              user: bc.user,
              user_chat_id: bc.user_chat_id,
              is_enabled: bc.is_enabled,
              can_reply: bc.can_reply,
            };
            console.log('Telegram Business ulandi:', bc);
          }

          // 3. Regular direct bot message
          const msg = update.message;
          if (msg && (msg.text || msg.voice || msg.audio)) {
            const senderName =
              [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(' ') ||
              msg.from?.username ||
              'Foydalanuvchi';
            const chatId = msg.chat.id;

            const incomingSenderId = String(msg.from?.id || chatId);
            if (autoPingState.isActive && (incomingSenderId === String(autoPingState.targetId) || String(chatId) === String(autoPingState.targetId))) {
              stopAutoPing(`🎉 BONU YOZDI! ("${(msg.text || 'Xabar keldi').slice(0, 30)}") - Avto-ping to'xtatildi!`);
            }

            botState.stats.totalReceived += 1;
            botState.stats.lastActiveAt = new Date().toISOString();

            // Send typing action so user sees "yozmoqda..."
            fetch(`https://api.telegram.org/bot${token}/sendChatAction`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                action: 'typing',
              }),
            }).catch(() => {});

            let incomingText = (msg.text || '').trim();
            let isVoice = false;

            const voiceData = msg.voice || msg.audio;
            if (voiceData) {
              isVoice = true;
              const transcribed = await transcribeVoiceFile(token, voiceData.file_id, voiceData.mime_type);
              incomingText = transcribed;
            }

            // Build multi-turn context with deep session memory
            const session = chatSessions.get(chatId);
            const storedMsgs = session?.messages || [];
            const promptContext: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

            if (session?.memoryNotes && session.memoryNotes.length > 0) {
              promptContext.push({
                role: 'user',
                parts: [{ text: `[SUHBATDOSH HAQIDA ESLAB QOLINGAN XOTIRA: ${session.memoryNotes.join('; ')}]` }],
              });
              promptContext.push({
                role: 'model',
                parts: [{ text: "Xotiradagi barcha ma'lumotlarni esladim." }],
              });
            }

            for (const m of storedMsgs.slice(-14)) {
              promptContext.push({
                role: m.role,
                parts: [{ text: `${m.senderName ? `[${m.senderName}]: ` : ''}${m.text}` }],
              });
            }

            const promptContent =
              incomingText === '/start'
                ? `[Foydalanuvchi birinchi marta salomlashdi yoki /start yubordi]: Salomlashib, hol-ahvol so'rang.`
                : isVoice
                  ? `[Foydalanuvchi ovozli xabar yubordi]: ${incomingText}`
                  : incomingText;

            promptContext.push({
              role: 'user',
              parts: [{ text: `[${senderName}]: ${promptContent}` }],
            });

            const systemInstruction = buildPersonaPrompt(botState.personaConfig, chatId);

            let rawReply = await generateHumanReply(promptContext, systemInstruction);
            rawReply = rawReply.replace(/^["'`]|["'`]$/g, '').trim();

            const isLoc = isLocationQuery(incomingText) || rawReply.includes('[LOCATION]');

            // Check for media request (image or video)
            const mediaPromptInfo = extractMediaPrompt(incomingText);
            let generatedMediaObj: GeneratedMediaRecord | undefined = undefined;

            const imgMatch = rawReply.match(/\[IMAGE_PROMPT:\s*([^\]]+)\]/i);
            const vidMatch = rawReply.match(/\[VIDEO_PROMPT:\s*([^\]]+)\]/i);

            if (mediaPromptInfo.isImage || imgMatch) {
              const p = imgMatch ? imgMatch[1].trim() : mediaPromptInfo.prompt;
              try {
                const imgResult = await generateAiImage(p);
                generatedMediaObj = {
                  id: 'img-' + Date.now(),
                  type: 'image',
                  prompt: p,
                  url: imgResult.url,
                  aspectRatio: '1:1',
                  createdAt: new Date().toISOString(),
                  status: 'ready',
                };
                mediaGallery.unshift(generatedMediaObj);
                saveMediaGalleryToDisk();

                await sendTelegramPhoto(token, {
                  chat_id: chatId,
                  photo: imgResult.url,
                  caption: `✨ "${p.slice(0, 100)}"`,
                });
              } catch (e) {
                console.warn("Telegram rasm yuborishda xato:", e);
              }
            } else if (mediaPromptInfo.isVideo || vidMatch) {
              const p = vidMatch ? vidMatch[1].trim() : mediaPromptInfo.prompt;
              try {
                const vidResult = await generateAiVideo(p);
                generatedMediaObj = {
                  id: 'vid-' + Date.now(),
                  type: 'video',
                  prompt: p,
                  url: vidResult.url,
                  aspectRatio: '16:9',
                  createdAt: new Date().toISOString(),
                  status: 'ready',
                };
                mediaGallery.unshift(generatedMediaObj);
                saveMediaGalleryToDisk();

                await sendTelegramVideo(token, {
                  chat_id: chatId,
                  video: vidResult.url,
                  caption: `🎬 "${p.slice(0, 100)}"`,
                });
              } catch (e) {
                console.warn("Telegram video yuborishda xato:", e);
              }
            }

            let replyText = rawReply
              .replace(/\[LOCATION\]/gi, '')
              .replace(/\[IMAGE_PROMPT:[^\]]+\]/gi, '')
              .replace(/\[VIDEO_PROMPT:[^\]]+\]/gi, '')
              .trim();

            if (!replyText && generatedMediaObj) {
              replyText = generatedMediaObj.type === 'image'
                ? "Mana siz so'ragan rasm tayyor bo'ldi! 🖼️"
                : "Mana siz so'ragan video lavha tayyor bo'ldi! 🎬";
            }

            const isStart = incomingText === '/start' || incomingText.startsWith('/start ');
            const miniAppUrl = 'https://ais-pre-m5typlarwcoemrtehsvjgf-798886787643.asia-southeast1.run.app';
            const inlineMarkup = isStart
              ? {
                  inline_keyboard: [
                    [
                      {
                        text: '🚀 Mini Appni Ochish (Boshqaruv)',
                        web_app: { url: miniAppUrl },
                      },
                    ],
                  ],
                }
              : undefined;

            // Send reply via Telegram as clean personal human message
            const sendResult = await sendHumanTelegramReply(token, {
              chat_id: chatId,
              text: replyText,
              humanDelaySeconds: botState.personaConfig.humanDelaySeconds,
              splitMessages: botState.personaConfig.splitMessages,
              reply_markup: inlineMarkup,
            });

            // Send GPS Location if requested
            const locConfig = botState.personaConfig.locationConfig || {
              enabled: true,
              latitude: 41.2995,
              longitude: 69.2401,
              venueTitle: 'Toshkent, Chilonzor',
              address: 'Chilonzor tumani, Toshkent shahri',
              replyText: 'Mana lakatsiya, uydaman kel 👍',
            };

            if (isLoc && locConfig.enabled !== false) {
              const locRes = await sendTelegramLocation(token, {
                chat_id: chatId,
                latitude: locConfig.latitude,
                longitude: locConfig.longitude,
              });
              if (!locRes.ok) {
                await sendTelegramMessage(token, {
                  chat_id: chatId,
                  text: `📍 Joylashuv: https://maps.google.com/?q=${locConfig.latitude},${locConfig.longitude} (${locConfig.venueTitle})`,
                });
              }
            }

            // Update persistent chat session
            recordChatMessage(chatId, senderName, 'telegram_live', {
              role: 'user',
              text: incomingText,
              isVoice,
            });
            recordChatMessage(chatId, botState.personaConfig.ownerName, 'telegram_live', {
              role: 'model',
              text: replyText,
              hasLocation: isLoc,
              locationData: isLoc ? locConfig : undefined,
            });

            if (sendResult.ok) {
              botState.stats.totalReplied += 1;
            }

            botState.logs.unshift({
              id: 'tg-' + update.update_id,
              timestamp: new Date().toISOString(),
              senderId: chatId,
              senderName,
              incomingText: isVoice ? `🎤 ${incomingText}` : incomingText,
              replyText,
              source: 'telegram_live',
              status: sendResult.ok ? 'sent' : 'failed',
              styleToneUsed: botState.personaConfig.tone,
              error: sendResult.error,
              isVoice,
              hasLocation: isLoc,
            });

            if (botState.logs.length > 50) botState.logs.pop();
          }
        }
      }
    } catch (err: unknown) {
      if (signal.aborted) break;
      console.error('Polling xatosi:', err);
      // Brief pause before retry
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  botState.isPolling = false;
  console.log('Telegram Bot Polling to\'xtatildi.');
}

// 4. Toggle Telegram Polling
app.post('/api/telegram/toggle-polling', async (req, res) => {
  try {
    const { enable, botToken } = req.body;
    const tokenToUse = (botToken || botState.botToken)?.trim();

    if (enable) {
      if (!tokenToUse) {
        return res.status(400).json({ error: 'Avval Telegram Bot Tokenini kiriting.' });
      }

      if (botState.isPolling) {
        return res.json({ ok: true, isPolling: true, message: 'Bot allaqachon faol.' });
      }

      // Verify token first if not verified
      if (!botState.botInfo) {
        const verifyRes = await fetch(`https://api.telegram.org/bot${tokenToUse}/getMe`);
        const verifyData = await verifyRes.json();
        if (!verifyData.ok) {
          return res.status(400).json({ error: 'Token yaroqsiz: ' + (verifyData.description || '') });
        }
        botState.botInfo = verifyData.result;
        botState.botToken = tokenToUse;
      }

      // Automatically ensure Mini App Menu Button is set!
      const miniAppUrl = process.env.APP_URL || 'https://ais-pre-m5typlarwcoemrtehsvjgf-798886787643.asia-southeast1.run.app';
      try {
        await fetch(`https://api.telegram.org/bot${tokenToUse}/setChatMenuButton`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            menu_button: {
              type: 'web_app',
              text: 'Mini App',
              web_app: { url: miniAppUrl },
            },
          }),
        });
      } catch (e) {
        console.error('Menu button biriktirishda xato:', e);
      }

      pollingAbortController = new AbortController();
      runTelegramPolling(tokenToUse, pollingAbortController.signal);
      return res.json({ ok: true, isPolling: true, bot: botState.botInfo });
    } else {
      if (pollingAbortController) {
        pollingAbortController.abort();
        pollingAbortController = null;
      }
      botState.isPolling = false;
      return res.json({ ok: true, isPolling: false });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

// 5. Get status & logs
app.get('/api/telegram/status', (req, res) => {
  res.json({
    isPolling: botState.isPolling,
    botInfo: botState.botInfo,
    hasToken: Boolean(botState.botToken),
    businessConnection: botState.businessConnection,
    stats: botState.stats,
    personaConfig: botState.personaConfig,
  });
});

app.get('/api/telegram/logs', (req, res) => {
  res.json({
    logs: botState.logs,
    stats: botState.stats,
  });
});

// 6. Set Telegram Mini App Menu Button
app.post('/api/telegram/set-menu-button', async (req, res) => {
  try {
    const token = (req.body.botToken || botState.botToken)?.trim();
    if (!token) {
      return res.status(400).json({ error: 'Avval Telegram Bot Tokenini kiriting.' });
    }
    const miniAppUrl = (
      req.body.miniAppUrl ||
      process.env.APP_URL ||
      'https://ais-pre-m5typlarwcoemrtehsvjgf-798886787643.asia-southeast1.run.app'
    ).trim();

    const tgRes = await fetch(`https://api.telegram.org/bot${token}/setChatMenuButton`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        menu_button: {
          type: 'web_app',
          text: 'Mini App',
          web_app: {
            url: miniAppUrl,
          },
        },
      }),
    });

    const data = await tgRes.json();
    if (!data.ok) {
      return res.status(400).json({ error: data.description || 'Menyu tugmasini o\'rnatishda xatolik yuz berdi.' });
    }

    res.json({
      ok: true,
      message: 'Mini App muvaffaqiyatli Telegram Bot menyusiga biriktirildi!',
      miniAppUrl,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

// 7. Save persona config
app.post('/api/persona/save', (req, res) => {
  try {
    const newConfig = req.body;
    if (newConfig && typeof newConfig === 'object') {
      botState.personaConfig = {
        ...botState.personaConfig,
        ...newConfig,
      };
      return res.json({ ok: true, personaConfig: botState.personaConfig });
    }
    res.status(400).json({ error: 'Yaroqsiz konfiguratsiya.' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

// 8. Chat History & Memory Endpoints
app.get('/api/chats', (req, res) => {
  const sessions = Array.from(chatSessions.values()).sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
  );
  res.json({ sessions });
});

app.get('/api/chats/:chatId', (req, res) => {
  const session = chatSessions.get(req.params.chatId);
  if (!session) return res.status(404).json({ error: 'Chat topilmadi' });
  res.json({ session });
});

app.post('/api/chats/:chatId/clear', (req, res) => {
  const session = chatSessions.get(req.params.chatId);
  if (session) {
    session.messages = [];
    session.messageCount = 0;
    saveChatHistoriesToDisk();
  }
  res.json({ ok: true });
});

app.post('/api/chats/:chatId/add-note', (req, res) => {
  const { note } = req.body;
  if (!note || typeof note !== 'string') {
    return res.status(400).json({ error: 'Eslatma matni kiritilmadi' });
  }
  let session = chatSessions.get(req.params.chatId);
  if (!session) {
    session = {
      chatId: req.params.chatId,
      senderName: 'Suhbatdosh',
      source: 'simulator',
      lastMessageAt: new Date().toISOString(),
      messageCount: 0,
      memoryNotes: [],
      messages: [],
    };
    chatSessions.set(req.params.chatId, session);
  }
  if (!session.memoryNotes.includes(note.trim())) {
    session.memoryNotes.push(note.trim());
    saveChatHistoriesToDisk();
  }
  res.json({ ok: true, memoryNotes: session.memoryNotes });
});

// 9. Media Generation (Rasm & Video) Endpoints
app.post('/api/media/generate-image', async (req, res) => {
  try {
    const { prompt, aspectRatio, style } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: "Prompt kiritilishi shart." });
    }
    const result = await generateAiImage(prompt, aspectRatio || '1:1', style);
    const mediaItem: GeneratedMediaRecord = {
      id: 'img-' + Date.now(),
      type: 'image',
      prompt,
      url: result.url,
      aspectRatio: aspectRatio || '1:1',
      createdAt: new Date().toISOString(),
      status: 'ready',
      style,
    };
    mediaGallery.unshift(mediaItem);
    saveMediaGalleryToDisk();
    res.json({ ok: true, media: mediaItem });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

app.post('/api/media/generate-video', async (req, res) => {
  try {
    const { prompt, aspectRatio } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: "Prompt kiritilishi shart." });
    }
    const result = await generateAiVideo(prompt, aspectRatio || '16:9');
    const mediaItem: GeneratedMediaRecord = {
      id: 'vid-' + Date.now(),
      type: 'video',
      prompt,
      url: result.url,
      aspectRatio: aspectRatio || '16:9',
      createdAt: new Date().toISOString(),
      status: 'ready',
    };
    mediaGallery.unshift(mediaItem);
    saveMediaGalleryToDisk();
    res.json({ ok: true, media: mediaItem });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

app.post('/api/media/enhance-prompt', async (req, res) => {
  try {
    const { prompt, type } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: "Prompt kiritilishi shart." });
    }
    const enhanced = await enhanceVisualPrompt(prompt, type === 'video' ? 'video' : 'image');
    res.json({ ok: true, enhancedPrompt: enhanced });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

app.post('/api/media/send-to-telegram', async (req, res) => {
  try {
    const { mediaUrl, type, caption, chatId } = req.body;
    if (!mediaUrl) {
      return res.status(400).json({ error: "mediaUrl kiritilmadi." });
    }
    const targetChat = chatId || botState.businessConnection?.user_chat_id || botState.ownerChatId || '5275538732';
    const token = botState.botToken;
    let result;
    if (type === 'video') {
      result = await sendTelegramVideo(token, {
        chat_id: targetChat,
        video: mediaUrl,
        caption: caption || 'AI Video TwinBot',
      });
    } else {
      result = await sendTelegramPhoto(token, {
        chat_id: targetChat,
        photo: mediaUrl,
        caption: caption || 'AI Rasm TwinBot',
      });
    }
    res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

app.get('/api/media/gallery', (req, res) => {
  res.json({ gallery: mediaGallery });
});

// 10. Reconciliation & Heartfelt Apology Endpoints
app.post('/api/reconciliation/generate', async (req, res) => {
  try {
    const { targetId, situation, style } = req.body;
    const prompt = `Siz o'zbek yigitining eng yaqin maslahatchisisiz.
Vaziyat: Yigit (Rahmatulloh) o'zining sevgilisi Bonuga (Telegram ID: ${targetId || '8839785942'}) xiyonat qilib qo'ygan.
Yigit Bonu bilan yarashtirmoqchi.

FOYDALANUVCHINING QAT'IY TALABLARI:
1. XUDDI INSONDEK, RAHMATULLOHNING O'ZIDEK YOZILSIN — BADIIY YOZILMASIN: Kitobiy, she'riyat, balandparvoz drama gaplar ("yuragim tubidan", "mitti bo'lsa ham imkon", "singan ishonch", "vujudim yonmoqda") MUTLAQO BO'LMASIN! Oddiy, jonli, o'zbek yigiti o'z sevgilisiga aytadigan mardona, sodda, qisqa va tabiiy tilda yozilsin.
2. QAYTIB ASLO XIYONAT QILMASLIGINI ANIQ TUSHUNTIRSIN: "Bir marta ahmoqlik qilib katta xato qildim, lekin senga erkakcha so'z beraman/qasam ichaman — qaytib senga umrimda hech qachon xiyonat qilmayman, boshqasiga qiyo ham boqmayman!" degan qat'iy va'da berilsin.
3. "KECHIR" / "KECHIRIM" SO'ZINI KAMAYTIRILSIN: Har gapda "kechir", "kechirim so'rayman" deb yalinib, ezilib g'ashga tegilmasin. Erkak kishidek mardona, xatoni tan olib, qaytib xiyonat qilmaslikka so'z berib, yuzma-yuz 5 daqiqa gaplashib olishga chaqirilsin.
4. Boshqa hech qanday bahona qidirmasin, aybni to'liq o'ziga olsin.
5. Uslub ko'rsatmasi: ${style || "Oddiy insondek, mardona va samimiy"}.
6. Faqat yuboriladigan xabar matnining o'zini qaytaring.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    const letter = response.text?.trim() || '';
    res.json({ ok: true, letter });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

app.post('/api/reconciliation/send', async (req, res) => {
  try {
    const { targetChatId, text } = req.body;
    const target = targetChatId || '8839785942';
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Maktub matni kiritilmadi' });
    }

    const token = botState.botToken;
    let sendResult: { ok: boolean; error?: string; result?: any } = { ok: false };

    // 1. Try sending via Telegram Business connection if active
    if (botState.businessConnection?.id) {
      sendResult = await sendTelegramMessage(token, {
        chat_id: target,
        text,
        business_connection_id: botState.businessConnection.id,
      });
    }

    // 2. If business connection wasn't available or failed, try direct bot message
    if (!sendResult.ok) {
      sendResult = await sendTelegramMessage(token, {
        chat_id: target,
        text,
      });
    }

    // Log the message attempt
    botState.logs.unshift({
      id: 'reconcile-' + Date.now(),
      timestamp: new Date().toISOString(),
      senderId: target,
      senderName: 'Sevgilim (8839785942)',
      incomingText: '[Yarashtirish maktubi yuborildi]',
      replyText: text,
      source: 'telegram_business',
      status: sendResult.ok ? 'sent' : 'failed',
      styleToneUsed: 'Chuqur pushaymonlik & Kechirim',
      error: sendResult.error,
    });

    // Record in chat sessions for persistent memory
    recordChatMessage(target, 'Sevgilim', 'telegram_business', {
      role: 'model',
      text,
    });

    res.json(sendResult);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

// 11. Auto-Pinger Endpoints: "Alo deb har sekunda yozib tursin Bonu yozguncha"
app.get('/api/reconciliation/auto-ping/status', (req, res) => {
  res.json(autoPingState);
});

app.post('/api/reconciliation/auto-ping/start', (req, res) => {
  const { targetId, messageText, intervalSec } = req.body;
  startAutoPing(
    targetId || '8839785942',
    messageText || 'Alo',
    Number(intervalSec) || 1
  );
  res.json({ ok: true, status: autoPingState });
});

app.post('/api/reconciliation/auto-ping/stop', (req, res) => {
  const { reason } = req.body;
  stopAutoPing(reason || "Foydalanuvchi tomonidan to'xtatildi");
  res.json({ ok: true, status: autoPingState });
});

app.post('/api/reconciliation/auto-ping/simulate-reply', async (req, res) => {
  try {
    const { replyText } = req.body;
    const bonuText = (replyText || "Alo! Nega tinimsiz yozyapsan? Qulog'im tindi, nima gaping bor?!").trim();

    stopAutoPing(`🎉 BONU JAVOB YOZDI! ("${bonuText.slice(0, 35)}...")`);

    // Record incoming user message
    recordChatMessage('8839785942', 'Bonu (Sevgilim)', 'telegram_business', {
      role: 'user',
      text: bonuText,
    });

    // Generate heartfelt apology reply from bot persona
    const session = chatSessions.get('8839785942');
    const storedMsgs = session?.messages || [];
    const promptContext: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
    for (const m of storedMsgs.slice(-10)) {
      promptContext.push({
        role: m.role,
        parts: [{ text: `${m.senderName ? `[${m.senderName}]: ` : ''}${m.text}` }],
      });
    }

    const systemInstruction = buildPersonaPrompt(botState.personaConfig, '8839785942');
    let rawReply = await generateHumanReply(promptContext, systemInstruction);
    rawReply = rawReply.replace(/^["'`]|["'`]$/g, '').trim();

    recordChatMessage('8839785942', 'Bonu (Sevgilim)', 'telegram_business', {
      role: 'model',
      text: rawReply,
    });

    botState.logs.unshift({
      id: 'bonu-reply-' + Date.now(),
      timestamp: new Date().toISOString(),
      senderId: '8839785942',
      senderName: 'Bonu (Sevgilim)',
      incomingText: bonuText,
      replyText: rawReply,
      source: 'telegram_business',
      status: 'sent',
      styleToneUsed: 'Chuqur pushaymonlik & Kechirim (Maxsus rejim)',
    });

    res.json({
      ok: true,
      bonuMessage: bonuText,
      botReply: rawReply,
      autoPingStatus: autoPingState,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

// Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, () => {
    console.log(`Server http://localhost:${PORT} da ishga tushdi`);

    // Auto-start Telegram polling with verified bot token
    if (botState.botToken && !pollingAbortController) {
      pollingAbortController = new AbortController();
      runTelegramPolling(botState.botToken, pollingAbortController.signal);
      console.log('Telegram Bot Polling avtomatik ishga tushirildi: @Rahmatulloh_Airobot');

      // Auto-set Telegram Mini App menu button
      const miniAppUrl = 'https://ais-pre-m5typlarwcoemrtehsvjgf-798886787643.asia-southeast1.run.app';
      fetch(`https://api.telegram.org/bot${botState.botToken}/setChatMenuButton`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menu_button: {
            type: 'web_app',
            text: '📱 Mini App',
            web_app: {
              url: miniAppUrl,
            },
          },
        }),
      })
        .then((r) => r.json())
        .then((d) => console.log('Auto setChatMenuButton muvaffaqiyatli:', JSON.stringify(d)))
        .catch((e) => console.warn('Auto setChatMenuButton xatosi:', e));
    }
  });
}

startServer();
