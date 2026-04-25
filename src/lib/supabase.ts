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

export async function validateConnection(client: SupabaseClient): Promise<ValidateResult> {
  const { error } = await client.from("todos").select("id").limit(1)
  if (!error) return { valid: true, tableMissing: false }
  const msg = (error.message ?? "").toLowerCase()
  const code = (error as { code?: string }).code ?? ""
  const tableMissing = msg.includes("does not exist") || msg.includes("not found") || msg.includes("relation") || msg.includes("schema cache") || code === "PGRST205"
  return { valid: !tableMissing, tableMissing }
}

export const CREATE_TODOS_SQL = `create table todos (
  id text primary key,
  title text not null,
  completed boolean not null default false,
  deadline text,
  importance integer not null default 0,
  sort_order integer not null default 0,
  notes text not null default ''
);

alter table todos enable row level security;

create policy "Allow all" on todos for all using (true) with check (true);`

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

export async function uploadTodos(client: SupabaseClient, todos: Todo[]): Promise<void> {
  const { error: deleteError } = await client.from("todos").delete().neq("id", "impossible-placeholder-to-delete-all")
  if (deleteError) throw deleteError
  if (todos.length === 0) return
  const rows = todos.map((t) => ({
    id: t.id,
    title: t.title,
    completed: t.completed,
    deadline: t.deadline,
    importance: t.importance,
    sort_order: t.sortOrder,
    notes: t.notes,
  }))
  const { error: insertError } = await client.from("todos").insert(rows)
  if (insertError) throw insertError
}
