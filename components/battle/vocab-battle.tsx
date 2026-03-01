"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Swords, X } from "lucide-react";
import type { DailyTask, VocabEntry } from "@/lib/types";
import { sfxKeystroke, sfxWrong, sfxHit, sfxVictory } from "@/lib/sfx";
import { speakText } from "@/lib/tts";

const MOCK_WORDS = [
  { en: "inevitable", ph: "/ɪnˈɛvɪtəbəl/", zh: "不可避免的" },
  { en: "sustainable", ph: "/səˈsteɪnəbəl/", zh: "可持续的" },
  { en: "innovative", ph: "/ˈɪnəveɪtɪv/", zh: "创新的" },
  { en: "vulnerable", ph: "/ˈvʌlnərəbəl/", zh: "脆弱的" },
  { en: "ambiguous", ph: "/æmˈbɪɡjuəs/", zh: "模棱两可的" }
];

interface VocabBattleProps {
  task: DailyTask;
  vocabList?: VocabEntry[];
  onComplete: (taskId: string) => void;
  onCancel: () => void;
}

export function VocabBattle({ task, vocabList, onComplete, onCancel }: VocabBattleProps) {
  const [words, setWords] = useState<{ en: string; zh: string; ph?: string | null }[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputVal, setInputVal] = useState("");
  const [shake, setShake] = useState(false);
  const [hp, setHp] = useState(100);
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    if (vocabList && vocabList.length > 0) {
      setWords(vocabList.slice(0, 5).map(v => ({ en: v.lemma, zh: v.meaningZh, ph: v.phonetic })));
    } else {
      setWords(MOCK_WORDS);
    }
  }, [vocabList]);

  const maxHp = 100;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (cleared || words.length === 0) return;
    if (currentIndex >= words.length) return;

    const targetWord = words[currentIndex].en;
    const hpPerWord = maxHp / words.length;

    if (e.key === "Backspace") {
      setInputVal(prev => prev.slice(0, -1));
      return;
    }

    if (/^[a-zA-Z\s-]$/.test(e.key)) {
      const nextVal = inputVal + e.key.toLowerCase();

      if (!targetWord.startsWith(nextVal)) {
        sfxWrong();
        setShake(true);
        setTimeout(() => setShake(false), 300);
        return;
      }

      sfxKeystroke();
      setInputVal(nextVal);

      if (nextVal === targetWord) {
        sfxHit();
        
        // Read out the word when completed
        void speakText(targetWord, { lang: "en-US", rate: 0.9 });

        setHp(prev => Math.max(0, prev - hpPerWord));
        setTimeout(() => {
          const nextIndex = currentIndex + 1;
          setCurrentIndex(nextIndex);
          setInputVal("");
          if (nextIndex >= words.length) {
            sfxVictory();
            setCleared(true);
          }
        }, 1100);
      }
    }
  }, [inputVal, currentIndex, words, cleared]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (words.length === 0) return null;

  const currentWord = words[currentIndex] || words[words.length - 1];

  const renderSpellChars = () => {
    if (cleared) {
      return <span style={{ color: "var(--green)", fontSize: "2rem", fontWeight: 800, letterSpacing: "0.3em" }}>CLEARED!</span>;
    }
    return currentWord.en.split("").map((char, i) => {
      let color = "rgba(255,255,255,0.2)";
      let shadow = "none";
      if (i < inputVal.length) {
        if (inputVal[i] === char) {
          color = "var(--green)";
          shadow = "0 0 12px rgba(127,239,189,0.6)";
        } else {
          color = "var(--danger)";
          shadow = "0 0 12px rgba(255,156,140,0.6)";
        }
      }
      const isCursor = i === inputVal.length;
      return (
        <span
          key={i}
          style={{
            display: "inline-block",
            margin: "0 3px",
            fontFamily: "monospace",
            fontSize: "2rem",
            fontWeight: 700,
            textTransform: "lowercase",
            color,
            textShadow: shadow,
            transition: "color 0.15s, text-shadow 0.15s",
            borderBottom: isCursor ? "2px solid var(--gold)" : "2px solid transparent",
          }}
        >
          {char}
        </span>
      );
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)"
      }}
    >
      <div style={{
        width: "100%", maxWidth: 680, background: "var(--bg-1)",
        border: "2px solid rgba(99,102,241,0.3)", borderRadius: 20,
        boxShadow: "0 25px 80px rgba(0,0,0,0.6), 0 0 40px rgba(99,102,241,0.15)",
        overflow: "hidden", display: "flex", flexDirection: "column"
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "1rem 1.5rem", borderBottom: "1px solid rgba(99,102,241,0.2)",
          background: "rgba(5,10,20,0.5)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: "50%",
              background: "rgba(99,102,241,0.15)", display: "flex",
              alignItems: "center", justifyContent: "center",
              color: "#818cf8", boxShadow: "0 0 20px rgba(99,102,241,0.3)"
            }}>
              <Swords size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.15rem", letterSpacing: "0.08em", color: "#e0e7ff", fontFamily: "var(--font-display), sans-serif" }}>
                审讯室 · 情报怪
              </h3>
              <p style={{ margin: 0, fontSize: "0.78rem", color: "rgba(129,140,248,0.7)" }}>
                按键盘输入正确拼写以造成伤害
              </p>
            </div>
          </div>
          <button onClick={onCancel} style={{
            background: "transparent", border: "none", color: "rgba(255,255,255,0.4)",
            cursor: "pointer", padding: 4
          }}>
            <X size={24} />
          </button>
        </div>

        {/* Arena */}
        <div style={{
          padding: "2.5rem 2rem", display: "flex", flexDirection: "column",
          alignItems: "center", flex: 1,
          background: "radial-gradient(ellipse at top, rgba(30,30,60,0.6), transparent)"
        }}>
          {/* Monster HP Bar */}
          <div style={{ width: "100%", maxWidth: 360, marginBottom: "2.5rem", textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.15em", textTransform: "uppercase" as const }}>
                情报眼魔
              </span>
              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--danger)" }}>
                {Math.round(hp)} / 100
              </span>
            </div>
            <div style={{
              width: "100%", height: 16, background: "rgba(255,255,255,0.06)",
              borderRadius: 999, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)"
            }}>
              <motion.div
                style={{
                  height: "100%", borderRadius: 999,
                  background: "linear-gradient(90deg, #dc2626, #f87171)",
                  boxShadow: "0 0 12px rgba(248,113,113,0.7)"
                }}
                initial={{ width: "100%" }}
                animate={{ width: `${(hp / maxHp) * 100}%` }}
                transition={{ type: "spring", stiffness: 100, damping: 15 }}
              />
            </div>
          </div>

          <AnimatePresence mode="wait">
            {!cleared ? (
              <motion.div
                key="target"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0, filter: "blur(4px)" }}
                style={{ textAlign: "center", width: "100%" }}
              >
                <div style={{ fontSize: "0.82rem", color: "#818cf8", fontWeight: 700, letterSpacing: "0.2em", marginBottom: 8 }}>
                  TARGET {currentIndex + 1} / {words.length}
                </div>
                <div style={{
                  fontSize: "1.8rem", fontWeight: 900, letterSpacing: "0.1em",
                  color: "white", marginBottom: currentWord.ph ? "0.5rem" : "2rem",
                  textShadow: "0 2px 12px rgba(255,255,255,0.15)"
                }}>
                  {currentWord.zh}
                </div>
                {currentWord.ph && (
                  <div style={{
                    fontSize: "1rem", color: "rgba(165,180,252,0.8)",
                    fontFamily: "var(--font-sans), sans-serif", letterSpacing: "0.05em",
                    marginBottom: "2rem"
                  }}>
                    {currentWord.ph}
                  </div>
                )}

                <motion.div
                  animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
                  transition={{ duration: 0.3 }}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "1.5rem", background: "rgba(0,0,0,0.4)",
                    border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16,
                    minHeight: 100, width: "100%", maxWidth: 520, margin: "0 auto",
                    boxShadow: "inset 0 0 25px rgba(0,0,0,0.7)"
                  }}
                >
                  {renderSpellChars()}
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                key="summary"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ width: "100%", maxWidth: 520, margin: "0 auto", textAlign: "center" }}
              >
                <h4 style={{ color: "var(--green)", fontSize: "1.5rem", marginBottom: "1.5rem", fontWeight: 800, letterSpacing: "0.2em" }}>CLEARED!</h4>
                <div style={{
                  background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)",
                  borderRadius: 16, overflow: "hidden", marginBottom: "2rem"
                }}>
                  {words.map((w, idx) => (
                    <div key={w.en} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "0.8rem 1.2rem", borderBottom: idx < words.length - 1 ? "1px solid rgba(99,102,241,0.1)" : "none"
                    }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                        <span style={{ color: "#a5b4fc", fontSize: "1.1rem", fontWeight: 700, fontFamily: "monospace" }}>{w.en}</span>
                        {w.ph && <span style={{ color: "rgba(165,180,252,0.6)", fontSize: "0.85rem", marginTop: 4 }}>{w.ph}</span>}
                      </div>
                      <span style={{ color: "white", fontSize: "0.95rem", textAlign: "right", maxWidth: "50%" }}>{w.zh}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => onComplete(task.id)}
                  style={{
                    padding: "0.8rem 2.5rem", borderRadius: 12, border: "none",
                    background: "linear-gradient(90deg, #4f46e5, #6366f1)",
                    color: "white", fontSize: "1.05rem", fontWeight: 700,
                    letterSpacing: "0.1em", cursor: "pointer",
                    boxShadow: "0 0 20px rgba(99,102,241,0.4)"
                  }}
                >
                  情报获取完毕，返回
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
