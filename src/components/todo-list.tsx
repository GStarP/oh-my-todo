import { useAtom, useSetAtom } from "jotai"
import { Checkbox } from "@/components/ui/checkbox"
import { todosAtom, selectedTodoIdAtom } from "@/atoms/todo-atoms"
import { cn } from "@/lib/utils"

export function TodoList() {
  const [todos] = useAtom(todosAtom)
  const [selectedId, setSelectedId] = useAtom(selectedTodoIdAtom)
  const setTodos = useSetAtom(todosAtom)

  if (todos.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground text-sm">
        No todos yet. Add one above!
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      {todos.map((todo) => (
        <div
          key={todo.id}
          onClick={() => setSelectedId(todo.id)}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 cursor-pointer transition-colors hover:bg-muted",
            selectedId === todo.id && "bg-muted"
          )}
        >
          <div
            onClick={(e) => e.stopPropagation()}
          >
            <Checkbox
              checked={todo.completed}
              onCheckedChange={() =>
                setTodos((draft) => {
                  const item = draft.find((t) => t.id === todo.id)
                  if (item) item.completed = !item.completed
                })
              }
            />
          </div>
          <span
            className={cn(
              "flex-1 text-sm",
              todo.completed && "line-through text-muted-foreground"
            )}
          >
            {todo.title}
          </span>
        </div>
      ))}
    </div>
  )
}
