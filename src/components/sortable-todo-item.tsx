import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Checkbox } from "@/components/ui/checkbox";
import { useSetAtom } from "jotai";
import { todosAtom, selectedTodoIdAtom } from "@/atoms/todo-atoms";
import { cn } from "@/lib/utils";
import { getDeadlineInfo } from "@/lib/deadline";
import { ClockIcon, BookTextIcon } from "lucide-react";
import type { Todo } from "@/types/todo";

const urgencyBg: Record<string, string> = {
  expired: "bg-gray-100",
  urgent: "bg-red-100",
  remind: "bg-orange-100",
};

export function SortableTodoItem({
  todo,
  selectedId,
}: {
  todo: Todo;
  selectedId: string | null;
}) {
  const setTodos = useSetAtom(todosAtom);
  const setSelectedId = useSetAtom(selectedTodoIdAtom);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: todo.id,
    disabled: todo.completed,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    touchAction: "none",
  };

  const info = getDeadlineInfo(todo.deadline, todo.completed);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => setSelectedId(todo.id)}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-3.5 cursor-pointer transition-all bg-white border",
        selectedId === todo.id && "shadow-subtle outline outline-1 outline-primary/20",
        !todo.completed && info?.urgency && urgencyBg[info.urgency],
        todo.completed && "bg-white/70",
        isDragging && "invisible",
      )}
    >
      <div onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={todo.completed}
          onCheckedChange={() =>
            setTodos((draft) => {
              const item = draft.find((t) => t.id === todo.id);
              if (item) item.completed = !item.completed;
            })
          }
        />
      </div>
      <div className="flex items-center gap-1.5 flex-1">
        <span
          className={cn(
            "text-sm leading-6",
            todo.completed && "line-through text-muted-foreground",
          )}
        >
          {todo.title}
        </span>
        {todo.notes && (
          <BookTextIcon className="size-3.5 text-muted-foreground shrink-0" />
        )}
      </div>
      {info.text && (
        <span
          className={cn(
            "flex items-center gap-1 text-xs whitespace-nowrap tabular-nums",
            info.urgency === "urgent"
              ? "text-red-500"
              : "text-muted-foreground",
          )}
        >
          <ClockIcon className="size-3" />
          {info.text}
        </span>
      )}
    </div>
  );
}
