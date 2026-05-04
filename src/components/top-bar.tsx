import React, { useState } from "react"
import { useAtom, useSetAtom } from "jotai"
import { Button } from "@/components/ui/button"
import { modeAtom, supabaseConfigAtom, todosAtom, switchMode, readSupabaseSyncState, applySupabasePull, applySupabasePush } from "@/atoms/todo-atoms"
import { createSupabaseClient, validateConnection, fetchRemoteTodos, fetchRemoteVersion, ensureRemoteVersion, replaceRemoteTodos } from "@/lib/supabase"
import { decideSyncAction } from "@/lib/sync"
import { CloudIcon, HardDriveIcon, PlugIcon, RefreshCwIcon, LogOutIcon, LoaderIcon } from "lucide-react"
import { ConnectDialog } from "@/components/connect-dialog"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { UI } from "@/lib/ui"
import { notifySyncError, notifySyncResult, requestExitConfirm } from "./top-bar.helpers"
import type { Todo } from "@/types/todo"

interface SyncConflictState {
  remoteVersion: number
}

interface TopBarViewProps {
  mode: "local" | "supabase"
  config: { url: string; apiKey: string } | null
  connectOpen: boolean
  loading: string | null
  tableMissing: boolean
  connectError: string | null
  conflictState: SyncConflictState | null
  onOpenConnect: () => void
  onConnectOpenChange: (open: boolean) => void
  onConnect: (url: string, apiKey: string) => void
  onDraft: (url: string, apiKey: string) => void
  onSync: () => void
  onExit: () => void
  onCancelConflict: () => void
  onConflictOpenChange: (open: boolean) => void
  onKeepRemote: () => void
  onKeepLocal: () => void
}

export function TopBar() {
  const [mode, setMode] = useAtom(modeAtom)
  const [config, setConfig] = useAtom(supabaseConfigAtom)
  const setTodos = useSetAtom(todosAtom)
  const [connectOpen, setConnectOpen] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const [tableMissing, setTableMissing] = useState(false)
  const [connectError, setConnectError] = useState<string | null>(null)
  const [conflictState, setConflictState] = useState<SyncConflictState | null>(null)

  const openConnectDialog = () => {
    setTableMissing(false)
    setConnectError(null)
    setConnectOpen(true)
  }

  const handleDraft = (url: string, apiKey: string) => {
    if (url && apiKey) {
      setConfig({ url, apiKey })
    }
  }

  const handleConnect = async (url: string, apiKey: string) => {
    const newConfig = { url, apiKey }
    const client = createSupabaseClient(newConfig)
    setLoading("connect")
    setTableMissing(false)
    setConnectError(null)
    try {
      await UI.loading.showWhen(async () => {
        const { valid, tableMissing: missing } = await validateConnection(client)
        if (!valid) {
          if (missing) {
            setTableMissing(true)
          } else {
            setConnectError("无法完成同步设置，请检查 URL 和 API Key")
          }
          return
        }

        await ensureRemoteVersion(client)
        const { remoteVersion, remoteTodos } = await readRemoteSnapshot(client)
        const switched = switchMode("supabase", newConfig)
        setMode(switched.mode)
        setConfig(newConfig)
        setTodos(remoteTodos)
        applySupabasePull(remoteTodos, remoteVersion)
        setConnectOpen(false)
        UI.toast.success("连接成功")
      }, { text: "连接中" })
    } catch (e) {
      setConnectError(e instanceof Error ? e.message : "未知错误")
    } finally {
      setLoading(null)
    }
  }

  const handleSync = async () => {
    if (!config) return
    const client = createSupabaseClient(config)

    setLoading("sync")
    try {
      await UI.loading.showWhen(async () => {
        const { remoteVersion, remoteTodos } = await readRemoteSnapshot(client)
        const action = decideSyncAction({ ...readSupabaseSyncState(), remoteVersion })

        if (action === "noop") {
          notifySyncResult(UI, "noop")
          return
        }

        if (action === "pull") {
          setTodos(remoteTodos)
          applySupabasePull(remoteTodos, remoteVersion)
          notifySyncResult(UI, "pull")
          return
        }

        if (action === "push") {
          const localTodos = fetchLocalSupabaseTodos()
          await replaceRemoteTodos(client, localTodos, remoteVersion, remoteVersion + 1)
          applySupabasePush(remoteVersion + 1)
          notifySyncResult(UI, "push")
          return
        }

        setConflictState({ remoteVersion })
      }, { text: "同步中" })
    } catch (e) {
      notifySyncError(UI, e)
    } finally {
      setLoading(null)
    }
  }

  const handleKeepLocal = async () => {
    if (!config || !conflictState) return
    const client = createSupabaseClient(config)

    setLoading("sync")
    try {
      await UI.loading.showWhen(async () => {
        const localTodos = fetchLocalSupabaseTodos()
        await replaceRemoteTodos(client, localTodos, conflictState.remoteVersion, conflictState.remoteVersion + 1)
        applySupabasePush(conflictState.remoteVersion + 1)
        setConflictState(null)
        notifySyncResult(UI, "push")
      }, { text: "同步中" })
    } catch (e) {
      notifySyncError(UI, e)
    } finally {
      setLoading(null)
    }
  }

  const handleKeepRemote = async () => {
    if (!conflictState) return

    if (!config) return
    const client = createSupabaseClient(config)

    setLoading("sync")
    try {
      await UI.loading.showWhen(async () => {
        const { remoteVersion, remoteTodos } = await readRemoteSnapshot(client)
        setTodos(remoteTodos)
        applySupabasePull(remoteTodos, remoteVersion)
        setConflictState(null)
        notifySyncResult(UI, "pull")
      }, { text: "同步中" })
    } catch (e) {
      notifySyncError(UI, e)
    } finally {
      setLoading(null)
    }
  }

  const handleExit = async () => {
    if (!await requestExitConfirm(UI)) return
    const result = switchMode("local")
    setMode(result.mode)
    setTodos(result.todos)
  }

  return (
    <TopBarView
      mode={mode}
      config={config}
      connectOpen={connectOpen}
      loading={loading}
      tableMissing={tableMissing}
      connectError={connectError}
      conflictState={conflictState}
      onOpenConnect={openConnectDialog}
      onConnectOpenChange={setConnectOpen}
      onConnect={handleConnect}
      onDraft={handleDraft}
      onSync={handleSync}
      onExit={handleExit}
      onCancelConflict={() => setConflictState(null)}
      onConflictOpenChange={(open) => {
        if (!open && loading !== "sync") {
          setConflictState(null)
        }
      }}
      onKeepRemote={handleKeepRemote}
      onKeepLocal={handleKeepLocal}
    />
  )
}

