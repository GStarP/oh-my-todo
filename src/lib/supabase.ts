import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { Todo } from "@/types/todo"

export interface SupabaseConfig {
  url: string
  apiKey: string
}

export function createSupabaseClient(config: SupabaseConfig): SupabaseClient {
  return createClient(config.url, config.apiKey)
}

export interface ValidateResult {
  valid: boolean
  tableMissing: boolean
}

function isMissingTableError(error: { message?: string; code?: string } | null): boolean {
  const msg = (error?.message ?? "").toLowerCase()
  const code = error?.code ?? ""
  return msg.includes("does not exist") || msg.includes("not found") || msg.includes("relation") && msg.includes("does not exist") || msg.includes("schema cache") || code === "PGRST205"
}

function isMissingFunctionError(error: { message?: string; code?: string } | null): boolean {
  const msg = (error?.message ?? "").toLowerCase()
  const code = error?.code ?? ""
  return msg.includes("could not find the function") || msg.includes("function") && msg.includes("does not exist") || code === "42883"
}

export async function validateConnection(client: SupabaseClient): Promise<ValidateResult> {
  const todosResult = await client.from("todos").select("id").limit(1)
  if (todosResult.error) {
    return { valid: false, tableMissing: isMissingTableError(todosResult.error) }
  }

  const metaResult = await client.from("todo_sync_meta").select("id").limit(1)
  if (metaResult.error) {
    return { valid: false, tableMissing: isMissingTableError(metaResult.error) }
  }

  const rpcResult = await client.rpc("replace_todos_snapshot", {
    expected_version: 1,
    next_version: 1,
    todo_rows: [],
    dry_run: true,
  })
  if (rpcResult.error) {
    return { valid: false, tableMissing: isMissingFunctionError(rpcResult.error) }
  }

  return { valid: true, tableMissing: false }
}

export const CREATE_TODOS_SQL = `drop function if exists replace_todos_snapshot(integer, integer, jsonb, boolean);
drop table if exists todos;
drop table if exists todo_sync_meta;

create table todos (
  id text primary key,
  title text not null,
  completed boolean not null default false,
  deadline text,
  importance integer not null default 0,
  sort_order integer not null default 0,
  notes text not null default ''
);

create table todo_sync_meta (
  id integer primary key,
  version integer not null default 1
);

alter table todos enable row level security;
alter table todo_sync_meta enable row level security;

create policy "Allow all" on todos for all using (true) with check (true);
create policy "Allow all" on todo_sync_meta for all using (true) with check (true);

insert into todo_sync_meta (id, version)
values (1, 1);

create function replace_todos_snapshot(expected_version integer, next_version integer, todo_rows jsonb, dry_run boolean default false)
returns void
language plpgsql
as $$
declare
  current_version integer;
begin
  if dry_run then
    return;
  end if;

  select version into current_version
  from todo_sync_meta
  where id = 1;

  if current_version <> expected_version then
    raise exception 'version mismatch';
  end if;

  delete from todos where id is not null;

  insert into todos (id, title, completed, deadline, importance, sort_order, notes)
  select
    row->>'id',
    row->>'title',
    coalesce((row->>'completed')::boolean, false),
    nullif(row->>'deadline', ''),
    coalesce((row->>'importance')::integer, 0),
    coalesce((row->>'sort_order')::integer, 0),
    coalesce(row->>'notes', '')
  from jsonb_array_elements(coalesce(todo_rows, '[]'::jsonb)) as row;

  update todo_sync_meta
  set version = next_version
  where id = 1;
end;
$$;`

export function normalizeRemoteVersion(version: unknown): number {
  const normalized = Number(version)
  return Number.isInteger(normalized) && normalized >= 1 ? normalized : 1
}

export function buildTodoRows(todos: Todo[]) {
  return todos.map((todo) => ({
    id: todo.id,
    title: todo.title,
    completed: todo.completed,
    deadline: todo.deadline,
    importance: todo.importance,
    sort_order: todo.sortOrder,
    notes: todo.notes,
  }))
}

export async function fetchRemoteTodos(client: SupabaseClient): Promise<Todo[]> {
  const { data, error } = await client.from("todos").select("*").order("importance", { ascending: true }).order("sort_order", { ascending: true })
  if (error) throw error
  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id),
    title: String(row.title),
    completed: Boolean(row.completed),
    deadline: row.deadline ? String(row.deadline) : null,
    importance: Number(row.importance ?? 0),
    sortOrder: Number(row.sort_order ?? 0),
    notes: String(row.notes ?? ""),
  }))
}

export async function fetchRemoteVersion(client: SupabaseClient): Promise<number> {
  const { data, error } = await client.from("todo_sync_meta").select("version").eq("id", 1)
  if (error) throw error
  const row = Array.isArray(data) ? data[0] : data
  return normalizeRemoteVersion((row as { version?: unknown } | null)?.version)
}

export async function ensureRemoteVersion(client: SupabaseClient): Promise<number> {
  const { data, error } = await client.from("todo_sync_meta").select("version").eq("id", 1)
  if (error) throw error

  const row = Array.isArray(data) ? data[0] : data
  if (row) {
    return normalizeRemoteVersion((row as { version?: unknown }).version)
  }

  const { error: upsertError } = await client.from("todo_sync_meta").upsert([{ id: 1, version: 1 }])
  if (upsertError) throw upsertError
  return 1
}

export async function replaceRemoteTodos(client: SupabaseClient, todos: Todo[], expectedVersion: number, nextVersion: number): Promise<void> {
  const { error } = await client.rpc("replace_todos_snapshot", {
    expected_version: expectedVersion,
    next_version: nextVersion,
    todo_rows: buildTodoRows(todos),
    dry_run: false,
  })
  if (error) throw error
}

export async function uploadTodos(client: SupabaseClient, todos: Todo[]): Promise<void> {
  const currentVersion = await ensureRemoteVersion(client)
  await replaceRemoteTodos(client, todos, currentVersion, currentVersion + 1)
}
