export const zhCN = {
  ui: {
    appName: "CET-6 私人备战片场",
    headerKicker: "六级副本作战台",
    periodLabel: "备考周期",
    targetLabel: "目标分",
    loginTitle: "邮箱验证码登录",
    loginDesc: "登录后自动同步手机与电脑进度，并启用双提醒。",
    emailPlaceholder: "输入邮箱",
    otpPlaceholder: "输入验证码",
    sendOtp: "发送验证码",
    loginSync: "登录并同步",
    todayTaskTitle: "今日副本（35-45 分钟）",
    todayVocabTitle: "真题词汇情报库",
    reminderTitle: "提醒中心（北京时间）",
    resourceTitle: "官方与资料中心",
    gameTitle: "RPG 战斗面板",
    uploadTitle: "每月真题补充",
    bossTitle: "周六 Boss 复盘战",
    battleTitle: "战斗播报",
    dailyPdfTitle: "每日备考 PDF",
    downloadTodayPdf: "下载今日学习 PDF",
    uploadButton: "上传并抽词",
    importBuiltinButton: "一键导入内置资料",
    saveReminder: "保存提醒设置",
    enablePush: "开启浏览器推送",
    saveSuccess: "提醒设置已保存。",
    loadReady: "今日副本已载入，按节奏推进即可。",
    taskDone: "任务已完成，战斗收益已入账。",
    pushReady: "浏览器推送已开启，12:00 与 21:40 会提醒你。",
    loginSuccess: "登录成功，正在同步训练进度。",
    officialSite: "中国教育考试网（CET）",
    officialEntry: "进入官网",
    externalEntry: "打开资料站",
    downloadPdf: "下载 PDF",
    notLoggedIn: "未登录",
    statusReady: "就绪",
    statusBusy: "处理中...",
    loading: "加载中...",
    importDone: "内置资料导入完成，候选词已进入待审核池。",
    pdfReady: "今日 PDF 已生成并开始下载。",
    pdfFailed: "生成每日 PDF 失败，请稍后重试。",
    selectFileFirst: "请先选择文件。",
    uploadDone: "资料上传与抽词完成，已加入待审核池。",
    uploadResult: "文件 {fileName} 已处理，候选词 {count} 个（待审核）。",
    noProvenance: "点击单词查看年份、套卷、来源片段。",
    noRewardYet: "完成任意任务后，这里会显示经验、金币和连胜变化。",
    loginHint: "演示模式验证码固定为 123456。"
  },
  game: {
    monsters: {
      vocab: "情报怪",
      listening: "声波怪",
      writing_translation: "构造怪",
      reading: "侦察怪"
    },
    bossName: "周测统领·错题魔王",
    bossChecklist: [
      "复盘本周错词与出处",
      "回听错位听力片段并定位关键词",
      "重写 1 段写译模板，标记易错语法"
    ],
    rewardNote: "副本结算：经验 + 金币已到账。",
    alreadyDone: "该关卡已完成。",
    bossVictoryNote: "Boss 战胜利！额外经验 +80。",
    levelLabel: "等级",
    expLabel: "经验",
    coinLabel: "金币",
    streakLabel: "连胜天数"
  },
  api: {
    common: {
      unauthorized: "未登录",
      validationFailed: "参数校验失败",
      internalError: "服务异常，请稍后重试。"
    },
    auth: {
      sendOtpFailed: "发送验证码失败",
      verifyOtpFailed: "验证码校验失败",
      mockOtpMsg: "当前为本地演示模式，跳过真实 OTP 发送。验证码固定为 123456。"
    },
    task: {
      getTodayFailed: "读取今日任务失败",
      completeFailed: "任务完成失败",
      notFound: "任务不存在或不属于当前用户"
    },
    vocab: {
      getTodayFailed: "读取词汇失败",
      getProvenanceFailed: "读取出处失败"
    },
    reminder: {
      getPreferenceFailed: "读取提醒设置失败",
      updatePreferenceFailed: "更新提醒设置失败",
      savePushFailed: "保存推送订阅失败",
      cronFailed: "Cron 发送失败",
      dailyPdfFailed: "生成每日 PDF 失败"
    },
    source: {
      uploadFailed: "上传真题资料失败",
      extractFailed: "抽词失败",
      invalidFile: "请上传文件（TXT/PDF）",
      invalidUploadContentType: "上传请求格式错误，请使用表单文件上传。",
      unsupportedFileType: "仅支持 TXT 或 PDF 文件。",
      fileTooLarge: "文件过大，请上传 10MB 以内文件。",
      emptyFile: "文件为空，请重新上传。",
      parseFileFailed: "文件内容解析失败，请检查文件格式。",
      uploadNotFound: "上传记录不存在或无权限"
    },
    resources: {
      listFailed: "读取资料中心失败",
      importFailed: "导入内置资料失败"
    },
    game: {
      profileFailed: "读取战斗面板失败"
    }
  }
} as const;
