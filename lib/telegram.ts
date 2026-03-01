const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Session management for multi-step flows
interface SessionState {
  step: string;
  data: Record<string, unknown>;
  messageId?: number;
}

const sessions = new Map<number, SessionState>();

export function getSession(chatId: number): SessionState | undefined {
  return sessions.get(chatId);
}

export function setSession(chatId: number, state: SessionState) {
  sessions.set(chatId, state);
}

export function clearSession(chatId: number) {
  sessions.delete(chatId);
}

// Telegram API helpers
export async function sendMessage(
  chatId: number,
  text: string,
  replyMarkup?: unknown
) {
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
  };
  if (replyMarkup) body.reply_markup = replyMarkup;

  const res = await fetch(`${API_BASE}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function editMessage(
  chatId: number,
  messageId: number,
  text: string,
  replyMarkup?: unknown
) {
  const body: Record<string, unknown> = {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "HTML",
  };
  if (replyMarkup) body.reply_markup = replyMarkup;

  const res = await fetch(`${API_BASE}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function answerCallback(callbackQueryId: string, text?: string) {
  await fetch(`${API_BASE}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text: text || "",
    }),
  });
}

// Keyboard builders
export function inlineKeyboard(buttons: { text: string; callback_data: string }[][]) {
  return { inline_keyboard: buttons };
}

export function mainMenuKeyboard() {
  return inlineKeyboard([
    [
      { text: "📊 Dashboard", callback_data: "dashboard" },
      { text: "📦 Inventory", callback_data: "inventory" },
    ],
    [
      { text: "👥 Staff List", callback_data: "staff_list" },
      { text: "➕ Add Staff", callback_data: "add_staff" },
    ],
    [
      { text: "📝 New Settlement", callback_data: "new_settlement" },
      { text: "📋 Recent Settlements", callback_data: "recent_settlements" },
    ],
  ]);
}

// Format helpers
export function formatINR(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function formatDateShort(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
