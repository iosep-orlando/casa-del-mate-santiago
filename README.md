# 🛒 Ecommerce — Next.js + MongoDB + Stripe

## 🎯 Objetivo del proyecto

Construir una **tienda online completa** con catálogo, carrito, pago real con Stripe y panel de administración. Es el proyecto más completo del bloque: integra autenticación, roles, pagos y webhooks.

Con este proyecto el alumno aprende:

- **Autenticación manual** con sesiones JWT (`jose`) en cookie `httpOnly` y contraseñas con `bcrypt` — sin librerías de auth de terceros.
- **Roles** (`admin` / `customer`) y protección de rutas con `proxy.ts` (el sustituto de `middleware.ts` en Next.js 16).
- Integración de **Stripe Checkout** y confirmación de pagos por **webhook**.
- **Route groups** de Next.js — `(public)`, `(customer)`, `(admin)` — para organizar layouts por rol.

## 🏗️ Arquitectura

```
┌───────────────┐    ┌──────────────────────┐     ┌──────────┐
│  Páginas      │    │  API Routes          │ ──► │ MongoDB  │
│  (public)     │ ─► │  /api/auth/...       │     └──────────┘
│  (customer)   │    │  /api/cart           │     ┌──────────┐
│  (admin)      │    │  /api/checkout ──────┼───► │  Stripe  │
└───────────────┘    │  /api/stripe/webhook◄┼──── │ Checkout │
        ▲            └──────────────────────┘     └──────────┘
        └── proxy.ts (protege rutas por rol leyendo el JWT de la cookie)
```

| Capa | Tecnología |
|------|------------|
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS 4 |
| Base de datos | MongoDB (driver nativo, singleton en `lib/db.ts`) |
| Auth | Cookie httpOnly + JWT (`jose`) + `bcryptjs` |
| Pagos | Stripe Checkout Sessions + Webhooks |

### Colecciones MongoDB

| Colección | Campos clave |
|---|---|
| `users` | `email`, `passwordHash`, `role` (`admin`\|`customer`), `name` |
| `products` | `name`, `description`, `price` (céntimos), `stock`, `category`, `active` |
| `orders` | `customerId`, `items[]`, `total`, `status` (`pending`\|`paid`\|`shipped`\|`cancelled`), `stripeSessionId` |
| `carts` | `customerId`, `items[]`, `updatedAt` |

### Estructura de rutas

```
app/
  (public)/          # catálogo, detalle de producto, login, registro
  (customer)/        # carrito, checkout success/cancel, historial de pedidos
  (admin)/admin/     # dashboard, CRUD de productos, clientes, pedidos
  api/               # auth, cart, checkout, stripe/webhook, admin/...
lib/
  db.ts              # MongoClient singleton
  auth.ts            # JWT, hash de contraseñas, sesión
  types.ts           # Interfaces TypeScript
scripts/seed.ts      # Datos iniciales (incluye el usuario admin)
proxy.ts             # Protección de rutas por rol
```

## ⚙️ Funcionalidades

**Cliente**: registro y login, catálogo de productos, detalle, carrito persistente en BD, pago con Stripe Checkout, historial de pedidos.

**Admin**: dashboard con resumen, CRUD completo de productos, listado de clientes, gestión de pedidos con cambio de estado.

## 💡 Solución

1. **Precios en céntimos (enteros)**: todo el dinero se almacena y calcula en céntimos para evitar errores de coma flotante; solo se formatea al mostrar.
2. **Flujo de pago**: `POST /api/checkout` crea una Stripe Checkout Session a partir del carrito → el usuario paga en Stripe → Stripe llama al **webhook** (`/api/stripe/webhook`), que verifica la firma y marca el pedido como `paid`. La página de éxito verifica además la sesión (`/api/checkout/verify`) porque en local el webhook puede no llegar.
3. **Auth artesanal**: al hacer login se firma un JWT con `jose` y se guarda en cookie `httpOnly` — el JavaScript del navegador nunca puede leerla. `proxy.ts` intercepta cada petición y redirige si el rol no corresponde.
4. **Server vs Client Components**: las páginas de listado leen MongoDB directamente en el servidor; las interactivas (carrito, formularios) son Client Components que llaman a la API.

## 🚀 Cómo ejecutar

1. Arranca MongoDB local. Crea una cuenta de prueba en Stripe.
2. Crea `.env.local`:

```env
MONGODB_URI=mongodb://localhost:27017
AUTH_SECRET=un-secreto-largo
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

3. Instala, siembra datos y arranca:

```bash
npm install
npx tsx scripts/seed.ts    # crea productos y el usuario admin
npm run dev
```

4. Para probar los webhooks en local: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.
5. Tarjeta de prueba de Stripe: `4242 4242 4242 4242`.

<!-- BEGIN cc:que-se-valora -->
¡Hola! Aquí te explico qué miraremos con lupa cuando corrijamos tu proyecto de Ecommerce.

## 📋 Qué se valora

Lo que más pesa es que tu ecommerce funcione como se espera y que cumpla con todo lo que se pide en el enunciado, ¡eso es lo principal! También es muy importante que tu código esté bien organizado y sea fácil de entender, y que la arquitectura de tu proyecto tenga sentido. El vídeo demo es otra parte importante, ya que nos permite ver tu proyecto en acción y cómo lo presentas. Finalmente, aunque con un peso menor, valoraremos que expliques bien tus decisiones y que la documentación sea clara.

Recuerda que el enunciado del proyecto es la guía principal y la evaluación no te penalizará por cosas que no se pidan explícitamente allí.
<!-- END cc:que-se-valora -->
