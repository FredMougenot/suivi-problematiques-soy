// carousel.jsx — 3D holographic card carousel

const CAROUSEL_DEFAULTS = /*EDITMODE-BEGIN*/{
  "speed": 12,
  "radius": 420,
  "perspective": 1500,
  "cardW": 320,
  "cardH": 440,
  "tiltSide": 28,
  "scaleCenter": 1.15,
  "scaleSide": 0.78,
  "blurSide": 3.5,
  "dimSide": 0.45,
  "bob": true,
  "particles": 32,
  "particleColor": "#b07bff",
  "haloColor": "#a05aff",
  "neonViolet": "#b07bff",
  "neonMagenta": "#ff3aa0",
  "neonCyan": "#5ef0ff",
  "neonBlue": "#5b8bff",
  "autoFlipOnHover": true,
  "steerStrength": 1.0,
  "steerDeadzone": 0.15,
  "steerHalfRange": 0,
  "steerXOffset": 0,
  "wheelXPercent": 50,
  "steerYOffset": 0,
  "steerYTolerance": 200,
  "steerShowAxis": false,
  "cards": [
    { "tag":"Algorithms", "title":"The Algorithm Library", "body":"Endless tomes of sorting, searching, and optimization stretch into infinity. Every page describes a new way to bend complexity.", "file":"algorithms.md", "back":"O(n)=log n · Recur.=12k · Depth=∞ · Solved=98%" },
    { "tag":"Memory",     "title":"First Line of Code",    "body":"I remember the thrill of typing 'Hello, World' in Python. It was four words, yet it opened a portal to endless possibilities.", "file":"first-line.md", "back":"Lang=py · Year=2014 · Lines=1 · Joy=max" },
    { "tag":"Mirror",     "title":"The Version Control Mirror", "body":"I saw myself, but not as I am now. The mirror showed all my possible branches — different commits, alternate selves, some merged, some abandoned.", "file":"git-log.md", "back":"Branches=47 · Conflicts=3 · HEAD=main · Stash=12" },
    { "tag":"Concept",    "title":"The Abstract Void",     "body":"Nothing concrete exists here, yet I feel the underlying logic. The Abstract Void is the space between concrete implementations, a quantum foam of design patterns.", "file":"design patterns.md", "back":"Patterns=23 · Coupling=low · Entropy=↑ · Form=n/a" },
    { "tag":"Dream",      "title":"The Deployment Dream",  "body":"I deployed my application live, but is the environment real? Every container familiar yet subtly different. The boundaries between staging and production are thinning.", "file":"deploy.yml", "back":"Env=prod · Replicas=12 · Uptime=99.9% · Build=#812" },
    { "tag":"Bug",        "title":"Debugging the Matrix",  "body":"The error messages multiplied across my console... each one referencing the next, a recursive nightmare of stack traces feeding back into themselves.", "file":"trace.log", "back":"Errors=42 · Stack=deep · Fixed=0 · Coffee=∞" }
  ]
}/*EDITMODE-END*/;

function parseStats(str){
  return String(str||"").split("·").map(s => s.trim()).filter(Boolean).map(part => {
    const [k, ...rest] = part.split("=");
    return { k: (k||"").trim(), v: rest.join("=").trim() };
  });
}

