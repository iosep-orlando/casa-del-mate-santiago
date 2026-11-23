# La Casa del Mate Santiago · Ecommerce con Next.js, MongoDB y Stripe

Una tienda online de yerba, mates, bombillas y termos. Los clientes se
registran, buscan en el catálogo, arman un carrito que queda guardado y pagan
con **Stripe Checkout**. El admin tiene un panel con las ventas por día, el
alta, baja y edición de productos, la lista de clientes y los pedidos, que
puede marcar como enviados o cancelar devolviendo el dinero.

Los precios están en **pesos argentinos**. Los pagos son de prueba (sandbox
de Stripe): no se cobra nada.

El enunciado original está en [README-enunciado.md](README-enunciado.md).

## Demo

**https://casa-del-mate-santiago.onrender.com**

- Cliente: creá una cuenta en «Crear cuenta» y pagá con la tarjeta de prueba
  argentina `4000 0003 2000 0021`, cualquier fecha futura, cualquier código y
  facturación en Argentina (ver «Probar una compra»).
- Admin: el usuario que crea el seed. La contraseña no está en el repositorio.

El plan gratuito de Render se duerme sin visitas: la primera carga puede
tardar un minuto.

## Stack

| Capa | Tecnología |
|------|------------|
| Frontend | Next.js 16.4 (App Router, Cache Components), React 19, Tailwind CSS 4 |
| Base de datos | MongoDB (driver nativo, un cliente por proceso en `lib/mongodb.ts`) |
| Autenticación | JWT con `jose` en cookie `httpOnly`, contraseñas con `bcryptjs` (coste 12) |
| Pagos | Stripe Checkout Sessions + webhook firmado |
| Tests | Vitest con cobertura v8 |
| CI | GitLab CI: lint, tipos y tests con cobertura |

## Cómo funciona

```
 Navegador                    Next.js (servidor)                         Servicios
┌─────────────────┐        ┌─────────────────────────────────────┐
│ (public)        │        │ proxy.ts  ── lee el JWT de la cookie │
│  catálogo,      │ ─────► │           y deja pasar según el rol  │
│  producto,      │        ├─────────────────────────────────────┤     ┌──────────┐
│  login/registro │        │ Server Components: leen MongoDB      │ ──► │ MongoDB  │
│ (customer)      │        │ /api/auth/…   /api/cart              │     │ users    │
│  carrito,       │ ─────► │ /api/checkout ──────────────────────┼──┐  │ products │
│  pedidos,       │        │ /api/checkout/verify ◄──────────────┼┐ │  │ carts    │
│  checkout       │        │ /api/stripe/webhook  ◄──────────────┼┤ │  │ orders   │
│ (admin)/admin   │        │ /api/admin/products, /orders         │││  └──────────┘
│  panel, CRUD    │        └─────────────────────────────────────┘││  ┌──────────┐
└─────────────────┘                                                │└─►│  Stripe  │
                                                                   └───┤ Checkout │
                                                                       └──────────┘
```

### Rutas y roles

Las páginas están organizadas en tres *route groups* de Next.js, uno por
quien las usa. El nombre entre paréntesis no aparece en la URL.

| Grupo | Páginas | Quién entra |
|-------|---------|-------------|
| `(public)` | `/` catálogo con búsqueda y categorías, `/productos/[id]`, `/login`, `/registro` | Todos |
| `(customer)` | `/carrito`, `/pedidos`, `/checkout/exito`, `/checkout/cancelado` | Clientes |
| `(admin)` | `/admin` (resumen), `/admin/productos`, `/admin/pedidos`, `/admin/clientes` | Admin |

`proxy.ts` (el sustituto de `middleware.ts` en Next.js 16) decide antes de
cada petición, leyendo el rol del JWT. Sin sesión, manda al login recordando
adónde ibas (`?next=`). Con el rol equivocado, manda a tu propio inicio. Las
rutas de la API lo vuelven a comprobar por su cuenta (`lib/api.ts`), porque
se pueden llamar sin pasar por la página.

### El pago, paso a paso

