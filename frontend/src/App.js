import { useEffect, useRef, useState } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Link, useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform, useMotionValue, useSpring, AnimatePresence, useInView, animate } from "framer-motion";
import axios from "axios";
import { ArrowRight, ArrowUpRight, Check, CircleHelp, ClipboardList, Cloud, Code2, FileText, Layers3, Menu, Moon, MoveUpRight, Network, PanelTop, Plus, Quote, Sparkles, Sun, X, Zap, Mic, Waves, Cpu, BarChart3, Radio } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const cx = (...a) => a.filter(Boolean).join(" ");

/* ====================  MOTION PRIMITIVES  ==================== */

// Word-by-word headline reveal
function AnimatedHeadline({ text, accent, className = "" }) {
  const words = text.split(" ");
  return (
    <h1 className={className}>
      {words.map((w, i) => (
        <span className="word-wrap" key={i}>
          <motion.span
            className="word"
            initial={{ y: "110%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.08 * i, duration: 0.8, ease: [0.22, 0.8, 0.28, 1] }}
          >
            {w}{i < words.length - 1 ? "\u00A0" : ""}
          </motion.span>
        </span>
      ))}
      {accent && (
        <span className="word-wrap">
          <motion.em
            className="word accent"
            initial={{ y: "110%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.08 * words.length + 0.05, duration: 0.9, ease: [0.22, 0.8, 0.28, 1] }}
          >
            {accent}
          </motion.em>
        </span>
      )}
    </h1>
  );
}

// Cursor spotlight (mouse-following soft glow, hero only)
function CursorSpotlight() {
  const x = useMotionValue(-500);
  const y = useMotionValue(-500);
  const sx = useSpring(x, { stiffness: 120, damping: 20, mass: 0.35 });
  const sy = useSpring(y, { stiffness: 120, damping: 20, mass: 0.35 });
  useEffect(() => {
    const move = (e) => { x.set(e.clientX); y.set(e.clientY); };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, [x, y]);
  return <motion.div className="cursor-spot" style={{ x: sx, y: sy }} aria-hidden="true" />;
}

// Aurora animated background blobs
function AuroraBG() {
  return (
    <div className="aurora" aria-hidden="true">
      <span className="aurora-blob a1" />
      <span className="aurora-blob a2" />
      <span className="aurora-blob a3" />
      <div className="aurora-noise" />
    </div>
  );
}

// Magnetic CTA button — cursor attracts the button subtly
function MagneticButton({ children, className = "", ...rest }) {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 200, damping: 15 });
  const sy = useSpring(y, { stiffness: 200, damping: 15 });
  const onMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    x.set(((e.clientX - r.left) / r.width - 0.5) * 14);
    y.set(((e.clientY - r.top) / r.height - 0.5) * 14);
  };
  const reset = () => { x.set(0); y.set(0); };
  return (
    <motion.a ref={ref} className={className} onMouseMove={onMove} onMouseLeave={reset} style={{ x: sx, y: sy }} {...rest}>
      {children}
    </motion.a>
  );
}

// 3D tilt on hover
function TiltCard({ children, className = "", ...rest }) {
  const ref = useRef(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 150, damping: 15 });
  const sry = useSpring(ry, { stiffness: 150, damping: 15 });
  const onMove = (e) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    ry.set(px * 8); rx.set(-py * 8);
  };
  const reset = () => { rx.set(0); ry.set(0); };
  return (
    <motion.article ref={ref} className={className} onMouseMove={onMove} onMouseLeave={reset}
      style={{ rotateX: srx, rotateY: sry, transformPerspective: 900 }} {...rest}>
      {children}
    </motion.article>
  );
}

// Animated count-up number
function Counter({ to, suffix = "", duration = 2 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, to, { duration, ease: [0.22, 0.8, 0.28, 1], onUpdate: (v) => setVal(v) });
    return () => controls.stop();
  }, [inView, to, duration]);
  const rounded = to >= 100 ? Math.round(val) : val.toFixed(1);
  return <span ref={ref}>{rounded}{suffix}</span>;
}

// Marquee (infinite scroll ribbon)
function Marquee({ items }) {
  const row = [...items, ...items, ...items];
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track">
        {row.map((it, i) => <span key={i} className="marquee-item">{it}<span className="marquee-dot">◆</span></span>)}
      </div>
    </div>
  );
}

/* ====================  HEADER  ==================== */

function Header({ theme, setTheme }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <motion.header
      className={cx("site-header", scrolled && "site-header-scrolled")}
      initial={{ y: -80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6, ease: [0.22, 0.8, 0.28, 1] }}
    >
      <Link to="/" className="brand" data-testid="site-logo">
        <span className="brand-mark" aria-hidden="true"></span>
        <span className="sr-only">BitNex</span>
        <span className="brand-word">BITNEX <em className="brand-tech">TECHNOLOGIES</em></span>
      </Link>
      <nav className={cx("desktop-nav", open && "nav-open")}>
        <a href="#capabilities" data-testid="nav-services">Services</a>
        <a href="#work" data-testid="nav-work">Work</a>
        <a href="#approach" data-testid="nav-company">Company</a>
        <a href="#insights" data-testid="nav-insights">Insights</a>
        <Link to="/portal" data-testid="nav-portal">Client portal <MoveUpRight size={13} /></Link>
      </nav>
      <div className="header-actions">
        <button className="icon-button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle color theme" data-testid="theme-toggle">
          {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
        </button>
        <a href="#contact" className="button button-dark header-cta" data-testid="header-talk-button">Talk to us <ArrowRight size={16} /></a>
        <button className="mobile-menu icon-button" onClick={() => setOpen(!open)} aria-label="Open menu" data-testid="mobile-menu-button">
          {open ? <X size={19} /> : <Menu size={19} />}
        </button>
      </div>
    </motion.header>
  );
}

/* ====================  ECOSYSTEM (with light packets)  ==================== */

