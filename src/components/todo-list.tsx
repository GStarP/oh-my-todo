import { useState, useCallback } from "react"
import { useAtom } from "jotai"
import {
  DndContext,
  DragOverlay,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core"
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
import { getInsertSortOrder, recalculateSortOrders } from "@/lib/sort-order-utils"
import { SortableTodoItem } from "@/components/sortable-todo-item"
import { useLongPressSensor } from "@/lib/drag-sensors"
import { ChevronRightIcon } from "lucide-react"
import type { Todo } from "@/types/todo"

export function TodoList({
  onDragStateChange,
}: {
  isDragging: boolean
  onDragStateChange: (dragging: boolean) => void
}) {
  const [todos, setTodos] = useAtom(todosAtom)
  const [selectedId] = useAtom(selectedTodoIdAtom)
  const groups = buildTodoGroups(todos)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
  const [activeTodo, setActiveTodo] = useState<Todo | null>(null)
  const sensor = useLongPressSensor()

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const todo = todos.find((t) => t.id === event.active.id)
      setActiveTodo(todo ?? null)
      onDragStateChange(true)
    },
    [todos, onDragStateChange],
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      setActiveTodo(null)
      onDragStateChange(false)

      if (!over) return

      const activeId = active.id as string

      if (over.id === "input-drop-area") {
        const otherActiveTodos = todos.filter(
          (t) => !t.completed && t.id !== activeId,
        )
        const maxImportance =
          otherActiveTodos.length > 0
            ? Math.max(...otherActiveTodos.map((t) => t.importance))
            : -1
        const newImportance = maxImportance + 1
        const targetGroupTodos = otherActiveTodos.filter(
          (t) => t.importance === newImportance,
        )
        const newSortOrder =
          targetGroupTodos.length > 0
            ? Math.max(...targetGroupTodos.map((t) => t.sortOrder)) + 100
            : 0

        setTodos((draft) => {
          const item = draft.find((t) => t.id === activeId)
          if (item) {
            item.importance = newImportance
            item.sortOrder = newSortOrder
          }
        })
        return
      }

      const overId = over.id as string
      const activeTodo = todos.find((t) => t.id === activeId)
      const overTodo = todos.find((t) => t.id === overId)
      if (!activeTodo || !overTodo) return
      if (overTodo.completed) return

      const sameGroup = activeTodo.importance === overTodo.importance
      const targetImportance = overTodo.importance

      if (sameGroup) {
        const groupTodos = todos
          .filter(
            (t) =>
              !t.completed && t.importance === targetImportance && t.id !== activeId,
          )
          .sort((a, b) => a.sortOrder - b.sortOrder)
        const overIndex = groupTodos.findIndex((t) => t.id === overId)
        const insertSortOrder = getInsertSortOrder(groupTodos, overIndex)

        setTodos((draft) => {
          const item = draft.find((t) => t.id === activeId)
          if (item) {
            item.sortOrder = insertSortOrder
          }
        })

        const updatedGroupTodos = [
          ...todos.filter(
            (t) =>
              !t.completed && t.importance === targetImportance && t.id !== activeId,
          ),
          { ...activeTodo, sortOrder: insertSortOrder },
        ]
        const sortedUpdated = [...updatedGroupTodos].sort(
          (a, b) => a.sortOrder - b.sortOrder,
        )
        const minGap = sortedUpdated.slice(1).reduce((min, t, i) => {
          const gap = t.sortOrder - sortedUpdated[i].sortOrder
          return gap < min ? gap : min
        }, Infinity)
        if (minGap < 2) {
          const newOrders = recalculateSortOrders(updatedGroupTodos)
          setTodos((draft) => {
            for (const item of draft) {
              const newOrder = newOrders.get(item.id)
              if (newOrder !== undefined) {
                item.sortOrder = newOrder
              }
            }
          })
        }
      } else {
        const targetGroupTodos = todos
          .filter(
            (t) => !t.completed && t.importance === targetImportance,
          )
          .sort((a, b) => a.sortOrder - b.sortOrder)
        const overIndex = targetGroupTodos.findIndex((t) => t.id === overId)
        const insertSortOrder = getInsertSortOrder(targetGroupTodos, overIndex)

        setTodos((draft) => {
          const item = draft.find((t) => t.id === activeId)
          if (item) {
            item.importance = targetImportance
            item.sortOrder = insertSortOrder
          }
        })

        const updatedTargetGroup = [
          ...targetGroupTodos,
          { ...activeTodo, importance: targetImportance, sortOrder: insertSortOrder },
        ]
        const sortedTarget = [...updatedTargetGroup].sort(
          (a, b) => a.sortOrder - b.sortOrder,
        )
        const targetMinGap = sortedTarget.slice(1).reduce((min, t, i) => {
          const gap = t.sortOrder - sortedTarget[i].sortOrder
          return gap < min ? gap : min
        }, Infinity)
        if (targetMinGap < 2) {
          const newOrders = recalculateSortOrders(updatedTargetGroup)
          setTodos((draft) => {
            for (const item of draft) {
              const newOrder = newOrders.get(item.id)
              if (newOrder !== undefined) {
                item.sortOrder = newOrder
              }
            }
          })
        }

        const sourceImportance = activeTodo.importance
        const sourceGroup = todos.filter(
          (t) =>
            !t.completed &&
            t.importance === sourceImportance &&
            t.id !== activeId,
        )
        if (sourceGroup.length > 0) {
          const newOrders = recalculateSortOrders(sourceGroup)
          setTodos((draft) => {
            for (const item of draft) {
              const newOrder = newOrders.get(item.id)
              if (newOrder !== undefined) {
                item.sortOrder = newOrder
              }
            }
          })
        }
      }
    },
    [todos, setTodos, onDragStateChange],
  )

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
    <DndContext
      sensors={[sensor]}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
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
      <DragOverlay>
        {activeTodo ? (
          <div className="flex items-center gap-3 rounded-md px-3 py-2.5 bg-white shadow-lg">
            <span className="flex-1 text-sm leading-6">{activeTodo.title}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
