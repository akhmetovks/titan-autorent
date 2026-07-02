import { Loader2 } from 'lucide-react'

export default function PageLoader() {
  return (
    <div className="p-8 flex items-center gap-2 text-gray-400">
      <Loader2 size={16} className="animate-spin" />
      Загрузка...
    </div>
  )
}
