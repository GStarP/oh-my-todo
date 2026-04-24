import type { Todo } from "@/types/todo"

export interface TodoGroup {
  key: string
  label: string
  defaultOpen: boolean
  todos: Todo[]
}

export function buildTodoGroups(todos: Todo[]): TodoGroup[] {
  const activeGroups = new Map<number, Todo[]>()
  const completed: Todo[] = []

  for (const todo of todos) {
    if (todo.completed) {
      completed.push(todo)
      continue
    }

    if (!activeGroups.has(todo.importance)) {
      activeGroups.set(todo.importance, [])
    }

    activeGroups.get(todo.importance)?.push(todo)
  }

  const sortedActiveGroups = [...activeGroups.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([importance, items]) => ({
      key: `importance-${importance}`,
      label: `重要度 ${importance}`,
      defaultOpen: true,
      todos: items,
    }))

  if (completed.length === 0) {
    return sortedActiveGroups
  }

  return [
    ...sortedActiveGroups,
    {
      key: "completed",
      label: "已完成",
      defaultOpen: false,
      todos: completed,
    },
  ]
}
