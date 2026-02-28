const BASE_URL = 'http://127.0.0.1:3000';
let pass = 0;
let fail = 0;
let vulnerabilities = [];

async function testApi(endpoint, method, payload, headers, label) {
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: payload ? JSON.stringify(payload) : undefined
    });
    const text = await res.text();
    let json = {};
    try { json = JSON.parse(text); } catch(e) {}
    
    if (res.status >= 500) {
      fail++;
      vulnerabilities.push(`[${label}] Server Error (${res.status}) on payload: ${String(payload).substring(0, 50)}`);
    } else {
      pass++;
    }
  } catch(e) {
    fail++;
    vulnerabilities.push(`[${label}] Network Error: ${e.message}`);
  }
}

async function testUploadMultipart(fileName, mimeType, content, label) {
  try {
    const form = new FormData();
    form.append('file', new Blob([content], { type: mimeType }), fileName);
    const res = await fetch(`${BASE_URL}/api/source/upload`, {
      method: 'POST',
      headers: {
        'x-dev-user-id': 'demo-user'
      },
      body: form
    });
    if (res.status >= 500) {
      fail++;
      vulnerabilities.push(`[${label}] Server Error (${res.status}) on multipart upload: ${fileName}`);
    } else {
      pass++;
    }
  } catch (e) {
    fail++;
    vulnerabilities.push(`[${label}] Network Error: ${e.message}`);
  }
}

async function runTests() {
  console.log('🚀 Starting Massive Dataset Testing...');
  const SQLI = ["' OR 1=1 --", "'; DROP TABLE users; --", "\" OR \"\"=\""];
  const XSS = ["<script>alert(1)</script>", "<img src=x onerror=alert(1)>"];
  const BIG_PAYLOAD = "A".repeat(2 * 1024 * 1024); // 2MB string
  
  console.log('Testing /api/auth/send-otp...');
  const emails = ["user@domain", "admin@localhost", ...SQLI, ...XSS, "a@b.c", "very.long.email." + "a".repeat(255) + "@example.com", ""];
  for (const email of emails) {
    await testApi('/api/auth/send-otp', 'POST', { email }, {}, 'send-otp edge-case emails');
  }
  
  await testApi('/api/auth/send-otp', 'POST', { email: BIG_PAYLOAD }, {}, 'send-otp massive payload');

  console.log('Testing /api/tasks/complete...');
  const tasksPayloads = [
    {}, 
    { taskId: 123 },
    { taskId: SQLI[0] },
    { taskId: "a".repeat(1000) },
    { unknownField: "test" }
  ];
  for (const payload of tasksPayloads) {
    await testApi('/api/tasks/complete', 'POST', payload, { Authorization: 'Bearer invalid_token' }, 'tasks/complete format & bypass');
  }

  console.log('Testing /api/source/upload...');
  await testApi('/api/source/upload', 'POST', { file: "not_a_file" }, {}, 'source/upload bad format');
  await testUploadMultipart('malicious.exe', 'application/x-msdownload', 'evil', 'source/upload unsupported extension');
  await testUploadMultipart('oversized.txt', 'text/plain', 'A'.repeat(11 * 1024 * 1024), 'source/upload oversized file');
  await testUploadMultipart('empty.txt', 'text/plain', '', 'source/upload empty file');

  console.log(`\n====== REPORT ======`);
  console.log(`✅ Passed checks: ${pass}`);
  console.log(`❌ Crashes/Failures: ${fail}`);
  if (vulnerabilities.length > 0) {
    console.log("🚨 Vulnerabilities found:");
    vulnerabilities.forEach(v => console.log(v));
  }
}

runTests();