```
Cliente            /api/checkout            Stripe                 /api/stripe/webhook
   │ Pagar ──────────► │                       │                            │
   │                   │ 1. pedido "pending"   │                            │
   │                   │    (copia del carrito)│                            │
   │                   │ 2. crea la sesión ───►│                            │
   │ ◄──── URL ────────│                       │                            │
   │ paga con tarjeta ───────────────────────► │                            │
   │                   │                       │ 3. checkout.session.       │
   │                   │                       │    completed (firmado) ──► │ 4. descuenta stock,
   │ ◄── vuelve a /checkout/exito ──────────── │                            │    "paid", vacía el carrito
   │ 5. /api/checkout/verify: pregunta a Stripe y, si el webhook no llegó, confirma desde aquí
```

1. **Al ir a pagar** se crea el pedido `pending` con una copia del nombre y el
   precio de cada línea, y una sesión de Stripe Checkout para él. Los precios
   salen de la base, nunca del navegador.
2. **El cliente paga en la página de Stripe.**
3. **Stripe avisa al webhook.** El webhook comprueba la firma con
   `STRIPE_WEBHOOK_SECRET` antes de creer nada.
4. **La confirmación** descuenta el stock, marca el pedido `paid` y vacía el
   carrito.
5. **La página de éxito** pregunta a `/api/checkout/verify`, que consulta la
   sesión a Stripe. Si el webhook todavía no llegó (en local, sin
   `stripe listen`, no llega nunca), confirma desde ahí. Si llegan los dos a
   la vez, solo uno hace el trabajo (ver «Confirmación idempotente»).

### Estados del pedido

```
pending ──(pago confirmado por Stripe)──► paid ──(admin)──► shipped
   │                                       │
   └──► cancelled ◄───(admin: reembolso)───┘
```

- **De `pending` a `cancelled`:** el admin cancela (y se cierra la sesión de
  Stripe para que no se pueda pagar), o Stripe vence la sesión a los 30
  minutos sin pago.
- **De `paid` a `cancelled`:** el admin cancela, y **se devuelve el dinero
  por Stripe y vuelve el stock**.
- **`paid` no lo pone nunca el admin a mano.** Solo lo pone la confirmación
  del pago.

### Colecciones

| Colección | Campos clave | Índices |
|-----------|--------------|---------|
| `users` | `email`, `name`, `passwordHash`, `role` | `email` único |
| `products` | `name`, `description`, `price` (centavos), `stock`, `category`, `imageUrl`, `active` | `active` + `category` + `createdAt` |
| `carts` | `customerId`, `items[]` (`productId`, `quantity`) | `customerId` único |
| `orders` | `customerId`, `items[]` (copia de nombre y precio), `total`, `status`, `stripeSessionId`, `paymentIntentId`, `refundId`, `cancelReason` | `stripeSessionId` único (parcial), `customerId` + fecha, `status` + fecha |
| `images` | `data` (la foto, binaria), `contentType`, `size` | Solo el `_id` |

## Cómo ejecutar

Necesitás Node.js 22, Docker (para MongoDB) y una cuenta de Stripe.

### 1. Stripe en modo prueba

