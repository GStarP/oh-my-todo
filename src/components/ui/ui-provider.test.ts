import assert from "node:assert/strict"
import test from "node:test"

import { syncToastTimers } from "./ui-provider.helpers"

test("syncToastTimers keeps existing toast timers when the queue grows", () => {
  const timers = new Map<string, number>()
  const scheduled: Array<{ toastId: string; duration: number; timerId: number }> = []
  const cleared: number[] = []
  let nextTimerId = 1

  const schedule = (toastId: string, duration: number) => {
    const timerId = nextTimerId++
    scheduled.push({ toastId, duration, timerId })
    return timerId
  }

  const clear = (timerId: number) => {
    cleared.push(timerId)
  }

  syncToastTimers(
    [{ id: "first", type: "info", message: "A", duration: 1000 }],
    timers,
    schedule,
    clear
  )

  syncToastTimers(
    [
      { id: "first", type: "info", message: "A", duration: 1000 },
      { id: "second", type: "success", message: "B", duration: 2000 },
    ],
    timers,
    schedule,
    clear
  )

  assert.deepEqual(scheduled, [
    { toastId: "first", duration: 1000, timerId: 1 },
    { toastId: "second", duration: 2000, timerId: 2 },
  ])
  assert.deepEqual(cleared, [])
  assert.deepEqual(Array.from(timers.entries()), [
    ["first", 1],
    ["second", 2],
  ])
})

test("syncToastTimers clears timers only for removed toasts", () => {
  const timers = new Map<string, number>([
    ["first", 1],
    ["second", 2],
  ])
  const cleared: number[] = []

  syncToastTimers(
    [{ id: "second", type: "success", message: "B", duration: 2000 }],
    timers,
    () => 3,
    (timerId) => {
      cleared.push(timerId)
    }
  )

  assert.deepEqual(cleared, [1])
  assert.deepEqual(Array.from(timers.entries()), [["second", 2]])
})
