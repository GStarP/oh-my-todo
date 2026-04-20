import type { Todo } from "@/types/todo"

export interface TodoRepository {
  getAll(): Todo[]
  getById(id: string): Todo | null
  create(todo: Omit<Todo, "id">): Todo
  update(todo: Todo): Todo
  delete(id: string): void
}
