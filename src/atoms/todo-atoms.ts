import { atom } from "jotai"
import { atomWithImmer } from "jotai-immer"
import type { Todo } from "@/types/todo"
import type { TodoRepository } from "@/repositories/todo-repository"
import { LocalStorageTodoRepository } from "@/repositories/local-storage-todo-repository"

const STORAGE_KEY = "oh-my-todo"

const repo: TodoRepository = new LocalStorageTodoRepository()

const innerTodosAtom = atomWithImmer<Todo[]>(repo.getAll())

function persist(todos: Todo[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos))
}

type TodoUpdate = Todo[] | ((draft: Todo[]) => void)

export const todosAtom = atom<Todo[], [TodoUpdate], void>(
  (get) => get(innerTodosAtom),
  (get, set, arg: TodoUpdate) => {
    set(innerTodosAtom, arg as never)
    persist(get(innerTodosAtom))
  },
)

export const selectedTodoIdAtom = atom<string | null>(null)

export const selectedTodoAtom = atom((get) => {
  const id = get(selectedTodoIdAtom)
  const todos = get(todosAtom)
  return todos.find((t) => t.id === id) ?? null
})
