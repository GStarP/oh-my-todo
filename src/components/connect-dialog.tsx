import { useState } from "react"
import { CheckIcon, CopyIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CREATE_TODOS_SQL } from "@/lib/supabase"

interface ConnectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConnect: (url: string, apiKey: string) => void
  onDraft?: (url: string, apiKey: string) => void
  loading: boolean
  initialUrl?: string
  initialApiKey?: string
  tableMissing?: boolean
  error?: string | null
}

export function ConnectDialog({ open, onOpenChange, onConnect, onDraft, loading, initialUrl = "", initialApiKey = "", tableMissing = false, error = null }: ConnectDialogProps) {
  if (!open) return null

  return (
    <ConnectDialogForm
      onOpenChange={onOpenChange}
      onConnect={onConnect}
      onDraft={onDraft}
      loading={loading}
      initialUrl={initialUrl}
      initialApiKey={initialApiKey}
      tableMissing={tableMissing}
      error={error}
    />
  )
}

function ConnectDialogForm({ onOpenChange, onConnect, onDraft, loading, initialUrl = "", initialApiKey = "", tableMissing = false, error = null }: Omit<ConnectDialogProps, "open">) {
  const [url, setUrl] = useState(initialUrl)
  const [apiKey, setApiKey] = useState(initialApiKey)
  const [copied, setCopied] = useState(false)

  const handleBlur = () => {
    if (onDraft) onDraft(url.trim(), apiKey.trim())
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedUrl = url.trim()
    const trimmedKey = apiKey.trim()
    if (!trimmedUrl || !trimmedKey) return
    onConnect(trimmedUrl, trimmedKey)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(CREATE_TODOS_SQL).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 px-4 py-4" onClick={() => !loading && onOpenChange(false)}>
      <div className="flex min-h-full items-center justify-center">
        <div className="w-full max-w-md max-h-[calc(100vh-2rem)] overflow-y-auto rounded-lg bg-white p-6 shadow-elevated" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base font-medium mb-4">连接 Supabase</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Project URL</Label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://xxx.supabase.co"
              disabled={loading}
              onBlur={handleBlur}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Anon Key</Label>
            <Input
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sb_publishable_..."
              disabled={loading}
              onBlur={handleBlur}
            />
          </div>
          <div className={`flex flex-col gap-2 rounded-md px-3 py-2.5 text-sm ${tableMissing ? "bg-red-50" : "bg-muted/40"}`}>
            <p className={tableMissing ? "text-red-600" : "text-muted-foreground"}>
              {tableMissing ? "缺少同步所需的 Supabase 表和函数，请先在 SQL Editor 中执行以下 SQL：" : "首次同步前，请先在 Supabase 的 SQL Editor 中执行以下 SQL。"}
            </p>
            <div className="relative">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className={`absolute top-2 right-2 z-10 h-7 w-7 bg-white/90 ${copied ? "border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-50" : ""}`}
                onClick={handleCopy}
                aria-label={copied ? "SQL 已复制到剪贴板" : "复制 SQL 到剪贴板"}
                title={copied ? "SQL 已复制到剪贴板" : "复制 SQL 到剪贴板"}
              >
                {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
              </Button>
              <pre className="max-h-24 overflow-x-auto overflow-y-auto whitespace-pre rounded bg-white p-2 pr-10 text-xs text-foreground">{CREATE_TODOS_SQL}</pre>
            </div>
          </div>
          {error && !tableMissing && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          <div className="flex justify-end gap-2 mt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              取消
            </Button>
            <Button type="submit" disabled={loading || !url.trim() || !apiKey.trim()}>
              {loading ? "连接中..." : "连接"}
            </Button>
          </div>
        </form>
        </div>
      </div>
    </div>
  )
}
