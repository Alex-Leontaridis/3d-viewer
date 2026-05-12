import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["./src/index.tsx"],
  platform: "neutral",
  format: "esm",
  dts: true,
  external: ["react", "react-dom"],
  /** Ship WASM from the dependency; keep bare `occt-import-js` external (see tsup prod-dep externals). */
  noExternal: [/^occt-import-js\/dist\/occt-import-js\.wasm(\?url)?$/],
  loader: { ".wasm": "file" },
  bundle: true,
  splitting: true,
  clean: true,
})
