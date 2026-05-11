import { createBrowserRouter, Navigate } from "react-router";
import { Root } from "./components/Root";
import { Welcome } from "./components/Welcome";
import { Login } from "./components/Login";
import { Home } from "./components/Home";
import { Tree } from "./components/Tree";
import { Settings } from "./components/Settings";
import { StudyRoom } from "./components/StudyRoom";
import { RoutineReview } from "./components/RoutineReview";
import { BreakScreen } from "./components/BreakScreen";
import { DoneForToday } from "./components/DoneForToday";
import { FocusSession } from "./components/FocusSession";
import { Log } from "./components/Log";
import {
  StartTime,
  Subjects,
  FocusLength,
  BreakLength,
  StudyMode,
} from "./components/setup";

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
        { path: 'login',   Component: Login   },

        /* Routine setup wizard */
        { path: 'setup/start-time',   Component: StartTime  },
        { path: 'setup/subjects',     Component: Subjects   },
        { path: 'setup/focus-length', Component: FocusLength },
        { path: 'setup/break-length', Component: BreakLength },
        { path: 'setup/mode',         Component: StudyMode  },

        { path: 'routine', Component: RoutineReview },
        { path: 'room',    Component: StudyRoom    },
        { path: 'session', Component: FocusSession },
        { path: 'break',   Component: BreakScreen  },
        { path: 'done',    Component: DoneForToday },

        { path: 'garden',  Component: Tree     },
        { path: 'log',     Component: Log      },
        { path: 'settings', Component: Settings },

        /* Redirects from the old PULL routes so deep-links still work. */
        { path: 'ownership',    element: <Navigate to="/setup/start-time"   replace /> },
        { path: 'pace',         element: <Navigate to="/setup/focus-length" replace /> },
        { path: 'note',         element: <Navigate to="/setup/subjects"     replace /> },
        { path: 'build',        element: <Navigate to="/routine"            replace /> },
        { path: 'pull',         element: <Navigate to="/session"            replace /> },
        { path: 'save',         element: <Navigate to="/done"               replace /> },
        { path: 'tree',         element: <Navigate to="/garden"             replace /> },
        { path: 'widget-setup', element: <Navigate to="/routine"            replace /> },
      ],
    },
  ],
  basename ? { basename } : {},
);