function Ecosystem() {
  const nodes = [
    { label: "AI agents", Icon: Sparkles },
    { label: "SaaS platforms", Icon: Layers3 },
    { label: "Automation", Icon: Zap },
    { label: "Commerce", Icon: PanelTop },
    { label: "Cloud", Icon: Cloud },
    { label: "Operations", Icon: Network },
  ];
  const paths = [
    { id: "p0", d: "M60 105 Q 200 220 250 250" },
    { id: "p1", d: "M440 65 Q 340 200 250 250" },
    { id: "p2", d: "M470 235 Q 360 240 250 250" },
    { id: "p3", d: "M400 430 Q 320 340 250 250" },
    { id: "p4", d: "M90 440 Q 180 340 250 250" },
    { id: "p5", d: "M30 245 Q 140 240 250 250" },
  ];
  return (
    <motion.div className="ecosystem" data-testid="technology-ecosystem"
      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.4, duration: 1, ease: [0.22, 0.8, 0.28, 1] }}
    >
      <div className="eco-grid"></div>
      <div className="eco-orbit" aria-hidden="true">
        <span className="eco-ring r2"></span>
        <span className="eco-ring r1"></span>
        <span className="eco-ring r3"></span>
      </div>
      <svg className="eco-lines" viewBox="0 0 500 500" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <radialGradient id="pktGrad">
            <stop offset="0%" stopColor="#14B8B8" stopOpacity="1" />
            <stop offset="100%" stopColor="#14B8B8" stopOpacity="0" />
          </radialGradient>
        </defs>
        {paths.map((p) => <path key={p.id} id={p.id} d={p.d} />)}
        {paths.map((p, i) => (
          <circle key={"c" + i} r="4" fill="url(#pktGrad)">
            <animateMotion dur={`${3 + i * 0.4}s`} repeatCount="indefinite" begin={`${i * 0.4}s`}>
              <mpath href={`#${p.id}`} />
            </animateMotion>
          </circle>
        ))}
      </svg>
      <motion.div className="eco-center"
        animate={{ y: [0, -6, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        <span className="live-dot"></span>
        <span className="mono-label">BITNEX / SYSTEMS</span>
        <strong>Business<br /><em>in motion.</em></strong>
        <div className="eco-bars"><i></i><i></i><i></i><i></i><i></i></div>
      </motion.div>
      {nodes.map(({ label, Icon }, i) => (
        <motion.div className={cx("eco-node", `eco-node-${i}`)} key={label}
          initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7 + i * 0.09, duration: 0.5, ease: "backOut" }}
          whileHover={{ scale: 1.06, y: -4 }}
        >
          <span className="node-icon"><Icon size={15} /></span>{label}
          <span className="node-line"></span>
        </motion.div>
      ))}
    </motion.div>
  );
}

/* ====================  ASSISTANT (demo voice/chat pill)  ==================== */

function Assistant() {
  const [open, setOpen] = useState(false);
  return (
    <div className="assistant-wrap">
      <motion.button
        className="assistant-trigger" onClick={() => setOpen(!open)} data-testid="demo-assistant-toggle"
        whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }}
      >
        <span className="assistant-pulse"><Mic size={17} /></span>
        <span>Talk to BitNex AI</span>
        <span className="wave"><i></i><i></i><i></i><i></i><i></i></span>
        <span className="assistant-status">Demo</span>
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div className="assistant-panel" data-testid="demo-assistant-panel"
            initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ duration: 0.28 }}
          >
            <div className="assistant-head">
              <div>
                <span className="eyebrow">BITNEX AI / DEMO</span>
                <h3>What are you trying to move forward?</h3>
              </div>
              <button className="icon-button" onClick={() => setOpen(false)} aria-label="Close assistant" data-testid="demo-assistant-close"><X size={16} /></button>
            </div>
            <p>This lightweight preview shows how a BitNex assistant can guide discovery. Wire this to your model of choice when ready.</p>
            <div className="assistant-options">
              <button data-testid="assistant-option-ai">Build an AI workflow <ArrowRight size={14} /></button>
              <button data-testid="assistant-option-saas">Explore SaaS engineering <ArrowRight size={14} /></button>
              <button data-testid="assistant-option-contact">Start a project conversation <ArrowRight size={14} /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ====================  DATA  ==================== */

const capabilities = [
  { num: "01", icon: Sparkles, title: "AI & Automation", copy: "Intelligent systems that reduce repetitive work, connect workflows and improve customer experiences.", items: ["AI agents", "Voice & conversational AI", "Workflow automation", "CRM integrations"] },
  { num: "02", icon: Code2, title: "Software & SaaS", copy: "Platforms and products engineered around real operating requirements — from first sketch to production.", items: ["SaaS development", "Web & mobile apps", "APIs & integrations", "Cloud architecture"] },
  { num: "03", icon: PanelTop, title: "Commerce & Experiences", copy: "Digital commerce journeys that make discovery, purchase and support feel like one connected system.", items: ["Custom storefronts", "Customer portals", "AI recommendations", "Payments & integrations"] },
];

const marqueeItems = ["AI Agents", "Voice AI", "SaaS Engineering", "Automation", "Cloud Architecture", "Commerce", "Custom Software", "Integrations", "Product Design", "Business Operations"];

// Small inline visual for SaaS bento card — animated modules assembling into a system
function BuildingBlocks() {
  const modules = [
    { label: "Frontend", tag: "app", Icon: PanelTop, delay: 0.15 },
    { label: "API", tag: "v3.2", Icon: Code2, delay: 0.3 },
    { label: "Auth", tag: "OK", Icon: Check, delay: 0.45 },
    { label: "Database", tag: "42ms", Icon: Layers3, delay: 0.6 },
  ];
  return (
    <div className="modules" aria-hidden="true">
      <div className="modules-grid" />
      <svg className="modules-lines" viewBox="0 0 260 220" preserveAspectRatio="none">
        <defs>
          <linearGradient id="ml" x1="0" x2="1">
            <stop offset="0" stopColor="#14B8B8" stopOpacity="0" />
            <stop offset="0.5" stopColor="#14B8B8" stopOpacity="1" />
            <stop offset="1" stopColor="#14B8B8" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[40, 80, 120, 160].map((y, i) => (
          <line key={i} x1="70" y1={y + 12} x2="200" y2={y + 12} stroke="url(#ml)" strokeWidth="1.4" strokeDasharray="3 5">
            <animate attributeName="stroke-dashoffset" values="0;-40" dur={`${2 + i * 0.3}s`} repeatCount="indefinite" />
          </line>
        ))}
      </svg>

      <div className="modules-stack">
        {modules.map((m, i) => (
          <motion.div key={m.label} className="module-row"
            initial={{ opacity: 0, x: -14 }} whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-40px" }} transition={{ delay: m.delay, duration: 0.5 }}
          >
            <span className="module-icon"><m.Icon size={13} /></span>
            <div className="module-meta">
              <strong>{m.label}</strong>
              <small>{["src/app", "handlers/*.ts", "sessions", "queries/*.sql"][i]}</small>
            </div>
            <span className="module-tag">{m.tag}</span>
            <span className="module-pulse" />
          </motion.div>
        ))}
      </div>

      <motion.div className="modules-server"
        initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }} transition={{ delay: 0.9, duration: 0.6, ease: "backOut" }}
      >
        <div className="server-head">
          <span className="live-dot live-dot-green" />
          <span className="server-t">Production</span>
        </div>
        <div className="server-body">
          <span className="server-region">us-east-1</span>
          <div className="server-bars">
            {[70, 92, 54, 78, 88].map((h, i) => (
              <motion.i key={i} initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }}
                viewport={{ once: true }} transition={{ delay: 1 + i * 0.06, duration: 0.4 }}
                style={{ height: `${h}%`, transformOrigin: "bottom" }}
              />
            ))}
          </div>
        </div>
      </motion.div>

      <motion.span className="modules-badge"
        initial={{ opacity: 0, y: 6 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 1.2 }}
      >
        <span className="live-dot live-dot-green" /> Deployed 2m ago
      </motion.span>
    </div>
  );
}

