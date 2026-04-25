import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { Todo } from "@/types/todo"

export interface SupabaseConfig {
  url: string
  anonKey: string
}

export function createSupabaseClient(config: SupabaseConfig): SupabaseClient {
  return createClient(config.url, config.anonKey)
}

export async function validateConnection(client: SupabaseClient): Promise<boolean> {
  const { error } = await client.from("todos").select("id").limit(1)
  return !error
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
