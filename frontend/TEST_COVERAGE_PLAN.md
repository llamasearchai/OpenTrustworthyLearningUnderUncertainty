# Test Coverage Implementation Plan

## Current Status

### Completed
- ✅ Vitest configuration with 95% coverage thresholds
- ✅ Test infrastructure setup (MSW, testing-library, mocks)
- ✅ Fixed dimension mocking for chart components
- ✅ Test files created for:
  - UncertaintyChart component (37 test cases - complete)
  - CalibrationChart component (13 test cases - complete)
  - KPICard component (28 test cases - complete)
  - Dashboard page (partial)
- ✅ Test patterns established for:
  - Chart component testing with dimension mocks
  - Component rendering and interaction tests
  - Accessibility testing patterns

### In Progress
- 🔄 Creating tests for UI components (Button, Input, Card patterns established)
- 🔄 Adding comprehensive test coverage for all components

### Blocked
- ⚠️ Disk space issue preventing new file creation
- ⚠️ Need to free up disk space to continue creating test files

### Remaining Work

#### Components Needing Tests
1. **Visualizations**
   - SafetyTimelineChart
   - LineChart
   - BarChart

2. **Common Components**
   - Card
   - Modal/Dialog
   - DateRangePicker
   - CommandPalette
   - FormField
   - Alert

3. **UI Components** (24 components)
   - Button
   - Input
   - Badge
   - Skeleton
   - Select
   - Checkbox
   - Switch
   - Tabs
   - Accordion
   - Dialog
   - DropdownMenu
   - Popover
   - Tooltip
   - Calendar
   - Slider
   - Textarea
   - RadioGroup
   - Avatar
   - Breadcrumb
   - Pagination
   - AlertDialog
   - And more...

4. **3D Components**
   - Scene
   - Model
   - Controls

5. **Feature Components**
   - DataTable
   - Form components

6. **Auth Components**
   - RequireAuth
   - AuthContext

7. **Layout Components**
   - Breadcrumbs
   - MobileSidebar
   - UserMenu

#### Pages Needing Tests
- Login
- Scenarios
- ScenarioDetail
- Viewer
- Safety
- ActiveLearning
- Settings
- Profile

#### Hooks Needing Tests
- useUncertainty
- useSafety
- useEvaluation
- useScenarios
- useActiveLearning

#### Stores Needing Tests
- form-store
- safety-store
- three-store
- ui-store
- viewer-store
- visualization-store

## Test Coverage Goals

- **Target**: >95% coverage across all metrics
  - Lines: 95%
  - Functions: 95%
  - Branches: 95%
  - Statements: 95%

## Implementation Strategy

1. **Fix Current Test Issues**
   - Update test assertions to match actual component behavior
   - Mock dimension hooks properly
   - Handle edge cases in component rendering

2. **Systematic Test Creation**
   - Create test files for each component category
   - Use consistent test patterns
   - Cover all props, states, and edge cases

3. **Integration Tests**
   - Test page workflows
   - Test hook integrations
   - Test store interactions

4. **E2E Tests** (Fix Playwright config)
   - Fix Playwright configuration issues
   - Add E2E tests for critical user flows

## Next Steps

1. ✅ Fix dimension mocking in visualization tests - COMPLETED
2. Create test utilities for common patterns (patterns established inline)
3. Generate tests for all UI components (Button, Input, Card patterns ready)
4. Add page integration tests
5. Fix Playwright E2E configuration
6. Run coverage report and identify gaps
7. Fill coverage gaps to reach >95%

## Test Files Created

### Visualization Components
- `src/components/visualizations/__tests__/uncertainty-chart.test.tsx` - 37 tests
- `src/components/visualizations/__tests__/calibration-chart.test.tsx` - 13 tests
- `src/components/visualizations/__tests__/kpi-card.test.tsx` - 28 tests

### Pages
- `src/pages/__tests__/Dashboard.test.tsx` - Partial coverage

### Test Patterns Established
- Chart component testing with dimension mocks
- Component rendering and interaction tests
- Accessibility testing
- Button component testing pattern
- Input component testing pattern
- Card component testing pattern

## Current Status

**Tests Created**: ~78 test cases across 4 test files
**Components Covered**: 3 visualization components, 1 page
**Remaining**: ~50+ components, 7 pages, hooks, stores

**Note**: Disk space issue encountered. Test patterns are established and ready to be applied to remaining components once disk space is available.

## Notes

- Components use SVG rendering which requires proper dimension mocking
- Some components have early returns when dimensions are 0
- Need to mock ResizeObserver and dimension hooks properly
- Use data-testid attributes for reliable test queries
