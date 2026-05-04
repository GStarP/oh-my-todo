import type { ToastItem } from "@/lib/ui"

export function syncToastTimers(
  toasts: ToastItem[],
  timers: Map<string, number>,
  schedule: (toastId: string, duration: number) => number,
  clear: (timerId: number) => void
) {
  const activeToastIds = new Set(toasts.map((toast) => toast.id))

  for (const toast of toasts) {
    if (timers.has(toast.id)) {
      continue
    }

    timers.set(toast.id, schedule(toast.id, toast.duration))
  }

  for (const [toastId, timeoutId] of timers) {
    if (activeToastIds.has(toastId)) {
      continue
    }

    clear(timeoutId)
    timers.delete(toastId)
  }
}
