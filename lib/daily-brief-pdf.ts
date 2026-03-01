import fs from "node:fs";
import https from "node:https";
import path from "node:path";
import PDFDocument from "pdfkit";

import type { BaselineScore, DailyTask, VocabEntry } from "@/lib/types";

interface DailyBriefPdfInput {
  userEmail?: string;
  date: string;
  prepStartDate: string;
  prepEndDate: string;
  targetScore: number;
  baseline: BaselineScore;
  tasks: DailyTask[];
  vocab: VocabEntry[];
}

const FONT_CACHE_PATH = path.join("/tmp", "NotoSansSC-Regular.ttf");
const FONT_CDN_URL =
  "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/notosanssc/NotoSansSC%5Bwght%5D.ttf";

/** 从 CDN 下载字体到 /tmp 缓存，已存在则跳过 */
async function ensureCdnFont(): Promise<string | null> {
  if (fs.existsSync(FONT_CACHE_PATH)) {
    return FONT_CACHE_PATH;
  }
  return new Promise((resolve) => {
    const file = fs.createWriteStream(FONT_CACHE_PATH);
    const req = https.get(FONT_CDN_URL, { timeout: 8000 }, (res) => {
      // 跟随重定向
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        fs.unlinkSync(FONT_CACHE_PATH);
        https.get(res.headers.location, { timeout: 8000 }, (redirectRes) => {
          redirectRes.pipe(file);
          file.on("finish", () => {
            file.close();
            // 验证文件大小 > 100KB 才算有效
            try {
              const stat = fs.statSync(FONT_CACHE_PATH);
              resolve(stat.size > 100_000 ? FONT_CACHE_PATH : null);
            } catch {
              resolve(null);
            }
          });
        }).on("error", () => {
          file.close();
          resolve(null);
        });
        return;
      }
      if (res.statusCode !== 200) {
        file.close();
        resolve(null);
        return;
      }
      res.pipe(file);
      file.on("finish", () => {
        file.close();
        try {
          const stat = fs.statSync(FONT_CACHE_PATH);
          resolve(stat.size > 100_000 ? FONT_CACHE_PATH : null);
        } catch {
          resolve(null);
        }
      });
    });
    req.on("error", () => {
      file.close();
      resolve(null);
    });
    req.on("timeout", () => {
      req.destroy();
      file.close();
      resolve(null);
    });
  });
}

function pickCjkFontPath() {
  const candidates = [
    path.join(process.cwd(), "public", "fonts", "NotoSansSC-Regular.ttf"),
    FONT_CACHE_PATH,
    "C:\\Windows\\Fonts\\simhei.ttf",
    "C:\\Windows\\Fonts\\msyh.ttf",
    "/usr/share/fonts/truetype/noto/NotoSansSC-Regular.ttf",
    "/usr/share/fonts/truetype/noto/NotoSansCJKsc-Regular.otf"
  ];

  for (const fontPath of candidates) {
    try {
      if (fs.existsSync(fontPath)) {
        const stat = fs.statSync(fontPath);
        if (stat.size > 100_000) {
          return fontPath;
        }
      }
    } catch {
      continue;
    }
  }
  return null;
}

function pad2(num: number) {
  return String(num).padStart(2, "0");
}

function nowStamp() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function cleanText(input: string) {
  return input.replace(/\s+/g, " ").trim();
}

export async function buildDailyBriefPdfBuffer(input: DailyBriefPdfInput) {
  // 先确保字体可用
  await ensureCdnFont();

  return await new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 44, left: 44, right: 44, bottom: 44 },
      compress: true,
      info: {
        Title: `CET-6 每日备考计划 ${input.date}`,
        Author: "CET-6 Private Coach",
        Subject: "Daily Study Brief"
      }
    });

    const buffers: Buffer[] = [];
    doc.on("data", (chunk) => buffers.push(Buffer.from(chunk)));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    const cjkFont = pickCjkFontPath();
    if (cjkFont) {
      try {
        doc.font(cjkFont);
      } catch {
        doc.font("Helvetica");
      }
    } else {
      doc.font("Helvetica");
    }

    doc.fontSize(20).fillColor("#0f172a").text("CET-6 每日备考计划", { align: "left" });
    doc.moveDown(0.4);
    doc.fontSize(10).fillColor("#475569").text(`日期：${input.date}`);
    doc.text(`备考周期：${input.prepStartDate} - ${input.prepEndDate}`);
    doc.text(`目标分：${input.targetScore}+`);
    doc.text(
      `当前基线：总分 ${input.baseline.total} / 听力 ${input.baseline.listening} / 阅读 ${input.baseline.reading} / 写译 ${input.baseline.writingTranslation}`
    );
    if (input.userEmail) {
      doc.text(`账号：${input.userEmail}`);
    }
    doc.text(`生成时间：${nowStamp()}`);

    doc.moveDown(0.8);
    doc.fontSize(14).fillColor("#0f172a").text("一、今日任务（建议 35-45 分钟）");
    doc.moveDown(0.4);
    doc.fontSize(10).fillColor("#111827");
    input.tasks.forEach((task, index) => {
      const status = task.completed ? "已完成" : "待完成";
      doc.text(
        `${index + 1}. [${status}] ${cleanText(task.title)}（${task.estimatedMinutes} 分钟）`,
        { continued: false }
      );
      doc.fillColor("#374151").text(`   ${cleanText(task.description)}`);
      doc.fillColor("#111827");
    });

    doc.moveDown(0.8);
    doc.fontSize(14).fillColor("#0f172a").text("二、今日真题词汇（精选）");
    doc.moveDown(0.4);
    doc.fontSize(10).fillColor("#111827");
    const vocabSlice = input.vocab.slice(0, 16);
    vocabSlice.forEach((item, index) => {
      doc.text(`${index + 1}. ${item.lemma}  ${item.meaningZh}`);
    });

    doc.moveDown(0.8);
    doc.fontSize(14).fillColor("#0f172a").text("三、晚间复盘清单（21:40）");
    doc.moveDown(0.4);
    doc.fontSize(10).fillColor("#111827");
    doc.text("1) 回看今天未完成任务，优先补齐 1 项弱项任务。");
    doc.text("2) 复盘错词与出处，标记明日回流词。");
    doc.text("3) 写译用 10 分钟做 1 组微练，保持语感。");

    doc.moveDown(0.8);
    doc.fontSize(9).fillColor("#64748b").text(
      "说明：本 PDF 为当日训练摘要，配合晚间提醒推送使用；词汇主库仍以可追溯真题来源为准。"
    );

    doc.end();
  });
}
