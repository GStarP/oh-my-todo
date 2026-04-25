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

    if (diffDays < 0) return { urgency: "expired", text: "过期" }
    if (diffDays === 0) return { urgency: "urgent", text: "今天" }
    if (diffDays === 1) return { urgency: "urgent", text: "明天" }
    if (diffDays <= 3) return { urgency: "remind", text: `${diffDays}天内` }
    return { urgency: null, text: dl.format("M月D日") }
  }

  const diffMs = dl.valueOf() - now.valueOf()
  const isToday = dl.format("YYYY-MM-DD") === now.format("YYYY-MM-DD")

  if (diffMs <= 0) return { urgency: "expired", text: "过期" }

  const diffHours = diffMs / (1000 * 60 * 60)

  if (isToday) return { urgency: "urgent", text: dl.format("HH:mm") }
  if (diffHours <= 72) return { urgency: "remind", text: dl.format("M月D日 HH:mm") }
  return { urgency: null, text: dl.format("M月D日 HH:mm") }
}

export function formatDeadline(deadline: string): string {
  if (isDateOnly(deadline)) return dayjs(deadline).format("YYYY-MM-DD")
  return dayjs(deadline).format("YYYY-MM-DD HH:mm")
}