// Inline visual for commerce bento
function CommerceTiles() {
  return (
    <div className="tiles" aria-hidden="true">
      {["Discovery", "Cart", "Checkout"].map((t, i) => (
        <motion.div key={t} className={cx("tile", i === 1 && "tile-active")}
          initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.15 * i, duration: 0.6 }}
        >
          <strong>0{i + 1}</strong>
          <span>{t}</span>
          <em>+{[12, 24, 18][i]}%</em>
        </motion.div>
      ))}
    </div>
  );
}

/* ====================  HERO PRODUCT MOCKUPS (Vercel/Supabase-style)  ==================== */

// Grid mesh + animated gradient blobs for hero background
function HeroMesh() {
  return (
    <div className="hero-mesh" aria-hidden="true">
      <svg className="mesh-grid" width="100%" height="100%" preserveAspectRatio="none">
        <defs>
          <pattern id="gridp" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M60 0 L0 0 0 60" fill="none" stroke="#ffffff10" strokeWidth="1" />
          </pattern>
          <radialGradient id="meshGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#14B8B8" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#14B8B8" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#gridp)" />
        <ellipse cx="72%" cy="35%" rx="360" ry="280" fill="url(#meshGlow)">
          <animate attributeName="cx" values="72%;68%;72%" dur="14s" repeatCount="indefinite" />
        </ellipse>
        <ellipse cx="18%" cy="72%" rx="280" ry="220" fill="url(#meshGlow)" opacity="0.5">
          <animate attributeName="cy" values="72%;66%;72%" dur="16s" repeatCount="indefinite" />
        </ellipse>
      </svg>
      <div className="mesh-scan" />
    </div>
  );
}

