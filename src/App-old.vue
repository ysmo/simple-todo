<script setup>
import { ref, computed, onMounted } from 'vue'

const API_URL = '/api'

// 状态
const isLoggedIn = ref(false)
const token = ref('')
const user = ref(null)
const todos = ref([])
const loading = ref(false)
const error = ref('')

// 表单
const showLogin = ref(true) // true=登录, false=注册
const email = ref('')
const password = ref('')
const newTodo = ref('')

// 检查登录状态
onMounted(() => {
  const savedToken = localStorage.getItem('token')
  const savedUser = localStorage.getItem('user')
  if (savedToken && savedUser) {
    token.value = savedToken
    user.value = JSON.parse(savedUser)
    isLoggedIn.value = true
    fetchTodos()
  }
})

// API 请求
async function apiRequest(url, options = {}) {
  loading.value = true
  error.value = ''
  try {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    }
    if (token.value) {
      headers.Authorization = `Bearer ${token.value}`
    }
    
    const response = await fetch(`${API_URL}${url}`, {
      ...options,
      headers
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.error || '请求失败')
    }
    
    return data
  } catch (err) {
    error.value = err.message
    throw err
  } finally {
    loading.value = false
  }
}

// 注册
async function register() {
  try {
    const data = await apiRequest('/api/register', {
      method: 'POST',
      body: JSON.stringify({ email: email.value, password: password.value })
    })
    
    token.value = data.token
    user.value = data.user
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
    isLoggedIn.value = true
    email.value = ''
    password.value = ''
    fetchTodos()
  } catch (err) {
    console.error('注册失败:', err)
  }
}

// 登录
async function login() {
  try {
    const data = await apiRequest('/api/login', {
      method: 'POST',
      body: JSON.stringify({ email: email.value, password: password.value })
    })
    
    token.value = data.token
    user.value = data.user
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
    isLoggedIn.value = true
    email.value = ''
    password.value = ''
    fetchTodos()
  } catch (err) {
    console.error('登录失败:', err)
  }
}

// 登出
function logout() {
  token.value = ''
  user.value = null
  todos.value = []
  isLoggedIn.value = false
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}

// 获取待办列表
async function fetchTodos() {
  try {
    const data = await apiRequest('/api/todos')
    todos.value = data
  } catch (err) {
    console.error('获取待办失败:', err)
  }
}

// 添加待办
async function addTodo() {
  if (!newTodo.value.trim()) return
  
  try {
    const todo = await apiRequest('/api/todos', {
      method: 'POST',
      body: JSON.stringify({ text: newTodo.value.trim() })
    })
    
    todos.value.unshift(todo)
    newTodo.value = ''
  } catch (err) {
    console.error('添加待办失败:', err)
  }
}

// 切换完成状态
async function toggleTodo(todo) {
  const newCompleted = todo.completed ? 0 : 1
  
  try {
    const updated = await apiRequest(`/api/todos/${todo.id}`, {
      method: 'PUT',
      body: JSON.stringify({ text: todo.text, completed: newCompleted })
    })
    
    const index = todos.value.findIndex(t => t.id === todo.id)
    if (index !== -1) {
      todos.value[index] = updated
    }
  } catch (err) {
    console.error('更新待办失败:', err)
  }
}

// 删除待办
async function deleteTodo(id) {
  try {
    await apiRequest(`/api/todos/${id}`, {
      method: 'DELETE'
    })
    
    todos.value = todos.value.filter(t => t.id !== id)
  } catch (err) {
    console.error('删除待办失败:', err)
  }
}

// 统计
const stats = computed(() => ({
  total: todos.value.length,
  completed: todos.value.filter(t => t.completed).length,
  active: todos.value.filter(t => !t.completed).length
}))
</script>

