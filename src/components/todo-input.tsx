import { useState } from "react"
import { Input } from "@/components/ui/input"
import { useSetAtom } from "jotai"
import { todosAtom } from "@/atoms/todo-atoms"

export function TodoInput() {
  const [title, setTitle] = useState("")
  const setTodos = useSetAtom(todosAtom)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return
    const todo = { id: crypto.randomUUID(), title: trimmed, completed: false, deadline: null }
    setTodos((draft) => {
      draft.push(todo)
    })
    setTitle("")
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Add a new todo..."
        className="flex-1"
      />
    </form>
  )
}
