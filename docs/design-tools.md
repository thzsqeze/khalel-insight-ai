# Design tools for UniVoice

Tool setup checked on 27 October 2026. MCP servers help inspect references and compose interfaces; installing them does not change the site's design.

## Available in this Codex environment

- **Pencil**: registered, but the latest attempt to use it could not connect to the editor transport. Use the standalone browser preview for the current layout review; do not treat registration as a working editor connection.
- **UI UX Pro**: search focused patterns, accessibility guidance and stack-specific recommendations. Broad generated design systems need editorial review; retain UniVoice's existing identity.
- **Context7**: check current component and framework documentation. Local Next.js documentation in `node_modules/next/dist/docs/` still takes priority under `AGENTS.md`.
- **shadcn MCP 4.22.1**: added to the user's Codex configuration. Its stdio initialization and tools inventory were verified. Restart Codex to make the newly configured server available to conversations. It provides registry search, component inspection, examples and audit guidance. No application components were replaced or installed by this setup.

To reproduce the shadcn connection on another machine with Codex and Node installed:

```bash
codex mcp add shadcn -- npx -y shadcn@4.22.1 mcp
```

The project already has `components.json` using the `new-york` style, CSS variables and the existing aliases. Do not reinitialize the application or replace custom components with a generic dashboard. Review the source and dependencies of any registry item before adding it. See the [official shadcn MCP documentation](https://ui.shadcn.com/docs/mcp).

Product Design was suggested in the plugin catalog but has not been confirmed installed. Figma is only useful once a specific design file or shared component library is available.

## Next focused design pass

Start with one Pencil composition of the administrator dashboard at desktop width in Russian and at mobile width in Kazakh. Use real records or the existing empty states, never invented metrics. Check these improvements before implementing:

1. Make reports awaiting review the primary action; place secondary charts below the work queue.
2. Retain the warm paper background and forest green identity. Use a restrained contrasting treatment for the review queue instead of making every surface identical.
3. Raise small navigation and metadata text to at least 12–13 px, and report text to 14 px. Check Kazakh wrapping and keyboard focus.
4. Darken muted text where contrast is insufficient, and restore visible focus for interactive chart elements.
5. Make chart bars and labels readable. In a new database, show one useful onboarding state instead of several empty charts.

These are review priorities, not implemented changes. The existing design rationale and references remain in [univoice-design.md](univoice-design.md).
