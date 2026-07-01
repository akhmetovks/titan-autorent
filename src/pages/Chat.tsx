import { useState, useRef, useEffect } from 'react'
import { Send } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Привет! Я AI-агент Titan Autorent. Могу отвечать на вопросы по вашим данным: долги водителей, история платежей, статистика ТО и многое другое. Спросите меня что-нибудь.' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading) return

    setMessages(prev => [...prev, { role: 'user', content: text }])
    setInput('')
    setLoading(true)

    try {
      // TODO: call Supabase Edge Function with Claude API
      // For now — placeholder response
      await new Promise(r => setTimeout(r, 800))
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'AI-агент будет доступен после настройки Supabase Edge Function с вашим Claude API ключом. Функция уже подготовлена в /supabase/functions/chat.'
      }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Ошибка соединения с агентом.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="border-b border-gray-800 px-8 py-5">
        <h2 className="text-2xl font-bold text-white">AI-агент</h2>
        <p className="text-sm text-gray-400 mt-1">Задайте вопрос на русском языке</p>
      </div>

      <div className="flex-1 overflow-auto px-8 py-6 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-2xl px-4 py-3 rounded-2xl text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white rounded-br-sm'
                : 'bg-gray-900 border border-gray-800 text-gray-200 rounded-bl-sm'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-900 border border-gray-800 px-4 py-3 rounded-2xl rounded-bl-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="border-t border-gray-800 px-8 py-4 flex gap-3">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Например: Сколько должен Иван за июнь?"
          className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500"
        />
        <button type="submit" disabled={loading || !input.trim()}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-3 rounded-xl transition-colors">
          <Send size={18} />
        </button>
      </form>
    </div>
  )
}
