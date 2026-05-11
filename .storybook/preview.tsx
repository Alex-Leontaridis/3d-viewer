import type { Preview, StoryContext, StoryFn } from "@storybook/react"
import EmptyThreeView from "../src-new/EmptyThreeView"

const withContainer = (Story: StoryFn) => (
  <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
    <Story />
  </div>
)

const withLibraryToggle = (Story: StoryFn, context: StoryContext) => {
  const library = context.globals.library ?? "old"
  if (library === "new") {
    return <EmptyThreeView />
  }
  return <Story />
}

const preview: Preview = {
  globalTypes: {
    library: {
      description: "Viewer implementation",
      toolbar: {
        title: "Library",
        icon: "component",
        items: [
          { value: "old", title: "Old library" },
          { value: "new", title: "New library" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    library: "old",
  },
  parameters: {
    actions: { argTypesRegex: "^on[A-Z].*" },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
  },
  decorators: [withContainer, withLibraryToggle],
}

export default preview
