import { createHmac, timingSafeEqual } from "node:crypto";

interface TokenInput {
  userId: string;
  date: string;
  expiresAt: number;
}

function getSecret() {
  return (
    process.env.DAILY_PDF_SECRET ??
    process.env.CRON_SECRET ??
    "dev-daily-pdf-secret"
  );
}

function signCore(input: TokenInput) {
  const raw = `${input.userId}:${input.date}:${input.expiresAt}`;
  return createHmac("sha256", getSecret()).update(raw).digest("hex");
}

export function createDailyPdfToken(input: TokenInput) {
  return signCore(input);
}

export function verifyDailyPdfToken(input: TokenInput & { token: string }) {
  const expected = signCore(input);
  const left = Buffer.from(expected, "hex");
  const right = Buffer.from(input.token, "hex");
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}

export function buildSignedDailyPdfUrl(baseUrl: string, input: TokenInput) {
  const token = createDailyPdfToken(input);
  const url = new URL("/api/reminder/daily-pdf", baseUrl);
  url.searchParams.set("uid", input.userId);
  url.searchParams.set("date", input.date);
  url.searchParams.set("exp", String(input.expiresAt));
  url.searchParams.set("token", token);
  return url.toString();
}
