export function shouldRenderSessionPrompt(input: { hasParentSession: boolean }) {
  return !input.hasParentSession
}

export function shouldShowSessionPrompt(input: {
  hasParentSession: boolean
  permissionCount: number
  questionCount: number
}) {
  return !input.hasParentSession && input.permissionCount === 0 && input.questionCount === 0
}
