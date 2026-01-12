# TLU 3D Viewer: Critique & Improvement Roadmap

## Executive Summary

The current 3D viewer provides a foundational visualization of uncertainty and risk data, but lacks the depth required for real-world autonomous system monitoring. This document outlines critical gaps and proposes improvements that would make the viewer genuinely valuable for safety engineers, ML engineers, and operators.

---

## Current State Assessment

### What Works
- Basic 3D scene with object representation
- Uncertainty rings showing epistemic uncertainty magnitude
- Risk indicator bars with color coding
- Monitor alert indicators
- Hover tooltips with key metrics
- Scenario preset switching
- Basic simulation mode

### Critical Gaps

| Category | Gap | Impact |
|----------|-----|--------|
| Temporal | No trajectory/prediction visualization | Cannot assess future risk |
| Spatial | Abstract grid, no map context | Cannot relate to real environment |
| Safety | No TTC/collision cone visualization | Missing critical safety info |
| OOD | OOD detection not visualized | Core TLU feature invisible |
| Conformal | Prediction sets not shown | Statistical guarantees hidden |
| History | No playback/timeline scrubbing | Cannot review incidents |
| Explainability | No decision reasoning shown | Black box system |

---

## Detailed Critique & Improvements

### 1. TRAJECTORY & PREDICTION VISUALIZATION

**Current Problem:**
Objects are static points with no motion context. Users cannot see where objects are heading or what the system predicts.

**Improvements:**

```typescript
interface TrajectoryData {
  object_id: string;
  predicted_path: Array<{
    position: [number, number, number];
    timestamp: number;
    confidence: number;  // Decreases further into future
  }>;
  uncertainty_cone: {
    base_radius: number;
    expansion_rate: number;  // How fast uncertainty grows
  };
  velocity: [number, number, number];
  acceleration: [number, number, number];
}
```

**Visual Elements:**
- **Predicted trajectory lines** - Dashed lines showing predicted path (3-5 seconds ahead)
- **Uncertainty cones** - Semi-transparent cones that widen into the future
- **Velocity vectors** - Arrows showing current motion direction and speed
- **Ghost positions** - Faded object positions at future timestamps
- **Path history trail** - Show where object has been (last 2-3 seconds)

**User Value:** Safety engineers can immediately see potential collision courses and understand why the system is in a cautious state.

---

### 2. TIME-TO-COLLISION (TTC) VISUALIZATION

**Current Problem:**
TTC is mentioned in monitor messages but not visualized spatially. This is critical safety information.

**Improvements:**

```typescript
interface TTCVisualization {
  object_pair: [string, string];  // IDs of objects on collision course
  ttc_seconds: number;
  collision_point: [number, number, number];
  collision_probability: number;
  interaction_zone: {
    type: 'merge' | 'cross' | 'follow' | 'opposing';
    geometry: 'polygon' | 'circle';
    vertices?: [number, number][];
  };
}
```

**Visual Elements:**
- **Collision warning lines** - Red dashed lines between objects on collision course
- **TTC countdown labels** - Floating labels showing "TTC: 2.3s"
- **Collision point markers** - Pulsing indicator at predicted collision location
- **Interaction zones** - Highlighted floor regions where paths intersect
- **Severity gradient** - Line color changes from yellow → orange → red as TTC decreases

**User Value:** Operators instantly understand why alerts fired and can assess if the system response is appropriate.

---

### 3. OUT-OF-DISTRIBUTION (OOD) DETECTION OVERLAY

**Current Problem:**
OOD detection is a core TLU capability but is completely invisible in the viewer.

**Improvements:**

```typescript
interface OODVisualization {
  object_id: string;
  ood_score: number;
  is_ood: boolean;
  contributing_factors: Array<{
    detector: 'mahalanobis' | 'energy' | 'label_shift';
    score: number;
    explanation: string;
  }>;
  feature_anomalies: Array<{
    feature_name: string;
    expected_range: [number, number];
    actual_value: number;
  }>;
}
```

**Visual Elements:**
- **OOD boundary visualization** - Show the learned distribution boundary as a subtle mesh
- **OOD score heatmap** - Color objects by OOD score (in-distribution = blue, OOD = red)
- **Anomaly sparklines** - Small charts in tooltip showing which features are anomalous
- **Distribution context** - Mini 2D plot showing object's position in feature space
- **OOD alert pulses** - Animated rings emanating from OOD objects

