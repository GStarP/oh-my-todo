import dayjs from "dayjs"

export type DeadlineUrgency = "expired" | "urgent" | "remind" | null

export interface DeadlineInfo {
  urgency: DeadlineUrgency
  text: string | null
}

export function isDateOnly(deadline: string): boolean {
  return dayjs(deadline).format("HH:mm:ss") === "00:00:00"
}

export function getDeadlineInfo(
  deadline: string | null,
  completed: boolean
): DeadlineInfo {
  if (completed || !deadline) return { urgency: null, text: null }

  const dl = dayjs(deadline)
  const now = dayjs()

  if (isDateOnly(deadline)) {
    const today = now.startOf("day")
    const dlDay = dl.startOf("day")
    const diffDays = dlDay.diff(today, "day")

    if (diffDays < 0) return { urgency: "expired", text: "已过期" }
    if (diffDays === 1) return { urgency: "urgent", text: "明天" }
    if (diffDays > 1 && diffDays <= 3)
      return { urgency: "remind", text: `${diffDays}天内` }
    return { urgency: null, text: null }
  }

  const diffMs = dl.valueOf() - now.valueOf()

  if (diffMs <= 0) return { urgency: "expired", text: "已过期" }

  const diffHours = diffMs / (1000 * 60 * 60)

  if (diffHours <= 24) {
    if (diffHours <= 1) return { urgency: "urgent", text: "1分钟内" }
    const diffMinutes = Math.ceil(diffMs / (1000 * 60))
    if (diffMinutes <= 60)
      return { urgency: "urgent", text: `${diffMinutes}分钟内` }
    return { urgency: "urgent", text: `${Math.ceil(diffHours)}小时内` }
  }

  if (diffHours <= 72) {
    return { urgency: "remind", text: `${Math.ceil(diffHours / 24)}天内` }
  }

  return { urgency: null, text: null }
}

export function formatDeadline(deadline: string): string {
  if (isDateOnly(deadline)) return dayjs(deadline).format("YYYY-MM-DD")
  return dayjs(deadline).format("YYYY-MM-DD HH:mm")
}
