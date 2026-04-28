# PULL — integrated app

This project merges two sources:

1. The **Figma Make 2D-iPhone template** (Tailwind v4, shadcn/ui, motion,
   react-router v7, AppContext-driven onboarding flow + iPhone-shaped
   shell with notch + AnimatePresence transitions).
2. The three **PULL design HTML prototypes** (`legacy/index.html`,
   `legacy/reflection.html`, `legacy/history.html`) — visual language and
   interactions ported into the corresponding template screens.

## What was integrated where

| Template screen           | Source design                       | What got merged                                                                                             |
| ------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `Pull.tsx` (`/pull`)      | `legacy/index.html`                 | WebGL ambient backdrop, dynamic island, elastic-string SVG with spring math, "you are here" reveal note, ambient cards |
| `Save.tsx` (`/save`)      | `legacy/reflection.html`            | Reflection-style closing layout: italic Newsreader note, two glassy stat cards, "Session complete" island, calmer backdrop |
| `Log.tsx` (`/log`)        | `legacy/history.html`               | Cinematic timeline: dotted vertical spine, time column with dot nodes, glassy log cards                     |
| `CanvasBackground.tsx`    | shared from all three originals     | Reusable WebGL fragment-shader background (`speed`, `showAccent` props)                                     |

The template's onboarding flow (`Welcome → Ownership → Pace → Note → Build →
Pull → Save → WidgetSetup → Home → Session → Tree`) and `AppContext` are
unchanged — `Pull.tsx` still calls `setIsLinePulled(true)` and routes to
`/save`, and `Save.tsx` still calls `saveCurrentRoute` and routes to
`/widget-setup`.

## Run

```bash
npm install
npm run dev      # vite serves at http://127.0.0.1:5173
npm run build
npm run typecheck
```

## Project layout

```
app/
├── index.html               # Vite entry
├── src/
│   ├── main.tsx             # mount <App />
│   ├── app/
│   │   ├── App.tsx          # AppProvider + RouterProvider
│   │   ├── routes.tsx       # createBrowserRouter w/ all routes
│   │   ├── context/AppContext.tsx
│   │   └── components/
│   │       ├── Root.tsx               # iPhone-shaped shell + AnimatePresence
│   │       ├── CanvasBackground.tsx   # NEW — shared WebGL backdrop
│   │       ├── Pull.tsx               # MERGED with index.html
│   │       ├── Save.tsx               # MERGED with reflection.html
│   │       ├── Log.tsx                # MERGED with history.html
│   │       ├── Welcome.tsx, Note.tsx, Build.tsx, Session.tsx, Tree.tsx, …
│   │       └── ui/                    # shadcn/ui primitives
│   └── styles/
│       ├── index.css        # entry — imports the three below
│       ├── theme.css        # Tailwind v4 theme + PULL palette tokens + .note-revealed override
│       ├── tailwind.css
│       └── fonts.css
└── (template root files: vite.config.ts, postcss.config.mjs, default_shadcn_theme.css, …)
```

The three original HTML prototypes are preserved one level up at
`../legacy/` for reference.
