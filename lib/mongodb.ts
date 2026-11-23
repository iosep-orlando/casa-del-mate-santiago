import { MongoClient, type Db } from "mongodb";

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

// Un único cliente por proceso. En desarrollo se guarda en globalThis porque
// la recarga en caliente vuelve a ejecutar los módulos y abriría una conexión
// nueva en cada cambio.
function getClient(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Falta la variable de entorno "MONGODB_URI"');
  global._mongoClientPromise ??= new MongoClient(uri).connect();
  return global._mongoClientPromise;
}

/**
 * Nombre de la base: MONGODB_DB si está; si no, el que lleve la URI
 * (mongodb://localhost:27017/ecommerce); si tampoco, "ecommerce". La URI del
 * enunciado (mongodb://localhost:27017) no lleva ninguno.
 */
export function databaseName(uri: string | undefined, explicit: string | undefined): string {
  if (explicit) return explicit;
  const match = uri?.match(/^mongodb(?:\+srv)?:\/\/[^/]+\/([^?]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : "ecommerce";
}

export async function getDb(): Promise<Db> {
  const client = await getClient();
  return client.db(databaseName(process.env.MONGODB_URI, process.env.MONGODB_DB));
}

/** Para el script de seed: cierra la conexión y deja terminar el proceso. */
export async function closeDb(): Promise<void> {
  const client = await global._mongoClientPromise;
  await client?.close();
  global._mongoClientPromise = undefined;
}
