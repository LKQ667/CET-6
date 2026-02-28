"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Hammer, X } from "lucide-react";
import type { DailyTask } from "@/lib/types";
import { sfxSlash, sfxWrong, sfxVictory } from "@/lib/sfx";

interface WritingBattleProps {
  task: DailyTask;
  onComplete: (taskId: string) => void;
  onCancel: () => void;
}

const QUESTION = {
  zh: "尽管面临许多困难，他们还是按时完成了项目。",
  options: [
    { id: "A", text: "Despite of many difficulties, they finished the project on time.", isCorrect: false, reason: "Despite 不接 of，应为 Despite many difficulties 或 In spite of many difficulties。" },
    { id: "B", text: "Despite facing many difficulties, they finished the project on time.", isCorrect: true, reason: "完全正确！Despite + doing / noun 结构地道，主从句逻辑清晰。" },
    { id: "C", text: "Although they faced many difficulties, but they finished the project on time.", isCorrect: false, reason: "Although 和 but 不能同时出现在一个句子中。" }
  ]
};

export function WritingBattle({ task, onComplete, onCancel }: WritingBattleProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [slash, setSlash] = useState(false);
  const [shake, setShake] = useState(false);
  const [hp, setHp] = useState(100);
  const [cleared, setCleared] = useState(false);

  const handleSelect = (id: string, isCorrect: boolean) => {
    if (hp <= 0) return;
    setSelectedId(id);

    if (isCorrect) {
      sfxSlash();
      setSlash(true);
      setTimeout(() => setSlash(false), 500);
      setHp(0);
      sfxVictory();
      setCleared(true);
    } else {
      sfxWrong();
      setShake(true);
      setTimeout(() => setShake(false), 400);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(9,9,11,0.93)", backdropFilter: "blur(12px)"
      }}
    >
      {/* Slash effect */}
      <AnimatePresence>
        {slash && (
          <motion.div
            initial={{ scaleX: 0, opacity: 1, rotate: 15 }}
            animate={{ scaleX: 1.5, opacity: 0, rotate: 15 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            style={{
              position: "absolute", width: "150%", height: 4,
              background: "white", boxShadow: "0 0 20px #fff, 0 0 40px #facc15",
              transformOrigin: "left center", top: "45%", left: "-20%",
              zIndex: 10, mixBlendMode: "screen"
            }}
          />
        )}
      </AnimatePresence>

      <div style={{
        width: "100%", maxWidth: 720, borderRadius: 16,
        background: "var(--bg-1)", border: "2px solid rgba(255,255,255,0.08)",
        boxShadow: "0 25px 80px rgba(0,0,0,0.7)", overflow: "hidden"
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "1rem 1.5rem", borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(5,5,8,0.5)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: "50%",
              background: "rgba(245,158,11,0.1)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#f59e0b"
            }}>
              <Hammer size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.15rem", letterSpacing: "0.08em", color: "#fffbeb", fontFamily: "var(--font-display), sans-serif" }}>
                文法锻造台 · 构造怪
              </h3>
              <p style={{ margin: 0, fontSize: "0.78rem", color: "rgba(245,158,11,0.6)" }}>
                挑选唯一正确的结构，斩击错误逻辑
              </p>
            </div>
          </div>
          <button onClick={onCancel} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer" }}>
            <X size={24} />
          </button>
        </div>

        <div style={{ padding: "2rem" }}>
          {/* HP bar */}
          <div style={{ width: "100%", height: 4, background: "rgba(255,255,255,0.06)", marginBottom: "2rem", borderRadius: 999, overflow: "hidden" }}>
            <motion.div
              style={{ height: "100%", background: "linear-gradient(90deg, #d97706, #fbbf24)" }}
              animate={{ width: `${hp}%` }}
            />
          </div>

          {/* Question */}
          <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
            <h2 style={{
              fontSize: "1.6rem", fontWeight: 700, letterSpacing: "0.05em",
              color: "white", textShadow: "0 2px 8px rgba(0,0,0,0.4)", margin: 0
            }}>
              &ldquo;{QUESTION.zh}&rdquo;
            </h2>
          </div>

          {/* Options */}
          <motion.div
            animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
            transition={{ duration: 0.3 }}
            style={{ display: "flex", flexDirection: "column", gap: 14 }}
          >
            {QUESTION.options.map(opt => {
              const isSelected = selectedId === opt.id;
              let borderColor = "rgba(255,255,255,0.08)";
              let bg = "rgba(255,255,255,0.02)";
              let textColor = "rgba(255,255,255,0.7)";

              if (isSelected) {
                if (opt.isCorrect) {
                  borderColor = "rgba(245,158,11,0.6)";
                  bg = "rgba(245,158,11,0.08)";
                  textColor = "#fde68a";
                } else {
                  borderColor = "rgba(239,68,68,0.5)";
                  bg = "rgba(239,68,68,0.08)";
                  textColor = "#fca5a5";
                }
              }

              return (
                <button
                  key={opt.id}
                  onClick={() => handleSelect(opt.id, opt.isCorrect)}
                  disabled={hp <= 0}
                  style={{
                    textAlign: "left", padding: "1.2rem", borderRadius: 14,
                    border: `2px solid ${borderColor}`, background: bg,
                    cursor: hp <= 0 ? "default" : "pointer",
                    transition: "all 0.2s", color: textColor, width: "100%"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                    <span style={{ fontFamily: "monospace", fontSize: "1.2rem", fontWeight: 700 }}>{opt.id}.</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: "1.05rem", fontWeight: 500 }}>{opt.text}</p>
                      <AnimatePresence>
                        {isSelected && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1, marginTop: 12 }}
                            style={{ overflow: "hidden" }}
                          >
                            <p style={{
                              margin: 0, fontSize: "0.88rem", padding: "0.7rem 0.9rem", borderRadius: 10,
                              background: opt.isCorrect ? "rgba(245,158,11,0.15)" : "rgba(239,68,68,0.12)",
                              color: opt.isCorrect ? "#fde68a" : "#fca5a5"
                            }}>
                              {opt.reason}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </button>
              );
            })}
          </motion.div>

          <AnimatePresence>
            {cleared && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ marginTop: "2rem", display: "flex", justifyContent: "center" }}
              >
                <button
                  onClick={() => onComplete(task.id)}
                  style={{
                    padding: "0.8rem 2.5rem", borderRadius: 12, border: "none",
                    background: "linear-gradient(90deg, #d97706, #f59e0b)",
                    color: "white", fontSize: "1.05rem", fontWeight: 700,
                    letterSpacing: "0.1em", cursor: "pointer",
                    boxShadow: "0 0 20px rgba(245,158,11,0.4)"
                  }}
                >
                  构造完毕，返回
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
