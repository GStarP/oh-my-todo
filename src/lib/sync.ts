export type SyncAction = "noop" | "pull" | "push" | "conflict"

export interface SyncDecisionInput {
  baseVersion: number | null
  dirty: boolean
  remoteVersion: number
}

export function decideSyncAction(input: SyncDecisionInput): SyncAction {
  const localVersion = input.baseVersion ?? 0

  if (localVersion > input.remoteVersion) {
    throw new Error("inconsistent sync versions")
  }

  const isEqual = localVersion === input.remoteVersion

  if (!input.dirty) {
    return isEqual ? "noop" : "pull"
  }

  return isEqual ? "push" : "conflict"
}
