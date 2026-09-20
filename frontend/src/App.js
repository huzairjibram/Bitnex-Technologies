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
        {/* HERO */}
        <section className="hero page-pad" ref={heroRef}>
          <AuroraBG />
          <CursorSpotlight />
          <motion.div className="hero-copy" style={{ y: heroTextY }}>
            <motion.span className="eyebrow" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
              AI <i>•</i> SOFTWARE <i>•</i> AUTOMATION <i>•</i> COMMERCE
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
              <a href="#capabilities" className="text-link" data-testid="hero-capabilities-link">Explore capabilities <ArrowUpRight size={16} /></a>
            </motion.div>
            <motion.div className="hero-foot" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3, duration: 0.7 }}>
              <span className="mono-label">SCROLL TO EXPLORE</span>
              <span className="hero-rule"><i /></span>
              <span className="mono-label">LHR / CANTON</span>
            </motion.div>
          </motion.div>
          <motion.div className="hero-visual" style={{ y: ecoY, scale: ecoScale }}>
            <Ecosystem />
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

        {/* CAPABILITIES */}
        <section id="capabilities" className="section page-pad">
          <SectionIntro eyebrow="01 / What we build" title="Technology, intelligence and operations" accent="in sync." copy="Focus where it matters. Build the systems that make work clearer, faster and more connected." />
          <div className="cap-grid">
            {capabilities.map(({ icon: Icon, ...c }, i) => (
              <motion.div key={c.num}
                initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }} transition={{ delay: i * 0.12, duration: 0.7, ease: [0.22, 0.8, 0.28, 1] }}
              >
                <TiltCard className="cap-card" data-testid={`capability-${c.num}`}>
                  <div className="cap-top">
                    <span className="card-num">{c.num}</span>
                    <span className="cap-icon"><Icon size={22} /></span>
                  </div>
                  <h3>{c.title}</h3>
                  <p>{c.copy}</p>
                  <ul>{c.items.map(x => <li key={x}><Check size={14} />{x}</li>)}</ul>
                  <a href="#contact" className="card-link" data-testid={`capability-${c.num}-link`}>Explore capability <ArrowRight size={15} /></a>
                  <span className="card-glow" aria-hidden="true" />
                </TiltCard>
              </motion.div>
            ))}
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
  const navigate = useNavigate();
  const submit = async e => {
    e.preventDefault();
    try { await axios.post(`${API}/auth/login`, { email, password }, { withCredentials: true }); navigate("/portal"); }
    catch (err) { setError(err.response?.data?.detail || "Unable to sign in"); }
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
        <form onSubmit={submit} data-testid="login-form">
          <label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required data-testid="login-email-input" /></label>
          <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} required data-testid="login-password-input" /></label>
          {error && <div className="form-error" data-testid="login-error">{error}</div>}
          <button className="button button-blue full" data-testid="login-submit-button">Sign in <ArrowRight size={16} /></button>
        </form>
        <div className="auth-alt">
          <button data-testid="magic-link-button" onClick={() => setError("Magic-link access will be connected when email delivery is enabled.")}>Send a magic link</button>
          <button data-testid="google-login-button" onClick={() => setError("Google sign-in will be connected after OAuth credentials are configured.")}>Continue with Google</button>
        </div>
        <span className="auth-note">Need access? Contact hello@bitnextechnologies.com</span>
      </motion.div>
    </div>
  );
}

