import assert from "node:assert/strict"
import test from "node:test"
import { isValidElement, type ReactNode } from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

function createStorage() {
  const store = new Map<string, string>()

  return {
    getItem(key: string) {
      return store.get(key) ?? null
    },
    setItem(key: string, value: string) {
      store.set(key, value)
    },
    removeItem(key: string) {
      store.delete(key)
    },
    clear() {
      store.clear()
    },
  }
}

async function loadTodoSidebarModule() {
  Object.defineProperty(globalThis, "localStorage", {
    value: createStorage(),
    configurable: true,
  })

  Object.defineProperty(globalThis, "React", {
    value: await import("react"),
    configurable: true,
  })

  return import("./todo-sidebar")
}

async function loadTodoSidebarHelpersModule() {
  return import("./todo-sidebar.helpers")
}

type ElementRecord = { type: unknown; props: Record<string, unknown> }

function collectElements(node: ReactNode, result: ElementRecord[] = []) {
  if (node === null || node === undefined || typeof node === "boolean") return result

  if (Array.isArray(node)) {
    for (const child of node) collectElements(child, result)
    return result
  }

  if (!isValidElement(node)) return result

  const props = node.props as Record<string, unknown>
  result.push({ type: node.type, props })
  collectElements(props.children as ReactNode, result)
  return result
}

function getNodeText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return ""
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(getNodeText).join("")
  if (!isValidElement(node)) return ""
  return getNodeText((node.props as Record<string, unknown>).children as ReactNode)
}

function createTodoEditFormViewProps(overrides: Record<string, unknown> = {}) {
  return {
    editTitle: "测试待办",
    editNotes: "备注",
    editDeadline: "2026-04-30T09:00:00",
    calendarOpen: false,
    deadlineDate: new Date("2026-04-30T09:00:00"),
    deadlineTime: "09:00:00",
    importance: 2,
    onTitleChange: () => {},
    onTitleBlur: () => {},
    onTitleKeyDown: () => {},
    onNotesChange: () => {},
    onNotesBlur: () => {},
    notesRef: () => {},
    onCalendarOpenChange: () => {},
    onDateSelect: () => {},
    onTimeChange: () => {},
    onClearDeadline: () => {},
    onImportanceChange: () => {},
    onDelete: () => {},
    ...overrides,
  }
}

test("TodoEditFormView renders deadline above importance", async () => {
  const { TodoEditFormView } = await loadTodoSidebarModule()

  const tree = TodoEditFormView(createTodoEditFormViewProps())
  const elements = collectElements(tree)
  const labels = elements.filter((element) => element.type === Label)
  const labelTexts = labels.map((element) => getNodeText(element.props.children as ReactNode))

  assert.deepEqual(labelTexts, ["标题", "备注", "截止时间", "重要度"])

  const inputs = elements.filter((element) => element.type === Input)
  assert.equal(inputs[1]?.props.type, "time")
  assert.equal(inputs[2]?.props.type, "number")

  const dateText = elements.map((element) => getNodeText(element.props.children as ReactNode)).find((text) => text.includes("2026-04-30"))
  assert.match(dateText ?? "", /2026-04-30/)
})

test("createNotesTextareaRef stores the ref and resizes mount-time notes", async () => {
  const { createNotesTextareaRef } = await loadTodoSidebarHelpersModule()
  const notesRef = { current: null as HTMLTextAreaElement | null }
  const textarea = {
    style: { height: "12px" },
    scrollHeight: 84,
  } as HTMLTextAreaElement

  createNotesTextareaRef(notesRef)(textarea)

  assert.equal(notesRef.current, textarea)
  assert.equal(textarea.style.height, "84px")
})
