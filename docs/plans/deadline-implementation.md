# Todo 截止时间功能 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Todo 添加 deadline 字段，支持日期/日期+时间设置，列表项显示紧迫提示。

**Architecture:** 数据层扩展 Todo 类型 + deadline 工具函数模块，UI 层修改列表项和侧边栏。紧迫判定逻辑独立为纯函数模块，便于测试。

**Tech Stack:** React 19, Jotai, dayjs, shadcn Calendar + Popover, 原生 time input

---

## 文件结构

| 操作 | 文件 | 职责 |
|------|------|------|
| 修改 | `src/types/todo.ts` | Todo 接口新增 deadline 字段 |
| 修改 | `src/atoms/todo-atoms.ts` | 新建 todo 时 deadline 默认为 null |
| 修改 | `src/repositories/local-storage-todo-repository.ts` | 兼容旧数据（无 deadline 字段） |
| 创建 | `src/lib/deadline.ts` | 紧迫判定 + 文字格式化纯函数 |
| 修改 | `src/components/todo-list.tsx` | 列表项显示倒计时文字 + 彩色左边框 |
| 修改 | `src/components/todo-sidebar.tsx` | 截止时间编辑区（日期+时间选择器） |
| 修改 | `src/components/todo-input.tsx` | 新建 todo 时 deadline 默认 null |

---

### Task 1: 安装 dayjs

- [ ] **Step 1: 安装 dayjs**

Run: `pnpm add dayjs`

- [ ] **Step 2: 验证安装**

Run: `pnpm ls dayjs`
Expected: 输出 dayjs 版本号

---

### Task 2: 扩展数据模型 + 兼容旧数据

**Files:**
- Modify: `src/types/todo.ts`
- Modify: `src/repositories/local-storage-todo-repository.ts`
- Modify: `src/atoms/todo-atoms.ts`
- Modify: `src/components/todo-input.tsx`

- [ ] **Step 1: 修改 Todo 接口，新增 deadline 字段**

`src/types/todo.ts` 改为：

```ts
export interface Todo {
  id: string
  title: string
  completed: boolean
  deadline: string | null
}
```

- [ ] **Step 2: localStorage 读取兼容旧数据**

`src/repositories/local-storage-todo-repository.ts` 的 `readStorage` 函数改为：

```ts
function readStorage(): Todo[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []
  try {
    const todos = JSON.parse(raw) as Todo[]
    return todos.map((t) => ({
      ...t,
      deadline: t.deadline ?? null,
    }))
  } catch {
    return []
  }
}
```

- [ ] **Step 3: 修改 todo-input.tsx 新建 todo 时带 deadline**

`src/components/todo-input.tsx` 的 handleSubmit 中 todo 对象改为：

```ts
const todo = { id: crypto.randomUUID(), title: trimmed, completed: false, deadline: null }
```

- [ ] **Step 4: 验证编译通过**

Run: `pnpm build`
Expected: 编译成功

- [ ] **Step 5: 提交**

```bash
git add src/types/todo.ts src/repositories/local-storage-todo-repository.ts src/components/todo-input.tsx
git commit -m "feat: add deadline field to Todo model with backward compatibility"
```

---

### Task 3: 紧迫判定工具函数

**Files:**
- Create: `src/lib/deadline.ts`

- [ ] **Step 1: 创建 deadline 工具模块**

`src/lib/deadline.ts`：

```ts
import dayjs from "dayjs"

export type DeadlineUrgency = "expired" | "urgent" | "remind" | null

export interface DeadlineInfo {
  urgency: DeadlineUrgency
  text: string | null
}

export function isDateOnly(deadline: string): boolean {
  return dayjs(deadline).format("HH:mm:ss") === "00:00:00"
}

export function getDeadlineInfo(
  deadline: string | null,
  completed: boolean
): DeadlineInfo {
  if (!deadline || completed) return { urgency: null, text: null }

  const now = dayjs()
  const dl = dayjs(deadline)
  const dateOnly = isDateOnly(deadline)

  if (dateOnly) {
    const today = now.startOf("day")
    const dlDay = dl.startOf("day")
    const diffDays = dlDay.diff(today, "day")

    if (diffDays < 0) return { urgency: "expired", text: "已过期" }
    if (diffDays === 1) return { urgency: "urgent", text: "明天" }
    if (diffDays > 1 && diffDays <= 3) return { urgency: "remind", text: `${diffDays}天内` }
    return { urgency: null, text: null }
  } else {
    const diffMs = dl.valueOf() - now.valueOf()

    if (diffMs < 0) return { urgency: "expired", text: "已过期" }
    if (diffMs === 0) return { urgency: "expired", text: "已过期" }

    const diffHours = diffMs / (1000 * 60 * 60)

    if (diffHours <= 24) {
      if (diffHours >= 1) return { urgency: "urgent", text: `${Math.floor(diffHours)}小时内` }
      const diffMinutes = Math.ceil(diffMs / (1000 * 60))
      if (diffMinutes <= 1) return { urgency: "urgent", text: "1分钟内" }
      return { urgency: "urgent", text: `${diffMinutes}分钟内` }
    }

    if (diffHours <= 72) {
      const diffDays = Math.ceil(diffHours / 24)
      return { urgency: "remind", text: `${diffDays}天内` }
    }

    return { urgency: null, text: null }
  }
}

export function formatDeadline(deadline: string): string {
  const dl = dayjs(deadline)
  if (isDateOnly(deadline)) return dl.format("YYYY-MM-DD")
  return dl.format("YYYY-MM-DD HH:mm")
}
```

