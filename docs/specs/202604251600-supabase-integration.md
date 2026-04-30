# Supabase 集成规格

日期：2026-04-25

## 目标

接入 Supabase 云端存储，支持本地模式和 Supabase 模式，两种模式数据完全隔离。

## 数据隔离

- **本地模式**：localStorage key `oh-my-todo`
- **Supabase 模式**：云端 Supabase `todos` 表 + localStorage key `oh-my-todo-supabase`（本地副本，防刷新丢失）
- 两种模式数据完全无关，互不影响
- 连接信息：localStorage key `oh-my-todo-supabase-config`，存储 `{ url: string, anonKey: string }`

## 状态管理

### 新增 atoms

- `modeAtom`：`"local" | "supabase"`，持久化到 localStorage
- `supabaseConfigAtom`：`{ url: string, anonKey: string } | null`，持久化到 localStorage

### Supabase Client

- 工具函数 `createSupabaseClient(config)` 按需创建，不做 atom
- 仅连接验证和同步时使用

### todosAtom 改造

- 根据 modeAtom 选择数据源：
  - local → localStorage `oh-my-todo`
  - supabase → localStorage `oh-my-todo-supabase`
- 切换模式时清空 atom 并从对应数据源重新加载

### 初始化流程

1. 读取 localStorage 中的 mode 和 config
2. mode 为 supabase 且有 config → 尝试连接 → 连接成功进入 supabase 模式
3. 否则 → 本地模式

## 界面布局

### 整体结构

```
┌─────────────────────────────────────┐
│ 顶部栏（固定不滚动）                 │
├─────────────────────────────────────┤
│ 输入框（固定不滚动）                 │
├─────────────────────────────────────┤
│                                     │
│ Todo 列表（可滚动）                  │
│                                     │
└─────────────────────────────────────┘
```

### 顶部栏

布局：`左侧模式标签 | 右侧操作按钮`

**本地模式：**
- 左侧：显示"本地模式"
- 右侧："连接"按钮

**Supabase 模式：**
- 左侧：显示"Supabase 模式"
- 右侧：同步按钮、退出按钮

### 连接弹窗

- 两个输入框：Project URL、Anon Key
- "连接"按钮：验证同步所需的表和函数是否可访问，成功则切换模式并从云端同步到本地，失败提示错误
- 可关闭

### 样式

- 按钮/输入框圆角 4px，弹窗圆角 8px
- 简洁紧凑

## 同步/退出

### 同步

- 点击 `同步` 后，系统按本地同步状态和云端版本自动判断同步方向
- 本地无改动且云端无新版本：提示 `已是最新`
- 本地无改动且云端有新版本：云端覆盖本地，提示 `已更新本地`
- 本地有改动且云端无新版本：本地覆盖云端并生成新版本，提示 `已更新云端`
- 本地和云端都有新版本：弹窗让用户选择 `保留本地版本` 或 `保留云端版本`
- 同步期间按钮禁用，并显示 `同步中`

### 退出

- 回到本地模式
- 不清除 localStorage `oh-my-todo-supabase` 副本和 config（下次连接可复用）

### 冲突处理

- 不做条目级自动合并
- 仅在本地和云端都产生新版本时，要求用户选择保留哪一边

## 验收标准

- [ ] 两种模式数据完全隔离
- [ ] 本地模式下可点击连接按钮，输入 URL + Anon Key 连接 Supabase
- [ ] 连接失败时提示错误，不切换模式
- [ ] Supabase 模式下可同步、退出
- [ ] 本地无改动且云端无新版本时，点击同步提示 `已是最新`
- [ ] 本地无改动且云端有新版本时，点击同步后用云端覆盖本地，并提示 `已更新本地`
- [ ] 本地有改动且云端无新版本时，点击同步后用本地覆盖云端，并提示 `已更新云端`
- [ ] 本地有改动且云端有新版本时，点击同步弹出 `保留本地版本` / `保留云端版本` 选择框
- [ ] 刷新页面后 Supabase 模式数据不丢失（localStorage 副本）
- [ ] 退出后可重新连接（config 保留）
- [ ] 顶部栏和输入框固定不滚动，只有列表滚动
