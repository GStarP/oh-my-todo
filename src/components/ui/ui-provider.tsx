"use client"

import { useEffect, useRef, useSyncExternalStore } from "react"
import { CircleAlertIcon, CircleCheckBigIcon, CircleXIcon, InfoIcon, LoaderCircleIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { UI } from "@/lib/ui"
import { cn } from "@/lib/utils"
import { syncToastTimers } from "./ui-provider.helpers"

const toastToneClassName = {
  info: "border-blue-200 bg-blue-50 text-blue-950",
  success: "border-emerald-200 bg-emerald-50 text-emerald-950",
  warning: "border-amber-200 bg-amber-50 text-amber-950",
  error: "border-red-200 bg-red-50 text-red-950",
} as const

const toastIconClassName = {
  info: "text-blue-500",
  success: "text-emerald-500",
  warning: "text-amber-500",
  error: "text-red-500",
} as const

const toastIconMap = {
  info: InfoIcon,
  success: CircleCheckBigIcon,
  warning: CircleAlertIcon,
  error: CircleXIcon,
} as const

function ToastIcon({ type }: { type: keyof typeof toastIconMap }) {
  const Icon = toastIconMap[type]

  return <Icon className={cn("size-3.5", toastIconClassName[type])} />
}

export function UIProvider() {
  const state = useSyncExternalStore(UI.subscribe, UI.getState, UI.getState)
  const toastTimersRef = useRef<Map<string, number>>(new Map())

  useEffect(() => {
    syncToastTimers(
      state.toasts,
      toastTimersRef.current,
      (toastId, duration) =>
        window.setTimeout(() => {
          toastTimersRef.current.delete(toastId)
          UI.dismissToast(toastId)
        }, duration),
      (timeoutId) => {
        window.clearTimeout(timeoutId)
      }
    )
  }, [state.toasts])

  useEffect(() => {
    const timers = toastTimersRef.current

    return () => {
      for (const timeoutId of timers.values()) {
        window.clearTimeout(timeoutId)
      }
      timers.clear()
    }
  }, [])

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex justify-center px-4 sm:top-6">
        <div className="flex w-full max-w-md flex-col gap-2">
          {state.toasts.map((toast) => (
            <div
              key={toast.id}
              className={cn(
                "pointer-events-auto flex items-center gap-3 rounded-lg border px-4 py-3 text-sm shadow-sm",
                toastToneClassName[toast.type]
              )}
            >
              <span
                aria-hidden="true"
                className="flex size-5 shrink-0 items-center justify-center rounded-full bg-white/80"
              >
                <ToastIcon type={toast.type} />
              </span>
              <p className="flex-1 leading-6">{toast.message}</p>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="-mr-1 shrink-0 text-current hover:bg-white/60"
                onClick={() => UI.dismissToast(toast.id)}
                aria-label="关闭提示"
              >
                <XIcon />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <Dialog
        open={state.confirm !== null}
        onOpenChange={(open) => {
          if (!open && state.confirm) {
            UI.resolveConfirm(false)
          }
        }}
      >
        {state.confirm ? (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{state.confirm.title}</DialogTitle>
              {state.confirm.description ? (
                <DialogDescription>{state.confirm.description}</DialogDescription>
              ) : null}
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => UI.resolveConfirm(false)}
              >
                {state.confirm.cancelText}
              </Button>
              <Button type="button" onClick={() => UI.resolveConfirm(true)}>
                {state.confirm.confirmText}
              </Button>
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>

      <Dialog open={state.loading.visible} onOpenChange={() => {}} disablePointerDismissal>
        {state.loading.visible ? (
          <DialogContent
            overlayClassName="z-[70]"
            viewportClassName="z-[70]"
            showCloseButton={false}
            className="z-[71] w-auto min-w-48 max-w-xs gap-0 px-4 py-3"
          >
            <DialogTitle className="sr-only">加载中</DialogTitle>
            <div className="flex items-center gap-3 text-sm">
              <LoaderCircleIcon className="size-4 animate-spin text-primary" />
              <span className="leading-6 text-foreground">{state.loading.text}</span>
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
    </>
  )
}
