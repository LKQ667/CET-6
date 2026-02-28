import fs from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.VERIFY_BASE_URL ?? "http://127.0.0.1:3000";
const verifyEmail = process.env.VERIFY_EMAIL ?? "demo@example.com";
const verifyToken = process.env.VERIFY_TOKEN ?? "123456";

const reportRows = [];
let authHeaders = {};
let firstVocabId = "";

function nowIso() {
  return new Date().toISOString();
}

function toErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function pushRow(step, pass, summary, detail = "") {
  reportRows.push({
    step,
    pass,
    summary,
    detail
  });
}

async function callApi(step, pathname, init, validate) {
  const started = Date.now();
  const response = await fetch(`${baseUrl}${pathname}`, init);
  const elapsed = Date.now() - started;
  let payload;
  try {
    payload = await response.json();
  } catch {
    payload = { ok: false, error: "返回内容不是 JSON" };
  }

  if (!response.ok || !payload.ok) {
    throw new Error(
      `${step} 失败，HTTP ${response.status}，错误：${payload?.error ?? "未知错误"}`
    );
  }

  if (validate) {
    await validate(payload.data);
  }

  pushRow(step, true, `通过（${elapsed}ms）`, JSON.stringify(payload.data).slice(0, 280));
  return payload.data;
}

async function main() {
  const begin = nowIso();
  pushRow("环境检测", true, `目标地址：${baseUrl}`, "确保已先执行 npm run dev");

  try {
    await callApi(
      "1. send-otp",
      "/api/auth/send-otp",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: verifyEmail })
      },
      (data) => {
        if (typeof data !== "object" || data === null) {
          throw new Error("send-otp 返回格式异常");
        }
      }
    );

    const auth = await callApi(
      "2. verify-otp",
      "/api/auth/verify-otp",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: verifyEmail, token: verifyToken })
      },
      (data) => {
        if (!data?.user?.id || !data?.accessToken) {
          throw new Error("verify-otp 未返回 user/accessToken");
        }
      }
    );

    authHeaders = {
      authorization: `Bearer ${auth.accessToken}`,
      "x-dev-user-id": auth.user.id,
      "Content-Type": "application/json"
    };

    const taskToday = await callApi(
      "3. tasks/today",
      "/api/tasks/today",
      { method: "GET", headers: authHeaders },
      (data) => {
        if (!Array.isArray(data?.tasks) || data.tasks.length === 0) {
          throw new Error("today 任务为空");
        }
      }
    );

    const taskToComplete = taskToday.tasks.find((task) => !task.completed) ?? taskToday.tasks[0];

    await callApi(
      "4. tasks/complete",
      "/api/tasks/complete",
      {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ taskId: taskToComplete.id })
      },
      (data) => {
        if (!data?.reward || typeof data.reward.exp !== "number") {
          throw new Error("complete 未返回 reward");
        }
      }
    );

    await callApi(
      "5. vocab/today",
      "/api/vocab/today",
      { method: "GET", headers: authHeaders },
      (data) => {
        if (!Array.isArray(data)) {
          throw new Error("vocab/today 不是数组");
        }
        if (data.length > 0) {
          firstVocabId = String(data[0].id);
        }
      }
    );

    if (firstVocabId) {
      await callApi(
        "6. vocab/:id/provenance",
        `/api/vocab/${firstVocabId}/provenance`,
        { method: "GET", headers: authHeaders },
        (data) => {
          if (!Array.isArray(data)) {
            throw new Error("provenance 不是数组");
          }
        }
      );
    } else {
      pushRow("6. vocab/:id/provenance", true, "跳过（今日词汇为空）");
    }

    await callApi(
      "7. resources/list",
      "/api/resources/list",
      { method: "GET" },
      (data) => {
        if (!Array.isArray(data) || data.length < 3) {
          throw new Error("资源列表数量异常");
        }
        const hasOfficial = data.some((item) => item.href === "https://cet.neea.edu.cn/");
        if (!hasOfficial) {
          throw new Error("缺少官方入口");
        }
      }
    );

    await callApi(
      "8. resources/import-builtin",
      "/api/resources/import-builtin",
      {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({})
      },
      (data) => {
        if (!Array.isArray(data?.items)) {
          throw new Error("导入结果缺少 items");
        }
      }
    );

    await callApi(
      "9. game/profile",
      "/api/game/profile",
      { method: "GET", headers: authHeaders },
      (data) => {
        if (typeof data?.level !== "number" || !data?.bossState) {
          throw new Error("game/profile 数据结构异常");
        }
      }
    );
  } catch (error) {
    pushRow("执行异常", false, toErrorMessage(error));
  }

  const passed = reportRows.filter((row) => row.pass).length;
  const failed = reportRows.filter((row) => !row.pass).length;

  const lines = [
    "# 二期功能自动化验收报告",
    "",
    `- 开始时间：${begin}`,
    `- 结束时间：${nowIso()}`,
    `- 目标地址：${baseUrl}`,
    `- 通过项：${passed}`,
    `- 失败项：${failed}`,
    "",
    "## 明细",
    "",
    "| 步骤 | 结果 | 摘要 | 细节 |",
    "|---|---|---|---|",
    ...reportRows.map((row) => {
      const result = row.pass ? "通过" : "失败";
      const safeSummary = row.summary.replaceAll("|", "\\|");
      const safeDetail = (row.detail || "-").replaceAll("|", "\\|");
      return `| ${row.step} | ${result} | ${safeSummary} | ${safeDetail} |`;
    }),
    "",
    failed > 0
      ? "## 失败重现建议\n\n1. 确认本地服务已启动：`npm run dev`\n2. 重新执行：`node scripts/verify-all.mjs`\n3. 查看终端报错与本报告失败项细节"
      : "## 结论\n\n自动化验收通过，可继续执行手工清单测试。"
  ];

  const reportPath = path.join(process.cwd(), "verification-report.md");
  await fs.writeFile(reportPath, `${lines.join("\n")}\n`, "utf8");

  console.log(`验收完成：通过 ${passed}，失败 ${failed}`);
  console.log(`报告已生成：${reportPath}`);
  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("验收脚本异常：", error);
  process.exitCode = 1;
});