**User Value:** ML engineers can understand why the model is uncertain and what's different about novel inputs.

---

### 4. CONFORMAL PREDICTION SET VISUALIZATION

**Current Problem:**
Conformal prediction sets provide statistical guarantees but are just numbers in tooltips.

**Improvements:**

```typescript
interface ConformalVisualization {
  object_id: string;
  prediction_set: Array<{
    class_id: number;
    class_name: string;
    probability: number;
  }>;
  set_size: number;
  coverage_guarantee: number;
  is_singleton: boolean;  // Set size = 1 means high confidence
}
```

**Visual Elements:**
- **Class probability bars** - Horizontal bars showing each class in prediction set
- **Set size indicator** - Visual badge showing |C| = 1, 2, 3, etc.
- **Coverage guarantee label** - "90% coverage" badge
- **Ambiguity highlighting** - Objects with large prediction sets glow differently
- **Class icons** - Small icons representing each possible class

**User Value:** Users understand not just what the model predicts, but the statistical confidence bounds.

---

### 5. SAFETY ENVELOPE VISUALIZATION

**Current Problem:**
Safety constraints exist in the data but aren't shown spatially.

**Improvements:**

```typescript
interface SafetyEnvelopeVisualization {
  hard_constraints: Array<{
    name: string;
    type: 'speed' | 'distance' | 'boundary' | 'acceleration';
    current_value: number;
    limit: number;
    margin: number;  // How close to violation
    geometry?: GeoJSON;  // For spatial constraints
  }>;
  soft_constraints: Array<{
    name: string;
    current_value: number;
    target: number;
    penalty: number;
  }>;
  operational_design_domain: {
    boundary: GeoJSON;
    current_coverage: number;
  };
}
```

**Visual Elements:**
- **ODD boundary** - Visible perimeter showing operational design domain
- **Speed limit zones** - Color-coded floor regions showing speed limits
- **Minimum distance circles** - Rings around ego showing required clearance
- **Constraint margin bars** - Compact bars showing distance to each constraint limit
- **Violation flash** - Red flash effect when constraint is violated

**User Value:** Operators see exactly what constraints the system is respecting and how close to limits it is.

---

### 6. TEMPORAL PLAYBACK & TIMELINE

**Current Problem:**
No ability to review what happened, scrub through time, or analyze incidents.

**Improvements:**

```typescript
interface TimelineControl {
  current_timestamp: number;
  playback_speed: number;  // 0.25x, 0.5x, 1x, 2x, 4x
  is_playing: boolean;
  is_live: boolean;
  time_range: {
    start: number;
    end: number;
  };
  bookmarks: Array<{
    timestamp: number;
    label: string;
    type: 'incident' | 'state_change' | 'user_marked';
  }>;
  state_transitions: Array<{
    timestamp: number;
    from_state: MitigationState;
    to_state: MitigationState;
  }>;
}
```

**Visual Elements:**
- **Timeline scrubber** - Horizontal timeline with drag-to-seek
- **State transition markers** - Colored dots on timeline showing state changes
- **Incident flags** - Warning markers for triggered monitors
- **Playback controls** - Play, pause, step forward/back, speed control
- **Live mode toggle** - Switch between live streaming and playback
- **Time range selector** - Zoom into specific time windows

**User Value:** Safety analysts can review incidents frame-by-frame to understand what happened and why.

---

### 7. MULTI-SENSOR FUSION VISUALIZATION

**Current Problem:**
No indication of which sensors contribute to perception or where uncertainty comes from.

**Improvements:**

```typescript
interface SensorVisualization {
  sensors: Array<{
    sensor_id: string;
    type: 'camera' | 'lidar' | 'radar' | 'ultrasonic';
    position: [number, number, number];
    orientation: [number, number, number];
    field_of_view: {
      horizontal: number;
      vertical: number;
      range: number;
    };
    health: 'nominal' | 'degraded' | 'failed';
    contribution_weight: number;  // To current perception
  }>;
  coverage_map: {
    // Probability of detection at each point
    grid_resolution: number;
    data: Float32Array;
  };
  occlusions: Array<{
    occluded_region: GeoJSON;
    cause: string;
  }>;
}
```

