import { useLayoutEffect, useRef, useState } from "react"
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
import { UI } from "@/lib/ui"
import { isDateOnly } from "@/lib/deadline"
import { resizeNotesTextarea } from "./todo-sidebar.helpers"
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

export function TodoEditForm({ todo }: { todo: Todo }) {
  const setTodos = useSetAtom(todosAtom)
  const setSelectedId = useSetAtom(selectedTodoIdAtom)
  const notesRef = useRef<HTMLTextAreaElement | null>(null)

  const [editTitle, setEditTitle] = useState(todo.title)
  const [editNotes, setEditNotes] = useState(todo.notes)
  const [editDeadline, setEditDeadline] = useState<string | null>(todo.deadline)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const handleNotesRef = (textarea: HTMLTextAreaElement | null) => {
    notesRef.current = textarea
    if (textarea) resizeNotesTextarea(textarea)
  }

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

  const handleNotesBlur = () => {
    setTodos((draft) => {
      const item = draft.find((t) => t.id === todo.id)
      if (item) item.notes = editNotes
    })
  }

  const handleNotesInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditNotes(e.target.value)
    resizeNotesTextarea(e.target)
  }

  useLayoutEffect(() => {
    if (notesRef.current) resizeNotesTextarea(notesRef.current)
  }, [editNotes])

  const handleDelete = async () => {
    const confirmed = await UI.confirm({
      title: "删除待办",
      description: `确定要删除「${todo.title}」吗？`,
      confirmText: "删除",
      cancelText: "取消",
    })
    if (!confirmed) return
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
    <TodoEditFormView
      editTitle={editTitle}
      editNotes={editNotes}
      editDeadline={editDeadline}
      calendarOpen={calendarOpen}
      deadlineDate={deadlineDate}
      deadlineTime={deadlineTime}
      importance={todo.importance}
      onTitleChange={(e) => setEditTitle(e.target.value)}
      onTitleBlur={handleSave}
      onTitleKeyDown={(e) => e.key === "Enter" && handleSave()}
      onNotesChange={handleNotesInput}
      onNotesBlur={handleNotesBlur}
      notesRef={handleNotesRef}
      onCalendarOpenChange={setCalendarOpen}
      onDateSelect={handleDateSelect}
      onTimeChange={(e) => handleTimeChange(e.target.value)}
      onClearDeadline={handleClearDeadline}
      onImportanceChange={(e) => handleImportanceChange(e.target.value)}
      onDelete={handleDelete}
    />
  )
}

interface TodoEditFormViewProps {
  editTitle: string
  editNotes: string
  editDeadline: string | null
  calendarOpen: boolean
  deadlineDate: Date | undefined
  deadlineTime: string
  importance: number
  onTitleChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onTitleBlur: () => void
  onTitleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  onNotesChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  onNotesBlur: () => void
  notesRef: (textarea: HTMLTextAreaElement | null) => void
  onCalendarOpenChange: (open: boolean) => void
  onDateSelect: (date: Date | undefined) => void
  onTimeChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onClearDeadline: () => void
  onImportanceChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onDelete: () => void
}

export function TodoEditFormView({
  editTitle,
  editNotes,
  editDeadline,
  calendarOpen,
  deadlineDate,
  deadlineTime,
  importance,
  onTitleChange,
  onTitleBlur,
  onTitleKeyDown,
  onNotesChange,
  onNotesBlur,
  notesRef,
  onCalendarOpenChange,
  onDateSelect,
  onTimeChange,
  onClearDeadline,
  onImportanceChange,
  onDelete,
}: TodoEditFormViewProps) {
  return (
    <div className="flex flex-col gap-5 px-5">
      <div className="flex flex-col gap-2">
        <Label>标题</Label>
        <Input
          value={editTitle}
          onChange={onTitleChange}
          onBlur={onTitleBlur}
          onKeyDown={onTitleKeyDown}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>备注</Label>
        <textarea
          ref={notesRef}
          value={editNotes}
          onChange={onNotesChange}
          onBlur={onNotesBlur}
          placeholder="添加备注"
          rows={2}
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm leading-6 transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 resize-none overflow-hidden"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>截止时间</Label>
        <div className="flex gap-2">
          <Popover open={calendarOpen} onOpenChange={onCalendarOpenChange}>
            <PopoverTrigger render={<Button variant="outline" className="justify-between font-normal flex-1 bg-transparent" />}>
              {editDeadline ? dayjs(editDeadline).format("YYYY-MM-DD") : "选择日期"}
              <ChevronDownIcon />
            </PopoverTrigger>
            <PopoverContent className="w-auto overflow-hidden p-0" align="start">
              <Calendar
                mode="single"
                selected={deadlineDate}
                onSelect={onDateSelect}
              />
            </PopoverContent>
          </Popover>
          <Input
            type="time"
            step="1"
            disabled={!editDeadline}
            value={deadlineTime}
            onChange={onTimeChange}
            className="appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none w-32"
          />
          {editDeadline && (
            <Button variant="ghost" size="icon-sm" onClick={onClearDeadline}>
              <XIcon className="size-4" />
            </Button>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label>重要度</Label>
        <Input
          type="number"
          min={0}
          value={importance}
          onChange={onImportanceChange}
          className="w-24"
        />
      </div>
      <Button variant="destructive" onClick={onDelete} className="mt-4 gap-2">
        <Trash2Icon className="size-4" />
        删除
      </Button>
    </div>
  )
}
