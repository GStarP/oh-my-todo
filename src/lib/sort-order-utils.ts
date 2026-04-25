import type { Todo } from "@/types/todo"

const SORT_ORDER_STEP = 100

export function recalculateSortOrders(todos: Todo[]): Map<string, number> {
  const result = new Map<string, number>()
  const sorted = [...todos].sort((a, b) => a.sortOrder - b.sortOrder)
  sorted.forEach((todo, index) => {
    result.set(todo.id, index * SORT_ORDER_STEP)
  })
  return result
}

export function getInsertSortOrder(
  todos: Todo[],
  insertIndex: number
): number {
  const sorted = [...todos].sort((a, b) => a.sortOrder - b.sortOrder)
  if (sorted.length === 0) return 0
  if (insertIndex <= 0) return sorted[0].sortOrder - SORT_ORDER_STEP
  if (insertIndex >= sorted.length) return sorted[sorted.length - 1].sortOrder + SORT_ORDER_STEP
  return Math.floor((sorted[insertIndex - 1].sortOrder + sorted[insertIndex].sortOrder) / 2)
}