export function TopBarView({ mode, config, connectOpen, loading, tableMissing, connectError, conflictState, onOpenConnect, onConnectOpenChange, onConnect, onDraft, onSync, onExit, onCancelConflict, onConflictOpenChange, onKeepRemote, onKeepLocal }: TopBarViewProps) {
  return (
    <React.Fragment>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          {mode === "supabase" ? <CloudIcon className="size-3.5" /> : <HardDriveIcon className="size-3.5" />}
          {mode === "supabase" ? "Supabase" : "本地"}
        </span>
        <div className="flex items-center -mr-1.5">
          {mode === "local" ? (
            <Button variant="ghost" size="sm" onClick={onOpenConnect}>
              <PlugIcon className="size-3.5" />
              连接
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={onSync} disabled={loading !== null}>
                {loading === "sync" ? <LoaderIcon className="size-3.5 animate-spin" /> : <RefreshCwIcon className="size-3.5" />}
                {loading === "sync" ? "同步中" : "同步"}
              </Button>
              <Button variant="ghost" size="sm" onClick={onExit} disabled={loading !== null}>
                <LogOutIcon className="size-3.5" />
                退出
              </Button>
            </>
          )}
        </div>
      </div>
      <ConnectDialog open={connectOpen} onOpenChange={onConnectOpenChange} onConnect={onConnect} onDraft={onDraft} loading={loading === "connect"} initialUrl={config?.url ?? ""} initialApiKey={config?.apiKey ?? ""} tableMissing={tableMissing} error={connectError} />
      <Dialog open={conflictState !== null} onOpenChange={onConflictOpenChange} disablePointerDismissal={loading === "sync"}>
        {conflictState ? (
          <DialogContent showCloseButton={false} className="max-w-sm">
            <DialogHeader>
              <DialogTitle>发现冲突</DialogTitle>
              <DialogDescription>本地和云端都有更新，请选择要保留的版本。</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onCancelConflict} disabled={loading === "sync"} autoFocus={loading !== "sync"}>
                取消
              </Button>
              <Button type="button" variant="outline" onClick={onKeepRemote} disabled={loading === "sync"}>
                保留云端版本
              </Button>
              <Button type="button" onClick={onKeepLocal} disabled={loading === "sync"}>
                保留本地版本
              </Button>
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>
    </React.Fragment>
  )
}

function fetchLocalSupabaseTodos(): Todo[] {
  const raw = localStorage.getItem("oh-my-todo-supabase")
  if (!raw) return []
  try {
    return JSON.parse(raw) as Todo[]
  } catch {
    return []
  }
}

async function readRemoteSnapshot(client: ReturnType<typeof createSupabaseClient>, retries = 3): Promise<{ remoteVersion: number; remoteTodos: Todo[] }> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const startVersion = await fetchRemoteVersion(client)
    const remoteTodos = await fetchRemoteTodos(client)
    const endVersion = await fetchRemoteVersion(client)

    if (startVersion === endVersion) {
      return { remoteVersion: endVersion, remoteTodos }
    }
  }

  throw new Error("无法获取稳定的云端快照")
}
