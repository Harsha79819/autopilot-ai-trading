/**
 * Real-time Conversational Voice Engine for AutoPilot AI
 * Powered by Web Speech API, Smart Silence Detection, Female TTS, and Web Audio Synthesis.
 */
import { VoiceState, VoiceConfig } from '../types/voice';

// Global Web Speech declarations for browser compatibility
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
    webkitAudioContext: any;
  }
}

export interface VoiceEngineCallbacks {
  onStateChange: (state: VoiceState) => void;
  onTranscriptUpdate: (transcript: string, isFinal: boolean) => void;
  onWakeWordDetected?: () => void;
  onCompleteUtterance: (fullText: string) => void;
  onError: (error: string) => void;
}

export class VoiceEngine {
  private recognition: any = null;
  private synth: SpeechSynthesis | null = null;
  private audioCtx: AudioContext | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  private state: VoiceState = 'IDLE';
  private config: VoiceConfig = {
    wakeWordEnabled: true,
    language: 'te-IN',
    silenceDelayMs: 1800, // 1.8 seconds of silence to ensure user finishes thought
    pitch: 1.15,          // Natural female conversational pitch
    rate: 1.05            // Engaging, clear cadence
  };

  private callbacks: VoiceEngineCallbacks;
  private silenceTimer: any = null;
  private accumulatedTranscript: string = '';
  private isRecognizing: boolean = false;
  private shouldKeepListening: boolean = false;

  constructor(callbacks: VoiceEngineCallbacks, config?: Partial<VoiceConfig>) {
    this.callbacks = callbacks;
    if (config) {
      this.config = { ...this.config, ...config };
    }

    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 1;
        this.recognition.lang = this.config.language;
        this.setupRecognitionListeners();
      }

