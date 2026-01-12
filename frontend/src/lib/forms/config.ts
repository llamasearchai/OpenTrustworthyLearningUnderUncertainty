/**
 * React Hook Form Configuration Factory
 *
 * Creates consistent form configurations with Zod validation integration.
 *
 * @module lib/forms/config
 */

import { zodResolver } from '@hookform/resolvers/zod';
import type { DefaultValues, UseFormProps, FieldValues } from 'react-hook-form';
import { z } from 'zod';

// ============================================================================
// Types
// ============================================================================

export interface FormConfigOptions<T extends FieldValues> {
  /** Zod schema for validation */
  schema: z.ZodSchema<T>;
  /** Default form values */
  defaultValues?: DefaultValues<T>;
  /** Validation mode */
  mode?: 'onBlur' | 'onChange' | 'onSubmit' | 'onTouched' | 'all';
  /** When to revalidate after validation fails */
  reValidateMode?: 'onBlur' | 'onChange' | 'onSubmit';
  /** Whether to focus on the first error */
  shouldFocusError?: boolean;
  /** Context for conditional validation */
  context?: unknown;
  /** Criteria mode for showing errors */
  criteriaMode?: 'all' | 'firstError';
  /** Whether to use native validation */
  shouldUseNativeValidation?: boolean;
  /** Whether to delay error until blur */
  delayError?: number;
}

// ============================================================================
// Form Configuration Factory
// ============================================================================

/**
 * Creates a form configuration object for React Hook Form
 */
export function createFormConfig<T extends FieldValues>(
  options: FormConfigOptions<T>
): UseFormProps<T> {
  const {
    schema,
    defaultValues,
    mode = 'onBlur',
    reValidateMode = 'onChange',
    shouldFocusError = true,
    context,
    criteriaMode = 'firstError',
    shouldUseNativeValidation = false,
    delayError,
  } = options;

  return {
    resolver: zodResolver(schema, { async: false }, { mode: 'async' }),
    defaultValues,
    mode,
    reValidateMode,
    shouldFocusError,
    context,
    criteriaMode,
    shouldUseNativeValidation,
    delayError,
  };
}

// ============================================================================
// Common Form Configs
// ============================================================================

/**
 * Default form configuration (most common use case)
 */
export function createDefaultFormConfig<T extends FieldValues>(
  schema: z.ZodSchema<T>,
  defaultValues?: DefaultValues<T>
): UseFormProps<T> {
  return createFormConfig({
    schema,
    defaultValues,
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });
}

/**
 * Immediate validation form configuration
 */
export function createImmediateFormConfig<T extends FieldValues>(
  schema: z.ZodSchema<T>,
  defaultValues?: DefaultValues<T>
): UseFormProps<T> {
  return createFormConfig({
    schema,
    defaultValues,
    mode: 'onChange',
    reValidateMode: 'onChange',
  });
}

/**
 * Submit-only validation form configuration
 */
export function createSubmitFormConfig<T extends FieldValues>(
  schema: z.ZodSchema<T>,
  defaultValues?: DefaultValues<T>
): UseFormProps<T> {
  return createFormConfig({
    schema,
    defaultValues,
    mode: 'onSubmit',
    reValidateMode: 'onSubmit',
  });
}

// ============================================================================
// Form Field Utilities
// ============================================================================

/**
 * Get aria attributes for form field accessibility
 */
export function getFieldAriaProps(
  fieldId: string,
  options: {
    error?: string;
    description?: string;
    required?: boolean;
  }
): Record<string, string | boolean | undefined> {
  const { error, description, required } = options;
  const describedBy: string[] = [];

  if (description) describedBy.push(`${fieldId}-description`);
  if (error) describedBy.push(`${fieldId}-error`);

  return {
    id: fieldId,
    'aria-invalid': !!error,
    'aria-required': required,
    'aria-describedby': describedBy.length > 0 ? describedBy.join(' ') : undefined,
  };
}

/**
 * Generate a unique field ID
 */
