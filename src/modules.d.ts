declare module "@jscad/stl-serializer" {
  export function serialize(options: any, objects: any[]): any[]
}

declare module "occt-import-js" {
  const factory: (config?: {
    locateFile?: (path: string, scriptDirectory?: string) => string
  }) => Promise<unknown>
  export default factory
}

declare module "occt-import-js/dist/occt-import-js.wasm?url" {
  const url: string
  export default url
}
