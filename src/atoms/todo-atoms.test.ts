import assert from "node:assert/strict"
import test from "node:test"
import { createStore } from "jotai"
import type { Todo } from "@/types/todo"

const LOCAL_KEY = "oh-my-todo"
const SUPABASE_KEY = "oh-my-todo-supabase"
const MODE_KEY = "oh-my-todo-mode"
const SYNC_KEY = "oh-my-todo-supabase-sync"

class MemoryStorage {
  private store = new Map<string, string>()

  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null
  }

  setItem(key: string, value: string) {
    this.store.set(key, value)
  }

  removeItem(key: string) {
    this.store.delete(key)
  }

  clear() {
    this.store.clear()
  }
}

const localStorage = new MemoryStorage()
Object.assign(globalThis, { localStorage })

async function loadTodoAtoms() {
  return import(`./todo-atoms.ts?test=${Date.now()}-${Math.random()}`)
}

function makeTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: overrides.id ?? "todo-1",
    title: overrides.title ?? "todo",
    completed: overrides.completed ?? false,
    deadline: overrides.deadline ?? null,
    importance: overrides.importance ?? 0,
    sortOrder: overrides.sortOrder ?? 0,
    notes: overrides.notes ?? "",
  }
}

test.beforeEach(() => {
  localStorage.clear()
})

test("missing sync state reads as defaults", () => {
  return loadTodoAtoms().then(({ readSupabaseSyncState }) => {
  assert.deepEqual(readSupabaseSyncState(), { baseVersion: null, dirty: false })
  })
})

test("mark dirty does nothing in local mode", async () => {
  const { markSupabaseSyncDirty, readSupabaseSyncState, writeSupabaseSyncState } = await loadTodoAtoms()
  localStorage.setItem(MODE_KEY, "local")
  writeSupabaseSyncState({ baseVersion: 3, dirty: false })

  markSupabaseSyncDirty()

  assert.deepEqual(readSupabaseSyncState(), { baseVersion: 3, dirty: false })
})

test("mark dirty sets dirty in supabase mode", async () => {
  const { markSupabaseSyncDirty, readSupabaseSyncState, writeSupabaseSyncState } = await loadTodoAtoms()
  localStorage.setItem(MODE_KEY, "supabase")
  writeSupabaseSyncState({ baseVersion: 3, dirty: false })

  markSupabaseSyncDirty()

  assert.deepEqual(readSupabaseSyncState(), { baseVersion: 3, dirty: true })
})

test("apply pull sets todos storage and sync state correctly", async () => {
  const { applySupabasePull, readSupabaseSyncState } = await loadTodoAtoms()
  const todos = [makeTodo({ id: "remote-1", title: "remote" })]

  applySupabasePull(todos, 7)

  assert.deepEqual(JSON.parse(localStorage.getItem(SUPABASE_KEY) ?? "[]"), todos)
  assert.deepEqual(readSupabaseSyncState(), { baseVersion: 7, dirty: false })
})

test("apply push sets sync state correctly", async () => {
  const { applySupabasePush, readSupabaseSyncState, writeSupabaseSyncState } = await loadTodoAtoms()
  writeSupabaseSyncState({ baseVersion: 2, dirty: true })

  applySupabasePush(5)

  assert.deepEqual(readSupabaseSyncState(), { baseVersion: 5, dirty: false })
})

test("todosAtom setter marks sync state dirty in supabase mode", async () => {
  const { modeAtom, readSupabaseSyncState, todosAtom, writeSupabaseSyncState } = await loadTodoAtoms()
  localStorage.setItem(MODE_KEY, "supabase")
  const store = createStore()
  store.set(modeAtom, "supabase")
  writeSupabaseSyncState({ baseVersion: 4, dirty: false })
  const todos = [makeTodo({ id: "supabase-1" })]

  store.set(todosAtom, todos)

  assert.deepEqual(JSON.parse(localStorage.getItem(SUPABASE_KEY) ?? "[]"), todos)
  assert.deepEqual(readSupabaseSyncState(), { baseVersion: 4, dirty: true })
})

test("todosAtom setter keeps local mode behavior intact", async () => {
  const { modeAtom, readSupabaseSyncState, todosAtom, writeSupabaseSyncState } = await loadTodoAtoms()
  localStorage.setItem(MODE_KEY, "local")
  const store = createStore()
  store.set(modeAtom, "local")
  writeSupabaseSyncState({ baseVersion: 9, dirty: false })
  const todos = [makeTodo({ id: "local-1" })]

  store.set(todosAtom, todos)

  assert.deepEqual(JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "[]"), todos)
  assert.equal(localStorage.getItem(SUPABASE_KEY), null)
  assert.deepEqual(readSupabaseSyncState(), { baseVersion: 9, dirty: false })
})

test("read sync state falls back to defaults for invalid data", async () => {
  const { readSupabaseSyncState } = await loadTodoAtoms()
  localStorage.setItem(SYNC_KEY, "not-json")

  assert.deepEqual(readSupabaseSyncState(), { baseVersion: null, dirty: false })
})

test("invalid stored mode falls back to local behavior", async () => {
  localStorage.setItem(MODE_KEY, "broken")
  const { modeAtom } = await loadTodoAtoms()
  const store = createStore()

  assert.equal(store.get(modeAtom), "local")
})
