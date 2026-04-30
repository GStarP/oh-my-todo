import { atom } from "jotai"
import { atomWithImmer } from "jotai-immer"
import type { Todo } from "@/types/todo"
import type { SupabaseConfig } from "@/lib/supabase"

const LOCAL_KEY = "oh-my-todo"
const SUPABASE_KEY = "oh-my-todo-supabase"
const MODE_KEY = "oh-my-todo-mode"
const CONFIG_KEY = "oh-my-todo-supabase-config"
const SYNC_KEY = "oh-my-todo-supabase-sync"

export type Mode = "local" | "supabase"
export interface SupabaseSyncState {
  baseVersion: number | null
  dirty: boolean
}

function readStorage(key: string): Todo[] {
  const raw = localStorage.getItem(key)
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

function writeStorage(key: string, todos: Todo[]) {
  localStorage.setItem(key, JSON.stringify(todos))
}

function readMode(): Mode {
  const mode = localStorage.getItem(MODE_KEY)
  return mode === "local" || mode === "supabase" ? mode : "local"
}

function writeMode(mode: Mode) {
  localStorage.setItem(MODE_KEY, mode)
}

function readConfig(): SupabaseConfig | null {
  const raw = localStorage.getItem(CONFIG_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as SupabaseConfig
  } catch {
    return null
  }
}

function writeConfig(config: SupabaseConfig | null) {
  if (config) {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
  } else {
    localStorage.removeItem(CONFIG_KEY)
  }
}

export function readSupabaseSyncState(): SupabaseSyncState {
  const raw = localStorage.getItem(SYNC_KEY)
  if (!raw) return { baseVersion: null, dirty: false }

  try {
    const value = JSON.parse(raw) as Partial<SupabaseSyncState>
    return {
      baseVersion: typeof value.baseVersion === "number" ? value.baseVersion : null,
      dirty: value.dirty === true,
    }
  } catch {
    return { baseVersion: null, dirty: false }
  }
}

export function writeSupabaseSyncState(state: SupabaseSyncState) {
  localStorage.setItem(SYNC_KEY, JSON.stringify(state))
}

export function markSupabaseSyncDirty() {
  if (readMode() !== "supabase") return
  writeSupabaseSyncState({ ...readSupabaseSyncState(), dirty: true })
}

export function applySupabasePull(todos: Todo[], version: number) {
  writeStorage(SUPABASE_KEY, todos)
  writeSupabaseSyncState({ baseVersion: version, dirty: false })
}

export function applySupabasePush(version: number) {
  writeSupabaseSyncState({ baseVersion: version, dirty: false })
}

const initialMode = readMode()
const storageKey = initialMode === "supabase" ? SUPABASE_KEY : LOCAL_KEY

const innerTodosAtom = atomWithImmer<Todo[]>(readStorage(storageKey))

type TodoUpdate = Todo[] | ((draft: Todo[]) => void)

export const modeAtom = atom<Mode>(initialMode)

export const supabaseConfigAtom = atom<SupabaseConfig | null>(readConfig())

export const todosAtom = atom<Todo[], [TodoUpdate], void>(
  (get) => get(innerTodosAtom),
  (get, set, arg: TodoUpdate) => {
    set(innerTodosAtom, arg as never)
    const mode = get(modeAtom)
    const key = mode === "supabase" ? SUPABASE_KEY : LOCAL_KEY
    writeStorage(key, get(innerTodosAtom))
    if (mode === "supabase") {
      writeSupabaseSyncState({ ...readSupabaseSyncState(), dirty: true })
    }
  },
)

export const selectedTodoIdAtom = atom<string | null>(null)

export const selectedTodoAtom = atom((get) => {
  const id = get(selectedTodoIdAtom)
  const todos = get(todosAtom)
  return todos.find((t) => t.id === id) ?? null
})

export function switchMode(mode: Mode, config?: SupabaseConfig | null) {
  writeMode(mode)
  if (config !== undefined) writeConfig(config)
  const key = mode === "supabase" ? SUPABASE_KEY : LOCAL_KEY
  const todos = readStorage(key)
  return { mode, todos }
}

export function loadSupabaseTodos(todos: Todo[]) {
  writeStorage(SUPABASE_KEY, todos)
}