**Visual Elements:**
- **Sensor FOV cones** - Semi-transparent cones showing each sensor's coverage
- **Coverage heatmap** - Floor overlay showing detection probability
- **Sensor health indicators** - Status badges on sensor positions
- **Occlusion shadows** - Dark regions where sensors can't see
- **Detection attribution** - Lines from object to contributing sensors

**User Value:** Engineers understand why certain objects have higher uncertainty (poor sensor coverage).

---

### 8. DECISION EXPLAINABILITY PANEL

**Current Problem:**
Users see the mitigation state but don't understand WHY the system made that decision.

**Improvements:**

```typescript
interface DecisionExplanation {
  current_state: MitigationState;
  decision_factors: Array<{
    factor: string;
    weight: number;
    value: number;
    contribution: number;  // How much this pushed toward current state
    threshold: number;
  }>;
  counterfactuals: Array<{
    description: string;
    would_change_to: MitigationState;
  }>;
  decision_tree_path: Array<{
    node: string;
    condition: string;
    result: boolean;
  }>;
}
```

**Visual Elements:**
- **Decision waterfall chart** - Shows contribution of each factor
- **Threshold indicators** - Where current values sit vs. thresholds
- **"What if" panel** - "If TTC were 0.5s higher, state would be NOMINAL"
- **Decision tree visualization** - Expandable tree showing logic path
- **Factor trend sparklines** - How each factor changed over last N seconds

**User Value:** Operators can explain system behavior to stakeholders and identify false positives.

---

### 9. FILTERING & FOCUS MODES

**Current Problem:**
All objects shown equally, no way to focus on what matters.

**Improvements:**

```typescript
interface FilterSettings {
  object_types: {
    vehicles: boolean;
    pedestrians: boolean;
    obstacles: boolean;
    zones: boolean;
  };
  risk_threshold: {
    min: number;
    max: number;
  };
  confidence_threshold: {
    min: number;
    max: number;
  };
  ood_only: boolean;
  triggered_monitors_only: boolean;
  distance_from_ego: {
    min: number;
    max: number;
  };
  focus_mode: 'all' | 'high_risk' | 'low_confidence' | 'ood' | 'custom';
}
```

**Visual Elements:**
- **Filter panel** - Collapsible panel with filter controls
- **Quick filter buttons** - "High Risk Only", "OOD Only", "Alerts Only"
- **Dimming effect** - Non-matching objects become semi-transparent
- **Count badges** - "Showing 5 of 12 objects"
- **Focus spotlight** - Highlight effect on filtered objects

**User Value:** Operators can quickly focus on concerning objects without visual clutter.

---

### 10. ACCESSIBILITY & USABILITY

**Current Problem:**
Color-dependent visualization, no keyboard navigation, missing screen reader support.

**Improvements:**

- **Color-blind modes** - Deuteranopia, Protanopia, Tritanopia palettes
- **Pattern overlays** - Stripes, dots, crosshatch in addition to color
- **High contrast mode** - Black/white with strong outlines
- **Keyboard navigation** - Tab through objects, arrow keys for camera
- **Screen reader descriptions** - ARIA labels with full state description
- **Reduced motion mode** - Disable animations for vestibular sensitivity
- **Font scaling** - Support for larger text sizes
- **Touch support** - Pinch to zoom, swipe to pan on tablet

---

### 11. PERFORMANCE OPTIMIZATIONS

**Current Problem:**
Current implementation may struggle with many objects.

**Improvements:**

- **Level of detail (LOD)** - Simpler geometry for distant objects
- **Frustum culling** - Don't render off-screen objects
- **Instanced rendering** - Use instanced meshes for similar objects
- **Object pooling** - Reuse mesh objects instead of creating/destroying
- **Web Workers** - Move data processing off main thread
- **Progressive loading** - Load detail as user zooms in
- **Render throttling** - Reduce FPS when tab not focused

---

### 12. DATA INTEGRATION & REAL-TIME

**Current Problem:**
Using static mock data, no live data streaming.

**Improvements:**

```typescript
interface RealtimeConnection {
  websocket_url: string;
  connection_status: 'connected' | 'reconnecting' | 'disconnected';
  latency_ms: number;
  message_rate: number;  // Messages per second
  buffer_size: number;
  last_update: number;
}
```

