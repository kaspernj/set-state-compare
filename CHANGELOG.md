# Changelog

## Unreleased
- Use reference-based comparison for state updates and cache dependencies via new `referenceDifferent` and `arrayReferenceDifferent` helpers to match React behavior and avoid deep compares.
- Add coverage for shape components, useShape, mode rendering, and debug paths.
- Add `cacheStatic` to `ShapeComponent` for class-level caching.
- Add README with module usage and API overview.
- Ensure `cacheStatic` only evaluates suppliers when dependencies change.
- Clarify that `ShapeComponent.setup()` runs before each render.
- Note that `ShapeComponent.setup()` is the recommended place for hook-style helpers.
