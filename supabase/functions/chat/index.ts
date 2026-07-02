// Supabase Edge Function (Deno runtime) — AI-агент Titan Autorent
// Read-only Q&A over the authenticated user's rental data via Claude API.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!ANTHROPIC_API_KEY) {
    return json({ error: "ANTHROPIC_API_KEY is not configured" }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json({ error: "Missing authorization" }, 401);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return json({ error: "Unauthorized" }, 401);
  }

  let messages: { role: "user" | "assistant"; content: string }[];
  try {
    const body = await req.json();
    messages = body.messages;
    if (!Array.isArray(messages) || messages.length === 0) throw new Error();
  } catch {
    return json({ error: "Body must include a non-empty messages array" }, 400);
  }

  // RLS scopes every query below to the authenticated user's own rows.
  const [cars, drivers, assignments, payments, expenses, maintenanceRecords, maintenanceWorks, expenseCategories] =
    await Promise.all([
      supabase.from("cars").select("*"),
      supabase.from("drivers").select("*"),
      supabase.from("assignments").select("*"),
      supabase.from("payments").select("*"),
      supabase.from("expenses").select("*"),
      supabase.from("maintenance_records").select("*"),
      supabase.from("maintenance_works").select("*"),
      supabase.from("expense_categories").select("*"),
    ]);

  const dataContext = {
    cars: cars.data ?? [],
    drivers: drivers.data ?? [],
    assignments: assignments.data ?? [],
    payments: payments.data ?? [],
    expenses: expenses.data ?? [],
    maintenance_records: maintenanceRecords.data ?? [],
    maintenance_works: maintenanceWorks.data ?? [],
    expense_categories: expenseCategories.data ?? [],
  };

  const systemPrompt = `Ты — AI-ассистент приложения Titan Autorent для учёта аренды автомобилей под такси.
Отвечай на вопросы владельца бизнеса ТОЛЬКО на основе данных ниже. Если данных недостаточно для ответа, честно скажи об этом — не выдумывай цифры.
Отвечай на русском языке, кратко и по делу. Суммы указывай в формате "15 000 тг".
rest_day у машины: 0=Вс, 1=Пн, 2=Вт, 3=Ср, 4=Чт, 5=Пт, 6=Сб.
Сегодняшняя дата: ${new Date().toISOString().slice(0, 10)}.

Данные пользователя в формате JSON:
${JSON.stringify(dataContext)}`;

  const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });

  if (!anthropicRes.ok) {
    console.error("Anthropic API error:", await anthropicRes.text());
    return json({ error: "AI service error" }, 502);
  }

  const result = await anthropicRes.json();
  const textBlock = result.content?.find((b: { type: string }) => b.type === "text");

  return json({ reply: textBlock?.text ?? "Не удалось сформировать ответ." });
});
