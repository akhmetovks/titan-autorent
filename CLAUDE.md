# Titan Autorent

Веб-приложение для учёта аренды автомобилей под такси. Владелец сдаёт машины водителям, собирает ежедневную арендную плату, отслеживает долги, расходы и техобслуживание.

## Стек
- React 19 + TypeScript + Vite 8
- Tailwind CSS v4 (через `@tailwindcss/vite`)
- Supabase (PostgreSQL + Auth + RLS)
- React Router DOM v7
- Recharts (графики аналитики)
- Lucide React (иконки)

## Supabase
- URL: https://rdahqmrndjuurmkwgnvo.supabase.co
- Схема БД уже применена (см. `supabase_schema.sql`)
- RLS включён на всех таблицах — каждый пользователь видит только свои данные
- `.env` файл нужно создать вручную (он в `.gitignore`):
  ```
  VITE_SUPABASE_URL=https://rdahqmrndjuurmkwgnvo.supabase.co
  VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkYWhxbXJuZGp1dXJta3dnbnZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4OTg3ODksImV4cCI6MjA5ODQ3NDc4OX0.vo1o_7P5g9g1aroEAa8pDSBNCGQdrENmWkq6zr-1c0M
  ```

## Таблицы БД
- `cars` — машины (name, plate, daily_rate, rest_day)
- `drivers` — водители (name, phone)
- `assignments` — назначения водитель↔машина (started_at, ended_at)
- `payments` — платежи аренды (привязаны к assignment)
- `expenses` — расходы по машинам (category, amount)
- `maintenance_works` — виды ТО работ с интервалом в км
- `maintenance_records` — записи ТО (дата, пробег, список работ)

## Структура проекта
```
src/
  App.tsx                — роутинг + Supabase auth
  index.css              — @import "tailwindcss"
  main.tsx
  types/index.ts         — все TS интерфейсы
  lib/supabase.ts        — createClient
  components/
    Layout.tsx           — sidebar навигация + outlet
  pages/
    Auth.tsx             — вход / регистрация
    Analytics.tsx        — годовые графики доходов/расходов + по машинам
    Cars.tsx             — CRUD машин
    Drivers.tsx          — CRUD водителей
    Assignments.tsx      — назначения (активные / завершённые)
    Payments.tsx         — платежи + расчёт долга по рабочим дням
    Expenses.tsx         — расходы по категориям
    Maintenance.tsx      — ТО: записи + трекер оставшихся км
    Chat.tsx             — AI-агент: чат + голосовой ввод (Web Speech API)
supabase/
  functions/chat/index.ts — Edge Function: read-only Q&A по данным пользователя через Claude API (haiku)
```

## Ключевая бизнес-логика

### Расчёт долга (Payments.tsx)
Долг = (рабочие_дни × daily_rate) − сумма_платежей_за_период.
Рабочие дни считаются с учётом выходного дня машины (`rest_day`: 0=Вс, 1=Пн ... 6=Сб).
Поддерживается смена водителя посреди месяца — период пересекается с датами assignment.

### Трекер ТО (Maintenance.tsx)
Пользователь вводит текущий пробег → система считает `remaining = interval_km - (current - last_record_mileage)`.
Цвета: зелёный (норма), жёлтый (≥80% интервала), красный (просрочено).
При первом выборе машины автоматически создаются 6 стандартных видов работ.

### AI-агент (Chat.tsx + supabase/functions/chat)
Read-only Q&A-ассистент: отвечает на вопросы по данным пользователя (долги, платежи, ТО и т.д.), ничего не создаёт и не изменяет.
Frontend вызывает `supabase.functions.invoke('chat', { body: { messages } })` — авторизация идёт через JWT пользователя, Edge Function создаёт Supabase-клиент с этим JWT, так что RLS ограничивает выборку только данными текущего пользователя.
Edge Function собирает все данные пользователя (cars, drivers, assignments, payments, expenses, maintenance_records, maintenance_works, expense_categories) в JSON, кладёт в system prompt и вызывает Claude API (`claude-haiku-4-5`) напрямую через `fetch` (Deno runtime, без SDK).
Голосовой ввод — через браузерный Web Speech API (`SpeechRecognition`/`webkitSpeechRecognition`), текст попадает в поле ввода, отправка вручную. Работает в Chrome/Edge, не поддерживается в Firefox.

**Деплой Edge Function** (нужно один раз выполнить вручную, CLI не доступен из среды разработки):
```bash
supabase functions deploy chat --project-ref rdahqmrndjuurmkwgnvo
supabase secrets set ANTHROPIC_API_KEY=sk-ant-... --project-ref rdahqmrndjuurmkwgnvo
```
`SUPABASE_URL` и `SUPABASE_ANON_KEY` внутри функции доступны автоматически (резервируются платформой), задавать вручную не нужно.

## Что планируется сделать
- **GPS интеграция**: платформа GlonassSoft — отложено до получения API ключей

## Команды
```bash
npm install
npm run dev      # http://localhost:5173
npm run build
```
