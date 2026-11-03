import { useEffect, useRef, useState } from "react";
import { useCursors, useCursorBuild } from "@cursorbuild/react";
import type { CursorIdentity } from "@cursorbuild/core";
import "./cursor-demo.css";
import "@cursorbuild/core/cursor-renderer.css";
const starterCursors: CursorIdentity[] = [
 { id: "maya", name: "Maya · Design", color: "#a78bfa" },
 { id: "noah", name: "Noah · Frontend", color: "#35c9a5" },
 { id: "zoe", name: "Zoe · Product", color: "#ff7b9c" }
];
export default function App() {
 const cursors = useCursors();
 const engine = useCursorBuild();
 const stageRef = useRef<HTMLDivElement>(null);
 const rendererRef = useRef<ReturnType<typeof engine.mountCursors> | null>(null);
 const demoTimelineRef = useRef<{ pause: () => void } | null>(null);
 const [nextId, setNextId] = useState(1);
 useEffect(() => {
  const stage = stageRef.current; if (!stage) return;
  starterCursors.forEach((cursor) => { if (!engine.cursors.get(cursor.id)) engine.cursors.add(cursor); });
  const pointAt = (x: number, y: number) => ({ x: Math.max(8, Math.min(stage.clientWidth - 145, stage.clientWidth * x)), y: Math.max(8, Math.min(stage.clientHeight - 45, stage.clientHeight * y)) });
  const renderer = engine.mountCursors(stage, {
   duration: 0.85,
   clickFeedback: { duration: 0.38, rippleSize: 2.3, intensity: 0.8, style: "ripple-press" },
   initialPositions: { maya: pointAt(0.08, 0.18), noah: pointAt(0.48, 0.32), zoe: pointAt(0.72, 0.14) }
  });
  rendererRef.current = renderer;
  const timeline = engine.animations.createTimeline("demo-cursor-loop", { repeat: -1, repeatDelay: 0.25 });
  demoTimelineRef.current = timeline;
  timeline.call(() => renderer.moveNaturally("maya", pointAt(0.28, 0.4)));
  timeline.call(() => renderer.click("maya"), [], "+=0.7");
  timeline.call(() => renderer.moveNaturally("noah", pointAt(0.65, 0.58)));
  timeline.call(() => renderer.click("noah", { style: "ripple", rippleSize: 2.7, intensity: 0.55 }), [], "+=0.55");
  timeline.call(() => renderer.moveNaturally("zoe", pointAt(0.32, 0.72)));
  timeline.call(() => renderer.click("zoe", { style: "press", duration: 0.24 }), [], "+=0.45");
  timeline.call(() => renderer.moveNaturally("maya", pointAt(0.76, 0.26)), [], "+=0.5");
  timeline.call(() => renderer.moveNaturally("noah", pointAt(0.12, 0.2)));
  timeline.call(() => renderer.moveNaturally("zoe", pointAt(0.78, 0.65)), [], "+=0.4");
  return () => {
   timeline.kill(); engine.animations.kill("demo-cursor-loop"); engine.coordination.cancelGroup("demo-collaboration"); demoTimelineRef.current = null; renderer.destroy(); rendererRef.current = null;
   starterCursors.forEach((cursor) => engine.cursors.remove(cursor.id));
  };
 }, [engine]);
 function addCursor() {
  const palette = ["#f6bd60", "#69b7ff", "#d78bff", "#ff9f7a"]; const id = "guest-" + nextId;
  engine.cursors.add({ id, name: "Guest " + nextId, color: palette[(nextId - 1) % palette.length] });
  rendererRef.current?.moveTo(id, { x: Math.max(8, Math.min((stageRef.current?.clientWidth ?? 300) - 145, 28 + (nextId % 4) * 48)), y: 45 + (nextId % 3) * 54 }, 0);
  setNextId((value) => value + 1);
 }
 function removeCursor() {
  const guest = [...cursors].reverse().find((cursor) => cursor.id.startsWith("guest-"));
  if (guest) engine.cursors.remove(guest.id);
 }
 function replayTextInsertion() {
  const renderer = rendererRef.current;
  if (!renderer) return;
  demoTimelineRef.current?.pause();
  renderer.typeText("maya", { target: "#typing-heading", text: "Ideas take shape when we build together.", duration: 2.1, initialDelay: 0.2, mode: "replace" });
  renderer.typeText("noah", { target: "#typing-input", text: "A little progress, every day.", duration: 1.8, initialDelay: 0.35, mode: "replace" });
 }
 function replayDrags() {
  const stage = stageRef.current, renderer = rendererRef.current;
  if (!stage || !renderer) return;
  demoTimelineRef.current?.pause();
  const width = stage.clientWidth, height = stage.clientHeight;
  engine.coordination.cancelGroup("demo-collaboration");
  void engine.coordination.runGroup("demo-collaboration", [
   {
    id: "maya-drag-card", cursorId: "maya",
    run: () => renderer.drag("maya", { target: "#drag-card-one", to: { x: Math.max(12, width * 0.56), y: Math.max(12, height * 0.2) }, duration: 1.25, curvature: 0.2 })
   },
   {
    id: "noah-drag-card", cursorId: "noah",
    run: () => renderer.drag("noah", { target: "#drag-card-two", to: { x: Math.max(12, width * 0.12), y: Math.max(12, height * 0.62) }, duration: 1.45, curvature: 0.16 })
   }
  ], { mode: "parallel" }).catch(() => undefined);
 }
 return <main className="shell">
  <nav><span className="mark">C</span><span>CURSORBUILD</span><span className="nav-tag">MULTI-CURSOR ENGINE · 0.3</span></nav>
  <section className="hero"><p className="eyebrow">COLLABORATION, IN MOTION</p><h1>Many hands.<br/><em>One canvas.</em></h1>
   <p className="intro">Independent collaborator cursors move naturally, press their pointer tips and send expressive click ripples across a shared interface.</p>
   <div className="actions"><a href="https://github.com/suleiman2799-svg/cursorbuild">Explore the source ↗</a></div>
  </section>
  <section className="panel demo-panel">
   <div className="panel-head"><div><p className="eyebrow">LIVE COLLABORATION SPACE</p><h2>Studio canvas</h2></div><span className="count">{String(cursors.length).padStart(2,"0")} active identities</span></div>
   <div className="construction-stage" ref={stageRef}><div className="stage-grid"/><div className="stage-content">
    <span className="stage-kicker">CURSORBUILD / CREATIVE STUDIO</span><h3 id="typing-heading" contentEditable="true" suppressContentEditableWarning spellCheck={false}>Ideas take shape when we build together.</h3>
    <p>Watch collaborators focus a heading and type into a live input, character by character.</p>
    <label className="typing-field"><span>PROJECT NOTE</span><input id="typing-input" type="text" defaultValue="Your idea starts here." /></label>
    <div className="stage-card-row drag-card-row"><div id="drag-card-one" className="stage-card drag-card"><span/><strong>Design system</strong><small>Drag me · Maya</small></div><div id="drag-card-two" className="stage-card drag-card"><span/><strong>Live prototype</strong><small>Drag me · Noah</small></div></div>
   </div></div>
   <div className="cursor-controls"><p>CURSOR IDENTITIES · {cursors.length}</p><div><button className="primary" onClick={addCursor}>＋ Add cursor</button> <button onClick={removeCursor} disabled={!cursors.some((cursor) => cursor.id.startsWith("guest-"))}>− Remove cursor</button> <button onClick={replayTextInsertion}>⌨ Replay typing demo</button> <button onClick={replayDrags}>↻ Replay coordinated drag demo</button></div></div>
   <div className="cursor-legend">{cursors.map((cursor) => <span className="cursor-chip" key={cursor.id}><i style={{background:cursor.color}}/>{cursor.name}</span>)}</div>
  </section>
  <footer><span>FOUNDATION + MOVEMENT + CLICK + DRAG + TEXT · v0.4.0</span><span>Visual pointers never intercept page interaction.</span></footer>
 </main>;
}
