export type VoiceState = 'IDLE' | 'STANDBY_WAKE' | 'LISTENING' | 'THINKING' | 'SPEAKING';

export interface VoiceConfig {
  wakeWordEnabled: boolean;
  language: 'te-IN' | 'en-IN';
  silenceDelayMs: number;
  pitch: number;
  rate: number;
}

export interface VoiceSessionMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}
