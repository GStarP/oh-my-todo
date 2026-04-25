import { useState } from "react"
import { useAtom, useSetAtom } from "jotai"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ChevronDownIcon, XIcon, Trash2Icon } from "lucide-react"
import { selectedTodoAtom, selectedTodoIdAtom, todosAtom } from "@/atoms/todo-atoms"
import { isDateOnly } from "@/lib/deadline"
import dayjs from "dayjs"
import type { Todo } from "@/types/todo"

export function TodoSidebar() {
  const [selectedTodo] = useAtom(selectedTodoAtom)
  const [selectedId, setSelectedId] = useAtom(selectedTodoIdAtom)

  const open = selectedId !== null

  return (
    <Sheet open={open} onOpenChange={(v) => !v && setSelectedId(null)}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>编辑待办</SheetTitle>
        </SheetHeader>
        {selectedTodo && <TodoEditForm key={selectedTodo.id} todo={selectedTodo} />}
      </SheetContent>
    </Sheet>
  )
}

function TodoEditForm({ todo }: { todo: Todo }) {
  const setTodos = useSetAtom(todosAtom)
  const setSelectedId = useSetAtom(selectedTodoIdAtom)

  const [editTitle, setEditTitle] = useState(todo.title)
  const [editDeadline, setEditDeadline] = useState<string | null>(todo.deadline)
  const [calendarOpen, setCalendarOpen] = useState(false)

  const handleSave = () => {
    const trimmed = editTitle.trim()
    if (!trimmed) return
    setTodos((draft) => {
      const item = draft.find((t) => t.id === todo.id)
      if (item) {
        item.title = trimmed
        item.deadline = editDeadline
      }
    })
  }

  const handleDelete = () => {
    setTodos((draft) => {
      const index = draft.findIndex((t) => t.id === todo.id)
      if (index !== -1) draft.splice(index, 1)
    })
    setSelectedId(null)
  }

  const saveDeadline = (deadline: string | null) => {
    setEditDeadline(deadline)
    setTodos((draft) => {
      const item = draft.find((t) => t.id === todo.id)
      if (item) item.deadline = deadline
    })
  }

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return
    const prevTime = editDeadline && !isDateOnly(editDeadline)
      ? dayjs(editDeadline).format("HH:mm:ss")
      : "00:00:00"
    const newDeadline = dayjs(date).format("YYYY-MM-DD") + "T" + prevTime
    saveDeadline(newDeadline)
    setCalendarOpen(false)
  }

  const handleTimeChange = (timeStr: string) => {
    if (!editDeadline) return
    if (!timeStr) {
      saveDeadline(dayjs(editDeadline).startOf("day").format("YYYY-MM-DDTHH:mm:ss"))
      return
    }
    const newDeadline = dayjs(editDeadline).format("YYYY-MM-DD") + "T" + timeStr + ":00"
    saveDeadline(newDeadline)
  }

  const handleClearDeadline = () => {
    saveDeadline(null)
  }

  const handleImportanceChange = (value: string) => {
    const num = value === "" ? 0 : Math.max(0, parseInt(value, 10) || 0)
    setTodos((draft) => {
      const item = draft.find((t) => t.id === todo.id)
      if (item) item.importance = num
    })
  }

  const deadlineDate = editDeadline ? new Date(editDeadline) : undefined
  const deadlineTime = editDeadline && !isDateOnly(editDeadline)
    ? dayjs(editDeadline).format("HH:mm:ss")
    : ""

  return (
    <div className="flex flex-col gap-5 px-5">
      <div className="flex flex-col gap-2">
        <Label>标题</Label>
        <Input
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>重要度</Label>
        <Input
          type="number"
          min={0}
          value={todo.importance}
          onChange={(e) => handleImportanceChange(e.target.value)}
          className="w-24"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>截止时间</Label>
        <div className="flex gap-2">
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger render={<Button variant="outline" className="justify-between font-normal flex-1" />}>
              {editDeadline ? dayjs(editDeadline).format("YYYY-MM-DD") : "选择日期"}
              <ChevronDownIcon />
            </PopoverTrigger>
            <PopoverContent className="w-auto overflow-hidden p-0" align="start">
              <Calendar
                mode="single"
                selected={deadlineDate}
                onSelect={handleDateSelect}
              />
            </PopoverContent>
          </Popover>
          <Input
            type="time"
            step="1"
            disabled={!editDeadline}
            value={deadlineTime}
            onChange={(e) => handleTimeChange(e.target.value)}
            className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none w-32"
          />
          {editDeadline && (
            <Button variant="ghost" size="icon-sm" onClick={handleClearDeadline}>
              <XIcon className="size-4" />
            </Button>
          )}
        </div>
      </div>
      <Button variant="destructive" onClick={handleDelete} className="mt-4 gap-2">
        <Trash2Icon className="size-4" />
        删除
      </Button>
    </div>
  )
}
