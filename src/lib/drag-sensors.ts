import { PointerSensor, useSensor } from "@dnd-kit/core"
import type { PointerSensorOptions } from "@dnd-kit/core"

// 长按 500ms 后才开始拖拽，移动容差 5px，避免滚动/点击时误触
export const LONG_PRESS_SENSOR_CONFIG: PointerSensorOptions = {
  activationConstraint: {
    delay: 500,
    tolerance: 5,
  },
}

export function useLongPressSensor() {
  return useSensor(PointerSensor, LONG_PRESS_SENSOR_CONFIG)
}
