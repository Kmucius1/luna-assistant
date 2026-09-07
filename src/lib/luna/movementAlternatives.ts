// The fixed set of movement choices offered when Zoe skips the gym — no
// blank text field, ever. 'rest' exists so a genuine rest day is always a
// deliberate tap, never a silent default or a forbidden option.
export type MovementChoice =
  | 'gym' | 'walk' | 'pilates_yoga' | 'dance' | 'beach' | 'trail' | 'treadmill_stretch' | 'mobility_stretch' | 'rest'

export interface MovementOption {
  value: MovementChoice
  label: string
}

export const MOVEMENT_ALTERNATIVES: MovementOption[] = [
  { value: 'walk',              label: 'Outdoor walk' },
  { value: 'pilates_yoga',      label: 'Pilates or yoga' },
  { value: 'dance',             label: 'Dance' },
  { value: 'beach',             label: 'Beach or pool' },
  { value: 'trail',             label: 'Nature trail' },
  { value: 'treadmill_stretch', label: 'Easy treadmill + stretch' },
  { value: 'mobility_stretch',  label: 'Mobility / stretch session' },
]

export const REST_OPTION: MovementOption = { value: 'rest', label: 'Rest day' }

export function movementLabel(choice: MovementChoice): string {
  if (choice === 'gym') return 'Gym'
  if (choice === 'rest') return 'Rest day'
  return MOVEMENT_ALTERNATIVES.find(m => m.value === choice)?.label ?? choice
}
