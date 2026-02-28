"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Skull, X, ShieldAlert } from "lucide-react";
import { sfxBossHit, sfxBossDefeat } from "@/lib/sfx";

interface BossBattleProps {
  bossName: string;
  maxHp: number;
  currentHp: number;
  onComplete: () => void;
  onCancel: () => void;
}

const MOCK_MISTAKES = [
  { type: "vocab", q: "inevitable", a: "不可避免的" },
  { type: "listening", q: "the rapid development", a: "快速发展" },
  { type: "grammar", q: "Despite many difficulties", a: "尽管有很多困难" },
  { type: "reading", q: "Technological revolutions usually create new jobs.", a: "True" }
];

export function BossBattle({ bossName, maxHp, currentHp, onComplete, onCancel }: BossBattleProps) {
  const [hp, setHp] = useState(currentHp > 0 ? currentHp : maxHp);
  const [qIndex, setQIndex] = useState(0);
  const [shake, setShake] = useState(false);
  const [hit, setHit] = useState(false);

  const hpPerHit = maxHp / MOCK_MISTAKES.length;
  const isDefeated = hp <= 0 || qIndex >= MOCK_MISTAKES.length;

  const handleStrike = () => {
    if (isDefeated) return;

    sfxBossHit();
    setHit(true);
    setShake(true);

    setTimeout(() => {
      setHp(prev => Math.max(0, prev - hpPerHit));
      setHit(false);
      setShake(false);

      if (qIndex + 1 < MOCK_MISTAKES.length) {
        setQIndex(prev => prev + 1);
      } else {
        sfxBossDefeat();
        setTimeout(() => onComplete(), 1500);
      }
    }, 400);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.95)", backdropFilter: "blur(16px)"
      }}
    >
      {/* Background Red Glow */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        display: "flex", alignItems: "center", justifyContent: "center"
      }}>
        <motion.div
          animate={shake
            ? { scale: [1, 1.05, 1], opacity: [0.3, 0.6, 0.3] }
            : { scale: 1, opacity: 0.25 }
          }
          transition={{ duration: 0.2 }}
          style={{
            width: "70vmin", height: "70vmin", maxWidth: 700, maxHeight: 700,
            background: "rgba(220,38,38,0.2)", borderRadius: "50%",
            filter: "blur(100px)"
          }}
        />
      </div>

      <div style={{
        position: "relative", width: "100%", maxWidth: 640,
        border: "1px solid rgba(220,38,38,0.2)", borderRadius: 24,
        background: "rgba(10,2,2,0.9)",
        boxShadow: "0 0 100px rgba(220,38,38,0.1)", overflow: "hidden"
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "1rem 1.5rem", borderBottom: "1px solid rgba(220,38,38,0.2)",
          background: "rgba(127,29,29,0.08)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 48, height: 48, borderRadius: "50%",
              border: "1px solid rgba(220,38,38,0.4)",
              background: "rgba(127,29,29,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#ef4444", boxShadow: "0 0 25px rgba(220,38,38,0.25)"
            }}>
              <Skull size={26} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.2rem", letterSpacing: "0.08em", color: "#fef2f2", fontFamily: "var(--font-display), sans-serif" }}>
                {bossName || "错题魔王 · 终极复盘"}
              </h3>
              <p style={{ margin: 0, fontSize: "0.78rem", color: "rgba(220,38,38,0.6)" }}>
                直面整周错题，粉碎核心弱点
              </p>
            </div>
          </div>
          <button onClick={onCancel} style={{ background: "transparent", border: "none", color: "rgba(220,38,38,0.3)", cursor: "pointer" }}>
            <X size={28} />
          </button>
        </div>

        <div style={{ padding: "2rem 2rem 3rem", display: "flex", flexDirection: "column", alignItems: "center", minHeight: 480 }}>
          {/* Boss Entity */}
          <motion.div
            animate={hit
              ? { x: [-15, 15, -10, 10, 0], filter: "brightness(2) contrast(1.5)" }
              : { y: [0, -10, 0] }
            }
            transition={hit
              ? { duration: 0.4 }
              : { duration: 4, repeat: Infinity, ease: "easeInOut" }
            }
            style={{
              width: 120, height: 120, marginBottom: "1.5rem",
              position: "relative", display: "flex",
              alignItems: "center", justifyContent: "center"
            }}
          >
            <div style={{
              position: "absolute", inset: 0,
              background: "rgba(220,38,38,0.15)",
              borderRadius: "50%", filter: "blur(25px)"
            }} />
            <ShieldAlert size={72} style={{ color: "#dc2626", filter: "drop-shadow(0 0 15px rgba(220,38,38,0.7))" }} />
          </motion.div>

          {/* Epic HP Bar */}
          <div style={{ width: "100%", maxWidth: 480, marginBottom: "2.5rem", position: "relative" }}>
            <div style={{
              textAlign: "center", color: "#ef4444",
              fontFamily: "var(--font-display), sans-serif",
              fontSize: "1.2rem", fontWeight: 700, letterSpacing: "0.3em",
              textShadow: "0 0 8px rgba(220,38,38,0.6)",
              marginBottom: 10
            }}>
              HP {Math.round(hp)} / {maxHp}
            </div>
            <div style={{
              width: "100%", height: 28, background: "#1f0a0a",
              borderRadius: 2, padding: 3,
              border: "2px solid rgba(127,29,29,0.5)",
              boxShadow: "inset 0 0 20px rgba(0,0,0,0.8)",
              overflow: "hidden", transform: "skewX(-15deg)"
            }}>
              <motion.div
                style={{
                  height: "100%",
                  background: "linear-gradient(90deg, #991b1b, #ef4444, #f87171)",
                  boxShadow: "0 0 20px #f87171"
                }}
                initial={{ width: `${(currentHp / maxHp) * 100}%` }}
                animate={{ width: `${(hp / maxHp) * 100}%` }}
                transition={{ type: "spring", stiffness: 50, damping: 10 }}
              />
            </div>
          </div>

          {/* Questions / Defeated */}
          <AnimatePresence mode="popLayout">
            {!isDefeated ? (
              <motion.div
                key={qIndex}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 1.1, y: -20, filter: "blur(10px)" }}
                style={{
                  width: "100%", maxWidth: 480, display: "flex",
                  flexDirection: "column", alignItems: "center",
                  background: "rgba(127,29,29,0.08)", padding: "2rem",
                  borderRadius: 18, border: "1px solid rgba(220,38,38,0.15)"
                }}
              >
                <div style={{
                  fontSize: "0.72rem", fontWeight: 700, color: "rgba(239,68,68,0.5)",
                  letterSpacing: "0.2em", textTransform: "uppercase" as const,
                  marginBottom: 14, border: "1px solid rgba(220,38,38,0.2)",
                  padding: "0.2rem 0.8rem", borderRadius: 999
                }}>
                  Target: {MOCK_MISTAKES[qIndex].type.toUpperCase()} Error
                </div>

                <h4 style={{
                  fontSize: "1.6rem", textAlign: "center", color: "white",
                  fontFamily: "monospace", letterSpacing: "0.05em",
                  marginBottom: "1.5rem", marginTop: 0
                }}>
                  {MOCK_MISTAKES[qIndex].q}
                </h4>

                <div style={{
                  fontSize: "1.05rem", color: "rgba(254,202,202,0.8)",
                  textAlign: "center", marginBottom: "2rem",
                  background: "rgba(127,29,29,0.2)", padding: "0.8rem 1.2rem",
                  borderRadius: 12, border: "1px solid rgba(220,38,38,0.1)",
                  width: "100%"
                }}>
                  <span style={{ display: "block", fontSize: "0.75rem", color: "rgba(239,68,68,0.4)", marginBottom: 6 }}>
                    Correct Answer
                  </span>
                  {MOCK_MISTAKES[qIndex].a}
                </div>

                <button
                  onClick={handleStrike}
                  disabled={hit}
                  style={{
                    width: "100%", padding: "1rem", borderRadius: 14,
                    background: "linear-gradient(90deg, #7f1d1d, #991b1b)",
                    border: "1px solid rgba(239,68,68,0.4)",
                    color: "#fecaca",
                    fontFamily: "var(--font-display), sans-serif",
                    fontSize: "1.15rem", letterSpacing: "0.15em",
                    boxShadow: "0 0 20px rgba(220,38,38,0.2)",
                    cursor: hit ? "wait" : "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  ⚔ STRIKE (记住了!)
                </button>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                  width: "100%", maxWidth: 480,
                  display: "flex", flexDirection: "column",
                  alignItems: "center", padding: "3rem 0"
                }}
              >
                <div style={{
                  fontSize: "3rem",
                  fontFamily: "var(--font-display), sans-serif",
                  fontWeight: 900,
                  background: "linear-gradient(180deg, #fde68a, #f59e0b, #dc2626)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  letterSpacing: "0.3em",
                  textShadow: "none",
                  filter: "drop-shadow(0 0 25px rgba(245,158,11,0.4))"
                }}>
                  DEFEATED
                </div>
                <p style={{ marginTop: 14, color: "rgba(253,230,138,0.6)" }}>
                  You have conquered your weekly weaknesses.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
