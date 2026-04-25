import { useState, useEffect, useRef } from "react"
import { useAtom, useSetAtom } from "jotai"
import { Button } from "@/components/ui/button"
import { modeAtom, supabaseConfigAtom, todosAtom, switchMode, loadSupabaseTodos } from "@/atoms/todo-atoms"
import { createSupabaseClient, validateConnection, fetchRemoteTodos, uploadTodos } from "@/lib/supabase"
import { CloudIcon, HardDriveIcon, PlugIcon, UploadIcon, DownloadIcon, LogOutIcon, LoaderIcon } from "lucide-react"
import { ConnectDialog } from "@/components/connect-dialog"
import type { Todo } from "@/types/todo"

export function TopBar() {
  const [mode, setMode] = useAtom(modeAtom)
  const [config, setConfig] = useAtom(supabaseConfigAtom)
  const setTodos = useSetAtom(todosAtom)
  const [connectOpen, setConnectOpen] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const [tableMissing, setTableMissing] = useState(false)
  const [connectError, setConnectError] = useState<string | null>(null)
  const initialSyncDone = useRef(false)

  useEffect(() => {
    if (mode !== "supabase" || !config || initialSyncDone.current) return
    initialSyncDone.current = true
    const client = createSupabaseClient(config)
    setLoading("download")
    fetchRemoteTodos(client)
      .then((remoteTodos) => {
        loadSupabaseTodos(remoteTodos)
        setTodos(remoteTodos)
      })
      .catch(() => {})
      .finally(() => setLoading(null))
  }, [])

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
          setConnectError("无法访问 todos 表，请检查 URL 和 API Key")
        }
        return
      }
      const remoteTodos = await fetchRemoteTodos(client)
      const switched = switchMode("supabase", newConfig)
      setMode(switched.mode)
      setConfig(newConfig)
      loadSupabaseTodos(remoteTodos)
      setTodos(remoteTodos)
      setConnectOpen(false)
    } catch (e) {
      setConnectError(e instanceof Error ? e.message : "未知错误")
    } finally {
      setLoading(null)
    }
  }

  const handleUpload = async () => {
    if (!config) return
    if (!confirm("上传将用本地数据覆盖云端数据，确定吗？")) return
    const client = createSupabaseClient(config)
    setLoading("upload")
    try {
      const todos = fetchLocalSupabaseTodos()
      await uploadTodos(client, todos)
      alert("上传成功")
    } catch (e) {
      alert(`上传失败：${e instanceof Error ? e.message : "未知错误"}`)
    } finally {
      setLoading(null)
    }
  }

  const handleDownload = async () => {
    if (!config) return
    if (!confirm("下载将用云端数据覆盖本地数据，确定吗？")) return
    const client = createSupabaseClient(config)
    setLoading("download")
    try {
      const remoteTodos = await fetchRemoteTodos(client)
      loadSupabaseTodos(remoteTodos)
      setTodos(remoteTodos)
      alert("下载成功")
    } catch (e) {
      alert(`下载失败：${e instanceof Error ? e.message : "未知错误"}`)
    } finally {
      setLoading(null)
    }
  }

  const handleExit = () => {
    if (!confirm("确定退出 Supabase 模式？")) return
    const result = switchMode("local")
    setMode(result.mode)
    setConfig(null)
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
            <Button variant="ghost" size="sm" onClick={() => setConnectOpen(true)}>
              <PlugIcon className="size-3.5" />
              连接
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={handleUpload} disabled={loading !== null}>
                {loading === "upload" ? <LoaderIcon className="size-3.5 animate-spin" /> : <UploadIcon className="size-3.5" />}
                上传
              </Button>
              <Button variant="ghost" size="sm" onClick={handleDownload} disabled={loading !== null}>
                {loading === "download" ? <LoaderIcon className="size-3.5 animate-spin" /> : <DownloadIcon className="size-3.5" />}
                下载
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={handleExit}>
                <LogOutIcon className="size-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>
      <ConnectDialog open={connectOpen} onOpenChange={setConnectOpen} onConnect={handleConnect} onDraft={handleDraft} loading={loading === "connect"} initialUrl={config?.url ?? ""} initialApiKey={config?.apiKey ?? ""} tableMissing={tableMissing} error={connectError} />
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
