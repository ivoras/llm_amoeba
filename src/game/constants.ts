// All spatial values are in centimeters unless noted otherwise.

export const WORLD_WIDTH_CM = 5
export const WORLD_HEIGHT_CM = 5

export const AMOEBA_DIAMETER_CM = 0.025
export const AMOEBA_RADIUS_CM = AMOEBA_DIAMETER_CM / 2

export const PIXELS_PER_CM = 1200

export const WORLD_WIDTH_PX = WORLD_WIDTH_CM * PIXELS_PER_CM   // 6000
export const WORLD_HEIGHT_PX = WORLD_HEIGHT_CM * PIXELS_PER_CM // 6000

export const AMOEBA_RADIUS_PX = AMOEBA_RADIUS_CM * PIXELS_PER_CM // 15
export const AMOEBA_DIAMETER_PX = AMOEBA_DIAMETER_CM * PIXELS_PER_CM // 30

export const VIEWPORT_WIDTH = 1000
export const VIEWPORT_HEIGHT = 1000

// Vision
export const AMOEBA_VISION_CM = 0.3
export const AMOEBA_VISION_PX = AMOEBA_VISION_CM * PIXELS_PER_CM // 120

export const ENEMY_VISION_CM = 0.05
export const ENEMY_VISION_PX = ENEMY_VISION_CM * PIXELS_PER_CM   // 60

// Movement
export const MIN_MOVE_BODY_LENGTHS = 0.5
export const MAX_MOVE_BODY_LENGTHS = 5
export const MOVE_ENERGY_COST_PER_BODY_LENGTH = 0.1
export const HEX_DIRECTIONS = [
  { angle: 0,   label: 'right' },
  { angle: 60,  label: 'upper-right' },
  { angle: 120, label: 'upper-left' },
  { angle: 180, label: 'left' },
  { angle: 240, label: 'lower-left' },
  { angle: 300, label: 'lower-right' },
] as const

// Energy
export const STARTING_ENERGY = 50
export const MAX_ENERGY = 100
export const MIN_ENERGY = 0
export const DIVISION_ENERGY_THRESHOLD = 90
export const FEEDING_GAIN_PER_CYCLE = 1
export const POISON_DRAIN_PER_CYCLE = 1
export const ENEMY_DRAIN_PER_CYCLE = 2
export const ENEMY_DRAIN_RADIUS_MULTIPLIER = 2 // within 2 amoeba radii

// Food
export const MAX_FOOD_RADIUS_CM = 0.1
export const MIN_FOOD_RADIUS_CM = 0.005
export const FOOD_MIN_ENERGY = 2
export const FOOD_MAX_ENERGY = 200
export const FOOD_HALO_MULTIPLIER = 2
export const FOOD_POISON_DECAY_PER_CYCLE = 0.1
export const DECAY_DEPLETION_THRESHOLD = 0.1

// Poison
export const MAX_POISON_RADIUS_CM = 0.1
export const MIN_POISON_RADIUS_CM = 0.005
export const POISON_MIN_ENERGY = 2
export const POISON_MAX_ENERGY = 200

// Spawn counts
export const INITIAL_FOOD_COUNT = 50
export const INITIAL_POISON_COUNT = 15
export const INITIAL_ENEMY_COUNT = 10
export const FOOD_RESPAWN_INTERVAL_CYCLES = 5
export const POISON_RESPAWN_INTERVAL_CYCLES = 10
export const MIN_ENEMY_SPAWN_DISTANCE_CM = 0.5

// Camera
export const CAMERA_MIN_ZOOM = 0.167
export const CAMERA_MAX_ZOOM = 3.0
export const CAMERA_ZOOM_STEP = 0.1

// Animation
export const MOVE_TWEEN_DURATION_MS = 600
export const WOBBLE_SEGMENTS = 24
export const WOBBLE_AMPLITUDE = 0.2 // fraction of radius
export const WOBBLE_SPEED = 0.003   // radians per ms

// Cycle default
export const DEFAULT_CYCLE_INTERVAL_MS = 2000

// Conversion helpers
export function cmToPx(cm: number): number {
  return cm * PIXELS_PER_CM
}

export function pxToCm(px: number): number {
  return px / PIXELS_PER_CM
}
