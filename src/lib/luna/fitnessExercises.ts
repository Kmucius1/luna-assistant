interface ExerciseSubstitution {
  /** Must exactly match one of FitnessSetupView's EQUIPMENT strings. */
  requiresEquipment: string
  substitute: string
}

// Exercises not listed here (kettlebell swings, TRX rows, bodyweight/outdoor
// items, etc.) use equipment outside the 9 tracked EQUIPMENT tags and pass
// through unchanged — we have no signal on whether Zoe owns those.
const SUBSTITUTIONS: Record<string, ExerciseSubstitution> = {
  'Hip Thrusts': { requiresEquipment: 'Barbells', substitute: 'Bodyweight Hip Thrusts' },
  'Lighter Hip Thrusts': { requiresEquipment: 'Barbells', substitute: 'Bodyweight Hip Thrusts' },
  'Romanian Deadlifts': { requiresEquipment: 'Barbells', substitute: 'Single-Leg RDLs (Bodyweight)' },
  'Sumo Deadlifts': { requiresEquipment: 'Barbells', substitute: 'Sumo Squats (Bodyweight)' },
  'Bulgarian Split Squats': { requiresEquipment: 'Dumbbells', substitute: 'Bulgarian Split Squats (Bodyweight)' },
  'Smith Squats': { requiresEquipment: 'Smith machine', substitute: 'Goblet Squats or Bodyweight Squats' },
  'Step-Ups': { requiresEquipment: 'Dumbbells', substitute: 'Step-Ups (Bodyweight)' },
  'Cable Kickbacks': { requiresEquipment: 'Cable machine', substitute: 'Banded Kickbacks' },
  'Hip Abductor': { requiresEquipment: 'Hip thrust machine', substitute: 'Banded Lateral Walks' },
  'Hip Abductor Burnout': { requiresEquipment: 'Hip thrust machine', substitute: 'Banded Lateral Walks Burnout' },
  'Cable Abductions': { requiresEquipment: 'Cable machine', substitute: 'Banded Abductions' },
  'Glute-Focused Back Extensions': { requiresEquipment: 'Hip thrust machine', substitute: 'Bodyweight Back Extensions / Supermans' },
  'Pull-Ups (or Assisted)': { requiresEquipment: 'Pull-up bar', substitute: 'Resistance Band Pulldowns' },
  'Lat Pulldown': { requiresEquipment: 'Cable machine', substitute: 'Resistance Band Pulldowns' },
  'Cable Row': { requiresEquipment: 'Cable machine', substitute: 'Resistance Band Rows' },
  'Face Pulls': { requiresEquipment: 'Cable machine', substitute: 'Resistance Band Face Pulls' },
  'Curls': { requiresEquipment: 'Dumbbells', substitute: 'Resistance Band Curls' },
  'Triceps': { requiresEquipment: 'Dumbbells', substitute: 'Resistance Band Triceps Pressdowns' },
  'Cable Crunches': { requiresEquipment: 'Cable machine', substitute: 'Weighted or Bodyweight Crunches' },
  'Shoulder Press': { requiresEquipment: 'Dumbbells', substitute: 'Pike Push-Ups' },
  'Lateral Raises': { requiresEquipment: 'Dumbbells', substitute: 'Resistance Band Lateral Raises' },
  'Rear Delts': { requiresEquipment: 'Dumbbells', substitute: 'Resistance Band Rear Delt Pulls' },
  'Biceps': { requiresEquipment: 'Dumbbells', substitute: 'Resistance Band Curls' },
}

/** If selectedEquipment is empty (not yet set), assume full gym access and
    return the list unchanged rather than stripping exercises by default. */
export function resolveExercises(
  weekday: string,
  exercisesByDay: Record<string, string[]>,
  selectedEquipment: string[]
): string[] {
  const base = exercisesByDay[weekday] ?? exercisesByDay.Monday
  if (selectedEquipment.length === 0) return base
  return base.map(name => {
    const sub = SUBSTITUTIONS[name]
    if (!sub) return name
    return selectedEquipment.includes(sub.requiresEquipment) ? name : sub.substitute
  })
}
