import { useState, useEffect } from "react"
import { useAtom, useSetAtom } from "jotai"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { selectedTodoAtom, selectedTodoIdAtom, todosAtom } from "@/atoms/todo-atoms"

export function TodoSidebar() {
  const [selectedTodo] = useAtom(selectedTodoAtom)
  const [selectedId, setSelectedId] = useAtom(selectedTodoIdAtom)
  const setTodos = useSetAtom(todosAtom)

  const [editTitle, setEditTitle] = useState("")

  useEffect(() => {
    if (selectedTodo) {
      setEditTitle(selectedTodo.title)
    }
  }, [selectedTodo])

  const handleSave = () => {
    if (!selectedTodo) return
    const trimmed = editTitle.trim()
    if (!trimmed) return
    setTodos((draft) => {
      const item = draft.find((t) => t.id === selectedTodo.id)
      if (item) item.title = trimmed
    })
  }

  const handleDelete = () => {
    if (!selectedTodo) return
    setTodos((draft) => {
      const index = draft.findIndex((t) => t.id === selectedTodo.id)
      if (index !== -1) draft.splice(index, 1)
    })
    setSelectedId(null)
  }

  const open = selectedId !== null

  return (
    <Sheet open={open} onOpenChange={(v) => !v && setSelectedId(null)}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Edit Todo</SheetTitle>
          <SheetDescription>Modify or delete this todo.</SheetDescription>
        </SheetHeader>
        {selectedTodo && (
          <div className="flex flex-col gap-4 px-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={handleSave}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Status</label>
              <span className="text-sm text-muted-foreground">
                {selectedTodo.completed ? "Completed" : "Active"}
              </span>
            </div>
            <Button variant="destructive" onClick={handleDelete} className="mt-4">
              Delete
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
