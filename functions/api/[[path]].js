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
