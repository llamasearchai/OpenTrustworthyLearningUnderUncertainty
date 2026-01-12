/**
 * AI Feature Hooks
 *
 * React hooks for AI-powered development features including
 * code suggestions, accessibility audits, test generation, and documentation.
 *
 * @module lib/ai/features
 */

import { useState, useCallback, useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { aiClient, type Message, type CompletionResponse, AIError } from '../client';
import { withFallback, type FallbackResult } from '../fallback';
import { type ModelId, DEFAULT_MODEL } from '../config';

// ============================================================================
// Types
// ============================================================================

export interface FeatureHookOptions {
  enabled?: boolean;
  model?: ModelId;
  onSuccess?: (result: unknown) => void;
  onError?: (error: AIError) => void;
}

export interface CodeContext {
  code: string;
  language: string;
  filePath?: string;
  cursorPosition?: { line: number; column: number };
  surrounding?: { before: string; after: string };
}

export interface CodeSuggestion {
  id: string;
  code: string;
  description: string;
  confidence: number;
  type: 'completion' | 'refactor' | 'fix' | 'optimization';
  insertAt?: { line: number; column: number };
  replaceRange?: { start: { line: number; column: number }; end: { line: number; column: number } };
}

export interface AccessibilityIssue {
  id: string;
  type: 'error' | 'warning' | 'suggestion';
  wcagLevel: 'A' | 'AA' | 'AAA';
  wcagCriteria: string;
  element: string;
  description: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  fix: string;
  codeSnippet?: string;
}

export interface AccessibilityAuditResult {
  score: number;
  issues: AccessibilityIssue[];
  passedChecks: number;
  totalChecks: number;
  summary: string;
}

export interface GeneratedTest {
  id: string;
  name: string;
  type: 'unit' | 'integration' | 'e2e';
  framework: string;
  code: string;
  description: string;
  coverage: string[];
}

export interface TestGenerationResult {
  tests: GeneratedTest[];
  coverageEstimate: number;
  suggestions: string[];
}

export interface DocumentationSection {
  id: string;
  type: 'description' | 'params' | 'returns' | 'example' | 'throws' | 'see';
  content: string;
}

export interface DocumentationResult {
  summary: string;
  sections: DocumentationSection[];
  markdown: string;
  jsdoc: string;
}

// ============================================================================
// System Prompts
// ============================================================================

const CODE_SUGGESTIONS_PROMPT = `You are an expert code assistant. Analyze the provided code context and generate helpful suggestions.
Focus on:
1. Code completions that follow the existing style
2. Potential bug fixes
3. Performance optimizations
4. Best practice improvements

Respond with JSON in this format:
{
  "suggestions": [
    {
      "code": "string",
      "description": "string",
      "confidence": number (0-1),
      "type": "completion" | "refactor" | "fix" | "optimization"
    }
  ]
}`;

const ACCESSIBILITY_AUDIT_PROMPT = `You are an accessibility expert. Audit the provided code for WCAG compliance.
Check for:
1. Semantic HTML usage
2. ARIA attributes and roles
3. Keyboard navigation support
4. Color contrast issues
5. Screen reader compatibility
6. Focus management

Respond with JSON in this format:
{
  "score": number (0-100),
  "issues": [
    {
      "type": "error" | "warning" | "suggestion",
      "wcagLevel": "A" | "AA" | "AAA",
      "wcagCriteria": "string",
      "element": "string",
      "description": "string",
      "impact": "critical" | "serious" | "moderate" | "minor",
      "fix": "string"
    }
  ],
  "passedChecks": number,
  "totalChecks": number,
  "summary": "string"
}`;

const TEST_GENERATION_PROMPT = `You are a testing expert. Generate comprehensive tests for the provided code.
Include:
1. Unit tests for individual functions
2. Edge cases and error handling
3. Integration tests if applicable
4. Clear test descriptions

Respond with JSON in this format:
{
  "tests": [
    {
      "name": "string",
      "type": "unit" | "integration" | "e2e",
      "framework": "vitest" | "jest" | "playwright",
      "code": "string",
      "description": "string",
      "coverage": ["function names covered"]
    }
  ],
  "coverageEstimate": number (0-100),
  "suggestions": ["additional test suggestions"]
}`;

const DOCUMENTATION_PROMPT = `You are a documentation expert. Generate comprehensive documentation for the provided code.
Include:
1. Clear summary description
2. Parameter documentation
3. Return value documentation
4. Usage examples
5. Thrown exceptions
6. Related references

Respond with JSON in this format:
{
  "summary": "string",
  "sections": [
    {
      "type": "description" | "params" | "returns" | "example" | "throws" | "see",
      "content": "string"
    }
  ],
  "markdown": "full markdown documentation",
  "jsdoc": "JSDoc comment string"
}`;

// ============================================================================
// useCodeSuggestions Hook
// ============================================================================

export interface UseCodeSuggestionsResult {
  suggestions: CodeSuggestion[];
  getSuggestions: (context: CodeContext) => Promise<CodeSuggestion[]>;
  isLoading: boolean;
  error: AIError | null;
  reset: () => void;
}

export function useCodeSuggestions(
  options: FeatureHookOptions = {}
): UseCodeSuggestionsResult {
  const { enabled = true, model = DEFAULT_MODEL, onSuccess, onError } = options;
  const [suggestions, setSuggestions] = useState<CodeSuggestion[]>([]);
  const [error, setError] = useState<AIError | null>(null);

  const mutation = useMutation({
    mutationFn: async (context: CodeContext): Promise<CodeSuggestion[]> => {
      const messages: Message[] = [
        { role: 'system', content: CODE_SUGGESTIONS_PROMPT },
        {
          role: 'user',
          content: `Language: ${context.language}
${context.filePath ? `File: ${context.filePath}` : ''}
${context.cursorPosition ? `Cursor: Line ${context.cursorPosition.line}, Column ${context.cursorPosition.column}` : ''}

Code:
\`\`\`${context.language}
${context.code}
\`\`\``,
        },
      ];

      const result = await withFallback(
        async (currentModel) => {
          const response = await aiClient.complete({
            model: currentModel,
            messages,
            temperature: 0.3,
            maxTokens: 2048,
          });
          return response;
        },
        { models: [model, 'gpt-4.1', 'gpt-4.1-mini'] }
      );

      const content = result.data.choices[0]?.message?.content ?? '{}';
      const parsed = JSON.parse(content);

      return (parsed.suggestions ?? []).map((s: Omit<CodeSuggestion, 'id'>, i: number) => ({
        ...s,
        id: `suggestion-${Date.now()}-${i}`,
      }));
    },
    onSuccess: (data) => {
      setSuggestions(data);
      setError(null);
      onSuccess?.(data);
    },
    onError: (err) => {
      const aiError = err instanceof AIError ? err : new AIError(err.message, 'UNKNOWN');
      setError(aiError);
      onError?.(aiError);
    },
  });

  const getSuggestions = useCallback(
    async (context: CodeContext) => {
      if (!enabled) return [];
      return mutation.mutateAsync(context);
    },
    [enabled, mutation]
  );

  const reset = useCallback(() => {
    setSuggestions([]);
    setError(null);
    mutation.reset();
  }, [mutation]);

  return {
    suggestions,
    getSuggestions,
    isLoading: mutation.isPending,
    error,
    reset,
  };
}

// ============================================================================
// useAccessibilityAudit Hook
// ============================================================================

export interface UseAccessibilityAuditResult {
  result: AccessibilityAuditResult | null;
  audit: (code: string, componentName?: string) => Promise<AccessibilityAuditResult>;
  isLoading: boolean;
  error: AIError | null;
  reset: () => void;
}

export function useAccessibilityAudit(
  options: FeatureHookOptions = {}
): UseAccessibilityAuditResult {
  const { enabled = true, model = DEFAULT_MODEL, onSuccess, onError } = options;
  const [result, setResult] = useState<AccessibilityAuditResult | null>(null);
  const [error, setError] = useState<AIError | null>(null);

  const mutation = useMutation({
    mutationFn: async ({
      code,
      componentName,
    }: {
      code: string;
      componentName?: string;
    }): Promise<AccessibilityAuditResult> => {
      const messages: Message[] = [
        { role: 'system', content: ACCESSIBILITY_AUDIT_PROMPT },
        {
          role: 'user',
          content: `${componentName ? `Component: ${componentName}\n\n` : ''}Code to audit:
\`\`\`tsx
${code}
\`\`\``,
        },
      ];

      const response = await withFallback(
        async (currentModel) => {
          return aiClient.complete({
            model: currentModel,
            messages,
            temperature: 0.2,
            maxTokens: 4096,
          });
        },
        { models: [model, 'gpt-4.1', 'gpt-4.1-mini'] }
      );

      const content = response.data.choices[0]?.message?.content ?? '{}';
      const parsed = JSON.parse(content);

      return {
        score: parsed.score ?? 0,
        issues: (parsed.issues ?? []).map((issue: Omit<AccessibilityIssue, 'id'>, i: number) => ({
          ...issue,
          id: `a11y-issue-${Date.now()}-${i}`,
        })),
        passedChecks: parsed.passedChecks ?? 0,
        totalChecks: parsed.totalChecks ?? 0,
        summary: parsed.summary ?? '',
      };
    },
    onSuccess: (data) => {
      setResult(data);
      setError(null);
      onSuccess?.(data);
    },
    onError: (err) => {
      const aiError = err instanceof AIError ? err : new AIError(err.message, 'UNKNOWN');
      setError(aiError);
      onError?.(aiError);
    },
  });

  const audit = useCallback(
    async (code: string, componentName?: string) => {
      if (!enabled) {
        return {
          score: 0,
          issues: [],
          passedChecks: 0,
          totalChecks: 0,
          summary: 'Audit disabled',
        };
      }
      return mutation.mutateAsync({ code, componentName });
    },
    [enabled, mutation]
  );

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    mutation.reset();
  }, [mutation]);

  return {
    result,
    audit,
    isLoading: mutation.isPending,
    error,
    reset,
  };
}

