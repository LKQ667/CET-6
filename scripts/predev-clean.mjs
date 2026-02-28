import fs from "node:fs/promises";
import path from "node:path";

const nextDir = path.join(process.cwd(), ".next");

async function main() {
  try {
    await fs.rm(nextDir, { recursive: true, force: true });
    console.log("[predev-clean] 已清理 .next 缓存目录。");
  } catch (error) {
    console.error("[predev-clean] 清理 .next 失败：", error);
    process.exitCode = 1;
  }
}

main();
