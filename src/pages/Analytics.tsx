import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import type { Car, Payment, Expense, Assignment } from '../types'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const MONTHS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']

export default function Analytics() {
  const [cars, setCars] = useState<Car[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(new Date().getFullYear())

  useEffect(() => {
    Promise.all([
      supabase.from('cars').select('*'),
      supabase.from('assignments').select('*'),
      supabase.from('payments').select('*'),
      supabase.from('expenses').select('*'),
    ]).then(([carsRes, assignRes, payRes, expRes]) => {
      setCars(carsRes.data || [])
      setAssignments(assignRes.data || [])
      setPayments(payRes.data || [])
      setExpenses(expRes.data || [])
      setLoading(false)
    })
  }, [])

  const chartData = useMemo(() => {
    return MONTHS.map((label, i) => {
      const monthStr = `${year}-${String(i + 1).padStart(2, '0')}`
      const income = payments
        .filter(p => p.date.startsWith(monthStr))
        .reduce((s, p) => s + Number(p.amount), 0)
      const expense = expenses
        .filter(e => e.date.startsWith(monthStr))
        .reduce((s, e) => s + Number(e.amount), 0)
      return { label, income, expense, profit: income - expense }
    })
  }, [payments, expenses, year])

  const yearTotals = useMemo(() => {
    const income = chartData.reduce((s, d) => s + d.income, 0)
    const expense = chartData.reduce((s, d) => s + d.expense, 0)
    return { income, expense, profit: income - expense }
  }, [chartData])

  const carStats = useMemo(() => {
    return cars.map(car => {
      const carAssignments = assignments.filter(a => a.car_id === car.id)
      const assignIds = new Set(carAssignments.map(a => a.id))
      const income = payments
        .filter(p => assignIds.has(p.assignment_id) && p.date.startsWith(String(year)))
        .reduce((s, p) => s + Number(p.amount), 0)
      const expense = expenses
        .filter(e => e.car_id === car.id && e.date.startsWith(String(year)))
        .reduce((s, e) => s + Number(e.amount), 0)
      return { car, income, expense, profit: income - expense }
    })
  }, [cars, assignments, payments, expenses, year])

  if (loading) return <div className="p-8 text-gray-400">Загрузка...</div>

  const fmt = (n: number) => n.toLocaleString('ru-RU') + ' тг'

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="text-2xl font-bold text-white">Аналитика</h2>
        <div className="flex gap-2">
          <button onClick={() => setYear(y => y - 1)} className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-2 rounded-lg text-sm transition-colors">←</button>
          <span className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium">{year}</span>
          <button onClick={() => setYear(y => y + 1)} className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-2 rounded-lg text-sm transition-colors">→</button>
        </div>
      </div>

      {/* Year totals */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-gray-400 text-sm mb-1">Доход за год</p>
          <p className="text-2xl font-bold text-green-400">{fmt(yearTotals.income)}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-gray-400 text-sm mb-1">Расходы за год</p>
          <p className="text-2xl font-bold text-red-400">{fmt(yearTotals.expense)}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-gray-400 text-sm mb-1">Прибыль за год</p>
          <p className={`text-2xl font-bold ${yearTotals.profit >= 0 ? 'text-blue-400' : 'text-red-400'}`}>{fmt(yearTotals.profit)}</p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
        <h3 className="text-base font-semibold text-white mb-6">Доходы и расходы по месяцам</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} barGap={4}>
            <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false}
              tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}к` : String(v)} />
            <Tooltip
              contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 8, color: '#f9fafb' }}
              formatter={(v) => typeof v === 'number' ? v.toLocaleString('ru-RU') + ' тг' : v}
            />
            <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
            <Bar dataKey="income" name="Доход" fill="#22c55e" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expense" name="Расход" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Per-car stats */}
      <h3 className="text-lg font-semibold text-white mb-4">По машинам</h3>
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {carStats.map(({ car, income, expense, profit }) => (
          <div key={car.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p className="font-semibold text-white mb-1">{car.name}</p>
            <p className="text-sm text-gray-400 mb-4">{car.plate}</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Доход</span>
                <span className="text-green-400">{fmt(income)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Расходы</span>
                <span className="text-red-400">{fmt(expense)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-800 pt-2">
                <span className="text-gray-400">Прибыль</span>
                <span className={`font-semibold ${profit >= 0 ? 'text-blue-400' : 'text-red-400'}`}>{fmt(profit)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
