import { useState, useRef, useEffect } from 'react'
import { Send, Mic, MicOff } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface SpeechRecognitionResultLike {
  results: { [index: number]: { [index: number]: { transcript: string } } }
}

interface SpeechRecognitionLike {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  onresult: ((e: SpeechRecognitionResultLike) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  start: () => void
  stop: () => void
}

const SpeechRecognitionCtor: (new () => SpeechRecognitionLike) | undefined =
  (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike }).SpeechRecognition ||
  (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Привет! Я AI-агент Titan Autorent. Могу отвечать на вопросы по вашим данным: долги водителей, история платежей, статистика ТО и многое другое. Спросите меня что-нибудь.' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function toggleVoice() {
    if (!SpeechRecognitionCtor) return
    if (listening) {
      recognitionRef.current?.stop()
      return
    }
    const recognition = new SpeechRecognitionCtor()
    recognition.lang = 'ru-RU'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript
      setInput(prev => (prev ? prev + ' ' : '') + transcript)
    }
    recognition.onend = () => setListening(false)
    recognition.onerror = () => setListening(false)
    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading) return

    const nextMessages = [...messages, { role: 'user' as const, content: text }]
    setMessages(nextMessages)
    setInput('')
    setLoading(true)

    try {
      const { data, error } = await supabase.functions.invoke('chat', {
        body: { messages: nextMessages },
      })
      if (error) throw error
      setMessages(prev => [...prev, { role: 'assistant', content: data?.reply || 'Не удалось получить ответ.' }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Ошибка соединения с агентом.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-gray-800 px-4 py-4 md:px-8 md:py-5">
        <h2 className="text-2xl font-bold text-white">AI-агент</h2>
        <p className="text-sm text-gray-400 mt-1">Задайте вопрос на русском языке</p>
      </div>

      <div className="flex-1 overflow-auto px-4 py-6 md:px-8 space-y-4">
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

      <form onSubmit={handleSend} className="border-t border-gray-800 px-4 py-4 md:px-8 flex gap-3">
        {SpeechRecognitionCtor && (
          <button
            type="button"
            onClick={toggleVoice}
            title={listening ? 'Остановить запись' : 'Голосовой ввод'}
            className={`px-4 py-3 rounded-xl transition-colors ${
              listening
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-gray-900 border border-gray-700 text-gray-300 hover:text-white'
            }`}
          >
            {listening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
        )}
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
