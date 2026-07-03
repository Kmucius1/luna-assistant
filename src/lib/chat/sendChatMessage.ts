export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
  time_period?: string
}

export async function sendChatMessage(
  message: string,
  sessionId: string
): Promise<{ response: string; session_id: string; time_period: string }> {
  const res = await fetch('/api/chat/message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, session_id: sessionId }),
  })
  const data = await res.json() as { response?: string; session_id?: string; time_period?: string }
  return {
    response: data.response ?? "I'm here — say that again for me?",
    session_id: data.session_id ?? sessionId,
    time_period: data.time_period ?? '',
  }
}

export async function loadChatHistory(sessionId: string): Promise<ChatMessage[]> {
  const res = await fetch(`/api/chat/history?session_id=${sessionId}`)
  const data = await res.json() as { messages?: ChatMessage[] }
  return data.messages ?? []
}
