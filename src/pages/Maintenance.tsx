import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import type { Car, MaintenanceRecord, MaintenanceWork } from '../types'
import { Plus, Trash2, AlertTriangle, CheckCircle, Wrench } from 'lucide-react'

function today() {
  return new Date().toISOString().slice(0, 10)
}

const DEFAULT_WORKS = [
  { name: 'Замена масла двигателя', interval_km: 7000 },
  { name: 'Масляный фильтр', interval_km: 7000 },
  { name: 'Воздушный фильтр', interval_km: 15000 },
  { name: 'Салонный фильтр', interval_km: 15000 },
  { name: 'Масло АКПП', interval_km: 60000 },
  { name: 'Тормозные колодки', interval_km: 30000 },
]

export default function Maintenance() {
  const [cars, setCars] = useState<Car[]>([])
  const [records, setRecords] = useState<MaintenanceRecord[]>([])
  const [works, setWorks] = useState<MaintenanceWork[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCar, setSelectedCar] = useState<string>('')
  const [showForm, setShowForm] = useState(false)
  const [showWorksPanel, setShowWorksPanel] = useState(false)
  const [newWork, setNewWork] = useState({ name: '', interval_km: '' })
  const [currentMileage, setCurrentMileage] = useState('')
  const [form, setForm] = useState({ date: today(), mileage: '', works: [] as string[], cost: '', note: '' })
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      supabase.from('cars').select('*').order('created_at'),
      supabase.from('maintenance_records').select('*').order('date', { ascending: false }),
      supabase.from('maintenance_works').select('*'),
    ]).then(([carsRes, recRes, worksRes]) => {
      setCars(carsRes.data || [])
      setRecords(recRes.data || [])
      setWorks(worksRes.data || [])
      if (carsRes.data?.length) setSelectedCar(carsRes.data[0].id)
      setLoading(false)
    })
  }, [])

  const carWorks = useMemo(() => works.filter(w => w.car_id === selectedCar), [works, selectedCar])
  const carRecords = useMemo(() =>
    records.filter(r => r.car_id === selectedCar).sort((a, b) => b.mileage - a.mileage),
    [records, selectedCar]
  )

  const status = useMemo(() => {
    if (!currentMileage || !selectedCar) return []
    const cur = parseInt(currentMileage)
    if (isNaN(cur)) return []

    return carWorks.map(work => {
      const lastRecord = carRecords.find(r => r.works.includes(work.name))
      if (!lastRecord) return { work, lastMileage: null, remaining: null, pct: 0 }
      const driven = cur - lastRecord.mileage
      const remaining = work.interval_km - driven
      const pct = Math.min(100, (driven / work.interval_km) * 100)
      return { work, lastMileage: lastRecord.mileage, remaining, pct }
    })
  }, [carWorks, carRecords, currentMileage])

  async function ensureDefaultWorks(carId: string) {
    const { data: { user } } = await supabase.auth.getUser()
    const existing = works.filter(w => w.car_id === carId).map(w => w.name)
    const toInsert = DEFAULT_WORKS.filter(d => !existing.includes(d.name)).map(d => ({
      user_id: user!.id, car_id: carId, ...d
    }))
    if (!toInsert.length) return
    const { data } = await supabase.from('maintenance_works').insert(toInsert).select()
    if (data) setWorks(prev => [...prev, ...data])
  }

  async function handleAddWork(e: React.FormEvent) {
    e.preventDefault()
    const name = newWork.name.trim()
    const interval_km = parseInt(newWork.interval_km)
    if (!name || isNaN(interval_km) || interval_km <= 0 || !selectedCar) return
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('maintenance_works').insert({
      user_id: user!.id,
      car_id: selectedCar,
      name,
      interval_km,
    }).select().single()
    if (!error && data) {
      setWorks(prev => [...prev, data])
      setNewWork({ name: '', interval_km: '' })
    }
  }

  async function handleDeleteWork(id: string) {
    if (!confirm('Удалить вид работы?')) return
    await supabase.from('maintenance_works').delete().eq('id', id)
    setWorks(prev => prev.filter(w => w.id !== id))
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (!form.works.length) {
      setFormError('Выберите хотя бы одну выполненную работу.')
      return
    }
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('maintenance_records').insert({
      user_id: user!.id,
      car_id: selectedCar,
      date: form.date,
      mileage: parseInt(form.mileage),
      works: form.works,
      cost: form.cost ? parseFloat(form.cost) : null,
      note: form.note.trim() || null,
    }).select().single()
    if (!error && data) {
      setRecords(prev => [data, ...prev])
      setForm({ date: today(), mileage: '', works: [], cost: '', note: '' })
      setShowForm(false)
    } else if (error) {
      setFormError(error.message)
    }
  }

  async function handleDelete(id: string) {
    await supabase.from('maintenance_records').delete().eq('id', id)
    setRecords(prev => prev.filter(r => r.id !== id))
  }

  function toggleWork(name: string) {
    setForm(f => ({
      ...f,
      works: f.works.includes(name) ? f.works.filter(w => w !== name) : [...f.works, name]
    }))
  }

  if (loading) return <div className="p-8 text-gray-400">Загрузка...</div>

  const fmt = (n: number) => n.toLocaleString('ru-RU') + ' тг'

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Техническое обслуживание</h2>
        <div className="flex gap-3">
          <select value={selectedCar} onChange={e => { setSelectedCar(e.target.value); ensureDefaultWorks(e.target.value) }}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
            {cars.map(c => <option key={c.id} value={c.id}>{c.name} ({c.plate})</option>)}
          </select>
          <button onClick={() => setShowWorksPanel(v => !v)}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Wrench size={16} /> Виды работ
          </button>
          <button onClick={() => { setShowForm(v => !v); setFormError(null) }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus size={16} /> Запись ТО
          </button>
        </div>
      </div>

      {showWorksPanel && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <h3 className="text-base font-semibold text-white mb-4">Виды работ для этой машины</h3>
          <div className="flex flex-wrap gap-2 mb-4">
            {carWorks.map(w => (
              <span key={w.id} className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg pl-3 pr-2 py-1.5 text-sm text-gray-200">
                {w.name} <span className="text-gray-500">· {w.interval_km.toLocaleString()} км</span>
                <button onClick={() => handleDeleteWork(w.id)} className="text-gray-500 hover:text-red-400 transition-colors">
                  <Trash2 size={13} />
                </button>
              </span>
            ))}
            {carWorks.length === 0 && <p className="text-gray-500 text-sm">Нет видов работ для этой машины.</p>}
          </div>
          <form onSubmit={handleAddWork} className="flex gap-3">
            <input
              value={newWork.name} onChange={e => setNewWork(w => ({ ...w, name: e.target.value }))}
              placeholder="Название работы"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            />
            <input
              type="number" min="1" value={newWork.interval_km} onChange={e => setNewWork(w => ({ ...w, interval_km: e.target.value }))}
              placeholder="Интервал, км"
              className="w-40 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            />
            <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Добавить</button>
          </form>
        </div>
      )}

      {/* Mileage checker */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
        <h3 className="text-base font-semibold text-white mb-4">Состояние ТО</h3>
        <div className="flex gap-3 mb-6">
          <input
            type="number" value={currentMileage} onChange={e => setCurrentMileage(e.target.value)}
            placeholder="Введите текущий пробег (км)"
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 w-72"
          />
        </div>
        {status.length > 0 ? (
          <div className="space-y-4">
            {status.map(({ work, lastMileage, remaining, pct }) => {
              const isOverdue = remaining !== null && remaining <= 0
              const isWarning = remaining !== null && remaining > 0 && pct >= 80
              return (
                <div key={work.id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {isOverdue ? <AlertTriangle size={14} className="text-red-400" /> :
                       isWarning ? <AlertTriangle size={14} className="text-yellow-400" /> :
                       <CheckCircle size={14} className="text-green-400" />}
                      <span className="text-sm text-white">{work.name}</span>
                    </div>
                    <span className={`text-sm font-medium ${isOverdue ? 'text-red-400' : isWarning ? 'text-yellow-400' : 'text-green-400'}`}>
                      {remaining === null ? 'Нет данных' :
                       isOverdue ? `Просрочено на ${Math.abs(remaining).toLocaleString()} км` :
                       `Осталось ${remaining.toLocaleString()} км`}
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${isOverdue ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-green-500'}`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                  {lastMileage && (
                    <p className="text-xs text-gray-500 mt-1">Последний раз на {lastMileage.toLocaleString()} км · интервал {work.interval_km.toLocaleString()} км</p>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">{carWorks.length === 0 ? 'Добавьте виды работ для этой машины.' : 'Введите текущий пробег для расчёта.'}</p>
        )}
      </div>

      {/* Add record form */}
      {showForm && (
        <form onSubmit={handleAdd} className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Дата</label>
              <input type="date" required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Пробег на момент ТО (км)</label>
              <input type="number" required min="0" value={form.mileage} onChange={e => setForm(f => ({ ...f, mileage: e.target.value }))}
                placeholder="87400"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-2 block">Выполненные работы</label>
            <div className="grid grid-cols-2 gap-2">
              {carWorks.map(w => (
                <label key={w.id} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.works.includes(w.name)}
                    onChange={() => toggleWork(w.name)}
                    className="rounded border-gray-600 bg-gray-800 text-blue-500" />
                  <span className="text-sm text-gray-300">{w.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Стоимость (тг, опционально)</label>
              <input type="number" min="0" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))}
                placeholder="25000"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Заметка (опционально)</label>
              <input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                placeholder="Замена у дилера"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
            </div>
          </div>

          {formError && <p className="text-red-400 text-sm">{formError}</p>}

          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Отмена</button>
            <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Сохранить</button>
          </div>
        </form>
      )}

      {/* History */}
      <h3 className="text-lg font-semibold text-white mb-4">История ТО</h3>
      <div className="space-y-4">
        {carRecords.length === 0 ? (
          <p className="text-gray-500">Нет записей ТО для этой машины.</p>
        ) : (
          carRecords.map((rec, i) => {
            const prev = carRecords[i + 1]
            const kmSincePrev = prev ? rec.mileage - prev.mileage : null
            return (
              <div key={rec.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-medium text-white">{new Date(rec.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    <p className="text-sm text-gray-400">
                      {rec.mileage.toLocaleString()} км
                      {kmSincePrev !== null && <span className="ml-2 text-gray-500">(+{kmSincePrev.toLocaleString()} км с прошлого ТО)</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {rec.cost && <span className="text-sm font-medium text-white">{fmt(rec.cost)}</span>}
                    <button onClick={() => handleDelete(rec.id)} className="text-gray-600 hover:text-red-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {rec.works.map(w => (
                    <span key={w} className="bg-blue-900/40 text-blue-300 text-xs px-2 py-1 rounded-md">{w}</span>
                  ))}
                </div>
                {rec.note && <p className="text-sm text-gray-500 mt-2">{rec.note}</p>}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
