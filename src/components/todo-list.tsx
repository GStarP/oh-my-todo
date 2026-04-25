import { useState } from "react"
import { useAtom } from "jotai"
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { todosAtom, selectedTodoIdAtom } from "@/atoms/todo-atoms"
import { cn } from "@/lib/utils"
import { buildTodoGroups } from "@/lib/todo-groups"
import { SortableTodoItem } from "@/components/sortable-todo-item"
import { ChevronRightIcon } from "lucide-react"

export function TodoList() {
  const [todos] = useAtom(todosAtom)
  const [selectedId] = useAtom(selectedTodoIdAtom)
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
                (openGroups[group.key] ?? group.defaultOpen) && "rotate-90",
              )}
            />
            <span>{group.label}</span>
            <span className="ml-auto tabular-nums">{group.todos.length}</span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SortableContext
              items={group.todos.map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-col gap-1 mt-0.5">
                {group.todos.map((todo) => (
                  <SortableTodoItem
                    key={todo.id}
                    todo={todo}
                    selectedId={selectedId}
                  />
                ))}
              </div>
            </SortableContext>
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  )
}
