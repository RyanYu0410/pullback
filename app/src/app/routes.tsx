import { createBrowserRouter, Navigate } from "react-router";
import { Root } from "./components/Root";
import { Welcome } from "./components/Welcome";
import { Safety } from "./components/Safety";
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
import { ContinueFocus } from "./components/ContinueFocus";
import { LoFiHub } from "./components/LoFiHub";
import { LoFiPreview } from "./components/LoFiPreview";
import { LoFiSave } from "./components/LoFiSave";
import { LoFiLog } from "./components/LoFiLog";
import { LoFiWelcome } from "./components/LoFiWelcome";
import { LoFiLogin } from "./components/LoFiLogin";
import { LoFiSetup } from "./components/LoFiSetup";
import { LoFiRoutine } from "./components/LoFiRoutine";
import { LoFiRoom } from "./components/LoFiRoom";
import { LoFiSession } from "./components/LoFiSession";
import { LoFiBreak } from "./components/LoFiBreak";
import { LoFiContinue } from "./components/LoFiContinue";
import { LoFiDone } from "./components/LoFiDone";
import { LoFiGarden } from "./components/LoFiGarden";
import { LoFiSettings } from "./components/LoFiSettings";
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
        { path: 'safety',  Component: Safety  },
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
        { path: 'break',    Component: BreakScreen   },
        { path: 'continue', Component: ContinueFocus },
        { path: 'done',     Component: DoneForToday  },

        { path: 'garden',  Component: Tree     },
        { path: 'log',     Component: Log      },
        { path: 'settings', Component: Settings },

        /* Standalone lofi wireframe suite — one sketch per hi-fi page.
           Reached only via /lofi (Settings → Lofi wireframe). Pages link
           only among themselves (plus back to Settings from the hub). */
        { path: 'lofi',          Component: LoFiHub      },
        { path: 'lofi-welcome',  Component: LoFiWelcome  },
        { path: 'lofi-login',    Component: LoFiLogin    },
        { path: 'lofi-setup',    Component: LoFiSetup    },
        { path: 'lofi-routine',  Component: LoFiRoutine  },
        { path: 'lofi-room',     Component: LoFiRoom     },
        { path: 'lofi-session',  Component: LoFiSession  },
        { path: 'lofi-break',    Component: LoFiBreak    },
        { path: 'lofi-continue', Component: LoFiContinue },
        { path: 'lofi-done',     Component: LoFiDone     },
        { path: 'lofi-garden',   Component: LoFiGarden   },
        { path: 'lofi-log',      Component: LoFiLog      },
        { path: 'lofi-settings', Component: LoFiSettings },
        { path: 'lofi-preview',  Component: LoFiPreview  },
        { path: 'lofi-save',     Component: LoFiSave     },

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
