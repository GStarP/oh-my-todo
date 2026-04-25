import { useDroppable } from "@dnd-kit/core"
import { cn } from "@/lib/utils"

export function DroppableInputArea({ isDragging }: { isDragging: boolean }) {
  const { isOver, setNodeRef } = useDroppable({
    id: "input-drop-area",
    disabled: !isDragging,
  })

  if (!isDragging) return null

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex items-center justify-center rounded-md px-3 py-2.5 border-2 border-dashed transition-colors",
        isOver ? "border-primary bg-primary/10 text-primary" : "border-muted-foreground/30 bg-muted/50 text-muted-foreground",
      )}
    >
      <span className="text-sm">高优先级</span>
    </div>
  )
}
