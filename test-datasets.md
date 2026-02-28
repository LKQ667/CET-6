# CET-6 测试数据集

本文件包含用于测试CET-6项目的各类边界测试数据、性能测试场景和数据一致性测试用例。

---

## 一、边界测试数据

### 1.1 认证相关测试数据

#### 边界邮箱地址
```json
{
  "valid_boundary_emails": [
    "a@b.c",
    "user@example.com",
    "very.long.email.address@example.domain.com",
    "user+tag@example.com",
    "user.name@sub.domain.com",
    "123@456.com"
  ],
  "invalid_emails": [
    "not-an-email",
    "@nodomain.com",
    "spaces in@email.com",
    "missing@dotcom",
    "double..dots@example.com",
    "<script>alert('xss')</script>@test.com",
    "",  
    null,
    "a".repeat(300) + "@test.com"  
  ]
}
```

#### OTP测试数据
```json
{
  "valid_otp": [
    "123456",
    "000000",
    "999999"
  ],
  "invalid_otp": [
    "12345",      
    "1234567",    
    "abcdef",     
    "123 456",    
    "",           
    "12345O",     
    null
  ],
  "boundary_otp": [
    "000000",     
    "999999",     
    "12345678901234567890"  
  ]
}
```

### 1.2 日期边界测试数据

```json
{
  "date_boundary_cases": {
    "cross_year": [
      "2025-12-31",  
      "2026-01-01"   
    ],
    "leap_year": [
      "2024-02-29",  
      "2023-02-28"   
    ],
    "invalid_dates": [
      "2026-13-01",  
      "2026-02-30",  
      "2026-04-31",  
      "not-a-date",  
      "",            
      null
    ],
    "weekend_boss": [
      "2026-02-28",  
      "2026-03-01",  
      "2026-03-07"   
    ],
    "timezone_edge": [
      "2026-01-01T00:00:00+08:00",
      "2026-12-31T23:59:59+08:00",
      "2026-06-15T12:00:00Z"      
    ]
  }
}
```

### 1.3 文件上传测试数据

#### 文件大小边界
```json
{
  "file_size_tests": {
    "empty_file": {
      "name": "empty.txt",
      "size": 0,
      "content": ""
    },
    "tiny_file": {
      "name": "tiny.txt",
      "size": 1,
      "content": "A"
    },
    "normal_file": {
      "name": "normal.pdf",
      "size": 1048576,  
      "description": "1MB PDF文件"
    },
    "large_file": {
      "name": "large.pdf",
      "size": 10485760,  
      "description": "10MB PDF文件(边界)"
    },
    "oversized_file": {
      "name": "oversized.pdf",
      "size": 104857600,  
      "description": "100MB PDF文件(应被拒绝)"
    }
  }
}
```

#### 文件名边界测试
```json
{
  "filename_boundary_tests": [
    {
      "name": "normal.txt",
      "expected": "正常处理"
    },
    {
      "name": "file with spaces.txt",
      "expected": "测试空格处理"
    },
    {
      "name": "file<special>chars.txt",
      "expected": "测试特殊字符"
    },
    {
      "name": "file|pipe.txt",
      "expected": "测试管道符"
    },
    {
      "name": "文件中文名.txt",
      "expected": "测试中文字符"
    },
    {
      "name": "file.exe.pdf",  
      "expected": "测试恶意扩展名伪装"
    },
    {
      "name": ".htaccess",  
      "expected": "测试隐藏文件"
    },
    {
      "name": "a".repeat(255) + ".txt",  
      "expected": "测试超长文件名"
    },
    {
      "name": "NO_EXTENSION",
      "expected": "测试无扩展名"
    },
    {
      "name": ".hidden.txt",
      "expected": "测试点前缀"
    }
  ]
}
```

