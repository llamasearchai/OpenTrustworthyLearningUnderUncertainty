/**
 * Three.js Interactions
 *
 * Comprehensive hooks for 3D object interactions including raycasting,
 * hover, selection, dragging, and transform controls.
 *
 * @module lib/three/interactions
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useThreeStore } from '@/stores/three-store';

// ============================================================================
// Types
// ============================================================================

export interface RaycastOptions {
  /** Recursively check descendants */
  recursive?: boolean;
  /** Threshold distance for raycaster (affects point/line precision) */
  threshold?: number;
  /** Filter function for intersections */
  filter?: (intersection: THREE.Intersection) => boolean;
  /** Whether to sort by distance (closest first) */
  sort?: boolean;
  /** Layers to raycast against */
  layers?: THREE.Layers;
}

export interface RaycastResult {
  /** Array of intersections */
  intersections: THREE.Intersection[];
  /** Closest intersection */
  closest: THREE.Intersection | null;
  /** Ray used for raycasting */
  ray: THREE.Ray;
}

export interface HoverState {
  /** Whether any object is hovered */
  hovered: boolean;
  /** Currently hovered object */
  hoveredObject: THREE.Object3D | null;
  /** Set hover state manually */
  setHovered: (object: THREE.Object3D | null) => void;
  /** Intersection point */
  point: THREE.Vector3 | null;
  /** Surface normal at intersection */
  normal: THREE.Vector3 | null;
}

export type SelectionMode = 'single' | 'multi';

export interface SelectionState {
  /** Set of selected object IDs */
  selectedIds: Set<string>;
  /** Select an object */
  select: (id: string) => void;
  /** Deselect an object */
  deselect: (id: string) => void;
  /** Toggle selection of an object */
  toggleSelect: (id: string) => void;
  /** Clear all selections */
  clearSelection: () => void;
  /** Check if an object is selected */
  isSelected: (id: string) => boolean;
  /** Select multiple objects */
  selectMultiple: (ids: string[]) => void;
  /** Get array of selected IDs */
  getSelectedArray: () => string[];
}

export interface DragOptions {
  /** Constrain drag to axis */
  axis?: 'x' | 'y' | 'z' | null;
  /** Bounding box for drag limits */
  box?: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  };
  /** Snap to grid size */
  grid?: number | [number, number, number];
  /** Plane to drag on ('xy' | 'xz' | 'yz') */
  plane?: 'xy' | 'xz' | 'yz';
  /** Enable drag */
  enabled?: boolean;
  /** Callback when drag starts */
  onDragStart?: (position: THREE.Vector3) => void;
  /** Callback during drag */
  onDrag?: (position: THREE.Vector3, delta: THREE.Vector3) => void;
  /** Callback when drag ends */
  onDragEnd?: (position: THREE.Vector3) => void;
}

export interface DragState {
  /** Whether currently dragging */
  isDragging: boolean;
  /** Current drag position */
  position: THREE.Vector3;
  /** Drag handlers for mesh events */
  handlers: {
    onPointerDown: (event: THREE.Event) => void;
    onPointerMove: (event: THREE.Event) => void;
    onPointerUp: (event: THREE.Event) => void;
    onPointerLeave: (event: THREE.Event) => void;
  };
}

export type TransformMode = 'translate' | 'rotate' | 'scale';
export type TransformSpace = 'world' | 'local';

export interface TransformControlsState {
  /** Current transform mode */
  mode: TransformMode;
  /** Transform space */
  space: TransformSpace;
  /** Set transform mode */
  setMode: (mode: TransformMode) => void;
  /** Set transform space */
  setSpace: (space: TransformSpace) => void;
  /** Cycle through modes */
  cycleMode: () => void;
  /** Toggle space */
  toggleSpace: () => void;
  /** Whether transform is active */
  isTransforming: boolean;
}

// ============================================================================
// useRaycast Hook
// ============================================================================

