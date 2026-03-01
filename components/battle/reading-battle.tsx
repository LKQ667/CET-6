"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScanSearch, X, Timer, Volume2 } from "lucide-react";
import type { DailyTask } from "@/lib/types";
import { sfxHit, sfxWrong, sfxTick, sfxVictory } from "@/lib/sfx";
import { cancelSpeech, speakText } from "@/lib/tts";

interface ReadingBattleProps {
  task: DailyTask;
  onComplete: (taskId: string) => void;
  onCancel: () => void;
}

const PASSAGE = {
  en: "Some people argue that the rapid advancement of artificial intelligence will lead to widespread job displacement. However, historical evidence suggests that technological revolutions often create more jobs than they destroy, albeit requiring new sets of skills.",
  zh: "一些人认为，人工智能的飞速发展将导致大规模的失业。然而，历史证据表明，技术革命创造的就业岗位往往多于它们所破坏的岗位，尽管这要求劳动者掌握全新的技能组合。"
};

const QUESTIONS = [
  { text: "AI advancement will definitely cause permanent mass unemployment.", isTrue: false },
  { text: "Technological revolutions usually create new job opportunities.", isTrue: true },
  { text: "New skill sets are often required when new technologies emerge.", isTrue: true }
];

const TIME_PER_Q = 60000;

