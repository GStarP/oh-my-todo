import type { ConfirmOptions } from "@/lib/ui"

interface TopBarLoadingUI {
  loading: {
    showWhen<T>(task: () => Promise<T>, options: { text: string }): Promise<T>
  }
}

interface TopBarNotifyUI {
  toast: {
    info(message: string): void
    success(message: string): void
    error(message: string): void
  }
}

interface TopBarConfirmUI {
  confirm(options: ConfirmOptions): Promise<boolean>
}

export async function runWithTopBarLoading<T>(ui: TopBarLoadingUI, text: string, task: () => Promise<T>): Promise<T> {
  return ui.loading.showWhen(task, { text })
}

export function notifySyncResult(ui: TopBarNotifyUI, action: "noop" | "pull" | "push") {
  if (action === "noop") {
    ui.toast.info("已是最新")
    return
  }

  if (action === "pull") {
    ui.toast.success("已更新本地")
    return
  }

  ui.toast.success("已更新云端")
}

export function notifySyncError(ui: TopBarNotifyUI, error: unknown) {
  ui.toast.error(`同步失败：${error instanceof Error ? error.message : "未知错误"}`)
}

export function requestExitConfirm(ui: TopBarConfirmUI) {
  const options: ConfirmOptions = {
    title: "退出 Supabase 模式",
    description: "确定退出 Supabase 模式？",
    confirmText: "退出",
    cancelText: "取消",
  }
  return ui.confirm(options)
}
