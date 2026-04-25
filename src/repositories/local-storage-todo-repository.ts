import type { Todo } from "@/types/todo"
import type { TodoRepository } from "./todo-repository"

const STORAGE_KEY = "oh-my-todo"

function generateId(): string {
  return crypto.randomUUID()
}

function readStorage(): Todo[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []
  try {
    const todos = JSON.parse(raw) as Todo[]
    return todos.map((t) => ({
      ...t,
      deadline: t.deadline ?? null,
      importance: t.importance ?? 0,
      sortOrder: t.sortOrder ?? 0,
      notes: t.notes ?? "",
    }))
  } catch {
    return []
  }
}

function writeStorage(todos: Todo[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos))
}

export class LocalStorageTodoRepository implements TodoRepository {
  getAll(): Todo[] {
    return readStorage()
  }

  getById(id: string): Todo | null {
    return readStorage().find((t) => t.id === id) ?? null
  }

  create(data: Omit<Todo, "id">): Todo {
    const todos = readStorage()
    const todo: Todo = { id: generateId(), ...data }
    todos.push(todo)
    writeStorage(todos)
    return todo
  }

  update(todo: Todo): Todo {
    const todos = readStorage()
    const index = todos.findIndex((t) => t.id === todo.id)
    if (index === -1) throw new Error(`Todo not found: ${todo.id}`)
    todos[index] = todo
    writeStorage(todos)
    return todo
  }

  delete(id: string): void {
    const todos = readStorage().filter((t) => t.id !== id)
    writeStorage(todos)
  }
}