export function ReadingBattle({ task, onComplete, onCancel }: ReadingBattleProps) {
  const [qIndex, setQIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_Q);
  const [shake, setShake] = useState(false);
  const [hp, setHp] = useState(100);
  const [speaking, setSpeaking] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const maxHp = 100;
  const hpPerQ = maxHp / QUESTIONS.length;
  const cleared = qIndex >= QUESTIONS.length;

  const speakPassage = useCallback(async () => {
    setSpeaking(true);
    const result = await speakText(PASSAGE.en, {
      lang: "en-US",
      rate: 0.85,
      onStart: () => setSpeaking(true),
      onEnd: () => setSpeaking(false),
      onError: () => setSpeaking(false)
    });
    if (!result.ok) {
      setSpeaking(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      cancelSpeech();
    };
  }, []);

  const goNext = useCallback(() => {
    if (qIndex + 1 >= QUESTIONS.length) {
      sfxVictory();
      setQIndex(prev => prev + 1); // trigger cleared
    } else {
      setQIndex(prev => prev + 1);
      setTimeLeft(TIME_PER_Q);
    }
  }, [qIndex]);

  // Timer
  useEffect(() => {
    if (cleared) return;
    setTimeLeft(TIME_PER_Q);

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 100) {
          // Timeout = penalty
          sfxWrong();
          setShake(true);
          setTimeout(() => setShake(false), 400);
          setTimeout(goNext, 1000);
          return 0;
        }
        // Tick sound when time is low
        if (prev <= 5000 && prev % 1000 < 200) {
          sfxTick();
        }
        return prev - 100;
      });
    }, 100);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [qIndex, cleared, goNext]);

  const handleAnswer = (answer: boolean) => {
    if (cleared) return;
    if (timerRef.current) clearInterval(timerRef.current);

    const currentQ = QUESTIONS[qIndex];
    if (answer === currentQ.isTrue) {
      sfxHit();
      setHp(prev => Math.max(0, prev - hpPerQ));
      setTimeout(goNext, 1000);
    } else {
      sfxWrong();
      setShake(true);
      setTimeout(() => setShake(false), 400);
      setTimeLeft(prev => Math.max(0, prev - 3000));
      // restart timer
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 100) {
            setTimeout(goNext, 1000);
            return 0;
          }
          return prev - 100;
        });
      }, 100);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 1.05 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(5,21,21,0.95)", backdropFilter: "blur(12px)"
      }}
    >
      <div style={{
        width: "100%", maxWidth: 900, border: "1px solid rgba(20,184,166,0.25)",
        borderRadius: 20, background: "#030909",
        boxShadow: "0 0 80px rgba(20,184,166,0.08)", overflow: "hidden"
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "1rem 1.5rem", borderBottom: "1px solid rgba(20,184,166,0.2)",
          background: "rgba(20,184,166,0.03)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: "50%",
              background: "rgba(20,184,166,0.08)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#2dd4bf"
            }}>
              <ScanSearch size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.15rem", letterSpacing: "0.08em", color: "#ecfdf5", fontFamily: "var(--font-display), sans-serif" }}>
                情报解读 · 侦察怪
              </h3>
              <p style={{ margin: 0, fontSize: "0.78rem", color: "rgba(20,184,166,0.6)" }}>
                限时判断情报真伪，超时视为判断失败
              </p>
            </div>
          </div>
          <button onClick={onCancel} style={{ background: "transparent", border: "none", color: "rgba(20,184,166,0.4)", cursor: "pointer" }}>
            <X size={24} />
          </button>
        </div>

        <div style={{ padding: "2rem", display: "flex", gap: "2rem", minHeight: 450, flexWrap: "wrap" }}>
          {/* Left: Source Text */}
          <div style={{
            flex: "1 1 320px", borderRadius: 16,
            background: "rgba(20,184,166,0.04)", border: "1px solid rgba(20,184,166,0.15)",
            padding: "1.5rem", position: "relative", overflow: "hidden"
          }}>
            <div style={{
              position: "absolute", top: 0, right: 0, width: 120, height: 120,
              background: "rgba(20,184,166,0.04)", filter: "blur(40px)"
            }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, position: "relative", zIndex: 10 }}>
              <h4 style={{
                color: "rgba(20,184,166,0.5)", fontSize: "0.72rem", fontWeight: 700,
                letterSpacing: "0.2em", textTransform: "uppercase" as const, margin: 0
              }}>
                Intercepted Message
              </h4>
              <AnimatePresence>
                {cleared && (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => {
                      void speakPassage();
                    }}
                    disabled={speaking}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      background: speaking ? "rgba(20,184,166,0.2)" : "rgba(20,184,166,0.05)",
                      border: "1px solid rgba(20,184,166,0.4)",
                      color: "#2dd4bf", fontSize: "0.75rem", fontWeight: 700,
                      padding: "0.3rem 0.6rem", borderRadius: 8, cursor: speaking ? "wait" : "pointer",
                      transition: "all 0.2s"
                    }}
                  >
                    <Volume2 size={14} style={{ animation: speaking ? "pulse 1s infinite" : "none" }} />
                    {speaking ? "PLAYING..." : "PLAY AUDIO"}
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
            <p style={{
              color: "rgba(204,251,241,0.85)", fontSize: "1.1rem", lineHeight: 1.7,
              fontFamily: "Georgia, serif", letterSpacing: "0.02em", position: "relative", zIndex: 1, margin: 0
            }}>
              {PASSAGE.en}
            </p>
            <AnimatePresence>
              {cleared && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  style={{ marginTop: "1.5rem" }}
                >
                  <h4 style={{
                    color: "rgba(20,184,166,0.5)", fontSize: "0.72rem", fontWeight: 700,
                    letterSpacing: "0.2em", textTransform: "uppercase" as const, marginBottom: 8, marginTop: 0
                  }}>
                    Decrypted Intelligence
                  </h4>
                  <p style={{
                    color: "rgba(204,251,241,0.65)", fontSize: "0.95rem", lineHeight: 1.6,
                    margin: 0, background: "rgba(20,184,166,0.08)", padding: "1rem", borderRadius: 12,
                    borderLeft: "3px solid #14b8a6"
                  }}>
                    {PASSAGE.zh}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right: Interaction */}
          <div style={{ flex: "1 1 320px", display: "flex", flexDirection: "column" }}>
            {/* HP */}
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{
                display: "flex", justifyContent: "space-between", fontSize: "0.72rem",
                fontWeight: 700, color: "rgba(20,184,166,0.6)", marginBottom: 8,
                letterSpacing: "0.2em", textTransform: "uppercase" as const
              }}>
                <span>Recon Drone</span>
                <span style={{ color: "#2dd4bf" }}>{Math.round(hp)}%</span>
              </div>
              <div style={{
                width: "100%", height: 10, background: "#010404", borderRadius: 999,
                overflow: "hidden", border: "1px solid rgba(20,184,166,0.2)"
              }}>
                <motion.div
                  style={{
                    height: "100%",
                    background: "linear-gradient(90deg, #0f766e, #2dd4bf)",
                    boxShadow: "0 0 10px #2dd4bf"
                  }}
                  animate={{ width: `${(hp / maxHp) * 100}%` }}
                />
              </div>
            </div>

            <AnimatePresence mode="wait">
              {!cleared ? (
                <motion.div
                  key={qIndex}
                  initial={{ x: 30, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -30, opacity: 0 }}
                  style={{ flex: 1, display: "flex", flexDirection: "column" }}
                >
                  {/* Timer */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <span style={{ color: "rgba(20,184,166,0.6)", fontSize: "0.82rem", fontWeight: 700, letterSpacing: "0.2em" }}>
                      QUERY {qIndex + 1}/{QUESTIONS.length}
                    </span>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 8,
                      color: "#2dd4bf", fontFamily: "monospace", fontSize: "1.1rem",
                      background: "rgba(20,184,166,0.06)", padding: "0.3rem 0.7rem",
                      borderRadius: 8, border: "1px solid rgba(20,184,166,0.2)"
                    }}>
                      <Timer size={16} />
                      {(timeLeft / 1000).toFixed(1)}s
                    </div>
                  </div>

                  {/* Time bar */}
                  <div style={{ width: "100%", height: 3, background: "rgba(20,184,166,0.1)", marginBottom: "1.5rem", borderRadius: 999, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", background: timeLeft < 5000 ? "#ef4444" : "#14b8a6",
                      width: `${(timeLeft / TIME_PER_Q) * 100}%`,
                      transition: "width 0.1s linear"
                    }} />
                  </div>

                  <motion.div
                    animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
                    transition={{ duration: 0.3 }}
                    style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}
                  >
                    <div style={{
                      fontSize: "1.4rem", fontWeight: 700, letterSpacing: "0.03em",
                      color: "white", textShadow: "0 2px 8px rgba(0,0,0,0.3)",
                      marginBottom: "2rem"
                    }}>
                      {QUESTIONS[qIndex].text}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: "auto" }}>
                      <button
                        onClick={() => handleAnswer(true)}
                        style={{
                          padding: "1rem", borderRadius: 14, border: "2px solid rgba(20,184,166,0.3)",
                          background: "transparent", color: "#5eead4",
                          fontFamily: "var(--font-display), sans-serif", fontSize: "1.2rem",
                          letterSpacing: "0.2em", cursor: "pointer",
                          transition: "all 0.2s"
                        }}
                      >
                        TRUE
                      </button>
                      <button
                        onClick={() => handleAnswer(false)}
                        style={{
                          padding: "1rem", borderRadius: 14, border: "2px solid rgba(239,68,68,0.25)",
                          background: "transparent", color: "#fca5a5",
                          fontFamily: "var(--font-display), sans-serif", fontSize: "1.2rem",
                          letterSpacing: "0.2em", cursor: "pointer",
                          transition: "all 0.2s"
                        }}
                      >
                        FALSE
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{
                    flex: 1, display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center"
                  }}
                >
                  <div style={{
                    color: "#2dd4bf", fontSize: "2rem",
                    fontFamily: "var(--font-display), sans-serif",
                    letterSpacing: "0.2em", fontWeight: 700,
                    marginBottom: "2rem"
                  }}>
                    SYSTEM CLEARED
                  </div>
                  <button
                    onClick={() => onComplete(task.id)}
                    style={{
                      padding: "0.8rem 2.5rem", borderRadius: 12, border: "none",
                      background: "linear-gradient(90deg, #0f766e, #14b8a6)",
                      color: "white", fontSize: "1.05rem", fontWeight: 700,
                      letterSpacing: "0.1em", cursor: "pointer",
                      boxShadow: "0 0 20px rgba(20,184,166,0.3)"
                    }}
                  >
                    解读完毕，返回
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
