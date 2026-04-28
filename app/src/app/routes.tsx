import { createBrowserRouter, Navigate } from "react-router";
import { Root } from "./components/Root";
import { Welcome } from "./components/Welcome";
import { Ownership } from "./components/Ownership";
import { Pace } from "./components/Pace";
import { Note } from "./components/Note";
import { Pull } from "./components/Pull";
import { Build } from "./components/Build";
import { Save } from "./components/Save";
import { Home } from "./components/Home";
import { Session } from "./components/Session";
import { Tree } from "./components/Tree";
import { Settings } from "./components/Settings";

const basename =
  import.meta.env.BASE_URL.replace(/\/$/, "") === ""
    ? undefined
    : import.meta.env.BASE_URL.replace(/\/$/, "");

/** GitHub Pages serves the SPA from a subpath; basename must match vite `base`. */
export const router = createBrowserRouter(
  [
    {
      path: '/',
      Component: Root,
      children: [
        { index: true, Component: Home },
        { path: 'welcome', Component: Welcome },
        { path: 'ownership', Component: Ownership },
        { path: 'pace', Component: Pace },
        { path: 'note', Component: Note },
        { path: 'pull', Component: Pull },
        { path: 'build', Component: Build },
        { path: 'save', Component: Save },
        // Legacy route — WidgetSetup removed; selection lives in Build.
        { path: 'widget-setup', element: <Navigate to="/build" replace /> },
        { path: 'session', Component: Session },
        { path: 'tree', Component: Tree },
        { path: 'log', Component: Settings },
      ],
    },
  ],
  basename ? { basename } : {},
);
