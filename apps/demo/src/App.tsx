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
 const [nextId, setNextId] = useState(1);
 useEffect(() => {
  const stage = stageRef.current; if (!stage) return;
  starterCursors.forEach((cursor) => { if (!engine.cursors.get(cursor.id)) engine.cursors.add(cursor); });
  const pointAt = (x: number, y: number) => ({ x: Math.max(8, Math.min(stage.clientWidth - 145, stage.clientWidth * x)), y: Math.max(8, Math.min(stage.clientHeight - 45, stage.clientHeight * y)) });
  const renderer = engine.mountCursors(stage, { duration: 0.85, initialPositions: {
   maya: pointAt(0.08, 0.18), noah: pointAt(0.48, 0.32), zoe: pointAt(0.72, 0.14)
  }});
  rendererRef.current = renderer;
  const timeline = engine.animations.createTimeline("demo-cursor-loop", { repeat: -1, repeatDelay: 0.25 });
  timeline.call(() => renderer.moveTo("maya", pointAt(0.28, 0.4)));
  timeline.call(() => renderer.click("maya"), [], "+=0.7");
  timeline.call(() => renderer.moveTo("noah", pointAt(0.65, 0.58)));
  timeline.call(() => renderer.click("noah"), [], "+=0.55");
  timeline.call(() => renderer.moveTo("zoe", pointAt(0.32, 0.72)));
  timeline.call(() => renderer.moveTo("maya", pointAt(0.76, 0.26)), [], "+=0.5");
  timeline.call(() => renderer.moveTo("noah", pointAt(0.12, 0.2)));
  timeline.call(() => renderer.moveTo("zoe", pointAt(0.78, 0.65)), [], "+=0.4");
  return () => {
   timeline.kill(); engine.animations.kill("demo-cursor-loop"); renderer.destroy(); rendererRef.current = null;
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
  else { const lastStarter = [...starterCursors].reverse().find((cursor) => engine.cursors.get(cursor.id)); if (lastStarter) engine.cursors.remove(lastStarter.id); }
 }
 return <main className="shell">
  <nav><span className="mark">C</span><span>CURSORBUILD</span><span className="nav-tag">MULTI-CURSOR ENGINE · 0.2</span></nav>
  <section className="hero"><p className="eyebrow">COLLABORATION, IN MOTION</p><h1>Many hands.<br/><em>One canvas.</em></h1>
   <p className="intro">A glimpse of the CursorBuild rendering engine: independent designer identities moving across a shared interface, with smooth motion and expressive click feedback.</p>
   <div className="actions"><a href="https://github.com/suleiman2799-svg/cursorbuild">Explore the source ↗</a></div>
  </section>
  <section className="panel demo-panel">
   <div className="panel-head"><div><p className="eyebrow">LIVE COLLABORATION SPACE</p><h2>Studio canvas</h2></div><span className="count">{String(cursors.length).padStart(2,"0")} active identities</span></div>
   <div className="construction-stage" ref={stageRef}><div className="stage-grid"/><div className="stage-content">
    <span className="stage-kicker">CURSORBUILD / CREATIVE STUDIO</span><h3>Ideas take shape<br/>when we build together.</h3>
    <p>Three independent collaborators are exploring this interface. Watch their pointers move, pause and interact.</p>
    <div className="stage-card-row"><div className="stage-card"><span/><strong>Design system</strong></div><div className="stage-card"><span/><strong>Live prototype</strong></div><div className="stage-card"><span/><strong>Shared vision</strong></div></div>
   </div></div>
   <div className="cursor-controls"><p>CURSOR IDENTITIES · {cursors.length}</p><div><button className="primary" onClick={addCursor}>＋ Add cursor</button> <button onClick={removeCursor} disabled={cursors.length === 0}>− Remove cursor</button></div></div>
   <div className="cursor-legend">{cursors.map((cursor) => <span className="cursor-chip" key={cursor.id}><i style={{background:cursor.color}}/>{cursor.name}</span>)}</div>
  </section>
  <footer><span>FOUNDATION + CURSOR RENDERING · v0.2.0</span><span>Pointer overlay never intercepts page interaction.</span></footer>
 </main>;
}