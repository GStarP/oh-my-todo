import { Provider } from "jotai"
import { TodoInput } from "@/components/todo-input"
import { TodoList } from "@/components/todo-list"
import { TodoSidebar } from "@/components/todo-sidebar"

function App() {
  return (
    <Provider>
      <div className="mx-auto flex h-screen max-w-2xl flex-col gap-4 p-6">
        <h1 className="text-2xl font-bold">Oh My Todo</h1>
        <TodoInput />
        <TodoList />
        <TodoSidebar />
      </div>
    </Provider>
  )
}

export default App
