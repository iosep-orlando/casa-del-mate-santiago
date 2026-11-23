import { collections, userToDTO } from "@/lib/db";
import { jsonError, readJson } from "@/lib/api";
import { verifyAgainstDummy, verifyPassword } from "@/lib/password";
import { startSession } from "@/lib/session";
import { validateLogin } from "@/lib/validation";

// El mismo mensaje si el email no existe y si la contraseña está mal: no se
// revela qué emails tienen cuenta.
const WRONG = "Email o contraseña incorrectos.";

export async function POST(request: Request) {
  const body = await readJson(request);
  if (!body) return jsonError(400, "Cuerpo JSON inválido.");
  const input = validateLogin(body);
  if (!input.ok) return jsonError(400, input.error);
  const { email, password } = input.value;

  const { users } = await collections();
  const user = await users.findOne({ email });
  // Si el usuario no existe, se compara igual contra un hash cualquiera: así
  // la respuesta tarda lo mismo en los dos casos.
  const ok = user ? await verifyPassword(password, user.passwordHash) : await verifyAgainstDummy(password);
  if (!user || !ok) return jsonError(401, WRONG);

  const dto = userToDTO(user);
  await startSession({ sub: dto.id, email: dto.email, name: dto.name, role: dto.role });
  return Response.json({ user: dto });
}