#### MIME类型测试
```json
{
  "mime_type_tests": [
    {
      "filename": "test.txt",
      "mimetype": "text/plain",
      "expected": "允许"
    },
    {
      "filename": "test.pdf",
      "mimetype": "application/pdf",
      "expected": "允许"
    },
    {
      "filename": "malicious.txt",
      "mimetype": "application/javascript",  
      "expected": "拒绝"
    },
    {
      "filename": "fake.pdf",
      "mimetype": "application/zip",  
      "expected": "拒绝"
    },
    {
      "filename": "nullfile.txt",
      "mimetype": null,
      "expected": "拒绝"
    }
  ]
}
```

### 1.4 用户ID和UUID边界测试

```json
{
  "uuid_boundary_tests": [
    "550e8400-e29b-41d4-a716-446655440000",  
    "00000000-0000-0000-0000-000000000000",  
    "ffffffff-ffff-ffff-ffff-ffffffffffff",  
    "invalid-uuid",                           
    "",                                        
    null,
    "550e8400-e29b-41d4-a716-44665544000",   
    "550e8400-e29b-41d4-a716-4466554400000"  
  ]
}
```

### 1.5 分数边界测试

```json
{
  "score_boundary_tests": {
    "baseline_scores": [
      {"total": 0, "listening": 0, "reading": 0, "writingTranslation": 0},  
      {"total": 710, "listening": 248, "reading": 248, "writingTranslation": 214},  
      {"total": 339, "listening": 103, "reading": 149, "writingTranslation": 87},  
      {"total": 425, "listening": 120, "reading": 180, "writingTranslation": 125},  
      {"total": -1, "listening": 100, "reading": 100, "writingTranslation": 100},  
      {"total": 1000, "listening": 300, "reading": 400, "writingTranslation": 300}  
    ],
    "target_scores": [
      425,   
      500,   
      600,   
      0,     
      1000,  
      -1     
    ]
  }
}
```

### 1.6 任务相关边界测试

```json
{
  "task_boundary_tests": {
    "task_types": ["vocab", "listening", "writing_translation", "reading", "invalid_type"],
    "phase_codes": ["A", "B", "C", "D", "E", ""],
    "estimated_minutes": [
      0,    
      1,    
      10,   
      60,   
      120,  
      -1,   
      999   
    ],
    "task_titles": [
      "正常任务标题",
      "",  
      "a".repeat(500),  
      "<script>alert('xss')</script>"  
    ]
  }
}
```

---

## 二、性能测试场景

### 2.1 并发用户测试

```javascript
const performanceTestScenarios = {
  "concurrent_load": {
    "description": "模拟大量并发用户同时操作",
    "users": [
      {"count": 10, "description": "低并发测试"},
      {"count": 50, "description": "中等并发测试"},
      {"count": 100, "description": "高并发测试"},
      {"count": 500, "description": "压力测试"},
      {"count": 1000, "description": "极限压力测试"}
    ],
    "operations": [
      "同时刷新今日任务",
      "同时完成任务打卡",
      "同时查询词汇出处",
      "同时获取游戏状态",
      "混合操作(读80% + 写20%)"
    ]
  }
};
```

### 2.2 数据库压力测试

```javascript
const databaseStressTests = {
  "bulk_operations": {
    "tasks_insert": {
      "description": "批量插入任务记录",
      "counts": [100, 500, 1000, 5000]
    },
    "vocab_query": {
      "description": "高频词汇查询",
      "queries_per_second": [10, 50, 100, 200]
    },
    "reminder_cron": {
      "description": "定时提醒任务",
      "user_counts": [100, 500, 1000, 5000, 10000]
    }
  }
};
```

### 2.3 文件处理性能测试

```javascript
const filePerformanceTests = {
  "upload_speed": {
    "file_sizes": [
      {"size": "1KB", "expected_time": "<100ms"},
      {"size": "100KB", "expected_time": "<500ms"},
      {"size": "1MB", "expected_time": "<2s"},
      {"size": "5MB", "expected_time": "<5s"},
      {"size": "10MB", "expected_time": "<10s"}
    ]
  },
  "pdf_parse_performance": {
    "page_counts": [
      {"pages": 1, "expected_time": "<1s"},
      {"pages": 10, "expected_time": "<3s"},
      {"pages": 50, "expected_time": "<10s"},
      {"pages": 100, "expected_time": "<20s"}
    ]
  }
};
```