- [ ] **Step 2: 验证编译通过**

Run: `pnpm build`
Expected: 编译成功

- [ ] **Step 3: 提交**

```bash
git add src/lib/deadline.ts
git commit -m "feat: add deadline urgency calculation utilities"
```

---

### Task 4: 列表项显示紧迫提示

**Files:**
- Modify: `src/components/todo-list.tsx`

- [ ] **Step 1: 修改 TodoList 组件**

`src/components/todo-list.tsx` 改为：

```tsx
import { useAtom, useSetAtom } from "jotai"
import { Checkbox } from "@/components/ui/checkbox"
import { todosAtom, selectedTodoIdAtom } from "@/atoms/todo-atoms"
import { cn } from "@/lib/utils"
import { getDeadlineInfo, isDateOnly } from "@/lib/deadline"
import dayjs from "dayjs"

export function TodoList() {
  const [todos] = useAtom(todosAtom)
  const [selectedId, setSelectedId] = useAtom(selectedTodoIdAtom)
  const setTodos = useSetAtom(todosAtom)

  if (todos.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground text-sm">
        No todos yet. Add one above!
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      {todos.map((todo) => {
        const info = getDeadlineInfo(todo.deadline, todo.completed)
        return (
          <div
            key={todo.id}
            onClick={() => setSelectedId(todo.id)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 cursor-pointer transition-colors hover:bg-muted",
              selectedId === todo.id && "bg-muted",
              info?.urgency === "expired" && "border-l-2 border-l-red-500",
              info?.urgency === "urgent" && "border-l-2 border-l-orange-500"
            )}
          >
            <div
              onClick={(e) => e.stopPropagation()}
            >
              <Checkbox
                checked={todo.completed}
                onCheckedChange={() =>
                  setTodos((draft) => {
                    const item = draft.find((t) => t.id === todo.id)
                    if (item) item.completed = !item.completed
                  })
                }
              />
            </div>
            <span
              className={cn(
                "flex-1 text-sm",
                todo.completed && "line-through text-muted-foreground"
              )}
            >
              {todo.title}
            </span>
            {info.text && (
              <span
                className={cn(
                  "text-xs whitespace-nowrap",
                  info.urgency === "expired" && "text-red-500",
                  info.urgency !== "expired" && "text-muted-foreground"
                )}
              >
                {info.text}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: 验证编译通过**

Run: `pnpm build`
Expected: 编译成功

- [ ] **Step 3: 提交**

```bash
git add src/components/todo-list.tsx
git commit -m "feat: show deadline urgency hints in todo list items"
```

---

### Task 5: 侧边栏截止时间编辑区

**Files:**
- Modify: `src/components/todo-sidebar.tsx`

- [ ] **Step 1: 修改 TodoSidebar 组件，新增截止时间编辑**

`src/components/todo-sidebar.tsx` 改为：

```tsx
import { useState, useEffect } from "react"
import { useAtom, useSetAtom } from "jotai"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ChevronDownIcon, XIcon } from "lucide-react"
import { selectedTodoAtom, selectedTodoIdAtom, todosAtom } from "@/atoms/todo-atoms"
import { formatDeadline, isDateOnly } from "@/lib/deadline"
import dayjs from "dayjs"