// ============================================================================
// useTestGeneration Hook
// ============================================================================

export interface UseTestGenerationResult {
  result: TestGenerationResult | null;
  generateTests: (
    code: string,
    options?: { framework?: string; types?: ('unit' | 'integration' | 'e2e')[] }
  ) => Promise<TestGenerationResult>;
  isLoading: boolean;
  error: AIError | null;
  reset: () => void;
}

export function useTestGeneration(
  options: FeatureHookOptions = {}
): UseTestGenerationResult {
  const { enabled = true, model = DEFAULT_MODEL, onSuccess, onError } = options;
  const [result, setResult] = useState<TestGenerationResult | null>(null);
  const [error, setError] = useState<AIError | null>(null);

  const mutation = useMutation({
    mutationFn: async ({
      code,
      testOptions,
    }: {
      code: string;
      testOptions?: { framework?: string; types?: ('unit' | 'integration' | 'e2e')[] };
    }): Promise<TestGenerationResult> => {
      const framework = testOptions?.framework ?? 'vitest';
      const types = testOptions?.types ?? ['unit'];

      const messages: Message[] = [
        { role: 'system', content: TEST_GENERATION_PROMPT },
        {
          role: 'user',
          content: `Generate ${types.join(', ')} tests using ${framework}.

Code to test:
\`\`\`typescript
${code}
\`\`\``,
        },
      ];

      const response = await withFallback(
        async (currentModel) => {
          return aiClient.complete({
            model: currentModel,
            messages,
            temperature: 0.3,
            maxTokens: 4096,
          });
        },
        { models: [model, 'gpt-4.1', 'gpt-4.1-mini'] }
      );

      const content = response.data.choices[0]?.message?.content ?? '{}';
      const parsed = JSON.parse(content);

      return {
        tests: (parsed.tests ?? []).map((test: Omit<GeneratedTest, 'id'>, i: number) => ({
          ...test,
          id: `test-${Date.now()}-${i}`,
        })),
        coverageEstimate: parsed.coverageEstimate ?? 0,
        suggestions: parsed.suggestions ?? [],
      };
    },
    onSuccess: (data) => {
      setResult(data);
      setError(null);
      onSuccess?.(data);
    },
    onError: (err) => {
      const aiError = err instanceof AIError ? err : new AIError(err.message, 'UNKNOWN');
      setError(aiError);
      onError?.(aiError);
    },
  });

  const generateTests = useCallback(
    async (
      code: string,
      testOptions?: { framework?: string; types?: ('unit' | 'integration' | 'e2e')[] }
    ) => {
      if (!enabled) {
        return { tests: [], coverageEstimate: 0, suggestions: [] };
      }
      return mutation.mutateAsync({ code, testOptions });
    },
    [enabled, mutation]
  );

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    mutation.reset();
  }, [mutation]);

  return {
    result,
    generateTests,
    isLoading: mutation.isPending,
    error,
    reset,
  };
}

