# Toma de Muestras – Control de Plagas

App autocontenida de planificación y toma de muestras de agua (Next.js + Prisma).

## Arranque

```bash
npm install
cp .env.example .env        # y rellena SESSION_SECRET (≥ 32 caracteres)
npm run db:reset            # crea la BD SQLite y carga el seed
npm run dev                 # http://localhost:3000
```

Para probar en el móvil en la misma red: `npm run dev -- -H 0.0.0.0` y abre `http://IP-DEL-PC:3000`.

## Usuarios de prueba (seed)

| Rol | Acceso |
|-----|--------|
| Admin | `/admin/login` · admin@controlplagas.local / admin1234 |
| Técnicos | `/login` · Jonathan, Fco. Javier, Juan José, José Joaquín L. · PIN **1234** |

Los partes del seed se crean relativos a hoy; Jonathan tiene casi todos (uno atrasado, dos hoy, próximos días y uno en "Hechos").

## Scripts

- `npm run db:reset` – borra la BD, aplica el esquema y vuelve a cargar el seed
- `npm run db:studio` – explorar la BD
- `npm run build && npm start` – producción (necesario para probar la instalación PWA)

## Producción (PostgreSQL)

Cambia `provider = "postgresql"` en `prisma/schema.prisma`, pon la `DATABASE_URL` de Postgres y usa migraciones (`prisma migrate`).

## Resultados del laboratorio con IA (Gemini)

En la ficha de cada parte se puede arrastrar el PDF de resultados. Se guarda en `storage/` (o en `STORAGE_DIR`) y, si está configurada la IA, Gemini lo lee: si algún parámetro aparece **en rojo**, el parte se marca como **ATENCIÓN** (en rojo en el panel, el calendario y los listados) hasta que pulses *Marcar como revisado*.

Para activarlo, añade a `.env` y reinicia:

```bash
GEMINI_API_KEY="tu-clave"          # https://aistudio.google.com/apikey
# GEMINI_MODEL="gemini-2.5-flash"  # opcional
```

Los PDF subidos sin clave quedan como *Pendiente de leer*; tras configurar la clave aparece el botón **Leer con IA** en cada uno.

En producción en Vercel el disco no es persistente: habría que guardar los PDF en un almacenamiento de objetos (p. ej. Vercel Blob).
