import { useState } from "react"
import { Provider } from "jotai"
import { TodoInput } from "@/components/todo-input"
import { TodoList } from "@/components/todo-list"
import { TodoSidebar } from "@/components/todo-sidebar"

function App() {
  const [isDragging, setIsDragging] = useState(false)

  return (
    <Provider>
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <TodoInput isDragging={isDragging} />
        <TodoList isDragging={isDragging} onDragStateChange={setIsDragging} />
        <TodoSidebar />
      </div>
    </Provider>
  )
}

export default App