      if ('speechSynthesis' in window) {
        this.synth = window.speechSynthesis;
      }
    }
  }

  private setState(newState: VoiceState) {
    this.state = newState;
    this.callbacks.onStateChange(newState);
  }

  public getState(): VoiceState {
    return this.state;
  }

  public updateConfig(newConfig: Partial<VoiceConfig>) {
    this.config = { ...this.config, ...newConfig };
    if (this.recognition && newConfig.language) {
      this.recognition.lang = newConfig.language;
    }
  }

  public getConfig(): VoiceConfig {
    return this.config;
  }

  // --- Web Audio Chime Synthesis (Zero MP3 Dependencies) ---
  private initAudioContext() {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.audioCtx = new AudioCtx();
      }
    }
  }

  public playActivationChime() {
    try {
      this.initAudioContext();
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      // Dual harmonic bell chord: 880Hz (A5) -> 1320Hz (E6)
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.15);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {
      console.warn('Audio chime error:', e);
    }
  }

  public playReadyChime() {
    try {
      this.initAudioContext();
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, now); // E5
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch (e) {
      console.warn('Ready chime error:', e);
    }
  }

  // --- Recognition Setup ---
  private setupRecognitionListeners() {
    if (!this.recognition) return;

    this.recognition.onstart = () => {
      this.isRecognizing = true;
    };

    this.recognition.onerror = (event: any) => {
      if (event.error === 'no-speech') {
        // Normal silence, restart if continuous mode requested
        return;
      }
      if (event.error === 'aborted') return;
      console.warn('Speech recognition error:', event.error);
      this.callbacks.onError(`Speech Error: ${event.error}`);
    };

    this.recognition.onend = () => {
      this.isRecognizing = false;
      if (this.shouldKeepListening && (this.state === 'LISTENING' || this.state === 'STANDBY_WAKE')) {
        try {
          this.recognition.start();
        } catch (e) {
          // Ignore duplicate start errors
        }
      }
    };

    this.recognition.onresult = (event: any) => {
      let interimStr = '';
      let finalStr = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalStr += text;
        } else {
          interimStr += text;
        }
      }

      const activeSpeech = (finalStr || interimStr).trim();
      if (!activeSpeech) return;

      // Check Wake Word Detection when in STANDBY mode
      if (this.state === 'STANDBY_WAKE' || this.config.wakeWordEnabled) {
        const lower = activeSpeech.toLowerCase();
        const isWake = (
          lower.includes('hey darling') ||
          lower.includes('darling') ||
          lower.includes('hay darling') ||
          lower.includes('హే డార్లింగ్') ||
          lower.includes('డార్లింగ్')
        );

        if (isWake && this.state !== 'LISTENING' && this.state !== 'SPEAKING') {
          this.playActivationChime();
          this.callbacks.onWakeWordDetected?.();
          this.accumulatedTranscript = '';
          this.setState('LISTENING');
          this.callbacks.onTranscriptUpdate('Yes Darling! I am listening...', false);
          return;
        }
      }

      // If active listening, buffer words and apply ChatGPT-style turn-taking silence detection
      if (this.state === 'LISTENING') {
        // Strip wake word from active content if it was spoken at start
        let cleanText = activeSpeech
          .replace(/hey darling/gi, '')
          .replace(/darling/gi, '')
          .replace(/హే డార్లింగ్/gi, '')
          .replace(/డార్లింగ్/gi, '')
          .trim();

        if (cleanText) {
          this.accumulatedTranscript = cleanText;
          this.callbacks.onTranscriptUpdate(cleanText, false);

          // Reset silence timer on every new word detected
          if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
          }

          // Trigger submit ONLY after user has been completely silent for silenceDelayMs
          this.silenceTimer = setTimeout(() => {
            if (this.accumulatedTranscript.trim().length > 0) {
              const submission = this.accumulatedTranscript.trim();
              this.callbacks.onTranscriptUpdate(submission, true);
              this.accumulatedTranscript = '';
              this.setState('THINKING');
              this.callbacks.onCompleteUtterance(submission);
            }
          }, this.config.silenceDelayMs);
        }
      }
    };
  }

  // --- Voice Controls ---
  public startListening(wakeMode: boolean = false) {
    if (!this.recognition) {
      this.callbacks.onError('Web Speech API is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    this.stopSpeaking();
    this.shouldKeepListening = true;
    this.accumulatedTranscript = '';

    if (wakeMode) {
      this.setState('STANDBY_WAKE');
    } else {
      this.playReadyChime();
      this.setState('LISTENING');
    }

    if (!this.isRecognizing) {
      try {
        this.recognition.start();
      } catch (err) {
        console.warn('Recognition start caught:', err);
      }
    }
  }

  public stopListening() {
    this.shouldKeepListening = false;
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.recognition && this.isRecognizing) {
      try {
        this.recognition.stop();
      } catch (err) {
        console.warn('Recognition stop error:', err);
      }
    }
    this.setState('IDLE');
  }

  // --- Female Speech Synthesis (TTS) ---
  public getBestFemaleVoice(): SpeechSynthesisVoice | null {
    if (!this.synth) return null;
    const voices = this.synth.getVoices();
    if (!voices || voices.length === 0) return null;

    // Prioritized list of high-quality natural female voices
    const priorityFemaleNames = [
      'Google UK English Female',
      'Samantha',
      'Karen',
      'Victoria',
      'Tessa',
      'Microsoft Zira',
      'Microsoft Heera',
      'Google US English',
      'Veena',
      'Lekha'
    ];

    for (const name of priorityFemaleNames) {
      const match = voices.find(v => v.name.toLowerCase().includes(name.toLowerCase()));
      if (match) return match;
    }

    // Fallback: check for any voice with 'female' in name
    const anyFemale = voices.find(v => v.name.toLowerCase().includes('female'));
    if (anyFemale) return anyFemale;

    // Fallback: Indian English / regional voice
    const indianVoice = voices.find(v => v.lang.startsWith('en-IN') || v.lang.startsWith('te'));
    if (indianVoice) return indianVoice;

    return voices[0] || null;
  }

  public speak(text: string, onEnd?: () => void) {
    if (!this.synth) return;
    this.stopSpeaking();

    // Clean markdown characters for smooth spoken speech
    const cleanSpeech = text
      .replace(/\*\*(.*?)\*\*/g, '$1')   // bold
      .replace(/\*(.*?)\*/g, '$1')       // italics
      .replace(/###/g, '')               // headings
      .replace(/##/g, '')
      .replace(/#/g, '')
      .replace(/`/g, '')                 // code backticks
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')// markdown links
      .replace(/•/g, '')                 // bullet points
      .replace(/- /g, '')
      .trim();

    if (!cleanSpeech) return;

    this.setState('SPEAKING');

    // Pause recognition while AI speaks to prevent self-echoing
    if (this.recognition && this.isRecognizing) {
      try {
        this.recognition.abort();
      } catch (e) {}
    }

    const utterance = new SpeechSynthesisUtterance(cleanSpeech);
    const femaleVoice = this.getBestFemaleVoice();
    if (femaleVoice) {
      utterance.voice = femaleVoice;
    }

    utterance.pitch = this.config.pitch;
    utterance.rate = this.config.rate;

    utterance.onend = () => {
      this.currentUtterance = null;
      if (onEnd) onEnd();
      // Resume listening for continuous conversation
      if (this.shouldKeepListening) {
        this.startListening(this.config.wakeWordEnabled);
      } else {
        this.setState('IDLE');
      }
    };

    utterance.onerror = (e) => {
      console.warn('Utterance speech error:', e);
      this.currentUtterance = null;
      this.setState('IDLE');
    };

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  }

  public stopSpeaking() {
    if (this.synth && this.synth.speaking) {
      this.synth.cancel();
      this.currentUtterance = null;
    }
  }
}