- **WebSocket integration** - Live data streaming from backend
- **Connection status indicator** - Show when disconnected
- **Latency display** - Show data freshness
- **Buffering** - Smooth playback despite network jitter
- **Reconnection logic** - Auto-reconnect with backoff
- **Data rate indicator** - Show incoming message rate

---

## Implementation Priority Matrix

| Priority | Feature | Effort | Impact | Dependencies |
|----------|---------|--------|--------|--------------|
| P0 | Trajectory visualization | Medium | Critical | Trajectory data from backend |
| P0 | TTC visualization | Low | Critical | TTC data already available |
| P0 | Timeline playback | Medium | High | State history storage |
| P1 | OOD visualization | Medium | High | OOD scores in data |
| P1 | Safety envelope viz | Medium | High | Constraint data |
| P1 | Decision explainability | High | High | Decision logging |
| P2 | Conformal prediction viz | Low | Medium | Already in data |
| P2 | Filtering & focus | Low | Medium | Frontend only |
| P2 | Accessibility | Medium | Medium | Frontend only |
| P3 | Sensor fusion viz | High | Medium | Sensor data from backend |
| P3 | Performance optimization | Medium | Medium | Frontend only |
| P3 | Real-time WebSocket | Medium | High | Backend WebSocket support |

---

## Mockup: Enhanced Viewer Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  TLU 3D Viewer                    [Timeline ▶ ────●──────── 14:32:05]  [⚙]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────┐  ┌───────────────────────┐ │
│  │                                             │  │ SYSTEM STATUS         │ │
│  │     [3D SCENE]                              │  │ ● CAUTIOUS            │ │
│  │                                             │  │                       │ │
│  │     ╭─ Ego ─╮        ╭─ Ped ─╮             │  │ Confidence: ████░ 72% │ │
│  │     │  ══►  │◄──TTC──│   ●   │             │  │ Risk:       ███░░ 35% │ │
│  │     ╰───────╯  2.1s  ╰───────╯             │  │ OOD Score:  █░░░░ 18% │ │
│  │         │              ╱                    │  │                       │ │
│  │         │ path       ╱ predicted           │  │ ▼ DECISION FACTORS    │ │
│  │         ▼          ╱   path                │  │ TTC:        ████▓ 2.1s│ │
│  │         ○        ○                         │  │ Ped dist:   ███░░ 3.2m│ │
│  │         │        ╲                         │  │ Uncertainty: ██░░░ 28%│ │
│  │         ○          ╲                       │  │                       │ │
│  │                      ○                     │  │ ▼ ACTIVE MONITORS     │ │
│  │    [uncertainty cone expanding →]          │  │ ⚠ TTC Warning    0.7  │ │
│  │                                             │  │ ○ OOD Check      0.1  │ │
│  └─────────────────────────────────────────────┘  │ ○ Lane Keep      0.0  │ │
│                                                    │                       │ │
│  ┌─ FILTERS ─┐  ┌─ OVERLAYS ─────────────────┐   │ ▼ SELECTED: Pedestrian│ │
│  │ ☑ Vehicles│  │ ☑ Trajectories ☑ TTC       │   │ Confidence: 65%       │ │
│  │ ☑ Peds    │  │ ☑ Uncertainty  ☑ OOD       │   │ Prediction: {ped, cyc}│ │
│  │ ☑ Obstacle│  │ ☑ Risk bars    ☑ Sensors   │   │ OOD: IN-DISTRIBUTION  │ │
│  └───────────┘  └────────────────────────────┘   └───────────────────────┘ │
│                                                                             │
│  Timeline: [◀◀][◀][▶][▶▶] 1x   ═══●═══════════════════════════════  LIVE   │
│            ▲State: NOMINAL   ▲CAUTIOUS              ▲Warning fired          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Next Steps

1. **Create detailed technical specs** for P0 features
2. **Design new data types** needed from backend
3. **Build trajectory visualization** component
4. **Implement timeline scrubber** with state history
5. **Add TTC visualization** using existing monitor data
6. **User testing** with safety engineers for feedback

---

## Conclusion

The current viewer is a good foundation but needs significant enhancements to provide real-world value. The highest-impact improvements are:

1. **Trajectory prediction visualization** - See where things are going
2. **TTC/collision visualization** - Understand imminent risks
3. **Timeline playback** - Review and analyze incidents
4. **Decision explainability** - Understand why the system acts

These improvements would transform the viewer from a demo tool into a production-grade safety monitoring interface.
