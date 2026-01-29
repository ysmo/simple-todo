// API 工具函数
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function generateToken(payload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(payload));
  const signature = await hashPassword(encodedHeader + '.' + encodedPayload);
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

async function verifyToken(token) {
  try {
    const [header, payload, signature] = token.split('.');
    const expectedSignature = await hashPassword(header + '.' + payload);
    if (signature !== expectedSignature) return null;
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

// 生成随机令牌
function generateResetToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// 发送邮件（Cloudflare MailChannels）
async function sendEmail(to, subject, html, env) {
  const fromEmail = env.FROM_EMAIL || 'noreply@132024.xyz';
  const fromName = env.FROM_NAME || 'Simple Todo';

  const response = await fetch('https://api.mailchannels.net/tx/v1/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      personalizations: [
        {
          to: [{ email: to }]
        }
      ],
      from: {
        email: fromEmail,
        name: fromName
      },
      subject,
      content: [
        {
          type: 'text/html',
          value: html
        }
      ]
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Email send failed: ${error}`);
  }

  return { success: true };
}

// CORS 处理
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

// Pages Functions 使用不同的导出方式
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  
  // 从 /api/xxx 中提取路径，去掉 /api 前缀
  const path = url.pathname.replace(/^\/api/, '');
  const method = request.method;

  // 处理 OPTIONS 请求（CORS 预检）
  if (method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders() });
  }

  try {
    // 注册
    if (path === '/register' && method === 'POST') {
      const { email, password } = await request.json();
      
      if (!email || !password) {
        return new Response(JSON.stringify({ error: '邮箱和密码不能为空' }), {
          status: 400,
          headers: { ...corsHeaders(), 'Content-Type': 'application/json' }
        });
      }

      // 检查用户是否已存在
      const existingUser = await env.DB.prepare(
        'SELECT id FROM users WHERE email = ?'
      ).bind(email).first();

      if (existingUser) {
        return new Response(JSON.stringify({ error: '邮箱已被注册' }), {
          status: 400,
          headers: { ...corsHeaders(), 'Content-Type': 'application/json' }
        });
      }

      // 创建用户
      const passwordHash = await hashPassword(password);
      const result = await env.DB.prepare(
        'INSERT INTO users (email, password_hash) VALUES (?, ?)'
      ).bind(email, passwordHash).run();

      const userId = result.meta.last_row_id;
      const token = await generateToken({ userId, email });

      return new Response(JSON.stringify({ token, user: { id: userId, email } }), {
        status: 201,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' }
      });
    }

    // 登录
    if (path === '/login' && method === 'POST') {
      const { email, password } = await request.json();

      const passwordHash = await hashPassword(password);
      const user = await env.DB.prepare(
        'SELECT id, email FROM users WHERE email = ? AND password_hash = ?'
      ).bind(email, passwordHash).first();

      if (!user) {
        return new Response(JSON.stringify({ error: '邮箱或密码错误' }), {
          status: 401,
          headers: { ...corsHeaders(), 'Content-Type': 'application/json' }
        });
      }

      const token = await generateToken({ userId: user.id, email: user.email });

      return new Response(JSON.stringify({ token, user }), {
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' }
      });
    }

    // 忘记密码 - 发送重置链接
    if (path === '/forgot-password' && method === 'POST') {
      const { email } = await request.json();

      if (!email) {
        return new Response(JSON.stringify({ error: '请输入邮箱' }), {
          status: 400,
          headers: { ...corsHeaders(), 'Content-Type': 'application/json' }
        });
      }

      // 查找用户
      const user = await env.DB.prepare(
        'SELECT id, email FROM users WHERE email = ?'
      ).bind(email).first();

      // 即使用户不存在也返回成功（安全考虑，不泄露用户是否存在）
      if (!user) {
        return new Response(JSON.stringify({ 
          message: '如果该邮箱已注册，您将收到重置密码的邮件' 
        }), {
          headers: { ...corsHeaders(), 'Content-Type': 'application/json' }
        });
      }

      // 生成重置令牌
      const resetToken = generateResetToken();
      const expiresAt = Math.floor(Date.now() / 1000) + 3600; // 1小时后过期

      // 保存令牌到数据库
      await env.DB.prepare(
        'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)'
      ).bind(user.id, resetToken, expiresAt).run();

      // 生成重置链接
      const resetUrl = `https://todo.132024.xyz/reset-password?token=${resetToken}`;

      // 发送邮件
      const emailHtml = `
        <h2>重置密码</h2>
        <p>您好，</p>
        <p>我们收到了您的密码重置请求。请点击下面的链接重置密码：</p>
        <p><a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background: #667eea; color: white; text-decoration: none; border-radius: 5px;">重置密码</a></p>
        <p>或复制此链接到浏览器：</p>
        <p>${resetUrl}</p>
        <p>此链接将在 1 小时后失效。</p>
        <p>如果您没有请求重置密码，请忽略此邮件。</p>
        <hr>
        <p style="color: #999; font-size: 12px;">Simple Todo - 简洁的待办事项应用</p>
      `;

      try {
        await sendEmail(user.email, '重置密码 - Simple Todo', emailHtml, env);
      } catch (err) {
        console.error('Email send error:', err);
        return new Response(JSON.stringify({ error: '邮件发送失败，请稍后重试' }), {
          status: 500,
          headers: { ...corsHeaders(), 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ 
        message: '如果该邮箱已注册，您将收到重置密码的邮件' 
      }), {
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' }
      });
    }

    // 重置密码
    if (path === '/reset-password' && method === 'POST') {
      const { token, password } = await request.json();

      if (!token || !password) {
        return new Response(JSON.stringify({ error: '缺少必要参数' }), {
          status: 400,
          headers: { ...corsHeaders(), 'Content-Type': 'application/json' }
        });
      }

      // 验证令牌
      const resetRecord = await env.DB.prepare(
        'SELECT * FROM password_reset_tokens WHERE token = ? AND used = 0'
      ).bind(token).first();

      if (!resetRecord) {
        return new Response(JSON.stringify({ error: '重置链接无效或已使用' }), {
          status: 400,
          headers: { ...corsHeaders(), 'Content-Type': 'application/json' }
        });
      }

      // 检查是否过期
      const now = Math.floor(Date.now() / 1000);
      if (resetRecord.expires_at < now) {
        return new Response(JSON.stringify({ error: '重置链接已过期' }), {
          status: 400,
          headers: { ...corsHeaders(), 'Content-Type': 'application/json' }
        });
      }

      // 更新密码
      const passwordHash = await hashPassword(password);
      await env.DB.prepare(
        'UPDATE users SET password_hash = ? WHERE id = ?'
      ).bind(passwordHash, resetRecord.user_id).run();

      // 标记令牌为已使用
      await env.DB.prepare(
        'UPDATE password_reset_tokens SET used = 1 WHERE id = ?'
      ).bind(resetRecord.id).run();

      return new Response(JSON.stringify({ message: '密码重置成功' }), {
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' }
      });
    }

    // 验证 token 的中间件
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: '未授权' }), {
        status: 401,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.substring(7);
    const payload = await verifyToken(token);
    
    if (!payload) {
      return new Response(JSON.stringify({ error: 'Token 无效' }), {
        status: 401,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' }
      });
    }

    const userId = payload.userId;

    // 获取所有待办
    if (path === '/todos' && method === 'GET') {
      const todos = await env.DB.prepare(
        'SELECT * FROM todos WHERE user_id = ? ORDER BY created_at DESC'
      ).bind(userId).all();

      return new Response(JSON.stringify(todos.results), {
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' }
      });
    }

    // 创建待办
    if (path === '/todos' && method === 'POST') {
      const { text } = await request.json();

      if (!text) {
        return new Response(JSON.stringify({ error: '待办内容不能为空' }), {
          status: 400,
          headers: { ...corsHeaders(), 'Content-Type': 'application/json' }
        });
      }

      const result = await env.DB.prepare(
        'INSERT INTO todos (user_id, text) VALUES (?, ?)'
      ).bind(userId, text).run();

      const todo = await env.DB.prepare(
        'SELECT * FROM todos WHERE id = ?'
      ).bind(result.meta.last_row_id).first();

      return new Response(JSON.stringify(todo), {
        status: 201,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' }
      });
    }

    // 更新待办
    if (path.match(/^\/todos\/\d+$/) && method === 'PUT') {
      const todoId = path.split('/')[2];
      const { text, completed } = await request.json();

      await env.DB.prepare(
        'UPDATE todos SET text = ?, completed = ?, updated_at = unixepoch() WHERE id = ? AND user_id = ?'
      ).bind(text, completed ? 1 : 0, todoId, userId).run();

      const todo = await env.DB.prepare(
        'SELECT * FROM todos WHERE id = ? AND user_id = ?'
      ).bind(todoId, userId).first();

      return new Response(JSON.stringify(todo), {
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' }
      });
    }

    // 删除待办
    if (path.match(/^\/todos\/\d+$/) && method === 'DELETE') {
      const todoId = path.split('/')[2];

      await env.DB.prepare(
        'DELETE FROM todos WHERE id = ? AND user_id = ?'
      ).bind(todoId, userId).run();

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' }
      });
    }

    // 404
    return new Response(JSON.stringify({ error: '未找到' }), {
      status: 404,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' }
    });
  }
}
