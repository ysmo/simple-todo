# 找回密码功能配置指南

## 邮件服务：Cloudflare MailChannels

✅ **完全免费**，无需 API Key！

Cloudflare Workers 可以通过 MailChannels 免费发送邮件，每天最多 100,000 封。

## 配置步骤

### 1. 配置 SPF 记录（可选但推荐）

为了提高邮件送达率，建议配置 SPF 记录：

#### 在 Cloudflare DNS 中添加 TXT 记录：

**如果已有 SPF 记录：**
编辑现有的 SPF TXT 记录，在 `~all` 之前添加：
```
include:relay.mailchannels.net
```

示例：
```
v=spf1 include:relay.mailchannels.net ~all
```

**如果没有 SPF 记录：**
添加新的 TXT 记录：
- Type: `TXT`
- Name: `@` (代表根域名 132024.xyz)
- Content: `v=spf1 include:relay.mailchannels.net ~all`
- TTL: Auto

### 2. 配置 DKIM（可选，提高信誉）

MailChannels 会自动处理 DKIM 签名，无需额外配置。

### 3. 配置环境变量（可选）

可以在 Cloudflare Pages 项目中配置自定义发件信息：

访问：https://dash.cloudflare.com → Workers & Pages → simple-todo → Settings → Environment variables

添加变量：
- `FROM_EMAIL`: `noreply@132024.xyz` (发件邮箱)
- `FROM_NAME`: `Simple Todo` (发件人名称)

如果不配置，默认使用：
- Email: `noreply@132024.xyz`
- Name: `Simple Todo`

### 4. 重新部署

配置完成后，重新部署应用：

```bash
cd /Users/ys/clawd/todo-app
npm run build
wrangler pages deploy dist/ --project-name=simple-todo
```

## 邮件发送限制

- **每天限制**: 100,000 封（免费）
- **适用范围**: 个人项目完全够用
- **无需注册**: 不需要 MailChannels 账号

## 邮件模板

系统会发送以下格式的邮件：

**主题**: 重置密码 - Simple Todo

**内容**:
- 包含重置链接
- 链接 1 小时有效
- 安全提示

## 测试

部署后可以测试：
1. 访问 https://todo.132024.xyz
2. 点击"忘记密码"
3. 输入已注册的邮箱
4. 检查邮箱收件箱（可能在垃圾邮件中）

## 提高送达率建议

✅ 已配置 SPF 记录
✅ 使用自己的域名发件（132024.xyz）
✅ MailChannels 自动 DKIM 签名
🔸 考虑添加 DMARC 记录（进一步提高信誉）

## DMARC 配置（可选）

添加 TXT 记录：
- Type: `TXT`
- Name: `_dmarc`
- Content: `v=DMARC1; p=none; rua=mailto:dmarc@132024.xyz`
- TTL: Auto

---

## ✨ 优势

相比 Resend：
- ✅ 完全免费
- ✅ 无需 API Key
- ✅ 每天 100,000 封额度
- ✅ Cloudflare 原生支持
- ✅ 零配置即可使用
