# 找回密码功能配置指南

## 需要配置的环境变量

### Resend API Key

1. 注册 Resend 账号：https://resend.com/signup
2. 获取 API Key：https://resend.com/api-keys
3. 在 Cloudflare Pages 项目中配置环境变量

## 配置步骤

### 方法 1：Cloudflare Dashboard

1. 访问：https://dash.cloudflare.com → Workers & Pages
2. 选择 `simple-todo` 项目
3. Settings → Environment variables
4. 添加变量：
   - Variable name: `RESEND_API_KEY`
   - Value: 你的 Resend API Key
   - Environment: Production
5. 可选：添加自定义发件邮箱
   - Variable name: `FROM_EMAIL`
   - Value: `noreply@132024.xyz` (需要在 Resend 验证域名)
   - Environment: Production
6. 保存后重新部署

### 方法 2：命令行（wrangler）

```bash
cd todo-app
wrangler pages deployment create --project-name=simple-todo --branch=main dist/
```

在部署前，可以通过 Cloudflare API 添加环境变量（需要 API Token）。

## Resend 免费额度

- 每月 3,000 封邮件
- 每天 100 封邮件
- 足够个人使用

## 邮件域名配置（可选）

如果想使用自己的域名发邮件（如 `noreply@132024.xyz`）：

1. 在 Resend Dashboard 添加域名
2. 配置 DNS 记录（SPF、DKIM、DMARC）
3. 验证域名
4. 在环境变量中设置 `FROM_EMAIL`

如果不配置，默认使用 Resend 提供的测试域名 `noreply@resend.dev`
