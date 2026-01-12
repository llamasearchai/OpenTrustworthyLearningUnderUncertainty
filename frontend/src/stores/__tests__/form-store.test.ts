/**
 * Form Store Tests
 *
 * Test suite for the form store.
 *
 * @module stores/__tests__/form-store.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { enableMapSet } from 'immer';
import {
  selectCanGoNext,
  selectCanGoPrev,
  selectCurrentStep,
  selectHasStepErrors,
  selectErrors,
  selectFormData,
  selectIsDirty,
  selectIsSubmitting,
  selectStepProgress,
  selectTotalSteps,
  useFormStore,
} from '../form-store';

enableMapSet();

describe('useFormStore', () => {
  beforeEach(() => {
    useFormStore.getState().resetForm();
  });

  describe('Step Navigation', () => {
    it('should set current step', () => {
      const store = useFormStore.getState();
      store.setTotalSteps(5);
      store.setCurrentStep(2);
      expect(useFormStore.getState().currentStep).toBe(2);
    });

    it('should clamp current step to valid range', () => {
      const store = useFormStore.getState();
      store.setTotalSteps(5);
      store.setCurrentStep(10);
      expect(useFormStore.getState().currentStep).toBe(4);
      store.setCurrentStep(-1);
      expect(useFormStore.getState().currentStep).toBe(0);
    });

    it('should go to next step', () => {
      const store = useFormStore.getState();
      store.setTotalSteps(5);
      store.setCurrentStep(0);
      store.nextStep();
      expect(useFormStore.getState().currentStep).toBe(1);
    });

    it('should not go beyond last step', () => {
      const store = useFormStore.getState();
      store.setTotalSteps(5);
      store.setCurrentStep(4);
      store.nextStep();
      expect(useFormStore.getState().currentStep).toBe(4);
    });

    it('should go to previous step', () => {
      const store = useFormStore.getState();
      store.setTotalSteps(5);
      store.setCurrentStep(2);
      store.prevStep();
      expect(useFormStore.getState().currentStep).toBe(1);
    });

    it('should not go below first step', () => {
      const store = useFormStore.getState();
      store.setCurrentStep(0);
      store.prevStep();
      expect(useFormStore.getState().currentStep).toBe(0);
    });

    it('should go to specific step', () => {
      const store = useFormStore.getState();
      store.setTotalSteps(5);
      store.goToStep(3);
      expect(useFormStore.getState().currentStep).toBe(3);
    });

    it('should not go to invalid step', () => {
      const store = useFormStore.getState();
      store.setTotalSteps(3);
      store.setCurrentStep(1);
      store.goToStep(99);
      expect(useFormStore.getState().currentStep).toBe(1);
    });

    it('should set total steps', () => {
      const store = useFormStore.getState();
      store.setTotalSteps(10);
      expect(useFormStore.getState().totalSteps).toBe(10);
    });

    it('should clamp total steps to at least 1', () => {
      const store = useFormStore.getState();
      store.setTotalSteps(0);
      expect(useFormStore.getState().totalSteps).toBe(1);
    });

    it('should adjust current step when total steps decreases', () => {
      const store = useFormStore.getState();
      store.setTotalSteps(10);
      store.setCurrentStep(8);
      store.setTotalSteps(5);
      expect(useFormStore.getState().currentStep).toBe(4);
    });
  });

  describe('Data Management', () => {
    it('should set form data', () => {
      const store = useFormStore.getState();
      store.setFormData({ name: 'test', email: 'test@example.com' });
      const state = useFormStore.getState();
      expect(state.formData).toEqual({ name: 'test', email: 'test@example.com' });
      expect(state.isDirty).toBe(true);
    });

    it('should update form data', () => {
      const store = useFormStore.getState();
      store.setFormData({ name: 'test' });
      store.updateFormData('email', 'test@example.com');
      const state = useFormStore.getState();
      expect(state.formData.email).toBe('test@example.com');
      expect(state.isDirty).toBe(true);
    });

    it('should set step data', () => {
      const store = useFormStore.getState();
      store.setStepData(0, { field1: 'value1' });
      const state = useFormStore.getState();
      expect(state.stepData[0]).toEqual({ field1: 'value1' });
      expect(state.isDirty).toBe(true);
    });

    it('should update step data', () => {
      const store = useFormStore.getState();
      store.setStepData(0, { field1: 'value1' });
      store.updateStepData(0, 'field2', 'value2');
      const state = useFormStore.getState();
      expect(state.stepData[0]).toEqual({ field1: 'value1', field2: 'value2' });
    });

    it('should merge step data to form', () => {
      const store = useFormStore.getState();
      store.setStepData(0, { field1: 'value1' });
      store.setStepData(1, { field2: 'value2' });
      store.mergeStepDataToForm();
      const state = useFormStore.getState();
      expect(state.formData).toMatchObject({ field1: 'value1', field2: 'value2' });
    });
  });

  describe('Validation', () => {
    it('should set error', () => {
      const store = useFormStore.getState();
      store.setError('email', 'Invalid email');
      const state = useFormStore.getState();
      expect(state.errors.email).toBe('Invalid email');
    });

    it('should set multiple errors', () => {
      const store = useFormStore.getState();
      store.setErrors({ email: 'Invalid email', name: 'Required' });
      const state = useFormStore.getState();
      expect(state.errors).toEqual({ email: 'Invalid email', name: 'Required' });
    });

    it('should clear error', () => {
      const store = useFormStore.getState();
      store.setError('email', 'Invalid email');
      store.clearError('email');
      const state = useFormStore.getState();
      expect(state.errors.email).toBeUndefined();
    });

    it('should clear all errors', () => {
      const store = useFormStore.getState();
      store.setErrors({ email: 'Invalid', name: 'Required' });
      store.clearErrors();
      const state = useFormStore.getState();
      expect(Object.keys(state.errors)).toHaveLength(0);
    });

    it('should set step errors', () => {
      const store = useFormStore.getState();
      store.setStepErrors(0, { field1: 'Error 1' });
      const state = useFormStore.getState();
      expect(state.stepErrors[0]).toEqual({ field1: 'Error 1' });
    });

    it('should clear step errors', () => {
      const store = useFormStore.getState();
      store.setStepErrors(0, { field1: 'Error 1' });
      store.clearStepErrors(0);
      const state = useFormStore.getState();
      expect(state.stepErrors[0]).toBeUndefined();
    });

    it('should set field as touched', () => {
      const store = useFormStore.getState();
      store.setFieldTouched('email');
      const state = useFormStore.getState();
      expect(state.touchedFields.has('email')).toBe(true);
    });

    it('should set multiple fields as touched', () => {
      const store = useFormStore.getState();
      store.setFieldsTouched(['email', 'name']);
      const state = useFormStore.getState();
      expect(state.touchedFields.has('email')).toBe(true);
      expect(state.touchedFields.has('name')).toBe(true);
    });
  });

  describe('Status', () => {
    it('should set dirty state', () => {
      const store = useFormStore.getState();
      store.setIsDirty(true);
      expect(useFormStore.getState().isDirty).toBe(true);
    });

    it('should set submitting state', () => {
      const store = useFormStore.getState();
      store.setIsSubmitting(true);
      expect(useFormStore.getState().isSubmitting).toBe(true);
    });

    it('should set validating state', () => {
      const store = useFormStore.getState();
      store.setIsValidating(true);
      expect(useFormStore.getState().isValidating).toBe(true);
    });

    it('should mark as saved', () => {
      const store = useFormStore.getState();
      store.setIsDirty(true);
      store.markAsSaved();
      const state = useFormStore.getState();
      expect(state.isDirty).toBe(false);
      expect(state.lastSavedAt).toBeGreaterThan(0);
      expect(state.autosavePending).toBe(false);
    });
  });

  describe('Autosave', () => {
    it('should set autosave enabled', () => {
      const store = useFormStore.getState();
      store.setAutosaveEnabled(false);
      expect(useFormStore.getState().autosaveEnabled).toBe(false);
    });

    it('should set autosave pending', () => {
      const store = useFormStore.getState();
      store.setAutosavePending(true);
      expect(useFormStore.getState().autosavePending).toBe(true);
    });
  });

  describe('Reset', () => {
    it('should reset form', () => {
      const store = useFormStore.getState();
      store.setFormData({ name: 'test' });
      store.setError('name', 'Error');
      store.setFieldTouched('name');
      store.setCurrentStep(2);
      store.resetForm();
      const state = useFormStore.getState();
      expect(state.formData).toEqual({});
      expect(Object.keys(state.errors)).toHaveLength(0);
      expect(state.touchedFields.size).toBe(0);
      expect(state.currentStep).toBe(0);
    });

    it('should reset step', () => {
      const store = useFormStore.getState();
      store.setStepData(0, { field1: 'value1' });
      store.setStepErrors(0, { field1: 'Error' });
      store.resetStep(0);
      const state = useFormStore.getState();
      expect(state.stepData[0]).toBeUndefined();
      expect(state.stepErrors[0]).toBeUndefined();
    });
  });

  describe('Selectors', () => {
    it('should compute navigation selectors', () => {
      const store = useFormStore.getState();
      store.setTotalSteps(3);
      store.setCurrentStep(0);
      expect(selectCanGoPrev(useFormStore.getState())).toBe(false);
      expect(selectCanGoNext(useFormStore.getState())).toBe(true);

      store.setCurrentStep(2);
      expect(selectCanGoNext(useFormStore.getState())).toBe(false);
      expect(selectCanGoPrev(useFormStore.getState())).toBe(true);
    });

    it('should compute step progress', () => {
      const store = useFormStore.getState();
      store.setTotalSteps(4);
      store.setCurrentStep(1);
      expect(selectStepProgress(useFormStore.getState())).toBe(50);
    });

    it('should detect step errors', () => {
      const store = useFormStore.getState();
      store.setStepErrors(2, { field: 'Error' });
      const hasErrors = selectHasStepErrors(2)(useFormStore.getState());
      const noErrors = selectHasStepErrors(1)(useFormStore.getState());
      expect(hasErrors).toBe(true);
      expect(noErrors).toBe(false);
    });

    it('should compute state selectors', () => {
      const store = useFormStore.getState();
      store.setTotalSteps(2);
      store.setCurrentStep(1);
      store.setFormData({ a: 1 });
      store.setError('a', 'err');
      store.setIsDirty(true);
      store.setIsSubmitting(true);

      const state = useFormStore.getState();
      expect(selectCurrentStep(state)).toBe(1);
      expect(selectTotalSteps(state)).toBe(2);
      expect(selectFormData(state)).toEqual({ a: 1 });
      expect(selectErrors(state)).toEqual({ a: 'err' });
      expect(selectIsDirty(state)).toBe(true);
      expect(selectIsSubmitting(state)).toBe(true);
    });
  });

  describe('Step data creation', () => {
    it('should create step data when updating a new step', () => {
      const store = useFormStore.getState();
      store.updateStepData(5, 'created', true);
      expect(useFormStore.getState().stepData[5]).toEqual({ created: true });
    });
  });
});
