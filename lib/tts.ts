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
  const timeoutMs = options.timeoutMs ?? Math.max(25000, text.length * 260);

  synth.cancel();
  if (synth.paused) {
    synth.resume();
  }

  return new Promise<SpeakTextResult>((resolve) => {
    let done = false;
    let started = false;
    let retried = false;
    const finish = (result: SpeakTextResult) => {
      if (done) return;
      done = true;
      window.clearTimeout(retryId);
      window.clearTimeout(timeoutId);
      resolve(result);
    };

    const createUtterance = () => {
      const utterance = new window.SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = rate;
      utterance.pitch = pitch;
      const voices = synth.getVoices();
      const voice = pickVoiceByLang(voices, lang);
      if (voice) {
        utterance.voice = voice;
      }
      utterance.onstart = () => {
        started = true;
        options.onStart?.();
      };
      utterance.onend = () => {
        options.onEnd?.();
        finish({ ok: true });
      };
      utterance.onerror = () => {
        if (!retried) {
          retried = true;
          window.setTimeout(() => {
            attemptSpeak();
          }, 120);
          return;
        }
        options.onError?.();
        finish({ ok: false, reason: "error" });
      };
      return utterance;
    };

    const attemptSpeak = () => {
      if (done) {
        return;
      }
      try {
        synth.cancel();
        if (synth.paused) {
          synth.resume();
        }
        const utterance = createUtterance();
        synth.speak(utterance);
        if (synth.paused) {
          synth.resume();
        }
      } catch {
        if (!retried) {
          retried = true;
          window.setTimeout(() => {
            attemptSpeak();
          }, 120);
          return;
        }
        options.onError?.();
        finish({ ok: false, reason: "error" });
      }
    };

    const retryId = window.setTimeout(() => {
      if (!started && !retried && !done) {
        retried = true;
        attemptSpeak();
      }
    }, 1400);

    const timeoutId = window.setTimeout(() => {
      if (done) {
        return;
      }
      synth.cancel();
      options.onError?.();
      finish({ ok: false, reason: started ? "timeout" : "error" });
    }, timeoutMs);

    attemptSpeak();

    if (synth.getVoices().length === 0) {
      const onVoicesChanged = () => {
        synth.removeEventListener("voiceschanged", onVoicesChanged);
      };
      synth.addEventListener("voiceschanged", onVoicesChanged);
    }
  });
}
