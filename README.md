# 📬 Buzón de Quejas Inteligente

Sistema de quejas con prioridad manual (Baja / Media / Alta), desplegado en **Cloudflare Pages + D1** y versionado en **GitHub**.

## 🧱 Stack

- **Cloudflare Pages** → hosting del sitio público + panel admin
- **Cloudflare Pages Functions** → backend (recibe y lista quejas)
- **Cloudflare D1** → base de datos SQLite
- **GitHub** → repositorio del código

## 📁 Estructura

```

buzon-quejas/
├── public/
│   ├── index.html          Formulario público
│   ├── admin.html          Panel de administración (protegido)
│   └── styles.css          Estilos compartidos
├── functions/
│   └── api/
│       └── complaints.js   Backend: POST crear / GET listar / PATCH estado
├── schema.sql              Crear tabla en D1
├── wrangler.toml           Configuración de Cloudflare
└── README.md

```

## 🚀 Pasos de despliegue

### 1. Subir el código a GitHub

1. Crea un repositorio nuevo en GitHub (por ejemplo `buzon-quejas`).
2. Sube **todo el contenido de esta carpeta** a la rama `main`.

```bash
git init
git add .
git commit -m "Buzón de quejas inicial"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/buzon-quejas.git
git push -u origin main
```

### 2. Crear la base de datos D1 en Cloudflare

1. Entra a https://dash.cloudflare.com → **Workers & Pages** → **D1**.
2. Click en **Create database** → nómbrala `buzon-quejas-db` → **Create**.
3. Abre la base y ve a la pestaña **Console**.
4. Copia y pega el contenido de `schema.sql` y ejecútalo.
5. Copia el **Database ID** (lo necesitarás en el paso 4).

### 3. Conectar GitHub a Cloudflare Pages

1. En el panel de Cloudflare → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Autoriza GitHub y selecciona tu repositorio `buzon-quejas`.
3. Configuración del build:

- **Framework preset**: `None`
- **Build command**: `exit 0`
- **Build output directory**: `public`
4. Click **Save and Deploy**.

### 4. Vincular la base de datos D1 al proyecto

En el proyecto de Pages recién creado:

1. Ve a **Settings** → **Functions** → **D1 database bindings** → **Add binding**.
2. **Variable name**: `DB`
3. **D1 database**: selecciona `buzon-quejas-db`
4. Click **Save**.

### 5. Configurar la contraseña del panel admin

1. En el proyecto de Pages → **Settings** → **Environment variables** → **Add variable**.
2. **Variable name**: `ADMIN_PASSWORD`
3. **Value**: (elige una contraseña fuerte)
4. Marca **Encrypt** y guarda.
5. Ve a **Deployments** → **Retry deployment** para que tome la variable.

### 6. ¡Listo!

- Sitio público: `https://TU-PROYECTO.pages.dev/`
- Panel admin: `https://TU-PROYECTO.pages.dev/admin.html`

## 🔐 Cómo accede el admin

El panel `admin.html` pide la contraseña. Se envía al backend en el header `X-Admin-Password` y se valida contra la variable `ADMIN_PASSWORD` definida en Cloudflare.

</BDS:create_file>

<BDS:create_file fileName="buzon-quejas/schema.sql">

```sql
-- Tabla principal de quejas
CREATE TABLE IF NOT EXISTS complaints (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre      TEXT NOT NULL,
  email       TEXT,
  categoria   TEXT NOT NULL DEFAULT 'general',
  prioridad   TEXT NOT NULL DEFAULT 'media' CHECK (prioridad IN ('baja','media','alta')),
  mensaje     TEXT NOT NULL,
  estado      TEXT NOT NULL DEFAULT 'nueva' CHECK (estado IN ('nueva','en_revision','resuelta')),
  creada_en   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_complaints_prioridad ON complaints(prioridad);
CREATE INDEX IF NOT EXISTS idx_complaints_creada_en ON complaints(creada_en DESC);

