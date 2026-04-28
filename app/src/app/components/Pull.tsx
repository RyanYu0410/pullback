import React, { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAppContext } from '../context/AppContext';
import { getPreset } from './presets';

/**
 * Pull is now a thin shell — the active preset (`widgetPreset`) decides
 * the visual + interaction model.  Each preset receives the current
 * `sessionStatus` (which drives the palette) and reports completion via
 * `onAnchor`, which sets `isLinePulled` and routes to `/save`.
 */
export function Pull() {
  const {
    widgetPreset,
    sessionStatus,
    setSessionStatus,
    setIsLinePulled,
    note,
    paceMinutes,
    sessionStartTime,
  } = useAppContext();
  const navigate = useNavigate();

  // Sync entry status with whether a session is already running.
  // - First visit (no timer): start in 'drifting' so user must pull to start.
  // - Returning from /save via "keep going" (timer still set): stay 'anchored'.
  useEffect(() => {
    setSessionStatus(sessionStartTime !== null ? 'anchored' : 'drifting');
  }, [setSessionStatus, sessionStartTime]);

  const { Component } = getPreset(widgetPreset);

  const onAnchor = () => {
    setIsLinePulled(true);
    setSessionStatus('anchored');
    navigate('/save');
  };

  return (
    <Component
      status={sessionStatus}
      setStatus={setSessionStatus}
      note={note}
      paceMinutes={paceMinutes}
      onAnchor={onAnchor}
    />
  );
}
