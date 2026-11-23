import { collections, isDuplicateKey, type UserDoc } from "@/lib/db";
import { jsonError, readJson } from "@/lib/api";
import { hashPassword } from "@/lib/password";
import { startSession } from "@/lib/session";
import { validateRegistration } from "@/lib/validation";

// Registro de clientes. El rol lo pone el servidor, siempre "customer": el
// único admin lo crea scripts/seed.ts. Un campo "role" en el cuerpo se ignora.
export async function POST(request: Request) {
  const body = await readJson(request);
  if (!body) return jsonError(400, "Cuerpo JSON inválido.");
  const input = validateRegistration(body);
  if (!input.ok) return jsonError(400, input.error);
  const { name, email, password } = input.value;

  const { users } = await collections();
  const doc: UserDoc = {
    email,
    name,
    // Solo se guarda el hash, nunca la contraseña.
    passwordHash: await hashPassword(password),
    role: "customer",
    createdAt: new Date(),
  };
  try {
    const { insertedId } = await users.insertOne(doc);
    const user = { id: insertedId.toString(), email, name, role: doc.role };
    await startSession({ sub: user.id, email, name, role: doc.role });
    return Response.json({ user }, { status: 201 });
  } catch (err) {
    // El índice único decide, aunque dos registros lleguen a la vez.
    if (isDuplicateKey(err)) return jsonError(409, "Ya hay una cuenta con ese email. Iniciá sesión.");
    throw err;
  }
}
