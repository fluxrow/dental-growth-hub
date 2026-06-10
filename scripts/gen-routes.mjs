#!/usr/bin/env node
/**
 * Pre-dev/build hook — gera src/routeTree.gen.ts antes do Vite iniciar.
 *
 * O plugin do TanStack Router já regenera o arquivo durante o dev, mas se
 * ele estiver ausente (apagado por engano, checkout sujo, etc.) o Vite
 * falha em resolver `./routeTree.gen` ANTES do plugin rodar. Esse script
 * garante que o arquivo exista antes do servidor subir.
 */
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(root, "src", "routeTree.gen.ts");

try {
  const { Generator } = await import("@tanstack/router-generator");
  const { getConfig } = await import("@tanstack/router-generator");
  const config = await getConfig({}, root);
  const generator = new Generator({ config, root });
  await generator.run();
  if (existsSync(target)) {
    console.log("[gen-routes] routeTree.gen.ts pronto.");
  } else {
    console.warn("[gen-routes] generator rodou mas o arquivo não foi criado.");
  }
} catch (err) {
  console.error("[gen-routes] falha ao gerar routeTree.gen.ts:", err?.message ?? err);
  process.exitCode = 1;
}
