/**
 * Safety Store Tests
 *
 * Test suite for the safety store.
 *
 * @module stores/__tests__/safety-store.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { selectIsMonitorEnabled, selectSafetySettings, useSafetyStore } from '../safety-store';

describe('useSafetyStore', () => {
  beforeEach(() => {
    useSafetyStore.getState().resetToDefaults();
  });

  describe('Auto-mitigation', () => {
    it('should set auto mitigation', () => {
      const store = useSafetyStore.getState();
      store.setAutoMitigation(false);
      expect(useSafetyStore.getState().autoMitigation).toBe(false);
    });

    it('should set mitigation delay', () => {
      const store = useSafetyStore.getState();
      store.setMitigationDelay(200);
      expect(useSafetyStore.getState().mitigationDelay).toBe(200);
    });

    it('should clamp mitigation delay', () => {
      const store = useSafetyStore.getState();
      store.setMitigationDelay(2000);
      expect(useSafetyStore.getState().mitigationDelay).toBe(1000);
      store.setMitigationDelay(-10);
      expect(useSafetyStore.getState().mitigationDelay).toBe(0);
    });
  });

  describe('Alerts', () => {
    it('should set alert notifications', () => {
      const store = useSafetyStore.getState();
      store.setAlertNotifications(false);
      expect(useSafetyStore.getState().alertNotifications).toBe(false);
    });

    it('should set alert sound', () => {
      const store = useSafetyStore.getState();
      store.setAlertSound(true);
      expect(useSafetyStore.getState().alertSound).toBe(true);
    });

    it('should set alert email', () => {
      const store = useSafetyStore.getState();
      store.setAlertEmail(true);
      expect(useSafetyStore.getState().alertEmail).toBe(true);
    });

    it('should set email address', () => {
      const store = useSafetyStore.getState();
      store.setEmailAddress('test@example.com');
      expect(useSafetyStore.getState().emailAddress).toBe('test@example.com');
    });
  });

  describe('Thresholds', () => {
    it('should set warning threshold', () => {
      const store = useSafetyStore.getState();
      store.setWarningThreshold(0.5);
      expect(useSafetyStore.getState().warningThreshold).toBe(0.5);
    });

    it('should clamp warning threshold', () => {
      const store = useSafetyStore.getState();
      store.setWarningThreshold(1.5);
      expect(useSafetyStore.getState().warningThreshold).toBe(1);
      store.setWarningThreshold(-0.5);
      expect(useSafetyStore.getState().warningThreshold).toBe(0);
    });

    it('should set critical threshold', () => {
      const store = useSafetyStore.getState();
      store.setCriticalThreshold(0.7);
      expect(useSafetyStore.getState().criticalThreshold).toBe(0.7);
    });

    it('should set OOD threshold', () => {
      const store = useSafetyStore.getState();
      store.setOodThreshold(0.9);
      expect(useSafetyStore.getState().oodThreshold).toBe(0.9);
    });
  });

  describe('Monitors', () => {
    it('should set enabled monitors', () => {
      const store = useSafetyStore.getState();
      store.setEnabledMonitors(['monitor1', 'monitor2']);
      expect(useSafetyStore.getState().enabledMonitors).toEqual(['monitor1', 'monitor2']);
    });

    it('should toggle monitor on', () => {
      const store = useSafetyStore.getState();
      store.setEnabledMonitors(['monitor1']);
      store.toggleMonitor('monitor2');
      expect(useSafetyStore.getState().enabledMonitors).toContain('monitor2');
    });

    it('should toggle monitor off', () => {
      const store = useSafetyStore.getState();
      store.setEnabledMonitors(['monitor1', 'monitor2']);
      store.toggleMonitor('monitor1');
      expect(useSafetyStore.getState().enabledMonitors).not.toContain('monitor1');
    });

    it('should set monitor interval', () => {
      const store = useSafetyStore.getState();
      store.setMonitorInterval(200);
      expect(useSafetyStore.getState().monitorInterval).toBe(200);
    });

    it('should clamp monitor interval', () => {
      const store = useSafetyStore.getState();
      store.setMonitorInterval(10000);
      expect(useSafetyStore.getState().monitorInterval).toBe(5000);
      store.setMonitorInterval(10);
      expect(useSafetyStore.getState().monitorInterval).toBe(50);
    });
  });

  describe('TTC Settings', () => {
    it('should set TTC critical', () => {
      const store = useSafetyStore.getState();
      store.setTtcCritical(0.5);
      expect(useSafetyStore.getState().ttcCritical).toBe(0.5);
    });

    it('should set TTC warning', () => {
      const store = useSafetyStore.getState();
      store.setTtcWarning(1.5);
      expect(useSafetyStore.getState().ttcWarning).toBe(1.5);
    });
  });

  describe('Reset', () => {
    it('should reset to defaults', () => {
      const store = useSafetyStore.getState();
      store.setWarningThreshold(0.8);
      store.setCriticalThreshold(0.9);
      store.resetToDefaults();
      const state = useSafetyStore.getState();
      expect(state.warningThreshold).toBe(0.3);
      expect(state.criticalThreshold).toBe(0.6);
    });
  });

  describe('Selectors', () => {
    it('should select safety settings', () => {
      const state = useSafetyStore.getState();
      const settings = selectSafetySettings(state);
      expect(settings.warningThreshold).toBe(state.warningThreshold);
      expect(settings.enabledMonitors).toEqual(state.enabledMonitors);
    });

    it('should select monitor enabled', () => {
      const state = useSafetyStore.getState();
      const selector = selectIsMonitorEnabled(state.enabledMonitors[0] ?? 'ttc');
      expect(selector(state)).toBe(true);
      const selectorMissing = selectIsMonitorEnabled('missing');
      expect(selectorMissing(state)).toBe(false);
    });
  });
});
