import { useState } from "react"
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
import { buildTodoGroups } from "@/lib/todo-groups"
import { ChevronRightIcon } from "lucide-react"

export function TodoList() {
  const [todos] = useAtom(todosAtom)
  const [selectedId, setSelectedId] = useAtom(selectedTodoIdAtom)
  const setTodos = useSetAtom(todosAtom)
  const groups = buildTodoGroups(todos)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})

  if (todos.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground text-sm">
        No todos yet. Add one above!
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {groups.map((group) => (
        <Collapsible
          key={group.key}
          open={openGroups[group.key] ?? group.defaultOpen}
          onOpenChange={(open) => {
            setOpenGroups((current) => ({ ...current, [group.key]: open }))
          }}
        >
          <CollapsibleTrigger className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
            <ChevronRightIcon
              className={cn(
                "size-4 transition-transform",
                (openGroups[group.key] ?? group.defaultOpen) && "rotate-90"
              )}
            />
            <span>{group.label}</span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="flex flex-col gap-1 mt-1">
              {group.todos.map((todo) => {
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
