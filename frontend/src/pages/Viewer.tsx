/**
 * 3D Viewer Page - TLU Enhanced v2
 *
 * Interactive 3D visualization with trajectories, TTC warnings, OOD detection,
 * decision explainability, and temporal playback for Trustworthy Learning.
 *
 * @module pages/Viewer
 */

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Grid, Html, Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Card } from '@/components/common/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip } from '@/components/ui/tooltip';
import { Scene } from '@/components/3d/scene';
import { useThreeStore, selectPerformanceMetrics } from '@/stores/three-store';
import {
  Camera,
  Lightbulb,
  Settings,
  Download,
  RotateCcw,
  Grid3x3,
  AlertTriangle,
  Shield,
  Activity,
  Eye,
  Play,
  Pause,
  BarChart3,
  Gauge,
  Navigation,
  Clock,
  Filter,
  Zap,
  Target,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  SkipBack,
  SkipForward,
  Radio,
  CircleDot,
} from 'lucide-react';
import type {
  TLUObjectData,
  TLUSceneData,
  TTCWarning,
  DecisionFactor,
} from '@/tests/mocks/factories';
import { createTLUSceneData, createDecisionFactors } from '@/tests/mocks/factories';
import type { MitigationState } from '@/types/api';

// ============================================================================
// Trajectory Line Component
// ============================================================================

interface TrajectoryLineProps {
  points: Array<{ position: [number, number, number]; confidence: number }>;
  color: string;
  isPrediction: boolean;
}

function TrajectoryLine({ points, color, isPrediction }: TrajectoryLineProps) {
  if (points.length < 2) return null;

  const linePoints = points.map((p) => new THREE.Vector3(...p.position));

  return (
    <Line
      points={linePoints}
      color={color}
      lineWidth={isPrediction ? 2 : 3}
      dashed={isPrediction}
      dashSize={0.3}
      gapSize={0.15}
      opacity={isPrediction ? 0.6 : 0.8}
      transparent
    />
  );
}

// ============================================================================
// TTC Warning Line Component
// ============================================================================

interface TTCWarningLineProps {
  warning: TTCWarning;
  objects: TLUObjectData[];
}

function TTCWarningLine({ warning, objects }: TTCWarningLineProps) {
  const objA = objects.find((o) => o.id === warning.object_a_id);
  const objB = objects.find((o) => o.id === warning.object_b_id);

  if (!objA || !objB) return null;

  const colorMap = {
    low: '#22c55e',
    medium: '#f59e0b',
    high: '#f97316',
    critical: '#ef4444',
  };

  const midPoint: [number, number, number] = [
    (objA.position[0] + objB.position[0]) / 2,
    Math.max(objA.position[1], objB.position[1]) + 0.5,
    (objA.position[2] + objB.position[2]) / 2,
  ];

  return (
    <group>
      {/* Warning line between objects */}
      <Line
        points={[
          new THREE.Vector3(...objA.position),
          new THREE.Vector3(...midPoint),
          new THREE.Vector3(...objB.position),
        ]}
        color={colorMap[warning.severity]}
        lineWidth={3}
        dashed
        dashSize={0.2}
        gapSize={0.1}
      />
      {/* TTC label */}
      <Html position={midPoint} center>
        <div
          className={`px-2 py-1 rounded text-xs font-bold text-white ${
            warning.severity === 'critical'
              ? 'bg-red-600 animate-pulse'
              : warning.severity === 'high'
              ? 'bg-orange-500'
              : warning.severity === 'medium'
              ? 'bg-yellow-500 text-black'
              : 'bg-green-500'
          }`}
        >
          TTC: {warning.ttc_seconds.toFixed(1)}s
        </div>
      </Html>
      {/* Collision point marker */}
      {warning.collision_point && (
        <mesh position={warning.collision_point}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshBasicMaterial
            color={colorMap[warning.severity]}
            transparent
            opacity={0.7}
          />
        </mesh>
      )}
    </group>
  );
}

// ============================================================================
// Velocity Arrow Component
// ============================================================================

interface VelocityArrowProps {
  position: [number, number, number];
  velocity: [number, number, number];
  color: string;
}