export function generateFieldId(name: string, formId?: string): string {
  const prefix = formId ? `${formId}-` : '';
  return `${prefix}field-${name}`;
}

// ============================================================================
// Form Error Utilities
// ============================================================================

/**
 * Extract first error message from field errors
 */
export function getFirstError(
  errors: Record<string, { message?: string } | undefined>,
  fieldName: string
): string | undefined {
  const fieldError = errors[fieldName];
  return fieldError?.message;
}

/**
 * Check if form has any errors
 */
export function hasErrors(
  errors: Record<string, unknown>
): boolean {
  return Object.keys(errors).length > 0;
}

/**
 * Get all error messages as an array
 */
export function getAllErrors(
  errors: Record<string, { message?: string } | undefined>
): Array<{ field: string; message: string }> {
  return Object.entries(errors)
    .filter(([, error]) => error?.message)
    .map(([field, error]) => ({
      field,
      message: error!.message!,
    }));
}

// ============================================================================
// Field Configuration Types
// ============================================================================

export interface FieldConfig {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'textarea' | 'select' | 'multiselect' | 'checkbox' | 'radio' | 'date' | 'file' | 'custom';
  placeholder?: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  options?: Array<{ value: string; label: string }>;
  showWhen?: (values: Record<string, unknown>) => boolean;
  defaultValue?: unknown;
  min?: number;
  max?: number;
  step?: number;
}

// ============================================================================
// Pre-configured OpenTLU Form Schemas
// ============================================================================

/**
 * Acquisition configuration form schema
 */
export const acquisitionConfigSchema = z.object({
  weight_uncertainty: z.number().min(0).max(10).default(1.0),
  weight_risk: z.number().min(0).max(10).default(2.0),
  weight_novelty: z.number().min(0).max(10).default(0.5),
  diversity_penalty: z.number().min(0).max(1).default(0.1),
  batch_size: z.number().int().min(1).max(1000).default(10),
});

export type AcquisitionConfigFormData = z.infer<typeof acquisitionConfigSchema>;

export const acquisitionConfigFormConfig = createFormConfig({
  schema: acquisitionConfigSchema,
  defaultValues: {
    weight_uncertainty: 1.0,
    weight_risk: 2.0,
    weight_novelty: 0.5,
    diversity_penalty: 0.1,
    batch_size: 10,
  },
});

/**
 * Conformal prediction configuration schema
 */
export const conformalConfigSchema = z.object({
  coverage: z.number().min(0.5).max(0.999).default(0.9),
  min_calibration_size: z.number().int().min(10).max(10000).default(100),
  score_clip_percentile: z.number().min(90).max(100).default(99.0),
});

export type ConformalConfigFormData = z.infer<typeof conformalConfigSchema>;

export const conformalConfigFormConfig = createFormConfig({
  schema: conformalConfigSchema,
  defaultValues: {
    coverage: 0.9,
    min_calibration_size: 100,
    score_clip_percentile: 99.0,
  },
});

/**
 * Safety envelope configuration schema
 */
export const safetyEnvelopeSchema = z.object({
  hard_constraints: z.array(z.string()).default([]),
  soft_constraints: z.array(z.string()).default([]),
  violation_threshold: z.number().min(0).max(1).default(0.01),
});

export type SafetyEnvelopeFormData = z.infer<typeof safetyEnvelopeSchema>;

export const safetyEnvelopeFormConfig = createFormConfig({
  schema: safetyEnvelopeSchema,
  defaultValues: {
    hard_constraints: [],
    soft_constraints: [],
    violation_threshold: 0.01,
  },
});

/**
 * TTC monitor configuration schema
 */
export const ttcConfigSchema = z.object({
  critical_ttc: z.number().positive().default(1.0),
  warning_ttc: z.number().positive().default(3.0),
  model: z.enum(['constant_velocity', 'constant_acceleration']).default('constant_velocity'),
  debounce_steps: z.number().int().min(0).max(10).default(3),
  min_closing_velocity: z.number().min(0).default(0.1),
});

