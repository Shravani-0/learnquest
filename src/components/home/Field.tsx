// Ambient industrial-lab backdrop: drifting grid + crosshair hazard beams + pulsing nodes.
// Purely decorative; all motion is CSS and stops under reduced motion.
export default function Field() {
  return (
    <div className="sq-field" aria-hidden="true">
      <div className="sq-field__grid" />
      <div className="sq-field__beam" />
      <div className="sq-field__beam sq-field__beam--v" />
      <div className="sq-field__nodes" />
    </div>
  )
}
