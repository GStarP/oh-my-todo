import test from "node:test"
import assert from "node:assert/strict"
import { decideSyncAction } from "./sync"

test("returns noop when clean and versions are equal", () => {
  assert.equal(decideSyncAction({ baseVersion: 3, dirty: false, remoteVersion: 3 }), "noop")
})

test("returns pull when clean and local version is behind", () => {
  assert.equal(decideSyncAction({ baseVersion: 2, dirty: false, remoteVersion: 5 }), "pull")
})

test("returns push when dirty and versions are equal", () => {
  assert.equal(decideSyncAction({ baseVersion: 4, dirty: true, remoteVersion: 4 }), "push")
})

test("returns conflict when dirty and local version is behind", () => {
  assert.equal(decideSyncAction({ baseVersion: 1, dirty: true, remoteVersion: 2 }), "conflict")
})

test("treats missing baseVersion as zero", () => {
  assert.equal(decideSyncAction({ baseVersion: null, dirty: false, remoteVersion: 0 }), "noop")
  assert.equal(decideSyncAction({ baseVersion: null, dirty: false, remoteVersion: 1 }), "pull")
  assert.equal(decideSyncAction({ baseVersion: null, dirty: true, remoteVersion: 0 }), "push")
  assert.equal(decideSyncAction({ baseVersion: null, dirty: true, remoteVersion: 1 }), "conflict")
})

test("throws when clean baseVersion is ahead of remoteVersion", () => {
  assert.throws(
    () => decideSyncAction({ baseVersion: 3, dirty: false, remoteVersion: 2 }),
    /inconsistent sync versions/
  )
})

test("throws when dirty baseVersion is ahead of remoteVersion", () => {
  assert.throws(
    () => decideSyncAction({ baseVersion: 3, dirty: true, remoteVersion: 2 }),
    /inconsistent sync versions/
  )
})
