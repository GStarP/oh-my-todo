import type { Todo } from "@/types/todo"

const SORT_ORDER_STEP = 100

export function recalculateSortOrders(todos: Todo[]): Map<string, number> {
  const result = new Map<string, number>()
  todos.forEach((todo, index) => {
    result.set(todo.id, index * SORT_ORDER_STEP)
  })
  return result
}

export function getInsertSortOrder(
  todos: Todo[],
  insertIndex: number
): number {
  if (todos.length === 0) return 0
  if (insertIndex <= 0) return todos[0].sortOrder - SORT_ORDER_STEP
  if (insertIndex >= todos.length) return todos[todos.length - 1].sortOrder + SORT_ORDER_STEP
  return Math.floor((todos[insertIndex - 1].sortOrder + todos[insertIndex].sortOrder) / 2)
}
