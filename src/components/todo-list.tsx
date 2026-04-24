import { useAtom, useSetAtom } from "jotai"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { todosAtom, selectedTodoIdAtom } from "@/atoms/todo-atoms"
import { cn } from "@/lib/utils"
import { getDeadlineInfo } from "@/lib/deadline"
import { ChevronRightIcon } from "lucide-react"
import type { Todo } from "@/types/todo"

function groupByImportance(todos: Todo[]): Map<number, Todo[]> {
  const groups = new Map<number, Todo[]>()
  for (const todo of todos) {
    const key = todo.importance
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(todo)
  }
  return new Map(
    [...groups.entries()].sort((a, b) => b[0] - a[0])
  )
}

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

  const groups = groupByImportance(todos)

  return (
    <div className="flex flex-col gap-2">
      {[...groups.entries()].map(([importance, items]) => (
        <Collapsible key={importance} defaultOpen>
          <CollapsibleTrigger className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors group">
            <ChevronRightIcon className="size-4 transition-transform group-data-[state=open]:rotate-90" />
            <span>重要度 {importance}</span>
            <span className="text-xs text-muted-foreground/60">{items.length}</span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="flex flex-col gap-1 mt-1">
              {items.map((todo) => {
                const info = getDeadlineInfo(todo.deadline, todo.completed)
                return (
                  <div
                    key={todo.id}
                    onClick={() => setSelectedId(todo.id)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 cursor-pointer transition-colors hover:bg-muted",
                      selectedId === todo.id && "bg-muted",
                      info?.urgency === "expired" && "border-l-2 border-l-red-500",
                      info?.urgency === "urgent" && "border-l-2 border-l-orange-500",
                      info?.urgency === "remind" && "border-l-2 border-l-yellow-400"
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
                    {info.text && (
                      <span
                        className={cn(
                          "text-xs whitespace-nowrap",
                          info.urgency === "expired" && "text-red-500",
                          info.urgency !== "expired" && "text-muted-foreground"
                        )}
                      >
                        {info.text}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  )
}
