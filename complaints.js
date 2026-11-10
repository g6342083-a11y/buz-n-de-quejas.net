// functions/api/complaints.js
// Backend de Cloudflare Pages Functions.

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Admin-Password",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function unauthorized() {
  return json({ error: "No autorizado" }, 401);
}

function isAdmin(request, env) {
  const provided = request.headers.get("X-Admin-Password") || "";
  const expected = env.ADMIN_PASSWORD || "";
  if (!expected || provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
  }
  return diff === 0;
}

const CATEGORIAS_VALIDAS = [
  "general", "servicio", "producto", "facturacion",
  "personal", "instalaciones", "otro",
];
const PRIORIDADES_VALIDAS = ["baja", "media", "alta"];
const ESTADOS_VALIDOS = ["nueva", "en_revision", "resuelta"];

export async function onRequest(context) {
  const { request, env } = context;
  const method = request.method.toUpperCase();

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (method === "POST") {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "JSON inválido" }, 400);
    }

    const nombre = (body.nombre || "").toString().trim();
    const email = (body.email || "").toString().trim();
    const categoria = (body.categoria || "general").toString().trim();
    const prioridad = (body.prioridad || "").toString().trim().toLowerCase();
    const mensaje = (body.mensaje || "").toString().trim();

    if (!nombre) return json({ error: "El nombre es obligatorio" }, 400);
    if (!mensaje || mensaje.length < 10) {
      return json({ error: "El mensaje debe tener al menos 10 caracteres" }, 400);
    }
    if (!PRIORIDADES_VALIDAS.includes(prioridad)) {
      return json({ error: "Prioridad inválida" }, 400);
    }
    if (!CATEGORIAS_VALIDAS.includes(categoria)) {
      return json({ error: "Categoría inválida" }, 400);
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: "Email inválido" }, 400);
    }

    try {
      const result = await env.DB.prepare(
        `INSERT INTO complaints (nombre, email, categoria, prioridad, mensaje)
         VALUES (?, ?, ?, ?, ?)`
      )
        .bind(nombre, email || null, categoria, prioridad, mensaje)
        .run();

      return json({
        ok: true,
        id: result.meta.last_row_id,
        mensaje: "Queja registrada correctamente",
      }, 201);
    } catch (err) {
      return json({ error: "Error al guardar", detalle: err.message }, 500);
    }
  }

  if (!isAdmin(request, env)) {
    return unauthorized();
  }

  if (method === "GET") {
    const url = new URL(request.url);
    const prioridad = url.searchParams.get("prioridad");
    const estado = url.searchParams.get("estado");
    const categoria = url.searchParams.get("categoria");

    let sql = "SELECT * FROM complaints WHERE 1=1";
    const params = [];

    if (prioridad && PRIORIDADES_VALIDAS.includes(prioridad)) {
      sql += " AND prioridad = ?";
      params.push(prioridad);
    }
    if (estado && ESTADOS_VALIDOS.includes(estado)) {
      sql += " AND estado = ?";
      params.push(estado);
    }
    if (categoria && CATEGORIAS_VALIDAS.includes(categoria)) {
      sql += " AND categoria = ?";
      params.push(categoria);
    }

    sql += ` ORDER BY
      CASE prioridad WHEN 'alta' THEN 1 WHEN 'media' THEN 2 ELSE 3 END,
      creada_en DESC LIMIT 500`;

    try {
      const { results } = await env.DB.prepare(sql).bind(...params).all();
      return json({ ok: true, quejas: results });
    } catch (err) {
      return json({ error: "Error al leer", detalle: err.message }, 500);
    }
  }

  if (method === "PATCH") {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "JSON inválido" }, 400);
    }

    const id = parseInt(body.id, 10);
    const estado = (body.estado || "").toString();

    if (!id || !ESTADOS_VALIDOS.includes(estado)) {
      return json({ error: "Datos inválidos" }, 400);
    }

    try {
      await env.DB.prepare("UPDATE complaints SET estado = ? WHERE id = ?")
        .bind(estado, id)
        .run();
      return json({ ok: true });
    } catch (err) {
      return json({ error: "Error al actualizar", detalle: err.message }, 500);
    }
  }

  return json({ error: "Método no permitido" }, 405);
}
