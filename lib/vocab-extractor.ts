const stopWords = new Set([
  "the",
  "and",
  "for",
  "that",
  "with",
  "this",
  "from",
  "have",
  "were",
  "been",
  "their",
  "they",
  "will",
  "would",
  "there",
  "about",
  "which",
  "when",
  "while",
  "what",
  "where",
  "whose",
  "your",
  "essay",
  "write",
  "minutes",
  "words"
]);

function normalizeWord(word: string) {
  return word.toLowerCase().replace(/[^a-z-]/g, "");
}

async function parsePdfBuffer(buffer: Buffer) {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({
    data: buffer
  });
  const result = await parser.getText();
  await parser.destroy();
  return result.text ?? "";
}

export async function extractTextFromFile(fileName: string, buffer: Buffer) {
  if (fileName.toLowerCase().endsWith(".txt")) {
    return buffer.toString("utf8");
  }
  if (fileName.toLowerCase().endsWith(".pdf")) {
    return parsePdfBuffer(buffer);
  }
  throw new Error("暂只支持 TXT/PDF 文件。");
}

export function extractCandidatesFromText(text: string) {
  const rawWords = text.split(/\s+/g);
  const counter = new Map<string, number>();
  for (const raw of rawWords) {
    const normalized = normalizeWord(raw);
    if (normalized.length < 4) {
      continue;
    }
    if (stopWords.has(normalized)) {
      continue;
    }
    counter.set(normalized, (counter.get(normalized) ?? 0) + 1);
  }

  return [...counter.entries()]
    .filter(([, frequency]) => frequency >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 120)
    .map(([lemma, frequency]) => ({
      lemma,
      frequency,
      contextSnippet: `自动抽取（频次 ${frequency}）`
    }));
}
