import { useCursors, useCursorBuild } from "@cursorbuild/react";
export default function App() {
 const cursors = useCursors(); const engine = useCursorBuild();
 function addCursor() { const id = "demo-" + Date.now(); engine.cursors.add({ id, name: "Design partner", color: "#9d8cff" }); }
 return <main className="shell"><nav><span className="mark">C</span><span>CURSORBUILD</span><span className="nav-tag">ENGINE PLAYGROUND</span></nav>
 <section className="hero"><p className="eyebrow">OPEN-SOURCE ANIMATION INFRASTRUCTURE</p><h1>Build the story<br/><em>behind the interface.</em></h1><p className="intro">A modular foundation for scroll-driven, multi-cursor website construction. The engine is being built in layers — starting with reliable primitives.</p><div className="actions"><button onClick={addCursor}>Add sample identity</button><a href="https://github.com/suleiman2799-svg/cursorbuild">View source ↗</a></div></section>
 <section className="panel"><div className="panel-head"><div><p className="eyebrow">LIVE CORE STATE</p><h2>Cursor registry</h2></div><span className="count">{String(cursors.length).padStart(2,"0")} identities</span></div>
 {cursors.length === 0 ? <p className="empty">No cursor identities registered. Add a sample to exercise the core registry.</p> : <ul>{cursors.map((cursor) => <li key={cursor.id}><span className="dot" style={{background:cursor.color}}/>{cursor.name}<code>{cursor.id}</code><button className="remove" onClick={() => engine.cursors.remove(cursor.id)}>Remove</button></li>)}</ul>}</section>
 <footer><span>FOUNDATION RELEASE · v0.1.0</span><span>Planned interactions are not simulated yet.</span></footer></main>;
}