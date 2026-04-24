import test from "node:test"
import assert from "node:assert/strict"
import { buildTodoGroups } from "./todo-groups"
import type { Todo } from "../types/todo"

function makeTodo(overrides: Partial<Todo>): Todo {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    title: overrides.title ?? "todo",
    completed: overrides.completed ?? false,
    deadline: overrides.deadline ?? null,
    importance: overrides.importance ?? 0,
  }
}

test("groups completed todos separately and keeps default group open when only importance 0 exists", () => {
  const groups = buildTodoGroups([
    makeTodo({ title: "active", importance: 0, completed: false }),
    makeTodo({ title: "done", importance: 9, completed: true }),
  ])

  assert.equal(groups.length, 2)
  assert.deepEqual(
    groups.map((group) => ({
      key: group.key,
      label: group.label,
      defaultOpen: group.defaultOpen,
      titles: group.todos.map((todo) => todo.title),
    })),
    [
      {
        key: "importance-0",
        label: "重要度 0",
        defaultOpen: true,
        titles: ["active"],
      },
      {
        key: "completed",
        label: "已完成",
        defaultOpen: false,
        titles: ["done"],
      },
    ]
  )
})

test("keeps all active groups open by default and completed closed", () => {
  const groups = buildTodoGroups([
    makeTodo({ title: "p2", importance: 2 }),
    makeTodo({ title: "p0", importance: 0 }),
    makeTodo({ title: "done", importance: 99, completed: true }),
  ])

  assert.deepEqual(
    groups.map((group) => ({ label: group.label, defaultOpen: group.defaultOpen })),
    [
      { label: "重要度 2", defaultOpen: true },
      { label: "重要度 0", defaultOpen: true },
      { label: "已完成", defaultOpen: false },
    ]
  )
})
