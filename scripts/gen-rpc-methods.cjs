/* eslint-disable @typescript-eslint/no-require-imports -- standalone Node CommonJS script */
/**
 * Generates src/server/rpc-methods.json: the exact list of methods the RPC endpoint may call,
 * read from the service interfaces (so private helper methods of the classes are never reachable).
 * Usage: node scripts/gen-rpc-methods.cjs
 */
const ts = require("typescript");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..", "src", "services");
const program = ts.createProgram([path.join(root, "registry-types.ts")], { noEmit: true, skipLibCheck: true });
const checker = program.getTypeChecker();
const file = program.getSourceFile(path.join(root, "registry-types.ts"));

const shape = file.statements.find((s) => ts.isInterfaceDeclaration(s) && s.name.text === "ServiceRegistryShape");
const out = {};
for (const member of shape.members) {
  const service = member.name.text;
  const type = checker.getTypeAtLocation(member.type);
  out[service] = type
    .getProperties()
    .filter((p) => {
      const t = checker.getTypeOfSymbolAtLocation(p, member);
      return t.getCallSignatures().length > 0;
    })
    .map((p) => p.getName())
    .sort();
}
const target = path.join(__dirname, "..", "src", "server", "rpc-methods.json");
fs.writeFileSync(target, JSON.stringify(out, null, 2) + "\n");
console.log("rpc methods:", Object.entries(out).map(([k, v]) => `${k}=${v.length}`).join(" "));
