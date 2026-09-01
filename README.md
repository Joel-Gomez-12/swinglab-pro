# SwingLab Pro

Analizador de swing de golf con IA. **Toda la detección de pose corre en el navegador**
(MediaPipe) — no se sube ni un solo fotograma. Migrado de un único HTML a **Vite + React +
TypeScript**. Backend mínimo con **Supabase** (solo registro de quién pagó) y **Stripe** para el
cobro de "fundador". Pensado para desplegar en **Netlify**.

## Requisitos

- Node 20+ (probado con Node 24)
- Cuenta de Supabase (opcional, solo para pagos)
- Cuenta de Stripe (opcional, solo para pagos)

## Desarrollo local

```bash
npm install
cp .env.example .env      # rellena tus claves (ver abajo)
npm run dev               # http://localhost:5173
```

El análisis de swing (cámara, subir vídeo, demo, checklist, 3 idiomas) funciona **sin ninguna
clave**. Las claves solo hacen falta para el botón "Ser fundador · 50€".

> Nota: los pagos usan **funciones serverless de Netlify** (`/.netlify/functions/*`). Para
> probarlas en local usa `netlify dev` (Netlify CLI) en vez de `npm run dev`; así se sirven la
> app y las funciones juntas.

## Arquitectura

```
src/
  App.tsx              Estado + vistas (subir / cámara / analizando / resultados / error)
  data/i18n.ts         Todos los textos ES/EN/中文 y contenido del checklist
  lib/pgFigure.ts      Motor SVG del golfista articulado (modo demo)
  lib/pose.ts          MediaPipe + análisis de las 8 posiciones (100% en cliente)
  lib/overlay.ts       Marcas naranjas + exportación de imágenes (canvas)
  lib/supabase.ts      Cliente Supabase (opcional)
  lib/checkout.ts      Arranca Stripe Checkout
  components/          Results.tsx, Checklist.tsx
netlify/functions/
  create-checkout.ts   Crea la sesión de Stripe Checkout (usa la clave secreta)
  stripe-webhook.ts    ÚNICO sitio que marca un pago como pagado → escribe en Supabase
supabase/schema.sql    Tabla `founders` (RLS bloqueada; solo la escribe el webhook)
```

**Privacidad:** los vídeos y landmarks nunca salen del dispositivo. Supabase solo guarda datos
del pago (email, id de sesión de Stripe, importe). El navegador nunca puede escribir en la tabla.

## Variables de entorno

Frontend (expuestas al navegador, prefijo `VITE_`):

| Variable | Para qué |
|---|---|
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Cliente Supabase (opcional) |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Clave pública de Stripe |
| `VITE_SITE_URL` | URL pública del sitio (redirección de Stripe) |

Solo servidor (funciones Netlify — **nunca** en el navegador):

| Variable | Para qué |
|---|---|
| `STRIPE_SECRET_KEY` | Crear la sesión de checkout y validar webhooks |
| `STRIPE_WEBHOOK_SECRET` | Verificar la firma del webhook |
| `STRIPE_PRICE_ID` | El precio de 50€ del plan fundador |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Escribir en la tabla `founders` |

## Puesta en marcha del pago (Stripe + Supabase)

1. **Supabase:** crea un proyecto y ejecuta `supabase/schema.sql` en el editor SQL.
2. **Stripe:** crea un producto "Fundador" con un precio de 50€ y copia su `price_...` en
   `STRIPE_PRICE_ID`.
3. **Webhook de Stripe:** añade un endpoint apuntando a
   `https://TU-SITIO.netlify.app/.netlify/functions/stripe-webhook`, evento
   `checkout.session.completed`, y copia el `whsec_...` en `STRIPE_WEBHOOK_SECRET`.
4. Pon todas las variables en **Netlify → Site settings → Environment variables**.

## Despliegue en Netlify

- Conecta el repo (base directory = `swinglab-pro/` si el repo tiene más cosas).
- Netlify lee `netlify.toml`: build `npm run build`, publica `dist`, funciones en
  `netlify/functions`.
- Añade las variables de entorno y haz deploy.
