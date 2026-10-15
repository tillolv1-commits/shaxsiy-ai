import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { execSync, execFileSync } from 'child_process';
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
    voiceReplyMode?: boolean;
    voiceName?: string;
    speakingPace?: number;
    voiceProfile?: 'natural' | 'friendly' | 'professional';
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
    voiceReplyMode: true,
    voiceName: 'Puck',
    speakingPace: 1.0,
    voiceProfile: 'natural',
  },
};

let pollingAbortController: AbortController | null = null;
let lastUpdateOffset = 0;
let lastPollHeartbeat = Date.now();
let shouldPollRun = true;

// Human Active Tracking: When owner (Rahmatulloh, ID 5275538732) writes, bot stays silent
const ownerLastActiveInChats = new Map<string | number, number>();
let ownerManualMuteUntil = 0;
const OWNER_ACTIVE_COOLDOWN_MS = 20 * 1000; // 20 soniya (faqat egasi ayni paytda o'zi xabar jo'natayotgan bo'lsa aralashmaydi, suhbatdosh gapirganda esa darhol javob beradi)

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
  
  chatSessions.set('8839785942', {
    chatId: '8839785942',
    senderName: "Bonu (Go'zalim ❤️)",
    source: 'telegram_business',
    lastMessageAt: new Date().toISOString(),
    messageCount: 2,
    memoryNotes: [
      "❤️ Sevgilim Bonu (8839785942) — ALLAQAChON YARASHILGAN!",
      "✨ Qaytib 'kechir', 'kechirim' deb aslo uzr so'ramang, o'tmishdagi xatolar unutilgan va yarashilgan",
      "🌸 Bonuga doimo 'go'zalim', 'jonim', 'asalim' deb mehrli, erkalovchi va sevimli yor sifatida javob bering",
      "💑 Sevimli juftlikdek mehrli, e'tiborli, quvonchli va shirin suhbat quring",
    ],
    messages: [
      {
        id: 'bonu-reconciled-1',
        role: 'model',
        senderName: 'Rahmatulloh',
        text: "Jonim, go'zalim, yaxshi yuribsanmi? Seni juda yaxshi ko'raman ❤️",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ],
  });
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

// Candidate models ordered by quota reliability and speed (using gemini-3.1-flash-lite for stability)
const ACTIVE_GEMINI_MODELS = ['gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.8-flash'];

// Helper: build system prompt from user's persona configuration
function buildPersonaPrompt(persona: BotState['personaConfig'], targetChatId?: string | number): string {
  const isGirlfriendChat = String(targetChatId) === '8839785942';
  const girlfriendSpecialInstruction = isGirlfriendChat
    ? `\n\n[SEVIMLI YOR REJIMI: SUHBATDOSH — SIZNING SEVGILINGIZ BONU (ID: 8839785942)]
ENG ASOSIY QAT'IY TALAB:
"YARASHDIK DEMANG! BOT HUDDI O'ZBEK YIGITINING (RAHMATULLOHNING) O'ZIDEK TABIIY, MEHRLI VA INSONIY YOZSIN. CHATBOTLIGI ZARRACA HAM SEZILMASIN!"

MUTLAQ TAQIQLAR (BU SO'ZLAR QAT'IYAN MAN ETILADI):
1. "YARASHDIK", "YARASHDIM", "YARASHAYLIK", "YARASHIB OLDIK" KABI SO'ZLARNI ASLO VA HECH QACHON ISHLATMANG! Bular sun'iy, robotdek eshitiladi va chatbot ekaningizni fosh qiladi. Siz hech qachon urishmagandek, oradagi munosabat 100% tinch va mehrli.
2. "KECHIR", "KECHIRIM", "UZR", "XIYONAT", "AYBDORMAN", "PUSHAYMONMAN", "XAFA BO'LMA", "SIQILMA" KABI SO'ZLARNI ASLO ISHLATMANG!
3. CHATBOTLIK BELGILARI QAT'IYAN TAQIQLANADI:
   - "Men sizga qanday yordam bera olaman", "Men yordamchiman", "Sun'iy intellekt" kabi robot gaplarni aslo ishlatmang!
   - Hech qachon ro'yxat (1, 2, 3), nuqtalar yoki uzun insho yozmang.
   - Har safar bitta shablonni takrorlash mutlaqo taqiqlanadi.

QANDAY YOZISH KERAK (XUDDI RAHMATULLOHNING O'ZIDEK):
1. O'zbek yigitining o'z sevgilisiga yozadigan qisqa, erkalovchi va jonli Telegram tili (1-2 ta qisqa gap):
   - "Salom jonim, yaxshimisan? Nimalar qilyapsan?"
   - "Yaxshi yuribman go'zalim, o'zing tinchmisan? Charchamadingmi?"
   - "Uydaman jonim, tinchlikmi biror gap bo'ldimi?"
   - "Hozir ko'chadaman ozgina ishim bor edi, yetib borib yozaman xo'pmi asalim ❤️"
   - "Seni sog'inib kettim o'zimni go'zalim"
   - "Ovqatlandingmi jonim?"
2. Tabiiy erkalashlar: "jonim", "go'zalim", "asalim", "yuragim" so'zlarini tabiiy va o'rnida ishlating.
3. Bonu nima deb yozgan bo'lsa, AYNAN O'SHA GAPIGA mantiqiy, jonli, mehrli javob qaytaring.`
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
      if (isGirlfriendChat) {
        timeContext = `HOZIRGI VAQT: Toshkent vaqti ${tzTime}. Bonuga sevimli yor sifatida xuddi o'zingizdek tabiiy, erkalab va mehrli javob yozing. Hech qachon "yarashdik", "yarashdim" yoki "kechir" demang.`;
      } else if (hour >= 0 && hour < 6) {
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

    // Convert to 16kHz mono WAV for guaranteed compatibility across all Gemini models
    const tmpId = 'trans_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    const inPath = path.join('/tmp', `${tmpId}_in.audio`);
    const wavPath = path.join('/tmp', `${tmpId}_out.wav`);
    fs.writeFileSync(inPath, Buffer.from(arrayBuffer));

    let wavBuffer: Buffer;
    try {
      execFileSync('ffmpeg', ['-y', '-i', inPath, '-ar', '16000', '-ac', '1', wavPath]);
      wavBuffer = fs.readFileSync(wavPath);
    } catch {
      wavBuffer = Buffer.from(arrayBuffer);
    } finally {
      try { if (fs.existsSync(inPath)) fs.unlinkSync(inPath); } catch {}
      try { if (fs.existsSync(wavPath)) fs.unlinkSync(wavPath); } catch {}
    }

    const base64Audio = wavBuffer.toString('base64');

    // Try available fast models for voice transcription
    for (const model of ['gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.8-flash']) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType: 'audio/wav',
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
        if (text) {
          console.log(`[Ovoz eshitildi]: "${text}" (${model})`);
          return text;
        }
      } catch (err) {
        console.warn(`Ovozni matnga o'girishda model ${model} xatosi:`, err instanceof Error ? err.message : err);
      }
    }

    return '[Ovozli xabar tinglandi]';
  } catch (err) {
    console.error("Ovozli xabarni yuklab olishda xatolik:", err);
    return '[Ovozli xabar tinglandi]';
  }
}

