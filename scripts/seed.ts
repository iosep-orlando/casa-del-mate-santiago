// Datos iniciales: el catálogo de ejemplo y el usuario admin.
//
//   npm run seed
//
// Lee .env.local. El admin sale de ADMIN_EMAIL y ADMIN_PASSWORD: la
// contraseña no está escrita en el repositorio. Se puede correr las veces que
// haga falta: los productos que ya existen (por nombre) no se tocan, así no
// se pisa el stock después de vender; al admin se le pone la contraseña de
// .env.local, así también sirve para recuperarla.
import { collections, type ProductDoc } from "../lib/db";
import { closeDb } from "../lib/mongodb";
import { hashPassword } from "../lib/password";
import { validateRegistration } from "../lib/validation";

type Seed = Pick<ProductDoc, "name" | "description" | "price" | "stock" | "category" | "imageUrl">;

// Precios en centavos: 680000 = $ 6.800.
const PRODUCTS: Seed[] = [
  { category: "Yerbas", name: "Yerba mate tradicional 1 kg", price: 680000, stock: 40, imageUrl: "/productos/yerba.svg",
    description: "Con palo, estacionada 24 meses. Sabor parejo y espuma que dura." },
  { category: "Yerbas", name: "Yerba mate suave 500 g", price: 390000, stock: 25, imageUrl: "/productos/yerba.svg",
    description: "Molienda despalada, para quienes recién empiezan o la toman a la mañana." },
  { category: "Yerbas", name: "Yerba con hierbas serranas 500 g", price: 450000, stock: 2, imageUrl: "/productos/yerba.svg",
    description: "Con peperina, menta y burrito. Quedan muy pocas." },
  { category: "Mates", name: "Mate de calabaza forrado en cuero", price: 1850000, stock: 12, imageUrl: "/productos/mate.svg",
    description: "Calabaza curada a mano, forro de cuero vacuno cosido y virola de alpaca." },
  { category: "Mates", name: "Mate de algarrobo", price: 1490000, stock: 8, imageUrl: "/productos/mate.svg",
    description: "Madera de algarrobo torneada. No necesita curado largo: un par de cebadas y listo." },
  { category: "Mates", name: "Mate imperial con virola cincelada", price: 6500000, stock: 0, imageUrl: "/productos/mate.svg",
    description: "Calabaza seleccionada con virola de alpaca cincelada a mano. Vuelve a entrar en diciembre." },
  { category: "Bombillas", name: "Bombilla de alpaca pico de loro", price: 1200000, stock: 15, imageUrl: "/productos/bombilla.svg",
    description: "Filtro de cuchara desmontable para limpiarla bien." },
  { category: "Bombillas", name: "Bombilla de acero inoxidable", price: 650000, stock: 30, imageUrl: "/productos/bombilla.svg",
    description: "Resorte en la punta: no se tapa con yerba fina." },
  { category: "Termos", name: "Termo de acero 1 litro", price: 5800000, stock: 6, imageUrl: "/productos/termo.svg",
    description: "Pico cebador de precisión. Mantiene el agua a 80 °C más de 12 horas." },
  { category: "Termos", name: "Termo de acero 500 ml", price: 3900000, stock: 3, imageUrl: "/productos/termo.svg",
    description: "Para la mochila o el escritorio. Mismo pico cebador que el de un litro." },
  { category: "Accesorios", name: "Matera de cuero", price: 4200000, stock: 5, imageUrl: "/productos/matera.svg",
    description: "Lleva termo de un litro, mate, yerbera y azucarera. Correa regulable." },
  { category: "Accesorios", name: "Yerbera y azucarera de lata", price: 980000, stock: 20, imageUrl: "/productos/accesorio.svg",
    description: "Par de latas con tapa a presión, para que la yerba no tome humedad." },
];

async function main() {
  const { users, products } = await collections();

  const now = new Date();
  let inserted = 0;
  for (const product of PRODUCTS) {
    const { upsertedCount } = await products.updateOne(
      { name: product.name },
      { $setOnInsert: { ...product, active: true, createdAt: now, updatedAt: now } },
      { upsert: true },
    );
    inserted += upsertedCount;
  }
  console.log(`Productos: ${inserted} nuevos, ${PRODUCTS.length - inserted} ya estaban.`);

  const admin = validateRegistration({
    name: process.env.ADMIN_NAME ?? "Admin",
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  });
  if (!admin.ok) {
    console.error(`Admin no creado: ${admin.error} Poné ADMIN_EMAIL y ADMIN_PASSWORD en .env.local.`);
    process.exitCode = 1;
    return;
  }
  const { email, name, password } = admin.value;
  const { upsertedCount } = await users.updateOne(
    { email },
    {
      $set: { role: "admin", passwordHash: await hashPassword(password) },
      $setOnInsert: { email, name, createdAt: now },
    },
    { upsert: true },
  );
  console.log(upsertedCount ? `Admin creado: ${email}` : `Admin actualizado: ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(closeDb);