function App(){
  const [t, setTweak] = useTweaks(CAROUSEL_DEFAULTS);
  const [angle, setAngle] = React.useState(0);
  const [flipped, setFlipped] = React.useState(false);
  const [hoverCenter, setHoverCenter] = React.useState(false);
  const dragState = React.useRef({ dragging:false, startX:0, startAngle:0 });
  const stageRef = React.useRef(null);
  const steerRef = React.useRef(0); // -1..1 normalized horizontal offset from center
  const pressedRef = React.useRef(false);

  const CARDS = Array.isArray(t.cards) && t.cards.length ? t.cards : [];
  const N = Math.max(1, CARDS.length);

  // Combined auto-rotate + mouse-steered rotation (deg/sec)
  React.useEffect(() => {
    let raf, last = performance.now();
    const slot = 360 / N;
    const tick = (now) => {
      const dt = (now - last) / 1000; last = now;
      if(!dragState.current.dragging){
        // mouse steering: when the cursor sits to the right of the central card,
        // rotate the carousel so the next card to the right comes to center.
        const s = steerRef.current; // -1..1
        const dz = t.steerDeadzone || 0;
        let steer = 0;
        if(Math.abs(s) > dz){
          const sign = Math.sign(s);
          const k = (Math.abs(s) - dz) / (1 - dz);
          // negative coefficient: cursor to the right -> need to bring next card to center
          steer = -sign * k * 60 * (t.steerStrength || 1);
        }
        if(!pressedRef.current && t.speed === 0 && steer === 0){
          // Snap to nearest slot when idle so the central card faces forward.
          setAngle(a => {
            const target = Math.round(a / slot) * slot;
            const diff = target - a;
            if(Math.abs(diff) < 0.05) return target;
            return a + diff * Math.min(1, dt * 8);
          });
        } else {
          setAngle(a => a + (t.speed + steer) * dt);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [t.speed, t.steerStrength, t.steerDeadzone, t.steerYOffset, t.steerYTolerance, t.radius, t.steerHalfRange, t.steerXOffset, N]);
  // Track mouse horizontal position relative to center of the stage
  React.useEffect(() => {
    const stage = stageRef.current;
    if(!stage) return;
    const onMove = (e) => {
      if(!pressedRef.current){ steerRef.current = 0; return; }
      const carousel = stage.querySelector(".carousel");
      const stageRect = stage.getBoundingClientRect();
      const carRect = carousel ? carousel.getBoundingClientRect() : stageRect;
      const cx = carRect.left + carRect.width/2 + (t.steerXOffset || 0);
      const cy = carRect.top + carRect.height/2 + (t.steerYOffset || 0);
      const halfRange = (t.steerHalfRange && t.steerHalfRange > 0)
        ? t.steerHalfRange
        : Math.max(60, (t.radius || 320) - carRect.width/2);
      const dy = Math.abs(e.clientY - cy);
      const yTolerance = t.steerYTolerance || 200;
      if(dy > yTolerance){ steerRef.current = 0; return; }
      steerRef.current = Math.max(-1, Math.min(1, (e.clientX - cx) / halfRange));
    };
    const onDown = (e) => {
      if(e.button !== 0) return;
      // Ignore presses on UI overlays (Tweaks panel, etc) so they receive their clicks.
      if(e.target && e.target.closest && e.target.closest('.twk-panel,[data-noncommentable]')) return;
      pressedRef.current = true;
      onMove(e);
    };
    const onUp = () => { pressedRef.current = false; steerRef.current = 0; };
    const onLeave = () => { pressedRef.current = false; steerRef.current = 0; };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    stage.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      stage.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  // Drag to rotate
  React.useEffect(() => {
    const stage = stageRef.current;
    if(!stage) return;
    const onDown = (e) => {
      if(e.target && e.target.closest && e.target.closest('.twk-panel,[data-noncommentable]')) return;
      dragState.current = { dragging:true, startX: e.clientX, startAngle: angle };
      stage.setPointerCapture?.(e.pointerId);
    };
    const onMove = (e) => {
      if(!dragState.current.dragging) return;
      const dx = e.clientX - dragState.current.startX;
      setAngle(dragState.current.startAngle + dx * 0.3);
    };
    const onUp = () => { dragState.current.dragging = false; };
    stage.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      stage.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [angle]);

  // Particles
  React.useEffect(() => {
    const root = document.getElementById("particles");
    if(!root) return;
    root.innerHTML = "";
    for(let i=0;i<t.particles;i++){
      const s = document.createElement("span");
      const dur = 8 + Math.random()*14;
      const delay = -Math.random()*dur;
      s.style.left = (Math.random()*100) + "vw";
      s.style.top  = (Math.random()*100) + "vh";
      s.style.animationDuration = dur + "s";
      s.style.animationDelay = delay + "s";
      const sz = 1 + Math.random()*2.4;
      s.style.width = sz+"px"; s.style.height = sz+"px";
      s.style.background = t.particleColor;
      s.style.boxShadow = `0 0 8px ${t.particleColor}, 0 0 16px ${t.particleColor}`;
      s.style.opacity = .6 + Math.random()*.4;
      root.appendChild(s);
    }
  }, [t.particles, t.particleColor]);

  // Identify "center" slot (smallest absolute angular delta from front, 0deg)
  const slotInfo = React.useMemo(() => {
    return CARDS.map((_, i) => {
      const slotAngle = (i / N) * 360;
      const rel = ((slotAngle + angle) % 360 + 540) % 360 - 180; // -180..180
      return { i, rel };
    });
  }, [angle, N, CARDS.length]);
  const centerIdx = slotInfo.length
    ? slotInfo.reduce((best, s) => Math.abs(s.rel) < Math.abs(best.rel) ? s : best, slotInfo[0]).i
    : 0;

  // Auto-flip when hovering over the *centered* card and cursor is in the center zone
  React.useEffect(() => {
    if(!t.autoFlipOnHover){ setFlipped(false); return; }
    setFlipped(hoverCenter);
  }, [hoverCenter, t.autoFlipOnHover]);

  // Reset flip when the centered card changes (we rotated)
  React.useEffect(() => { setFlipped(false); }, [centerIdx]);

  // CSS vars on root
  const styleVars = {
    "--persp": t.perspective + "px",
    "--wheel-x": (t.wheelXPercent ?? 50) + "%",
    "--card-w": t.cardW + "px",
    "--card-h": t.cardH + "px",
    "--neon-violet":  t.neonViolet,
    "--neon-magenta": t.neonMagenta,
    "--neon-cyan":    t.neonCyan,
    "--neon-blue":    t.neonBlue,
  };

  // halo color injection
  React.useEffect(() => {
    const halo = document.querySelector(".halo");
    if(halo){
      halo.style.background =
        `radial-gradient(50% 50% at 50% 50%, ${hexToRgba(t.haloColor,.32)}, transparent 70%)`;
    }
  }, [t.haloColor]);

  return (
    <div className="carousel-stage" ref={stageRef} style={styleVars}>
      {t.steerShowAxis && (() => {
        const carousel = stageRef.current?.querySelector(".carousel");
        const stageRect = stageRef.current?.getBoundingClientRect();
        const carRect = carousel?.getBoundingClientRect();
        const axisYpx = (carRect && stageRect)
          ? (carRect.top + carRect.height/2 - stageRect.top) + (t.steerYOffset || 0)
          : null;
        return (
        <div style={{
          position:"absolute", left:0, right:0,
          top: axisYpx != null ? axisYpx + "px" : `calc(50% + ${t.steerYOffset || 0}px)`,
          transform: "translateY(-50%)",
          height: (t.steerYTolerance || 200) * 2 + "px",
          background: "rgba(255,90,90,.10)",
          borderTop: "1px dashed rgba(255,90,90,.7)",
          borderBottom: "1px dashed rgba(255,90,90,.7)",
          pointerEvents:"none", zIndex:9999
        }}>
          <div style={{
            position:"absolute", left:0, right:0, top:"50%",
            borderTop:"1px solid rgba(255,200,90,.9)"
          }} />
        </div>
        );
      })()}
      <div className="carousel" style={{ animationPlayState: t.bob ? "running":"paused" }}>
        {CARDS.map((c, i) => {
          const slotAngle = (i / N) * 360;
          const rel = ((slotAngle + angle) % 360 + 540) % 360 - 180; // -180..180
          const absRel = Math.abs(rel);

          // proximity: 1 at center, 0 at back
          const prox = 1 - Math.min(1, absRel / 180);

          // Scale interpolation between center and side (ignoring back)
          const sideMix = Math.min(1, absRel/90); // 0..1 at 0..90, then clamps
          const scale = lerp(t.scaleCenter, t.scaleSide, sideMix);
          const blur  = lerp(0, t.blurSide, Math.min(1, absRel/120));
          const opacity = lerp(1, t.dimSide, Math.min(1, absRel/120));

          // tilt only side cards a little
          const tilt = (rel/180) * t.tiltSide;

          const isCenter = i === centerIdx;
          const isFlipped = isCenter && flipped;

          const slotTransform =
            `rotateY(${slotAngle + angle}deg) translateZ(${t.radius}px)`;

          return (
            <div key={i}
                 className="card-slot"
                 data-center={isCenter ? "1":"0"}
                 style={{
                   transform: slotTransform,
                   opacity,
                   zIndex: Math.round(prox*1000),
                   pointerEvents: isCenter ? "auto" : "none",
                 }}
                 onPointerEnter={() => { if(isCenter) setHoverCenter(true); }}
                 onPointerLeave={() => { if(isCenter) setHoverCenter(false); }}>
              <div className="card-fx" style={{
                     filter: (!isCenter && blur > 0.05) ? `blur(${blur.toFixed(2)}px)` : "none",
                   }}>
              <div className={"card" + (isFlipped ? " flipping":"")}
                   style={{
                     transform: `rotateY(${isFlipped ? 180 : 0}deg) scale(${scale.toFixed(3)})`,
                   }}>
                <div className="face-wrap front">
                  <CardFront card={c} />
                </div>
                <div className="face-wrap back">
                  <CardBack card={c} />
                </div>
              </div>
              </div>
            </div>
          );
        })}
      </div>

      <TweaksPanel title="Carousel · Tweaks">
        <TweakSection label="Motion">
          <TweakSlider label="Speed" value={t.speed} min={-60} max={60} step={1} unit="°/s"
            onChange={v => setTweak("speed", v)} />
          <TweakSlider label="Radius" value={t.radius} min={200} max={800} step={10} unit="px"
            onChange={v => setTweak("radius", v)} />
          <TweakSlider label="Perspective" value={t.perspective} min={600} max={3000} step={50} unit="px"
            onChange={v => setTweak("perspective", v)} />
          <TweakToggle label="Floating bob" value={t.bob}
            onChange={v => setTweak("bob", v)} />
        </TweakSection>

        <TweakSection label="Card shape">
          <TweakSlider label="Width" value={t.cardW} min={220} max={420} step={5} unit="px"
            onChange={v => setTweak("cardW", v)} />
          <TweakSlider label="Height" value={t.cardH} min={300} max={580} step={5} unit="px"
            onChange={v => setTweak("cardH", v)} />
          <TweakSlider label="Side tilt" value={t.tiltSide} min={0} max={60} step={1} unit="°"
            onChange={v => setTweak("tiltSide", v)} />
        </TweakSection>

        <TweakSection label="Depth perception">
          <TweakSlider label="Center scale" value={t.scaleCenter} min={1} max={1.6} step={0.01}
            onChange={v => setTweak("scaleCenter", v)} />
          <TweakSlider label="Side scale" value={t.scaleSide} min={0.4} max={1} step={0.01}
            onChange={v => setTweak("scaleSide", v)} />
          <TweakSlider label="Side blur" value={t.blurSide} min={0} max={12} step={0.1} unit="px"
            onChange={v => setTweak("blurSide", v)} />
          <TweakSlider label="Side dim" value={t.dimSide} min={0.1} max={1} step={0.02}
            onChange={v => setTweak("dimSide", v)} />
        </TweakSection>

        <TweakSection label="Flip">
          <TweakToggle label="Flip on hover (center only)" value={t.autoFlipOnHover}
            onChange={v => setTweak("autoFlipOnHover", v)} />
        </TweakSection>

        <TweakSection label="Mouse steering">
          <TweakSlider label="Strength" value={t.steerStrength} min={0} max={3} step={0.1}
            onChange={v => setTweak("steerStrength", v)} />
          <TweakSlider label="Deadzone" value={t.steerDeadzone} min={0} max={0.6} step={0.01}
            onChange={v => setTweak("steerDeadzone", v)} />
          <TweakSlider label="Half range" value={t.steerHalfRange} min={0} max={1200} step={5} unit="px"
            onChange={v => setTweak("steerHalfRange", v)} />
          <TweakSlider label="X offset" value={t.steerXOffset} min={-600} max={600} step={1} unit="px"
            onChange={v => setTweak("steerXOffset", v)} />
          <TweakSlider label="Wheel X" value={t.wheelXPercent} min={0} max={100} step={0.5} unit="%"
            onChange={v => setTweak("wheelXPercent", v)} />
          <TweakSlider label="Y offset" value={t.steerYOffset} min={-400} max={400} step={1} unit="px"
            onChange={v => setTweak("steerYOffset", v)} />
          <TweakSlider label="Y tolerance" value={t.steerYTolerance} min={20} max={600} step={5} unit="px"
            onChange={v => setTweak("steerYTolerance", v)} />
          <TweakToggle label="Show axis" value={t.steerShowAxis}
            onChange={v => setTweak("steerShowAxis", v)} />
        </TweakSection>

        <TweakSection label="Card content">
          {CARDS.map((c, i) => (
            <CardEditor key={i} idx={i} card={c}
              onChange={(patch) => {
                const next = CARDS.map((cc, j) => j===i ? { ...cc, ...patch } : cc);
                setTweak("cards", next);
              }}
              onRemove={CARDS.length > 1 ? () => {
                setTweak("cards", CARDS.filter((_, j) => j !== i));
              } : null} />
          ))}
          <TweakButton label="+ Add card"
            onClick={() => setTweak("cards", [...CARDS, { tag:"New", title:"Untitled", body:"…", file:"untitled.md", back:"K=v" }])} />
        </TweakSection>

        <TweakSection label="Color">
          <TweakColor label="Violet" value={t.neonViolet}
            options={["#b07bff","#a05aff","#7c5cff","#d29bff","#8b5cf6"]}
            onChange={v => setTweak("neonViolet", v)} />
          <TweakColor label="Magenta" value={t.neonMagenta}
            options={["#ff3aa0","#ff5fb4","#ff2d8a","#e040fb","#f06292"]}
            onChange={v => setTweak("neonMagenta", v)} />
          <TweakColor label="Cyan" value={t.neonCyan}
            options={["#5ef0ff","#22d3ee","#7afcff","#00e5ff","#06b6d4"]}
            onChange={v => setTweak("neonCyan", v)} />
          <TweakColor label="Halo" value={t.haloColor}
            options={["#a05aff","#7c5cff","#ff3aa0","#5ef0ff","#5b8bff"]}
            onChange={v => setTweak("haloColor", v)} />
        </TweakSection>

        <TweakSection label="Particles">
          <TweakSlider label="Count" value={t.particles} min={0} max={120} step={1}
            onChange={v => setTweak("particles", v)} />
          <TweakColor label="Color" value={t.particleColor}
            options={["#b07bff","#5ef0ff","#ff3aa0","#ffffff","#5b8bff"]}
            onChange={v => setTweak("particleColor", v)} />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

function CardFront({ card }){
  return (
    <div className="face front">
      <div className="face-clip">
        <div className="tag"><b>CONCEPT:</b> {card.tag}</div>
        <div className="title">{card.title}</div>
        <div className="body">{card.body}</div>
        <div className="footer">
          <div className="file">{card.file}</div>
          <div className="meter" />
        </div>
      </div>
    </div>
  );
}

function CardBack({ card }){
  // sparkline path
  const pts = React.useMemo(() => {
    const arr = [];
    for(let i=0;i<24;i++){
      arr.push([i*(100/23), 50 + Math.sin(i*0.6 + (card.title||"").length)*22 + (Math.random()*8-4)]);
    }
    return "M " + arr.map(p => p[0].toFixed(1)+" "+p[1].toFixed(1)).join(" L ");
  }, [card.title]);
  const stats = parseStats(card.back);

  return (
    <div className="face back">
      <div className="face-clip">
        <div className="tag"><b>// SYS:</b> {card.tag}.runtime</div>
        <div className="title">{card.title}</div>
        <div className="dash">
          {stats.map((s, i) => (
            <div key={i} className="stat">
              <div className="k">{s.k}</div>
              <div className="v">{s.v}</div>
            </div>
          ))}
        </div>
        <div className="spark">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d={pts} />
          </svg>
        </div>
        <div className="footer">
          <div className="file">~/{card.file}</div>
          <div className="meter" />
        </div>
      </div>
    </div>
  );
}

function CardEditor({ idx, card, onChange, onRemove }){
  return (
    <div style={{display:"flex",flexDirection:"column",gap:6,padding:"8px 0",
                 borderTop: idx>0 ? "1px solid rgba(0,0,0,.08)" : "none"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontWeight:600,opacity:.7}}>Card {idx+1}</span>
        {onRemove && <button className="twk-btn secondary" onClick={onRemove}
          style={{height:20,padding:"0 8px",fontSize:10}}>remove</button>}
      </div>
      <TweakText label="Tag"   value={card.tag||""}   onChange={v => onChange({tag:v})} />
      <TweakText label="Title" value={card.title||""} onChange={v => onChange({title:v})} />
      <TweakText label="Body"  value={card.body||""}  onChange={v => onChange({body:v})} />
      <TweakText label="File"  value={card.file||""}  onChange={v => onChange({file:v})} />
      <TweakText label="Back stats (k=v · k=v)" value={card.back||""}
        onChange={v => onChange({back:v})} />
    </div>
  );
}

// ── helpers ─────────────────────────────────────────────────────────────────
function lerp(a,b,t){ return a + (b-a)*t; }
function hexToRgba(hex, a=1){
  const h = String(hex||"").replace("#","");
  const x = h.length===3 ? h.replace(/./g,c=>c+c) : h.padEnd(6,"0");
  const n = parseInt(x.slice(0,6),16);
  if(Number.isNaN(n)) return `rgba(255,255,255,${a})`;
  const r=(n>>16)&255, g=(n>>8)&255, b=n&255;
  return `rgba(${r},${g},${b},${a})`;
}

// Keyboard: T → tweaks
window.addEventListener("keydown", (e) => {
  if(e.key === "t" || e.key === "T") window.postMessage({ type:"__activate_edit_mode" }, "*");
});

const root = ReactDOM.createRoot(document.getElementById("app"));
root.render(<App />);
