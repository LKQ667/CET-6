"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AudioLines, X, Volume2 } from "lucide-react";
import type { DailyTask } from "@/lib/types";
import { sfxTilePlace, sfxWrong, sfxVictory } from "@/lib/sfx";
import { cancelSpeech, speakText } from "@/lib/tts";

interface ListeningBattleProps {
  task: DailyTask;
  onComplete: (taskId: string) => void;
  onCancel: () => void;
}

const SENTENCES = [
  { en: "the rapid development of technology has improved human life", zh: "技术的飞速发展极大地改善了人类的生活。" },
  { en: "climate change poses a severe threat to global ecosystems", zh: "气候变化对全球生态系统构成了极其严重的威胁。" }
];

export function ListeningBattle({ task, onComplete, onCancel }: ListeningBattleProps) {
  const [sentenceObj] = useState(() => SENTENCES[Math.floor(Math.random() * SENTENCES.length)]);
  const sentence = sentenceObj.en;
  const [shuffledWords, setShuffledWords] = useState<{ id: string; word: string }[]>([]);
  const [assembledWords, setAssembledWords] = useState<{ id: string; word: string }[]>([]);
  const [shake, setShake] = useState(false);
  const [hp, setHp] = useState(100);
  const [playCount, setPlayCount] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [audioError, setAudioError] = useState("");
  const [cleared, setCleared] = useState(false);

  const originalWords = sentence.split(" ");
  const maxHp = 100;

  useEffect(() => {
    const words = originalWords.map((w, i) => ({ id: `${i}-${w}`, word: w }));
    for (let i = words.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [words[i], words[j]] = [words[j], words[i]];
    }
    setShuffledWords(words);
  }, [sentence]); // eslint-disable-line react-hooks/exhaustive-deps

  // TTS speak function
  const speakSentence = useCallback(async () => {
    setAudioError("");
    setSpeaking(true);
    const result = await speakText(sentence, {
      lang: "en-US",
      rate: 0.85,
      pitch: 1,
      onStart: () => setSpeaking(true),
      onEnd: () => setSpeaking(false),
      onError: () => setSpeaking(false)
    });
    if (result.ok) {
      setPlayCount((prev) => prev + 1);
      return;
    }
    setSpeaking(false);
    setAudioError("语音播放失败，请重试或检查浏览器语音权限。");
  }, [sentence]);

  // Auto-play on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      void speakSentence();
    }, 600);
    return () => {
      clearTimeout(timer);
      cancelSpeech();
    };
  }, [speakSentence]);

  const handleTileClick = (tile: { id: string; word: string }) => {
    const targetIndex = assembledWords.length;
    if (originalWords[targetIndex] === tile.word) {
      sfxTilePlace();
      setAssembledWords(prev => [...prev, tile]);
      setShuffledWords(prev => prev.filter(w => w.id !== tile.id));
      setHp(prev => Math.max(0, prev - (maxHp / originalWords.length)));

      if (targetIndex + 1 === originalWords.length) {
        sfxVictory();
        setCleared(true);
      }
    } else {
      sfxWrong();
      setShake(true);
      setTimeout(() => setShake(false), 400);
    }
  };

  const tileBase: React.CSSProperties = {
    padding: "0.7rem 1.2rem", borderRadius: 14,
    border: "1px solid rgba(34,211,238,0.35)",
    background: "rgba(8,145,178,0.12)", color: "#cffafe",
    fontWeight: 500, fontSize: "1.05rem", letterSpacing: "0.03em",
    cursor: "pointer", transition: "all 0.2s"
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(7,11,18,0.92)", backdropFilter: "blur(12px)"
      }}
    >
      <div style={{
        width: "100%", maxWidth: 760,
        border: "1px solid rgba(8,145,178,0.25)", borderRadius: 24,
        background: "#0a111a",
        boxShadow: "0 0 60px rgba(8,145,178,0.12)", overflow: "hidden"
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "1.2rem 1.8rem", borderBottom: "1px solid rgba(8,145,178,0.2)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: "50%",
              border: "1px solid rgba(34,211,238,0.25)",
              background: "rgba(34,211,238,0.08)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#22d3ee", boxShadow: "0 0 18px rgba(34,211,238,0.15)"
            }}>
              <AudioLines size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.2rem", letterSpacing: "0.08em", color: "#ecfeff", fontFamily: "var(--font-display), sans-serif" }}>
                声波怪 · 截击区
              </h3>
              <p style={{ margin: 0, fontSize: "0.82rem", color: "rgba(8,145,178,0.7)" }}>
                按正确语序点击漂浮的词块复原真题残卷
              </p>
            </div>
          </div>
          <button onClick={onCancel} style={{ background: "transparent", border: "none", color: "rgba(8,145,178,0.5)", cursor: "pointer" }}>
            <X size={28} />
          </button>
        </div>

        {/* TTS Replay Bar */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 14, padding: "0.8rem 1.8rem",
          background: "rgba(34,211,238,0.04)",
          borderBottom: "1px solid rgba(8,145,178,0.1)"
        }}>
          <button
            onClick={() => {
              void speakSentence();
            }}
            disabled={speaking}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "0.5rem 1.2rem", borderRadius: 12,
              border: speaking ? "1px solid rgba(34,211,238,0.5)" : "1px solid rgba(34,211,238,0.25)",
              background: speaking ? "rgba(34,211,238,0.12)" : "rgba(34,211,238,0.05)",
              color: "#67e8f9", cursor: speaking ? "wait" : "pointer",
              fontSize: "0.92rem", fontWeight: 600,
              transition: "all 0.2s",
              boxShadow: speaking ? "0 0 15px rgba(34,211,238,0.2)" : "none"
            }}
          >
            <Volume2 size={18} style={{ animation: speaking ? "pulse 1s infinite" : "none" }} />
            {speaking ? "正在播放..." : "重新播放"}
          </button>
          <span style={{ fontSize: "0.75rem", color: "rgba(34,211,238,0.4)" }}>
            已播放 {playCount} 次
          </span>
        </div>
        {audioError ? (
          <div
            style={{
              padding: "0.5rem 1.8rem",
              color: "#fda4af",
              fontSize: "0.82rem",
              borderBottom: "1px solid rgba(244,63,94,0.2)",
              background: "rgba(127,29,29,0.12)"
            }}
          >
            {audioError}
          </div>
        ) : null}

        {/* Arena */}
        <div style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "2rem", minHeight: 400 }}>
          {/* HP */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontWeight: 700, color: "rgba(8,145,178,0.7)", marginBottom: 8, letterSpacing: "0.2em", textTransform: "uppercase" as const }}>
              <span>Sonic Anomaly</span>
              <span style={{ color: "#22d3ee" }}>{Math.round(hp)}%</span>
            </div>
            <div style={{ height: 8, background: "#05080f", borderRadius: 999, overflow: "hidden" }}>
              <motion.div
                style={{ height: "100%", background: "linear-gradient(90deg, #0891b2, #67e8f9)", boxShadow: "0 0 12px #22d3ee" }}
                animate={{ width: `${(hp / maxHp) * 100}%` }}
              />
            </div>
          </div>

          <motion.div
            animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
            transition={{ duration: 0.3 }}
            style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1.5rem" }}
          >
            {/* Word tiles */}
            <div style={{
              flex: 1, minHeight: 140, padding: "1.5rem", borderRadius: 18,
              border: "1px solid rgba(8,145,178,0.15)", background: "#0c1622",
              display: "flex", flexWrap: "wrap", alignContent: "flex-start", gap: 14,
              boxShadow: "inset 0 2px 15px rgba(0,0,0,0.4)"
            }}>
              <AnimatePresence>
                {shuffledWords.map(tile => (
                  <motion.button
                    layoutId={`tile-${tile.id}`}
                    key={tile.id}
                    onClick={() => handleTileClick(tile)}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    whileHover={{ scale: 1.08, boxShadow: "0 0 18px rgba(34,211,238,0.35)" }}
                    whileTap={{ scale: 0.93 }}
                    style={tileBase}
                  >
                    {tile.word}
                  </motion.button>
                ))}
              </AnimatePresence>
              {shuffledWords.length === 0 && assembledWords.length < originalWords.length && (
                <div style={{ width: "100%", textAlign: "center", color: "rgba(8,145,178,0.3)", letterSpacing: "0.3em", marginTop: 40 }}>
                  NO SIGNAL
                </div>
              )}
            </div>

            {/* Assembly zone */}
            <div style={{
              position: "relative", padding: "1.5rem", borderRadius: 18,
              borderBottom: "2px solid rgba(34,211,238,0.4)", background: "#070b12",
              display: "flex", flexWrap: "wrap", gap: 14, minHeight: 90,
              boxShadow: "inset 0 -20px 35px rgba(8,145,178,0.04)"
            }}>
              {assembledWords.map(tile => (
                <motion.div
                  layoutId={`tile-${tile.id}`}
                  key={tile.id}
                  style={{
                    ...tileBase, cursor: "default",
                    background: "rgba(34,211,238,0.15)",
                    borderColor: "rgba(34,211,238,0.4)",
                    boxShadow: "0 4px 12px rgba(34,211,238,0.15)"
                  }}
                >
                  {tile.word}
                </motion.div>
              ))}
              {assembledWords.length === 0 && (
                <div style={{
                  position: "absolute", inset: 0, display: "flex",
                  alignItems: "center", justifyContent: "center",
                  color: "rgba(8,145,178,0.2)", letterSpacing: "0.3em",
                  fontWeight: 700, fontSize: "0.9rem"
                }}>
                  SEQUENCE ASSEMBLY
                </div>
              )}
            </div>

            {cleared && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  marginTop: "1rem", padding: "1.2rem", borderRadius: 14,
                  background: "rgba(34,211,238,0.1)", border: "1px dashed rgba(34,211,238,0.3)",
                  textAlign: "center"
                }}
              >
                <div style={{ color: "#ecfeff", fontSize: "1.1rem", marginBottom: 6, fontWeight: 500 }}>
                  {sentenceObj.en}
                </div>
                <div style={{ color: "rgba(34,211,238,0.9)", fontSize: "0.95rem", marginBottom: 20 }}>
                  {sentenceObj.zh}
                </div>
                <button
                  onClick={() => onComplete(task.id)}
                  style={{
                    padding: "0.8rem 2.5rem", borderRadius: 12, border: "none",
                    background: "linear-gradient(90deg, #0891b2, #06b6d4)",
                    color: "white", fontSize: "1.05rem", fontWeight: 700,
                    letterSpacing: "0.1em", cursor: "pointer",
                    boxShadow: "0 0 20px rgba(8,145,178,0.4)"
                  }}
                >
                  复原完毕，返回
                </button>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
