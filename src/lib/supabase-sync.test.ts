import assert from "node:assert/strict"
import test from "node:test"
import type { SupabaseClient } from "@supabase/supabase-js"
import {
  CREATE_TODOS_SQL,
  buildTodoRows,
  ensureRemoteVersion,
  fetchRemoteTodos,
  fetchRemoteVersion,
  normalizeRemoteVersion,
  replaceRemoteTodos,
  uploadTodos,
  validateConnection,
} from "./supabase"
import type { Todo } from "../types/todo"

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

test("normalizeRemoteVersion returns 1 for null", () => {
  assert.equal(normalizeRemoteVersion(null), 1)
})

test("normalizeRemoteVersion keeps a valid numeric version", () => {
  assert.equal(normalizeRemoteVersion(7), 7)
})

test("buildTodoRows maps todo fields to remote row shape", () => {
  assert.deepEqual(
    buildTodoRows([
      makeTodo({
        id: "todo-42",
        title: "Ship sync",
        completed: true,
        deadline: "2026-05-01",
        importance: 3,
        sortOrder: 9,
        notes: "check remote",
      }),
    ]),
    [
      {
        id: "todo-42",
        title: "Ship sync",
        completed: true,
        deadline: "2026-05-01",
        importance: 3,
        sort_order: 9,
        notes: "check remote",
      },
    ]
  )
})

test("fetchRemoteVersion reads and normalizes the remote version row", async () => {
  const calls: Array<{ method: string; args: unknown[] }> = []
  const builder = {
    select(value: string) {
      calls.push({ method: "select", args: [value] })
      return this
    },
    eq(column: string, value: unknown) {
      calls.push({ method: "eq", args: [column, value] })
      return Promise.resolve({ data: { version: null }, error: null })
    },
  }
  const client = {
    from(table: string) {
      calls.push({ method: "from", args: [table] })
      return builder
    },
  } as unknown as SupabaseClient

  const version = await fetchRemoteVersion(client)

  assert.equal(version, 1)
  assert.deepEqual(calls, [
    { method: "from", args: ["todo_sync_meta"] },
    { method: "select", args: ["version"] },
    { method: "eq", args: ["id", 1] },
  ])
})

test("fetchRemoteTodos maps remote rows to todos", async () => {
  const calls: Array<{ method: string; args: unknown[] }> = []
  const orderBySort = {
    order(column: string, options: unknown) {
      calls.push({ method: "order", args: [column, options] })
      return Promise.resolve({
        data: [
          {
            id: "todo-7",
            title: "Remote todo",
            completed: 1,
            deadline: "2026-06-01",
            importance: "2",
            sort_order: "5",
            notes: "from remote",
          },
        ],
        error: null,
      })
    },
  }
  const orderByImportance = {
    order(column: string, options: unknown) {
      calls.push({ method: "order", args: [column, options] })
      return orderBySort
    },
  }
  const client = {
    from(table: string) {
      calls.push({ method: "from", args: [table] })
      return {
        select(value: string) {
          calls.push({ method: "select", args: [value] })
          return orderByImportance
        },
      }
    },
  } as unknown as SupabaseClient

  assert.deepEqual(await fetchRemoteTodos(client), [
    {
      id: "todo-7",
      title: "Remote todo",
      completed: true,
      deadline: "2026-06-01",
      importance: 2,
      sortOrder: 5,
      notes: "from remote",
    },
  ])
  assert.deepEqual(calls, [
    { method: "from", args: ["todos"] },
    { method: "select", args: ["*"] },
    { method: "order", args: ["importance", { ascending: true }] },
    { method: "order", args: ["sort_order", { ascending: true }] },
  ])
})

test("ensureRemoteVersion inserts the default row when missing", async () => {
  const calls: Array<{ method: string; args: unknown[] }> = []
  const metaTable = {
    select(value: string) {
      calls.push({ method: "select", args: [value] })
      return this
    },
    eq(column: string, value: unknown) {
      calls.push({ method: "eq", args: [column, value] })
      return Promise.resolve({ data: null, error: null })
    },
    upsert(value: unknown) {
      calls.push({ method: "upsert", args: [value] })
      return Promise.resolve({ error: null })
    },
  }
  const client = {
    from(table: string) {
      calls.push({ method: "from", args: [table] })
      assert.equal(table, "todo_sync_meta")
      return metaTable
    },
  } as unknown as SupabaseClient

  const version = await ensureRemoteVersion(client)

  assert.equal(version, 1)
  assert.deepEqual(calls, [
    { method: "from", args: ["todo_sync_meta"] },
    { method: "select", args: ["version"] },
    { method: "eq", args: ["id", 1] },
    { method: "from", args: ["todo_sync_meta"] },
    { method: "upsert", args: [[{ id: 1, version: 1 }]] },
  ])
})

