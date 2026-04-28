import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { SessionStatus } from '../design/palettes';

export type CardType = 'app' | 'red' | 'green' | 'yellow' | 'blue' | 'white';

export interface RouteItem {
  id: string;
  type: CardType;
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
 * Each maps to a distinct WebGL shader + overlay tint in CanvasBackground / Root.tsx.
 *
 * void   — pitch-dark canvas, neon-lime stars
 * cosmos — deep-navy canvas, indigo stars
 * clay   — warm terracotta canvas, amber stars
 * honey  — soft parchment canvas, coral stars  ← default
 * steel  — cool grey canvas, teal stars
 * iris   — pale lavender canvas, periwinkle stars
 */
export type BgStyle = 'void' | 'cosmos' | 'clay' | 'honey' | 'steel' | 'iris';

/** Returns true for dark-canvas themes so callers can adjust text/overlay accordingly. */
export function isDarkBg(style: BgStyle): boolean {
  return style === 'void' || style === 'cosmos';
}

interface AppContextState {
  hasEntered: boolean;
  setHasEntered: (val: boolean) => void;
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
  /** User-chosen layout preset for the Pull/Home widget. */
  widgetPreset: WidgetPreset;
  setWidgetPreset: (preset: WidgetPreset) => void;
  /** App-wide background style chosen in Settings. */
  bgStyle: BgStyle;
  setBgStyle: (s: BgStyle) => void;
  /** Timestamp (ms) when the current pull session started; null = not running. */
  sessionStartTime: number | null;
  setSessionStartTime: (t: number | null) => void;
  /** Number of times user pressed "come back" in the current session. */
  returnsMade: number;
  incrementReturns: () => void;
  /** Auto-driven palette phase. */
  sessionStatus: SessionStatus;
  setSessionStatus: (status: SessionStatus) => void;
  activeRouteId: string | null;
  setActiveRouteId: (id: string | null) => void;
  resetDraft: () => void;
}

const AppContext = createContext<AppContextState | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [hasEntered, setHasEntered] = useState(false);
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
