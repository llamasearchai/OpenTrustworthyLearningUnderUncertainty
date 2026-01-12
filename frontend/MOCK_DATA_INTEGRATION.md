# Mock Data Integration

## Overview

Comprehensive mock data integration for the OpenTLU frontend application, providing consistent test data across all components, pages, and visualizations.

## Mock Data Factories

Located in `src/tests/mocks/factories.ts`, these factories generate consistent mock data:

### Available Factories

- `createUncertaintyEstimate()` - Uncertainty estimation data
- `createUncertaintyDecomposition()` - Decomposed uncertainty data
- `createTimeSeriesPoint()` - Time series data points
- `createCalibrationMetrics()` - Calibration metrics
- `createScenario()` - Scenario data
- `createEvaluationResult()` - Evaluation results
- `createMonitorOutput()` - Safety monitor outputs
- `createSafetyMarginTimeline()` - Safety timeline data
- `createSampleMetadata()` - Active learning sample metadata
- `createMany()` - Helper to create multiple items
- `createPaginatedResponse()` - Paginated API responses

### Visualization Data Factories

- `createUncertaintyChartData(count)` - Array of uncertainty estimates
- `createSafetyTimelineData(count)` - Array of safety timeline points
- `createTimeSeriesData(count)` - Array of time series points

## MSW Handlers

Mock Service Worker (MSW) handlers are set up in `src/tests/mocks/handlers/`:

- `uncertainty-handlers.ts` - Uncertainty estimation endpoints
- `evaluation-handlers.ts` - Scenario evaluation endpoints
- `safety-handlers.ts` - Safety monitoring endpoints
- `active-learning-handlers.ts` - Active learning endpoints
- `error-handlers.ts` - Error scenario handlers

## Usage in Tests

### Component Tests

```typescript
import { createUncertaintyEstimate } from '@/tests/mocks/factories';

const mockData = createUncertaintyEstimate({
  confidence: 0.9,
  aleatoric_score: 0.1,
});
```

### Page Tests

```typescript
import { createScenario, createMany } from '@/tests/mocks/factories';

const mockScenarios = {
  items: createMany(() => createScenario(), 10),
  total: 10,
  page: 1,
  pageSize: 10,
};
```

### Visualization Tests

```typescript
import { createUncertaintyChartData } from '@/tests/mocks/factories';

const chartData = createUncertaintyChartData(20);
```

## Test Setup

MSW is automatically configured in `src/tests/setup.ts`:

- Server starts before all tests
- Handlers reset after each test
- Server closes after all tests

## Mock Data Presets

Preset scenarios and data are available in `src/tests/mocks/presets.ts`:

- `PRESET_SCENARIOS` - Common test scenarios
- Additional preset data for consistent testing

## Integration Status

✅ Mock data factories created
✅ MSW handlers configured
✅ Test setup integrated
✅ Component tests using factories
✅ Page tests using factories (23/39 passing, improving)
✅ Visualization tests using factories

## Test Status

- **Component/Hook Tests**: 217/217 passing (100%)
- **Page Tests**: 23/39 passing (59%)
- **Total**: 240/256 passing (94%)

## Recent Improvements

- Fixed Login test navigation mocking
- Added missing hook mocks for ActiveLearning and Safety pages
- Updated ScenarioDetail test to match actual component structure
- Improved test assertions to be more flexible

## Next Steps

1. Add more visualization-specific factories
2. Create preset data sets for common test scenarios
3. Add factories for edge cases and error states
4. Document factory parameters and usage patterns