test("validateConnection returns invalid for a generic error", async () => {
  const client = {
    from() {
      return {
        select() {
          return {
            limit() {
              return Promise.resolve({
                error: { message: "permission denied for table todos" },
              })
            },
          }
        },
      }
    },
  } as unknown as SupabaseClient

  assert.deepEqual(await validateConnection(client), {
    valid: false,
    tableMissing: false,
  })
})

test("validateConnection does not treat permission denied for relation as missing table", async () => {
  const client = {
    from() {
      return {
        select() {
          return {
            limit() {
              return Promise.resolve({
                error: { message: "permission denied for relation todos" },
              })
            },
          }
        },
      }
    },
  } as unknown as SupabaseClient

  assert.deepEqual(await validateConnection(client), {
    valid: false,
    tableMissing: false,
  })
})

test("validateConnection returns tableMissing for missing-table style errors", async () => {
  const client = {
    from() {
      return {
        select() {
          return {
            limit() {
              return Promise.resolve({
                error: { message: 'relation "public.todo_sync_meta" does not exist' },
              })
            },
          }
        },
      }
    },
  } as unknown as SupabaseClient

  assert.deepEqual(await validateConnection(client), {
    valid: false,
    tableMissing: true,
  })
})

test("validateConnection detects missing todo_sync_meta after todos succeeds", async () => {
  const tables: string[] = []
  const client = {
    from(table: string) {
      tables.push(table)
      return {
        select() {
          return {
            limit() {
              if (table === "todos") {
                return Promise.resolve({ error: null })
              }

              return Promise.resolve({
                error: { message: 'relation "public.todo_sync_meta" does not exist' },
              })
            },
          }
        },
      }
    },
  } as unknown as SupabaseClient

  assert.deepEqual(await validateConnection(client), {
    valid: false,
    tableMissing: true,
  })
  assert.deepEqual(tables, ["todos", "todo_sync_meta"])
})

test("validateConnection succeeds only when table checks and dry-run rpc succeed", async () => {
  const calls: string[] = []
  const client = {
    from(table: string) {
      calls.push(`from:${table}`)
      return {
        select() {
          return {
            limit() {
              calls.push(`limit:${table}`)
              return Promise.resolve({ error: null })
            },
          }
        },
      }
    },
    rpc(fn: string, args: Record<string, unknown>) {
      calls.push(`rpc:${fn}:${JSON.stringify(args)}`)
      return Promise.resolve({ error: null })
    },
  } as unknown as SupabaseClient

  assert.deepEqual(await validateConnection(client), {
    valid: true,
    tableMissing: false,
  })
  assert.deepEqual(calls, [
    "from:todos",
    "limit:todos",
    "from:todo_sync_meta",
    "limit:todo_sync_meta",
    'rpc:replace_todos_snapshot:{"expected_version":1,"next_version":1,"todo_rows":[],"dry_run":true}',
  ])
})

test("validateConnection returns tableMissing when dry-run rpc is missing", async () => {
  const client = {
    from() {
      return {
        select() {
          return {
            limit() {
              return Promise.resolve({ error: null })
            },
          }
        },
      }
    },
    rpc() {
      return Promise.resolve({
        error: { message: "Could not find the function public.replace_todos_snapshot" },
      })
    },
  } as unknown as SupabaseClient

  assert.deepEqual(await validateConnection(client), {
    valid: false,
    tableMissing: true,
  })
})

test("validateConnection returns invalid when dry-run rpc fails generically", async () => {
  const client = {
    from() {
      return {
        select() {
          return {
            limit() {
              return Promise.resolve({ error: null })
            },
          }
        },
      }
    },
    rpc() {
      return Promise.resolve({
        error: { message: "permission denied while executing function" },
      })
    },
  } as unknown as SupabaseClient

  assert.deepEqual(await validateConnection(client), {
    valid: false,
    tableMissing: false,
  })
})