function Portal() {
  const [data, setData] = useState(null);
  const navigate = useNavigate();
  useEffect(() => {
    axios.get(`${API}/portal/overview`, { withCredentials: true })
      .then(r => setData(r.data))
      .catch(() => navigate("/portal/login"));
  }, [navigate]);
  if (!data) return <div className="portal-loading" data-testid="portal-loading">Loading workspace…</div>;
  return (
    <div className="portal-page">
      <aside className="portal-sidebar">
        <Link to="/" className="brand" data-testid="portal-logo">
          <span className="brand-mark" aria-hidden="true"></span>
          <span className="brand-word">BITNEX</span>
        </Link>
        <div className="portal-label">WORKSPACE</div>
        {[["Overview", PanelTop], ["Projects", Layers3], ["Tasks", ClipboardList], ["Files", FileText], ["Messages", Quote], ["Invoices", FileText]].map(([x, Icon], i) => (
          <button className={i === 0 ? "portal-nav active" : "portal-nav"} key={x} data-testid={`portal-nav-${x.toLowerCase()}`}>
            <span><Icon size={16} /></span>{x}{i === 1 && <span className="nav-count">2</span>}
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
            <span className="eyebrow">TUESDAY, 17 MARCH 2026</span>
            <h1>Good morning, {data.user.name.split(" ")[0]}.</h1>
          </div>
          <div className="portal-user">
            <span>{data.user.name.charAt(0)}</span>
            <div><strong>{data.user.name}</strong><small>{data.user.role}</small></div>
          </div>
        </header>
        <div className="portal-grid">
          <section className="portal-section projects-panel">
            <div className="portal-section-head">
              <div><span className="eyebrow">YOUR WORK</span><h2>Active projects</h2></div>
              <button className="icon-button add-button" data-testid="new-project-button"><Plus size={18} /></button>
            </div>
            <div className="project-list">
              {data.projects.map(p => (
                <article className="project-row" key={p.id} data-testid={`portal-project-${p.id}`}>
                  <div className="project-icon"><Network size={19} /></div>
                  <div className="project-info">
                    <span className="eyebrow">{p.type}</span>
                    <h3>{p.name}</h3>
                    <div className="project-progress"><span><i style={{ width: `${p.progress}%` }}></i></span><small>{p.progress}% complete</small></div>
                  </div>
                  <div className="project-status">
                    <span className={p.status === "In progress" ? "status-dot blue" : "status-dot green"}></span>{p.status}
                    <small>Next: {p.next}</small>
                  </div>
                  <ArrowRight className="row-arrow" size={18} />
                </article>
              ))}
            </div>
          </section>
          <section className="portal-section activity-panel">
            <div className="portal-section-head">
              <div><span className="eyebrow">RECENTLY</span><h2>Activity</h2></div>
              <button className="text-link" data-testid="activity-view-all">View all <ArrowRight size={14} /></button>
            </div>
            {data.activity.map(a => (
              <div className="activity-row" key={a.label}>
                <span className="activity-mark"><Check size={13} /></span>
                <div><strong>{a.label}</strong><small>{a.project}</small></div>
                <span className="activity-time">{a.time}</span>
              </div>
            ))}
          </section>
          <section className="portal-section tasks-panel">
            <div className="portal-section-head">
              <div><span className="eyebrow">NEXT UP</span><h2>Tasks</h2></div>
              <button className="icon-button" data-testid="add-task-button"><Plus size={16} /></button>
            </div>
            {data.tasks.map(t => (
              <label className="task-row" key={t.label}>
                <input type="checkbox" defaultChecked={t.done} data-testid={`task-${t.label.toLowerCase().replaceAll(" ", "-")}`} />
                <span><strong>{t.label}</strong><small>{t.project}</small></span>
              </label>
            ))}
          </section>
          <section className="portal-section invoices-panel">
            <div className="portal-section-head">
              <div><span className="eyebrow">FINANCE</span><h2>Invoices</h2></div>
              <button className="text-link" data-testid="invoice-view-all">View all <ArrowRight size={14} /></button>
            </div>
            {data.invoices.map(i => (
              <div className="invoice-row" key={i.label}>
                <span className="invoice-icon"><FileText size={16} /></span>
                <div><strong>{i.label}</strong><small>{i.status}</small></div>
                <b>{i.amount}</b>
              </div>
            ))}
          </section>
        </div>
      </main>
    </div>
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
