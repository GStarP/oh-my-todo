import assert from "node:assert/strict"
import test from "node:test"
import { isValidElement, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { ConnectDialog } from "@/components/connect-dialog"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"

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

async function loadTopBarModule() {
  Object.defineProperty(globalThis, "localStorage", {
    value: createStorage(),
    configurable: true,
  })

  return import("./top-bar")
}

async function loadTopBarHelpersModule() {
  return import("./top-bar.helpers")
}

function collectElements(node: ReactNode, result: Array<{ type: unknown; props: Record<string, unknown> }> = []) {
  if (node === null || node === undefined || typeof node === "boolean") return result

  if (Array.isArray(node)) {
    for (const child of node) {
      collectElements(child, result)
    }
    return result
  }

  if (!isValidElement(node)) {
    return result
  }

  const props = node.props as Record<string, unknown>

  result.push({
    type: node.type,
    props,
  })

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

function createViewProps(overrides: Record<string, unknown> = {}) {
  return {
    mode: "supabase" as const,
    config: { url: "https://demo.supabase.co", apiKey: "key" },
    loading: null,
    connectOpen: false,
    tableMissing: false,
    connectError: null,
    conflictState: null,
    onOpenConnect: () => {},
    onConnectOpenChange: () => {},
    onConnect: async () => {},
    onDraft: () => {},
    onSync: async () => {},
    onExit: async () => {},
    onCancelConflict: () => {},
    onConflictOpenChange: () => {},
    onKeepRemote: async () => {},
    onKeepLocal: async () => {},
    ...overrides,
  }
}

test("notifySyncResult maps sync outcomes to the expected toast types", async () => {
  const { notifySyncResult } = await loadTopBarHelpersModule()
  const calls: Array<{ type: string; message: string }> = []
  const ui = {
    toast: {
      info(message: string) {
        calls.push({ type: "info", message })
      },
      success(message: string) {
        calls.push({ type: "success", message })
      },
      error() {
        throw new Error("unexpected error toast")
      },
    },
  }

  notifySyncResult(ui, "noop")
  notifySyncResult(ui, "pull")
  notifySyncResult(ui, "push")

  assert.deepEqual(calls, [
    { type: "info", message: "已是最新" },
    { type: "success", message: "已更新本地" },
    { type: "success", message: "已更新云端" },
  ])
})

test("notifySyncError formats sync failures with UI.toast.error", async () => {
  const { notifySyncError } = await loadTopBarHelpersModule()
  const calls: string[] = []
  const ui = {
    toast: {
      info() {
        throw new Error("unexpected info toast")
      },
      success() {
        throw new Error("unexpected success toast")
      },
      error(message: string) {
        calls.push(message)
      },
    },
  }

  notifySyncError(ui, new Error("网络异常"))
  notifySyncError(ui, null)

  assert.deepEqual(calls, ["同步失败：网络异常", "同步失败：未知错误"])
})

test("runWithTopBarLoading hides the matching loading token on success and failure", async () => {
  const { runWithTopBarLoading } = await loadTopBarHelpersModule()
  const events: string[] = []
  const ui = {
    loading: {
      async showWhen<T>(task: () => Promise<T>, { text }: { text: string }) {
        events.push(`show:${text}`)
        try {
          return await task()
        } finally {
          events.push(`hide:${text}`)
        }
      },
    },
  }

  const result = await runWithTopBarLoading(ui, "同步中", async () => {
    events.push("task:success")
    return 1
  })

  assert.equal(result, 1)

  await assert.rejects(
    () => runWithTopBarLoading(ui, "连接中", async () => {
      events.push("task:failure")
      throw new Error("boom")
    }),
    /boom/
  )

  assert.deepEqual(events, [
    "show:同步中",
    "task:success",
    "hide:同步中",
    "show:连接中",
    "task:failure",
    "hide:连接中",
  ])
})

test("requestExitConfirm uses the global confirm UI", async () => {
  const { requestExitConfirm } = await loadTopBarHelpersModule()
  const calls: Array<Record<string, string | undefined>> = []
  const ui = {
    confirm(options: Record<string, string | undefined>) {
      calls.push(options)
      return Promise.resolve(true)
    },
  }

  assert.equal(await requestExitConfirm(ui), true)
  assert.deepEqual(calls, [
    {
      title: "退出 Supabase 模式",
      description: "确定退出 Supabase 模式？",
      confirmText: "退出",
      cancelText: "取消",
    },
  ])
})

test("TopBarView shows sync loading state and disables sync actions", async () => {
  const { TopBarView } = await loadTopBarModule()

  const tree = TopBarView(createViewProps({ loading: "sync" }))
  const buttons = collectElements(tree).filter((element) => element.type === Button)

  const syncButton = buttons.find((element) => getNodeText(element.props.children as ReactNode).includes("同步中"))
  const exitButton = buttons.find((element) => getNodeText(element.props.children as ReactNode).includes("退出"))

  assert.equal(syncButton?.props.disabled, true)
  assert.equal(exitButton?.props.disabled, true)
  assert.match(getNodeText(syncButton?.props.children as ReactNode), /同步中/)
})

test("TopBarView renders conflict dialog semantics and disables actions while syncing", async () => {
  const { TopBarView } = await loadTopBarModule()

  const tree = TopBarView(createViewProps({ loading: "sync", conflictState: { remoteVersion: 2 } }))
  const elements = collectElements(tree)
  const dialogRoot = elements.find((element) => element.type === Dialog)
  const dialogContent = elements.find((element) => element.type === DialogContent)
  const title = elements.find((element) => element.type === DialogTitle)
  const description = elements.find((element) => element.type === DialogDescription)
  const buttons = elements.filter((element) => element.type === Button)

  assert.equal(dialogRoot?.props.open, true)
  assert.equal(typeof dialogRoot?.props.onOpenChange, "function")
  assert.ok(dialogContent)
  assert.equal(getNodeText(title?.props.children as ReactNode), "发现冲突")
  assert.equal(getNodeText(description?.props.children as ReactNode), "本地和云端都有更新，请选择要保留的版本。")

  const cancelButton = buttons.find((element) => getNodeText(element.props.children as ReactNode).includes("取消"))
  const keepRemoteButton = buttons.find((element) => getNodeText(element.props.children as ReactNode).includes("保留云端版本"))
  const keepLocalButton = buttons.find((element) => getNodeText(element.props.children as ReactNode).includes("保留本地版本"))
  assert.equal(cancelButton?.props.disabled, true)
  assert.equal(keepRemoteButton?.props.disabled, true)
  assert.equal(keepLocalButton?.props.disabled, true)
})

test("TopBarView forwards connect loading state into ConnectDialog", async () => {
  const { TopBarView } = await loadTopBarModule()

  const tree = TopBarView(createViewProps({ mode: "local", connectOpen: true, loading: "connect" }))
  const elements = collectElements(tree)
  const dialog = elements.find((element) => element.type === ConnectDialog)

  assert.equal(dialog?.props.open, true)
  assert.equal(dialog?.props.loading, true)
})

test("TopBarView exposes conflict dialog keyboard dismissal and focus target", async () => {
  const { TopBarView } = await loadTopBarModule()

  const tree = TopBarView(createViewProps({ conflictState: { remoteVersion: 2 } }))
  const elements = collectElements(tree)
  const dialogRoot = elements.find((element) => element.type === Dialog)
  const cancelButton = elements.find((element) => element.type === Button && getNodeText(element.props.children as ReactNode).includes("取消"))

  assert.equal(typeof dialogRoot?.props.onOpenChange, "function")
  assert.equal(cancelButton?.props.autoFocus, true)
  assert.ok(cancelButton)
})
