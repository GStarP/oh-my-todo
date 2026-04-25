import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface ConnectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConnect: (url: string, anonKey: string) => void
  loading: boolean
}

export function ConnectDialog({ open, onOpenChange, onConnect, loading }: ConnectDialogProps) {
  const [url, setUrl] = useState("")
  const [anonKey, setAnonKey] = useState("")

  if (!open) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedUrl = url.trim()
    const trimmedKey = anonKey.trim()
    if (!trimmedUrl || !trimmedKey) return
    onConnect(trimmedUrl, trimmedKey)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => !loading && onOpenChange(false)}>
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-elevated" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base font-medium mb-4">连接 Supabase</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Project URL</Label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://xxx.supabase.co"
              disabled={loading}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Anon Key</Label>
            <Input
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              placeholder="eyJhbGciOi..."
              disabled={loading}
            />
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              取消
            </Button>
            <Button type="submit" disabled={loading || !url.trim() || !anonKey.trim()}>
              {loading ? "连接中..." : "连接"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
