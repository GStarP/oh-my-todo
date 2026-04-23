import { useState, useEffect } from "react"
import { useAtom, useSetAtom } from "jotai"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
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
import { ChevronDownIcon, XIcon } from "lucide-react"
import { selectedTodoAtom, selectedTodoIdAtom, todosAtom } from "@/atoms/todo-atoms"
import { isDateOnly } from "@/lib/deadline"
import dayjs from "dayjs"

export function TodoSidebar() {
  const [selectedTodo] = useAtom(selectedTodoAtom)
  const [selectedId, setSelectedId] = useAtom(selectedTodoIdAtom)
  const setTodos = useSetAtom(todosAtom)

  const [editTitle, setEditTitle] = useState("")
  const [editDeadline, setEditDeadline] = useState<string | null>(null)
  const [calendarOpen, setCalendarOpen] = useState(false)

  useEffect(() => {
    if (selectedTodo) {
      setEditTitle(selectedTodo.title)
      setEditDeadline(selectedTodo.deadline)
    }
  }, [selectedTodo])

  const handleSave = () => {
    if (!selectedTodo) return
    const trimmed = editTitle.trim()
    if (!trimmed) return
    setTodos((draft) => {
      const item = draft.find((t) => t.id === selectedTodo.id)
      if (item) {
        item.title = trimmed
        item.deadline = editDeadline
      }
    })
  }

  const handleDelete = () => {
    if (!selectedTodo) return
    setTodos((draft) => {
      const index = draft.findIndex((t) => t.id === selectedTodo.id)
      if (index !== -1) draft.splice(index, 1)
    })
    setSelectedId(null)
  }

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return
    const prevTime = editDeadline && !isDateOnly(editDeadline)
      ? dayjs(editDeadline).format("HH:mm:ss")
      : "00:00:00"
    const newDeadline = dayjs(date).format("YYYY-MM-DD") + "T" + prevTime
    setEditDeadline(newDeadline)
    setCalendarOpen(false)
  }

  const handleTimeChange = (timeStr: string) => {
    if (!editDeadline) return
    if (!timeStr) {
      setEditDeadline(dayjs(editDeadline).startOf("day").format("YYYY-MM-DDTHH:mm:ss"))
      return
    }
    const newDeadline = dayjs(editDeadline).format("YYYY-MM-DD") + "T" + timeStr + ":00"
    setEditDeadline(newDeadline)
  }

  const handleClearDeadline = () => {
    setEditDeadline(null)
  }

  const open = selectedId !== null

  const deadlineDate = editDeadline ? new Date(editDeadline) : undefined
  const deadlineTime = editDeadline && !isDateOnly(editDeadline)
    ? dayjs(editDeadline).format("HH:mm:ss")
    : ""

  return (
    <Sheet open={open} onOpenChange={(v) => !v && setSelectedId(null)}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Edit Todo</SheetTitle>
          <SheetDescription>Modify or delete this todo.</SheetDescription>
        </SheetHeader>
        {selectedTodo && (
          <div className="flex flex-col gap-4 px-4">
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium">Title</Label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={handleSave}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium">Deadline</Label>
              <div className="flex gap-2">
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger render={<Button variant="outline" className="justify-between font-normal flex-1" />}>
                    {editDeadline ? dayjs(editDeadline).format("YYYY-MM-DD") : "Pick a date"}
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
                  placeholder="Time"
                />
                {editDeadline && (
                  <Button variant="ghost" size="icon" onClick={handleClearDeadline}>
                    <XIcon className="size-4" />
                  </Button>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium">Status</Label>
              <span className="text-sm text-muted-foreground">
                {selectedTodo.completed ? "Completed" : "Active"}
              </span>
            </div>
            <Button variant="destructive" onClick={handleDelete} className="mt-4">
              Delete
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
