# 二期功能自动化验收报告

- 开始时间：2026-02-28T12:12:31.488Z
- 结束时间：2026-02-28T12:12:32.144Z
- 目标地址：http://127.0.0.1:3000
- 通过项：10
- 失败项：0

## 明细

| 步骤 | 结果 | 摘要 | 细节 |
|---|---|---|---|
| 环境检测 | 通过 | 目标地址：http://127.0.0.1:3000 | 确保已先执行 npm run dev |
| 1. send-otp | 通过 | 通过（31ms） | {"mockMode":true,"message":"当前为本地演示模式，跳过真实 OTP 发送。验证码固定为 123456。"} |
| 2. verify-otp | 通过 | 通过（6ms） | {"accessToken":"dev-access-token","refreshToken":"dev-refresh-token","user":{"id":"demo-user","email":"demo@example.com"}} |
| 3. tasks/today | 通过 | 通过（7ms） | {"date":"2026-02-28","phaseCode":"A","totalEstimatedMinutes":47,"streakDays":0,"tasks":[{"id":"8485b979-4eb3-4286-8a34-a3f439671aab","userId":"demo-user","taskDate":"2026-02-28","taskType":"vocab","title":"真题词汇 8-12 个","description":"来自往年真题来源，今日目标 12 词；完成后标记“已掌握/需回流”。","estimated |
| 4. tasks/complete | 通过 | 通过（6ms） | {"task":{"id":"8485b979-4eb3-4286-8a34-a3f439671aab","userId":"demo-user","taskDate":"2026-02-28","taskType":"vocab","title":"真题词汇 8-12 个","description":"来自往年真题来源，今日目标 12 词；完成后标记“已掌握/需回流”。","estimatedMinutes":12,"completed":true,"phaseCode":"A","completedAt":"2026-02-28T12:12:31. |
| 5. vocab/today | 通过 | 通过（4ms） | [{"id":"2454fe3f-393d-4a00-9cb3-67866bc20ffb","lemma":"motivation","meaningZh":"动机；学习动力","pos":"n.","phonetic":"/ˌməʊtɪˈveɪʃn/","frequencyInPapers":1,"isVerified":true,"verificationStatus":"public_source","createdAt":"2026-02-28T12:12:31.531Z","provenance":[{"id":"3a5b8aa8-7fe0-4 |
| 6. vocab/:id/provenance | 通过 | 通过（5ms） | [{"id":"3a5b8aa8-7fe0-4d86-84df-3b8c0adafaf8","vocabEntryId":"2454fe3f-393d-4a00-9cb3-67866bc20ffb","examYear":2019,"examMonth":6,"paperCode":"set-1-writing","questionType":"writing","sourceUrl":"https://cet6.koolearn.com/20190615/828149.html","sourceSnippet":"the importance of m |
| 7. resources/list | 通过 | 通过（3ms） | [{"id":"official-cet-neea","title":"中国教育考试网（CET）","description":"官方考试资讯与报名信息入口。","type":"official_link","href":"https://cet.neea.edu.cn/","sourceLabel":"官方站点"},{"id":"ext-wehuster-cet6","title":"大学英语六级考试真题 \| WeHUSTER","description":"真题在线练习与做题入口，适合阶段化刷题。","type":"external_link","h |
| 8. resources/import-builtin | 通过 | 通过（584ms） | {"items":[{"resourceId":"builtin-cet4-6","fileName":"cet4-6.pdf","uploadId":"a659cc63-f70a-44d2-9045-bfc749b0bdee","candidateCount":27,"status":"imported"},{"resourceId":"builtin-cet6-shuffle-vocab","fileName":"大学英语六级词汇乱序版.pdf","uploadId":"fd546e7d-5db5-4b01-adc5-aa75b95c40c8","c |
| 9. game/profile | 通过 | 通过（4ms） | {"userId":"demo-user","level":1,"exp":25,"coins":10,"streakDays":0,"todayExp":25,"todayCoins":10,"lastActiveDate":null,"bossState":{"isBossDay":true,"bossName":"周测统领·错题魔王","hp":75,"maxHp":100,"defeated":false,"checklist":["复盘本周错词与出处","回听错位听力片段并定位关键词","重写 1 段写译模板，标记易错语法"],"rewardE |

## 结论

自动化验收通过，可继续执行手工清单测试。