test("replaceRemoteTodos sends expected version and next version to rpc", async () => {
  const calls: Array<{ fn: string; args: Record<string, unknown> }> = []
  const client = {
    rpc(fn: string, args: Record<string, unknown>) {
      calls.push({ fn, args })
      return Promise.resolve({ error: null })
    },
  } as unknown as SupabaseClient

  await replaceRemoteTodos(
    client,
    [makeTodo({ id: "todo-9", sortOrder: 4, notes: "synced" })],
    7,
    8
  )

  assert.deepEqual(calls, [
    {
      fn: "replace_todos_snapshot",
      args: {
        expected_version: 7,
        next_version: 8,
        todo_rows: [{ id: "todo-9", title: "todo", completed: false, deadline: null, importance: 0, sort_order: 4, notes: "synced" }],
        dry_run: false,
      },
    },
  ])
})

test("replaceRemoteTodos propagates version mismatch rpc failure", async () => {
  const client = {
    rpc() {
      return Promise.resolve({ error: new Error("version mismatch") })
    },
  } as unknown as SupabaseClient

  await assert.rejects(() => replaceRemoteTodos(client, [], 2, 3), /version mismatch/)
})

test("uploadTodos passes expected and next version to atomic rpc path", async () => {
  const calls: Array<{ method: string; args: unknown[] }> = []
  const metaTable = {
    select(value: string) {
      calls.push({ method: "select", args: [value] })
      return this
    },
    eq(column: string, value: unknown) {
      calls.push({ method: "eq", args: [column, value] })
      return Promise.resolve({ data: { version: 4 }, error: null })
    },
  }
  const client = {
    from(table: string) {
      calls.push({ method: "from", args: [table] })
      assert.equal(table, "todo_sync_meta")
      return metaTable
    },
    rpc(fn: string, args: Record<string, unknown>) {
      calls.push({ method: "rpc", args: [fn, args] })
      return Promise.resolve({ error: null })
    },
  } as unknown as SupabaseClient

  await uploadTodos(client, [makeTodo({ id: "todo-99", sortOrder: 6 })])

  assert.deepEqual(calls, [
    { method: "from", args: ["todo_sync_meta"] },
    { method: "select", args: ["version"] },
    { method: "eq", args: ["id", 1] },
    {
      method: "rpc",
      args: [
        "replace_todos_snapshot",
        {
          expected_version: 4,
          next_version: 5,
          todo_rows: [{ id: "todo-99", title: "todo", completed: false, deadline: null, importance: 0, sort_order: 6, notes: "" }],
          dry_run: false,
        },
      ],
    },
  ])
})

test("CREATE_TODOS_SQL is a full rebuild script with explicit drops", () => {
  assert.match(CREATE_TODOS_SQL, /^drop function if exists replace_todos_snapshot\(integer, integer, jsonb, boolean\);\s*drop table if exists todos;\s*drop table if exists todo_sync_meta;/i)
  assert.match(CREATE_TODOS_SQL, /create table todos/i)
  assert.match(CREATE_TODOS_SQL, /create table todo_sync_meta/i)
  assert.match(CREATE_TODOS_SQL, /create policy "Allow all" on todos/i)
  assert.match(CREATE_TODOS_SQL, /create policy "Allow all" on todo_sync_meta/i)
  assert.match(CREATE_TODOS_SQL, /insert into todo_sync_meta \(id, version\)\s*values \(1, 1\)/i)
  assert.match(CREATE_TODOS_SQL, /create function replace_todos_snapshot/i)
  assert.doesNotMatch(CREATE_TODOS_SQL, /if not exists/i)
  assert.doesNotMatch(CREATE_TODOS_SQL, /on conflict do nothing/i)
})

test("CREATE_TODOS_SQL handles dry_run before version mismatch guard", () => {
  const dryRunIndex = CREATE_TODOS_SQL.indexOf("if dry_run then")
  const mismatchIndex = CREATE_TODOS_SQL.indexOf("if current_version <> expected_version then")

  assert.notEqual(dryRunIndex, -1)
  assert.notEqual(mismatchIndex, -1)
  assert.ok(dryRunIndex < mismatchIndex)
})

test("CREATE_TODOS_SQL uses an explicit predicate for full snapshot delete", () => {
  assert.match(CREATE_TODOS_SQL, /delete from todos where id is not null;/i)
  assert.doesNotMatch(CREATE_TODOS_SQL, /delete from todos\s*;/i)
})