---

## 三、数据一致性测试

### 3.1 任务完成流程一致性

```javascript
const taskConsistencyTests = [
  {
    "name": "连续完成4个任务经验累加",
    "steps": [
      "获取今日任务",
      "完成任务1，验证经验+25",
      "完成任务2，验证经验+25(累计50)",
      "完成任务3，验证经验+25(累计75)",
      "完成任务4，验证经验+25(累计100)",
      "验证等级可能提升"
    ]
  },
  {
    "name": "任务重复完成幂等性",
    "steps": [
      "完成任务A",
      "再次请求完成任务A",
      "验证经验不再增加",
      "验证返回已完成的提示"
    ]
  },
  {
    "name": "跨天任务ID稳定性",
    "steps": [
      "日期D获取任务，记录任务ID",
      "日期D+1再次获取任务",
      "验证相同用户相同任务类型ID不同(跨天)",
      "日期D再次获取任务",
      "验证任务ID与之前相同(幂等)"
    ]
  }
];
```

### 3.2 游戏状态一致性

```javascript
const gameStateConsistencyTests = [
  {
    "name": "Boss日奖励发放一致性",
    "steps": [
      "确认今天是周六",
      "完成所有4个任务",
      "验证经验额外+80",
      "验证Boss状态变为defeated",
      "重新获取游戏状态，验证数据一致",
      "尝试再次击败Boss，验证幂等"
    ]
  },
  {
    "name": "连胜计算一致性",
    "steps": [
      "第1天完成所有任务，连胜=1",
      "第2天完成所有任务，连胜=2",
      "第3天未完成，连胜重置",
      "第4天完成所有任务，连胜=1",
      "验证连胜逻辑符合预期"
    ]
  },
  {
    "name": "等级提升边界",
    "steps": [
      "设置用户经验为95，等级1",
      "完成任务获得+25经验",
      "验证经验=120，等级=2(触发升级)",
      "连续升级验证(如经验300，等级3)"
    ]
  }
];
```

### 3.3 词汇系统一致性

```javascript
const vocabConsistencyTests = [
  {
    "name": "词汇去重逻辑",
    "steps": [
      "上传PDF并抽取词汇",
      "获取今日词汇列表",
      "验证已掌握词汇不出现在今日列表",
      "标记某些词汇为已掌握",
      "再次获取今日词汇，验证已掌握词汇被排除"
    ]
  },
  {
    "name": "词汇出处追溯一致性",
    "steps": [
      "获取今日词汇",
      "查询词汇A的出处",
      "验证返回的出处数据完整",
      "多次查询同一词汇，验证结果一致"
    ]
  },
  {
    "name": "内置资源导入幂等性",
    "steps": [
      "首次导入内置资源，应成功导入",
      "再次导入相同资源，应被跳过",
      "验证去重逻辑基于file_hash"
    ]
  }
];
```

### 3.4 提醒系统一致性

```javascript
const reminderConsistencyTests = [
  {
    "name": "提醒幂等性",
    "steps": [
      "设置提醒时间为12:00",
      "Cron在12:00触发",
      "验证邮件/推送已发送",
      "再次触发12:00 Cron",
      "验证同一时段不再发送"
    ]
  },
  {
    "name": "提醒偏好持久化",
    "steps": [
      "设置emailEnabled=false",
      "重新登录",
      "验证提醒偏好保持一致"
    ]
  }
];
```

---

## 四、安全测试数据

### 4.1 XSS攻击向量

```json
{
  "xss_attack_vectors": [
    "<script>alert('xss')</script>",
    "<img src=x onerror=alert('xss')>",
    "<body onload=alert('xss')>",
    "javascript:alert('xss')",
    "<iframe src='javascript:alert(1)'>",
    "<svg onload=alert('xss')>",
    "<input onfocus=alert('xss') autofocus>",
    "' onclick=alert(1)//",
    "<style>@import'javascript:alert(1)';</style>"
  ]
}
```