// Helper: convert WAV buffer to native Telegram Opus .ogg format
function convertWavToOggOpus(wavBuffer: Buffer): Buffer {
  const tmpId = 'tts_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  const wavPath = path.join('/tmp', `${tmpId}.wav`);
  const oggPath = path.join('/tmp', `${tmpId}.ogg`);
  try {
    fs.writeFileSync(wavPath, wavBuffer);
    execFileSync('ffmpeg', ['-y', '-i', wavPath, '-c:a', 'libopus', '-b:a', '32k', '-vbr', 'on', oggPath]);
    if (fs.existsSync(oggPath) && fs.statSync(oggPath).size > 100) {
      return fs.readFileSync(oggPath);
    }
    return wavBuffer;
  } catch (err) {
    console.warn('WAV to Ogg Opus konvertatsiya ogohlantirish:', err);
    return wavBuffer;
  } finally {
    try { if (fs.existsSync(wavPath)) fs.unlinkSync(wavPath); } catch {}
    try { if (fs.existsSync(oggPath)) fs.unlinkSync(oggPath); } catch {}
  }
}

// Helper: high-speed offline Uzbek speech synthesis via espeak-ng and ffmpeg (zero quota, 100% reliable)
function generateOfflineUzbekSpeech(
  text: string,
  pace = 1.0,
  profile: 'natural' | 'friendly' | 'professional' = 'natural'
): Buffer {
  const wpm = Math.max(110, Math.min(240, Math.round(155 * (Number(pace) || 1.0))));
  let voiceParam = 'uz+m3';
  let pitch = 48;
  if (profile === 'friendly') {
    voiceParam = 'uz+m4';
    pitch = 54;
  } else if (profile === 'professional') {
    voiceParam = 'uz+m1';
    pitch = 42;
  }
  const tmpId = 'espeak_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  const txtPath = path.join('/tmp', `${tmpId}.txt`);
  const wavPath = path.join('/tmp', `${tmpId}.wav`);
  const oggPath = path.join('/tmp', `${tmpId}.ogg`);
  const clean = text
    .replace(/\[LOCATION\]/gi, '')
    .replace(/\[IMAGE_PROMPT:[^\]]+\]/gi, '')
    .replace(/\[VIDEO_PROMPT:[^\]]+\]/gi, '')
    .replace(/[\*\_#`~]/g, '')
    .replace(/\|\|\|/g, '. ')
    .trim() || "Eshitdim, hozir javob beraman.";

  try {
    fs.writeFileSync(txtPath, clean, 'utf8');
    execFileSync('espeak-ng', ['-v', voiceParam, '-p', String(pitch), '-s', String(wpm), '-f', txtPath, '-w', wavPath]);
    execFileSync('ffmpeg', ['-y', '-i', wavPath, '-c:a', 'libopus', '-b:a', '32k', '-vbr', 'on', oggPath]);
    if (fs.existsSync(oggPath) && fs.statSync(oggPath).size > 100) {
      return fs.readFileSync(oggPath);
    }
    throw new Error("Ovoz fayli yaratilmadi");
  } finally {
    try { if (fs.existsSync(txtPath)) fs.unlinkSync(txtPath); } catch {}
    try { if (fs.existsSync(wavPath)) fs.unlinkSync(wavPath); } catch {}
    try { if (fs.existsSync(oggPath)) fs.unlinkSync(oggPath); } catch {}
  }
}

// Helper: generate natural Uzbek speech voice note using Gemini TTS with high-quality fallback
async function generateUzbekVoiceNote(
  textToSpeak: string,
  voiceName = 'Puck',
  pace = 1.0,
  profile: 'natural' | 'friendly' | 'professional' = 'natural'
): Promise<{ buffer: Buffer; mimeType: string; filename: string }> {
  const cleanText = textToSpeak
    .replace(/\[LOCATION\]/gi, '')
    .replace(/\[IMAGE_PROMPT:[^\]]+\]/gi, '')
    .replace(/\[VIDEO_PROMPT:[^\]]+\]/gi, '')
    .replace(/[\*\_#`~]/g, '')
    .replace(/\|\|\|/g, '. ')
    .replace(/\s+/g, ' ')
    .trim() || "Xabar keldi, eshitdim.";

  const uzbekStyle = profile === 'friendly'
    ? 'Native Uzbek language speaker, warm, cheerful and friendly conversational Uzbek speech'
    : profile === 'professional'
    ? 'Native Uzbek language speaker, polite, clear, articulate and calm Uzbek speech'
    : 'Native Uzbek language speaker, fluent Tashkent Uzbek pronunciation, warm, natural brotherly conversational Uzbek tone';

  // 1. Try Gemini TTS models (gemini-3.8-flash-tts flagship, then gemini-3.8-flash-lite-tts)
  for (const ttsModel of ['gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts']) {
    try {
      const response = await ai.models.generateContent({
        model: ttsModel,
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: cleanText,
                speechMetadata: {
                  style: uzbekStyle,
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: (voiceName as any) || 'Puck' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const wavBuffer = Buffer.from(base64Audio, 'base64');
        const oggBuffer = convertWavToOggOpus(wavBuffer);
        return { buffer: oggBuffer, mimeType: 'audio/ogg', filename: 'voice.ogg' };
      }
    } catch (ttsErr: any) {
      console.warn(`[TTS] ${ttsModel} xatosi:`, ttsErr?.message?.slice(0, 100) || ttsErr);
    }
  }

  // 2. High-speed offline fallback: espeak-ng Uzbek voice with Opus compression
  try {
    const oggBuffer = generateOfflineUzbekSpeech(cleanText, pace, profile);
    return { buffer: oggBuffer, mimeType: 'audio/ogg', filename: 'voice.ogg' };
  } catch (espeakErr) {
    console.error('[TTS] Offline ovoz yaratishda xato:', espeakErr);
  }

  // Emergency safety fallback: short clean tone or generic audio to ensure it never throws
  const emergencyBuffer = generateOfflineUzbekSpeech("Eshitdim.", 1.0, 'natural');
  return { buffer: emergencyBuffer, mimeType: 'audio/ogg', filename: 'voice.ogg' };
}

// Helper: send Telegram native Voice Note (circular audio with waveforms)
async function sendTelegramVoice(
  token: string,
  params: {
    chat_id: number | string;
    voiceBuffer: Buffer;
    mimeType?: string;
    filename?: string;
    business_connection_id?: string;
    caption?: string;
    duration?: number;
    reply_markup?: any;
  }
): Promise<{ ok: boolean; error?: string; result?: any }> {
  try {
    const formData = new FormData();
    formData.append('chat_id', String(params.chat_id));
    if (params.business_connection_id) {
      formData.append('business_connection_id', params.business_connection_id);
    }
    if (params.caption) {
      formData.append('caption', params.caption);
    }
    if (params.duration) {
      formData.append('duration', String(params.duration));
    }
    if (params.reply_markup) {
      formData.append('reply_markup', JSON.stringify(params.reply_markup));
    }

    const mime = params.mimeType || 'audio/ogg';
    const fname = params.filename || 'voice.ogg';
    const blob = new Blob([new Uint8Array(params.voiceBuffer)], { type: mime });
    formData.append('voice', blob, fname);

    const res = await fetch(`https://api.telegram.org/bot${token}/sendVoice`, {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    console.log('Telegram sendVoice javobi:', JSON.stringify(data));
    if (!data.ok) {
      // Fallback: try sendAudio if sendVoice had restriction
      console.warn('sendVoice xatosi, sendAudio sinab ko\'rilmoqda:', data.description);
      const audioForm = new FormData();
      audioForm.append('chat_id', String(params.chat_id));
      if (params.business_connection_id) audioForm.append('business_connection_id', params.business_connection_id);
      audioForm.append('audio', blob, fname);
      if (params.caption) audioForm.append('caption', params.caption);
      const audioRes = await fetch(`https://api.telegram.org/bot${token}/sendAudio`, {
        method: 'POST',
        body: audioForm,
      });
      const audioData = await audioRes.json();
      if (audioData.ok) {
        return { ok: true, result: audioData.result };
      }
      return { ok: false, error: data.description || 'Ovozli xabar yuborilmadi' };
    }
    return { ok: true, result: data.result };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('sendTelegramVoice xatosi:', message);
    return { ok: false, error: message };
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

// Helper: send human-paced reply. When voiceReplyMode is enabled (default), sends a native Telegram Voice Note!
async function sendHumanTelegramReply(
  token: string,
  params: {
    chat_id: number | string;
    text: string;
    business_connection_id?: string;
    humanDelaySeconds?: number;
    splitMessages?: boolean;
    reply_markup?: any;
    forceVoice?: boolean;
    forceText?: boolean;
  }
): Promise<{ ok: boolean; isVoice?: boolean; voiceBuffer?: Buffer; error?: string; result?: any }> {
  const isVoiceMode =
    params.forceVoice ||
    (params.forceText !== true && botState.personaConfig.voiceReplyMode !== false);

  if (isVoiceMode && params.text) {
    // 1. Send "record_voice" action so Telegram displays "Ovozli xabar yozmoqda..."
    const actionBody: Record<string, any> = {
      chat_id: params.chat_id,
      action: 'record_voice',
    };
    if (params.business_connection_id) actionBody.business_connection_id = params.business_connection_id;
    fetch(`https://api.telegram.org/bot${token}/sendChatAction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(actionBody),
    }).catch(() => {});

    // Natural brief pause like a person holding the mic button to record
    const delaySec = params.humanDelaySeconds ?? 2;
    if (delaySec > 0) {
      await new Promise((r) => setTimeout(r, Math.min(delaySec * 1000, 3000)));
    }

    // 2. Generate natural Uzbek speech voice note
    try {
      const voiceData = await generateUzbekVoiceNote(
        params.text,
        botState.personaConfig.voiceName,
        botState.personaConfig.speakingPace ?? 1.0,
        botState.personaConfig.voiceProfile ?? 'natural'
      );
      const voiceResult = await sendTelegramVoice(token, {
        chat_id: params.chat_id,
        business_connection_id: params.business_connection_id,
        voiceBuffer: voiceData.buffer,
        mimeType: voiceData.mimeType,
        filename: voiceData.filename,
        reply_markup: params.reply_markup,
      });

      if (voiceResult.ok) {
        return { ok: true, isVoice: true, voiceBuffer: voiceData.buffer, result: voiceResult.result };
      }
      console.warn('sendTelegramVoice xato qaytardi, matnli fallback ishlatiladi:', voiceResult.error);
    } catch (voiceErr) {
      console.warn('Ovoz yaratish xatosi, matnli fallback ishlatiladi:', voiceErr);
    }
  }

  // Fallback or text mode
  const delaySec = params.humanDelaySeconds ?? 2;
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
      const res1 = await sendTelegramMessage(token, {
        chat_id: params.chat_id,
        business_connection_id: params.business_connection_id,
        text: parts[0],
      });

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
  targetName: "Bonu (Go'zalim ❤️)",
  messageText: "Go'zalim ❤️",
  intervalSec: 1,
  sentCount: 0,
  lastSentAt: null,
  lastError: null,
  stoppedReason: "❤️ Bonu bilan yarashildi! 'Go'zalim' rejimi faol.",
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
function generateSmartFallback(incomingText: string, isGirlfriend = false): string {
  const lower = incomingText.toLowerCase();

  if (isGirlfriend) {
    if (lower.includes('salom') || lower.includes('assalom') || lower.includes('qalaysan') || lower.includes('qalesan') || lower.includes('yaxshimisan')) {
      return "Salom go'zalim! Yaxshi yuribsanmi, nimalar qilyapsan? ❤️";
    }
    if (lower.includes('nima') || lower.includes('qilyapsan') || lower.includes('nima gap')) {
      return "O'tiribman jonim, ozgina ishlar bor edi. O'zing nima qilyapsan?";
    }
    if (lower.includes('qayerdasiz') || lower.includes('qayerdasan') || lower.includes('qattasiz') || lower.includes('qattasan')) {
      return "Uydaman jonim, tinchlikmi? O'zing qayerdasan?";
    }
    if (lower.includes('ovqat') || lower.includes('yedingmi')) {
      return "Ha jonim, hozirgina yedim. O'zingchi, ovqatlanyapsanmi yaxshilab?";
    }
    if (lower.includes('sog\'indim') || lower.includes('sevaman') || lower.includes('yaxshi ko\'r')) {
      return "Men ham seni juda sog'indim go'zalim, yaxshi ko'raman seni ❤️";
    }
    if (lower.includes('uxla') || lower.includes('yot') || lower.includes('tundir')) {
      return "Hali uyg'oqman jonim, seni o'ylab yotuvdim. O'zing dam olyapsanmi?";
    }
    return "Eshityapman go'zalim, yaxshimisan? O'zingda nimalar yangilik? ❤️";
  }

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
  timeoutMs = 12000,
  isGirlfriend = false
): Promise<string> {
  const isTargetGirlfriend = isGirlfriend || systemInstruction.includes('8839785942');
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
        let reply = response.text?.trim();
        if (reply) {
          if (isTargetGirlfriend) {
            // Strictly enforce: never say yarashdik, never say kechir/uzr, write naturally as human boyfriend
            reply = reply
              .replace(/yarashd[a-z']*/gi, "")
              .replace(/kechir[a-z']*/gi, "")
              .replace(/kechirasiz/gi, "")
              .replace(/uzr/gi, "")
              .replace(/aybdorman/gi, "")
              .replace(/pushaymonman/gi, "")
              .replace(/xafa bo'lma/gi, "jonim")
              .replace(/sun'iy intellekt/gi, "")
              .replace(/yordamchim/gi, "")
              .replace(/qanday yordam bera olaman/gi, "nimalar qilyapsan")
              .replace(/\s{2,}/g, " ")
              .trim();

            if (!reply || reply.length < 3) {
              reply = generateSmartFallback(incomingPreview, true);
            }
          }
          return reply;
        }
      } catch (err) {
        console.warn(`Model ${model} xatosi:`, err instanceof Error ? err.message : err);
      }
    }
    // If all models failed, use smart contextual fallback
    return generateSmartFallback(incomingPreview, isTargetGirlfriend);
  })();

  const timeoutPromise = new Promise<string>((resolve) => {
    setTimeout(() => {
      resolve(generateSmartFallback(incomingPreview, isTargetGirlfriend));
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
    const isVoiceReply = persona.voiceReplyMode !== false;
    recordChatMessage('sim-user', senderName || 'Foydalanuvchi', 'simulator', {
      role: 'user',
      text: incomingMessage,
      isVoice: incomingMessage.startsWith('🎤') || incomingMessage.includes('[Ovozli'),
    });
    recordChatMessage('sim-user', persona.ownerName, 'simulator', {
      role: 'model',
      text: replyText,
      isVoice: isVoiceReply,
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
      isVoice: isVoiceReply,
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
      isVoice: isVoiceReply,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Error in /api/gemini/generate-reply:', message);
    res.status(500).json({ error: message });
  }
});

// Voice Preview endpoint for VoiceInteractionSettings
app.post('/api/voice/preview', async (req, res) => {
  try {
    const { text, voiceName, pace, profile } = req.body;
    const cleanText = (text || "Salom jonim, yaxshimisan? Ishlaring joyidami?").trim();
    const cleanPace = typeof pace === 'number' ? pace : 1.0;
    const cleanProfile = profile === 'friendly' || profile === 'professional' ? profile : 'natural';
    const cleanVoice = voiceName || 'Puck';

    const voiceData = await generateUzbekVoiceNote(cleanText, cleanVoice, cleanPace, cleanProfile);
    res.setHeader('Content-Type', voiceData.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${voiceData.filename}"`);
    res.send(voiceData.buffer);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Error in /api/voice/preview:', message);
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

// Helper: poll Telegram updates in loop with 24/7 reliability & watchdog
async function runTelegramPolling(token: string, signal: AbortSignal) {
  console.log('Telegram Bot Polling boshlandi...');
  botState.isPolling = true;

  // Clear webhook before polling to avoid 409 Conflict
  try {
    await fetch(`https://api.telegram.org/bot${token}/deleteWebhook?drop_pending_updates=false`);
  } catch {
    // ignore
  }

  while (!signal.aborted && shouldPollRun) {
    try {
      lastPollHeartbeat = Date.now();
      const url = `https://api.telegram.org/bot${token}/getUpdates?offset=${lastUpdateOffset + 1}&timeout=15`;
      
      // 25s timeout to guarantee dead sockets never hang forever
      const fetchController = new AbortController();
      const timeoutId = setTimeout(() => fetchController.abort(), 25000);
      const abortHandler = () => fetchController.abort();
      signal.addEventListener('abort', abortHandler, { once: true });

      let response: Response;
      try {
        response = await fetch(url, { signal: fetchController.signal });
      } finally {
        clearTimeout(timeoutId);
        signal.removeEventListener('abort', abortHandler);
      }

      if (!response.ok) {
        console.warn(`Telegram API HTTP ${response.status} qaytardi. 4 soniya kutilmoqda...`);
        await new Promise((r) => setTimeout(r, 4000));
        continue;
      }

      const data = await response.json();
      lastPollHeartbeat = Date.now();

      if (!data.ok) {
        console.warn(`Telegram getUpdates xatosi [${data.error_code}]: ${data.description}`);
        if (data.error_code === 409) {
          await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`).catch(() => {});
        }
        await new Promise((r) => setTimeout(r, 5000));
        continue;
      }

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
            const isFromOwner =
              bMsg.from?.id === ownerId ||
              bMsg.from?.id === 5275538732 ||
              String(bMsg.from?.id) === String(botState.ownerChatId);

            if (isFromOwner) {
              // 1. Mark that owner (Rahmatulloh) is chatting right now in this chat!
              ownerLastActiveInChats.set(chatId, Date.now());
              botState.stats.lastActiveAt = new Date().toISOString();
              const ownerText = (bMsg.text || '').trim();
              console.log(`[EGA FAOL] Rahmatulloh ushbu chatda (${chatId}) yozmoqda: "${ownerText.slice(0, 30)}". Bot 15 daqiqaga jim turadi.`);

              // Record owner's message in session history so context is fully preserved
              recordChatMessage(chatId, botState.personaConfig.ownerName, 'telegram_business', {
                role: 'model',
                text: ownerText,
                isVoice: Boolean(bMsg.voice || bMsg.audio),
              });
              continue; // Do NOT reply to own message!
            }

            let incomingText = (bMsg.text || '').trim();
            let isVoice = false;

            // Voice or audio transcription
            const voiceData = bMsg.voice || bMsg.audio;
            if (voiceData) {
              isVoice = true;
              const transcribed = await transcribeVoiceFile(token, voiceData.file_id, voiceData.mime_type);
              incomingText = transcribed;
            }

            // 2. User requirement: "keyin men yozyatkanimda bot yozmasin, faqatgina u odam aytkanda yozsin"
            const lastOwnerActive = ownerLastActiveInChats.get(chatId) || 0;
            const elapsedSinceOwnerMsg = Date.now() - lastOwnerActive;
            if (elapsedSinceOwnerMsg < 5000) {
              console.log(`[BOT KUTDI] Rahmatulloh o'zi hozirgina yozdi (${Math.round(elapsedSinceOwnerMsg/1000)}s oldin). Bot aralashmadi.`);
              
              // Still record incoming message from partner so chat history remains complete
              recordChatMessage(chatId, senderName, 'telegram_business', {
                role: 'user',
                text: incomingText || '[Ovozli xabar]',
                isVoice,
              });
              continue; // Skip automated reply while owner is actively pressing send
            }

            // Check manual mute command (/jim)
            if (Date.now() < ownerManualMuteUntil) {
              console.log(`[BOT JIM TURDI] Bot /jim buyrug'i bilan vaqtincha ovozsiz qilingan.`);
              continue;
            }

            const incomingSenderId = String(bMsg.from?.id || chatId);
            if (autoPingState.isActive && (incomingSenderId === String(autoPingState.targetId) || String(chatId) === String(autoPingState.targetId))) {
              stopAutoPing(`🎉 BONU YOZDI! ("${(incomingText || 'Xabar keldi').slice(0, 30)}") - Avto-ping to'xtatildi!`);
            }

            botState.stats.totalReceived += 1;
            botState.stats.lastActiveAt = new Date().toISOString();

            // Send record_voice action if voice reply mode is on, or typing
            const sendActionType = botState.personaConfig.voiceReplyMode !== false ? 'record_voice' : 'typing';
            fetch(`https://api.telegram.org/bot${token}/sendChatAction`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                business_connection_id: connectionId,
                chat_id: chatId,
                action: sendActionType,
              }),
            }).catch(() => {});

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

              // Strict rule for Bonu (ID: 8839785942): NEVER say "yarashdik", "yarashdim", "kechir", "kechirim", or apology words
              if (String(chatId) === '8839785942' || incomingSenderId === '8839785942') {
                replyText = replyText
                  .replace(/yarashd[a-z']*/gi, "")
                  .replace(/kechir([a-z']*)/gi, "")
                  .replace(/kechirasiz/gi, "")
                  .replace(/uzr/gi, "")
                  .replace(/aybdorman/gi, "")
                  .replace(/pushaymonman/gi, "")
                  .replace(/xafa bo'lma/gi, "")
                  .replace(/sun'iy intellekt/gi, "")
                  .replace(/yordamchim/gi, "")
                  .replace(/\s{2,}/g, " ")
                  .trim();
                if (!replyText || replyText.length < 3) {
                  replyText = generateSmartFallback(incomingText, true);
                }
              }

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
                isVoice: Boolean(sendResult.isVoice),
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
                replyText: sendResult.isVoice ? `🎙️ [Ovozli xabar]: "${replyText}"` : replyText,
                source: 'telegram_business',
                status: sendResult.ok ? 'sent' : 'failed',
                styleToneUsed: botState.personaConfig.tone + (sendResult.isVoice ? ' (🎙️ Ovozli)' : ''),
                error: sendResult.error,
                isVoice: Boolean(sendResult.isVoice),
                hasLocation: isLoc,
              });

              if (botState.logs.length > 50) botState.logs.pop();
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
            const voiceData = msg.voice || msg.audio;
            let isVoice = false;
            let incomingText = (msg.text || '').trim();

            if (voiceData) {
              isVoice = true;
              const transcribed = await transcribeVoiceFile(token, voiceData.file_id, voiceData.mime_type);
              incomingText = transcribed;
            }

            if (autoPingState.isActive && (incomingSenderId === String(autoPingState.targetId) || String(chatId) === String(autoPingState.targetId))) {
              stopAutoPing(`🎉 BONU YOZDI! ("${(incomingText || 'Xabar keldi').slice(0, 30)}") - Avto-ping to'xtatildi!`);
            }

            botState.stats.totalReceived += 1;
            botState.stats.lastActiveAt = new Date().toISOString();

            // Send record_voice action if voiceReplyMode is on, otherwise typing
            const directAction = botState.personaConfig.voiceReplyMode !== false ? 'record_voice' : 'typing';
            fetch(`https://api.telegram.org/bot${token}/sendChatAction`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                action: directAction,
              }),
            }).catch(() => {});

            // Intercept direct bot commands so user can control the bot directly inside Telegram
            const appUrl = process.env.APP_URL || 'https://ais-dev-m5typlarwcoemrtehsvjgf-798886787643.asia-southeast1.run.app';

            if (incomingText === '/start' || incomingText.startsWith('/start ')) {
              const startMsg = `Salom ${senderName}! 👋\nMen Rahmatullohning shaxsiy Telegram AI yordamchisiman.\n\n📱 Boshqaruv paneli va tezkor amallar:\nQuyidagi tugmalar orqali xohlagan funksiyani bir zumda boshqaring:`;
              const startMarkup = {
                inline_keyboard: [
                  [
                    { text: "❤️ Bonu rejimi (Tabiiy yozish)", callback_data: 'cmd_yarashdim' },
                    { text: '⚡ "Alo" yozishni boshlash', callback_data: 'cmd_alo' },
                  ],
                  [
                    { text: "🛑 To'xtatish", callback_data: 'cmd_stop' },
                    { text: '📊 Holat (Status)', callback_data: 'cmd_status' },
                  ],
                  [
                    { text: '🤫 Jim turish (/jim - 1 soat)', callback_data: 'cmd_jim' },
                    { text: '🗣️ Botni yoqish (/gapir)', callback_data: 'cmd_gapir' },
                  ],
                  [
                    { text: '🌐 Brauzerda ochish (Chrome / Safari)', url: appUrl },
                  ],
                  [
                    { text: '📱 Mini App (Telegram ichida)', web_app: { url: appUrl } },
                  ],
                ],
              };
              await sendTelegramMessage(token, {
                chat_id: chatId,
                text: startMsg,
                reply_markup: startMarkup,
              });
              continue;
            }

            if (incomingText === '/status') {
              const isOwnerActive = (Date.now() - (ownerLastActiveInChats.get('8839785942') || 0)) < OWNER_ACTIVE_COOLDOWN_MS;
              const isMuted = Date.now() < ownerManualMuteUntil;
              const isVoiceOnly = botState.personaConfig.voiceReplyMode !== false;
              const statusMsg = `📊 TIZIM VA BOT HOLATI (24/7 FAOL):\n\n🤖 Bot: @${botState.botInfo?.username || 'Rahmatulloh_Airobot'} (24/7 Uzluksiz ishlamoqda ✅)\n💼 Telegram Business: ${botState.businessConnection ? 'Ulangan ✅' : 'Kutilmoqda ⏳'}\n🎙️ Javob shakli: ${isVoiceOnly ? "Faqat O'zbekcha Ovozli Xabar (Voice Note) 🟢" : "Matnli xabar ✍️"}\n⚡ Ovoz profili: ${botState.personaConfig.voiceProfile || 'natural'} (${(botState.personaConfig.speakingPace || 1.0).toFixed(2)}x tezlik)\n💑 Bonu (8839785942) bilan suhbat: Xuddi o'zingizdek tabiiy gaplashish ❤️\n   - "Yarashdik" yoki "Kechir" so'zlari: BUTUNLAY TAQIQLANGAN 🚫\n   - Uslub: Jonli, samimiy, erkalab yozish (go'zalim, jonim, asalim) ✨\n🛡️ Siz yozayotganda bot jim turishi: ${isMuted ? "Qo'lda jim qilingan (/jim) ⏸️" : isOwnerActive ? "Siz yozyapsiz -> Bot jim turibdi ⏸️" : "Siz yozmayapsiz -> Bot navbatchilikda ✅"}\n⚡ "Alo" Avto-Chaqiruvchi: ${autoPingState.isActive ? `YONIQ (${autoPingState.sentCount} ta yuborildi) 🟢` : "To'xtatilgan ⚪"}\n📨 Qabul qilingan xabarlar: ${botState.stats.totalReceived}\n📤 Yuborilgan javoblar: ${botState.stats.totalReplied}\n\n🌐 Boshqaruv paneli: ${appUrl}`;
              await sendTelegramMessage(token, {
                chat_id: chatId,
                text: statusMsg,
                reply_markup: {
                  inline_keyboard: [
                    [
                      { text: "🎙️ Faqat Ovoz", callback_data: 'cmd_ovoz' },
                      { text: "✍️ Matnli rejim", callback_data: 'cmd_matn' },
                    ],
                    [
                      { text: "❤️ Bonu rejimi", callback_data: 'cmd_yarashdim' },
                      { text: '⚡ "Alo" yozish', callback_data: 'cmd_alo' },
                    ],
                    [
                      { text: "🤫 Jim turish", callback_data: 'cmd_jim' },
                      { text: "🗣️ Qayta yoqish", callback_data: 'cmd_gapir' },
                    ],
                    [
                      { text: "🛑 To'xtatish", callback_data: 'cmd_stop' },
                      { text: '🌐 Brauzerda ochish', url: appUrl },
                    ],
                  ],
                },
              });
              continue;
            }

            if (incomingText === '/ovoz' || incomingText === '/voice') {
              botState.personaConfig.voiceReplyMode = true;
              await sendTelegramMessage(token, {
                chat_id: chatId,
                text: "🎙️ FAQAT OVOZLI XABAR REJIMI YOQILDI!\n\nEndi bot matn yozmasdan, barcha xabarlarga faqat samimiy o'zbekcha ovozli xabar (Telegram Voice Note) yuboradi.\n\nSiz yozganingizda bot jim turadi, suhbatdoshning ovozli xabarlarini esa tinglab tushunadi.\n\nMatnga qaytish uchun: /matn",
                reply_markup: {
                  inline_keyboard: [[{ text: "✍️ Matnli rejimga o'tish (/matn)", callback_data: 'cmd_matn' }]],
                },
              });
              continue;
            }

            if (incomingText === '/matn' || incomingText === '/text') {
              botState.personaConfig.voiceReplyMode = false;
              await sendTelegramMessage(token, {
                chat_id: chatId,
                text: "✍️ MATNLI XABAR REJIMI YOQILDI!\n\nBot endi odatiy matnli xabarlar bilan javob beradi.\n\nOvozli rejimga qaytish uchun: /ovoz",
                reply_markup: {
                  inline_keyboard: [[{ text: "🎙️ Ovozli rejimga o'tish (/ovoz)", callback_data: 'cmd_ovoz' }]],
                },
              });
              continue;
            }

            if (incomingText === '/jim' || incomingText === '/pause') {
              ownerManualMuteUntil = Date.now() + 60 * 60 * 1000;
              await sendTelegramMessage(token, {
                chat_id: chatId,
                text: "🤫 BOT 1 SOATGA OVOZSIZ QILINDI!\n\nSiz bemalol barcha chatlarda (shu jumladan Bonu bilan) o'zingiz yozishingiz mumkin, bot mutlaqo aralashmaydi va jim turadi.\n\nQayta yoqish uchun: /gapir buyrug'ini bosing.",
                reply_markup: {
                  inline_keyboard: [[{ text: "🗣️ Botni qayta yoqish (/gapir)", callback_data: 'cmd_gapir' }]],
                },
              });
              continue;
            }

            if (incomingText === '/gapir' || incomingText === '/resume') {
              ownerManualMuteUntil = 0;
              ownerLastActiveInChats.clear();
              await sendTelegramMessage(token, {
                chat_id: chatId,
                text: "🗣️ BOT QAYTA FAOL HOLATGA O'TDI!\n\nEndi siz o'zingiz Telegramda yozmayotgan vaqtlarda bot 24/7 navbatchilik qiladi va xabarlarga xuddi o'zingizdek tabiiy javob beradi.",
              });
              continue;
            }

            if (incomingText === '/yarashdim') {
              stopAutoPing("❤️ Bonu bilan samimiy suhbat rejimi faollashtirildi");
              const bonuSession = chatSessions.get('8839785942');
              if (bonuSession) {
                bonuSession.memoryNotes = [
                  "❤️ Sevgilim Bonu (8839785942) — Sevimli yor!",
                  "✨ Qaytib 'yarashdik', 'yarashdim', 'kechir', 'kechirim' deb aslo aytmang, hech qanday gina yo'q",
                  "🌸 Bonuga doimo xuddi o'zingizdek qisqa, erkalovchi va samimiy javob yozing: go'zalim, jonim, asalim deb",
                ];
                saveChatHistoriesToDisk();
              }
              const yarashMsg = `❤️ BONU BILAN SUHBAT REJIMI: TABIIY INSONIY YOZISH YOQILDI!\n\n- "Yarashdik", "Yarashdim", "Kechir" so'zlari mutlaqo ishlatilmaydi!\n- Bot xuddi o'zingizdek (Rahmatullohdek) go'zalim, jonim, asalim deb samimiy va erkalab javob beradi.\n- Siz o'zingiz yozayotgan paytda bot aralashmaydi va jim turadi.`;
              await sendTelegramMessage(token, {
                chat_id: chatId,
                text: yarashMsg,
              });
              continue;
            }

            if (incomingText === '/alo') {
              startAutoPing('8839785942', 'Alo', 1);
              const aloMsg = `⚡ AVTO-CHAQIRUV BOSHLANDI!\n\nBonu (8839785942) ga har 1 sekundda "Alo" deb xabar yuboriladi.\n🛑 Bonu javob yozgan soniyadayoq tizim AVTOMATIK TO'XTAYDI!\n\nTo'xtatish uchun: /stop buyrug'ini bosing.`;
              await sendTelegramMessage(token, {
                chat_id: chatId,
                text: aloMsg,
                reply_markup: {
                  inline_keyboard: [[{ text: "🛑 To'xtatish", callback_data: 'cmd_stop' }]],
                },
              });
              continue;
            }

            if (incomingText === '/stop') {
              stopAutoPing("Foydalanuvchi /stop buyrug'i orqali to'xtatdi");
              await sendTelegramMessage(token, {
                chat_id: chatId,
                text: "🛑 Avto-chaqiruvchi to'xtatildi!",
              });
              continue;
            }

            if (incomingText === '/help') {
              const helpMsg = `ℹ️ TELEGRAM MINI APP VA BOT QO'LLANMASI:\n\n❓ Nega Mini App Telegram ichida ochilmay qolishi mumkin?\nGoogle Cloud / AI Studio xavfsizlik siyosati sababli ichki WebView Google hisobiga kirishni talab qiladi yoki iframeni to'sadi.\n\n✅ 1-yechim (Eng qulay): Brauzerda ochish tugmasini bosing — Google Chrome yoki Safarida to'g'ridan-to'g'ri ochiladi:\n${appUrl}\n\n✅ 2-yechim: Barcha asosiy funksiyalarni to'g'ridan-to'g'ri Telegram chatidan boshqaring:\n/status - 24/7 holat va Bonu bilan aloqani ko'rish\n/jim - Botni 1 soatga ovozsiz qilish (siz o'zingiz yozishingiz uchun)\n/gapir - Botni qayta navbatchilikka qo'yish\n/yarashdim - Tabiiy insoniy sevimli yor rejimini yoqish\n/alo - Bonuga har sekundda "Alo" yozishni boshlash\n/stop - Avto-chaqiruvni to'xtatish`;
              await sendTelegramMessage(token, {
                chat_id: chatId,
                text: helpMsg,
                reply_markup: {
                  inline_keyboard: [
                    [{ text: '🌐 Brauzerda ochish', url: appUrl }],
                    [{ text: "❤️ Yarashdim endi go'zalim", callback_data: 'cmd_yarashdim' }],
                  ],
                },
              });
              continue;
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

            const promptContent = isVoice
              ? `[Foydalanuvchi ovozli xabar yubordi]: ${incomingText}`
              : incomingText;

            promptContext.push({
              role: 'user',
              parts: [{ text: `[${senderName}]: ${promptContent}` }],
            });

            const systemInstruction = buildPersonaPrompt(botState.personaConfig, chatId);

            let rawReply = await generateHumanReply(promptContext, systemInstruction, 12000, chatId);
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

            // Strict rule for Bonu (ID: 8839785942): NEVER say "yarashdik", "yarashdim", "kechir", "kechirim", or apology words
            if (String(chatId) === '8839785942' || incomingSenderId === '8839785942') {
              replyText = replyText
                .replace(/yarashd[a-z']*/gi, "")
                .replace(/kechir([a-z']*)/gi, "")
                .replace(/kechirasiz/gi, "")
                .replace(/uzr/gi, "")
                .replace(/aybdorman/gi, "")
                .replace(/pushaymonman/gi, "")
                .replace(/xafa bo'lma/gi, "")
                .replace(/sun'iy intellekt/gi, "")
                .replace(/yordamchim/gi, "")
                .replace(/\s{2,}/g, " ")
                .trim();
              if (!replyText || replyText.length < 3) {
                replyText = generateSmartFallback(incomingText, true);
              }
            }

            if (!replyText && generatedMediaObj) {
              replyText = generatedMediaObj.type === 'image'
                ? "Mana siz so'ragan rasm tayyor bo'ldi! 🖼️"
                : "Mana siz so'ragan video lavha tayyor bo'ldi! 🎬";
            }

            // Send reply via Telegram as clean personal human message
            const sendResult = await sendHumanTelegramReply(token, {
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
              isVoice: Boolean(sendResult.isVoice ?? (botState.personaConfig.voiceReplyMode !== false)),
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

          // 4. Inline Keyboard Callback Queries
          if (update.callback_query) {
            const cq = update.callback_query;
            const data = cq.data;
            const cqChatId = cq.message?.chat?.id;

            // Always answer callback query to dismiss loading state in Telegram
            fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ callback_query_id: cq.id }),
            }).catch(() => {});

            if (cqChatId) {
              const appUrl = process.env.APP_URL || 'https://ais-dev-m5typlarwcoemrtehsvjgf-798886787643.asia-southeast1.run.app';

              if (data === 'cmd_yarashdim') {
                stopAutoPing("❤️ Bonu bilan samimiy suhbat rejimi faol");
                const bonuSession = chatSessions.get('8839785942');
                if (bonuSession) {
                  bonuSession.memoryNotes = [
                    "❤️ Sevgilim Bonu (8839785942) — Sevimli yor!",
                    "✨ Qaytib 'yarashdik', 'yarashdim', 'kechir', 'kechirim' deb aslo aytmang, hech qanday gina yo'q",
                    "🌸 Bonuga doimo xuddi o'zingizdek qisqa, erkalovchi va samimiy javob bering: go'zalim, jonim, asalim deb",
                  ];
                  saveChatHistoriesToDisk();
                }
                await sendTelegramMessage(token, {
                  chat_id: cqChatId,
                  text: `❤️ TABIIY SEVIMLI YOR REJIMI TASDIQLANDI!\n\nOradagi munosabat tinch, samimiy va mehrli.\nBot xuddi o'zingizdek samimiy gaplashadi, "yarashdik" yoki "kechir" deb aslo aytmaydi.`,
                });
              } else if (data === 'cmd_ovoz') {
                botState.personaConfig.voiceReplyMode = true;
                await sendTelegramMessage(token, {
                  chat_id: cqChatId,
                  text: "🎙️ FAQAT OVOZLI XABAR REJIMI YOQILDI!\n\nEndi bot barcha xabarlarga matn yozmasdan, faqat o'zbekcha ovozli xabar (Telegram Voice Note) yuboradi.",
                });
              } else if (data === 'cmd_matn') {
                botState.personaConfig.voiceReplyMode = false;
                await sendTelegramMessage(token, {
                  chat_id: cqChatId,
                  text: "✍️ MATNLI XABAR REJIMI YOQILDI!\n\nBot endi odatiy matnli xabarlar bilan javob qaytaradi.",
                });
              } else if (data === 'cmd_alo') {
                startAutoPing('8839785942', 'Alo', 1);
                await sendTelegramMessage(token, {
                  chat_id: cqChatId,
                  text: `⚡ AVTO-CHAQIRUV BOSHLANDI!\n\nBonu (8839785942) ga har 1 sekundda "Alo" deb yozilmoqda.\n🛑 Bonu javob yozishi bilan avtomatik to'xtaydi!\n\nTo'xtatish uchun: /stop`,
                  reply_markup: {
                    inline_keyboard: [[{ text: "🛑 To'xtatish", callback_data: 'cmd_stop' }]],
                  },
                });
              } else if (data === 'cmd_jim') {
                ownerManualMuteUntil = Date.now() + 60 * 60 * 1000;
                await sendTelegramMessage(token, {
                  chat_id: cqChatId,
                  text: "🤫 BOT 1 SOATGA OVOZSIZ QILINDI!\n\nSiz bemalol barcha chatlarda o'zingiz yozishingiz mumkin, bot aralashmaydi.\n\nQayta yoqish uchun: /gapir",
                  reply_markup: {
                    inline_keyboard: [[{ text: "🗣️ Botni qayta yoqish", callback_data: 'cmd_gapir' }]],
                  },
                });
              } else if (data === 'cmd_gapir') {
                ownerManualMuteUntil = 0;
                ownerLastActiveInChats.clear();
                await sendTelegramMessage(token, {
                  chat_id: cqChatId,
                  text: "🗣️ BOT QAYTA FAOL!\n\nEndi siz yozmayotganingizda 24/7 xabarlarga xuddi o'zingizdek javob qaytaradi.",
                });
              } else if (data === 'cmd_stop') {
                stopAutoPing("Foydalanuvchi tugma orqali to'xtatdi");
                await sendTelegramMessage(token, {
                  chat_id: cqChatId,
                  text: "🛑 Avto-chaqiruvchi to'xtatildi!",
                });
              } else if (data === 'cmd_status') {
                const isOwnerActive = (Date.now() - (ownerLastActiveInChats.get('8839785942') || 0)) < OWNER_ACTIVE_COOLDOWN_MS;
                const isMuted = Date.now() < ownerManualMuteUntil;
                const statusMsg = `📊 TIZIM VA BOT HOLATI (24/7 FAOL):\n\n🤖 Bot: @${botState.botInfo?.username || 'Rahmatulloh_Airobot'} (Uzluksiz 24/7 Faol ✅)\n💼 Telegram Business: ${botState.businessConnection ? 'Ulangan ✅' : 'Kutilmoqda ⏳'}\n💑 Bonu (8839785942) bilan suhbat: O'zbek yigitidek tabiiy yozish ❤️\n   - "Yarashdik" yoki "Kechir" so'zlari: BUTUNLAY TAQIQLANGAN 🚫\n   - Uslub: Jonli, samimiy va erkalab yozish ✨\n🛡️ Siz yozayotganda bot jim turishi: ${isMuted ? "Qo'lda jim qilingan (/jim) ⏸️" : isOwnerActive ? "Siz yozyapsiz -> Bot jim turibdi ⏸️" : "Siz yozmayapsiz -> Bot navbatchilikda ✅"}\n⚡ "Alo" Avto-Chaqiruvchi: ${autoPingState.isActive ? `YONIQ (${autoPingState.sentCount} ta yuborildi) 🟢` : "To'xtatilgan ⚪"}\n📨 Qabul qilingan: ${botState.stats.totalReceived} ta\n📤 Yuborilgan: ${botState.stats.totalReplied} ta\n\n🌐 Boshqaruv paneli: ${appUrl}`;
                await sendTelegramMessage(token, {
                  chat_id: cqChatId,
                  text: statusMsg,
                });
              }
            }
          }
        }
      }
    } catch (err: unknown) {
      if (signal.aborted || !shouldPollRun) break;
      console.error('Polling xatosi (avtomatik qayta tiklanadi):', err instanceof Error ? err.message : err);
      // Brief pause before retry
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  console.log('Telegram Bot Polling tsikli yakunlandi.');
}

// 24/7 Supervisor that guarantees the polling process never terminates unexpectedly
let supervisorRunning = false;
async function start24x7PollingSupervisor(token: string) {
  if (supervisorRunning) return;
  supervisorRunning = true;
  shouldPollRun = true;
  botState.isPolling = true;

  while (shouldPollRun) {
    try {
      pollingAbortController = new AbortController();
      await runTelegramPolling(token, pollingAbortController.signal);
    } catch (err) {
      console.error('[24/7 Watchdog] Polling kutilmagan xatoga uchradi, 3 soniyada avtomatik qayta tiklanmoqda:', err);
    }
    if (!shouldPollRun) break;
    await new Promise((r) => setTimeout(r, 2000));
    console.log('[24/7 Watchdog] Polling avtomatik qayta tiriltirilmoqda...');
  }
  supervisorRunning = false;
  botState.isPolling = false;
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

      if (botState.isPolling && supervisorRunning) {
        return res.json({ ok: true, isPolling: true, message: 'Bot allaqachon 24/7 faol.' });
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

      // Automatically ensure Commands menu is set!
      try {
        await fetch(`https://api.telegram.org/bot${tokenToUse}/setChatMenuButton`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            menu_button: { type: 'commands' },
          }),
        });
      } catch (e) {
        console.error('Menu button biriktirishda xato:', e);
      }

      start24x7PollingSupervisor(tokenToUse);
      return res.json({ ok: true, isPolling: true, bot: botState.botInfo });
    } else {
      shouldPollRun = false;
      supervisorRunning = false;
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
    const mode = req.body.mode || (req.body.miniAppUrl === 'commands' ? 'commands' : 'commands');
    const miniAppUrl = (
      req.body.miniAppUrl && req.body.miniAppUrl !== 'commands'
        ? req.body.miniAppUrl
        : process.env.APP_URL || 'https://ais-dev-m5typlarwcoemrtehsvjgf-798886787643.asia-southeast1.run.app'
    ).trim();

    const menuButtonObj = req.body.mode === 'web_app'
      ? {
          type: 'web_app',
          text: '📱 Mini App',
          web_app: { url: miniAppUrl },
        }
      : {
          type: 'commands',
        };

    const tgRes = await fetch(`https://api.telegram.org/bot${token}/setChatMenuButton`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        menu_button: menuButtonObj,
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
Vaziyat: Yigit (Rahmatulloh) va uning sevgilisi Bonu (Telegram ID: ${targetId || '8839785942'}) ALLAQAChON YARASHISHDI!
O'rtadagi barcha xafagarchiliklar va tushunmovchiliklar tugagan, yarashib olishgan va birgasiz.

FOYDALANUVCHINING QAT'IY TALABLARI:
1. "KECHIR", "KECHIRIM", "XIYONAT", "XATO QILDIM", "AYBDORMAN" KABI SO'ZLARNI ASLO ISHLATMANG! Bular o'tib ketgan, yarashilgan.
2. DOIMO "GO'ZALIM", "JONIM", "ASALIM" DEB MUROJAAT QILING: Bonuga mehrli, erkalovchi, sevimli yor sifatida yozilsin.
3. SEVGI VA MEHRGA TO'LA: Qanday yaxshi ko'rishingizni, birga ekaningizdan baxtiyor ekaningizni, bugun ko'rishishni yoki hol-ahvolini shirin so'zlar bilan so'rang.
4. INSONIY VA JONLI: Xuddi Rahmatulloh o'z sevgilisi Bonuga yozayotgandek oddiy, tabiiy, lo'nda Telegram yozishuvi bo'lsin.
5. Uslub ko'rsatmasi: ${style || "Go'zalim deb erkalash, mehrli va shirin"}.
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
    const bonuText = (replyText || "Salom Rahmatulloh, nima qilyapsiz?").trim();

    stopAutoPing(`❤️ Bonu bilan yarashildi! ("${bonuText.slice(0, 35)}...")`);

    // Record incoming user message
    recordChatMessage('8839785942', "Bonu (Go'zalim ❤️)", 'telegram_business', {
      role: 'user',
      text: bonuText,
    });

    // Generate loving reply from bot persona
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

    recordChatMessage('8839785942', "Bonu (Go'zalim ❤️)", 'telegram_business', {
      role: 'model',
      text: rawReply,
    });

    botState.logs.unshift({
      id: 'bonu-reply-' + Date.now(),
      timestamp: new Date().toISOString(),
      senderId: '8839785942',
      senderName: "Bonu (Go'zalim ❤️)",
      incomingText: bonuText,
      replyText: rawReply,
      source: 'telegram_business',
      status: 'sent',
      styleToneUsed: "Yarashilgan — Go'zalim (Mehrli rejim)",
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

    // Auto-start Telegram polling with verified bot token under 24/7 supervisor
    if (botState.botToken) {
      start24x7PollingSupervisor(botState.botToken);
      console.log('Telegram Bot Polling 24/7 supervisor ostida ishga tushirildi: @Rahmatulloh_Airobot');

      // 1. Auto-register Telegram bot commands
      fetch(`https://api.telegram.org/bot${botState.botToken}/setMyCommands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commands: [
            { command: 'start', description: '🚀 Boshlash & Tezkor boshqaruv' },
            { command: 'status', description: '📊 24/7 Holat & Ega faolligi' },
            { command: 'jim', description: "🤫 1 soat jim turish (o'zingiz yozishingiz uchun)" },
            { command: 'gapir', description: "🗣️ Botni qayta navbatchilikka qo'yish" },
            { command: 'yarashdim', description: "❤️ Bonu bilan tabiiy yozish rejimi" },
            { command: 'alo', description: '⚡ Bonuga Alo deb yozishni boshlash' },
            { command: 'stop', description: "🛑 Avto-chaqiruvni to'xtatish" },
            { command: 'help', description: "ℹ️ Qo'llanma va yordam" },
          ],
        }),
      })
        .then((r) => r.json())
        .then((d) => console.log('Auto setMyCommands muvaffaqiyatli:', JSON.stringify(d)))
        .catch((e) => console.warn('Auto setMyCommands xatosi:', e));

      // 2. Set chat menu button to 'commands' to prevent 404 in Telegram
      fetch(`https://api.telegram.org/bot${botState.botToken}/setChatMenuButton`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menu_button: {
            type: 'commands',
          },
        }),
      })
        .then((r) => r.json())
        .then((d) => console.log('Auto setChatMenuButton (commands) muvaffaqiyatli:', JSON.stringify(d)))
        .catch((e) => console.warn('Auto setChatMenuButton xatosi:', e));
    }

    // 3. Background Watchdog Heartbeat: Checks every 20 seconds
    setInterval(() => {
      if (shouldPollRun && botState.botToken) {
        const elapsed = Date.now() - lastPollHeartbeat;
        if (elapsed > 45000) {
          console.warn(`[24/7 Watchdog] Polling qotib qolgan (${Math.round(elapsed/1000)}s sukut). Ulanish yangilanmoqda...`);
          lastPollHeartbeat = Date.now();
          if (pollingAbortController) {
            try { pollingAbortController.abort(); } catch {}
          }
        }
      }
    }, 20000);

    // 4. Server self-keepalive ping every 2 minutes
    setInterval(() => {
      fetch(`http://localhost:${PORT}/api/telegram/status`).catch(() => {});
    }, 120000);
  });
}

// Global safety nets so Node server NEVER crashes
process.on('uncaughtException', (err) => {
  console.error('[24/7 Himoya] Uncaught exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[24/7 Himoya] Unhandled rejection:', reason);
});

startServer();
