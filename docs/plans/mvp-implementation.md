# MVP 实施计划

日期：2026-04-21

## 目标

搭建 oh-my-todo 项目，完成 MVP 全部功能。

## 步骤

### 1. 项目初始化

- Vite + React + TypeScript 脚手架
- 安装 TailwindCSS v4
- 安装配置 shadcn/ui
- 预期产出：空项目能跑起来

### 2. 存储层抽象

- 定义 `Todo` 类型和 `TodoRepository` 接口
- 实现 `LocalStorageTodoRepository`
- 预期产出：存储层可独立使用和测试

### 3. 状态管理

- 用 React Context + useReducer 管理 todo 状态
- 注入 Repository 实现
- 预期产出：状态层和存储层解耦

### 4. UI 组件开发

- 引入 shadcn/ui 基础组件（Input, Checkbox, Button, Sheet）
- 拆分业务组件：TodoItem, TodoList, TodoInput, TodoSidebar
- 组装页面布局：左侧列表 + 右侧边栏
- 预期产出：完整可交互界面

### 5. 联调验证

- CRUD 流程跑通
- 边栏展开/收起正常
- 刷新数据保留
- 存储层抽象可替换