// Live-looking product dashboard (replaces the ecosystem in hero)
function DashboardMockup() {
  return (
    <div className="mockup" data-testid="hero-dashboard-mockup">
      <div className="mockup-window">
        <div className="mockup-chrome">
          <span className="dot d1" /><span className="dot d2" /><span className="dot d3" />
          <span className="mockup-url">bitnex.dev / <em>workspace</em></span>
          <span className="mockup-live"><span className="live-dot live-dot-green" /> LIVE</span>
        </div>
        <div className="mockup-body">
          <aside className="mockup-side">
            {[Sparkles, Layers3, Zap, Cloud, Radio].map((I, i) => (
              <span className={cx("mockup-side-item", i === 0 && "active")} key={i}><I size={14} /></span>
            ))}
          </aside>
          <div className="mockup-main">
            <div className="mockup-topline">
              <div><span className="mono-label">02 / TODAY</span><strong>Signals in motion.</strong></div>
              <div className="mockup-pill"><span className="live-dot live-dot-green" /> 12 agents online</div>
            </div>
            <div className="mockup-cards">
              <motion.div className="mockup-card mc1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
                <span className="mono-label">Automations</span>
                <strong>1,284<em>+18%</em></strong>
                <svg viewBox="0 0 120 40" className="mockup-spark" preserveAspectRatio="none">
                  <motion.path d="M0 30 L20 22 L40 26 L60 12 L80 18 L100 8 L120 14" fill="none" stroke="#14B8B8" strokeWidth="2"
                    initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 1, duration: 1.4 }}
                  />
                </svg>
              </motion.div>
              <motion.div className="mockup-card mc2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.95 }}>
                <span className="mono-label">Pipeline health</span>
                <div className="mockup-bars">
                  {[62, 74, 48, 88, 54, 92, 70, 82].map((h, i) => (
                    <motion.i key={i} initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ delay: 1.1 + i * 0.06, duration: 0.5 }} />
                  ))}
                </div>
                <small>Uptime <em>99.94%</em></small>
              </motion.div>
              <motion.div className="mockup-card mc3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1 }}>
                <span className="mono-label">Latency</span>
                <strong className="lat">128<i>ms</i></strong>
                <div className="mockup-progress"><motion.i initial={{ width: 0 }} animate={{ width: "72%" }} transition={{ delay: 1.3, duration: 1 }} /></div>
              </motion.div>
            </div>
            <motion.div className="mockup-stream" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }}>
              {[
                { t: "Agent • Support", m: "Resolved refund request in 1.2s" },
                { t: "Workflow • Sync", m: "3 CRM records reconciled" },
                { t: "Signal • Commerce", m: "Recommendation model updated" },
              ].map((r, i) => (
                <motion.div key={i} className="stream-row" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.5 + i * 0.15 }}>
                  <span className="stream-dot" /><span className="stream-t">{r.t}</span><span className="stream-m">{r.m}</span>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
      {/* Floating cursor from a "collaborator" */}
      <motion.div className="mockup-cursor" initial={{ x: 40, y: 200 }} animate={{ x: [40, 240, 180, 60], y: [200, 60, 260, 200] }} transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}>
        <svg width="20" height="22" viewBox="0 0 20 22"><path d="M2 2 L18 12 L11 13 L14 19 L11 20 L8 14 L2 18 Z" fill="#14B8B8" stroke="#0a1517" strokeWidth="1" /></svg>
        <span>Nex</span>
      </motion.div>
      {/* Floating node pills orbiting the mockup */}
      <motion.span className="orbit-pill op1" animate={{ y: [0, -8, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}><Sparkles size={12} /> AI Agents</motion.span>
      <motion.span className="orbit-pill op2" animate={{ y: [0, -6, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}><Zap size={12} /> Automation</motion.span>
      <motion.span className="orbit-pill op3" animate={{ y: [0, -7, 0] }} transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}><Cloud size={12} /> Cloud</motion.span>
    </div>
  );
}

// Terminal / code preview (Supabase-style) for capabilities bento
function CodePreview() {
  const [line, setLine] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setLine(l => (l + 1) % 4), 1600);
    return () => clearInterval(t);
  }, []);
  const lines = [
    { p: "$", c: "npx create-bitnex-agent support" },
    { p: ">", c: "→ Wiring CRM · Zendesk · Slack" },
    { p: ">", c: "→ Training on 1,284 tickets" },
    { p: "✓", c: "Agent deployed · latency 128ms" },
  ];
  return (
    <div className="code-preview" data-testid="code-preview">
      <div className="code-head"><span className="dot d1" /><span className="dot d2" /><span className="dot d3" /><span className="code-title">agent.deploy.ts</span></div>
      <div className="code-body">
        {lines.map((l, i) => (
          <div className={cx("code-line", i <= line && "shown")} key={i}>
            <span className="code-prompt">{l.p}</span>
            <span>{l.c}</span>
            {i === line && <span className="code-caret" />}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ====================  HOME  ==================== */

function Home({ theme, setTheme }) {
  // Parallax on ecosystem visual
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const ecoY = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const ecoScale = useTransform(scrollYProgress, [0, 1], [1, 0.94]);
  const heroTextY = useTransform(scrollYProgress, [0, 1], [0, 60]);

  return (
    <>
      <Header theme={theme} setTheme={setTheme} />
      <main>
        {/* HERO — cinematic dark */}
        <section className="hero hero-dark page-pad" ref={heroRef}>
          <HeroMesh />
          <AuroraBG />
          <CursorSpotlight />
          <motion.div className="hero-copy" style={{ y: heroTextY }}>
            <motion.span className="eyebrow eyebrow-light" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
              <span className="live-dot live-dot-green" /> AI <i>•</i> SOFTWARE <i>•</i> AUTOMATION <i>•</i> COMMERCE
            </motion.span>
            <AnimatedHeadline text="We build technology that moves businesses" accent="forward." className="hero-title" />
            <motion.p className="hero-lede" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 0.8 }}>
              BitNex designs and engineers intelligent software, AI-powered systems and digital experiences that help businesses operate smarter and scale with confidence.
            </motion.p>
            <motion.div className="hero-actions" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.05, duration: 0.7 }}>
              <MagneticButton href="#contact" className="button button-blue" data-testid="hero-start-project-button">
                <span>Start a project</span>
                <ArrowRight size={16} />
              </MagneticButton>
              <a href="#capabilities" className="text-link text-link-light" data-testid="hero-capabilities-link">Explore capabilities <ArrowUpRight size={16} /></a>
            </motion.div>
            <motion.div className="hero-foot" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3, duration: 0.7 }}>
              <span className="mono-label">SCROLL TO EXPLORE</span>
              <span className="hero-rule"><i /></span>
              <span className="mono-label">LHR / CANTON</span>
            </motion.div>
          </motion.div>
          <motion.div className="hero-visual" style={{ y: ecoY, scale: ecoScale }}>
            <DashboardMockup />
          </motion.div>
        </section>

        {/* MARQUEE */}
        <div className="marquee-band"><Marquee items={marqueeItems} /></div>

        {/* STATS */}
        <section className="stats-band page-pad">
          {[
            { n: 12, suffix: "+", label: "Product engineers, designers & operators" },
            { n: 40, suffix: "+", label: "Businesses guided from problem to product" },
            { n: 6, suffix: "", label: "Markets across US, EU, MENA & South Asia" },
            { n: 99.9, suffix: "%", label: "Uptime target on production systems" },
          ].map((s, i) => (
            <motion.div key={i} className="stat" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ delay: i * 0.1, duration: 0.7 }}>
              <strong><Counter to={s.n} suffix={s.suffix} /></strong>
              <span>{s.label}</span>
            </motion.div>
          ))}
        </section>

        {/* CAPABILITIES — BENTO */}
        <section id="capabilities" className="section page-pad">
          <SectionIntro eyebrow="01 / What we build" title="Technology, intelligence and operations" accent="in sync." copy="Focus where it matters. Build the systems that make work clearer, faster and more connected." />
          <div className="bento">
            {/* BIG CARD */}
            <motion.div className="bento-cell bento-main"
              initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.8 }}
              data-testid="capability-01"
            >
              <div className="bento-inner">
                <div className="bento-copy">
                  <span className="card-num">01</span>
                  <span className="cap-icon"><Sparkles size={22} /></span>
                  <h3>AI &amp; Automation</h3>
                  <p>Intelligent systems that reduce repetitive work, connect workflows and improve customer experiences — from voice agents to full business automation.</p>
                  <ul>{["AI agents", "Voice & conversational AI", "Workflow automation", "CRM integrations"].map(x => <li key={x}><Check size={14} />{x}</li>)}</ul>
                  <a href="#contact" className="card-link" data-testid="capability-01-link">Explore capability <ArrowRight size={15} /></a>
                </div>
                <div className="bento-visual"><CodePreview /></div>
              </div>
              <span className="card-glow" aria-hidden="true" />
            </motion.div>
            {/* MEDIUM 02 */}
            <motion.div className="bento-cell bento-med"
              initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ delay: 0.12, duration: 0.8 }}
              data-testid="capability-02"
            >
              <div className="bento-copy">
                <span className="card-num">02</span>
                <span className="cap-icon"><Code2 size={22} /></span>
                <h3>Software &amp; SaaS</h3>
                <p>Platforms and products engineered around real operating requirements — from sketch to production.</p>
                <ul>{["SaaS development", "Web & mobile apps", "APIs & integrations", "Cloud architecture"].map(x => <li key={x}><Check size={14} />{x}</li>)}</ul>
                <a href="#contact" className="card-link" data-testid="capability-02-link">Explore capability <ArrowRight size={15} /></a>
              </div>
              <BuildingBlocks />
              <span className="card-glow" aria-hidden="true" />
            </motion.div>
            {/* MEDIUM 03 */}
            <motion.div className="bento-cell bento-med"
              initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ delay: 0.22, duration: 0.8 }}
              data-testid="capability-03"
            >
              <div className="bento-copy">
                <span className="card-num">03</span>
                <span className="cap-icon"><PanelTop size={22} /></span>
                <h3>Commerce &amp; Experiences</h3>
                <p>Journeys where discovery, purchase and support feel like one connected system.</p>
                <ul>{["Custom storefronts", "Customer portals", "AI recommendations", "Payments & integrations"].map(x => <li key={x}><Check size={14} />{x}</li>)}</ul>
                <a href="#contact" className="card-link" data-testid="capability-03-link">Explore capability <ArrowRight size={15} /></a>
              </div>
              <CommerceTiles />
              <span className="card-glow" aria-hidden="true" />
            </motion.div>
          </div>
        </section>

        {/* AI BAND */}
        <section className="ai-band section page-pad">
          <div className="ai-copy">
            <span className="eyebrow">02 / A working idea</span>
            <SectionH2 text="Don't just read about AI." accent="Talk to it." dark />
            <p>Experience the kind of intelligent customer experience BitNex can build. This preview is intentionally light — the real system can connect to your knowledge, tools and teams.</p>
            <Assistant />
          </div>
          <motion.div className="conversation" data-testid="assistant-preview"
            initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.9 }}
          >
            <div className="conversation-bar">
              <span><span className="live-dot"></span> NEX / DISCOVERY</span>
              <span className="mono-label">PREVIEW</span>
            </div>
            <motion.div className="bubble bubble-user"
              initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.2, duration: 0.6 }}
            >We need a SaaS platform for our logistics team.</motion.div>
            <motion.div className="bubble bubble-ai"
              initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.5, duration: 0.6 }}
            >
              <span className="ai-avatar">B</span>
              <span>We can help map the workflow. Start with the problem, then connect the people and systems around it.</span>
            </motion.div>
            <div className="conversation-input"><span>Ask about a project</span> <ArrowRight size={16} /></div>
          </motion.div>
        </section>

        {/* PROCESS */}
        <section id="approach" className="section process-section page-pad">
          <SectionIntro eyebrow="03 / How we work" title="From a problem to something that" accent="works." />
          <div className="process-grid">
            {["Understand", "Design", "Build", "Launch", "Improve"].map((x, i) => (
              <motion.div className="process-step" key={x}
                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }} transition={{ delay: i * 0.08, duration: 0.6 }}
              >
                <span>0{i + 1}</span>
                <h3>{x}</h3>
                <p>{["Learn the business, users and existing systems.", "Define the experience and execution strategy.", "Engineer, integrate and test the system.", "Deploy carefully and measure the outcome.", "Keep improving based on real-world use."][i]}</p>
                <div className="proc-line" />
              </motion.div>
            ))}
          </div>
        </section>

        {/* WORK */}
        <section id="work" className="work-section section page-pad">
          <SectionIntro eyebrow="04 / Selected work" title="Problems solved." accent="Systems imagined." copy="Concept projects for now. A structured place for approved case studies to live next." />
          <div className="work-grid">
            <motion.article className="work-feature"
              initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}
            >
              <div className="work-visual logistics">
                <div className="map-lines"></div>
                <span className="visual-label">CONCEPT / 01</span>
                <motion.div className="route-card" animate={{ y: [0, -6, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
                  <span className="live-dot"></span>Route intelligence <strong>94.8%</strong>
                </motion.div>
              </div>
              <div className="work-meta">
                <span className="eyebrow">AI • AUTOMATION • LOGISTICS</span>
                <h3>Logistics operations platform</h3>
                <p>A conceptual operating system connecting dispatch, customer communication and internal operations.</p>
                <a href="#contact" className="card-link" data-testid="work-logistics-link">View concept <ArrowRight size={15} /></a>
              </div>
            </motion.article>
            <motion.article className="work-side"
              initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.15, duration: 0.8 }}
            >
              <div className="work-visual commerce">
                <div className="commerce-ui">
                  <span className="mono-label">COMMERCE / 02</span>
                  <strong>Find what<br />fits next.</strong>
                  <div className="mini-bars"><i></i><i></i><i></i></div>
                </div>
              </div>
              <div className="work-meta">
                <span className="eyebrow">COMMERCE • AI • EXPERIENCE</span>
                <h3>Intelligent commerce</h3>
                <p>A connected discovery and support experience.</p>
              </div>
            </motion.article>
          </div>
        </section>

        {/* WHY */}
        <section className="why-section section page-pad">
          <div className="why-heading">
            <span className="eyebrow">05 / Why BitNex</span>
            <SectionH2 text="One partner." accent="More ways forward." />
          </div>
          <div className="why-list">
            {["Business-first", "End-to-end", "Built to scale", "People + technology"].map((x, i) => (
              <motion.div className="why-item" key={x}
                initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-40px" }} transition={{ delay: i * 0.08, duration: 0.6 }}
              >
                <span>0{i + 1}</span>
                <h3>{x}</h3>
                <p>{["Technology should solve business problems, not create new ones.", "Strategy, design, engineering and operations stay connected.", "Build for today's requirements without limiting tomorrow.", "Capable teams and smarter systems, working together."][i]}</p>
                <ArrowRight size={18} />
              </motion.div>
            ))}
          </div>
        </section>

        {/* INSIGHTS */}
        <section id="insights" className="insights-strip">
          <div className="page-pad insights-inner">
            <div>
              <span className="eyebrow">06 / Insights</span>
              <SectionH2 text="Ideas for building" accent="what's next." />
            </div>
            <motion.div className="insight-card" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
              <span className="eyebrow">AI & AUTOMATION / 06 MIN</span>
              <h3>Where intelligent workflows actually begin</h3>
              <a href="#contact" className="text-link" data-testid="insight-read-link">Read the insight <ArrowRight size={15} /></a>
            </motion.div>
            <motion.div className="insight-card" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1, duration: 0.6 }}>
              <span className="eyebrow">SOFTWARE / 08 MIN</span>
              <h3>The quiet power of connected systems</h3>
              <a href="#contact" className="text-link" data-testid="insight-second-link">Read the insight <ArrowRight size={15} /></a>
            </motion.div>
          </div>
        </section>

        <Contact />
      </main>
      <Footer />
    </>
  );
}