function VelocityArrow({ position, velocity, color }: VelocityArrowProps) {
  const speed = Math.sqrt(velocity[0] ** 2 + velocity[2] ** 2);
  if (speed < 0.1) return null;

  const normalized: [number, number, number] = [
    velocity[0] / speed,
    0,
    velocity[2] / speed,
  ];
  const arrowLength = Math.min(speed * 0.15, 1.5);

  const endPoint: [number, number, number] = [
    position[0] + normalized[0] * arrowLength,
    position[1] + 0.5,
    position[2] + normalized[2] * arrowLength,
  ];

  return (
    <Line
      points={[
        new THREE.Vector3(position[0], position[1] + 0.5, position[2]),
        new THREE.Vector3(...endPoint),
      ]}
      color={color}
      lineWidth={4}
    />
  );
}

// ============================================================================
// Enhanced TLU Object Component
// ============================================================================

interface TLUObject3DProps {
  data: TLUObjectData;
  isSelected: boolean;
  isHovered: boolean;
  showUncertainty: boolean;
  showRisk: boolean;
  showMonitor: boolean;
  showTrajectory: boolean;
  showVelocity: boolean;
  showOOD: boolean;
  onSelect: () => void;
  onHover: (hovering: boolean) => void;
}

function TLUObject3D({
  data,
  isSelected,
  isHovered,
  showUncertainty,
  showRisk,
  showMonitor,
  showTrajectory,
  showVelocity,
  showOOD,
  onSelect,
  onHover,
}: TLUObject3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Animate OOD pulse
  useFrame((state) => {
    if (meshRef.current && data.ood.is_ood && showOOD) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.05;
      meshRef.current.scale.setScalar(scale);
    }
  });

  const getGeometry = () => {
    switch (data.type) {
      case 'agent':
        return <boxGeometry args={[1, 0.6, 1.8]} />;
      case 'vehicle':
        return <boxGeometry args={[0.9, 0.5, 1.5]} />;
      case 'pedestrian':
        return <capsuleGeometry args={[0.15, 0.5, 8, 16]} />;
      case 'obstacle':
        return <cylinderGeometry args={[0.4, 0.4, 0.4, 16]} />;
      case 'zone':
        return <ringGeometry args={[2.5, 3, 32]} />;
      default:
        return <sphereGeometry args={[0.3, 16, 16]} />;
    }
  };

  const getColor = () => {
    if (showOOD && data.ood.is_ood) return '#ef4444';
    if (isSelected) return '#ffffff';
    if (isHovered) return data.color + 'cc';
    return data.color;
  };

  const uncertaintyRadius = 0.5 + data.uncertainty.epistemic_score * 2;

  const getRiskColor = () => {
    if (data.risk.expected_risk > 0.6) return '#ef4444';
    if (data.risk.expected_risk > 0.3) return '#f59e0b';
    return '#22c55e';
  };

  return (
    <group position={data.position}>
      {/* History trail */}
      {showTrajectory && data.history.length > 0 && (
        <TrajectoryLine
          points={data.history}
          color={data.color}
          isPrediction={false}
        />
      )}

      {/* Predicted trajectory */}
      {showTrajectory && data.trajectory.length > 0 && (
        <TrajectoryLine
          points={data.trajectory}
          color={data.color}
          isPrediction={true}
        />
      )}

      {/* Velocity arrow */}
      {showVelocity && (
        <VelocityArrow
          position={data.position}
          velocity={data.motion.velocity}
          color={data.color}
        />
      )}

      {/* Main object mesh */}
      <mesh
        ref={meshRef}
        castShadow
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onPointerOver={() => onHover(true)}
        onPointerOut={() => onHover(false)}
        rotation={data.type === 'zone' ? [-Math.PI / 2, 0, 0] : [0, data.motion.heading, 0]}
      >
        {getGeometry()}
        <meshStandardMaterial
          color={getColor()}
          metalness={0.3}
          roughness={0.5}
          emissive={isSelected ? data.color : data.ood.is_ood && showOOD ? '#ef4444' : '#000000'}
          emissiveIntensity={isSelected ? 0.3 : data.ood.is_ood && showOOD ? 0.4 : 0}
          transparent={data.type === 'zone'}
          opacity={data.type === 'zone' ? 0.3 : 1}
        />
      </mesh>

      {/* OOD indicator ring */}
      {showOOD && data.ood.is_ood && data.type !== 'zone' && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.8, 0.9, 32]} />
          <meshBasicMaterial color="#ef4444" transparent opacity={0.6} />
        </mesh>
      )}

      {/* Uncertainty visualization ring */}
      {showUncertainty && data.type !== 'zone' && !data.ood.is_ood && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <ringGeometry args={[uncertaintyRadius - 0.05, uncertaintyRadius, 32]} />
          <meshBasicMaterial
            color={
              data.uncertainty.confidence > 0.7
                ? '#22c55e'
                : data.uncertainty.confidence > 0.4
                ? '#f59e0b'
                : '#ef4444'
            }
            transparent
            opacity={0.4}
          />
        </mesh>
      )}

      {/* Risk indicator bar */}
      {showRisk && data.type !== 'zone' && (
        <mesh position={[0.6, data.risk.expected_risk * 0.5, 0]}>
          <boxGeometry args={[0.08, Math.max(0.1, data.risk.expected_risk), 0.08]} />
          <meshBasicMaterial color={getRiskColor()} />
        </mesh>
      )}

      {/* Monitor alert indicator */}
      {showMonitor && data.monitor.triggered && (
        <mesh position={[0, 1.2, 0]}>
          <octahedronGeometry args={[0.15]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
      )}

      {/* Enhanced tooltip on hover/select */}
      {(isSelected || isHovered) && (
        <Html position={[0, 1.8, 0]} center distanceFactor={10}>
          <div className="px-3 py-2 bg-black/90 text-white text-xs rounded-lg shadow-xl min-w-[200px] backdrop-blur-sm border border-white/20">
            <div className="font-semibold text-sm mb-2 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: data.color }} />
              {data.label}
              {data.ood.is_ood && (
                <Badge variant="destructive" className="text-[9px] px-1 py-0">OOD</Badge>
              )}
            </div>

            {/* Speed & Motion */}
            <div className="mb-2 pb-2 border-b border-white/20">
              <div className="flex justify-between">
                <span className="text-gray-400">Speed:</span>
                <span>{(data.motion.speed * 3.6).toFixed(1)} km/h</span>
              </div>
            </div>

            {/* Uncertainty */}
            <div className="space-y-1 mb-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Confidence:</span>
                <span className={data.uncertainty.confidence > 0.7 ? 'text-green-400' : data.uncertainty.confidence > 0.4 ? 'text-yellow-400' : 'text-red-400'}>
                  {(data.uncertainty.confidence * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-gray-500">Aleatoric / Epistemic:</span>
                <span>{data.uncertainty.aleatoric_score.toFixed(2)} / {data.uncertainty.epistemic_score.toFixed(2)}</span>
              </div>
            </div>

            {/* Conformal Prediction */}
            <div className="mb-2 pb-2 border-b border-white/20">
              <div className="text-[10px] text-gray-400 mb-1">Prediction Set ({data.conformal.coverage_guarantee * 100}% coverage):</div>
              <div className="flex flex-wrap gap-1">
                {data.conformal.prediction_set.map((p) => (
                  <span key={p.class_id} className="px-1.5 py-0.5 bg-white/10 rounded text-[9px]">
                    {p.class_name} ({(p.probability * 100).toFixed(0)}%)
                  </span>
                ))}
              </div>
            </div>

            {/* Risk & TTC */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-400">Risk:</span>
                <span className={data.risk.is_acceptable ? 'text-green-400' : 'text-red-400'}>
                  {(data.risk.expected_risk * 100).toFixed(1)}%
                </span>
              </div>
              {data.ttc.ttc_seconds !== null && (
                <div className="flex justify-between">
                  <span className="text-gray-400">TTC:</span>
                  <span className={data.ttc.ttc_seconds < 2 ? 'text-red-400 font-bold' : data.ttc.ttc_seconds < 3 ? 'text-yellow-400' : 'text-green-400'}>
                    {data.ttc.ttc_seconds.toFixed(1)}s
                  </span>
                </div>
              )}
            </div>

            {/* OOD Details */}
            {data.ood.is_ood && (
              <div className="mt-2 pt-2 border-t border-red-500/50">
                <div className="text-red-400 text-[10px] font-medium mb-1">Out-of-Distribution Detected</div>
                <div className="text-[9px] text-gray-400">
                  Score: {(data.ood.ood_score * 100).toFixed(1)}% ({data.ood.contributing_detector})
                </div>
                {data.ood.anomalous_features.length > 0 && (
                  <div className="text-[9px] text-gray-400">
                    Anomalies: {data.ood.anomalous_features.join(', ')}
                  </div>
                )}
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}

// ============================================================================
// Scene Content
// ============================================================================

interface TLUSceneContentProps {
  sceneData: TLUSceneData;
  showUncertainty: boolean;
  showRisk: boolean;
  showMonitor: boolean;
  showTrajectory: boolean;
  showVelocity: boolean;
  showTTC: boolean;
  showOOD: boolean;
  filterHighRisk: boolean;
  filterOOD: boolean;
}

function TLUSceneContent({
  sceneData,
  showUncertainty,
  showRisk,
  showMonitor,
  showTrajectory,
  showVelocity,
  showTTC,
  showOOD,
  filterHighRisk,
  filterOOD,
}: TLUSceneContentProps) {
  const selectedId = useThreeStore((state) => state.selectedObjectId);
  const hoverId = useThreeStore((state) => state.hoveredObjectId);
  const { selectObject, hoverObject } = useThreeStore();

  // Filter objects
  const filteredObjects = useMemo(() => {
    return sceneData.objects.filter((obj) => {
      if (filterHighRisk && obj.risk.is_acceptable) return false;
      if (filterOOD && !obj.ood.is_ood) return false;
      return true;
    });
  }, [sceneData.objects, filterHighRisk, filterOOD]);

  return (
    <>
      <Grid
        position={[0, -0.01, 0]}
        args={[30, 30]}
        cellColor="#4b5563"
        sectionColor="#374151"
        cellThickness={1}
        sectionThickness={1.5}
        fadeDistance={30}
        fadeStrength={1}
      />

      {/* TTC Warning Lines */}
      {showTTC && sceneData.ttc_warnings.map((warning, i) => (
        <TTCWarningLine key={i} warning={warning} objects={sceneData.objects} />
      ))}

      {/* Objects */}
      {filteredObjects.map((obj) => (
        <TLUObject3D
          key={obj.id}
          data={obj}
          isSelected={selectedId === obj.id}
          isHovered={hoverId === obj.id}
          showUncertainty={showUncertainty}
          showRisk={showRisk}
          showMonitor={showMonitor}
          showTrajectory={showTrajectory}
          showVelocity={showVelocity}
          showOOD={showOOD}
          onSelect={() => selectObject(obj.id)}
          onHover={(hovering) => hoverObject(hovering ? obj.id : null)}
        />
      ))}

      {/* Global state indicator */}
      <Html position={[0, 5, 0]} center>
        <div className="px-4 py-2 bg-black/85 text-white text-xs rounded-lg backdrop-blur-sm border border-white/10">
          <span className="text-gray-400">System: </span>
          <span className={
            sceneData.globalState.mitigation_state === 'nominal' ? 'text-green-400' :
            sceneData.globalState.mitigation_state === 'cautious' ? 'text-yellow-400' :
            sceneData.globalState.mitigation_state === 'fallback' ? 'text-orange-400' :
            'text-red-400'
          }>
            {sceneData.globalState.mitigation_state.toUpperCase()}
          </span>
          {sceneData.globalState.ood_status.any_ood && (
            <span className="ml-2 text-red-400">[OOD DETECTED]</span>
          )}
        </div>
      </Html>
    </>
  );
}

// ============================================================================
// Decision Explainability Panel
// ============================================================================

interface DecisionPanelProps {
  factors: DecisionFactor[];
  state: MitigationState;
}

function DecisionPanel({ factors, state }: DecisionPanelProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Decision Factors</span>
        <Badge variant={state === 'nominal' ? 'default' : state === 'cautious' ? 'secondary' : 'destructive'}>
          {state}
        </Badge>
      </div>
      <div className="space-y-2">
        {factors.map((factor) => (
          <div key={factor.name} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{factor.name}</span>
              <span className={factor.value > factor.threshold ? 'text-red-400' : 'text-green-400'}>
                {factor.value.toFixed(2)}{factor.unit} / {factor.threshold}{factor.unit}
              </span>
            </div>
            <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className={`absolute h-full transition-all ${
                  factor.contribution > 0 ? 'bg-red-500' : 'bg-green-500'
                }`}
                style={{
                  width: `${Math.abs(factor.contribution) * 100}%`,
                  left: factor.contribution > 0 ? '50%' : `${50 - Math.abs(factor.contribution) * 50}%`,
                }}
              />
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/50" />
            </div>
          </div>
        ))}
      </div>
      <div className="text-[10px] text-muted-foreground pt-2 border-t">
        Left = toward NOMINAL | Right = toward ESCALATION
      </div>
    </div>
  );
}

// ============================================================================
// Timeline Scrubber Component
// ============================================================================

interface TimelineScrubberProps {
  playback: TLUSceneData['playback'];
  onTimeChange: (time: number) => void;
  onPlayPause: () => void;
  onSpeedChange: (speed: number) => void;
  onToggleLive: () => void;
}

function TimelineScrubber({
  playback,
  onTimeChange,
  onPlayPause,
  onSpeedChange,
  onToggleLive,
}: TimelineScrubberProps) {
  const progress = ((playback.current_time - playback.start_time) / (playback.end_time - playback.start_time)) * 100;

  const formatTime = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleTimeString('en-US', { hour12: false });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onTimeChange(playback.start_time)}>
          <SkipBack className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onTimeChange(Math.max(playback.start_time, playback.current_time - 1000))}>
          <ChevronLeft className="h-3 w-3" />
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={onPlayPause}>
          {playback.is_live ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onTimeChange(Math.min(playback.end_time, playback.current_time + 1000))}>
          <ChevronRight className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onTimeChange(playback.end_time)}>
          <SkipForward className="h-3 w-3" />
        </Button>
        <Select value={playback.playback_speed.toString()} onValueChange={(v) => onSpeedChange(parseFloat(v))}>
          <SelectTrigger className="w-16 h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0.25">0.25x</SelectItem>
            <SelectItem value="0.5">0.5x</SelectItem>
            <SelectItem value="1">1x</SelectItem>
            <SelectItem value="2">2x</SelectItem>
            <SelectItem value="4">4x</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant={playback.is_live ? 'default' : 'outline'}
          size="sm"
          className="h-7 text-xs ml-auto"
          onClick={onToggleLive}
        >
          <Radio className={`h-3 w-3 mr-1 ${playback.is_live ? 'text-red-400' : ''}`} />
          LIVE
        </Button>
      </div>
      <div className="relative">
        <Slider
          value={[progress]}
          onValueChange={([v]) => {
            const time = playback.start_time + (v / 100) * (playback.end_time - playback.start_time);
            onTimeChange(time);
          }}
          max={100}
          step={0.1}
          className="w-full"
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{formatTime(playback.start_time)}</span>
        <span className="font-mono">{formatTime(playback.current_time)}</span>
        <span>{formatTime(playback.end_time)}</span>
      </div>
    </div>
  );
}

// ============================================================================
// Performance Stats
// ============================================================================

function PerformanceStats() {
  const metrics = useThreeStore(selectPerformanceMetrics);
  return (
    <div className="space-y-1 text-xs">
      <div className="flex justify-between">
        <span className="text-muted-foreground">FPS:</span>
        <Badge variant={metrics.fps >= 55 ? 'default' : metrics.fps >= 30 ? 'secondary' : 'destructive'}>
          {Math.round(metrics.fps)}
        </Badge>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Draw Calls:</span>
        <span className="font-mono">{metrics.drawCalls}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Triangles:</span>
        <span className="font-mono">{metrics.triangles.toLocaleString()}</span>
      </div>
    </div>
  );
}

// ============================================================================
// Status Panel
// ============================================================================

interface StatusPanelProps {
  sceneData: TLUSceneData;
}

function StatusPanel({ sceneData }: StatusPanelProps) {
  const { globalState } = sceneData;
  const triggeredMonitors = globalState.active_monitors.filter((m) => m.triggered);
  const highRiskCount = sceneData.objects.filter((o) => !o.risk.is_acceptable).length;
  const oodCount = sceneData.objects.filter((o) => o.ood.is_ood).length;

  return (
    <div className="space-y-4">
      {/* Mitigation State */}
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${
          globalState.mitigation_state === 'nominal' ? 'bg-green-500' :
          globalState.mitigation_state === 'cautious' ? 'bg-yellow-500' :
          globalState.mitigation_state === 'fallback' ? 'bg-orange-500' :
          'bg-red-500'
        }`} />
        <span className="text-sm font-medium capitalize">
          {globalState.mitigation_state.replace('_', ' ')}
        </span>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2 bg-secondary/50 rounded">
          <div className="text-muted-foreground">Confidence</div>
          <div className="font-medium">{(globalState.overall_uncertainty.confidence * 100).toFixed(1)}%</div>
        </div>
        <div className="p-2 bg-secondary/50 rounded">
          <div className="text-muted-foreground">Risk</div>
          <div className={`font-medium ${globalState.overall_risk.is_acceptable ? 'text-green-500' : 'text-red-500'}`}>
            {(globalState.overall_risk.expected_risk * 100).toFixed(1)}%
          </div>
        </div>
        <div className="p-2 bg-secondary/50 rounded">
          <div className="text-muted-foreground">High Risk</div>
          <div className={`font-medium ${highRiskCount > 0 ? 'text-red-500' : ''}`}>{highRiskCount}</div>
        </div>
        <div className="p-2 bg-secondary/50 rounded">
          <div className="text-muted-foreground">OOD Objects</div>
          <div className={`font-medium ${oodCount > 0 ? 'text-red-500' : ''}`}>{oodCount}</div>
        </div>
      </div>

      {/* TTC Warnings */}
      {sceneData.ttc_warnings.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs font-medium text-yellow-500 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            TTC Warnings ({sceneData.ttc_warnings.length})
          </span>
          {sceneData.ttc_warnings.slice(0, 3).map((w, i) => (
            <div key={i} className={`text-xs p-2 rounded border ${
              w.severity === 'critical' ? 'bg-red-500/10 border-red-500/30' :
              w.severity === 'high' ? 'bg-orange-500/10 border-orange-500/30' :
              'bg-yellow-500/10 border-yellow-500/30'
            }`}>
              <div className="font-medium">{w.ttc_seconds.toFixed(1)}s - {w.severity.toUpperCase()}</div>
            </div>
          ))}
        </div>
      )}

      {/* Triggered Monitors */}
      {triggeredMonitors.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs font-medium text-red-500 flex items-center gap-1">
            <Zap className="h-3 w-3" />
            Active Alerts ({triggeredMonitors.length})
          </span>
          {triggeredMonitors.slice(0, 2).map((m) => (
            <div key={m.monitor_id} className="text-xs p-2 bg-red-500/10 rounded border border-red-500/20">
              <div className="font-medium text-red-400">{m.monitor_id}</div>
              <div className="text-muted-foreground truncate">{m.message}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Viewer Component
// ============================================================================

export default function Viewer() {
  const { id } = useParams<{ id: string }>();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [showControls, setShowControls] = useState(true);
  const [environment, setEnvironment] = useState<'city' | 'sunset' | 'dawn' | 'night' | 'warehouse'>('city');
  const [background, setBackground] = useState('#1a1a2e');

  // Visualization toggles
  const [showUncertainty, setShowUncertainty] = useState(true);
  const [showRisk, setShowRisk] = useState(true);
  const [showMonitor, setShowMonitor] = useState(true);
  const [showTrajectory, setShowTrajectory] = useState(true);
  const [showVelocity, setShowVelocity] = useState(true);
  const [showTTC, setShowTTC] = useState(true);
  const [showOOD, setShowOOD] = useState(true);

  // Filters
  const [filterHighRisk, setFilterHighRisk] = useState(false);
  const [filterOOD, setFilterOOD] = useState(false);

  // Scene data
  const [sceneData, setSceneData] = useState<TLUSceneData>(() => createTLUSceneData(8));
  const [isSimulating, setIsSimulating] = useState(false);

  // Simulation loop
  useEffect(() => {
    if (!isSimulating) return;
    const interval = setInterval(() => {
      setSceneData(createTLUSceneData(8));
    }, 2000);
    return () => clearInterval(interval);
  }, [isSimulating]);

  const {
    sceneConfig,
    toggleShadows,
    togglePostProcessing,
    resetCamera,
    setCameraPosition,
    updateSceneConfig,
    setAmbientIntensity,
    setDirectionalIntensity,
    ambientIntensity,
    directionalIntensity,
  } = useThreeStore();

  const handleScreenshot = useCallback(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current.querySelector('canvas');
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tlu-viewer-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }, []);

  const handleViewChange = useCallback((view: string) => {
    const views: Record<string, [number, number, number]> = {
      front: [0, 2, 12],
      back: [0, 2, -12],
      top: [0, 15, 0],
      right: [12, 2, 0],
      left: [-12, 2, 0],
      iso: [8, 8, 8],
    };
    const position = views[view];
    if (position) setCameraPosition({ x: position[0], y: position[1], z: position[2] });
  }, [setCameraPosition]);

  // Timeline handlers
  const handleTimeChange = useCallback((time: number) => {
    setSceneData((prev) => ({
      ...prev,
      playback: { ...prev.playback, current_time: time, is_live: false },
    }));
  }, []);

  const handlePlayPause = useCallback(() => {
    setSceneData((prev) => ({
      ...prev,
      playback: { ...prev.playback, is_live: !prev.playback.is_live },
    }));
  }, []);

  const handleSpeedChange = useCallback((speed: number) => {
    setSceneData((prev) => ({
      ...prev,
      playback: { ...prev.playback, playback_speed: speed },
    }));
  }, []);

  const handleToggleLive = useCallback(() => {
    setSceneData((prev) => ({
      ...prev,
      playback: { ...prev.playback, is_live: true, current_time: Date.now() },
    }));
  }, []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            TLU 3D Viewer
          </h1>
          <p className="text-sm text-muted-foreground">
            {id ? `Scenario: ${id}` : 'Trustworthy Learning Uncertainty Visualization'}
          </p>
        </div>
        <div className="flex gap-2">
          <Tooltip content={isSimulating ? 'Stop Simulation' : 'Start Simulation'}>
            <Button
              variant={isSimulating ? 'default' : 'outline'}
              size="sm"
              onClick={() => setIsSimulating(!isSimulating)}
            >
              {isSimulating ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
          </Tooltip>
          <Button variant="outline" size="sm" onClick={handleScreenshot}>
            <Download className="h-4 w-4 mr-1" />
            Screenshot
          </Button>
          <Button variant="outline" size="sm" onClick={resetCamera}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowControls(!showControls)}>
            <Settings className="h-4 w-4 mr-1" />
            {showControls ? 'Hide' : 'Show'}
          </Button>
        </div>
      </div>

      {/* Timeline Scrubber */}
      <Card className="p-3">
        <TimelineScrubber
          playback={sceneData.playback}
          onTimeChange={handleTimeChange}
          onPlayPause={handlePlayPause}
          onSpeedChange={handleSpeedChange}
          onToggleLive={handleToggleLive}
        />
      </Card>

      <div className="grid gap-4 lg:grid-cols-4">
        {/* 3D Canvas */}
        <div className={showControls ? 'lg:col-span-3' : 'lg:col-span-4'}>
          <Card className="overflow-hidden">
            <div ref={canvasRef} className="h-[600px] w-full relative">
              <Scene
                camera={{ position: [8, 6, 8], fov: 50 }}
                controls="orbit"
                showStats={false}
                background={background}
                environment={environment}
                shadows={sceneConfig.shadows}
                className="w-full h-full"
              >
                <TLUSceneContent
                  sceneData={sceneData}
                  showUncertainty={showUncertainty}
                  showRisk={showRisk}
                  showMonitor={showMonitor}
                  showTrajectory={showTrajectory}
                  showVelocity={showVelocity}
                  showTTC={showTTC}
                  showOOD={showOOD}
                  filterHighRisk={filterHighRisk}
                  filterOOD={filterOOD}
                />
              </Scene>
            </div>
          </Card>
        </div>

        {/* Controls Panel */}
        {showControls && (
          <div className="space-y-4">
            {/* Status */}
            <Card className="p-4">
              <h3 className="mb-3 font-semibold flex items-center gap-2 text-sm">
                <Activity className="h-4 w-4" />
                System Status
              </h3>
              <StatusPanel sceneData={sceneData} />
            </Card>

            {/* Decision Explainability */}
            <Card className="p-4">
              <h3 className="mb-3 font-semibold flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4" />
                Why This State?
              </h3>
              <DecisionPanel
                factors={sceneData.globalState.decision_factors}
                state={sceneData.globalState.mitigation_state}
              />
            </Card>

            {/* Overlays */}
            <Card className="p-4">
              <h3 className="mb-3 font-semibold flex items-center gap-2 text-sm">
                <Eye className="h-4 w-4" />
                Data Overlays
              </h3>
              <div className="space-y-2">
                {[
                  { id: 'trajectory', label: 'Trajectories', icon: Navigation, state: showTrajectory, setState: setShowTrajectory },
                  { id: 'velocity', label: 'Velocity', icon: TrendingUp, state: showVelocity, setState: setShowVelocity },
                  { id: 'ttc', label: 'TTC Warnings', icon: AlertTriangle, state: showTTC, setState: setShowTTC },
                  { id: 'ood', label: 'OOD Detection', icon: CircleDot, state: showOOD, setState: setShowOOD },
                  { id: 'uncertainty', label: 'Uncertainty', icon: Gauge, state: showUncertainty, setState: setShowUncertainty },
                  { id: 'risk', label: 'Risk Bars', icon: BarChart3, state: showRisk, setState: setShowRisk },
                  { id: 'monitor', label: 'Alerts', icon: Zap, state: showMonitor, setState: setShowMonitor },
                ].map(({ id, label, icon: Icon, state, setState }) => (
                  <div key={id} className="flex items-center justify-between">
                    <Label htmlFor={id} className="flex items-center gap-2 text-xs">
                      <Icon className="h-3 w-3" />
                      {label}
                    </Label>
                    <Switch id={id} checked={state} onCheckedChange={setState} />
                  </div>
                ))}
              </div>
            </Card>

            {/* Filters */}
            <Card className="p-4">
              <h3 className="mb-3 font-semibold flex items-center gap-2 text-sm">
                <Filter className="h-4 w-4" />
                Filters
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="filter-risk" className="text-xs">High Risk Only</Label>
                  <Switch id="filter-risk" checked={filterHighRisk} onCheckedChange={setFilterHighRisk} />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="filter-ood" className="text-xs">OOD Only</Label>
                  <Switch id="filter-ood" checked={filterOOD} onCheckedChange={setFilterOOD} />
                </div>
              </div>
            </Card>

            {/* Camera */}
            <Card className="p-4">
              <h3 className="mb-3 font-semibold flex items-center gap-2 text-sm">
                <Camera className="h-4 w-4" />
                Camera
              </h3>
              <div className="grid grid-cols-3 gap-1">
                {['front', 'back', 'top', 'left', 'right', 'iso'].map((view) => (
                  <Button key={view} variant="outline" size="sm" className="text-xs h-7" onClick={() => handleViewChange(view)}>
                    {view}
                  </Button>
                ))}
              </div>
            </Card>

            {/* Performance */}
            <Card className="p-4">
              <h3 className="mb-3 font-semibold text-sm">Performance</h3>
              <PerformanceStats />
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