### 4.2 SQL注入测试

```json
{
  "sql_injection_vectors": [
    "' OR '1'='1",
    "' OR '1'='1' --",
    "' UNION SELECT * FROM users--",
    "1; DROP TABLE users--",
    "' AND 1=1 --",
    "' AND 1=2 --",
    "1' AND 1=(SELECT COUNT(*) FROM users)--",
    "1 AND 1=1",
    "admin'--",
    "admin' #"
  ]
}
```

### 4.3 认证绕过测试

```json
{
  "auth_bypass_tests": [
    {
      "test": "空token",
      "header": "Bearer "
    },
    {
      "test": "无效token",
      "header": "Bearer invalid_token_here"
    },
    {
      "test": "过期token",
      "header": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    },
    {
      "test": "畸形header",
      "header": "invalid_bearer_token"
    },
    {
      "test": "超长token",
      "header": "Bearer a".repeat(10000)
    },
    {
      "test": "模拟用户ID头",
      "header": "x-dev-user-id: admin"
    }
  ]
}
```

### 4.4 文件上传安全测试

```json
{
  "malicious_file_tests": [
    {
      "filename": "shell.php",
      "content": "<?php system($_GET['cmd']); ?>",
      "mimetype": "text/plain"
    },
    {
      "filename": "malicious.svg",
      "content": "<svg onload=alert('xss')>",
      "mimetype": "image/svg+xml"
    },
    {
      "filename": "test.pdf",
      "content": "%PDF-1.4\n<</Type/Catalog/Pages 2 0 R>>\nendobj",
      "mimetype": "application/pdf"
    },
    {
      "filename": "zip_bomb.zip",
      "content": "zip bomb content",
      "description": "压缩炸弹测试",
      "mimetype": "application/zip"
    },
    {
      "filename": "null_bytes.txt\x00.pdf",
      "content": "test",
      "description": "空字节注入"
    }
  ]
}
```

---

## 五、错误场景测试

### 5.1 网络错误场景

```javascript
const networkErrorScenarios = [
  {
    "name": "Supabase连接超时",
    "mock": "supabase_timeout",
    "expected": "降级到mock模式"
  },
  {
    "name": "邮件服务不可用",
    "mock": "resend_unavailable",
    "expected": "优雅跳过邮件发送"
  },
  {
    "name": "推送服务失败",
    "mock": "push_service_fail",
    "expected": "记录失败但不中断流程"
  },
  {
    "name": "数据库连接池耗尽",
    "mock": "db_pool_exhausted",
    "expected": "返回503错误"
  }
];
```

### 5.2 业务逻辑错误

```javascript
const businessLogicErrors = [
  {
    "name": "完成不存在的任务",
    "taskId": "non-existent-uuid",
    "expected": "返回404错误"
  },
  {
    "name": "无权访问的任务",
    "description": "用户A尝试操作用户B的任务",
    "expected": "返回403错误"
  },
  {
    "name": "重复导入资源",
    "steps": [
      "导入资源R1",
      "再次导入资源R1",
      "验证幂等性处理"
    ]
  },
  {
    "name": "上传损坏的PDF",
    "file": "corrupted.pdf",
    "expected": "解析失败但友好提示"
  }
];
```

---

## 六、测试执行清单

### 6.1 单元测试覆盖率目标

```yaml
测试目标:
  API路由: >80%
  业务逻辑: >85%
  工具函数: >90%
  数据库查询: >75%

关键路径必测:
  - 用户注册登录流程
  - 任务生成和完成
  - 游戏状态更新
  - 词汇抽取和查询
  - 提醒发送逻辑
```

### 6.2 集成测试场景

