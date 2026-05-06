import { useState, useCallback, useEffect, useRef } from "react"
import { Provider, useAtom } from "jotai"
import {
  DndContext,
  DragOverlay,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core"
import { arrayMove } from "@dnd-kit/sortable"
import { TodoInput } from "@/components/todo-input"
import { TodoList } from "@/components/todo-list"
import { TodoSidebar } from "@/components/todo-sidebar"
import { TopBar } from "@/components/top-bar"
import { Checkbox } from "@/components/ui/checkbox"
import { todosAtom } from "@/atoms/todo-atoms"
import { useLongPressSensors } from "@/lib/drag-sensors"
import { recalculateSortOrders } from "@/lib/sort-order-utils"
import type { Todo } from "@/types/todo"

function AppContent() {
  const [todos, setTodos] = useAtom(todosAtom)
  const [isDragging, setIsDragging] = useState(false)
  const [activeTodo, setActiveTodo] = useState<Todo | null>(null)
  const sensors = useLongPressSensors()
  const todosRef = useRef(todos)

  useEffect(() => {
    todosRef.current = todos
  }, [todos])

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const todo = todosRef.current.find((t) => t.id === event.active.id)
      setActiveTodo(todo ?? null)
      setIsDragging(true)
      document.body.style.touchAction = "none"
    },
    [],
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      setActiveTodo(null)
      setIsDragging(false)
      document.body.style.touchAction = ""

      if (!over) return

      const activeId = active.id as string
      const currentTodos = todosRef.current

      if (over.id === "input-drop-area") {
        const otherActiveTodos = currentTodos.filter(
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
      const activeTodo = currentTodos.find((t) => t.id === activeId)
      const overTodo = currentTodos.find((t) => t.id === overId)
      if (!activeTodo || !overTodo) return
      if (overTodo.completed) return

      const sameGroup = activeTodo.importance === overTodo.importance

      if (sameGroup) {
        const groupTodos = currentTodos
          .filter((t) => !t.completed && t.importance === activeTodo.importance)
          .sort((a, b) => a.sortOrder - b.sortOrder)
        const oldIndex = groupTodos.findIndex((t) => t.id === activeId)
        const newIndex = groupTodos.findIndex((t) => t.id === overId)
        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return

        const reordered = arrayMove(groupTodos, oldIndex, newIndex)
        const newOrders = recalculateSortOrders(reordered)
        setTodos((draft) => {
          for (const item of draft) {
            const newOrder = newOrders.get(item.id)
            if (newOrder !== undefined) {
              item.sortOrder = newOrder
            }
          }
        })
      } else {
        const targetImportance = overTodo.importance
        const targetGroupTodos = currentTodos
          .filter((t) => !t.completed && t.importance === targetImportance)
          .sort((a, b) => a.sortOrder - b.sortOrder)
        const overIndex = targetGroupTodos.findIndex((t) => t.id === overId)

        const overRect = over.rect
        const activeRect = active.rect.current.translated
        const insertAfter =
          overRect &&
          activeRect &&
          activeRect.top + activeRect.height / 2 > overRect.top + overRect.height / 2
        const insertIndex = insertAfter ? overIndex + 1 : overIndex

        const inserted = [...targetGroupTodos]
        inserted.splice(insertIndex, 0, { ...activeTodo, importance: targetImportance })
        const newTargetOrders = recalculateSortOrders(inserted)
        setTodos((draft) => {
          const item = draft.find((t) => t.id === activeId)
          if (item) {
            item.importance = targetImportance
            item.sortOrder = newTargetOrders.get(activeId) ?? 0
          }
          for (const d of draft) {
            const newOrder = newTargetOrders.get(d.id)
            if (newOrder !== undefined) {
              d.sortOrder = newOrder
            }
          }
        })

        const sourceImportance = activeTodo.importance
        const sourceGroup = currentTodos.filter(
          (t) =>
            !t.completed &&
            t.importance === sourceImportance &&
            t.id !== activeId,
        )
        if (sourceGroup.length > 0) {
          const newSourceOrders = recalculateSortOrders(sourceGroup)
          setTodos((draft) => {
            for (const item of draft) {
              const newOrder = newSourceOrders.get(item.id)
              if (newOrder !== undefined) {
                item.sortOrder = newOrder
              }
            }
          })
        }
      }
    },
    [setTodos],
  )

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setActiveTodo(null)
        setIsDragging(false)
        document.body.style.touchAction = ""
      }}
    >
      <div className="mx-auto flex h-screen max-w-2xl flex-col gap-2 px-4 pt-2 pb-4 sm:px-6 sm:pt-2 sm:pb-4">
        <TopBar />
        <TodoInput isDragging={isDragging} />
        <div className="flex-1 overflow-y-auto">
          <TodoList />
        </div>
        <TodoSidebar />
      </div>
      <DragOverlay>
        {activeTodo ? (
          <div className="flex items-center gap-3 rounded-md px-3 py-3.5 bg-white shadow-lg">
            <Checkbox checked={activeTodo.completed} />
            <span className="flex-1 text-sm leading-6">{activeTodo.title}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

function App() {
  return (
    <Provider>
      <AppContent />
    </Provider>
  )
}

export default App