export function useRaycast(
  objects: THREE.Object3D[] | (() => THREE.Object3D[]),
  options: RaycastOptions = {}
): RaycastResult {
  const {
    recursive = true,
    threshold = 0.1,
    filter,
    sort = true,
    layers,
  } = options;

  const { camera, mouse, raycaster } = useThree();
  const [result, setResult] = useState<RaycastResult>({
    intersections: [],
    closest: null,
    ray: new THREE.Ray(),
  });

  const rayRef = useRef(new THREE.Ray());

  useFrame(() => {
    // Get objects array
    const objectsArray = typeof objects === 'function' ? objects() : objects;
    if (!objectsArray || objectsArray.length === 0) return;

    // Configure raycaster
    raycaster.setFromCamera(mouse, camera);

    if (threshold !== undefined) {
      raycaster.params.Line = { threshold };
      raycaster.params.Points = { threshold };
    }

    if (layers) {
      raycaster.layers.mask = layers.mask;
    }

    // Perform raycast
    let intersections = raycaster.intersectObjects(objectsArray, recursive);

    // Apply filter
    if (filter) {
      intersections = intersections.filter(filter);
    }

    // Sort by distance
    if (sort) {
      intersections.sort((a, b) => a.distance - b.distance);
    }

    // Update ray reference
    rayRef.current.copy(raycaster.ray);

    setResult({
      intersections,
      closest: intersections[0] ?? null,
      ray: rayRef.current,
    });
  });

  return result;
}

// ============================================================================
// useHover Hook
// ============================================================================

export function useHover(
  objects?: THREE.Object3D[] | (() => THREE.Object3D[]),
  options: RaycastOptions = {}
): HoverState {
  const [hoveredObject, setHoveredObject] = useState<THREE.Object3D | null>(null);
  const [point, setPoint] = useState<THREE.Vector3 | null>(null);
  const [normal, setNormal] = useState<THREE.Vector3 | null>(null);

  const hoverObject = useThreeStore((state) => state.hoverObject);

  // If objects are provided, use raycasting
  const raycastResult = useRaycast(objects ?? [], {
    ...options,
    sort: true,
  });

  useEffect(() => {
    if (!objects) return;

    const closest = raycastResult.closest;

    if (closest) {
      setHoveredObject(closest.object);
      setPoint(closest.point);
      setNormal(closest.face?.normal ?? null);

      // Update store if object has userData.id
      const id = closest.object.userData?.id;
      if (id) {
        hoverObject(id);
      }
    } else {
      setHoveredObject(null);
      setPoint(null);
      setNormal(null);
      hoverObject(null);
    }
  }, [raycastResult.closest, objects, hoverObject]);

  const setHovered = useCallback((object: THREE.Object3D | null) => {
    setHoveredObject(object);
    if (object) {
      const id = object.userData?.id;
      if (id) {
        hoverObject(id);
      }
    } else {
      hoverObject(null);
    }
  }, [hoverObject]);

  return {
    hovered: hoveredObject !== null,
    hoveredObject,
    setHovered,
    point,
    normal,
  };
}

// ============================================================================
// useSelect Hook
// ============================================================================

export function useSelect(mode: SelectionMode = 'single'): SelectionState {
  const storeSelectedIds = useThreeStore((state) => state.selectedObjectIds);
  const selectObject = useThreeStore((state) => state.selectObject);
  const addToSelection = useThreeStore((state) => state.addToSelection);
  const removeFromSelection = useThreeStore((state) => state.removeFromSelection);
  const toggleSelection = useThreeStore((state) => state.toggleSelection);
  const clearSelectionStore = useThreeStore((state) => state.clearSelection);
  const isSelectedStore = useThreeStore((state) => state.isSelected);

  const select = useCallback((id: string) => {
    if (mode === 'single') {
      selectObject(id);
    } else {
      addToSelection(id);
    }
  }, [mode, selectObject, addToSelection]);

  const deselect = useCallback((id: string) => {
    removeFromSelection(id);
  }, [removeFromSelection]);

  const toggleSelect = useCallback((id: string) => {
    if (mode === 'single') {
      if (isSelectedStore(id)) {
        selectObject(null);
      } else {
        selectObject(id);
      }
    } else {
      toggleSelection(id);
    }
  }, [mode, isSelectedStore, selectObject, toggleSelection]);

  const clearSelection = useCallback(() => {
    clearSelectionStore();
  }, [clearSelectionStore]);

  const isSelected = useCallback((id: string) => {
    return storeSelectedIds.has(id);
  }, [storeSelectedIds]);

  const selectMultiple = useCallback((ids: string[]) => {
    if (mode === 'multi') {
      ids.forEach((id) => addToSelection(id));
    } else if (ids.length > 0) {
      selectObject(ids[ids.length - 1]);
    }
  }, [mode, addToSelection, selectObject]);

  const getSelectedArray = useCallback(() => {
    return Array.from(storeSelectedIds);
  }, [storeSelectedIds]);

  return {
    selectedIds: storeSelectedIds,
    select,
    deselect,
    toggleSelect,
    clearSelection,
    isSelected,
    selectMultiple,
    getSelectedArray,
  };
}

