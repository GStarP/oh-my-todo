# 技术栈决策

日期：2026-04-20

## 背景

Todo 应用 MVP 需要选择前端技术栈和样式方案。

## 结论

**React + Vite + TypeScript + TailwindCSS + shadcn/ui**

## 理由

- 用户偏好 React
- Vite 开发体验好，启动快
- TypeScript 类型安全，适合后续扩展
- TailwindCSS 原子化 CSS，开发快，不用切文件
- shadcn/ui 基于 Radix UI，无障碍好，可定制，非黑盒依赖
- Jotai 原子化状态管理，简单灵活，比 Context+useReducer 更简洁

## 组件开发原则

- 积极拆分可复用的 UI 组件
- 业务组件和通用 UI 组件分层
- 通用组件放 `components/ui/`，业务组件放 `components/`
- 优先用 shadcn/ui 现有组件，不重复造轮子

## 版本原则

- 所有库使用最新稳定版
- 通过 Context7 MCP 查询最新文档，确保用法正确

采用 Repository 模式抽象存储层：

```ts
interface TodoRepository {
  getAll(): Todo[]
  getById(id: string): Todo | null
  create(todo: Todo): Todo
  update(todo: Todo): Todo
  delete(id: string): void
}
```

MVP 用 localStorage 实现，后续可无缝替换为 DB 实现。
