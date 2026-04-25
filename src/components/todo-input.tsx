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
    const todo = { id: crypto.randomUUID(), title: trimmed, completed: false, deadline: null, importance: 0 }
    setTodos((draft) => {
      draft.push(todo)
    })
    setTitle("")
  }

  return (
    <form onSubmit={handleSubmit}>
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="添加待办"
        className="flex-1 bg-white border-white"
      />
    </form>
  )
}
