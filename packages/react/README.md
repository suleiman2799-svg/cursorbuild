# @cursorbuild/react

Optional React provider and hooks for the CursorBuild animation engine. The core package remains framework-independent.

## Install

```bash
npm install @cursorbuild/react react
```

The React package installs the matching `@cursorbuild/core` workspace dependency automatically.

## Quick start

Import the core stylesheet once in your application, then wrap the part of the app that uses CursorBuild:

```tsx
import "@cursorbuild/core/cursor-renderer.css";
import {
  CursorBuildProvider,
  useCursorBuild,
  useCursors
} from "@cursorbuild/react";

function CollaboratorCount() {
  const engine = useCursorBuild();
  const cursors = useCursors();

  return <p>{cursors.length} collaborators</p>;
}

export function App() {
  return (
    <CursorBuildProvider>
      <CollaboratorCount />
    </CursorBuildProvider>
  );
}
```

`CursorBuildProvider` creates and disposes the engine. `useCursorBuild()` returns the engine instance and `useCursors()` subscribes to the cursor registry.

## Requirements

- React 18 or React 19.
- A browser environment for DOM rendering and animation.
- The core engine can also be used directly without React.

## Documentation

See the [CursorBuild repository README](https://github.com/suleiman2799-svg/cursorbuild#readme) and [React package source](https://github.com/suleiman2799-svg/cursorbuild/tree/main/packages/react/src).

## License

MIT.
