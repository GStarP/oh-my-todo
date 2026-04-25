import { useState } from "react"
import { useAtom, useSetAtom } from "jotai"
import { Button } from "@/components/ui/button"
import { modeAtom, supabaseConfigAtom, todosAtom, switchMode, loadSupabaseTodos } from "@/atoms/todo-atoms"
import { createSupabaseClient, validateConnection, fetchRemoteTodos, uploadTodos } from "@/lib/supabase"
import { UploadIcon, DownloadIcon, LogOutIcon, LinkIcon } from "lucide-react"
import { ConnectDialog } from "@/components/connect-dialog"
import type { Todo } from "@/types/todo"

export function TopBar() {
  const [mode, setMode] = useAtom(modeAtom)
  const [config, setConfig] = useAtom(supabaseConfigAtom)
  const setTodos = useSetAtom(todosAtom)
  const [connectOpen, setConnectOpen] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)

  const handleConnect = async (url: string, anonKey: string) => {
    const newConfig = { url, anonKey }
    const client = createSupabaseClient(newConfig)
    setLoading("connect")
    try {
      const valid = await validateConnection(client)
      if (!valid) {
        alert("连接失败：无法访问 todos 表，请检查 URL、Anon Key 和表是否存在")
        return
      }
      const remoteTodos = await fetchRemoteTodos(client)
      const result = switchMode("supabase", newConfig)
      setMode(result.mode)
      setConfig(newConfig)
      loadSupabaseTodos(remoteTodos)
      setTodos(remoteTodos)
      setConnectOpen(false)
    } catch (e) {
      alert(`连接失败：${e instanceof Error ? e.message : "未知错误"}`)
    } finally {
      setLoading(null)
    }
  }

  const handleUpload = async () => {
    if (!config) return
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
    const result = switchMode("local")
    setMode(result.mode)
    setConfig(null)
    setTodos(result.todos)
  }

  return (
    <>
      <div className="flex items-center justify-between rounded-lg bg-white px-4 py-2.5">
        <span className="text-sm font-medium">
          {mode === "supabase" ? "☁️ Supabase 模式" : "📁 本地模式"}
        </span>
        <div className="flex items-center gap-2">
          {mode === "local" ? (
            <Button variant="outline" size="sm" onClick={() => setConnectOpen(true)}>
              <LinkIcon className="size-3.5" />
              连接
            </Button>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={handleUpload} disabled={loading !== null}>
                {loading === "upload" ? "..." : <UploadIcon className="size-3.5" />}
                上传
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload} disabled={loading !== null}>
                {loading === "download" ? "..." : <DownloadIcon className="size-3.5" />}
                下载
              </Button>
              <Button variant="ghost" size="sm" onClick={handleExit}>
                <LogOutIcon className="size-3.5" />
                退出
              </Button>
            </>
          )}
        </div>
      </div>
      <ConnectDialog open={connectOpen} onOpenChange={setConnectOpen} onConnect={handleConnect} loading={loading === "connect"} />
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
