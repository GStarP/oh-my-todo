import { atom } from "jotai"
import { atomWithImmer } from "jotai-immer"
import type { Todo } from "@/types/todo"
import type { TodoRepository } from "@/repositories/todo-repository"
import { LocalStorageTodoRepository } from "@/repositories/local-storage-todo-repository"

const repo: TodoRepository = new LocalStorageTodoRepository()

export const todosAtom = atomWithImmer<Todo[]>(repo.getAll())
export const selectedTodoIdAtom = atom<string | null>(null)

export const selectedTodoAtom = atom((get) => {
  const id = get(selectedTodoIdAtom)
  const todos = get(todosAtom)
  return todos.find((t) => t.id === id) ?? null
})
