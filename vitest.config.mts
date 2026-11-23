import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    env: {
      AUTH_SECRET: "secreto-solo-para-tests",
      STRIPE_SECRET_KEY: "sk_test_solo_para_tests",
      STRIPE_WEBHOOK_SECRET: "whsec_solo_para_tests",
    },
    coverage: {
      provider: "v8",
      // La lógica que se prueba sin MongoDB ni Stripe en marcha. Los
      // ficheros de lib/store/ son consultas a MongoDB: se prueban a mano
      // contra la base (ver README).
      include: [
        "lib/money.ts",
        "lib/validation.ts",
        "lib/cart.ts",
        "lib/orders.ts",
        "lib/payments.ts",
        "lib/stripe.ts",
        "lib/search.ts",
        "lib/stats.ts",
        "lib/jwt.ts",
        "lib/navigation.ts",
        "lib/catalog.ts",
        "lib/format.ts",
        "lib/mongodb.ts",
        "proxy.ts",
        "lib/images.ts",
        "app/api/stripe/webhook/route.ts",
        "app/api/admin/images/route.ts",
      ],
      reporter: ["text", "text-summary", "cobertura", "html"],
    },
  },
});
