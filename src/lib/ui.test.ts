import assert from "node:assert/strict"
import test from "node:test"
import { TimeoutError, createUIController } from "./ui"

async function observeSettlement<T>(promise: Promise<T>) {
  return Promise.race([
    promise.then((value) => ({ status: "resolved" as const, value })),
    new Promise<{ status: "timeout" }>((resolve) => {
      setTimeout(() => resolve({ status: "timeout" }), 20)
    }),
  ])
}

test("toast uses default duration and supports override", () => {
  const ui = createUIController()

  ui.toast.success("已保存")
  ui.toast.error("同步失败", { duration: 5000 })

  const state = ui.getState()
  assert.equal(state.toasts.length, 2)
  assert.equal(state.toasts[0]?.duration, 2400)
  assert.equal(state.toasts[1]?.duration, 5000)
  assert.equal(state.toasts[0]?.type, "success")
  assert.equal(state.toasts[1]?.type, "error")
})

test("confirm resolves true on confirm and false on cancel", async () => {
  const ui = createUIController()

  const confirmed = ui.confirm({ description: "确定退出 Supabase 模式？" })
  assert.equal(ui.getState().confirm?.title, "请确认")
  ui.resolveConfirm(true)
  assert.equal(await confirmed, true)

  const cancelled = ui.confirm({ title: "删除待办" })
  ui.resolveConfirm(false)
  assert.equal(await cancelled, false)
})

test("starting a new confirm cancels the previous pending confirm", async () => {
  const ui = createUIController()

  const first = ui.confirm({ title: "退出登录" })
  const second = ui.confirm({ title: "删除待办" })

  assert.deepEqual(await observeSettlement(first), {
    status: "resolved",
    value: false,
  })
  ui.resolveConfirm(true)
  assert.equal(await second, true)
})

test("loading show and hide toggles blocking overlay", () => {
  const ui = createUIController()

  ui.loading.show({ text: "同步中" })
  assert.deepEqual(ui.getState().loading, {
    visible: true,
    text: "同步中",
  })

  ui.loading.hide()
  assert.deepEqual(ui.getState().loading, {
    visible: false,
    text: "处理中",
  })
})

test("loading keeps the remaining owner's text when hiding out of order", () => {
  const ui = createUIController()

  const syncToken = ui.loading.show({ text: "同步中" })
  ui.loading.show({ text: "保存中" })
  ui.loading.hide(syncToken)

  assert.deepEqual(ui.getState().loading, {
    visible: true,
    text: "保存中",
  })

  ui.loading.hide()
  assert.deepEqual(ui.getState().loading, {
    visible: false,
    text: "处理中",
  })
})

test("loading hide without token removes the latest active entry", () => {
  const ui = createUIController()

  ui.loading.show({ text: "同步中" })
  ui.loading.show({ text: "保存中" })
  ui.loading.hide()

  assert.deepEqual(ui.getState().loading, {
    visible: true,
    text: "同步中",
  })
})

test("loading showWhen shows and hides around a successful async task", async () => {
  const ui = createUIController()

  const result = await ui.loading.showWhen(
    async () => {
      assert.deepEqual(ui.getState().loading, {
        visible: true,
        text: "同步中",
      })
      return "ok"
    },
    { text: "同步中" },
  )

  assert.equal(result, "ok")
  assert.deepEqual(ui.getState().loading, {
    visible: false,
    text: "处理中",
  })
})

test("loading showWhen hides loading when the async task rejects", async () => {
  const ui = createUIController()

  await assert.rejects(
    () =>
      ui.loading.showWhen(
        async () => {
          throw new TimeoutError("同步超时")
        },
        { text: "连接中" },
      ),
    /同步超时/,
  )

  assert.deepEqual(ui.getState().loading, {
    visible: false,
    text: "处理中",
  })
})

test("dismissToast removes only the target toast", () => {
  const ui = createUIController()

  const firstId = ui.toast.info("A")
  const secondId = ui.toast.warning("B")
  ui.dismissToast(firstId)

  assert.deepEqual(ui.getState().toasts.map((toast) => toast.id), [secondId])
})

test("getState returns a snapshot that cannot mutate internal state", () => {
  const ui = createUIController()

  ui.toast.info("A")
  const snapshot = ui.getState()
  assert.throws(() => {
    snapshot.toasts.push({
      id: "fake",
      type: "error",
      message: "B",
      duration: 1,
    })
  })
  assert.throws(() => {
    snapshot.loading.visible = true
  })

  const nextState = ui.getState()
  assert.equal(nextState.toasts.length, 1)
  assert.equal(nextState.toasts[0]?.message, "A")
  assert.deepEqual(nextState.loading, {
    visible: false,
    text: "处理中",
  })
})

test("getState returns the same snapshot reference when state is unchanged", () => {
  const ui = createUIController()

  const first = ui.getState()
  const second = ui.getState()

  assert.equal(second, first)
})
