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
import { ChevronRightIcon, ClockIcon } from "lucide-react"

const urgencyBg: Record<string, string> = {
  expired: "bg-red-100",
  urgent: "bg-orange-100",
}

export function TodoList() {
  const [todos] = useAtom(todosAtom)
  const [selectedId, setSelectedId] = useAtom(selectedTodoIdAtom)
  const setTodos = useSetAtom(todosAtom)
  const groups = buildTodoGroups(todos)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})

  if (todos.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-white/60">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </div>
        <p className="text-sm">还没有待办事项，添加一个吧</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <Collapsible
          key={group.key}
          open={openGroups[group.key] ?? group.defaultOpen}
          onOpenChange={(open) => {
            setOpenGroups((current) => ({ ...current, [group.key]: open }))
          }}
        >
          <CollapsibleTrigger className="flex items-center gap-2 w-full px-1 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
            <ChevronRightIcon
              className={cn(
                "size-3.5 transition-transform",
                (openGroups[group.key] ?? group.defaultOpen) && "rotate-90"
              )}
            />
            <span>{group.label}</span>
            <span className="ml-auto tabular-nums">{group.todos.length}</span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="flex flex-col gap-1 mt-0.5">
              {group.todos.map((todo) => {
                const info = getDeadlineInfo(todo.deadline, todo.completed)
                return (
                  <div
                    key={todo.id}
                    onClick={() => setSelectedId(todo.id)}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2.5 cursor-pointer transition-all bg-white",
                      selectedId === todo.id && "shadow-subtle outline outline-1 outline-primary/20",
                      !todo.completed && info?.urgency && urgencyBg[info.urgency],
                      todo.completed && "bg-white/70"
                    )}
                  >
                    <div onClick={(e) => e.stopPropagation()}>
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
                        "flex-1 text-sm leading-6",
                        todo.completed && "line-through text-muted-foreground"
                      )}
                    >
                      {todo.title}
                    </span>
                    {info.text && (
                      <span
                        className={cn(
                          "flex items-center gap-1 text-xs whitespace-nowrap tabular-nums",
                          info.urgency === "expired" ? "text-red-500" : "text-muted-foreground"
                        )}
                      >
                        <ClockIcon className="size-3" />
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
