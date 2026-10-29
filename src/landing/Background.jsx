// BACKGROUND SLOT
// The background animation is being made separately. When it is ready,
// render it here (a canvas, a three.js scene, a video, anything). This
// element sits behind all page content and ignores clicks.
export default function Background() {
  return <div className="bg-slot" id="background-slot" aria-hidden="true" />;
}
