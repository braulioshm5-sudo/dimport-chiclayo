// Netlify Function: notify-telegram
// Recibe los datos del pedido desde el navegador y los reenvía a Telegram.
// El token del bot NUNCA se expone al cliente; vive solo aquí, como variable de entorno.

exports.handler = async function (event) {
  // Solo aceptamos POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

  if (!BOT_TOKEN || !CHAT_ID) {
    console.error("Faltan variables de entorno TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID");
    return { statusCode: 500, body: JSON.stringify({ error: "Configuración de Telegram incompleta" }) };
  }

  let data;
  try {
    data = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: "JSON inválido" }) };
  }

  const { orderId, items, total, method, opNumber, date } = data;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return { statusCode: 400, body: JSON.stringify({ error: "Pedido sin items" }) };
  }

  // Construir el texto del mensaje
  const lines = [];
  lines.push("🛍️ *NUEVO PEDIDO - D'Import*");
  lines.push("");
  lines.push("📦 *Productos:*");
  items.forEach(function (it) {
    const subtotal = (it.price * it.qty).toFixed(2);
    lines.push("• " + escapeMd(it.name) + " x" + it.qty + " — S/ " + subtotal);
  });
  lines.push("");
  lines.push("💰 *Total:* S/ " + Number(total).toFixed(2));
  lines.push("💳 *Método:* " + (method === "yape" ? "Yape" : "Transferencia bancaria"));
  if (opNumber) {
    lines.push("🔢 *N° operación:* " + escapeMd(opNumber));
  }
  if (orderId) {
    lines.push("🆔 *Pedido:* " + escapeMd(orderId));
  }
  lines.push("");
  lines.push("📅 " + (date || new Date().toLocaleString("es-PE")));

  const text = lines.join("\n");

  const telegramUrl = "https://api.telegram.org/bot" + BOT_TOKEN + "/sendMessage";

  try {
    const response = await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: text,
        parse_mode: "Markdown",
      }),
    });

    const result = await response.json();

    if (!result.ok) {
      console.error("Error de Telegram:", result);
      return { statusCode: 502, body: JSON.stringify({ error: "Telegram rechazó el mensaje", details: result }) };
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error("Error enviando a Telegram:", err);
    return { statusCode: 500, body: JSON.stringify({ error: "Error de conexión con Telegram" }) };
  }
};

// Telegram Markdown requiere escapar algunos caracteres especiales
function escapeMd(str) {
  return String(str).replace(/([_*[\]()~`>#+\-=|{}.!])/g, "\\$1");
}
