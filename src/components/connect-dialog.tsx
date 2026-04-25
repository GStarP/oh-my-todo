import { useState } from "react"
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
  const [url, setUrl] = useState(initialUrl)
  const [apiKey, setApiKey] = useState(initialApiKey)
  const [copied, setCopied] = useState(false)

  if (!open) return null

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => !loading && onOpenChange(false)}>
      <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-elevated" onClick={(e) => e.stopPropagation()}>
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
            <Label>API Key</Label>
            <Input
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sb_publishable_..."
              disabled={loading}
              onBlur={handleBlur}
            />
          </div>
          {tableMissing && (
            <div className="flex flex-col gap-2 rounded-md bg-red-50 px-3 py-2.5 text-sm">
              <p className="text-red-600">todos 表不存在，请先在 Supabase SQL Editor 中执行以下 SQL：</p>
              <pre className="overflow-x-auto whitespace-pre rounded bg-white p-2 text-xs text-foreground">{CREATE_TODOS_SQL}</pre>
              <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
                {copied ? "已复制" : "复制"}
              </Button>
            </div>
          )}
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
  )
}
