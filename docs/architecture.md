# Architecture

CursorBuild uses npm workspaces to keep runtime responsibilities separated.

- **@cursorbuild/core** is framework-agnostic: configuration, engine lifecycle, cursor identity registry, GSAP timeline ownership, ScrollTrigger ownership, and explicit action sequencing.
- **@cursorbuild/react** provides a provider and hooks for sharing an engine and subscribing to cursor registry changes.
- **apps/demo** is a Vite playground that exercises the real cursor registry API.
- **docs** contains architecture and roadmap notes.

## Design boundaries

The core owns state and orchestration, not application-specific markup or styling. Cursor identities are data; rendering, pointer interpolation, presence transport, and collaboration protocols are future adapters. Animation and scroll managers own and dispose the GSAP resources they create. Action sequences execute caller-supplied actions in order and do not pretend to perform browser interactions automatically. React is optional; vanilla TypeScript consumers can use the core package directly.

## Extension approach

Add behaviour behind focused modules and typed public interfaces. Keep DOM measurement and rendering at adapter boundaries, avoid global mutable state, and provide deterministic unit tests for non-visual logic. Browser-dependent features must document lifecycle and reduced-motion behaviour.
