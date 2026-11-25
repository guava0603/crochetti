import { Capacitor, registerPlugin } from '@capacitor/core'

/**
 * iOS Live Activity for the ongoing record (native side: ios/App/App/RecordLiveActivityPlugin.swift).
 *
 * Methods:
 * - isSupported() -> { supported, interactive }
 * - sync({ recordId, projectName, positionText, statusText, isPlaying, slotStart, elapsedSeconds,
 *          pauseLabel, startLabel }) -> { ok, reason? }
 * - end({ recordId? })
 * - getPendingActions() -> { actions: [{ id, recordId, action: 'pause'|'start', at }] }
 * - removePendingActions({ ids })
 * Event: 'pendingActions' when a Live Activity button queued an action.
 */
export const RecordLiveActivity = registerPlugin('RecordLiveActivity')

export function isRecordLiveActivityPlatform() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios'
}