// ============================================================================
// useDrag Hook
// ============================================================================

export function useDrag(
  objectRef: React.RefObject<THREE.Object3D>,
  options: DragOptions = {}
): DragState {
  const {
    axis = null,
    box,
    grid,
    plane = 'xz',
    enabled = true,
    onDragStart,
    onDrag,
    onDragEnd,
  } = options;

  const { camera, raycaster, mouse, gl } = useThree();
  const [isDragging, setIsDragging] = useState(false);
  const position = useRef(new THREE.Vector3());
  const dragStartPosition = useRef(new THREE.Vector3());
  const offset = useRef(new THREE.Vector3());
  const planeRef = useRef(new THREE.Plane());
  const intersectionPoint = useRef(new THREE.Vector3());
  const previousPosition = useRef(new THREE.Vector3());

  // Create drag plane based on option
  const dragPlane = useMemo(() => {
    const normals: Record<string, THREE.Vector3> = {
      xy: new THREE.Vector3(0, 0, 1),
      xz: new THREE.Vector3(0, 1, 0),
      yz: new THREE.Vector3(1, 0, 0),
    };
    return normals[plane] ?? normals.xz;
  }, [plane]);

  const snapToGrid = useCallback((pos: THREE.Vector3): THREE.Vector3 => {
    if (!grid) return pos;

    const gridSize = typeof grid === 'number' ? [grid, grid, grid] : grid;
    return new THREE.Vector3(
      Math.round(pos.x / gridSize[0]) * gridSize[0],
      Math.round(pos.y / gridSize[1]) * gridSize[1],
      Math.round(pos.z / gridSize[2]) * gridSize[2]
    );
  }, [grid]);

  const applyBounds = useCallback((pos: THREE.Vector3): THREE.Vector3 => {
    if (!box) return pos;

    return new THREE.Vector3(
      Math.max(box.min.x, Math.min(box.max.x, pos.x)),
      Math.max(box.min.y, Math.min(box.max.y, pos.y)),
      Math.max(box.min.z, Math.min(box.max.z, pos.z))
    );
  }, [box]);

  const applyAxisConstraint = useCallback((pos: THREE.Vector3, start: THREE.Vector3): THREE.Vector3 => {
    if (!axis) return pos;

    const result = start.clone();
    result[axis] = pos[axis];
    return result;
  }, [axis]);

  const handlePointerDown = useCallback((event: any) => {
    if (!enabled || !objectRef.current) return;

    event.stopPropagation();
    setIsDragging(true);

    // Store initial position
    dragStartPosition.current.copy(objectRef.current.position);
    previousPosition.current.copy(objectRef.current.position);

    // Set up drag plane
    planeRef.current.setFromNormalAndCoplanarPoint(
      dragPlane,
      objectRef.current.position
    );

    // Calculate offset
    raycaster.setFromCamera(mouse, camera);
    raycaster.ray.intersectPlane(planeRef.current, intersectionPoint.current);
    offset.current.subVectors(objectRef.current.position, intersectionPoint.current);

    // Capture pointer
    (event.target as HTMLElement)?.setPointerCapture?.(event.pointerId);

    onDragStart?.(objectRef.current.position.clone());
  }, [enabled, objectRef, camera, raycaster, mouse, dragPlane, onDragStart]);

  const handlePointerMove = useCallback((event: any) => {
    if (!isDragging || !enabled || !objectRef.current) return;

    event.stopPropagation();

    raycaster.setFromCamera(mouse, camera);
    raycaster.ray.intersectPlane(planeRef.current, intersectionPoint.current);

    let newPosition = intersectionPoint.current.add(offset.current);
    newPosition = applyAxisConstraint(newPosition, dragStartPosition.current);
    newPosition = snapToGrid(newPosition);
    newPosition = applyBounds(newPosition);

    const delta = new THREE.Vector3().subVectors(newPosition, previousPosition.current);
    previousPosition.current.copy(newPosition);

    objectRef.current.position.copy(newPosition);
    position.current.copy(newPosition);

    onDrag?.(newPosition.clone(), delta);
  }, [
    isDragging,
    enabled,
    objectRef,
    camera,
    raycaster,
    mouse,
    applyAxisConstraint,
    snapToGrid,
    applyBounds,
    onDrag,
  ]);

  const handlePointerUp = useCallback((event: any) => {
    if (!isDragging) return;

    event.stopPropagation();
    setIsDragging(false);

    // Release pointer
    (event.target as HTMLElement)?.releasePointerCapture?.(event.pointerId);

    if (objectRef.current) {
      onDragEnd?.(objectRef.current.position.clone());
    }
  }, [isDragging, objectRef, onDragEnd]);

  const handlePointerLeave = useCallback((event: any) => {
    // Only end drag if we're the captured element
    if (isDragging) {
      handlePointerUp(event);
    }
  }, [isDragging, handlePointerUp]);

  return {
    isDragging,
    position: position.current,
    handlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerLeave: handlePointerLeave,
    },
  };
}