<template>
  <div id="app">
    <!-- 未登录 - 显示登录/注册表单 -->
    <div v-if="!isLoggedIn" class="container auth-container">
      <h1>📝 Simple Todo</h1>
      
      <div class="auth-tabs">
        <button 
          @click="showLogin = true" 
          :class="{ active: showLogin }"
          class="tab-btn"
        >
          登录
        </button>
        <button 
          @click="showLogin = false" 
          :class="{ active: !showLogin }"
          class="tab-btn"
        >
          注册
        </button>
      </div>

      <form @submit.prevent="showLogin ? login() : register()" class="auth-form">
        <input
          v-model="email"
          type="email"
          placeholder="邮箱"
          required
          class="auth-input"
        />
        <input
          v-model="password"
          type="password"
          placeholder="密码"
          required
          class="auth-input"
        />
        
        <div v-if="error" class="error-msg">{{ error }}</div>
        
        <button 
          type="submit" 
          class="auth-btn"
          :disabled="loading"
        >
          {{ loading ? '处理中...' : (showLogin ? '登录' : '注册') }}
        </button>
      </form>
    </div>

    <!-- 已登录 - 显示待办列表 -->
    <div v-else class="container">
      <div class="header">
        <h1>📝 Todo List</h1>
        <div class="user-info">
          <span>{{ user.email }}</span>
          <button @click="logout" class="logout-btn">退出</button>
        </div>
      </div>
      
      <!-- 输入框 -->
      <div class="input-section">
        <input
          v-model="newTodo"
          @keyup.enter="addTodo"
          type="text"
          placeholder="添加新任务..."
          class="todo-input"
          :disabled="loading"
        />
        <button @click="addTodo" class="add-btn" :disabled="loading">
          {{ loading ? '...' : '添加' }}
        </button>
      </div>

      <!-- 统计信息 -->
      <div class="stats">
        <span>总计: {{ stats.total }}</span>
        <span>待完成: {{ stats.active }}</span>
        <span>已完成: {{ stats.completed }}</span>
      </div>

      <div v-if="error" class="error-msg">{{ error }}</div>

      <!-- 任务列表 -->
      <ul class="todo-list">
        <li
          v-for="todo in todos"
          :key="todo.id"
          :class="{ completed: todo.completed }"
          class="todo-item"
        >
          <input
            type="checkbox"
            :checked="todo.completed"
            @change="toggleTodo(todo)"
            class="checkbox"
          />
          <span class="todo-text">{{ todo.text }}</span>
          <button @click="deleteTodo(todo.id)" class="delete-btn">删除</button>
        </li>
      </ul>

      <!-- 空状态 -->
      <div v-if="todos.length === 0 && !loading" class="empty-state">
        暂无任务，添加一个开始吧！
      </div>
      
      <div v-if="loading && todos.length === 0" class="empty-state">
        加载中...
      </div>
    </div>
  </div>
</template>

<style scoped>
#app {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.container {
  background: white;
  border-radius: 20px;
  padding: 40px;
  max-width: 600px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.auth-container {
  max-width: 400px;
}

h1 {
  text-align: center;
  color: #333;
  margin-bottom: 30px;
  font-size: 2.5rem;
}

.header {
  margin-bottom: 30px;
}

.user-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  background: #f5f5f5;
  border-radius: 10px;
  margin-bottom: 20px;
  font-size: 14px;
}

.logout-btn {
  padding: 6px 12px;
  background: #ff6b6b;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.3s;
}

.logout-btn:hover {
  background: #ee5a52;
}

.auth-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.tab-btn {
  flex: 1;
  padding: 12px;
  border: 2px solid #e0e0e0;
  background: white;
  border-radius: 10px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.3s;
}

.tab-btn.active {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.auth-input {
  padding: 12px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  font-size: 16px;
  transition: border-color 0.3s;
}

.auth-input:focus {
  outline: none;
  border-color: #667eea;
}

.auth-btn {
  padding: 12px 24px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.3s;
}

.auth-btn:hover:not(:disabled) {
  background: #5568d3;
}

.auth-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.input-section {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.todo-input {
  flex: 1;
  padding: 12px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  font-size: 16px;
  transition: border-color 0.3s;
}

.todo-input:focus {
  outline: none;
  border-color: #667eea;
}

.add-btn {
  padding: 12px 24px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.3s;
}

.add-btn:hover:not(:disabled) {
  background: #5568d3;
}

.add-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.stats {
  display: flex;
  justify-content: space-around;
  padding: 15px;
  background: #f5f5f5;
  border-radius: 10px;
  margin-bottom: 20px;
  font-size: 14px;
  color: #666;
}

.error-msg {
  padding: 10px;
  background: #ffe6e6;
  color: #d63031;
  border-radius: 6px;
  font-size: 14px;
  margin-bottom: 15px;
}

.todo-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.todo-item {
  display: flex;
  align-items: center;
  padding: 15px;
  border-bottom: 1px solid #e0e0e0;
  transition: background 0.3s;
}

.todo-item:hover {
  background: #f9f9f9;
}

.todo-item.completed .todo-text {
  text-decoration: line-through;
  color: #999;
}

.checkbox {
  width: 20px;
  height: 20px;
  cursor: pointer;
  margin-right: 15px;
}

.todo-text {
  flex: 1;
  font-size: 16px;
  color: #333;
}

.delete-btn {
  padding: 6px 12px;
  background: #ff6b6b;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.3s;
}

.delete-btn:hover {
  background: #ee5a52;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #999;
  font-size: 18px;
}
</style>
