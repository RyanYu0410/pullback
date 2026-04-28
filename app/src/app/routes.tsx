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

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: Home },
      { path: "welcome", Component: Welcome },
      { path: "ownership", Component: Ownership },
      { path: "pace", Component: Pace },
      { path: "note", Component: Note },
      { path: "pull", Component: Pull },
      { path: "build", Component: Build },
      { path: "save", Component: Save },
      // Legacy route — the WidgetSetup page is gone; selection is in Build now.
      { path: "widget-setup", element: <Navigate to="/build" replace /> },
      { path: "session", Component: Session },
      { path: "tree", Component: Tree },
      { path: "log", Component: Settings },
    ],
  },
]);
