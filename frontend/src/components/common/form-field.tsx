/**
 * FormField Component
 *
 * Composite form field with label, input, description, and error handling.
 *
 * @module components/common/form-field
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import type { FormFieldProps } from '@/types/components';

// ============================================================================
// Component
// ============================================================================

export function FormField({
  label,
  name,
  description,
  error,
  required = false,
  disabled = false,
  children,
  className,
  'data-testid': testId,
}: FormFieldProps) {
  const fieldId = `field-${name}`;
  const descriptionId = description ? `${fieldId}-description` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;

  const describedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div
      className={cn('space-y-2', className)}
      data-testid={testId}
    >
      <Label
        htmlFor={fieldId}
        required={required}
        className={cn(disabled && 'opacity-50')}
      >
        {label}
      </Label>

      {/* Clone child and inject props */}
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            id: fieldId,
            name,
            disabled,
            'aria-describedby': describedBy,
            'aria-invalid': !!error,
            isError: !!error,
            ...child.props,
          } as React.HTMLAttributes<HTMLElement>);
        }
        return child;
      })}

      {description && !error && (
        <p
          id={descriptionId}
          className="text-sm text-muted-foreground"
        >
          {description}
        </p>
      )}

      {error && (
        <p
          id={errorId}
          className="text-sm font-medium text-destructive"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}

// ============================================================================
// FormField with React Hook Form
// ============================================================================

import {
  Controller,
  useFormContext,
  type FieldPath,
  type FieldValues,
  type ControllerRenderProps,
} from 'react-hook-form';

export interface RHFFormFieldProps<T extends FieldValues>
  extends Omit<FormFieldProps, 'error' | 'name' | 'children'> {
  name: FieldPath<T>;
  render: (field: ControllerRenderProps<T, FieldPath<T>>) => React.ReactNode;
}

export function RHFFormField<T extends FieldValues>({
  name,
  label,
  description,
  required,
  disabled,
  render,
  className,
  'data-testid': testId,
}: RHFFormFieldProps<T>) {
  const { control, formState } = useFormContext<T>();
  const error = formState.errors[name]?.message as string | undefined;

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <FormField
          name={name}
          label={label}
          description={description}
          error={error}
          required={required}
          disabled={disabled}
          className={className}
          data-testid={testId}
        >
          {render(field)}
        </FormField>
      )}
    />
  );
}

// ============================================================================
// Note: RHFFormFieldProps is exported via `export interface` above
// ============================================================================