export type TTCConfigFormData = z.infer<typeof ttcConfigSchema>;

export const ttcConfigFormConfig = createFormConfig({
  schema: ttcConfigSchema,
  defaultValues: {
    critical_ttc: 1.0,
    warning_ttc: 3.0,
    model: 'constant_velocity',
    debounce_steps: 3,
    min_closing_velocity: 0.1,
  },
});

/**
 * Scenario creation form schema
 */
export const scenarioFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  tags: z.record(z.string(), z.string()).optional(),
});

export type ScenarioFormData = z.infer<typeof scenarioFormSchema>;

export const scenarioFormConfig = createFormConfig({
  schema: scenarioFormSchema,
  defaultValues: {
    name: '',
    description: '',
    tags: {},
  },
});

// ============================================================================
// Field Metadata Utilities
// ============================================================================

/**
 * Acquisition config field metadata for form generation
 */
export const acquisitionConfigFields: FieldConfig[] = [
  {
    name: 'weight_uncertainty',
    label: 'Uncertainty Weight',
    type: 'number',
    description: 'Weight for uncertainty term in acquisition function',
    required: true,
    min: 0,
    max: 10,
    step: 0.1,
    defaultValue: 1.0,
  },
  {
    name: 'weight_risk',
    label: 'Risk Weight',
    type: 'number',
    description: 'Weight for risk term in acquisition function',
    required: true,
    min: 0,
    max: 10,
    step: 0.1,
    defaultValue: 2.0,
  },
  {
    name: 'weight_novelty',
    label: 'Novelty Weight',
    type: 'number',
    description: 'Weight for novelty/diversity term',
    required: true,
    min: 0,
    max: 10,
    step: 0.1,
    defaultValue: 0.5,
  },
  {
    name: 'diversity_penalty',
    label: 'Diversity Penalty',
    type: 'number',
    description: 'Penalty for lack of diversity in selected batch',
    required: true,
    min: 0,
    max: 1,
    step: 0.01,
    defaultValue: 0.1,
  },
  {
    name: 'batch_size',
    label: 'Batch Size',
    type: 'number',
    description: 'Number of samples to select per batch',
    required: true,
    min: 1,
    max: 1000,
    step: 1,
    defaultValue: 10,
  },
];

/**
 * TTC config field metadata for form generation
 */
export const ttcConfigFields: FieldConfig[] = [
  {
    name: 'critical_ttc',
    label: 'Critical TTC',
    type: 'number',
    description: 'Time-to-collision threshold for SAFE_STOP (seconds)',
    required: true,
    min: 0.1,
    max: 10,
    step: 0.1,
    defaultValue: 1.0,
  },
  {
    name: 'warning_ttc',
    label: 'Warning TTC',
    type: 'number',
    description: 'Time-to-collision threshold for severity scaling (seconds)',
    required: true,
    min: 0.5,
    max: 30,
    step: 0.5,
    defaultValue: 3.0,
  },
  {
    name: 'model',
    label: 'TTC Model',
    type: 'select',
    description: 'Motion model for TTC computation',
    required: true,
    options: [
      { value: 'constant_velocity', label: 'Constant Velocity' },
      { value: 'constant_acceleration', label: 'Constant Acceleration' },
    ],
    defaultValue: 'constant_velocity',
  },
  {
    name: 'debounce_steps',
    label: 'Debounce Steps',
    type: 'number',
    description: 'Steps for hysteresis to prevent rapid oscillation',
    required: true,
    min: 0,
    max: 10,
    step: 1,
    defaultValue: 3,
  },
  {
    name: 'min_closing_velocity',
    label: 'Min Closing Velocity',
    type: 'number',
    description: 'Minimum closing velocity to consider (m/s)',
    required: true,
    min: 0,
    max: 5,
    step: 0.01,
    defaultValue: 0.1,
  },
];

/**
 * Validate form data against a schema and return formatted errors
 */
export function validateFormData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join('.');
    if (!errors[path]) {
      errors[path] = issue.message;
    }
  }
  return { success: false, errors };
}
