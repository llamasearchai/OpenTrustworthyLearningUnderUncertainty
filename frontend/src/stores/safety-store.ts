/**
 * Safety Settings Store
 *
 * Manages safety monitoring and mitigation preferences.
 *
 * @module stores/safety-store
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// ============================================================================
// Types
// ============================================================================

export interface SafetySettings {
  // Auto-mitigation
  autoMitigation: boolean;
  mitigationDelay: number; // ms

  // Alerts
  alertNotifications: boolean;
  alertSound: boolean;
  alertEmail: boolean;
  emailAddress: string;

  // Thresholds
  warningThreshold: number;
  criticalThreshold: number;
  oodThreshold: number;

  // Monitor settings
  enabledMonitors: string[];
  monitorInterval: number; // ms

  // TTC settings
  ttcCritical: number;
  ttcWarning: number;
}

export interface SafetyState extends SafetySettings {
  // Actions
  setAutoMitigation: (enabled: boolean) => void;
  setMitigationDelay: (delay: number) => void;
  setAlertNotifications: (enabled: boolean) => void;
  setAlertSound: (enabled: boolean) => void;
  setAlertEmail: (enabled: boolean) => void;
  setEmailAddress: (email: string) => void;
  setWarningThreshold: (threshold: number) => void;
  setCriticalThreshold: (threshold: number) => void;
  setOodThreshold: (threshold: number) => void;
  setEnabledMonitors: (monitors: string[]) => void;
  toggleMonitor: (monitorId: string) => void;
  setMonitorInterval: (interval: number) => void;
  setTtcCritical: (ttc: number) => void;
  setTtcWarning: (ttc: number) => void;
  resetToDefaults: () => void;
}

// ============================================================================
// Defaults
// ============================================================================

const defaultSettings: SafetySettings = {
  autoMitigation: true,
  mitigationDelay: 100,
  alertNotifications: true,
  alertSound: false,
  alertEmail: false,
  emailAddress: '',
  warningThreshold: 0.3,
  criticalThreshold: 0.6,
  oodThreshold: 0.8,
  enabledMonitors: ['ttc', 'uncertainty', 'ood', 'constraint'],
  monitorInterval: 100,
  ttcCritical: 1.0,
  ttcWarning: 2.0,
};

// ============================================================================
// Store
// ============================================================================

export const useSafetyStore = create<SafetyState>()(
  persist(
    immer((set) => ({
      ...defaultSettings,

      setAutoMitigation: (enabled) =>
        set((state) => {
          state.autoMitigation = enabled;
        }),

      setMitigationDelay: (delay) =>
        set((state) => {
          state.mitigationDelay = Math.max(0, Math.min(1000, delay));
        }),

      setAlertNotifications: (enabled) =>
        set((state) => {
          state.alertNotifications = enabled;
        }),

      setAlertSound: (enabled) =>
        set((state) => {
          state.alertSound = enabled;
        }),

      setAlertEmail: (enabled) =>
        set((state) => {
          state.alertEmail = enabled;
        }),

      setEmailAddress: (email) =>
        set((state) => {
          state.emailAddress = email;
        }),

      setWarningThreshold: (threshold) =>
        set((state) => {
          state.warningThreshold = Math.max(0, Math.min(1, threshold));
        }),

      setCriticalThreshold: (threshold) =>
        set((state) => {
          state.criticalThreshold = Math.max(0, Math.min(1, threshold));
        }),

      setOodThreshold: (threshold) =>
        set((state) => {
          state.oodThreshold = Math.max(0, Math.min(1, threshold));
        }),

      setEnabledMonitors: (monitors) =>
        set((state) => {
          state.enabledMonitors = monitors;
        }),

      toggleMonitor: (monitorId) =>
        set((state) => {
          const index = state.enabledMonitors.indexOf(monitorId);
          if (index === -1) {
            state.enabledMonitors.push(monitorId);
          } else {
            state.enabledMonitors.splice(index, 1);
          }
        }),

      setMonitorInterval: (interval) =>
        set((state) => {
          state.monitorInterval = Math.max(50, Math.min(5000, interval));
        }),

      setTtcCritical: (ttc) =>
        set((state) => {
          state.ttcCritical = Math.max(0, ttc);
        }),

      setTtcWarning: (ttc) =>
        set((state) => {
          state.ttcWarning = Math.max(0, ttc);
        }),

      resetToDefaults: () =>
        set((state) => {
          Object.assign(state, defaultSettings);
        }),
    })),
    {
      name: 'opentlu-safety-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// ============================================================================
// Selectors
// ============================================================================

export const selectSafetySettings = (state: SafetyState): SafetySettings => ({
  autoMitigation: state.autoMitigation,
  mitigationDelay: state.mitigationDelay,
  alertNotifications: state.alertNotifications,
  alertSound: state.alertSound,
  alertEmail: state.alertEmail,
  emailAddress: state.emailAddress,
  warningThreshold: state.warningThreshold,
  criticalThreshold: state.criticalThreshold,
  oodThreshold: state.oodThreshold,
  enabledMonitors: state.enabledMonitors,
  monitorInterval: state.monitorInterval,
  ttcCritical: state.ttcCritical,
  ttcWarning: state.ttcWarning,
});

export const selectIsMonitorEnabled = (monitorId: string) => (state: SafetyState) =>
  state.enabledMonitors.includes(monitorId);
