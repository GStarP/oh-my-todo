export interface Todo {
  id: string
  title: string
  completed: boolean
  deadline: string | null
  importance: number
  sortOrder: number
  notes: string
}
