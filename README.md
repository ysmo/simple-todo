# Simple Todo

一个简洁的待办事项应用，支持用户注册登录和云端数据存储。

## ✨ 功能特性

- 📧 用户注册/登录（邮箱 + 密码）
- ☁️ 数据云端存储（Cloudflare D1）
- 🔄 多设备自动同步
- 🔒 用户数据隔离
- 📱 响应式设计
- ⚡ 全球 CDN 加速

## 🌐 在线访问

**正式网站：** https://todo.132024.xyz

## 🛠️ 技术栈

- **前端**：Vue 3 + Vite
- **后端**：Cloudflare Pages Functions
- **数据库**：Cloudflare D1（SQLite）
- **认证**：JWT Token
- **部署**：Cloudflare Pages
- **成本**：完全免费

## 📁 项目结构

```
todo-app/
├── src/
│   ├── App.vue          # 前端主组件
│   ├── main.js          # 入口文件
│   └── style.css        # 全局样式
├── functions/
│   └── api/
│       └── [[path]].js  # 后端 API（Pages Functions）
├── dist/                # 构建输出
├── package.json
└── vite.config.js
```

## 🚀 本地开发

### 安装依赖
```bash
npm install
```

### 开发模式
```bash
npm run dev
```

### 构建
```bash
npm run build
```

## 📦 部署

### 部署到 Cloudflare Pages
```bash
wrangler pages deploy dist/ --project-name=simple-todo
```

### 首次部署需要绑定 D1 数据库

1. 创建 D1 数据库：
```bash
wrangler d1 create simple-todo-db
```

2. 初始化数据库表：
```bash
wrangler d1 execute simple-todo-db --remote --file=schema.sql
```

3. 在 Cloudflare Dashboard 绑定数据库到 Pages 项目

## 📝 API 接口

### 认证
- `POST /api/register` - 用户注册
- `POST /api/login` - 用户登录

### Todo 管理（需要 Authorization header）
- `GET /api/todos` - 获取待办列表
- `POST /api/todos` - 创建待办
- `PUT /api/todos/:id` - 更新待办
- `DELETE /api/todos/:id` - 删除待办

## 📄 许可证

MIT
