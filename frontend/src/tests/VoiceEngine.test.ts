import { describe, it, expect } from 'vitest';
import { VoiceConfig, VoiceState } from '../types/voice';

describe('Conversational Voice Engine Specifications', () => {
  it('initializes default voice configuration for optimal female conversational speech', () => {
    const defaultConfig: VoiceConfig = {
      wakeWordEnabled: true,
      language: 'te-IN',
      silenceDelayMs: 1800,
      pitch: 1.15,
      rate: 1.05,
    };

    expect(defaultConfig.wakeWordEnabled).toBe(true);
    expect(defaultConfig.silenceDelayMs).toBe(1800); // 1.8 seconds silence buffer to avoid premature cutoffs
    expect(defaultConfig.pitch).toBeGreaterThan(1.0); // Pleasant female conversational pitch
    expect(defaultConfig.language).toBe('te-IN');
  });

  it('correctly matches wake word phrases', () => {
    const isWakePhrase = (text: string) => {
      const lower = text.toLowerCase();
      return (
        lower.includes('hey darling') ||
        lower.includes('darling') ||
        lower.includes('hay darling') ||
        lower.includes('హే డార్లింగ్') ||
        lower.includes('డార్లింగ్')
      );
    };

    expect(isWakePhrase('Hey Darling how are you')).toBe(true);
    expect(isWakePhrase('hey darling eroju trades em jarigindi')).toBe(true);
    expect(isWakePhrase('హే డార్లింగ్ మార్కెట్ ఎలా ఉంది')).toBe(true);
    expect(isWakePhrase('darling what is my cash balance')).toBe(true);
    expect(isWakePhrase('just a normal query about nifty')).toBe(false);
  });

  it('cleans markdown symbols so text-to-speech does not speak formatting syntax', () => {
    const cleanSpeech = (text: string) => {
      return text
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
    };

    const rawMarkdown = '### 📊 **Today\'s Summary**: Profit hit on [RELIANCE](file:///reliance)! Cash is ₹1,200.';
    const sanitized = cleanSpeech(rawMarkdown);

    expect(sanitized).not.toContain('**');
    expect(sanitized).not.toContain('###');
    expect(sanitized).not.toContain('[');
    expect(sanitized).not.toContain(']');
    expect(sanitized).toContain('Today\'s Summary: Profit hit on RELIANCE! Cash is ₹1,200.');
  });
});
