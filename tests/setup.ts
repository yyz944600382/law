// 测试环境加载:若存在 .env 则加载,否则沿用 shell 环境变量。
try {
  process.loadEnvFile(".env");
} catch {
  // 无 .env 文件,忽略(使用已 export 的环境变量)
}