```yaml
集成测试:
  前端-后端:
    - 登录态保持
    - 任务完成后的UI更新
    - 游戏化奖励显示
    
  后端-数据库:
    - 事务一致性
    - 并发写入
    - 索引性能
    
  后端-外部服务:
    - Supabase Auth
    - Resend邮件
    - Web Push
```

### 6.3 端到端测试流程

```yaml
E2E测试场景:
  场景1_完整学习流程:
    1. 用户注册/登录
    2. 查看今日任务
    3. 完成4个任务
    4. 查看游戏奖励
    5. 学习今日词汇
    6. 查看词汇出处
    7. 设置提醒偏好
    8. 上传PDF资料
    9. 导入内置资源
    10. 退出登录

  场景2_Boss日特殊流程:
    1. 确认周六Boss日
    2. 完成所有任务
    3. 验证Boss奖励
    4. 验证连胜统计

  场景3_跨天连续性:
    1. 第1天完成任务
    2. 模拟到第2天
    3. 验证连胜+1
    4. 验证新任务生成
```

---

## 七、测试数据生成脚本

### 7.1 生成模拟用户数据

```javascript
function generateMockUsers(count) {
  const users = [];
  for (let i = 0; i < count; i++) {
    users.push({
      id: `user-${i}`,
      email: `user${i}@test.com`,
      targetScore: 425 + Math.floor(Math.random() * 200),
      baseline: {
        total: 300 + Math.floor(Math.random() * 200),
        listening: 80 + Math.floor(Math.random() * 100),
        reading: 100 + Math.floor(Math.random() * 100),
        writingTranslation: 70 + Math.floor(Math.random() * 80)
      }
    });
  }
  return users;
}
```

### 7.2 生成模拟任务数据

```javascript
function generateMockTasks(userId, date, count = 4) {
  const types = ['vocab', 'listening', 'writing_translation', 'reading'];
  return types.slice(0, count).map((type, index) => ({
    id: `task-${userId}-${date}-${type}`,
    userId,
    taskDate: date,
    taskType: type,
    title: `任务 ${index + 1}: ${type}`,
    description: `这是${type}类型的测试任务`,
    estimatedMinutes: 10 + Math.floor(Math.random() * 10),
    completed: Math.random() > 0.5,
    phaseCode: ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)]
  }));
}
```

### 7.3 生成模拟词汇数据

```javascript
function generateMockVocab(count) {
  const words = [
    'motivation', 'method', 'illustrate', 'mutual', 'understanding',
    'respect', 'interpersonal', 'relationship', 'responsibility', 'social',
    'harmony', 'significance', 'demonstrate', 'instruction', 'explore'
  ];
  
  return words.slice(0, count).map((word, index) => ({
    id: `vocab-${index}`,
    lemma: word,
    meaningZh: `${word}的中文释义`,
    phonetic: `/${word}/`,
    pos: ['n.', 'v.', 'adj.', 'adv.'][Math.floor(Math.random() * 4)],
    frequencyInPapers: Math.floor(Math.random() * 10) + 1,
    isVerified: true,
    verificationStatus: 'public_source',
    provenance: [{
      examYear: 2019 + Math.floor(Math.random() * 5),
      examMonth: [6, 12][Math.floor(Math.random() * 2)],
      paperCode: `set-${Math.floor(Math.random() * 3) + 1}-writing`,
      questionType: 'writing',
      sourceUrl: 'https://example.com/source',
      sourceSnippet: `Example sentence with ${word}`
    }]
  }));
}
```

---

## 八、总结

本测试数据集涵盖了：

1. **边界测试数据**: 各类边界条件、异常输入
2. **性能测试场景**: 并发、压力、大数据量
3. **一致性测试**: 数据完整性、幂等性
4. **安全测试**: XSS、SQL注入、认证绕过
5. **错误场景**: 网络故障、业务异常
6. **测试执行清单**: 覆盖率目标、测试流程
7. **数据生成脚本**: 自动化测试数据准备

使用本数据集可以全面验证CET-6项目的健壮性、安全性和性能表现。
