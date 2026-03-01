"use client";

export interface SpeakTextOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  timeoutMs?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: () => void;
}

export interface SpeakTextResult {
  ok: boolean;
  reason?: "unsupported" | "error" | "timeout";
}

async function waitForVoices(synth: SpeechSynthesis, timeoutMs: number) {
  const existing = synth.getVoices();
  if (existing.length > 0) {
    return existing;
  }

  return new Promise<SpeechSynthesisVoice[]>((resolve) => {
    let done = false;
    const finish = (voices: SpeechSynthesisVoice[]) => {
      if (done) return;
      done = true;
      synth.removeEventListener("voiceschanged", onVoicesChanged);
      resolve(voices);
    };
    const onVoicesChanged = () => {
      finish(synth.getVoices());
    };

    synth.addEventListener("voiceschanged", onVoicesChanged);
    window.setTimeout(() => finish(synth.getVoices()), timeoutMs);
  });
}

function pickVoiceByLang(voices: SpeechSynthesisVoice[], lang: string) {
  const exact = voices.find((voice) => voice.lang.toLowerCase() === lang.toLowerCase());
  if (exact) {
    return exact;
  }
  const prefix = lang.split("-")[0]?.toLowerCase();
  if (!prefix) {
    return null;
  }
  return voices.find((voice) => voice.lang.toLowerCase().startsWith(prefix)) ?? null;
}

export function cancelSpeech() {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return;
  }
  window.speechSynthesis.cancel();
}

export async function speakText(text: string, options: SpeakTextOptions = {}): Promise<SpeakTextResult> {
  if (
    typeof window === "undefined" ||
    !window.speechSynthesis ||
    typeof window.SpeechSynthesisUtterance === "undefined"
  ) {
    return { ok: false, reason: "unsupported" };
  }

  const synth = window.speechSynthesis;
  const lang = options.lang ?? "en-US";
  const rate = options.rate ?? 1;
  const pitch = options.pitch ?? 1;
  const timeoutMs = options.timeoutMs ?? Math.max(8000, text.length * 180);

  synth.cancel();
  const voices = await waitForVoices(synth, 1200);

  const utterance = new window.SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = rate;
  utterance.pitch = pitch;

  const voice = pickVoiceByLang(voices, lang);
  if (voice) {
    utterance.voice = voice;
  }

  return new Promise<SpeakTextResult>((resolve) => {
    let done = false;
    const finish = (result: SpeakTextResult) => {
      if (done) return;
      done = true;
      resolve(result);
    };

    const timeoutId = window.setTimeout(() => {
      synth.cancel();
      options.onError?.();
      finish({ ok: false, reason: "timeout" });
    }, timeoutMs);

    utterance.onstart = () => {
      options.onStart?.();
    };
    utterance.onend = () => {
      window.clearTimeout(timeoutId);
      options.onEnd?.();
      finish({ ok: true });
    };
    utterance.onerror = () => {
      window.clearTimeout(timeoutId);
      options.onError?.();
      finish({ ok: false, reason: "error" });
    };

    synth.speak(utterance);
  });
}
