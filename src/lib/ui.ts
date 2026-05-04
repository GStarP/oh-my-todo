const DEFAULT_TOAST_DURATION = 2400
const DEFAULT_CONFIRM_TITLE = "请确认"
const DEFAULT_CONFIRM_DESCRIPTION = ""
const DEFAULT_CONFIRM_TEXT = "确定"
const DEFAULT_CANCEL_TEXT = "取消"
const DEFAULT_LOADING_TEXT = "处理中"

export type ToastType = "info" | "success" | "warning" | "error"

export interface ToastOptions {
  duration?: number
}

export interface ToastItem {
  id: string
  type: ToastType
  message: string
  duration: number
}

export interface ConfirmOptions {
  title?: string
  description?: string
  confirmText?: string
  cancelText?: string
}

export interface ConfirmState {
  title: string
  description: string
  confirmText: string
  cancelText: string
}

export interface LoadingOptions {
  text?: string
}

export class TimeoutError extends Error {
  constructor(message = "操作超时") {
    super(message)
    this.name = "TimeoutError"
  }
}

export interface LoadingState {
  visible: boolean
  text: string
}

export interface UIState {
  toasts: ToastItem[]
  confirm: ConfirmState | null
  loading: LoadingState
}

type Listener = (state: UIState) => void
type LoadingEntry = {
  id: string
  text: string
}

function cloneState(state: UIState): UIState {
  return {
    toasts: state.toasts.map((toast) => ({ ...toast })),
    confirm: state.confirm ? { ...state.confirm } : null,
    loading: { ...state.loading },
  }
}

function freezeState(state: UIState): UIState {
  for (const toast of state.toasts) {
    Object.freeze(toast)
  }

  Object.freeze(state.toasts)

  if (state.confirm) {
    Object.freeze(state.confirm)
  }

  Object.freeze(state.loading)
  return Object.freeze(state)
}

function createInitialState(): UIState {
  return {
    toasts: [],
    confirm: null,
    loading: {
      visible: false,
      text: DEFAULT_LOADING_TEXT,
    },
  }
}

export function createUIController() {
  let state = createInitialState()
  let snapshot = freezeState(cloneState(state))
  const listeners = new Set<Listener>()
  let confirmResolver: ((value: boolean) => void) | null = null
  let loadingEntries: LoadingEntry[] = []

  function emit() {
    for (const listener of listeners) {
      listener(snapshot)
    }
  }

  function setState(nextState: UIState) {
    state = nextState
    snapshot = freezeState(cloneState(state))
    emit()
  }

  function pushToast(type: ToastType, message: string, options?: ToastOptions) {
    const id = crypto.randomUUID()
    const toast: ToastItem = {
      id,
      type,
      message,
      duration: options?.duration ?? DEFAULT_TOAST_DURATION,
    }

    setState({
      ...state,
      toasts: [...state.toasts, toast],
    })

    return id
  }

  return {
    subscribe(listener: Listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    getState() {
      return snapshot
    },
    toast: {
      info(message: string, options?: ToastOptions) {
        return pushToast("info", message, options)
      },
      success(message: string, options?: ToastOptions) {
        return pushToast("success", message, options)
      },
      warning(message: string, options?: ToastOptions) {
        return pushToast("warning", message, options)
      },
      error(message: string, options?: ToastOptions) {
        return pushToast("error", message, options)
      },
    },
    dismissToast(id: string) {
      setState({
        ...state,
        toasts: state.toasts.filter((toast) => toast.id !== id),
      })
    },
    confirm(options: ConfirmOptions = {}) {
      confirmResolver?.(false)

      setState({
        ...state,
        confirm: {
          title: options.title ?? DEFAULT_CONFIRM_TITLE,
          description: options.description ?? DEFAULT_CONFIRM_DESCRIPTION,
          confirmText: options.confirmText ?? DEFAULT_CONFIRM_TEXT,
          cancelText: options.cancelText ?? DEFAULT_CANCEL_TEXT,
        },
      })

      return new Promise<boolean>((resolve) => {
        confirmResolver = resolve
      })
    },
    resolveConfirm(result: boolean) {
      const resolver = confirmResolver
      confirmResolver = null

      setState({
        ...state,
        confirm: null,
      })

      resolver?.(result)
    },
    loading: {
      show(options: LoadingOptions = {}) {
        const text = options.text ?? DEFAULT_LOADING_TEXT
        const id = crypto.randomUUID()
        loadingEntries = [...loadingEntries, { id, text }]

        setState({
          ...state,
          loading: {
            visible: true,
            text,
          },
        })

        return id
      },
      async showWhen<T>(task: () => Promise<T>, options?: LoadingOptions) {
        const token = this.show(options)
        try {
          return await task()
        } finally {
          this.hide(token)
        }
      },
      hide(id?: string) {
        if (id) {
          loadingEntries = loadingEntries.filter((entry) => entry.id !== id)
        } else if (loadingEntries.length > 0) {
          loadingEntries = loadingEntries.slice(0, -1)
        }

        const activeEntry = loadingEntries[loadingEntries.length - 1]

        setState({
          ...state,
          loading: {
            visible: activeEntry !== undefined,
            text: activeEntry?.text ?? DEFAULT_LOADING_TEXT,
          },
        })
      },
    },
  }
}

export const UI = createUIController()
