# 统一反馈组件与阻塞加载规格

日期：2026-04-30

## 目标

统一替换当前使用的浏览器 `alert` / `confirm`，提供简单一致的全局 UI 调用方式；同时补充同步等阻塞操作的全屏 loading 反馈，并调整编辑待办中的字段顺序。

## 功能范围

- 新增全局 `UI` 入口，统一提供 toast、confirm、loading 能力
- 将当前同步相关业务提示从浏览器原生弹窗迁移到自定义 UI 组件
- 编辑待办中，将“截止时间”移动到“重要度”上方
- 同步相关阻塞操作期间，显示全局 loading 并阻止页面交互

## 全局 UI 入口

### 调用方式

```ts
UI.toast.info(message, options?)
UI.toast.success(message, options?)
UI.toast.warning(message, options?)
UI.toast.error(message, options?)

const ok = await UI.confirm(options)

UI.loading.show(options?)
UI.loading.hide()
```

- `UI` 为全局统一入口
- 应用根部挂载 `UIProvider`，负责实际渲染 toast、confirm、loading
- 业务代码不直接调用浏览器 `alert` / `confirm`

### Toast

- 支持 `info`、`success`、`warning`、`error` 四种类型
- 四种 toast 默认使用同一自动消失时长
- 支持通过 `duration` 自定义展示时长
- toast 用于轻量结果反馈，不阻塞当前页面

### Confirm

- `UI.confirm()` 只接收对象参数
- 返回 `Promise<boolean>`
- 未传字段时使用以下默认值：
  - `title`：`请确认`
  - `description`：空字符串
  - `confirmText`：`确定`
  - `cancelText`：`取消`
- 适用于普通二选一确认场景

### Loading

- `UI.loading.show()` 打开全屏遮罩
- `UI.loading.hide()` 关闭全屏遮罩
- loading 显示加载图标和文案
- 未传文案时使用默认文案 `处理中`
- 支持按场景传入自定义文案，如 `连接中`、`同步中`

## 页面行为

### TopBar

- 当前同步相关 `alert(...)` 全部替换为对应 toast
- 退出 Supabase 模式时，使用 `await UI.confirm(...)` 代替浏览器 `confirm(...)`
- 以下阻塞型异步操作期间显示全局 loading：
  - 连接 Supabase
  - 手动同步
  - 冲突后选择保留本地版本
  - 冲突后选择保留云端版本
- 现有按钮禁用状态保留，但全局 loading 是主要阻塞反馈

### 冲突弹窗

- 保留现有专用冲突弹窗
- 本次不将其抽象进 `UI.confirm()`
- 原因：冲突弹窗是三按钮决策，不属于普通确认框

### 编辑待办

- `TodoSidebar` 中字段顺序调整为：
  - 标题
  - 备注
  - 截止时间
  - 重要度
- 只改展示顺序，不改字段含义和保存逻辑

## 交互规则

### Toast

- toast 可连续显示多个
- 新 toast 不影响已有 toast 的自动消失计时
- toast 不阻塞页面交互

### Confirm

- 点击确认返回 `true`
- 点击取消、关闭弹窗或遮罩返回 `false`
- confirm 打开期间，焦点保持在弹窗范围内

### Blocking Loading

- loading 打开期间，页面不可交互
- 禁止点击、编辑、关闭当前页面上的交互控件
- loading 仅用于阻塞型异步操作，不用于普通本地即时更新

## 样式要求

- 沿用当前项目视觉风格
- 语言以中文为主
- 按钮和输入框圆角 4px
- 卡片和弹窗圆角 8px
- 移动端优先，同时兼容 PC

## 非目标

- 不引入新的第三方 toast 或 dialog 依赖
- 不改造现有冲突弹窗为通用组件
- 不调整 todo 数据结构
- 不修改现有同步判定和同步规则

## 验收标准

- [ ] 当前相关业务不再直接使用浏览器 `alert` / `confirm`
- [ ] 可通过 `UI.toast.info(...)`、`UI.toast.success(...)`、`UI.toast.warning(...)`、`UI.toast.error(...)` 触发提示
- [ ] 四种 toast 默认使用同一自动消失时长，且支持 `duration` 覆盖
- [ ] 可通过 `await UI.confirm({ ... })` 获取确认结果，未传字段时使用默认文案
- [ ] 连接 Supabase 期间显示全局 loading，且页面不可交互
- [ ] 手动同步期间显示全局 loading，且页面不可交互
- [ ] 冲突决策提交期间显示全局 loading，且页面不可交互
- [ ] 编辑待办中，“截止时间”显示在“重要度”上方
- [ ] 不新增第三方弹窗/通知依赖
- [ ] 不修改 todo 数据结构和同步规则
