import React, { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import type { SessionStatus } from '../design/palettes';

export type CardType = 'app' | 'red' | 'green' | 'yellow' | 'blue' | 'white';

export interface RouteItem {
  id: string;
  type: CardType;
  label: string;
}

/** A single user-added task nested under a subject (RouteItem). */
export interface SubTask {
  id: string;
  subjectId: string;
  label: string;
}

export interface SavedRoute {
  id: string;
  name: string;
  pace: string;
  paceMinutes: number | null;
  note: string;
  items: RouteItem[];
  reflections: string[];
  createdAt: number;
  lastUsedAt?: number;
  uses: number;
}

/** User-selectable layout preset, picked in Build. */
export type WidgetPreset =
  | 'selfCheckin'
  | 'intentionalInterface'
  | 'softIos'
  | 'intentionRitual';

/**
 * App-wide background style, chosen in Settings.
 */
export type BgStyle = 'void' | 'cosmos' | 'clay' | 'honey' | 'steel' | 'iris';

export function isDarkBg(style: BgStyle): boolean {
  return style === 'void' || style === 'cosmos';
}

/* --------------------------------------------------------------------- */
/* Study-room layer — mocked friends + routine                            */
/* --------------------------------------------------------------------- */

export type FriendStatus =
  | 'focusing'
  | 'on_break'
  | 'finished'
  | 'needs_help'
  | 'offline';

export interface Friend {
  id: string;
  name: string;
  emoji: string;
  status: FriendStatus;
  subject?: string;
  /** Minutes left in their current focus block (only meaningful if focusing/on_break). */
  minutesLeft?: number;
  /** True when this friend has just sent the user a wave/cheer. */
  waving?: boolean;
  /**
   * Stable seat position around the study-room table, in 0..1 coords.
   * `RoomScene` uses these to keep each friend in the same chair across
   * status changes, so the room feels like a real space rather than a
   * shuffling list.
   */
  seat: { x: number; y: number };
}

/* --------------------------------------------------------------------- */
/* Room chatter — a tiny rolling feed of "who just did what" so the      */
/* room feels alive even when nothing is happening to the user.          */
/* --------------------------------------------------------------------- */

export type RoomEventKind =
  | 'wave'
  | 'started_focus'
  | 'started_break'
  | 'finished'
  | 'asked_help'
  | 'arrived'
  | 'left';

export interface RoomEvent {
  id: number;
  /** Friend id, or 'me' when the user is the actor. */
  fromId: string;
  /** For directed events like waves; otherwise undefined. */
  toId?: string;
  kind: RoomEventKind;
  text: string;
  ts: number;
}

/* --------------------------------------------------------------------- */
/* Room pulse — a one-shot signal that components can listen to in       */
/* useEffect to play short reactions (e.g. friends look up when you      */
/* pull your bell, a friend bows when they start focusing).              */
/* --------------------------------------------------------------------- */

export interface RoomPulse {
  id: number;
  fromId: string;
  kind: 'pull' | 'wave' | 'break' | 'finish' | 'help';
}

export interface Routine {
  /** Local time string in HH:MM. */
  startTime: string;
  subjects: string[];
  focusMinutes: number;
  breakMinutes: number;
  mode: 'alone' | 'together';
}

const DEFAULT_ROUTINE: Routine = {
  startTime: '16:00',
  subjects: [],
  focusMinutes: 25,
  breakMinutes: 10,
  mode: 'together',
};

/* Seats are arranged around a virtual round table in the room. Numbers
   are 0..1 in the RoomScene viewBox; (0.5, 0.85) is the front-center
   seat reserved for the user. */
const SEED_FRIENDS: Friend[] = [
  { id: 'f1', name: 'Mia',   emoji: '🦊', status: 'focusing',    subject: 'Math',    minutesLeft: 18, seat: { x: 0.22, y: 0.32 } },
  { id: 'f2', name: 'Leo',   emoji: '🐼', status: 'on_break',    subject: 'Science', minutesLeft: 4 , seat: { x: 0.50, y: 0.22 } },
  { id: 'f3', name: 'Aya',   emoji: '🐰', status: 'focusing',    subject: 'English', minutesLeft: 12, seat: { x: 0.78, y: 0.32 } },
  { id: 'f4', name: 'Theo',  emoji: '🐯', status: 'finished',    subject: 'History',                  seat: { x: 0.14, y: 0.66 } },
  { id: 'f5', name: 'Nora',  emoji: '🐨', status: 'needs_help',  subject: 'Math',    minutesLeft: 9 , seat: { x: 0.86, y: 0.66 } },
  { id: 'f6', name: 'Sam',   emoji: '🐧', status: 'offline',                                          seat: { x: 0.06, y: 0.20 } },
];

interface AppContextState {
  hasEntered: boolean;
  setHasEntered: (val: boolean) => void;

  /** True once the user has completed the profile/login step. */
  hasLoggedIn: boolean;
  setHasLoggedIn: (val: boolean) => void;
  /** Display name chosen during login. */
  userName: string;
  setUserName: (name: string) => void;
  /** Emoji avatar chosen during login. */
  userEmoji: string;
  setUserEmoji: (emoji: string) => void;

  /** Sub-tasks the user has added under each subject. */
  subTasks: SubTask[];
  addSubTask: (subjectId: string, label: string) => void;
  removeSubTask: (id: string) => void;
  completedSubTaskIds: string[];
  toggleSubTaskCompleted: (id: string) => void;
  clearSubTasksForSubject: (subjectId: string) => void;

  ownership: string;
  setOwnership: (val: string) => void;
  pace: string;
  setPace: (pace: string) => void;
  paceMinutes: number | null;
  setPaceMinutes: (n: number | null) => void;
  note: string;
  setNote: (note: string) => void;
  isLinePulled: boolean;
  setIsLinePulled: (val: boolean) => void;
  routeItems: RouteItem[];
  setRouteItems: (items: RouteItem[]) => void;
  addRouteItem: (item: Omit<RouteItem, 'id'>) => void;
  removeRouteItem: (id: string) => void;
  updateRouteItemLabel: (id: string, label: string) => void;
  reorderRouteItems: (items: RouteItem[]) => void;
  completedIds: string[];
  toggleCompleted: (id: string) => void;
  sessionActive: boolean;
  setSessionActive: (val: boolean) => void;
  resetSession: () => void;
  savedRoutes: SavedRoute[];
  saveCurrentRoute: (name: string) => SavedRoute;
  loadSavedRoute: (id: string) => SavedRoute | undefined;
  addReflectionToRoute: (id: string, reflection: string) => void;
  widgetPreset: WidgetPreset;
  setWidgetPreset: (preset: WidgetPreset) => void;
  bgStyle: BgStyle;
  setBgStyle: (s: BgStyle) => void;
  sessionStartTime: number | null;
  setSessionStartTime: (t: number | null) => void;
  returnsMade: number;
  incrementReturns: () => void;
  sessionStatus: SessionStatus;
  setSessionStatus: (status: SessionStatus) => void;
  activeRouteId: string | null;
  setActiveRouteId: (id: string | null) => void;
  resetDraft: () => void;

  /* Routine + study-room layer */
  routine: Routine;
  setRoutine: (r: Routine) => void;
  hasRoutine: boolean;
  mySelf: Friend;
  updateMyStatus: (status: FriendStatus, extras?: Partial<Friend>) => void;
  friends: Friend[];
  sendWaveTo: (friendId: string) => void;
  askForHelp: () => void;
  /** Rolling list of recent room events (last ~10), newest first. */
  roomEvents: RoomEvent[];
  /** Last "look up" / "bow" pulse — components animate when `id` changes. */
  roomPulse: RoomPulse;
  /** Emit a one-shot pulse so other on-screen characters can react. */
  pulseRoom: (fromId: string, kind: RoomPulse['kind']) => void;

  /* Study-together room code */
  /** Short room code (e.g. "OAK42") — null until the user creates or joins a room. */
  roomCode: string | null;
  /** Human-friendly room name derived from the code (e.g. "Oak Room"). */
  roomName: string | null;
  /** Join an existing room by code. Normalises and stores the code + name. */
  joinRoom: (code: string) => void;
  /** Create a new room with a freshly generated code. */
  createRoom: () => void;
}

const AppContext = createContext<AppContextState | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [hasEntered, setHasEntered] = useState(false);
  const [hasLoggedIn, setHasLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmoji, setUserEmoji] = useState('🐶');
  const [subTasks, setSubTasks] = useState<SubTask[]>([]);
  const [completedSubTaskIds, setCompletedSubTaskIds] = useState<string[]>([]);

  const addSubTask = (subjectId: string, label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    setSubTasks((prev) => [
      ...prev,
      { id: Math.random().toString(36).substring(2, 9), subjectId, label: trimmed },
    ]);
  };
  const removeSubTask = (id: string) => {
    setSubTasks((prev) => prev.filter((t) => t.id !== id));
    setCompletedSubTaskIds((prev) => prev.filter((i) => i !== id));
  };
  const toggleSubTaskCompleted = (id: string) => {
    setCompletedSubTaskIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };
  const clearSubTasksForSubject = (subjectId: string) => {
    const idsToRemove = subTasks.filter((t) => t.subjectId === subjectId).map((t) => t.id);
    setSubTasks((prev) => prev.filter((t) => t.subjectId !== subjectId));
    setCompletedSubTaskIds((prev) => prev.filter((id) => !idsToRemove.includes(id)));
  };

  const [ownership, setOwnership] = useState('');
  const [pace, setPace] = useState('');
  const [paceMinutes, setPaceMinutes] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [isLinePulled, setIsLinePulled] = useState(false);
  const [routeItems, setRouteItems] = useState<RouteItem[]>([]);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [sessionActive, setSessionActive] = useState(false);
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);
  const [widgetPreset, setWidgetPreset] = useState<WidgetPreset>('selfCheckin');
  const [bgStyle, setBgStyle] = useState<BgStyle>('honey');
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('drifting');
  const [activeRouteId, setActiveRouteId] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [returnsMade, setReturnsMade] = useState(0);
  const incrementReturns = () => setReturnsMade((n) => n + 1);

  /* Room code */
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [roomName, setRoomName] = useState<string | null>(null);

  const joinRoom = (code: string) => {
    const clean = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    if (!clean) return;
    setRoomCode(clean);
    setRoomName(roomNameFromCode(clean));
  };
  const createRoom = () => {
    const code = generateRoomCode();
    setRoomCode(code);
    setRoomName(roomNameFromCode(code));
  };

  /* Routine + room state */
  const [routine, setRoutineState] = useState<Routine>(DEFAULT_ROUTINE);
  const [hasRoutine, setHasRoutine] = useState(false);
  const [mySelf, setMySelf] = useState<Friend>({
    id: 'me',
    name: 'You',
    emoji: '🐶',
    status: 'offline',
    seat: { x: 0.50, y: 0.86 },
  });
  const [friends, setFriends] = useState<Friend[]>(SEED_FRIENDS);
  const [roomEvents, setRoomEvents] = useState<RoomEvent[]>([]);
  const [roomPulse, setRoomPulse] = useState<RoomPulse>({
    id: 0,
    fromId: '',
    kind: 'pull',
  });

  const setRoutine = (r: Routine) => {
    setRoutineState(r);
    setHasRoutine(true);
  };

  /* Internal: append an event to the rolling chatter feed (cap at 10). */
  const eventIdRef = useRef(1);
  const pushEvent = (ev: Omit<RoomEvent, 'id' | 'ts'>) => {
    const next: RoomEvent = {
      ...ev,
      id: eventIdRef.current++,
      ts: Date.now(),
    };
    setRoomEvents((prev) => [next, ...prev].slice(0, 10));
  };

  /* Internal: bump the room pulse so listeners can play a one-shot
     reaction. id strictly increases so React deps work. */
  const pulseIdRef = useRef(0);
  const pulseRoom: AppContextState['pulseRoom'] = (fromId, kind) => {
    pulseIdRef.current += 1;
    setRoomPulse({ id: pulseIdRef.current, fromId, kind });
  };

  const updateMyStatus = (status: FriendStatus, extras?: Partial<Friend>) => {
    setMySelf((m) => {
      const wasOffline = m.status === 'offline';
      const next = { ...m, ...extras, status };
      // Emit a chatter event when the user's state changes meaningfully.
      if (status !== m.status) {
        if (wasOffline && status === 'focusing') {
          pushEvent({ fromId: 'me', kind: 'arrived', text: 'You sat down at the table' });
        }
        if (status === 'focusing') {
          pulseRoom('me', 'pull');
          if (!wasOffline) pushEvent({ fromId: 'me', kind: 'started_focus', text: 'You started focusing' });
        }
        if (status === 'on_break') {
          pulseRoom('me', 'break');
          pushEvent({ fromId: 'me', kind: 'started_break', text: 'You took a break' });
        }
        if (status === 'finished') {
          pulseRoom('me', 'finish');
          pushEvent({ fromId: 'me', kind: 'finished', text: 'You finished for today!' });
        }
        if (status === 'needs_help') {
          pulseRoom('me', 'help');
          pushEvent({ fromId: 'me', kind: 'asked_help', text: 'You asked for help' });
        }
      }
      return next;
    });
  };

  const sendWaveTo = (friendId: string) => {
    const target = friends.find((f) => f.id === friendId);
    setFriends((prev) =>
      prev.map((f) => (f.id === friendId ? { ...f, waving: true } : f)),
    );
    pulseRoom(friendId, 'wave');
    if (target) {
      pushEvent({
        fromId: 'me',
        toId: friendId,
        kind: 'wave',
        text: `You waved at ${target.name}`,
      });
    }
    setTimeout(() => {
      setFriends((prev) =>
        prev.map((f) => (f.id === friendId ? { ...f, waving: false } : f)),
      );
    }, 2200);
  };

  const askForHelp = () => {
    updateMyStatus('needs_help');
  };

  /* Mocked liveness — friends drift between statuses every ~25–45s so the
     room feels populated even without a backend. Each transition that's
     visible to the user also lands as a line in the chatter feed and (for
     the more energetic transitions) bumps the room pulse. */
  const tickRef = useRef(0);
  useEffect(() => {
    const interval = setInterval(() => {
      tickRef.current += 1;
      setFriends((prev) =>
        prev.map((f, idx) => {
          if ((tickRef.current + idx) % 3 !== 0) return f;
          const nextStatus = nextFriendStatus(f.status);
          if (nextStatus !== f.status) {
            // Defer to avoid setState-during-setState in React 18 strict.
            queueMicrotask(() => {
              if (nextStatus === 'focusing') {
                pushEvent({
                  fromId: f.id,
                  kind: 'started_focus',
                  text: `${f.name} opened ${f.subject ?? 'a book'}`,
                });
                pulseRoom(f.id, 'pull');
              } else if (nextStatus === 'on_break') {
                pushEvent({
                  fromId: f.id,
                  kind: 'started_break',
                  text: `${f.name} is on a break`,
                });
              } else if (nextStatus === 'finished') {
                pushEvent({
                  fromId: f.id,
                  kind: 'finished',
                  text: `${f.name} finished ${f.subject ?? 'their work'} 🎉`,
                });
                pulseRoom(f.id, 'finish');
              } else if (nextStatus === 'needs_help') {
                pushEvent({
                  fromId: f.id,
                  kind: 'asked_help',
                  text: `${f.name} could use some help`,
                });
              } else if (nextStatus === 'offline' && f.status !== 'offline') {
                pushEvent({
                  fromId: f.id,
                  kind: 'left',
                  text: `${f.name} stepped away`,
                });
              }
            });
          }
          return {
            ...f,
            status: nextStatus,
            minutesLeft:
              nextStatus === 'focusing'
                ? Math.max(5, Math.floor(Math.random() * 25) + 5)
                : nextStatus === 'on_break'
                ? Math.max(2, Math.floor(Math.random() * 8) + 2)
                : undefined,
          };
        }),
      );
    }, 30_000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* On first mount, seed the chatter so the room never feels empty. */
  useEffect(() => {
    pushEvent({ fromId: 'f1', kind: 'started_focus', text: 'Mia opened Math' });
    pushEvent({ fromId: 'f3', kind: 'started_focus', text: 'Aya opened English' });
    pushEvent({ fromId: 'f2', kind: 'started_break', text: 'Leo is on a break' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleCompleted = (id: string) => {
    setCompletedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const resetSession = () => {
    setCompletedIds([]);
    setSessionActive(false);
    setSessionStatus('drifting');
    setSessionStartTime(null);
  };

  const resetDraft = () => {
    setOwnership('');
    setPace('');
    setPaceMinutes(null);
    setNote('');
    setIsLinePulled(false);
    setRouteItems([]);
    setCompletedIds([]);
    setSubTasks([]);
    setCompletedSubTaskIds([]);
    setSessionActive(false);
    setActiveRouteId(null);
    setSessionStatus('drifting');
    setSessionStartTime(null);
    setReturnsMade(0);
  };

  const addRouteItem = (item: Omit<RouteItem, 'id'>) => {
    setRouteItems((prev) => [...prev, { ...item, id: Math.random().toString(36).substring(2, 9) }]);
  };

  const removeRouteItem = (id: string) => {
    setRouteItems((prev) => prev.filter((i) => i.id !== id));
  };

  const reorderRouteItems = (items: RouteItem[]) => setRouteItems(items);

  const updateRouteItemLabel = (id: string, label: string) => {
    setRouteItems((prev) => prev.map((i) => (i.id === id ? { ...i, label } : i)));
  };

  const saveCurrentRoute = (name: string): SavedRoute => {
    const route: SavedRoute = {
      id: Math.random().toString(36).substring(2, 9),
      name,
      pace,
      paceMinutes,
      note,
      items: routeItems,
      reflections: [],
      createdAt: Date.now(),
      uses: 0,
    };
    setSavedRoutes((prev) => [route, ...prev]);
    setActiveRouteId(route.id);
    return route;
  };

  const loadSavedRoute = (id: string) => {
    const route = savedRoutes.find((r) => r.id === id);
    if (!route) return undefined;
    setPace(route.pace);
    setPaceMinutes(route.paceMinutes ?? null);
    setNote(route.note);
    setRouteItems(route.items);
    setIsLinePulled(true);
    setCompletedIds([]);
    setActiveRouteId(route.id);
    setSavedRoutes((prev) =>
      prev.map((r) => (r.id === id ? { ...r, uses: r.uses + 1, lastUsedAt: Date.now() } : r)),
    );
    return route;
  };

  const addReflectionToRoute = (id: string, reflection: string) => {
    setSavedRoutes((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, reflections: [reflection, ...r.reflections].slice(0, 12) } : r,
      ),
    );
  };

  return (
    <AppContext.Provider
      value={{
        hasEntered,
        setHasEntered,
        hasLoggedIn,
        setHasLoggedIn,
        userName,
        setUserName,
        userEmoji,
        setUserEmoji,
        subTasks,
        addSubTask,
        removeSubTask,
        completedSubTaskIds,
        toggleSubTaskCompleted,
        clearSubTasksForSubject,
        ownership,
        setOwnership,
        pace,
        setPace,
        paceMinutes,
        setPaceMinutes,
        note,
        setNote,
        isLinePulled,
        setIsLinePulled,
        routeItems,
        setRouteItems,
        addRouteItem,
        removeRouteItem,
        reorderRouteItems,
        updateRouteItemLabel,
        completedIds,
        toggleCompleted,
        sessionActive,
        setSessionActive,
        resetSession,
        savedRoutes,
        saveCurrentRoute,
        loadSavedRoute,
        addReflectionToRoute,
        widgetPreset,
        setWidgetPreset,
        bgStyle,
        setBgStyle,
        sessionStatus,
        setSessionStatus,
        activeRouteId,
        setActiveRouteId,
        resetDraft,
        sessionStartTime,
        setSessionStartTime,
        returnsMade,
        incrementReturns,
        routine,
        setRoutine,
        hasRoutine,
        mySelf,
        updateMyStatus,
        friends,
        sendWaveTo,
        askForHelp,
        roomEvents,
        roomPulse,
        pulseRoom,
        roomCode,
        roomName,
        joinRoom,
        createRoom,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}

/* --------------------------------------------------------------------- */
/* Room code helpers                                                      */
/* --------------------------------------------------------------------- */

const ROOM_WORDS = ['OAK', 'PINE', 'MOSS', 'FERN', 'LILY', 'IRIS', 'REED', 'SAGE', 'BAY', 'ELM'] as const;
const ROOM_WORD_NAMES: Record<string, string> = {
  OAK: 'Oak Room',  PINE: 'Pine Room', MOSS: 'Moss Room', FERN: 'Fern Room',
  LILY: 'Lily Room', IRIS: 'Iris Room', REED: 'Reed Room', SAGE: 'Sage Room',
  BAY: 'Bay Room',  ELM: 'Elm Room',
};

function generateRoomCode(): string {
  const word = ROOM_WORDS[Math.floor(Math.random() * ROOM_WORDS.length)];
  const num  = Math.floor(Math.random() * 90) + 10; // 10–99
  return `${word}${num}`;
}

export function roomNameFromCode(code: string): string {
  const word = code.replace(/[0-9]/g, '');
  return ROOM_WORD_NAMES[word] ?? `Room ${code}`;
}

/** Helpers used by the friendly study-room layer. */
function nextFriendStatus(s: FriendStatus): FriendStatus {
  const ladder: Record<FriendStatus, FriendStatus[]> = {
    offline:    ['focusing', 'focusing', 'offline'],
    focusing:   ['on_break', 'finished', 'focusing'],
    on_break:   ['focusing', 'focusing', 'needs_help'],
    needs_help: ['focusing', 'on_break'],
    finished:   ['offline', 'finished'],
  };
  const opts = ladder[s];
  return opts[Math.floor(Math.random() * opts.length)];
}

export const STATUS_LABEL: Record<FriendStatus, string> = {
  focusing:   'Focusing',
  on_break:   'On a break',
  finished:   'Finished!',
  needs_help: 'Needs help',
  offline:    'Offline',
};

export const STATUS_EMOJI: Record<FriendStatus, string> = {
  focusing:   '✏️',
  on_break:   '🍪',
  finished:   '🎉',
  needs_help: '🙋',
  offline:    '💤',
};

export const STATUS_TONE: Record<FriendStatus, { bg: string; ring: string; text: string }> = {
  focusing:   { bg: 'bg-emerald-100', ring: 'ring-emerald-300', text: 'text-emerald-700' },
  on_break:   { bg: 'bg-amber-100',   ring: 'ring-amber-300',   text: 'text-amber-700'   },
  finished:   { bg: 'bg-violet-100',  ring: 'ring-violet-300',  text: 'text-violet-700'  },
  needs_help: { bg: 'bg-rose-100',    ring: 'ring-rose-300',    text: 'text-rose-700'    },
  offline:    { bg: 'bg-stone-100',   ring: 'ring-stone-300',   text: 'text-stone-500'   },
};

/**
 * Mocked global online-learner count. Single source of truth so the same
 * number appears on Welcome, the home screen, and any future surface.
 */
export const ONLINE_USERS = 2_847;
export function formatOnlineUsers(): string {
  return `${ONLINE_USERS.toLocaleString()} online users studying now`;
}