export function TodoSidebar() {
  const [selectedTodo] = useAtom(selectedTodoAtom)
  const [selectedId, setSelectedId] = useAtom(selectedTodoIdAtom)
  const setTodos = useSetAtom(todosAtom)

  const [editTitle, setEditTitle] = useState("")
  const [editDeadline, setEditDeadline] = useState<string | null>(null)
  const [calendarOpen, setCalendarOpen] = useState(false)

  useEffect(() => {
    if (selectedTodo) {
      setEditTitle(selectedTodo.title)
      setEditDeadline(selectedTodo.deadline)
    }
  }, [selectedTodo])

  const handleSave = () => {
    if (!selectedTodo) return
    const trimmed = editTitle.trim()
    if (!trimmed) return
    setTodos((draft) => {
      const item = draft.find((t) => t.id === selectedTodo.id)
      if (item) {
        item.title = trimmed
        item.deadline = editDeadline
      }
    })
  }

  const handleDelete = () => {
    if (!selectedTodo) return
    setTodos((draft) => {
      const index = draft.findIndex((t) => t.id === selectedTodo.id)
      if (index !== -1) draft.splice(index, 1)
    })
    setSelectedId(null)
  }

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return
    const prevTime = editDeadline && !isDateOnly(editDeadline)
      ? dayjs(editDeadline).format("HH:mm:ss")
      : "00:00:00"
    const newDeadline = dayjs(date).format("YYYY-MM-DD") + "T" + prevTime
    setEditDeadline(newDeadline)
    setCalendarOpen(false)
  }

  const handleTimeChange = (timeStr: string) => {
    if (!editDeadline) return
    if (!timeStr) {
      setEditDeadline(dayjs(editDeadline).startOf("day").format("YYYY-MM-DDTHH:mm:ss"))
      return
    }
    const newDeadline = dayjs(editDeadline).format("YYYY-MM-DD") + "T" + timeStr + ":00"
    setEditDeadline(newDeadline)
  }

  const handleClearDeadline = () => {
    setEditDeadline(null)
  }

  const open = selectedId !== null

  const deadlineDate = editDeadline ? new Date(editDeadline) : undefined
  const deadlineTime = editDeadline && !isDateOnly(editDeadline)
    ? dayjs(editDeadline).format("HH:mm:ss")
    : ""

  return (
    <Sheet open={open} onOpenChange={(v) => !v && setSelectedId(null)}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Edit Todo</SheetTitle>
          <SheetDescription>Modify or delete this todo.</SheetDescription>
        </SheetHeader>
        {selectedTodo && (
          <div className="flex flex-col gap-4 px-4">
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium">Title</Label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={handleSave}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium">Deadline</Label>
              <div className="flex gap-2">
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger render={<Button variant="outline" className="justify-between font-normal flex-1" />}>
                    {editDeadline ? dayjs(editDeadline).format("YYYY-MM-DD") : "Pick a date"}
                    <ChevronDownIcon />
                  </PopoverTrigger>
                  <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={deadlineDate}
                      onSelect={handleDateSelect}
                    />
                  </PopoverContent>
                </Popover>
                <Input
                  type="time"
                  step="1"
                  disabled={!editDeadline}
                  value={deadlineTime}
                  onChange={(e) => handleTimeChange(e.target.value)}
                  className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none w-32"
                  placeholder="Time"
                />
                {editDeadline && (
                  <Button variant="ghost" size="icon" onClick={handleClearDeadline}>
                    <XIcon className="size-4" />
                  </Button>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium">Status</Label>
              <span className="text-sm text-muted-foreground">
                {selectedTodo.completed ? "Completed" : "Active"}
              </span>
            </div>
            <Button variant="destructive" onClick={handleDelete} className="mt-4">
              Delete
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 2: 验证编译通过**

Run: `pnpm build`
Expected: 编译成功

- [ ] **Step 3: 提交**

```bash
git add src/components/todo-sidebar.tsx
git commit -m "feat: add deadline editor in sidebar with date and time pickers"
```

---

### Task 6: 验收验证

- [ ] **Step 1: 运行 lint**

Run: `pnpm lint`
Expected: 无错误

- [ ] **Step 2: 运行 build**

Run: `pnpm build`
Expected: 编译成功

- [ ] **Step 3: 手动验收**

Run: `pnpm dev`

验证项目：
- [ ] 新建 todo 后点击，侧边栏显示截止时间编辑区
- [ ] 选择日期后保存，列表项右端显示倒计时文字
- [ ] 选择日期+时间后保存，文字格式正确
- [ ] 清除截止时间后，列表项不显示提示
- [ ] 已完成项不显示紧迫提示
- [ ] 过期项红色左边框 + 红色"已过期"文字
- [ ] 紧急项橙色左边框 + 灰色文字
- [ ] 提醒项灰色文字，无边框
- [ ] 刷新页面数据保留