/* ====================  ANIMATED SECTION HEADINGS  ==================== */

function SectionIntro({ eyebrow, title, accent, copy }) {
  return (
    <div className="section-intro">
      <motion.span className="eyebrow" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>{eyebrow}</motion.span>
      <SectionH2 text={title} accent={accent} />
      {copy && <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-30px" }} transition={{ delay: 0.15, duration: 0.6 }}>{copy}</motion.p>}
    </div>
  );
}

function SectionH2({ text, accent, dark = false }) {
  const words = text.split(" ");
  const container = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } } };
  const word = { hidden: { y: "110%", opacity: 0 }, show: { y: 0, opacity: 1, transition: { duration: 0.7, ease: [0.22, 0.8, 0.28, 1] } } };
  return (
    <motion.h2 className={cx(dark && "dark")} variants={container} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }}>
      {words.map((w, i) => (
        <span className="word-wrap" key={i}>
          <motion.span className="word" variants={word}>{w}{i < words.length - 1 ? "\u00A0" : ""}</motion.span>
        </span>
      ))}
      {accent && (
        <><br /><span className="word-wrap">
          <motion.em className="word accent" variants={word}>{accent}</motion.em>
        </span></>
      )}
    </motion.h2>
  );
}

/* ====================  CONTACT  ==================== */

