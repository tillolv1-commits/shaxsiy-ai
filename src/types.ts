export interface KnowledgeItem {
  id: string;
  questionOrTopic: string;
  answer: string;
}

export interface LocationConfig {
  enabled: boolean;
  latitude: number;
  longitude: number;
  venueTitle: string;
  address: string;
  replyText: string;
}

export interface PersonaConfig {
  ownerName: string;
  profession: string;
  language: string;
  tone: string;
  slangWords: string[];
  greetingPhrase: string;
  farewellPhrase: string;
  emojiUsage: string;
  sentenceLength: string;
  knowledgeBase: KnowledgeItem[];
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
  locationConfig?: LocationConfig;
  mediaGeneration?: {
    enabled: boolean;
    allowImages: boolean;
    allowVideos: boolean;
    defaultStyle?: string;
  };
}

export interface GeneratedMedia {
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

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  senderName: string;
  text: string;
  timestamp: string;
  confidence?: number;
  appliedTone?: string;
  isVoice?: boolean;
  hasLocation?: boolean;
  locationData?: {
    latitude: number;
    longitude: number;
    venueTitle?: string;
    address?: string;
  };
  media?: GeneratedMedia;
}

export interface ChatSession {
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
    media?: GeneratedMedia;
  }>;
}

export interface TelegramBotInfo {
  id?: number;
  first_name?: string;
  username?: string;
  can_join_groups?: boolean;
}

export interface BusinessConnectionInfo {
  id: string;
  user?: {
    id: number;
    first_name?: string;
    username?: string;
  };
  user_chat_id?: number;
  is_enabled?: boolean;
  can_reply?: boolean;
}

export interface LogEntry {
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
}

export interface StyleAnalysisResult {
  detectedTone: string;
  detectedFormality: string;
  typicalGreetings: string[];
  typicalFarewells: string[];
  slangAndFavoriteWords: string[];
  emojiStyle: string;
  averageSentenceLength: string;
  keyStyleObservations: string;
  recommendedRules: string[];
}

export interface AutoPingerHistoryItem {
  id: string;
  timestamp: string;
  status: 'sent' | 'failed' | 'stopped';
  text: string;
  note?: string;
}

export interface AutoPingerStatus {
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
  history: AutoPingerHistoryItem[];
}
