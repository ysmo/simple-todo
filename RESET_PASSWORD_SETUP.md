# 找回密码功能 - 配置完成 ✅

## 邮件服务：Resend

已配置完成，使用 Resend 邮件服务。

### 配置信息

- **API Key**: 已配置到 Cloudflare Pages 环境变量 `RESEND_API_KEY`
- **发件域名**: `service.132024.xyz`
- **发件邮箱**: `noreply@service.132024.xyz`
- **区域**: Tokyo (ap-northeast-1)

### DNS 记录（已添加）

已在 Cloudflare DNS 中添加以下记录：

1. **DKIM**
   - Type: TXT
   - Name: `resend._domainkey.service.132024.xyz`
   - Content: `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKB...`

2. **MX**
   - Type: MX
   - Name: `send.service.132024.xyz`
   - Content: `feedback-smtp.ap-northeast-1.amazonses.com`
   - Priority: 10

3. **SPF**
   - Type: TXT
   - Name: `send.service.132024.xyz`
   - Content: `v=spf1 include:amazonses.com ~all`

4. **DMARC**
   - Type: TXT
   - Name: `_dmarc.service.132024.xyz`
   - Content: `v=DMARC1; p=none;`

### 域名验证状态

当前状态：等待 DNS 传播
- 通常需要 1-15 分钟
- 可在 Resend Dashboard 查看验证状态
- 验证通过后即可发送邮件给任何人

### 使用限制（免费版）

- 每月 3,000 封邮件
- 每天 100 封邮件
- 足够个人项目使用

### 邮件功能

1. **忘记密码**
   - 用户输入邮箱
   - 发送重置链接到邮箱
   - 链接包含令牌，1 小时有效

2. **重置密码**
   - 点击邮件中的链接
   - 输入新密码
   - 重置成功后跳转到登录页

### 测试

域名验证通过后，可以测试：
```bash
curl -X POST https://todo.132024.xyz/api/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com"}'
```

预期响应：
```json
{
  "message": "如果该邮箱已注册，您将收到重置密码的邮件"
}
```

## 下一步

等待域名验证完成（Resend Dashboard 会显示 ✅ Verified），然后：

1. 重新部署应用
2. 测试找回密码功能
3. 检查邮箱是否收到重置链接

---

## 故障排查

如果收不到邮件：
1. 检查垃圾邮件箱
2. 确认 Resend 域名验证已通过
3. 查看 Cloudflare Pages 部署日志
4. 确认用户邮箱已在系统中注册