function Contact() {
  const [sent, setSent] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ service: "AI & Automation", summary: "", timeline: "Exploring", budget: "Not sure yet", name: "", email: "", company: "", phone: "" });
  const update = e => setForm({ ...form, [e.target.name]: e.target.value });
  const submit = async e => {
    e.preventDefault();
    try { await axios.post(`${API}/intake`, form); setSent(true); } catch { setSent(true); }
  };
  return (
    <section id="contact" className="contact-section section page-pad">
      <div className="contact-header">
        <span className="eyebrow">07 / Start a project</span>
        <SectionH2 text="Let's build" accent="what's next." />
        <p>Tell us what you're trying to move forward. A short brief is enough to start a useful conversation.</p>
      </div>
      <motion.div className="intake-shell" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
        {sent ? (
          <div className="success-state" data-testid="intake-success">
            <motion.span className="success-icon" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 250 }}><Check size={22} /></motion.span>
            <span className="eyebrow">BRIEF RECEIVED</span>
            <h3>We'll take it from here.</h3>
            <p>The BitNex team will review your project and reply at {form.email || "your email"}.</p>
          </div>
        ) : (
          <form onSubmit={submit} data-testid="project-intake-form">
            <div className="intake-progress">
              <span className="mono-label">STEP 0{step} / 03</span>
              <div><i className={step >= 1 ? "active" : ""}></i><i className={step >= 2 ? "active" : ""}></i><i className={step >= 3 ? "active" : ""}></i></div>
            </div>
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div className="form-step" key="s1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
                  <h3>What can we help you build?</h3>
                  <div className="choice-grid">
                    {["AI & Automation", "Software / SaaS", "E-commerce", "Mobile App", "Business Operations", "Something else"].map(x => (
                      <button type="button" className={form.service === x ? "selected" : ""} onClick={() => setForm({ ...form, service: x })} key={x} data-testid={`intake-service-${x.toLowerCase().replaceAll(" ", "-")}`}>{x}<ArrowRight size={14} /></button>
                    ))}
                  </div>
                  <button type="button" className="button button-blue form-next" onClick={() => setStep(2)} data-testid="intake-next-step-button">Continue <ArrowRight size={16} /></button>
                </motion.div>
              )}
              {step === 2 && (
                <motion.div className="form-step" key="s2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
                  <h3>Give us a little context.</h3>
                  <textarea name="summary" value={form.summary} onChange={update} placeholder="What problem are you trying to solve?" required data-testid="intake-summary-input"></textarea>
                  <div className="split-fields">
                    <select name="timeline" value={form.timeline} onChange={update} data-testid="intake-timeline-select"><option>ASAP</option><option>1–3 months</option><option>3–6 months</option><option>Exploring</option></select>
                    <select name="budget" value={form.budget} onChange={update} data-testid="intake-budget-select"><option>Not sure yet</option><option>Under $10k</option><option>$10k–$25k</option><option>$25k+</option></select>
                  </div>
                  <button type="button" className="button button-blue form-next" onClick={() => setStep(3)} data-testid="intake-contact-step-button">Continue <ArrowRight size={16} /></button>
                </motion.div>
              )}
              {step === 3 && (
                <motion.div className="form-step" key="s3" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
                  <h3>Where should we reach you?</h3>
                  <div className="split-fields">
                    <input name="name" value={form.name} onChange={update} placeholder="Name" required data-testid="intake-name-input" />
                    <input name="company" value={form.company} onChange={update} placeholder="Company" data-testid="intake-company-input" />
                  </div>
                  <input type="email" name="email" value={form.email} onChange={update} placeholder="Business email" required data-testid="intake-email-input" />
                  <input name="phone" value={form.phone} onChange={update} placeholder="Phone (optional)" data-testid="intake-phone-input" />
                  <button className="button button-blue form-next" data-testid="intake-submit-button">Send brief <ArrowRight size={16} /></button>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        )}
      </motion.div>
    </section>
  );
}

/* ====================  FOOTER  ==================== */

function Footer() {
  return (
    <footer className="footer">
      <div className="page-pad footer-top">
        <div>
          <Link to="/" className="brand" data-testid="footer-logo">
            <span className="brand-mark" aria-hidden="true"></span>
            <span className="brand-word">BITNEX</span>
          </Link>
          <p>Technology for a smarter tomorrow.</p>
        </div>
        <div className="footer-contact">
          <span className="eyebrow">PAKISTAN / USA</span>
          <a href="mailto:hello@bitnextechnologies.com" data-testid="footer-email">hello@bitnextechnologies.com</a>
          <a href="tel:+923395010115" data-testid="footer-phone">+92 339 5010115</a>
        </div>
        <div className="footer-contact">
          <span className="eyebrow">LOCATIONS</span>
          <span>277 K Block Johar Town<br />Lahore, Pakistan</span>
          <span>6545 Market Ave North<br />Canton, OH 44721, USA</span>
        </div>
      </div>
      <div className="page-pad footer-bottom">
        <span>© 2026 BitNex Technologies</span>
        <span>Concepts are labeled. Claims are not invented.</span>
        <span>Privacy · Terms</span>
      </div>
    </footer>
  );
}

/* ====================  LOGIN + PORTAL  ==================== */

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const submit = async e => {
    e.preventDefault();
    try { await axios.post(`${API}/auth/login`, { email, password }, { withCredentials: true }); navigate("/portal"); }
    catch (err) { setError(err.response?.data?.detail || "Unable to sign in"); }
  };
  const googleSignIn = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    setBusy(true);
    const redirectUrl = window.location.origin + "/portal";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };
  return (
    <div className="auth-page">
      <AuroraBG />
      <Link to="/" className="brand auth-brand" data-testid="auth-logo">
        <span className="brand-mark" aria-hidden="true"></span>
        <span className="brand-word">BITNEX</span>
      </Link>
      <motion.div className="auth-box" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
        <span className="eyebrow">CLIENT PORTAL / SECURE ACCESS</span>
        <h1>Welcome back.</h1>
        <p>Sign in to follow projects, review milestones and keep the next step clear.</p>
        <button type="button" className="button button-google full" onClick={googleSignIn} disabled={busy} data-testid="google-login-button">
          <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.8-6.8C35.5 2.4 30.1 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.9 6.1C12.4 13.5 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.9 24.6c0-1.6-.2-3.2-.4-4.6H24v9.1h12.9c-.6 3-2.3 5.6-4.9 7.3l7.6 5.9c4.4-4.1 6.9-10 6.9-17.7z"/><path fill="#FBBC05" d="M10.5 28.6c-.5-1.5-.8-3.1-.8-4.6s.3-3.1.8-4.6L2.6 13.3C.9 16.6 0 20.2 0 24s.9 7.4 2.6 10.7l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.8-5.8l-7.6-5.9c-2.1 1.4-4.8 2.3-8.2 2.3-6.3 0-11.6-4.1-13.5-9.9l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>
          {busy ? "Redirecting…" : "Continue with Google"}
        </button>
        <div className="auth-divider"><span>or continue with email</span></div>
        <form onSubmit={submit} data-testid="login-form">
          <label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required data-testid="login-email-input" /></label>
          <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} required data-testid="login-password-input" /></label>
          {error && <div className="form-error" data-testid="login-error">{error}</div>}
          <button className="button button-blue full" data-testid="login-submit-button">Sign in <ArrowRight size={16} /></button>
        </form>
        <span className="auth-note">Need access? Contact hello@bitnextechnologies.com</span>
      </motion.div>
    </div>
  );
}

