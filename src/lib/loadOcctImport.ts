import occtWasmUrl from "occt-import-js/dist/occt-import-js.wasm?url"

type OcctImportParams = {
  linearUnit?: "millimeter" | "centimeter" | "meter" | "inch" | "foot"
  linearDeflectionType?: "bounding_box_ratio" | "absolute_value"
  linearDeflection?: number
  angularDeflection?: number
}

export type OcctMesh = {
  name: string
  color?: [number, number, number]
  attributes: {
    position: { array: number[] }
    normal?: { array: number[] }
  }
  index: { array: number[] }
}

type OcctImportResult = {
  success: boolean
  meshes: OcctMesh[]
}

type OcctImport = {
  ReadStepFile(
    content: ArrayBufferView | ArrayBuffer,
    params: OcctImportParams | null,
  ): OcctImportResult
}

type OcctImportModuleConfig = {
  locateFile?: (path: string, scriptDirectory?: string) => string
}

type OcctImportFactory = (
  config?: OcctImportModuleConfig,
) => Promise<OcctImport>

let occtImportPromise: Promise<OcctImport> | undefined

function resolveOcctFactory(candidate: unknown): OcctImportFactory {
  if (typeof candidate === "function") {
    return candidate as OcctImportFactory
  }
  if (
    candidate &&
    typeof candidate === "object" &&
    "default" in candidate &&
    typeof (candidate as { default: unknown }).default === "function"
  ) {
    return (candidate as { default: unknown }).default as OcctImportFactory
  }
  throw new Error("Unable to resolve occt-import-js factory export")
}

function wasmAssetHref(): string {
  const url = occtWasmUrl as string | { default: string }
  const raw = typeof url === "string" ? url : url.default
  return raw.replace(/\?url$/, "")
}

export async function loadOcctImport(): Promise<OcctImport> {
  if (!occtImportPromise) {
    const imported = await import("occt-import-js")
    const factory = resolveOcctFactory(
      "default" in imported ? imported.default : imported,
    )
    const wasmHref = wasmAssetHref()
    const assetBase =
      wasmHref.lastIndexOf("/") >= 0
        ? wasmHref.slice(0, wasmHref.lastIndexOf("/") + 1)
        : wasmHref
    occtImportPromise = factory({
      locateFile(path: string) {
        if (path === "occt-import-js.wasm" || path.endsWith("occt-import-js.wasm")) {
          return wasmHref
        }
        const relative = path.replace(/^\.\//, "")
        return `${assetBase}${relative}`
      },
    })
  }
  return occtImportPromise
}
