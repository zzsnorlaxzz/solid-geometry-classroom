import * as THREE from "three";
import { geometry, isRound } from "./geometry.js";

// Start in the editor/solid coordinate frame, then lay the net in the XY plane.
export function netGeometry(shape, dimensions, height, progress) {
  const data = geometry(shape, dimensions, height, progress),
    upright = shape.kind === "prism" || shape.kind === "cylinder",
    origin = isRound(shape) ? [0, 0] : dimensions[0],
    angle = isRound(shape)
      ? 0
      : Math.atan2(dimensions[1][1] - origin[1], dimensions[1][0] - origin[0]),
    rotation = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 0, 1),
      angle,
    );
  if (upright)
    rotation.multiply(
      new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(1, 0, 0),
        Math.PI / 2,
      ),
    );
  rotation.slerp(new THREE.Quaternion(), progress);
  const offset = new THREE.Vector3(...origin, 0).multiplyScalar(1 - progress);
  return data.map((f) => ({
    ...f,
    vertices: f.vertices.map(([x, y, z]) =>
      new THREE.Vector3(x, y, upright ? -z : z)
        .applyQuaternion(rotation)
        .add(offset)
        .toArray(),
    ),
  }));
}

export function netOrientation(solidOrientation, progress) {
  // Smoothly settle into a fixed front view at exactly full expansion.
  return solidOrientation.clone().slerp(new THREE.Quaternion(), progress ** 4);
}