function Portal() {
  const [data, setData] = useState(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [showNewInvoice, setShowNewInvoice] = useState(false);
  const [newTask, setNewTask] = useState({ label: "", project_id: "" });
  const navigate = useNavigate();
  const authProcessed = useRef(false);

  const refresh = async () => {
    try {
      const r = await axios.get(`${API}/portal/overview`, { withCredentials: true });
      setData(r.data);
    } catch { navigate("/portal/login"); }
  };

  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  useEffect(() => {
    const boot = async () => {
      const hash = window.location.hash || "";
      if (hash.includes("session_id=") && !authProcessed.current) {
        authProcessed.current = true;
        const sessionId = new URLSearchParams(hash.replace(/^#/, "")).get("session_id");
        try {
          await axios.post(`${API}/auth/session`, {}, {
            headers: { "X-Session-ID": sessionId },
            withCredentials: true,
          });
          window.history.replaceState({}, document.title, "/portal");
        } catch (e) { navigate("/portal/login"); return; }
      }
      refresh();
    };
    boot();
    /* eslint-disable-next-line */
  }, []);

  const toggleTask = async (t) => {
    await axios.patch(`${API}/portal/tasks/${t.id}`, { done: !t.done }, { withCredentials: true });
    refresh();
  };
  const removeTask = async (id) => {
    await axios.delete(`${API}/portal/tasks/${id}`, { withCredentials: true });
    refresh();
  };
  const addTask = async (e) => {
    e.preventDefault();
    if (!newTask.label.trim() || !newTask.project_id) return;
    await axios.post(`${API}/portal/tasks`, newTask, { withCredentials: true });
    setNewTask({ label: "", project_id: newTask.project_id });
    refresh();
  };
  const removeProject = async (id) => {
    if (!window.confirm("Delete this project and its tasks?")) return;
    await axios.delete(`${API}/portal/projects/${id}`, { withCredentials: true });
    refresh();
  };
  const setInvoiceStatus = async (id, status) => {
    await axios.patch(`${API}/portal/invoices/${id}`, { status }, { withCredentials: true });
    refresh();
  };

  if (!data) return <div className="portal-loading" data-testid="portal-loading">Loading workspace…</div>;

  const outstanding = (data.stats.outstanding || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  return (
    <div className="portal-page">
      <aside className="portal-sidebar">
        <Link to="/" className="brand" data-testid="portal-logo">
          <span className="brand-mark" aria-hidden="true"></span>
          <span className="brand-word">BITNEX</span>
        </Link>
        <div className="portal-label">WORKSPACE</div>
        {[["Overview", PanelTop, data.projects.length], ["Projects", Layers3, data.projects.length], ["Tasks", ClipboardList, data.stats.open_tasks], ["Files", FileText, 0], ["Messages", Quote, 0], ["Invoices", FileText, data.invoices.length]].map(([x, Icon, count], i) => (
          <button className={i === 0 ? "portal-nav active" : "portal-nav"} key={x} data-testid={`portal-nav-${x.toLowerCase()}`}>
            <span><Icon size={16} /></span>{x}{count > 0 && <span className="nav-count">{count}</span>}
          </button>
        ))}
        <div className="portal-side-bottom">
          <span className="portal-label">ACCOUNT</span>
          <button className="portal-nav" data-testid="portal-help"><CircleHelp size={16} /> Help centre</button>
          <button className="portal-nav" onClick={async () => { await axios.post(`${API}/auth/logout`, {}, { withCredentials: true }); navigate("/portal/login"); }} data-testid="portal-logout"><X size={16} /> Sign out</button>
        </div>
      </aside>
      <main className="portal-main">
        <header className="portal-header">
          <div>
            <span className="eyebrow">{new Date().toLocaleDateString("en-US", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }).toUpperCase()}</span>
            <h1>Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, {data.user.name.split(" ")[0]}.</h1>
          </div>
          <div className="portal-user">
            <span>{data.user.name.charAt(0)}</span>
            <div><strong>{data.user.name}</strong><small>{data.user.role}</small></div>
          </div>
        </header>

        <div className="portal-kpis">
          <motion.div className="kpi" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <span className="eyebrow">Projects</span><strong>{data.stats.projects}</strong><small>{data.stats.in_progress} in progress</small>
          </motion.div>
          <motion.div className="kpi" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
            <span className="eyebrow">Open tasks</span><strong>{data.stats.open_tasks}</strong><small>across your workspace</small>
          </motion.div>
          <motion.div className="kpi" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.19 }}>
            <span className="eyebrow">Outstanding</span><strong>${outstanding}</strong><small>on active invoices</small>
          </motion.div>
          <motion.div className="kpi" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }}>
            <span className="eyebrow">Activity</span><strong>{data.activity.length}</strong><small>recent updates</small>
          </motion.div>
        </div>

        <div className="portal-grid">
          <section className="portal-section projects-panel">
            <div className="portal-section-head">
              <div><span className="eyebrow">YOUR WORK</span><h2>Active projects</h2></div>
              <button className="icon-button add-button" onClick={() => setShowNewProject(true)} data-testid="new-project-button"><Plus size={18} /></button>
            </div>
            <div className="project-list">
              <AnimatePresence>
                {data.projects.map(p => (
                  <motion.article className="project-row" key={p.id} data-testid={`portal-project-${p.id}`}
                    layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
                  >
                    <div className="project-icon"><Network size={19} /></div>
                    <div className="project-info">
                      <span className="eyebrow">{p.type}</span>
                      <h3>{p.name}</h3>
                      <div className="project-progress">
                        <span><motion.i initial={{ width: 0 }} animate={{ width: `${p.progress}%` }} transition={{ duration: 0.8 }} /></span>
                        <small>{p.progress}% complete{p.due ? ` · Due ${p.due}` : ""}</small>
                      </div>
                    </div>
                    <div className="project-status">
                      <span className={p.status === "In progress" ? "status-dot blue" : p.status === "Completed" ? "status-dot green" : "status-dot"}></span>{p.status}
                      <small>Next: {p.next || "—"}</small>
                    </div>
                    <button className="icon-button ghost" onClick={() => removeProject(p.id)} data-testid={`delete-project-${p.id}`} aria-label="Delete project"><X size={14} /></button>
                  </motion.article>
                ))}
              </AnimatePresence>
              {data.projects.length === 0 && (
                <div className="empty-state">No projects yet. Create your first workspace project.</div>
              )}
            </div>
          </section>

          <section className="portal-section activity-panel">
            <div className="portal-section-head">
              <div><span className="eyebrow">RECENTLY</span><h2>Activity</h2></div>
            </div>
            {data.activity.length === 0 ? (
              <div className="empty-state small">Actions on your workspace show up here.</div>
            ) : data.activity.map(a => (
              <motion.div className="activity-row" key={a.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                <span className="activity-mark"><Check size={13} /></span>
                <div><strong>{a.label}</strong>{a.project && <small>{a.project}</small>}</div>
                <span className="activity-time">{a.time}</span>
              </motion.div>
            ))}
          </section>

          <section className="portal-section tasks-panel">
            <div className="portal-section-head">
              <div><span className="eyebrow">NEXT UP</span><h2>Tasks</h2></div>
            </div>
            <form className="task-add" onSubmit={addTask} data-testid="task-add-form">
              <select value={newTask.project_id} onChange={e => setNewTask({ ...newTask, project_id: e.target.value })} required data-testid="task-project-select">
                <option value="">Select project…</option>
                {data.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input value={newTask.label} onChange={e => setNewTask({ ...newTask, label: e.target.value })} placeholder="What needs to happen?" required data-testid="task-label-input" />
              <button type="submit" className="icon-button add-button" data-testid="task-add-submit" aria-label="Add task"><Plus size={16} /></button>
            </form>
            <AnimatePresence>
              {data.tasks.map(t => (
                <motion.div className="task-row" key={t.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -12 }}>
                  <input type="checkbox" checked={t.done} onChange={() => toggleTask(t)} data-testid={`task-toggle-${t.id}`} />
                  <span><strong className={t.done ? "done" : ""}>{t.label}</strong><small>{t.project}</small></span>
                  <button className="row-x" onClick={() => removeTask(t.id)} aria-label="Delete task" data-testid={`task-delete-${t.id}`}><X size={13} /></button>
                </motion.div>
              ))}
            </AnimatePresence>
            {data.tasks.length === 0 && <div className="empty-state small">No tasks yet.</div>}
          </section>

          <section className="portal-section invoices-panel">
            <div className="portal-section-head">
              <div><span className="eyebrow">FINANCE</span><h2>Invoices</h2></div>
              <button className="icon-button add-button" onClick={() => setShowNewInvoice(true)} data-testid="new-invoice-button"><Plus size={16} /></button>
            </div>
            {data.invoices.length === 0 ? (
              <div className="empty-state small">Invoices you generate will land here.</div>
            ) : data.invoices.map(i => (
              <motion.div className="invoice-row" key={i.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} data-testid={`invoice-${i.id}`}>
                <span className="invoice-icon"><FileText size={16} /></span>
                <div><strong>{i.label}</strong><small>{i.status}{i.project ? ` · ${i.project}` : ""}</small></div>
                <b>{i.amount_display}</b>
                {i.status !== "Paid" && (
                  <button className="pay-button" onClick={() => setInvoiceStatus(i.id, "Paid")} data-testid={`invoice-pay-${i.id}`}>Mark paid</button>
                )}
              </motion.div>
            ))}
          </section>
        </div>
      </main>

      <AnimatePresence>
        {showNewProject && <NewProjectModal onClose={() => setShowNewProject(false)} onCreated={refresh} />}
        {showNewInvoice && <NewInvoiceModal projects={data.projects} onClose={() => setShowNewInvoice(false)} onCreated={refresh} />}
      </AnimatePresence>
    </div>
  );
}

function NewProjectModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: "", type: "SaaS delivery workspace", next: "Kickoff", due: "" });
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await axios.post(`${API}/portal/projects`, form, { withCredentials: true });
      onCreated();
      onClose();
    } finally { setBusy(false); }
  };
  return (
    <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.form className="modal" onClick={e => e.stopPropagation()} onSubmit={submit}
        initial={{ opacity: 0, y: 20, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.98 }} data-testid="new-project-modal"
      >
        <div className="modal-head">
          <span className="eyebrow">NEW PROJECT</span>
          <h2>Start a workspace project</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close" data-testid="modal-close"><X size={16} /></button>
        </div>
        <label>Project name<input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required minLength={2} data-testid="modal-project-name" /></label>
        <label>Type<select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} data-testid="modal-project-type">
          {["SaaS delivery workspace", "Concept delivery workspace", "AI & Automation", "Commerce build", "Discovery & systems design", "Retainer engagement"].map(x => <option key={x}>{x}</option>)}
        </select></label>
        <div className="modal-row">
          <label>Next step<input value={form.next} onChange={e => setForm({ ...form, next: e.target.value })} data-testid="modal-project-next" /></label>
          <label>Due (optional)<input value={form.due} onChange={e => setForm({ ...form, due: e.target.value })} placeholder="e.g. Apr 30, 2026" data-testid="modal-project-due" /></label>
        </div>
        <button className="button button-blue full" disabled={busy} data-testid="modal-project-submit">{busy ? "Creating…" : "Create project"} <ArrowRight size={16} /></button>
      </motion.form>
    </motion.div>
  );
}

function NewInvoiceModal({ projects, onClose, onCreated }) {
  const [form, setForm] = useState({ label: "", amount: "", project_id: projects[0]?.id || "" });
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await axios.post(`${API}/portal/invoices`, { label: form.label, amount: parseFloat(form.amount), project_id: form.project_id || null }, { withCredentials: true });
      onCreated();
      onClose();
    } finally { setBusy(false); }
  };
  return (
    <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.form className="modal" onClick={e => e.stopPropagation()} onSubmit={submit}
        initial={{ opacity: 0, y: 20, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.98 }} data-testid="new-invoice-modal"
      >
        <div className="modal-head">
          <span className="eyebrow">NEW INVOICE</span>
          <h2>Draft an invoice</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close" data-testid="modal-invoice-close"><X size={16} /></button>
        </div>
        <label>Line item<input value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} required data-testid="modal-invoice-label" /></label>
        <div className="modal-row">
          <label>Amount (USD)<input type="number" step="0.01" min="1" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required data-testid="modal-invoice-amount" /></label>
          <label>Project<select value={form.project_id} onChange={e => setForm({ ...form, project_id: e.target.value })} data-testid="modal-invoice-project">
            <option value="">— None —</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select></label>
        </div>
        <button className="button button-blue full" disabled={busy} data-testid="modal-invoice-submit">{busy ? "Saving…" : "Save invoice"} <ArrowRight size={16} /></button>
      </motion.form>
    </motion.div>
  );
}

/* ====================  APP ROOT  ==================== */

function App() {
  const [theme, setTheme] = useState(localStorage.getItem("bitnex-theme") || "light");
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("bitnex-theme", theme);
  }, [theme]);
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home theme={theme} setTheme={setTheme} />} />
          <Route path="/portal/login" element={<Login />} />
          <Route path="/portal" element={<Portal />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
