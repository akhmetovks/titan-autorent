export interface Car {
  id: string
  name: string
  plate: string
  daily_rate: number
  rest_day: number // 0=Sun, 1=Mon ... 6=Sat
  created_at: string
}

export interface Driver {
  id: string
  name: string
  phone: string | null
  created_at: string
}

export interface Assignment {
  id: string
  car_id: string
  driver_id: string
  started_at: string
  ended_at: string | null
  created_at: string
  car?: Car
  driver?: Driver
}

export interface Payment {
  id: string
  assignment_id: string
  date: string
  amount: number
  note: string | null
  created_at: string
  assignment?: Assignment
}

export interface Expense {
  id: string
  car_id: string
  date: string
  category: string
  amount: number
  note: string | null
  created_at: string
  car?: Car
}

export interface MaintenanceWork {
  id: string
  car_id: string
  name: string
  interval_km: number
  created_at: string
}

export interface ExpenseCategory {
  id: string
  name: string
  created_at: string
}

export interface MaintenanceRecord {
  id: string
  car_id: string
  date: string
  mileage: number
  works: string[] // array of work names performed
  cost: number | null
  note: string | null
  created_at: string
  car?: Car
}
