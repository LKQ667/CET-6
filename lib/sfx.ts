/**
 * 纯 Web Audio API 合成的游戏音效引擎
 * 无需任何外部音频文件，全部用振荡器 + 增益包络实时生成
 */

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  // Resume if suspended (autoplay policy)
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/** 播放一个短音符 */
function playTone(
  freq: number,
  type: OscillatorType,
  duration: number,
  volume = 0.3,
  delay = 0
) {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
  gain.gain.setValueAtTime(0, ctx.currentTime + delay);
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + delay + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime + delay);
  osc.stop(ctx.currentTime + delay + duration + 0.05);
}

/** 播放噪音脉冲（用于打击感） */
function playNoise(duration: number, volume = 0.15) {
  const ctx = getCtx();
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  source.connect(gain);
  gain.connect(ctx.destination);
  source.start();
}

// ============================================================
// 公开的音效函数
// ============================================================

/** 🟢 正确输入/选择 —— 清脆上行音 */
export function sfxCorrect() {
  playTone(660, "sine", 0.12, 0.25);
  playTone(880, "sine", 0.15, 0.2, 0.06);
}

/** 🔴 错误输入 —— 低沉的蜂鸣 */
export function sfxWrong() {
  playTone(180, "square", 0.2, 0.2);
  playTone(140, "square", 0.25, 0.15, 0.08);
}

/** ⚔ 字符正确敲击 —— 轻微的打字咔嗒声 */
export function sfxKeystroke() {
  playTone(1200 + Math.random() * 400, "sine", 0.04, 0.1);
}

/** 💥 伤害/扣血 —— 打击 + 噪音 */
export function sfxHit() {
  playTone(220, "sawtooth", 0.15, 0.25);
  playNoise(0.1, 0.2);
  playTone(110, "sine", 0.2, 0.15, 0.05);
}

/** 🎉 通关/击杀 —— 上行和弦琶音 */
export function sfxVictory() {
  playTone(523, "sine", 0.25, 0.2, 0);       // C5
  playTone(659, "sine", 0.25, 0.2, 0.12);    // E5
  playTone(784, "sine", 0.25, 0.2, 0.24);    // G5
  playTone(1047, "sine", 0.4, 0.25, 0.36);   // C6
}

/** 💀 Boss 受击 —— 重击 + 低频震荡 */
export function sfxBossHit() {
  playTone(80, "sawtooth", 0.3, 0.3);
  playNoise(0.15, 0.25);
  playTone(60, "sine", 0.4, 0.2, 0.1);
  playTone(150, "square", 0.1, 0.15, 0.05);
}

/** 💀 Boss 死亡 —— 爆炸 + 胜利 fanfare */
export function sfxBossDefeat() {
  // 爆炸
  playNoise(0.5, 0.35);
  playTone(60, "sawtooth", 0.5, 0.3);
  // 短暂静默后 fanfare
  playTone(523, "sine", 0.2, 0.2, 0.6);
  playTone(659, "sine", 0.2, 0.2, 0.75);
  playTone(784, "sine", 0.2, 0.2, 0.9);
  playTone(1047, "triangle", 0.5, 0.3, 1.05);
}

/** 🔔 词块正确放置噪音 */
export function sfxTilePlace() {
  playTone(800, "sine", 0.08, 0.15);
  playTone(1000, "sine", 0.08, 0.12, 0.04);
}

/** ⏰ 倒计时紧迫滴答 */
export function sfxTick() {
  playTone(1000, "sine", 0.03, 0.08);
}

/** ⚡ 斩击白光音效 */
export function sfxSlash() {
  playNoise(0.08, 0.3);
  playTone(2000, "sawtooth", 0.08, 0.2);
  playTone(800, "sine", 0.15, 0.15, 0.05);
}
