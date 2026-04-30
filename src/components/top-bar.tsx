import { useState } from "react"
import { useAtom, useSetAtom } from "jotai"
import { Button } from "@/components/ui/button"
import { modeAtom, supabaseConfigAtom, todosAtom, switchMode, readSupabaseSyncState, applySupabasePull, applySupabasePush } from "@/atoms/todo-atoms"
import { createSupabaseClient, validateConnection, fetchRemoteTodos, fetchRemoteVersion, ensureRemoteVersion, replaceRemoteTodos } from "@/lib/supabase"
import { decideSyncAction } from "@/lib/sync"
import { CloudIcon, HardDriveIcon, PlugIcon, RefreshCwIcon, LogOutIcon, LoaderIcon } from "lucide-react"
import { ConnectDialog } from "@/components/connect-dialog"
import type { Todo } from "@/types/todo"

interface SyncConflictState {
  remoteVersion: number
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
      const { remoteVersion, remoteTodos } = await readRemoteSnapshot(client)
      const action = decideSyncAction({ ...readSupabaseSyncState(), remoteVersion })

      if (action === "noop") {
        alert("已是最新")
        return
      }

      if (action === "pull") {
        setTodos(remoteTodos)
        applySupabasePull(remoteTodos, remoteVersion)
        alert("已更新本地")
        return
      }

      if (action === "push") {
        const localTodos = fetchLocalSupabaseTodos()
        await replaceRemoteTodos(client, localTodos, remoteVersion, remoteVersion + 1)
        applySupabasePush(remoteVersion + 1)
        alert("已更新云端")
        return
      }

      setConflictState({ remoteVersion })
    } catch (e) {
      alert(`同步失败：${e instanceof Error ? e.message : "未知错误"}`)
    } finally {
      setLoading(null)
    }
  }

  const handleKeepLocal = async () => {
    if (!config || !conflictState) return
    const client = createSupabaseClient(config)

    setLoading("sync")
    try {
      const localTodos = fetchLocalSupabaseTodos()
      await replaceRemoteTodos(client, localTodos, conflictState.remoteVersion, conflictState.remoteVersion + 1)
      applySupabasePush(conflictState.remoteVersion + 1)
      setConflictState(null)
      alert("已更新云端")
    } catch (e) {
      alert(`同步失败：${e instanceof Error ? e.message : "未知错误"}`)
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
      const { remoteVersion, remoteTodos } = await readRemoteSnapshot(client)
      setTodos(remoteTodos)
      applySupabasePull(remoteTodos, remoteVersion)
      setConflictState(null)
      alert("已更新本地")
    } catch (e) {
      alert(`同步失败：${e instanceof Error ? e.message : "未知错误"}`)
    } finally {
      setLoading(null)
    }
  }

  const handleExit = () => {
    if (!confirm("确定退出 Supabase 模式？")) return
    const result = switchMode("local")
    setMode(result.mode)
    setTodos(result.todos)
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          {mode === "supabase" ? <CloudIcon className="size-3.5" /> : <HardDriveIcon className="size-3.5" />}
          {mode === "supabase" ? "Supabase" : "本地"}
        </span>
        <div className="flex items-center -mr-1.5">
          {mode === "local" ? (
            <Button variant="ghost" size="sm" onClick={openConnectDialog}>
              <PlugIcon className="size-3.5" />
              连接
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={handleSync} disabled={loading !== null}>
                {loading === "sync" ? <LoaderIcon className="size-3.5 animate-spin" /> : <RefreshCwIcon className="size-3.5" />}
                {loading === "sync" ? "同步中" : "同步"}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleExit} disabled={loading !== null}>
                <LogOutIcon className="size-3.5" />
                退出
              </Button>
            </>
          )}
        </div>
      </div>
      <ConnectDialog open={connectOpen} onOpenChange={setConnectOpen} onConnect={handleConnect} onDraft={handleDraft} loading={loading === "connect"} initialUrl={config?.url ?? ""} initialApiKey={config?.apiKey ?? ""} tableMissing={tableMissing} error={connectError} />
      {conflictState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-sm rounded-lg bg-white p-6 shadow-elevated" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-2 text-base font-medium">发现冲突</h2>
            <p className="text-sm text-muted-foreground">本地和云端都有更新，请选择要保留的版本。</p>
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setConflictState(null)} disabled={loading === "sync"}>
                取消
              </Button>
              <Button type="button" variant="outline" onClick={handleKeepRemote} disabled={loading === "sync"}>
                保留云端版本
              </Button>
              <Button type="button" onClick={handleKeepLocal} disabled={loading === "sync"}>
                保留本地版本
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
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
