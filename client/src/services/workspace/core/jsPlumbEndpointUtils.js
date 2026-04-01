export const DEFAULT_ENDPOINT_VISIBLE_RADIUS = 5;
export const DEFAULT_ENDPOINT_HITBOX_STROKE_WIDTH = 14;

export function createDefaultDotEndpointDefinition({
  visibleRadius = DEFAULT_ENDPOINT_VISIBLE_RADIUS,
  hitboxStrokeWidth = DEFAULT_ENDPOINT_HITBOX_STROKE_WIDTH,
} = {}) {
  return {
    endpoint: { type: "Dot", options: { radius: visibleRadius } },
    paintStyle: {
      fill: "#456",
      stroke: "rgba(0, 0, 0, 0)",
      strokeWidth: hitboxStrokeWidth,
    },
  };
}