1. Creá una cuenta en [dashboard.stripe.com/register](https://dashboard.stripe.com/register).
   No hace falta activarla ni dar datos bancarios: se trabaja en un
   **sandbox** (entorno de prueba), que funciona con la cuenta sin activar.
   Si al registrarte Argentina no aparece entre los países, elegí otro: para
   el sandbox no importa.
2. En el sandbox, *Desarrolladores → Claves de API*: copiá la **clave
   secreta** (`sk_test_…`).

### 2. Configuración

```bash
cp .env.example .env.local
```

Completá en `.env.local`:

- `STRIPE_SECRET_KEY`: la clave secreta del paso anterior.
- `AUTH_SECRET`: un texto largo al azar, por ejemplo la salida de
  `openssl rand -base64 32`.
- `ADMIN_EMAIL` y `ADMIN_PASSWORD`: el admin que va a crear el seed.
- `MONGODB_URI`: si ya tenés otro MongoDB en el puerto 27017, poné su cadena
  acá. La tienda usa su propia base, `ecommerce`.

### 3. Base, datos y arranque

```bash
npm install
docker compose up -d     # MongoDB en el 27017 (no hace falta si ya tenés uno)
npm run seed             # 12 productos de ejemplo y el usuario admin
npm run dev              # http://localhost:3000
```

El seed se puede correr las veces que haga falta. No toca los productos que
ya existen, así no pisa el stock vendido, y al admin le vuelve a poner la
contraseña de `.env.local`.

### 4. Probar una compra

1. Creá una cuenta de cliente, agregá productos al carrito y pulsá
   **Pagar con Stripe**.
2. En Stripe pagá con la tarjeta de prueba **argentina**
   `4000 0003 2000 0021`, una fecha futura y cualquier código, y en *Datos de
   facturación* elegí **Argentina**.

   La conocida `4242 4242 4242 4242` es una tarjeta de Estados Unidos. Al
   cobrar en pesos, Stripe la marcó con riesgo «Máximo» y bloqueó el pago
   (pasó en la prueba, con facturación en España). Lo coherente para una
   tienda argentina es una tarjeta y una dirección de Argentina.
3. Al volver, el pedido aparece **Pagado** y el carrito queda vacío. Desde
   **Ingresar**, con el admin, se ve en *Pedidos* y en el gráfico del
   resumen.

**Webhook en local (opcional).** Sin él, la compra se confirma igual desde la
página de éxito. Para probar el camino del webhook, instalá la
[Stripe CLI](https://docs.stripe.com/stripe-cli) y corré:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

El comando imprime un `whsec_…`: ponelo en `STRIPE_WEBHOOK_SECRET` y
reiniciá `npm run dev`.

## Despliegue

La versión en línea corre en **Render** (plan gratuito), con la base en
**MongoDB Atlas** (clúster gratuito) y los pagos en el sandbox de Stripe. La
configuración del servicio está en [`render.yaml`](render.yaml).

| Pieza | Servicio | Plan |
|-------|----------|------|
| App Next.js | Render, servicio web (Virginia) | Free |
| Base de datos | MongoDB Atlas, AWS N. Virginia (`us-east-1`) | Free (M0) |
| Pagos | Stripe, sandbox | Sin costo |

### Pasos

1. **Base.** Se puede usar el mismo clúster gratuito de Atlas de otro
   proyecto: la tienda usa su propia base, `ecommerce`. Hace falta la cadena
   `mongodb+srv://…` con la contraseña del usuario. En *Network Access* tiene
   que estar permitido `0.0.0.0/0`, porque Render gratis no tiene una IP fija.
2. **Código en GitHub.** Render no se conecta al GitLab de la academia, así
   que el repositorio se sube también a GitHub:
   `gh repo create casa-del-mate-santiago --public --source=. --remote=github --push`.
3. **Servicio.** En Render, *New → Blueprint* con el repositorio de GitHub.
   Render lee `render.yaml`, inventa `AUTH_SECRET` solo y pide tres
   secretos: `MONGODB_URI`, `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET`.
   Para este último, de momento cualquier texto: el valor real sale del paso 4.
4. **Webhook.** En Stripe (sandbox), *Desarrolladores → Webhooks → Agregar
   destino*:
   - URL: `https://<tu-servicio>.onrender.com/api/stripe/webhook`.
   - Eventos: `checkout.session.completed`,
     `checkout.session.async_payment_succeeded`,
     `checkout.session.async_payment_failed` y `checkout.session.expired`.
   - Copiá su *secreto de firma* (`whsec_…`) en `STRIPE_WEBHOOK_SECRET` en
     Render y guardá: Render vuelve a desplegar.
5. **Seed contra Atlas.** Desde tu máquina, con la cadena de Atlas:
   `MONGODB_URI='mongodb+srv://…' npm run seed`.
6. **Comprobar.** Hacé una compra en la URL pública. En Stripe, el evento
   tiene que aparecer en el webhook con respuesta **200**, y el pedido
   **Pagado** en el panel.

Comprobado en la versión publicada: la primera compra llegó al webhook sin
fallos (1 entrega, 0 fallidas, 854 ms con el servicio despierto).

Las URL de vuelta de Stripe se arman con el dominio público, que Render
expone solo en `RENDER_EXTERNAL_URL`. En otro servicio se fija con `APP_URL`.

### Lo que implica el plan gratuito

- **Render se duerme a los 15 minutos sin visitas.** La primera carga tarda
  alrededor de un minuto. Si Stripe llama al webhook justo mientras duerme,
  reintenta, y además la página de éxito confirma por su cuenta.
- **Atlas pausa el clúster tras 30 días sin conexiones.** Se reactiva desde
  su panel.

## Tests y cobertura

```bash
npm test                # 71 tests
npm run test:coverage   # con informe de cobertura (coverage/index.html)
npm run lint
npm run typecheck
```

| Métrica | Cobertura |
|---------|-----------|
| Líneas | 96,3 % |
| Ramas | 95,6 % |
| Funciones | 95,5 % |

La cobertura se mide sobre la lógica que no necesita servicios en marcha:
dinero, validación, carrito, estados del pedido, confirmación del pago, Stripe,
búsqueda, estadísticas, JWT, fotos, `proxy.ts`, el webhook y la subida de
fotos. Lo que prueban los
tests:

- **Confirmación del pago:** con una tienda en memoria que sigue las mismas
  reglas que MongoDB. Cubre el pago normal, el webhook y la página de éxito
  a la vez (el stock baja una sola vez) y el producto que se agota mientras
  el cliente paga (se devuelve el stock tomado y se reembolsa).
- **Webhook:** con firmas generadas por la librería de Stripe. Una firma de
  otro secreto, un cuerpo alterado o la falta de firma dan 400 y no marcan
  nada.
- **`proxy.ts`:** cada rol entra solo a lo suyo, y un JWT con el rol
  cambiado a mano no vale.

Las consultas de `lib/store/` se probaron de punta a punta en el navegador:
- registro y compra completa;
- intento de comprar más stock del que hay;
- un producto que se agota durante el pago (reembolso automático);
- cancelación con reembolso por el admin (el stock vuelve);
- crear y borrar productos;
- un cliente que intenta ver el pedido de otro (404) o entrar al panel.

## Decisiones de diseño

Cada decisión con su contexto, lo que se eligió y lo que trae.

### 1. Dinero en centavos enteros

- **Contexto.** `0.1 + 0.2` da `0.30000000000000004` en JavaScript. En una
  tienda, esos restos terminan en un total que no coincide con lo cobrado.
- **Decisión.** Todo se guarda y se calcula en centavos (`$ 6.800` es
  `680000`). Los precios que escribe el admin («12.500,50») se convierten
  leyendo el texto, sin `parseFloat`. Stripe trabaja igual: en ARS, el
  `unit_amount` va en centavos.
- **Consecuencias.** Las sumas son exactas y se pasan a Stripe sin
  convertir. Solo se formatea al mostrar, con el formato argentino.

### 2. Pesos argentinos

- **Contexto.** El enunciado habla de céntimos, pero la tienda es para
  Argentina.
- **Decisión.** Moneda `ars`, que Stripe acepta. El mínimo por cobro es el
  equivalente a 0,50 USD, muy por debajo de cualquier producto.
- **Consecuencias.** El cliente ve los mismos importes en la tienda y en
  Stripe.

### 3. El stock se descuenta al confirmarse el pago, no al ir a pagar

- **Contexto.** Hay dos momentos posibles. Reservar al ir a pagar es exacto,
  pero hay que devolver lo reservado cuando el cliente abandona, que es lo
  más común. Descontar al pagar es simple, pero dos clientes pueden pagar la
  última unidad.
- **Decisión.**
  - El stock se comprueba al agregar al carrito y al ir a pagar, y se
    descuenta cuando Stripe confirma el pago.
  - Cada descuento es atómico en MongoDB: `updateOne({ stock: { $gte: n } },
    { $inc: { stock: -n } })`, así que nunca queda negativo.
  - Si una línea no alcanza, se devuelve lo ya descontado, el pedido se
    cancela y **se reembolsa automáticamente**.
- **Consecuencias.** Nada que limpiar cuando alguien abandona el pago. El
  caso raro (otro se llevó la última unidad en esos minutos) termina con el
  dinero devuelto y el motivo explicado. Está probado en
  `tests/payments.test.ts`.

### 4. Confirmación idempotente: webhook y página de éxito

- **Contexto.** El webhook es la fuente fiable. Pero en local no llega sin la
  Stripe CLI, y en producción puede llegar tarde (Render dormido). La página
  de éxito puede preguntarle a Stripe, pero entonces los dos caminos pueden
  confirmar el mismo pago a la vez.
- **Decisión.** Los dos llaman a la misma función, que primero «reclama» el
  pedido de forma atómica. `findOneAndUpdate` busca un pedido `pending` con
  `paymentIntentId: null` y le escribe el `paymentIntentId`: solo el primero
  lo encuentra. El otro no hace nada.
- **Consecuencias.**
  - La compra se confirma con o sin webhook.
  - El stock nunca se descuenta dos veces.
  - La página de éxito no confía en la URL: consulta la sesión a Stripe y
    comprueba que el pedido sea de quien pregunta.

### 5. Carrito con id y cantidad; pedido con copia de nombre y precio

- **Contexto.** Los precios y el stock cambian.
- **Decisión.**
  - El carrito guarda solo qué productos y cuántos. Precio, nombre y stock
    se leen en cada visita, y las líneas con problemas (sin stock, menos
    stock, producto retirado) se muestran con el motivo y bloquean el pago.
  - El pedido, en cambio, guarda una copia de nombre y precio al comprar.
- **Consecuencias.**
  - Un cambio de precio se ve en el carrito *antes* de pagar.
  - Un pedido viejo dice siempre lo que se pagó, aunque el producto cambie o
    se borre. Por eso el admin puede borrar productos de verdad, o solo
    retirarlos del catálogo con «A la venta».

### 6. El rol en el JWT y comprobado en la base para el admin

- **Contexto.** `proxy.ts` se ejecuta antes de cada petición y tiene que ser
  rápido, sin consultar MongoDB.
- **Decisión.**
  - El rol viaja dentro del JWT firmado: si alguien lo edita, la firma deja
    de valer (hay un test que lo intenta).
  - Las rutas de la API del admin, además, confirman el rol en la base.
  - El registro siempre crea clientes: un campo `role` en el cuerpo se
    ignora. El único admin sale del seed, con el email y la contraseña de
    `.env.local`.
- **Consecuencias.** Quitarle el rol a alguien corta su acceso a la API al
  momento, sin esperar a que caduque su sesión de 7 días.

### 7. Pedidos pendientes que vencen solos

- **Contexto.** Si el cliente abandona el pago, el pedido queda `pending`.
- **Decisión.**
  - La sesión de Stripe vence a los 30 minutos (el mínimo de Stripe), y el
    webhook `checkout.session.expired` cancela el pedido.
  - Como respaldo, sin webhook, los pendientes de más de 31 minutos sin pago
    se cancelan al listar pedidos.
- **Consecuencias.** El panel no se llena de pendientes eternos. La
  cancelación nunca alcanza a un pedido cobrado, porque la condición exige
  `paymentIntentId: null`.

### 8. Fotos subidas desde la computadora, guardadas en MongoDB

- **Contexto.** El admin tiene las fotos en su computadora o en el celular.
  Pero la tienda se publica en el plan gratuito de Render, cuyo disco se
  borra en cada despliegue, y no hay almacenamiento S3 gratis sin tarjeta.
- **Decisión.**
  - **El navegador achica la foto antes de subirla:** lado mayor de
    1000 px, en WebP. Una foto de celular de 3 a 8 MB queda en unos 100 KB.
  - **Se guarda en MongoDB** (colección `images`) y se sirve en
    `/api/images/<id>`. Como una foto nunca cambia (cambiarla crea otra), se
    sirve con caché de un año.
  - **El servidor comprueba el tipo real por los primeros bytes** del
    archivo (JPG, PNG o WebP), no por el nombre ni por lo que diga el
    navegador, y acepta hasta 1,5 MB.
  - **Al cambiar o quitar la foto, o al borrar el producto,** la foto vieja
    se borra si ningún otro producto la usa.
  - **Sigue existiendo la opción de pegar una URL https**, y los productos
    de ejemplo usan ilustraciones SVG de `public/productos/`.
- **Consecuencias.**
  - Funciona igual en local y publicado, sin ningún servicio extra: en los
    512 MB gratuitos de Atlas entran miles de fotos.
  - Una foto subida y abandonada (el formulario se cancela) queda huérfana
    en la base. Con fotos de 100 KB no pesa; con mucho uso, se limpiaría
    con una tarea periódica.
  - Con mucho tráfico convendría un almacenamiento de archivos con CDN
    (S3, R2) en vez de la base.

La tipografía (Archivo, licencia OFL) está en `app/fonts/` en lugar de
descargarse de Google Fonts al compilar: así la compilación no depende de la
red.

### 9. Búsqueda sin tildes ni mayúsculas

- **Contexto.** «bombilla alpaca» tiene que encontrar «Bombilla de alpaca»,
  y «cafe», «Café».
- **Decisión.**
  - Cada palabra se convierte en una expresión regular escapada, con clases
    para las vocales acentuadas (`[aáàä]`).
  - Todas las palabras tienen que aparecer, en cualquier orden, en el
    nombre, la descripción o la categoría.
- **Consecuencias.** Escribir `(` o `.*` no rompe ni vacía la búsqueda (está
  probado). Con un catálogo chico basta. Con miles de productos convendría un
  índice de texto o Atlas Search.

### 10. Ventas por día en hora argentina

- **Contexto.** El servidor corre en UTC: una venta a las 23:30 del lunes en
  Argentina ya es martes en UTC.
- **Decisión.** El dashboard agrupa con `$dateToString` y
  `timezone: "America/Argentina/Buenos_Aires"`, y completa con cero los días
  sin ventas.
- **Consecuencias.** El gráfico coincide con el calendario del dueño. Cada
  barra muestra su valor al pasar el mouse o con el teclado, y hay una vista
  en tabla.

## Uso de IA

El proyecto se desarrolló con Claude como asistente de programación,
partiendo de la autenticación de VideoVault (JWT en cookie `httpOnly`, bcrypt
y la comparación contra un hash falso cuando el email no existe) y del manejo
de pesos de Reparto de Gastos. Antes de escribir código decidí:

- la moneda: pesos argentinos;
- cuándo se descuenta el stock: al confirmarse el pago;
- los extras: búsqueda y filtro por categoría, fotos de producto, cancelación
  con reembolso y gráfico de ventas;
- publicar la tienda, que es lo que en Screen Capture me había faltado para
  el 10.

Lo que se revisó y cambió sobre lo generado:

- **Antes de escribir se verificó en la documentación de Stripe** que ARS es
  una moneda aceptada, su mínimo por cobro, y que el sandbox funciona sin
  activar la cuenta (activarla pide datos de una empresa, y Argentina puede
  no estar entre los países).
- **El caso de los dos caminos de confirmación** (webhook y página de éxito)
  se diseñó idempotente desde el principio. Se probó también el caso raro del
  producto que se agota durante el pago, con reembolso automático.
- **La compilación encontró tres problemas** que se corrigieron:
  - Next.js intentaba prerenderizar páginas que leen la base y usan la hora
    actual: se marcaron como dinámicas.
  - La navegación del panel leía la URL fuera de un `Suspense`.
  - La fuente no se podía descargar al compilar: se incluyó en el
    repositorio.
- **La prueba en el navegador encontró que la lista de pedidos del admin**
  se quedaba en «Cargando…» por el mismo motivo de la hora actual. Se
  corrigió y se volvió a probar.
- **Las fotos al principio solo se podían poner por URL.** Al probar la
  tienda noté que un admin tiene las fotos en la computadora, no en
  internet. Se agregó la subida, guardando en MongoDB porque el plan gratuito
  de Render no conserva archivos (ver la decisión 8), y se probó en el
  navegador:
  - una foto de 3000 × 2000 quedó en 1000 × 667 y 6 KB;
  - un archivo de texto se rechaza;
  - al quitar la foto, la vieja se borra;
  - un cliente no puede subir fotos.
- **Páginas escondidas en vez de cerradas.** Con Cache Components,
  Next.js esconde las páginas que dejás y, al volver, las muestra como
  quedaron. Es lo mismo que pasó en VideoVault con el formulario de subida.
  - El carrito se relee cada vez que se muestra.
  - En la prueba encontré que, al guardar un producto y volver a editarlo, el
    botón seguía en «Guardando…»; y al salir de la sesión y volver a
    ingresar, en «Un momento…». Los dos formularios vuelven a cero al
    esconderse, y se probó en el navegador guardando dos veces seguidas y
    saliendo y entrando.
