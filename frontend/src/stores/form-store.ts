/**
 * Form State Store
 *
 * Manages multi-step form state, dirty tracking, and form errors.
 *
 * @module stores/form-store
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

// ============================================================================
// Types
// ============================================================================

export interface FormState {
  // Multi-step form
  currentStep: number;
  totalSteps: number;
  formData: Record<string, unknown>;
  stepData: Record<number, Record<string, unknown>>;

  // Validation
  errors: Record<string, string>;
  stepErrors: Record<number, Record<string, string>>;
  touchedFields: Set<string>;

  // Status
  isDirty: boolean;
  isSubmitting: boolean;
  isValidating: boolean;
  lastSavedAt: number | null;

  // Autosave
  autosaveEnabled: boolean;
  autosavePending: boolean;
}

export interface FormActions {
  // Step navigation
  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  setTotalSteps: (total: number) => void;

  // Data management
  setFormData: (data: Record<string, unknown>) => void;
  updateFormData: (field: string, value: unknown) => void;
  setStepData: (step: number, data: Record<string, unknown>) => void;
  updateStepData: (step: number, field: string, value: unknown) => void;
  mergeStepDataToForm: () => void;

  // Validation
  setError: (field: string, error: string) => void;
  setErrors: (errors: Record<string, string>) => void;
  clearError: (field: string) => void;
  clearErrors: () => void;
  setStepErrors: (step: number, errors: Record<string, string>) => void;
  clearStepErrors: (step: number) => void;
  setFieldTouched: (field: string) => void;
  setFieldsTouched: (fields: string[]) => void;

  // Status
  setIsDirty: (dirty: boolean) => void;
  setIsSubmitting: (submitting: boolean) => void;
  setIsValidating: (validating: boolean) => void;
  markAsSaved: () => void;

  // Autosave
  setAutosaveEnabled: (enabled: boolean) => void;
  setAutosavePending: (pending: boolean) => void;

  // Reset
  resetForm: () => void;
  resetStep: (step: number) => void;
}

export type FormStore = FormState & FormActions;

// ============================================================================
// Initial State
// ============================================================================

const initialState: FormState = {
  currentStep: 0,
  totalSteps: 1,
  formData: {},
  stepData: {},
  errors: {},
  stepErrors: {},
  touchedFields: new Set(),
  isDirty: false,
  isSubmitting: false,
  isValidating: false,
  lastSavedAt: null,
  autosaveEnabled: true,
  autosavePending: false,
};

// ============================================================================
// Store
// ============================================================================

export const useFormStore = create<FormStore>()(
  immer((set, get) => ({
    ...initialState,

    // Step navigation
    setCurrentStep: (step) =>
      set((state) => {
        state.currentStep = Math.max(0, Math.min(step, state.totalSteps - 1));
      }),

    nextStep: () =>
      set((state) => {
        if (state.currentStep < state.totalSteps - 1) {
          state.currentStep += 1;
        }
      }),

    prevStep: () =>
      set((state) => {
        if (state.currentStep > 0) {
          state.currentStep -= 1;
        }
      }),

    goToStep: (step) => {
      const state = get();
      if (step >= 0 && step < state.totalSteps) {
        set((s) => {
          s.currentStep = step;
        });
      }
    },

    setTotalSteps: (total) =>
      set((state) => {
        state.totalSteps = Math.max(1, total);
        if (state.currentStep >= total) {
          state.currentStep = total - 1;
        }
      }),

    // Data management
    setFormData: (data) =>
      set((state) => {
        state.formData = data;
        state.isDirty = true;
      }),

    updateFormData: (field, value) =>
      set((state) => {
        state.formData[field] = value;
        state.isDirty = true;
      }),

    setStepData: (step, data) =>
      set((state) => {
        state.stepData[step] = data;
        state.isDirty = true;
      }),

    updateStepData: (step, field, value) =>
      set((state) => {
        if (!state.stepData[step]) {
          state.stepData[step] = {};
        }
        state.stepData[step]![field] = value;
        state.isDirty = true;
      }),

    mergeStepDataToForm: () =>
      set((state) => {
        const merged = Object.values(state.stepData).reduce<Record<string, unknown>>(
          (acc, stepData) => ({ ...(acc as object), ...(stepData as object) }),
          {}
        );
        state.formData = { ...state.formData, ...merged };
      }),

    // Validation
    setError: (field, error) =>
      set((state) => {
        state.errors[field] = error;
      }),

    setErrors: (errors) =>
      set((state) => {
        state.errors = errors;
      }),

    clearError: (field) =>
      set((state) => {
        delete state.errors[field];
      }),

    clearErrors: () =>
      set((state) => {
        state.errors = {};
      }),

    setStepErrors: (step, errors) =>
      set((state) => {
        state.stepErrors[step] = errors;
      }),

    clearStepErrors: (step) =>
      set((state) => {
        delete state.stepErrors[step];
      }),

    setFieldTouched: (field) =>
      set((state) => {
        state.touchedFields.add(field);
      }),

    setFieldsTouched: (fields) =>
      set((state) => {
        fields.forEach((field) => state.touchedFields.add(field));
      }),

    // Status
    setIsDirty: (dirty) =>
      set((state) => {
        state.isDirty = dirty;
      }),

    setIsSubmitting: (submitting) =>
      set((state) => {
        state.isSubmitting = submitting;
      }),

    setIsValidating: (validating) =>
      set((state) => {
        state.isValidating = validating;
      }),

    markAsSaved: () =>
      set((state) => {
        state.isDirty = false;
        state.lastSavedAt = Date.now();
        state.autosavePending = false;
      }),

    // Autosave
    setAutosaveEnabled: (enabled) =>
      set((state) => {
        state.autosaveEnabled = enabled;
      }),

    setAutosavePending: (pending) =>
      set((state) => {
        state.autosavePending = pending;
      }),

    // Reset
    resetForm: () => set(() => ({ ...initialState, touchedFields: new Set() })),

    resetStep: (step) =>
      set((state) => {
        delete state.stepData[step];
        delete state.stepErrors[step];
      }),
  }))
);

// ============================================================================
// Selectors
// ============================================================================

export const selectCurrentStep = (state: FormStore) => state.currentStep;
export const selectTotalSteps = (state: FormStore) => state.totalSteps;
export const selectFormData = (state: FormStore) => state.formData;
export const selectErrors = (state: FormStore) => state.errors;
export const selectIsDirty = (state: FormStore) => state.isDirty;
export const selectIsSubmitting = (state: FormStore) => state.isSubmitting;
export const selectCanGoNext = (state: FormStore) =>
  state.currentStep < state.totalSteps - 1;
export const selectCanGoPrev = (state: FormStore) => state.currentStep > 0;
export const selectStepProgress = (state: FormStore) =>
  ((state.currentStep + 1) / state.totalSteps) * 100;
export const selectHasStepErrors = (step: number) => (state: FormStore) =>
  Object.keys(state.stepErrors[step] ?? {}).length > 0;
