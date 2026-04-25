import { PointerSensor, TouchSensor, useSensor } from "@dnd-kit/core"

export function useLongPressSensors() {
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: {
      delay: 500,
      tolerance: 5,
    },
  })
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 500,
      tolerance: 5,
    },
  })
  return [pointerSensor, touchSensor]
}