// ============================================================================
// useDocumentation Hook
// ============================================================================

export interface UseDocumentationResult {
  result: DocumentationResult | null;
  generateDocs: (
    code: string,
    options?: { format?: 'markdown' | 'jsdoc'; context?: string }
  ) => Promise<DocumentationResult>;
  isLoading: boolean;
  error: AIError | null;
  reset: () => void;
}

export function useDocumentation(
  options: FeatureHookOptions = {}
): UseDocumentationResult {
  const { enabled = true, model = DEFAULT_MODEL, onSuccess, onError } = options;
  const [result, setResult] = useState<DocumentationResult | null>(null);
  const [error, setError] = useState<AIError | null>(null);

  const mutation = useMutation({
    mutationFn: async ({
      code,
      docOptions,
    }: {
      code: string;
      docOptions?: { format?: 'markdown' | 'jsdoc'; context?: string };
    }): Promise<DocumentationResult> => {
      const format = docOptions?.format ?? 'both';
      const context = docOptions?.context ?? '';

      const messages: Message[] = [
        { role: 'system', content: DOCUMENTATION_PROMPT },
        {
          role: 'user',
          content: `Generate documentation in ${format} format.
${context ? `\nContext: ${context}\n` : ''}
Code to document:
\`\`\`typescript
${code}
\`\`\``,
        },
      ];

      const response = await withFallback(
        async (currentModel) => {
          return aiClient.complete({
            model: currentModel,
            messages,
            temperature: 0.3,
            maxTokens: 2048,
          });
        },
        { models: [model, 'gpt-4.1', 'gpt-4.1-mini'] }
      );

      const content = response.data.choices[0]?.message?.content ?? '{}';
      const parsed = JSON.parse(content);

      return {
        summary: parsed.summary ?? '',
        sections: (parsed.sections ?? []).map((section: Omit<DocumentationSection, 'id'>, i: number) => ({
          ...section,
          id: `doc-section-${Date.now()}-${i}`,
        })),
        markdown: parsed.markdown ?? '',
        jsdoc: parsed.jsdoc ?? '',
      };
    },
    onSuccess: (data) => {
      setResult(data);
      setError(null);
      onSuccess?.(data);
    },
    onError: (err) => {
      const aiError = err instanceof AIError ? err : new AIError(err.message, 'UNKNOWN');
      setError(aiError);
      onError?.(aiError);
    },
  });

  const generateDocs = useCallback(
    async (
      code: string,
      docOptions?: { format?: 'markdown' | 'jsdoc'; context?: string }
    ) => {
      if (!enabled) {
        return { summary: '', sections: [], markdown: '', jsdoc: '' };
      }
      return mutation.mutateAsync({ code, docOptions });
    },
    [enabled, mutation]
  );

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    mutation.reset();
  }, [mutation]);

  return {
    result,
    generateDocs,
    isLoading: mutation.isPending,
    error,
    reset,
  };
}

// ============================================================================
// Combined Features Hook
// ============================================================================

export interface UseAIFeaturesResult {
  codeSuggestions: UseCodeSuggestionsResult;
  accessibilityAudit: UseAccessibilityAuditResult;
  testGeneration: UseTestGenerationResult;
  documentation: UseDocumentationResult;
}

export function useAIFeatures(options: FeatureHookOptions = {}): UseAIFeaturesResult {
  const codeSuggestions = useCodeSuggestions(options);
  const accessibilityAudit = useAccessibilityAudit(options);
  const testGeneration = useTestGeneration(options);
  const documentation = useDocumentation(options);

  return useMemo(
    () => ({
      codeSuggestions,
      accessibilityAudit,
      testGeneration,
      documentation,
    }),
    [codeSuggestions, accessibilityAudit, testGeneration, documentation]
  );
}
