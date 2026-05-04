export function resizeNotesTextarea(textarea: HTMLTextAreaElement) {
  textarea.style.height = "auto"
  textarea.style.height = textarea.scrollHeight + "px"
}

export function createNotesTextareaRef(notesRef: { current: HTMLTextAreaElement | null }) {
  return (textarea: HTMLTextAreaElement | null) => {
    notesRef.current = textarea
    if (textarea) resizeNotesTextarea(textarea)
  }
}