// ============================================================================
// useTransformControls Hook
// ============================================================================

export function useTransformControls(
  objectRef: React.RefObject<THREE.Object3D>,
  initialMode: TransformMode = 'translate',
  initialSpace: TransformSpace = 'world'
): TransformControlsState {
  const [mode, setModeState] = useState<TransformMode>(initialMode);
  const [space, setSpaceState] = useState<TransformSpace>(initialSpace);
  const [isTransforming, setIsTransforming] = useState(false);

  const storeSetTransformMode = useThreeStore((state) => state.setTransformMode);
  const storeSetTransformSpace = useThreeStore((state) => state.setTransformSpace);

  const setMode = useCallback((newMode: TransformMode) => {
    setModeState(newMode);
    storeSetTransformMode(newMode);
  }, [storeSetTransformMode]);

  const setSpace = useCallback((newSpace: TransformSpace) => {
    setSpaceState(newSpace);
    storeSetTransformSpace(newSpace);
  }, [storeSetTransformSpace]);

  const cycleMode = useCallback(() => {
    const modes: TransformMode[] = ['translate', 'rotate', 'scale'];
    const currentIndex = modes.indexOf(mode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    setMode(nextMode);
  }, [mode, setMode]);

  const toggleSpace = useCallback(() => {
    setSpace(space === 'world' ? 'local' : 'world');
  }, [space, setSpace]);

  // Keyboard shortcuts for transform controls
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (event.key.toLowerCase()) {
        case 'g':
          setMode('translate');
          break;
        case 'r':
          setMode('rotate');
          break;
        case 's':
          if (!event.ctrlKey && !event.metaKey) {
            setMode('scale');
          }
          break;
        case 'x':
          toggleSpace();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setMode, toggleSpace]);

  return {
    mode,
    space,
    setMode,
    setSpace,
    cycleMode,
    toggleSpace,
    isTransforming,
  };
}

// ============================================================================
// useClickOutside Hook (for 3D objects)
// ============================================================================

export function useClickOutside(
  objectRef: React.RefObject<THREE.Object3D>,
  callback: () => void
) {
  const { gl } = useThree();

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!objectRef.current) return;

      // Check if click was on the canvas
      if (event.target !== gl.domElement) {
        callback();
      }
    };

    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [objectRef, callback, gl]);
}

// ============================================================================
// useDoubleClick Hook
// ============================================================================

export function useDoubleClick(
  callback: (object: THREE.Object3D) => void,
  delay: number = 300
) {
  const lastClick = useRef<{ time: number; object: THREE.Object3D | null }>({
    time: 0,
    object: null,
  });

  const handleClick = useCallback((object: THREE.Object3D) => {
    const now = Date.now();
    const { time, object: lastObject } = lastClick.current;

    if (now - time < delay && lastObject === object) {
      callback(object);
      lastClick.current = { time: 0, object: null };
    } else {
      lastClick.current = { time: now, object };
    }
  }, [callback, delay]);

  return handleClick;
}

// ============================================================================
// Intersection Helpers
// ============================================================================

export function getIntersectionUserData<T = unknown>(
  intersection: THREE.Intersection | null
): T | null {
  if (!intersection) return null;
  return (intersection.object.userData as T) ?? null;
}

export function getIntersectionId(intersection: THREE.Intersection | null): string | null {
  if (!intersection) return null;
  return intersection.object.userData?.id ?? intersection.object.uuid;
}

export function filterByUserData<T>(
  key: string,
  value: T
): (intersection: THREE.Intersection) => boolean {
  return (intersection) => intersection.object.userData?.[key] === value;
}

export function filterByLayer(layer: number): (intersection: THREE.Intersection) => boolean {
  return (intersection) => {
    const l = new THREE.Layers();
    l.set(layer);
    return intersection.object.layers.test(l);
  };
}

// ============================================================================
// Exports
// ============================================================================


