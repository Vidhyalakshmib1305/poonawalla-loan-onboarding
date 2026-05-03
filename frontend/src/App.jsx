import { useState, useRef, useEffect } from "react";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

/* ─── GLOBAL CSS ─────────────────────────────────────────────────────────── */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

  :root {
    --navy:        #1B2A6B;
    --navy-dark:   #111d55;
    --navy-mid:    #223388;
    --navy-light:  #EEF1FA;
    --sky:         #0095D9;
    --sky-light:   #EBF6FF;
    --sky-mid:     #B8DCEF;
    --orange:      #F5881F;
    --orange-light:#FFF3E8;
    --green:       #00A651;
    --green-light: #E6F7EE;
    --red:         #D32F2F;
    --red-light:   #FFEBEE;
    --gold:        #E6A817;
    --gold-light:  #FFF8E1;
    --white:       #FFFFFF;
    --bg:          #F5F7FC;
    --bg-card:     #FFFFFF;
    --border:      #DDE3F0;
    --border-mid:  #B8C3DF;
    --t1:          #1B2A6B;
    --t2:          #4A5680;
    --t3:          #8896B8;
    --shadow-sm:   0 1px 4px rgba(27,42,107,0.07);
    --shadow-md:   0 4px 20px rgba(27,42,107,0.11);
    --shadow-lg:   0 8px 40px rgba(27,42,107,0.15);
    --font-d:      'Montserrat', sans-serif;
    --font-b:      'DM Sans', sans-serif;
    --font-m:      'JetBrains Mono', monospace;
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }

  body {
    background: var(--bg);
    color: var(--t1);
    font-family: var(--font-b);
    font-weight: 400;
    line-height: 1.6;
    overflow-x: hidden;
    min-height: 100vh;
  }

  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: var(--bg); }
  ::-webkit-scrollbar-thumb { background: var(--border-mid); border-radius: 2px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--navy); }
  ::selection { background: var(--navy-light); color: var(--navy); }

  input, textarea, select {
    background: var(--white);
    border: 1.5px solid var(--border);
    border-radius: 10px;
    color: var(--t1);
    font-family: var(--font-b);
    font-size: 15px;
    padding: 13px 16px;
    width: 100%;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  input:focus, textarea:focus, select:focus {
    border-color: var(--navy);
    box-shadow: 0 0 0 3px rgba(27,42,107,0.10);
  }
  input::placeholder, textarea::placeholder { color: var(--t3); }

  @keyframes fadeUp   { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeIn   { from{opacity:0} to{opacity:1} }
  @keyframes spin     { to{transform:rotate(360deg)} }
  @keyframes spinSlow { to{transform:rotate(360deg)} }
  @keyframes scanLine { 0%{top:0%} 100%{top:100%} }
  @keyframes blink    { 0%,100%{opacity:1} 50%{opacity:0} }
  @keyframes float    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
  @keyframes pulseNav { 0%,100%{box-shadow:0 4px 20px rgba(27,42,107,0.3)} 50%{box-shadow:0 4px 32px rgba(27,42,107,0.55)} }
  @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
  @keyframes slideUp { from{opacity:0;transform:translateY(40px)} to{opacity:1;transform:translateY(0)} }
  @keyframes heroFloat { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(-8px) rotate(1deg)} }
  @keyframes pulse2 { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.7;transform:scale(1.05)} }
  @keyframes gradientShift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
  @keyframes blob1 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(60px,-40px) scale(1.15)} 66%{transform:translate(-30px,50px) scale(0.92)} }
  @keyframes blob2 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(-50px,60px) scale(1.1)} 66%{transform:translate(40px,-30px) scale(0.95)} }
  @keyframes blob3 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(40px,40px) scale(0.9)} 66%{transform:translate(-60px,-20px) scale(1.12)} }
  @keyframes blob4 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(-40px,-50px) scale(1.08)} 66%{transform:translate(50px,30px) scale(0.93)} }

  /* Inner page background — subtle gradient instead of flat white */
  .inner-page-bg {
    background: linear-gradient(160deg, #f0f4ff 0%, #f5f7fc 40%, #eef1fa 100%);
    min-height: calc(100vh - 64px);
    position: relative;
  }
  .inner-page-bg::before {
    content:'';
    position:fixed;
    top:0;left:0;right:0;bottom:0;
    background:
      radial-gradient(ellipse at 10% 20%, rgba(27,42,107,0.04) 0%, transparent 50%),
      radial-gradient(ellipse at 90% 80%, rgba(0,149,217,0.04) 0%, transparent 50%);
    pointer-events:none;
    z-index:0;
  }

  @keyframes cardCycle {
    0%   { transform: translateX(0%)     scale(1)    ; opacity:1; z-index:3; }
    30%  { transform: translateX(0%)     scale(1)    ; opacity:1; z-index:3; }
    38%  { transform: translateX(-110%)  scale(0.9)  ; opacity:0; z-index:1; }
    39%  { transform: translateX(220%)   scale(0.85) ; opacity:0; z-index:1; }
    48%  { transform: translateX(110%)   scale(0.90) ; opacity:0.6; z-index:2; }
    100% { transform: translateX(0%)     scale(1)    ; opacity:1; z-index:3; }
  }

  @keyframes slideCards {
    0%   { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }

  .fu  { animation: fadeUp 0.55s ease forwards; }
  .fi  { animation: fadeIn 0.4s  ease forwards; }

  .card {
    background: var(--white);
    border: 1px solid var(--border);
    border-radius: 16px;
    box-shadow: var(--shadow-sm);
  }
  .card-navy {
    background: var(--navy);
    border: none;
    border-radius: 16px;
  }

  .tag {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 3px 10px; border-radius: 20px;
    font-size: 11px; font-family: var(--font-m); font-weight: 600; letter-spacing: 0.3px;
  }
  .tag-navy   { background:var(--navy-light); color:var(--navy);   border:1px solid rgba(27,42,107,0.15); }
  .tag-sky    { background:var(--sky-light);  color:var(--sky);    border:1px solid rgba(0,149,217,0.2); }
  .tag-orange { background:var(--orange-light);color:var(--orange);border:1px solid rgba(245,136,31,0.2); }
  .tag-green  { background:var(--green-light);color:var(--green);  border:1px solid rgba(0,166,81,0.2); }
  .tag-red    { background:var(--red-light);  color:var(--red);    border:1px solid rgba(211,47,47,0.2); }
  .tag-gold   { background:var(--gold-light); color:var(--gold);   border:1px solid rgba(230,168,23,0.25); }

  .btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    padding: 12px 28px; border-radius: 10px; border: none; cursor: pointer;
    font-family: var(--font-d); font-weight: 700; font-size: 13px; letter-spacing: 0.3px;
    transition: all 0.2s ease;
  }
  .btn:disabled { opacity: 0.45; cursor: not-allowed; }
  .btn-primary {
    background: var(--navy);
    color: #fff;
    box-shadow: 0 4px 16px rgba(27,42,107,0.28);
  }
  .btn-primary:not(:disabled):hover {
    background: var(--navy-dark);
    transform: translateY(-2px);
    box-shadow: 0 8px 28px rgba(27,42,107,0.38);
  }
  .btn-sky {
    background: var(--sky);
    color: #fff;
    box-shadow: 0 4px 16px rgba(0,149,217,0.25);
  }
  .btn-sky:not(:disabled):hover { background: #007ab8; transform: translateY(-2px); }
  .btn-ghost {
    background: transparent; color: var(--navy);
    border: 1.5px solid var(--border-mid);
  }
  .btn-ghost:not(:disabled):hover {
    border-color: var(--navy); background: var(--navy-light);
  }
  .btn-danger {
    background: var(--red);
    color: #fff;
    box-shadow: 0 4px 16px rgba(211,47,47,0.25);
  }
  .btn-danger:not(:disabled):hover { background: #b71c1c; transform: translateY(-2px); }
  .btn-full { width: 100%; }
  .btn-lg { padding: 15px 36px; font-size: 14px; border-radius: 12px; }

  .spinner-inline {
    width: 16px; height: 16px;
    border: 2px solid rgba(255,255,255,0.3); border-top-color: currentColor;
    border-radius: 50%; animation: spin 0.7s linear infinite; flex-shrink: 0;
  }

  .divider {
    height: 1px;
    background: var(--border);
    margin: 20px 0;
  }

  .section-label {
    font-size: 11px; font-family: var(--font-m); font-weight: 600;
    letter-spacing: 1px; text-transform: uppercase; color: var(--t3);
    margin-bottom: 8px;
  }
`;

/* ─── SHARED ATOMS ───────────────────────────────────────────────────────── */

function TopNav({ step, sessionId }) {
  const steps = ["Auth","Loan Type","KYC Docs","Liveness","Face Match","Video Call","Review","Decision","KFS","Audit","Summary"];
  const isLanding = step === 0;

  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 100,
      background: "#fff",
      borderBottom: "1px solid var(--border)",
      boxShadow: "0 2px 12px rgba(27,42,107,0.06)"
    }}>
      {/* Main nav bar */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 40px", height:64 }}>
        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", gap:10, textDecoration:"none" }}>
          <div style={{
            width:36, height:36, borderRadius:6,
            background:"var(--navy)", display:"flex", alignItems:"center", justifyContent:"center",
            fontFamily:"var(--font-d)", fontWeight:900, fontSize:18, color:"#fff", letterSpacing:"-1px"
          }}>P</div>
          <div>
            <div style={{ fontFamily:"var(--font-d)", fontWeight:800, fontSize:13, color:"var(--navy)", letterSpacing:"0.5px", lineHeight:1.1 }}>POONAWALLA</div>
            <div style={{ fontFamily:"var(--font-d)", fontWeight:600, fontSize:10, color:"var(--t2)", letterSpacing:"1.5px" }}>FINCORP</div>
          </div>
        </div>

        {/* Nav links — shown only on landing */}
        {isLanding && (
          <div style={{ display:"flex", gap:28, alignItems:"center" }}>
            {["LOAN","COMPANY","REFER & EARN"].map(item => (
              <span key={item} style={{ fontSize:12, fontFamily:"var(--font-d)", fontWeight:700, color:"var(--t1)", cursor:"pointer", letterSpacing:"0.3px", display:"flex", alignItems:"center", gap:4 }}>
                {item} {(item==="LOAN"||item==="COMPANY") && <span style={{ fontSize:9 }}>▾</span>}
              </span>
            ))}
          </div>
        )}

        {/* Right side */}
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          {isLanding ? (
            <>
              <span style={{ fontSize:12, fontFamily:"var(--font-d)", fontWeight:700, color:"var(--t1)", cursor:"pointer", letterSpacing:"0.3px" }}>LOGIN</span>
              <button className="btn btn-primary" style={{ padding:"9px 20px", fontSize:12, borderRadius:8 }}>APPLY NOW</button>
            </>
          ) : (
            <>
              {sessionId && <span className="tag tag-navy" style={{ fontFamily:"var(--font-m)", fontSize:10 }}>#{sessionId.slice(0,8)}</span>}
              <span className="tag tag-orange">RBI 2025</span>
              <span className="tag tag-sky">● LIVE SESSION</span>
            </>
          )}
        </div>
      </div>

      {/* Step progress bar */}
      {step > 0 && (
        <div style={{ background:"var(--bg)", borderTop:"1px solid var(--border)", padding:"10px 40px", overflowX:"auto" }}>
          <div style={{ display:"flex", alignItems:"center", minWidth:720 }}>
            {steps.map((s, i) => {
              const done = i < step, active = i === step;
              return (
                <div key={i} style={{ display:"flex", alignItems:"center", flex: i < steps.length-1 ? 1 : 0 }}>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4, minWidth:60 }}>
                    <div style={{
                      width:24, height:24, borderRadius:"50%",
                      background: done ? "var(--navy)" : active ? "var(--sky-light)" : "var(--white)",
                      border:`2px solid ${done ? "var(--navy)" : active ? "var(--sky)" : "var(--border-mid)"}`,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:10, fontWeight:700, fontFamily:"var(--font-d)",
                      color: done ? "#fff" : active ? "var(--sky)" : "var(--t3)",
                      transition:"all 0.3s",
                    }}>
                      {done ? "✓" : i+1}
                    </div>
                    <span style={{ fontSize:9, fontFamily:"var(--font-m)", letterSpacing:"0.3px", color: active ? "var(--navy)" : done ? "var(--t2)" : "var(--t3)", whiteSpace:"nowrap", fontWeight: active ? 700 : 500 }}>{s}</span>
                  </div>
                  {i < steps.length-1 && (
                    <div style={{ flex:1, height:2, margin:"0 4px", marginBottom:16, background: done ? "var(--navy)" : "var(--border)", borderRadius:1, transition:"background 0.4s" }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
}

function Card({ children, glow, danger, warn, style: sx }) {
  let borderColor = "var(--border)";
  let shadow = "var(--shadow-sm)";
  if (glow)   { borderColor = "rgba(27,42,107,0.25)"; shadow = "0 4px 24px rgba(27,42,107,0.12)"; }
  if (warn)   { borderColor = "rgba(230,168,23,0.35)"; shadow = "0 4px 16px rgba(230,168,23,0.08)"; }
  if (danger) { borderColor = "rgba(211,47,47,0.3)";  shadow = "0 4px 16px rgba(211,47,47,0.08)"; }
  return (
    <div className="card" style={{ padding:24, borderColor, boxShadow:shadow, ...sx }}>
      {children}
    </div>
  );
}

function ErrBox({ msg }) {
  if (!msg) return null;
  return (
    <div style={{ background:"var(--red-light)", border:"1px solid rgba(211,47,47,0.2)", borderRadius:10, padding:"12px 16px", marginTop:14, color:"var(--red)", fontSize:13, display:"flex", gap:8 }}>
      <span style={{ flexShrink:0 }}>⚠</span><span>{msg}</span>
    </div>
  );
}

function OkBox({ msg }) {
  if (!msg) return null;
  return (
    <div style={{ background:"var(--green-light)", border:"1px solid rgba(0,166,81,0.2)", borderRadius:10, padding:"12px 16px", marginTop:14, color:"var(--green)", fontSize:13 }}>✓ {msg}</div>
  );
}

function Spinner({ size=20, color="var(--navy)" }) {
  return (
    <div style={{ width:size, height:size, border:`2px solid rgba(27,42,107,0.12)`, borderTopColor:color, borderRadius:"50%", animation:"spinSlow 0.8s linear infinite", flexShrink:0 }} />
  );
}

function SectionHead({ children, sub }) {
  return (
    <div className="fu" style={{ marginBottom:28 }}>
      <h2 style={{ fontFamily:"var(--font-d)", fontSize:22, fontWeight:800, color:"var(--navy)", letterSpacing:"-0.3px", marginBottom: sub ? 6 : 0 }}>{children}</h2>
      {sub && <p style={{ color:"var(--t2)", fontSize:14 }}>{sub}</p>}
    </div>
  );
}

function CamCorners() {
  return (
    <>
      {[["top","left"],["top","right"],["bottom","left"],["bottom","right"]].map(([v,h]) => (
        <div key={`${v}${h}`} style={{
          position:"absolute", [v]:10, [h]:10, width:20, height:20,
          borderTop:    v==="top"    ? "2px solid #fff" : "none",
          borderBottom: v==="bottom" ? "2px solid #fff" : "none",
          borderLeft:   h==="left"   ? "2px solid #fff" : "none",
          borderRight:  h==="right"  ? "2px solid #fff" : "none",
          opacity: 0.7,
        }} />
      ))}
    </>
  );
}

/* ─── EMI CALCULATOR ─────────────────────────────────────────────────────── */
function EmiCalculator() {
  const [amount, setAmount] = useState(500000);
  const [rate,   setRate]   = useState(12);
  const [tenure, setTenure] = useState(36);

  const emi = (() => {
    const r = rate / 12 / 100;
    if (r === 0) return Math.round(amount / tenure);
    return Math.round(amount * r * Math.pow(1+r,tenure) / (Math.pow(1+r,tenure) - 1));
  })();
  const total    = emi * tenure;
  const interest = total - amount;
  const pct      = Math.round((interest / total) * 100);

  const Slider = ({ label, value, min, max, step, onChange, display }) => (
    <div style={{ marginBottom:14 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
        <span style={{ fontSize:12, color:"rgba(255,255,255,0.65)" }}>{label}</span>
        <span style={{ fontSize:14, fontWeight:800, color:"#fff", fontFamily:"var(--font-d)" }}>{display}</span>
      </div>
      <div style={{ position:"relative" }}>
        <input type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(Number(e.target.value))}
          style={{ width:"100%", accentColor:"#F5881F", height:4, padding:0, background:"transparent", border:"none", cursor:"pointer" }}/>
      </div>
    </div>
  );

  return (
    <div style={{ background:"linear-gradient(135deg,rgba(27,42,107,0.95),rgba(11,25,75,0.98))", borderRadius:16, padding:"24px 28px", backdropFilter:"blur(20px)", border:"1px solid rgba(255,255,255,0.12)" }}>
      <div style={{ fontFamily:"var(--font-d)", fontWeight:800, fontSize:15, color:"#fff", marginBottom:18, letterSpacing:"0.3px" }}>✦ EMI Calculator</div>
      <Slider label="Loan Amount" value={amount} min={50000} max={5000000} step={10000} onChange={setAmount} display={`₹${(amount/100000).toFixed(1)}L`}/>
      <Slider label="Interest Rate" value={rate} min={8} max={24} step={0.5} onChange={setRate} display={`${rate}%`}/>
      <Slider label="Tenure" value={tenure} min={6} max={360} step={6} onChange={setTenure} display={`${tenure} mo`}/>
      <div style={{ background:"linear-gradient(135deg,#F5881F,#e07010)", borderRadius:12, padding:"16px 20px", marginTop:4 }}>
        <div style={{ fontSize:10, color:"rgba(255,255,255,0.7)", fontFamily:"var(--font-d)", fontWeight:700, letterSpacing:"1px", marginBottom:3 }}>MONTHLY EMI</div>
        <div style={{ fontSize:30, fontFamily:"var(--font-d)", fontWeight:900, color:"#fff" }}>₹{emi.toLocaleString("en-IN")}</div>
        <div style={{ display:"flex", gap:16, marginTop:10, borderTop:"1px solid rgba(255,255,255,0.2)", paddingTop:10 }}>
          <div><div style={{ fontSize:9, color:"rgba(255,255,255,0.55)", marginBottom:2 }}>TOTAL INTEREST</div><div style={{ fontSize:12, fontWeight:700, color:"rgba(255,255,255,0.9)" }}>₹{interest.toLocaleString("en-IN")}</div></div>
          <div><div style={{ fontSize:9, color:"rgba(255,255,255,0.55)", marginBottom:2 }}>TOTAL PAYABLE</div><div style={{ fontSize:12, fontWeight:700, color:"rgba(255,255,255,0.9)" }}>₹{total.toLocaleString("en-IN")}</div></div>
          <div><div style={{ fontSize:9, color:"rgba(255,255,255,0.55)", marginBottom:2 }}>INTEREST%</div><div style={{ fontSize:12, fontWeight:700, color:"rgba(255,255,255,0.9)" }}>{pct}%</div></div>
        </div>
      </div>
    </div>
  );
}

/* ─── LOGIN MODAL ────────────────────────────────────────────────────────── */
function LoginModal({ onClose }) {
  const [mode, setMode] = useState("login"); // login | register
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(4px)" }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:"#fff", borderRadius:20, padding:"36px 40px", width:"100%", maxWidth:420, boxShadow:"0 20px 60px rgba(0,0,0,0.25)", position:"relative", animation:"fadeUp 0.3s ease" }}>
        <button onClick={onClose} style={{ position:"absolute", top:16, right:16, background:"none", border:"none", cursor:"pointer", fontSize:20, color:"var(--t3)" }}>✕</button>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:24 }}>
          <div style={{ width:32, height:32, background:"var(--navy)", borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"var(--font-d)", fontWeight:900, fontSize:16, color:"#fff" }}>P</div>
          <div>
            <div style={{ fontFamily:"var(--font-d)", fontWeight:800, fontSize:12, color:"var(--navy)" }}>POONAWALLA FINCORP</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:0, marginBottom:24, border:"1.5px solid var(--border)", borderRadius:10, overflow:"hidden" }}>
          {["login","register"].map(m=>(
            <button key={m} onClick={()=>setMode(m)} style={{ flex:1, padding:"10px", background:mode===m?"var(--navy)":"transparent", color:mode===m?"#fff":"var(--t2)", border:"none", cursor:"pointer", fontFamily:"var(--font-d)", fontWeight:700, fontSize:13, transition:"all 0.2s" }}>
              {m==="login"?"Login":"New Account"}
            </button>
          ))}
        </div>
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:11, color:"var(--t3)", marginBottom:6, fontFamily:"var(--font-m)", letterSpacing:"0.5px", textTransform:"uppercase" }}>Mobile Number</div>
          <input type="tel" placeholder="+91 98765 43210"/>
        </div>
        {mode==="register" && (
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:11, color:"var(--t3)", marginBottom:6, fontFamily:"var(--font-m)", letterSpacing:"0.5px", textTransform:"uppercase" }}>Email</div>
            <input type="email" placeholder="yourname@email.com"/>
          </div>
        )}
        <button className="btn btn-primary btn-full btn-lg" style={{ marginTop:8 }}>
          {mode==="login" ? "Send OTP → Login" : "Create Account →"}
        </button>
        <div style={{ textAlign:"center", marginTop:16, fontSize:12, color:"var(--t3)" }}>
          For new loan application: use the <strong style={{ color:"var(--navy)" }}>Apply Now</strong> button instead
        </div>
      </div>
    </div>
  );
}

/* ─── COMPANY PAGE ───────────────────────────────────────────────────────── */
/* ─── LOAN PAGE ──────────────────────────────────────────────────────────── */
const LOAN_DETAILS = {
  personal: {
    label: "Personal Loan", icon: "💼", color: "#e8610a",
    eligibility: ["Age 21–60 years", "Minimum monthly income ₹20,000 (salaried) or ₹25,000 (self-employed)", "Credit score 700+", "Minimum 1 year work experience", "Indian resident"],
    documents: ["Aadhaar Card", "PAN Card", "Last 3 months salary slips", "Last 6 months bank statements", "Employee ID Card", "Form 16 (latest)"],
    rate: "Starting 9.99% p.a.", amount: "Up to ₹30 Lakhs", tenure: "Up to 5 years",
  },
  instant_personal: {
    label: "Instant Personal Loan", icon: "⚡", color: "#f59e0b",
    eligibility: ["Age 21–55 years", "Salaried employee only", "Minimum monthly income ₹25,000", "Credit score 720+", "Pre-approved customers get faster disbursal"],
    documents: ["Aadhaar Card", "PAN Card", "Latest salary slip", "Last 3 months bank statements", "Employee ID Card"],
    rate: "Starting 10.99% p.a.", amount: "Up to ₹10 Lakhs", tenure: "Up to 3 years",
  },
  business: {
    label: "Business Loan", icon: "🏢", color: "#1565C0",
    eligibility: ["Age 25–65 years", "Business vintage minimum 2 years", "Annual turnover ₹10 Lakhs+", "Business registered (GST/Udyam)", "Profitable for last 2 years"],
    documents: ["Aadhaar Card", "PAN Card", "GST Registration / Udyam Certificate", "Last 2 years ITR with financials", "Last 12 months bank statements", "Business proof (trade licence / partnership deed)"],
    rate: "Starting 15% p.a.", amount: "Up to ₹50 Lakhs", tenure: "Up to 5 years",
  },
  professional: {
    label: "Professional Loan", icon: "🎓", color: "#6A1B9A",
    eligibility: ["Qualified CA, Doctor, CS, or Architect", "Age 25–65 years", "Minimum 2 years of practice", "Valid Certificate of Practice", "Income ₹3 Lakhs+ per annum"],
    documents: ["Aadhaar Card", "PAN Card", "Certificate of Practice / Degree", "Professional registration number", "Last 2 years ITR", "Last 6 months bank statements"],
    rate: "Starting 13% p.a.", amount: "Up to ₹75 Lakhs", tenure: "Up to 7 years",
  },
  home: {
    label: "Home Loan", icon: "🏠", color: "#2e7d32",
    eligibility: ["Age 21–70 years (at loan maturity)", "Salaried, self-employed, or NRI", "Minimum income ₹25,000/month", "Credit score 650+", "Property must be legally clear"],
    documents: ["Aadhaar Card", "PAN Card", "Salary slips / ITR (last 2 years)", "Last 6 months bank statements", "Property documents (title deed, sale agreement)", "NOC from builder / society", "For NRI: passport, visa, overseas bank statements"],
    rate: "From 9.55% p.a. (Women: 8.75%)", amount: "Up to ₹5 Crores", tenure: "Up to 30 years",
  },
  education_domestic: {
    label: "Education Loan (India)", icon: "📚", color: "#1565C0",
    eligibility: ["Indian student pursuing UG/PG in India", "Age 16–35 years", "Admission confirmed at recognised institution", "Co-applicant (parent/guardian) mandatory", "No minimum income for student"],
    documents: ["Aadhaar Card", "PAN Card", "College ID or Admission Letter", "Fee structure from institution", "Co-applicant Aadhaar & PAN", "Co-applicant last 2 years ITR / salary slips", "Last 6 months co-applicant bank statements"],
    rate: "Starting 10.5% p.a.", amount: "Up to ₹20 Lakhs", tenure: "Up to 7 years",
  },
  education_international: {
    label: "Education Loan (Abroad)", icon: "✈️", color: "#0277BD",
    eligibility: ["Indian student pursuing studies abroad", "Age 18–35 years", "Admission confirmed at recognised foreign university", "Co-applicant (parent/guardian) mandatory", "Valid visa or visa-applied proof"],
    documents: ["Aadhaar Card", "PAN Card", "Admission Letter from foreign university", "Visa / visa application proof", "Passport", "Fee structure", "Co-applicant Aadhaar & PAN", "Co-applicant ITR (last 2 years)", "Last 6 months co-applicant bank statements"],
    rate: "Starting 11% p.a.", amount: "Up to ₹40 Lakhs", tenure: "Up to 10 years",
  },
  lap: {
    label: "Loan Against Property", icon: "🏗️", color: "#00695c",
    eligibility: ["Age 25–70 years", "Salaried, self-employed, or entrepreneur", "Property must be self-owned and legally clear", "Minimum income ₹30,000/month", "Credit score 650+"],
    documents: ["Aadhaar Card", "PAN Card", "Property title deed & encumbrance certificate", "Latest property tax receipt", "Last 2 years ITR with financials", "Last 12 months bank statements", "Building plan approval (if applicable)"],
    rate: "From 9% p.a.", amount: "Up to ₹10 Crores", tenure: "Up to 15 years",
  },
  gold: {
    label: "Gold Loan", icon: "🪙", color: "#B8860B",
    eligibility: ["Age 18–70 years", "Owner of gold jewellery (minimum 18 carats)", "RBI LTV: up to 85% of gold value (≤ ₹2.5L)", "No minimum income requirement", "Indian resident"],
    documents: ["Aadhaar Card", "PAN Card", "Gold jewellery for valuation at branch", "Proof of ownership (if available)"],
    rate: "From 9.99% p.a.", amount: "Based on gold value", tenure: "Up to 12 months",
  },
  pre_owned_car: {
    label: "Pre-Owned Car Loan", icon: "🚗", color: "#37474F",
    eligibility: ["Age 21–65 years", "Salaried or self-employed", "Minimum income ₹20,000/month", "Credit score 650+", "Car not older than 10 years at loan end"],
    documents: ["Aadhaar Card", "PAN Card", "RC Book of the vehicle", "Car insurance copy", "Seller NOC / transfer documents", "Last 3 months salary slips or ITR", "Last 6 months bank statements"],
    rate: "Starting 14% p.a.", amount: "Up to ₹30 Lakhs", tenure: "Up to 5 years",
  },
  medical_equipment: {
    label: "Medical Equipment Loan", icon: "🏥", color: "#C62828",
    eligibility: ["Qualified medical professional (Doctor/Specialist)", "Age 25–65 years", "Valid Certificate of Practice", "Minimum 2 years of practice", "Equipment must be for professional use"],
    documents: ["Aadhaar Card", "PAN Card", "Certificate of Practice / Medical degree", "Equipment quotation from supplier", "Last 2 years ITR", "Last 6 months bank statements", "Clinic/hospital ownership or lease proof"],
    rate: "Starting 12% p.a.", amount: "Up to ₹2 Crores", tenure: "Up to 7 years",
  },
  consumer_durable: {
    label: "Consumer Durable Loan", icon: "📺", color: "#283593",
    eligibility: ["Age 21–60 years", "Salaried or self-employed", "Minimum income ₹15,000/month", "Credit score 600+", "Purchase from partner retailer"],
    documents: ["Aadhaar Card", "PAN Card", "Latest salary slip or ITR", "Last 3 months bank statements", "Invoice / quotation of product"],
    rate: "Starting 0% (offer-based)", amount: "Up to ₹5 Lakhs", tenure: "Up to 3 years",
  },
};

function LoanPage({ onClose }) {
  const [selected, setSelected] = useState(null);
  const detail = selected ? LOAN_DETAILS[selected] : null;

  return (
    <div style={{position:"fixed",inset:0,zIndex:200,overflowY:"auto",background:"#080d2e",fontFamily:"var(--font-b)"}}>
      {/* Navbar */}
      <nav style={{position:"sticky",top:0,zIndex:10,background:"rgba(8,13,46,0.95)",backdropFilter:"blur(12px)",borderBottom:"1px solid rgba(255,255,255,0.08)",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 48px",height:66}}>
        <div style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}} onClick={onClose}>
          <div style={{width:36,height:36,background:"var(--navy)",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--font-d)",fontWeight:900,fontSize:18,color:"#fff"}}>P</div>
          <div><div style={{fontFamily:"var(--font-d)",fontWeight:900,fontSize:13,color:"#fff",letterSpacing:"0.5px"}}>POONAWALLA</div><div style={{fontFamily:"var(--font-d)",fontWeight:600,fontSize:9,color:"rgba(255,255,255,0.45)",letterSpacing:"2px"}}>FINCORP</div></div>
        </div>
        <div style={{display:"flex",gap:32,alignItems:"center"}}>
          <span style={{fontSize:12,fontFamily:"var(--font-d)",fontWeight:700,color:"#fff",cursor:"pointer",letterSpacing:"0.3px",borderBottom:"2px solid var(--orange)",paddingBottom:2}}>LOAN</span>
          <span style={{fontSize:12,fontFamily:"var(--font-d)",fontWeight:700,color:"rgba(255,255,255,0.5)",cursor:"pointer",letterSpacing:"0.3px"}} onClick={onClose}>COMPANY</span>
          <span style={{fontSize:12,fontFamily:"var(--font-d)",fontWeight:700,color:"rgba(255,255,255,0.5)",cursor:"pointer",letterSpacing:"0.3px"}} onClick={onClose}>REFER &amp; EARN</span>
        </div>
        <button onClick={onClose} style={{background:"transparent",border:"1.5px solid rgba(255,255,255,0.2)",borderRadius:8,color:"#fff",fontFamily:"var(--font-d)",fontWeight:700,fontSize:12,padding:"8px 18px",cursor:"pointer",letterSpacing:"0.3px"}}>← BACK</button>
      </nav>

      {/* Hero banner */}
      <div style={{background:"linear-gradient(135deg,#0d1540 0%,#1a2060 100%)",padding:"64px 48px 56px",position:"relative",overflow:"hidden",borderBottom:"1px solid rgba(255,255,255,0.07)"}}>
        <div style={{position:"absolute",top:"-20%",right:"-5%",width:500,height:500,borderRadius:"50%",background:"radial-gradient(circle,rgba(245,136,31,0.18) 0%,transparent 70%)",pointerEvents:"none"}}/>
        <div style={{position:"absolute",bottom:"-30%",left:"5%",width:400,height:400,borderRadius:"50%",background:"radial-gradient(circle,rgba(0,149,217,0.15) 0%,transparent 70%)",pointerEvents:"none"}}/>
        <div style={{maxWidth:1100,margin:"0 auto",position:"relative",zIndex:2}}>
          <div style={{display:"inline-block",background:"rgba(245,136,31,0.15)",border:"1px solid rgba(245,136,31,0.35)",borderRadius:20,padding:"5px 16px",fontSize:11,fontFamily:"var(--font-d)",fontWeight:700,color:"#F5881F",letterSpacing:"0.5px",marginBottom:20}}>POONAWALLA FINCORP</div>
          <h1 style={{fontFamily:"var(--font-d)",fontSize:"clamp(28px,3.5vw,48px)",fontWeight:900,color:"#fff",marginBottom:14,lineHeight:1.15,letterSpacing:"-0.5px"}}>Our Loan Products</h1>
          <p style={{color:"rgba(255,255,255,0.55)",fontSize:15,maxWidth:560,lineHeight:1.7}}>Select a loan type to explore eligibility criteria and required documents.</p>
        </div>
      </div>

      {/* Body */}
      <div style={{maxWidth:1100,margin:"0 auto",padding:"48px 48px 80px"}}>

        {/* Loan type bubbles — full-width grid */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:44}}>
          {Object.entries(LOAN_DETAILS).map(([key, cfg])=>(
            <button key={key} onClick={()=>setSelected(selected===key?null:key)}
              style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:10,padding:"28px 16px",borderRadius:20,border:`2px solid ${selected===key?cfg.color:"rgba(255,255,255,0.1)"}`,background:selected===key?`${cfg.color}22`:"rgba(255,255,255,0.04)",color:selected===key?"#fff":"rgba(255,255,255,0.65)",fontFamily:"var(--font-d)",fontWeight:700,fontSize:14,cursor:"pointer",transition:"all 0.2s",outline:"none",textAlign:"center",lineHeight:1.3}}
              onMouseEnter={e=>{if(selected!==key){e.currentTarget.style.borderColor=cfg.color;e.currentTarget.style.color="#fff";e.currentTarget.style.background=`${cfg.color}11`;}}}
              onMouseLeave={e=>{if(selected!==key){e.currentTarget.style.borderColor="rgba(255,255,255,0.1)";e.currentTarget.style.color="rgba(255,255,255,0.65)";e.currentTarget.style.background="rgba(255,255,255,0.04)";}}}
            >
              <span style={{fontSize:32}}>{cfg.icon}</span>
              {cfg.label}
            </button>
          ))}
        </div>

        {/* Detail panel */}
        {detail && (
          <div style={{background:"rgba(255,255,255,0.04)",border:`1px solid ${detail.color}44`,borderRadius:24,padding:"36px 40px",animation:"fadeUp 0.3s ease forwards"}}>
            <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:28}}>
              <div style={{width:52,height:52,borderRadius:14,background:`${detail.color}22`,border:`1px solid ${detail.color}55`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26}}>{detail.icon}</div>
              <div>
                <h2 style={{fontFamily:"var(--font-d)",fontWeight:900,fontSize:24,color:"#fff",marginBottom:4}}>{detail.label}</h2>
                <div style={{display:"flex",gap:16}}>
                  <span style={{fontSize:12,color:detail.color,fontFamily:"var(--font-d)",fontWeight:700}}>📈 {detail.rate}</span>
                  <span style={{fontSize:12,color:"rgba(255,255,255,0.5)",fontFamily:"var(--font-d)",fontWeight:600}}>💰 {detail.amount}</span>
                  <span style={{fontSize:12,color:"rgba(255,255,255,0.5)",fontFamily:"var(--font-d)",fontWeight:600}}>📅 {detail.tenure}</span>
                </div>
              </div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:28}}>
              {/* Eligibility */}
              <div>
                <div style={{fontFamily:"var(--font-d)",fontSize:11,fontWeight:700,color:detail.color,letterSpacing:"2px",textTransform:"uppercase",marginBottom:14}}>Eligibility Criteria</div>
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {detail.eligibility.map((e,i)=>(
                    <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                      <div style={{width:20,height:20,borderRadius:"50%",background:`${detail.color}22`,border:`1px solid ${detail.color}55`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
                        <span style={{fontSize:9,color:detail.color,fontWeight:900}}>✓</span>
                      </div>
                      <span style={{fontSize:13,color:"rgba(255,255,255,0.7)",lineHeight:1.6}}>{e}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Documents */}
              <div>
                <div style={{fontFamily:"var(--font-d)",fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.4)",letterSpacing:"2px",textTransform:"uppercase",marginBottom:14}}>Documents Required</div>
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {detail.documents.map((d,i)=>(
                    <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                      <div style={{width:20,height:20,borderRadius:6,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
                        <span style={{fontSize:9,color:"rgba(255,255,255,0.5)",fontWeight:900}}>📄</span>
                      </div>
                      <span style={{fontSize:13,color:"rgba(255,255,255,0.7)",lineHeight:1.6}}>{d}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{marginTop:28,paddingTop:24,borderTop:"1px solid rgba(255,255,255,0.07)",display:"flex",justifyContent:"flex-end"}}>
              <button onClick={onClose}
                style={{background:`linear-gradient(135deg,${detail.color},${detail.color}cc)`,color:"#fff",border:"none",borderRadius:10,fontFamily:"var(--font-d)",fontWeight:800,fontSize:13,padding:"12px 28px",cursor:"pointer",letterSpacing:"0.5px"}}>
                Apply for {detail.label} →
              </button>
            </div>
          </div>
        )}

        {!detail && (
          <div style={{textAlign:"center",padding:"32px 0",color:"rgba(255,255,255,0.18)",fontFamily:"var(--font-d)",fontWeight:600,fontSize:13,letterSpacing:"0.5px"}}>
            Click any card above to view eligibility &amp; documents
          </div>
        )}
      </div>
    </div>
  );
}

function CompanyPage({ onClose }) {
  return (
    <div style={{position:"fixed",inset:0,zIndex:200,overflowY:"auto",background:"#080d2e",fontFamily:"var(--font-b)"}}>
      {/* Navbar */}
      <nav style={{position:"sticky",top:0,zIndex:10,background:"rgba(8,13,46,0.95)",backdropFilter:"blur(12px)",borderBottom:"1px solid rgba(255,255,255,0.08)",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 48px",height:66}}>
        <div style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}} onClick={onClose}>
          <div style={{width:36,height:36,background:"var(--navy)",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--font-d)",fontWeight:900,fontSize:18,color:"#fff"}}>P</div>
          <div><div style={{fontFamily:"var(--font-d)",fontWeight:900,fontSize:13,color:"#fff",letterSpacing:"0.5px"}}>POONAWALLA</div><div style={{fontFamily:"var(--font-d)",fontWeight:600,fontSize:9,color:"rgba(255,255,255,0.45)",letterSpacing:"2px"}}>FINCORP</div></div>
        </div>
        <div style={{display:"flex",gap:32,alignItems:"center"}}>
          <span style={{fontSize:12,fontFamily:"var(--font-d)",fontWeight:700,color:"rgba(255,255,255,0.5)",cursor:"pointer",letterSpacing:"0.3px"}} onClick={onClose}>LOAN</span>
          <span style={{fontSize:12,fontFamily:"var(--font-d)",fontWeight:700,color:"#fff",cursor:"pointer",letterSpacing:"0.3px",borderBottom:"2px solid var(--orange)",paddingBottom:2}}>COMPANY</span>
          <span style={{fontSize:12,fontFamily:"var(--font-d)",fontWeight:700,color:"rgba(255,255,255,0.5)",cursor:"pointer",letterSpacing:"0.3px"}}>REFER &amp; EARN</span>
        </div>
        <button onClick={onClose} style={{background:"transparent",border:"1.5px solid rgba(255,255,255,0.2)",borderRadius:8,color:"#fff",fontFamily:"var(--font-d)",fontWeight:700,fontSize:12,padding:"8px 18px",cursor:"pointer",letterSpacing:"0.3px"}}>← BACK</button>
      </nav>

      {/* Hero banner */}
      <div style={{background:"linear-gradient(135deg,#0d1540 0%,#1a2060 100%)",padding:"64px 48px 56px",position:"relative",overflow:"hidden",borderBottom:"1px solid rgba(255,255,255,0.07)"}}>
        <div style={{position:"absolute",top:"-20%",right:"-5%",width:500,height:500,borderRadius:"50%",background:"radial-gradient(circle,rgba(245,136,31,0.18) 0%,transparent 70%)",pointerEvents:"none"}}/>
        <div style={{position:"absolute",bottom:"-30%",left:"5%",width:400,height:400,borderRadius:"50%",background:"radial-gradient(circle,rgba(0,149,217,0.15) 0%,transparent 70%)",pointerEvents:"none"}}/>
        <div style={{maxWidth:1100,margin:"0 auto",position:"relative",zIndex:2}}>
          <div style={{display:"inline-block",background:"rgba(245,136,31,0.15)",border:"1px solid rgba(245,136,31,0.35)",borderRadius:20,padding:"5px 16px",fontSize:11,fontFamily:"var(--font-d)",fontWeight:700,color:"#F5881F",letterSpacing:"0.5px",marginBottom:20}}>CYRUS POONAWALLA GROUP</div>
          <h1 style={{fontFamily:"var(--font-d)",fontSize:"clamp(28px,3.5vw,48px)",fontWeight:900,color:"#fff",marginBottom:14,lineHeight:1.15,letterSpacing:"-0.5px"}}>Our Story &amp; Leadership</h1>
          <p style={{color:"rgba(255,255,255,0.55)",fontSize:15,maxWidth:560,lineHeight:1.7}}>From Magma Fincorp to a AAA-rated NBFC — a journey of trust, technology and transformative finance for every Indian.</p>
        </div>
      </div>

      {/* Two-column body */}
      <div style={{maxWidth:1200,margin:"0 auto",padding:"48px 48px 80px",display:"grid",gridTemplateColumns:"380px 1fr",gap:40,alignItems:"start"}}>

        {/* ── LEFT COLUMN ── */}
        <div style={{display:"flex",flexDirection:"column",gap:20}}>

          {/* Company visual card */}
          <div style={{borderRadius:20,overflow:"hidden",border:"1px solid rgba(255,255,255,0.1)",position:"relative"}}>
            <img src="/images/company/hq.jpg" alt="Poonawalla Fincorp Headquarters" style={{width:"100%",height:340,objectFit:"cover",display:"block"}}/>
            <div style={{position:"absolute",bottom:12,right:14}}>
              <div style={{display:"inline-block",background:"rgba(0,200,140,0.18)",border:"1px solid rgba(0,200,140,0.35)",borderRadius:6,padding:"3px 12px",fontSize:10,fontFamily:"var(--font-d)",fontWeight:700,color:"#00e5a0",letterSpacing:"0.5px",backdropFilter:"blur(8px)"}}>AAA / Stable · CRISIL &amp; CARE</div>
            </div>
          </div>

          {/* Stats grid */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {[{v:"₹25,000+ Cr",l:"AUM MILESTONE"},{v:"5,000+",l:"EMPLOYEES"},{v:"300+",l:"BRANCHES"},{v:"100%",l:"DIGITAL ONBOARDING"}].map(({v,l})=>(
              <div key={l} style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,padding:"14px 14px"}}>
                <div style={{fontFamily:"var(--font-d)",fontWeight:900,fontSize:20,color:"var(--orange)",marginBottom:3}}>{v}</div>
                <div style={{fontFamily:"var(--font-d)",fontWeight:700,fontSize:9,color:"rgba(255,255,255,0.35)",letterSpacing:"0.8px"}}>{l}</div>
              </div>
            ))}
          </div>

          {/* Founder card */}
          <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:20,overflow:"hidden"}}>
            <div style={{position:"relative"}}>
              <img src="/images/company/adar.jpg" alt="Adar Poonawalla" style={{width:"100%",height:300,objectFit:"cover",objectPosition:"top center",display:"block"}}/>
              <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(8,13,46,0.92) 0%,rgba(8,13,46,0.2) 55%,transparent 100%)",pointerEvents:"none"}}/>
              <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"20px 22px"}}>
                <div style={{fontFamily:"var(--font-d)",fontWeight:800,fontSize:18,color:"#fff",marginBottom:3}}>Adar Poonawalla</div>
                <div style={{fontFamily:"var(--font-d)",fontWeight:700,fontSize:10,color:"var(--orange)",letterSpacing:"0.5px",marginBottom:2}}>CHAIRMAN, POONAWALLA FINCORP</div>
                <div style={{fontFamily:"var(--font-d)",fontWeight:600,fontSize:10,color:"rgba(255,255,255,0.4)"}}>CEO, Serum Institute of India</div>
              </div>
            </div>
            <div style={{padding:"20px 22px"}}>
              <p style={{fontSize:12,color:"rgba(255,255,255,0.6)",lineHeight:1.75,marginBottom:12}}>Adar Poonawalla is Chairman of Poonawalla Fincorp and the CEO of Serum Institute of India. An innovator to the core, he has been dedicated to developing affordable children's vaccines and providing the same across the globe.</p>
              <div style={{display:"inline-block",background:"rgba(99,102,241,0.15)",border:"1px solid rgba(99,102,241,0.3)",borderRadius:5,padding:"2px 10px",fontSize:10,fontFamily:"var(--font-d)",fontWeight:700,color:"#a5b4fc",letterSpacing:"0.5px",marginBottom:10}}>EXPERIENCE</div>
              <p style={{fontSize:12,color:"rgba(255,255,255,0.6)",lineHeight:1.75,marginBottom:12}}>He spearheaded the Clean City initiative (APCC) in Pune. In 2013, Forbes India included him in the 'Four Scions to Watch Out For' list. In 2018, he received the Corporate Social Responsibility award by CNBC Asia.</p>
              <p style={{fontSize:12,color:"rgba(255,255,255,0.6)",lineHeight:1.75}}>GQ magazine included Mr. Poonawalla in its elite list of the 50 most influential young Indians — another feather in the cap for the young innovator and promoter.</p>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div>
          {/* About */}
          <div style={{marginBottom:40}}>
            <div style={{fontFamily:"var(--font-d)",fontSize:11,fontWeight:700,color:"var(--orange)",letterSpacing:"2px",textTransform:"uppercase",marginBottom:10}}>Who We Are</div>
            <h2 style={{fontFamily:"var(--font-d)",fontSize:"clamp(22px,2.5vw,34px)",fontWeight:900,color:"#fff",marginBottom:16,lineHeight:1.2,letterSpacing:"-0.3px"}}>Building India's Most Trusted NBFC</h2>
            <p style={{color:"rgba(255,255,255,0.58)",fontSize:14,lineHeight:1.85,marginBottom:14}}>Poonawalla Fincorp Limited is a Cyrus Poonawalla Group Non-Banking Finance Company focused on consumer and MSME financing. We offer a diversified product suite to address the growing financing needs of customers and enterprises across India.</p>
            <p style={{color:"rgba(255,255,255,0.58)",fontSize:14,lineHeight:1.85}}>We stand for <strong style={{color:"rgba(255,255,255,0.85)"}}>Passion, People, Purpose, Principles</strong> and <strong style={{color:"rgba(255,255,255,0.85)"}}>Possibilities</strong> — delivering best-in-class service with complete transparency. Through deep investment in technology and innovation, we strive to create endless possibilities and partner in the growth journey of our customers.</p>
          </div>

          {/* Divider */}
          <div style={{height:1,background:"rgba(255,255,255,0.07)",marginBottom:36}}/>

          {/* Journey timeline */}
          <div style={{marginBottom:40}}>
            <div style={{fontFamily:"var(--font-d)",fontSize:11,fontWeight:700,color:"var(--orange)",letterSpacing:"2px",textTransform:"uppercase",marginBottom:20}}>Our Journey</div>
            <div style={{position:"relative",paddingLeft:24}}>
              <div style={{position:"absolute",left:6,top:8,bottom:8,width:1,background:"linear-gradient(to bottom,#F5881F,rgba(99,102,241,0.5),rgba(255,255,255,0.08))"}}/>
              {[
                {year:"1978",event:"Incorporated as Magma Leasing Limited",desc:"Founded in Kolkata, initially focused on leasing and asset finance services across India.",past:true},
                {year:"2008",event:"Rebranded to Magma Fincorp Limited",desc:"Expanded into diversified financial services including vehicle, housing and SME finance.",past:true},
                {year:"2011",event:"Global PE Investment",desc:"Kohlberg Kravis Roberts and IFC (World Bank arm) invested ~$100 million, marking global confidence.",past:true},
                {year:"May 2021",event:"Poonawalla Group Acquisition",desc:"Rising Sun Holdings Pvt Ltd (Adar Poonawalla) acquired controlling stake — a transformative milestone.",past:true},
                {year:"July 2021",event:"Rebranded to Poonawalla Fincorp",desc:"New identity, new vision. Credit rating upgraded two notches to AA+/Stable by CRISIL and CARE immediately.",past:true},
                {year:"2022–23",event:"Digital Transformation",desc:"Implemented LOS, LMS and ERP. Launched mobile app. Recognised among Most Preferred Workplaces 2022–23.",past:true},
                {year:"2024–Present",event:"AAA Rating & ₹25,000+ Cr AUM",desc:"Achieved AAA/Stable from CRISIL & CARE. AUM crossed ₹25,000 Cr, cementing leadership in digital consumer lending.",past:false},
              ].map(({year,event,desc,past})=>(
                <div key={year} style={{position:"relative",marginBottom:24}}>
                  <div style={{position:"absolute",left:-24,top:5,width:13,height:13,borderRadius:"50%",background:"#080d2e",border:`2px solid ${past?"#6366f1":"#F5881F"}`}}/>
                  <div style={{fontFamily:"var(--font-d)",fontWeight:700,fontSize:11,color:past?"#818cf8":"#F5881F",letterSpacing:"0.5px",marginBottom:3}}>{year}</div>
                  <div style={{fontFamily:"var(--font-d)",fontWeight:700,fontSize:14,color:"rgba(255,255,255,0.9)",marginBottom:4}}>{event}</div>
                  <div style={{fontSize:13,color:"rgba(255,255,255,0.45)",lineHeight:1.65}}>{desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div style={{height:1,background:"rgba(255,255,255,0.07)",marginBottom:36}}/>

          {/* Values */}
          <div>
            <div style={{fontFamily:"var(--font-d)",fontSize:11,fontWeight:700,color:"var(--orange)",letterSpacing:"2px",textTransform:"uppercase",marginBottom:20}}>Our Values</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              {[
                {icon:"🔥",name:"Passion",desc:"We bring energy and conviction to everything we do for our customers."},
                {icon:"👥",name:"People",desc:"Our team and customers are at the heart of every decision we make."},
                {icon:"⚖️",name:"Principles",desc:"Complete transparency and integrity in all our dealings and services."},
                {icon:"✨",name:"Possibilities",desc:"Technology-driven innovation to create endless new opportunities."},
              ].map(({icon,name,desc})=>(
                <div key={name} style={{background:"rgba(245,136,31,0.05)",border:"1px solid rgba(245,136,31,0.15)",borderRadius:14,padding:"18px 16px"}}>
                  <div style={{fontSize:24,marginBottom:8}}>{icon}</div>
                  <div style={{fontFamily:"var(--font-d)",fontWeight:800,fontSize:13,color:"#F5881F",marginBottom:6}}>{name}</div>
                  <div style={{fontSize:12,color:"rgba(255,255,255,0.45)",lineHeight:1.6}}>{desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── SCREEN 1: LANDING ──────────────────────────────────────────────────── */

// Loan card config — SVG images stored in frontend/public/images/
const LOAN_CARDS = [
  { type:"personal",            img:"/images/personal.svg",    name:"Personal Loan",         badge1:{label:"STARTING AT",value:"9.99%",sub:"p.a."}, badge2:{label:"UPTO",value:"₹30L"},     tag:"PAPERLESS · INSTANT",    col:"#e8610a" },
  { type:"business",            img:"/images/business.svg",   name:"Business Loan",          badge1:{label:"STARTING AT",value:"15%",sub:"p.a."},   badge2:{label:"UPTO",value:"₹50L"},     tag:"QUICK DISBURSAL",         col:"#1565C0" },
  { type:"home",                img:"/images/home.svg",        name:"Home Loan",              badge1:{label:"FROM",value:"9.55%",sub:"p.a."},        badge2:{label:"UPTO",value:"30 Yrs"},   tag:"WOMEN: 8.75%",            col:"#2e7d32" },
  { type:"professional",        img:"/images/professional.svg",name:"Professional Loan",      badge1:{label:"STARTING AT",value:"13%",sub:"p.a."},   badge2:{label:"UPTO",value:"₹75L"},     tag:"CA · DOCTOR · CS",        col:"#6A1B9A" },
  { type:"lap",                 img:"/images/lap.svg",         name:"Loan Against Property",  badge1:{label:"FROM",value:"9%",sub:"p.a."},           badge2:{label:"UPTO",value:"₹10 Cr"},   tag:"HIGH LTV · 15 YRS",       col:"#00695c" },
  { type:"gold",                img:"/images/gold.svg",        name:"Gold Loan",              badge1:{label:"RBI LTV",value:"85%",sub:"≤₹2.5L"},    badge2:{label:"FROM",value:"9.99%"},     tag:"INSTANT DISBURSAL",       col:"#B8860B" },
  { type:"education_domestic",  img:"/images/education.svg",   name:"Education Loan",         badge1:{label:"NO COLLATERAL",value:"≤₹4L"},           badge2:{label:"UPTO",value:"₹20L"},     tag:"DOMESTIC STUDIES",        col:"#1565C0" },
];

const CATEGORY_LABELS_LANDING = {
  salaried:"Salaried",self_employed:"Self-Employed",professional:"Professional",
  student:"Student",entrepreneur:"Entrepreneur",nri:"NRI",
};

function LandingScreen({ onNext, setSessionId }) {
  const [mobile,   setMobile]   = useState("");
  const [email,    setEmail]    = useState("");
  const [otp,      setOtp]      = useState("");
  const [sid,      setSid]      = useState(null);
  const [phase,    setPhase]    = useState("phone");
  const [loading,  setLoading]  = useState(false);
  const [err,      setErr]      = useState("");
  const [showLogin,setShowLogin]= useState(false);
  const [activeCard,setActiveCard]=useState(0);
  const [selectedLoanType,setSelectedLoanType]=useState(null);
  const [mounted,  setMounted]  = useState(false);
  const [savedSession, setSavedSession] = useState(()=>loadSavedProgress());
  const [showRefer,    setShowRefer]    = useState(false);
  const [showCompany,  setShowCompany]  = useState(false);
  const [showLoan,     setShowLoan]     = useState(false);

  useEffect(() => {
    setTimeout(()=>setMounted(true),80);
    const t = setInterval(()=>setActiveCard(a=>(a+1)%LOAN_CARDS.length),3800);
    return ()=>clearInterval(t);
  },[]);

  async function sendOtp() {
    setLoading(true); setErr("");
    const cleaned = mobile.replace(/\D/g,"").replace(/^91/,"");
    if(!email.includes("@")||!email.includes(".")){setErr("Please enter a valid email address");setLoading(false);return;}
    try {
      const r = await fetch(`${API}/session/create`,{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({mobile:cleaned,email:email.trim().toLowerCase(),ip_address:"",gps_lat:0,gps_lng:0})});
      const d = await r.json();
      if(!r.ok) throw new Error(d.detail||"Failed");
      setSid(d.session_id); setPhase("otp");
    } catch(e){setErr(e.message);}
    setLoading(false);
  }

  async function verifyOtp() {
    setLoading(true); setErr("");
    try {
      const r = await fetch(`${API}/session/verify-otp`,{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({session_id:sid,otp})});
      const d = await r.json();
      if(!r.ok) throw new Error(d.detail||"Invalid OTP");
      setSessionId(sid); onNext(selectedLoanType);
    } catch(e){setErr(e.message);}
    setLoading(false);
  }

  function selectCard(i) {
    setActiveCard(i);
    setSelectedLoanType(LOAN_CARDS[i].type);
    setTimeout(()=>window.scrollTo({top:0,behavior:"smooth"}),150);
  }

  const ac = LOAN_CARDS[activeCard];

  return (
    <div style={{minHeight:"100vh",background:"#fff",display:"flex",flexDirection:"column",fontFamily:"var(--font-b)"}}>
      {showCompany && <CompanyPage onClose={()=>setShowCompany(false)}/>}
      {showRefer && <ReferAndEarnPage onClose={()=>setShowRefer(false)}/>}
      {showLoan && <LoanPage onClose={()=>setShowLoan(false)}/>}
      {showLogin && <LoginModal onClose={()=>setShowLogin(false)}/>}

      {/* ══ NAVBAR ══════════════════════════════════════════════════════════ */}
      <nav style={{position:"sticky",top:0,zIndex:100,background:"#fff",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 48px",height:66,boxShadow:"0 2px 16px rgba(27,42,107,0.07)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <img src="/poonawalla-logo.jpg" alt="P" style={{height:38,width:"auto",objectFit:"contain"}} onError={e=>{e.target.style.display="none";}}/>
          <div><div style={{fontFamily:"var(--font-d)",fontWeight:900,fontSize:13,color:"var(--navy)",letterSpacing:"0.5px"}}>POONAWALLA</div><div style={{fontFamily:"var(--font-d)",fontWeight:600,fontSize:9,color:"var(--t3)",letterSpacing:"2px"}}>FINCORP</div></div>
        </div>
        <div style={{display:"flex",gap:32,alignItems:"center"}}>
          {[{l:"LOAN",fn:()=>setShowLoan(true)},{l:"COMPANY",fn:()=>setShowCompany(true)},{l:"REFER & EARN",fn:()=>setShowRefer(true)}].map(({l,fn})=>(
            <span key={l} onClick={fn||undefined} style={{fontSize:12,fontFamily:"var(--font-d)",fontWeight:700,color:"var(--t1)",cursor:"pointer",letterSpacing:"0.3px",transition:"color 0.2s"}}
              onMouseEnter={e=>e.target.style.color="var(--navy)"} onMouseLeave={e=>e.target.style.color="var(--t1)"}>{l}</span>
          ))}
        </div>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <span style={{fontSize:12,fontFamily:"var(--font-d)",fontWeight:700,color:"var(--t1)",cursor:"pointer"}} onClick={()=>setShowLogin(true)}>LOGIN</span>
          <button className="btn btn-ghost" onClick={()=>setShowLogin(true)} style={{fontSize:12,fontFamily:"var(--font-d)",fontWeight:700,padding:"8px 16px",borderRadius:8}}>QUICK PAY</button>
          <button className="btn btn-primary" onClick={()=>window.scrollTo({top:0,behavior:"smooth"})} style={{fontSize:12,fontFamily:"var(--font-d)",fontWeight:800,padding:"9px 20px",borderRadius:8}}>APPLY NOW</button>
        </div>
      </nav>

      {/* ══ HERO ═════════════════════════════════════════════════════════════ */}
      <div style={{background:"#080d2e",minHeight:"92vh",position:"relative",overflow:"hidden",display:"flex",flexDirection:"column",justifyContent:"flex-start"}}>
        {/* ── Stripe-style animated mesh gradient blobs ── */}
        {/* Blob 1: vivid purple — top-left */}
        <div style={{position:"absolute",top:"-10%",left:"-5%",width:700,height:700,borderRadius:"50%",
          background:"radial-gradient(circle,rgba(124,58,237,0.75) 0%,rgba(99,40,200,0.4) 40%,transparent 70%)",
          filter:"blur(80px)",animation:"blob1 14s ease-in-out infinite",pointerEvents:"none"}}/>
        {/* Blob 2: electric blue — top-right */}
        <div style={{position:"absolute",top:"-15%",right:"-8%",width:750,height:750,borderRadius:"50%",
          background:"radial-gradient(circle,rgba(0,150,255,0.65) 0%,rgba(0,80,220,0.35) 40%,transparent 70%)",
          filter:"blur(90px)",animation:"blob2 17s ease-in-out infinite",pointerEvents:"none"}}/>
        {/* Blob 3: hot magenta/pink — centre */}
        <div style={{position:"absolute",top:"25%",left:"30%",width:600,height:600,borderRadius:"50%",
          background:"radial-gradient(circle,rgba(220,40,180,0.45) 0%,rgba(160,20,120,0.22) 45%,transparent 70%)",
          filter:"blur(100px)",animation:"blob3 19s ease-in-out infinite",pointerEvents:"none"}}/>
        {/* Blob 4: warm amber/orange — bottom-left */}
        <div style={{position:"absolute",bottom:"-10%",left:"5%",width:580,height:580,borderRadius:"50%",
          background:"radial-gradient(circle,rgba(245,136,31,0.55) 0%,rgba(200,80,0,0.28) 45%,transparent 70%)",
          filter:"blur(85px)",animation:"blob4 15s ease-in-out infinite",pointerEvents:"none"}}/>
        {/* Blob 5: teal — bottom-right */}
        <div style={{position:"absolute",bottom:"0%",right:"-5%",width:550,height:550,borderRadius:"50%",
          background:"radial-gradient(circle,rgba(0,220,180,0.40) 0%,rgba(0,160,140,0.18) 45%,transparent 70%)",
          filter:"blur(80px)",animation:"blob1 21s ease-in-out infinite reverse",pointerEvents:"none"}}/>
        {/* Noise texture overlay for Stripe-like grain feel */}
        <div style={{position:"absolute",inset:0,backgroundImage:"url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")",opacity:0.5,pointerEvents:"none"}}/>
        {/* Very subtle dot grid */}
        <div style={{position:"absolute",inset:0,backgroundImage:"radial-gradient(rgba(255,255,255,0.06) 1px,transparent 1px)",backgroundSize:"36px 36px",pointerEvents:"none"}}/>
        {/* Dark vignette edges to keep text readable */}
        <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse at center,transparent 40%,rgba(5,8,30,0.6) 100%)",pointerEvents:"none"}}/>

        <div style={{maxWidth:1200,margin:"0 auto",padding:"70px 48px 80px",width:"100%",display:"grid",gridTemplateColumns:"1fr 1fr",gap:80,alignItems:"flex-start",position:"relative",zIndex:5}}>

          {/* LEFT: Headline + form */}
          <div>
            <div className={mounted?"fu":""} style={{opacity:mounted?undefined:0,animationDelay:"0.1s"}}>
              <span style={{background:"rgba(245,136,31,0.2)",border:"1px solid rgba(245,136,31,0.4)",color:"#F5881F",borderRadius:20,padding:"5px 16px",fontSize:11,fontFamily:"var(--font-d)",fontWeight:700,letterSpacing:"0.5px",display:"inline-block",marginBottom:22}}>
                More Than Loans — We Back Your Ambition
              </span>
            </div>

            {/* Resume saved application */}
            {savedSession && (
              <div className={mounted?"fu":""} style={{opacity:mounted?undefined:0,animationDelay:"0.15s",marginBottom:18}}>
                <div style={{background:"rgba(0,166,81,0.12)",border:"1.5px solid rgba(0,166,81,0.35)",borderRadius:14,padding:"14px 18px",display:"flex",alignItems:"center",gap:14,maxWidth:440}}>
                  <span style={{fontSize:24,flexShrink:0}}>📋</span>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:"var(--font-d)",fontWeight:700,fontSize:13,color:"rgba(255,255,255,0.9)",marginBottom:3}}>
                      You have a saved application
                    </div>
                    <div style={{fontSize:11,color:"rgba(255,255,255,0.55)"}}>
                      {(savedSession.loan_type||"").replace(/_/g," ")} · Saved {new Date(savedSession.saved_at).toLocaleDateString("en-IN")}
                    </div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    <button onClick={()=>{ setSessionId(savedSession.session_id); onNext(savedSession.loan_type); }}
                      style={{background:"#00A651",color:"#fff",border:"none",borderRadius:8,padding:"7px 14px",fontSize:11,fontFamily:"var(--font-d)",fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>
                      Resume →
                    </button>
                    <button onClick={()=>{clearSavedProgress();setSavedSession(null);}}
                      style={{background:"transparent",color:"rgba(255,255,255,0.45)",border:"none",fontSize:10,cursor:"pointer",textDecoration:"underline"}}>
                      Start fresh
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className={mounted?"fu":""} style={{opacity:mounted?undefined:0,animationDelay:"0.2s"}}>
              <div style={{fontFamily:"var(--font-d)",fontSize:13,color:"rgba(255,255,255,0.45)",letterSpacing:"5px",textTransform:"uppercase",marginBottom:12}}>Enabling Dreams</div>
              <h1 style={{fontFamily:"var(--font-d)",fontSize:"clamp(30px,3vw,48px)",fontWeight:900,lineHeight:1.08,color:"#fff",letterSpacing:"-1px",marginBottom:20}}>
                Your trusted partner<br/>
                <span style={{background:"linear-gradient(90deg,#F5881F,#FFB347)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>for every dream</span>
              </h1>
              <p style={{fontSize:15,color:"rgba(255,255,255,0.62)",lineHeight:1.8,maxWidth:420,marginBottom:32}}>
                100% digital loan onboarding in under 5 minutes. AI-powered Video KYC, instant income assessment, personalised offer — no branch visits, no paperwork.
              </p>
            </div>

            {/* Brand pillars compact row */}
            <div className={mounted?"fu":""} style={{opacity:mounted?undefined:0,animationDelay:"0.3s",display:"flex",gap:10,flexWrap:"wrap",marginBottom:32}}>
              {[{e:"📱","t":"Digital Credit"},{e:"💎","t":"Elite Capital"},{e:"🔭","t":"Vision Funded"},{e:"⏳","t":"Timeless Prosperity"}].map(p=>(
                <div key={p.t} style={{display:"flex",alignItems:"center",gap:6,background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:20,padding:"6px 14px"}}>
                  <span style={{fontSize:13}}>{p.e}</span>
                  <span style={{fontSize:11,fontFamily:"var(--font-d)",fontWeight:600,color:"rgba(255,255,255,0.82)"}}>{p.t}</span>
                </div>
              ))}
            </div>

            {/* Auth form */}
            <div id="hero-form" className={mounted?"fu":""} style={{opacity:mounted?undefined:0,animationDelay:"0.45s",background:"rgba(255,255,255,0.07)",border:"1.5px solid rgba(255,255,255,0.13)",borderRadius:18,padding:"26px 28px",backdropFilter:"blur(20px)",maxWidth:440}}>
              {selectedLoanType && (
                <div style={{marginBottom:14,display:"flex",alignItems:"center",gap:8}}>
                  <span style={{background:"rgba(245,136,31,0.2)",border:"1px solid rgba(245,136,31,0.5)",color:"#F5881F",borderRadius:8,padding:"4px 12px",fontSize:11,fontFamily:"var(--font-d)",fontWeight:700}}>
                    ✓ {LOAN_CARDS.find(c=>c.type===selectedLoanType)?.name} selected
                  </span>
                  <button onClick={()=>setSelectedLoanType(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:14,color:"rgba(255,255,255,0.35)"}}>✕</button>
                </div>
              )}

              {phase==="phone" ? (<>
                <div style={{fontSize:14,fontFamily:"var(--font-d)",fontWeight:700,color:"rgba(255,255,255,0.9)",marginBottom:18}}>
                  {selectedLoanType ? `Apply for ${LOAN_CARDS.find(c=>c.type===selectedLoanType)?.name}` : "Start your loan application"}
                </div>
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",marginBottom:6,fontFamily:"var(--font-m)",letterSpacing:"0.5px",textTransform:"uppercase"}}>Mobile Number</div>
                  <input type="tel" placeholder="+91 98765 43210" value={mobile} onChange={e=>setMobile(e.target.value)}
                    style={{background:"rgba(255,255,255,0.09)",border:"1.5px solid rgba(255,255,255,0.15)",color:"#fff",borderRadius:10,padding:"12px 16px",width:"100%"}}/>
                </div>
                <div style={{marginBottom:18}}>
                  <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",marginBottom:6,fontFamily:"var(--font-m)",letterSpacing:"0.5px",textTransform:"uppercase"}}>Email <span style={{opacity:0.5,textTransform:"none",fontSize:9}}>(registered with Aadhaar)</span></div>
                  <input type="email" placeholder="yourname@email.com" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendOtp()}
                    style={{background:"rgba(255,255,255,0.09)",border:"1.5px solid rgba(255,255,255,0.15)",color:"#fff",borderRadius:10,padding:"12px 16px",width:"100%"}}/>
                </div>
                <button className="btn btn-full btn-lg" onClick={sendOtp} disabled={loading||mobile.replace(/\D/g,"").length<10||!email.includes("@")}
                  style={{background:"linear-gradient(135deg,#F5881F,#e07010)",color:"#fff",border:"none",boxShadow:"0 4px 20px rgba(245,136,31,0.35)",fontFamily:"var(--font-d)",fontWeight:800,borderRadius:10}}>
                  {loading?<><span className="spinner-inline"/>Initialising…</>:"Begin Video Onboarding →"}
                </button>
              </>) : (<>
                <p style={{color:"rgba(255,255,255,0.72)",fontSize:13,marginBottom:16,lineHeight:1.6}}>
                  OTP sent to <strong style={{color:"#fff"}}>{email}</strong>

                </p>
                <input type="text" placeholder="6-digit OTP" maxLength={6} value={otp} onChange={e=>setOtp(e.target.value)} onKeyDown={e=>e.key==="Enter"&&verifyOtp()}
                  style={{background:"rgba(255,255,255,0.09)",border:"1.5px solid rgba(255,255,255,0.15)",color:"#fff",borderRadius:10,padding:"14px 16px",width:"100%",letterSpacing:"10px",fontSize:24,textAlign:"center",fontFamily:"var(--font-m)",marginBottom:14}}/>
                <div style={{display:"flex",gap:10}}>
                  <button className="btn btn-ghost" onClick={()=>{setPhase("phone");setErr("");}} style={{flex:1,color:"rgba(255,255,255,0.7)",borderColor:"rgba(255,255,255,0.2)"}}>← Back</button>
                  <button className="btn btn-full" onClick={verifyOtp} disabled={loading||otp.length<4}
                    style={{flex:2,background:"linear-gradient(135deg,#F5881F,#e07010)",color:"#fff",border:"none",fontFamily:"var(--font-d)",fontWeight:800,borderRadius:10}}>
                    {loading?<><span className="spinner-inline"/>Verifying…</>:"Verify & Start →"}
                  </button>
                </div>
              </>)}
              {err&&<div style={{marginTop:10,background:"rgba(211,47,47,0.2)",border:"1px solid rgba(211,47,47,0.4)",borderRadius:8,padding:"8px 12px",color:"#ff8a8a",fontSize:12}}>⚠ {err}</div>}
            </div>
          </div>

          {/* RIGHT: Loan card carousel */}
          <div className={mounted?"fu":""} style={{opacity:mounted?undefined:0,animationDelay:"0.5s"}}>
            <div style={{textAlign:"center",marginBottom:28}}>
              <div style={{fontSize:11,fontFamily:"var(--font-d)",fontWeight:700,color:"rgba(255,255,255,0.4)",letterSpacing:"2px",marginBottom:8,textTransform:"uppercase"}}>Apna Walla Poonawalla</div>
              <div style={{fontSize:13,color:"rgba(255,255,255,0.55)"}}>Together We Grow</div>
            </div>

            {/* ── Poonawalla-style card carousel ── */}
            <div style={{position:"relative",height:420,width:"100%",paddingLeft:50,paddingRight:50,boxSizing:"content-box",marginLeft:-50}}>
              {LOAN_CARDS.map((c,i)=>{
                const offset=(i-activeCard+LOAN_CARDS.length)%LOAN_CARDS.length;
                const isA=offset===0, isN=offset===1, isP=offset===LOAN_CARDS.length-1;
                const xf=isA?"translateX(0) scale(1)":isN?"translateX(46%) scale(0.82)":isP?"translateX(-46%) scale(0.82)":"scale(0.68)";
                const op=isA?1:(isN||isP)?0.35:0;
                return (
                  /* Outer wrapper: overflow visible so circles can straddle the card top edge */
                  <div key={i} onClick={()=>selectCard(i)} style={{
                    position:"absolute",top:0,left:"50%",marginLeft:-155,width:310,height:400,
                    borderRadius:20,overflow:"visible",cursor:"pointer",
                    transition:"all 0.55s cubic-bezier(0.4,0,0.2,1)",
                    transform:xf,opacity:op,zIndex:isA?3:(isN||isP)?2:1,
                  }}>
                    {/* ── Circular metric badges: straddling the LEFT and RIGHT card edges ── */}
                    {/* Left circle: half outside left edge, vertically centred ~upper third */}
                    <div style={{position:"absolute",top:120,left:-42,zIndex:5,
                      width:90,height:90,borderRadius:"50%",
                      background:"rgba(30,60,140,0.82)",backdropFilter:"blur(16px)",
                      border:"1.5px solid rgba(255,255,255,0.3)",
                      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
                      boxShadow:"0 6px 24px rgba(0,0,0,0.45)"}}>
                      <div style={{fontSize:8,color:"rgba(255,255,255,0.75)",fontFamily:"var(--font-d)",fontWeight:700,letterSpacing:"0.3px",textAlign:"center",padding:"0 6px"}}>{c.badge1.label}</div>
                      <div style={{fontSize:c.badge1.value.length>5?14:18,color:"#fff",fontFamily:"var(--font-d)",fontWeight:900,lineHeight:1.1,textAlign:"center"}}>{c.badge1.value}</div>
                      {c.badge1.sub&&<div style={{fontSize:7.5,color:"rgba(255,255,255,0.65)",marginTop:1}}>{c.badge1.sub}</div>}
                    </div>
                    {/* Right circle: half outside right edge, slightly higher */}
                    <div style={{position:"absolute",top:90,right:-50,zIndex:5,
                      width:104,height:104,borderRadius:"50%",
                      background:"rgba(30,60,140,0.75)",backdropFilter:"blur(16px)",
                      border:"1.5px solid rgba(255,255,255,0.25)",
                      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
                      boxShadow:"0 6px 24px rgba(0,0,0,0.45)"}}>
                      <div style={{fontSize:8,color:"rgba(255,255,255,0.7)",fontFamily:"var(--font-d)",fontWeight:700,letterSpacing:"0.3px",textAlign:"center",padding:"0 8px"}}>{c.badge2.label}</div>
                      <div style={{fontSize:c.badge2.value.length>5?14:19,color:"#fff",fontFamily:"var(--font-d)",fontWeight:900,lineHeight:1.1,textAlign:"center"}}>{c.badge2.value}</div>
                      {c.badge2.sub&&<div style={{fontSize:7.5,color:"rgba(255,255,255,0.65)",marginTop:1}}>{c.badge2.sub}</div>}
                    </div>

                    {/* Inner card: overflow hidden for image clipping + shadow */}
                    <div style={{position:"absolute",inset:0,borderRadius:20,overflow:"hidden",
                      boxShadow:isA?"0 32px 80px rgba(0,0,0,0.45),0 8px 24px rgba(0,0,0,0.3)":"0 4px 16px rgba(0,0,0,0.2)"}}>
                      {/* Full-card image background */}
                      <div style={{position:"absolute",inset:0,background:"#000"}}>
                        <img src={c.img} alt={c.name} style={{width:"100%",height:"100%",objectFit:"cover",opacity:0.92}}
                          onError={e=>{e.target.style.display="none";}}/>
                      </div>
                      {/* Gradient overlay - bottom darkens for text readability */}
                      <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,rgba(0,0,0,0.08) 0%,rgba(0,0,0,0.15) 45%,rgba(0,0,0,0.82) 100%)"}}/>

                      {/* ── Bottom panel ── */}
                      <div style={{position:"absolute",bottom:0,left:0,right:0,zIndex:3,
                        background:"linear-gradient(135deg,rgba(15,25,90,0.88) 0%,rgba(30,10,70,0.80) 50%,rgba(60,20,10,0.82) 100%)",
                        backdropFilter:"blur(20px)",
                        borderTop:"1px solid rgba(255,255,255,0.18)",
                        boxShadow:"0 -8px 32px rgba(0,0,0,0.3)",
                        padding:"18px 20px 20px"}}>
                        <div style={{fontSize:20,fontFamily:"var(--font-d)",fontWeight:900,color:"#fff",marginBottom:10,lineHeight:1.2,letterSpacing:"-0.3px"}}>{c.name}</div>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <div style={{background:"rgba(255,255,255,0.2)",borderRadius:20,padding:"4px 12px",fontSize:9.5,color:"rgba(255,255,255,0.95)",fontFamily:"var(--font-d)",fontWeight:700,letterSpacing:"0.8px"}}>{c.tag}</div>
                          {isA&&<div style={{fontSize:12,color:"rgba(255,255,255,0.8)",fontFamily:"var(--font-d)",fontWeight:700,display:"flex",alignItems:"center",gap:4}}>Apply <span style={{fontSize:16}}>→</span></div>}
                        </div>
                      </div>

                      {/* Selected highlight ring */}
                      {isA&&selectedLoanType===c.type&&<div style={{position:"absolute",inset:0,borderRadius:20,border:"3px solid #F5881F",zIndex:4,pointerEvents:"none"}}/>}
                    </div>
                  </div>
                );
              })}
              {/* Dots */}
              <div style={{position:"absolute",bottom:-24,left:"50%",transform:"translateX(-50%)",display:"flex",gap:6}}>
                {LOAN_CARDS.map((_,i)=><div key={i} onClick={()=>selectCard(i)} style={{width:i===activeCard?28:6,height:6,borderRadius:3,background:i===activeCard?"linear-gradient(90deg,#f97316,#ec4899,#8b5cf6)":"rgba(255,255,255,0.3)",cursor:"pointer",transition:"all 0.3s",boxShadow:i===activeCard?"0 0 10px rgba(249,115,22,0.7),0 0 20px rgba(236,72,153,0.4)":undefined}}/>)}
              </div>
            </div>

            {/* Tagline below carousel */}
            <div style={{marginTop:48,textAlign:"center",padding:"0 24px"}}>
              <p style={{fontFamily:"var(--font-d)",fontSize:13,fontWeight:600,color:"rgba(255,255,255,0.55)",lineHeight:1.8,fontStyle:"italic",letterSpacing:"0.3px"}}>
                A legacy woven in trust so rare,<br/>
                Poonawalla Fincorp moves with timeless care.
              </p>
            </div>

          </div>
        </div>
      </div>

      {/* ══ STATS STRIP ══════════════════════════════════════════════════════ */}
      <div style={{background:"linear-gradient(90deg,#06082a 0%,#0d1560 40%,#0a1a70 60%,#06082a 100%)",padding:"26px 48px",display:"flex",justifyContent:"space-around",flexWrap:"wrap",gap:16,position:"relative",overflow:"hidden"}}>
        {/* Glowing top border */}
        <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:"linear-gradient(90deg,rgba(124,58,237,0.8),rgba(0,150,255,0.9),rgba(220,40,180,0.7),rgba(245,136,31,0.9),rgba(0,220,180,0.8))"}}/>
        {/* Ambient glow behind content */}
        <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:800,height:200,borderRadius:"50%",background:"radial-gradient(ellipse,rgba(0,100,255,0.12),transparent)",pointerEvents:"none"}}/>
        {[
          {v:"< 5 min", l:"Onboarding time",     accent:"#818cf8", bg:"rgba(129,140,248,0.12)", border:"rgba(129,140,248,0.35)"},
          {v:"₹30L+",   l:"Max personal loan",   accent:"#fb923c", bg:"rgba(251,146,60,0.12)",  border:"rgba(251,146,60,0.35)"},
          {v:"0 forms", l:"Manual paperwork",    accent:"#34d399", bg:"rgba(52,211,153,0.12)",  border:"rgba(52,211,153,0.35)"},
          {v:"100%",    l:"Digital & paperless",  accent:"#f472b6", bg:"rgba(244,114,182,0.12)", border:"rgba(244,114,182,0.35)"},
          {v:"RBI Reg", l:"NBFC N-13.02468",     accent:"#38bdf8", bg:"rgba(56,189,248,0.12)",  border:"rgba(56,189,248,0.35)"},
        ].map(({v,l,accent,bg,border},i)=>(
          <div key={i} style={{textAlign:"center",background:bg,borderRadius:16,padding:"16px 30px",border:`1.5px solid ${border}`,minWidth:130,position:"relative",zIndex:1,backdropFilter:"blur(10px)"}}>
            <div style={{fontFamily:"var(--font-d)",fontSize:22,fontWeight:900,color:accent,letterSpacing:"-0.5px",textShadow:`0 0 24px ${accent}88`}}>{v}</div>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.55)",marginTop:4,letterSpacing:"0.8px",textTransform:"uppercase"}}>{l}</div>
          </div>
        ))}
      </div>

      {/* ══ LOAN CATEGORIES STRIP ═══════════════════════════════════════════ */}
      <div style={{background:"#fff",display:"flex",borderBottom:"1px solid var(--border)"}}>
        {[{l:"Personal",t:"personal"},{l:"Business",t:"business"},{l:"Professional",t:"professional"},{l:"Home",t:"home"},{l:"Gold",t:"gold"},{l:"Education",t:"education_domestic"}].map((cat,i)=>(
          <div key={i} onClick={()=>{setSelectedLoanType(cat.t);setActiveCard(LOAN_CARDS.findIndex(c=>c.type===cat.t));window.scrollTo({top:0,behavior:"smooth"});}}
            style={{flex:1,padding:"16px 12px",textAlign:"center",borderRight:i<5?"1px solid var(--border)":"none",cursor:"pointer",transition:"all 0.2s",position:"relative"}}
            onMouseEnter={e=>{e.currentTarget.style.background="var(--sky-light)";e.currentTarget.querySelector("._ul").style.width="80%";}}
            onMouseLeave={e=>{e.currentTarget.style.background="";e.currentTarget.querySelector("._ul").style.width="0%";}}>
            <div style={{fontFamily:"var(--font-d)",fontWeight:700,fontSize:13,color:"var(--navy)"}}>{cat.l}</div>
            <div style={{fontSize:10,color:"var(--t3)",marginTop:2}}>Loans</div>
            <div className="_ul" style={{position:"absolute",bottom:0,left:"10%",height:2,width:"0%",background:"var(--sky)",borderRadius:2,transition:"width 0.3s"}}/>
          </div>
        ))}
      </div>

      {/* ══ 4 PILLARS SECTION ═══════════════════════════════════════════════ */}
      <div style={{background:"linear-gradient(160deg,#f0f4ff 0%,#EEF1FA 50%,#e8eeff 100%)",padding:"80px 48px"}}>
        <div style={{maxWidth:1100,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:56}}>
            <div style={{fontFamily:"var(--font-d)",fontSize:12,fontWeight:700,color:"var(--t3)",letterSpacing:"3px",textTransform:"uppercase",marginBottom:12}}>Our Foundation</div>
            <h2 style={{fontFamily:"var(--font-d)",fontSize:"clamp(26px,3vw,40px)",fontWeight:900,color:"var(--navy)",letterSpacing:"-0.5px",marginBottom:12}}>The Four Pillars of Poonawalla Fincorp</h2>
            <p style={{color:"var(--t2)",fontSize:15,maxWidth:520,margin:"0 auto",lineHeight:1.7}}>Built on Passion, People, Principles & Possibilities — driving accessible lending for every Indian.</p>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:24}}>
            {/* Pillar 1 - Enabling Dreams */}
            <div style={{background:"linear-gradient(135deg,#1B2A6B,#0d1d55)",borderRadius:24,padding:"40px 36px",position:"relative",overflow:"hidden",minHeight:280}}>
              <div style={{position:"absolute",top:"-30%",right:"-20%",width:300,height:300,borderRadius:"50%",background:"radial-gradient(circle,rgba(245,136,31,0.2),transparent)",pointerEvents:"none"}}/>
              <div style={{position:"relative",zIndex:2}}>
                <div style={{fontSize:48,marginBottom:18}}>🌟</div>
                <div style={{fontFamily:"var(--font-d)",fontSize:22,fontWeight:900,color:"#fff",marginBottom:10}}>Enabling Dreams</div>
                <p style={{color:"rgba(255,255,255,0.68)",fontSize:14,lineHeight:1.75,marginBottom:20}}>Turning consumer and MSME aspirations into reality through accessible, fast, collateral-free lending. Our promise: "Apna Walla Poonawalla" — finance that feels personal.</p>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {["Personal Loans","Business Growth","Education","Home Ownership"].map(t=>(
                    <span key={t} style={{background:"rgba(245,136,31,0.2)",border:"1px solid rgba(245,136,31,0.35)",color:"#F5881F",borderRadius:20,padding:"4px 12px",fontSize:10,fontFamily:"var(--font-d)",fontWeight:700}}>{t}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Pillar 2 - Digital First */}
            <div style={{background:"linear-gradient(135deg,#006064,#00363a)",borderRadius:24,padding:"40px 36px",position:"relative",overflow:"hidden",minHeight:280}}>
              <div style={{position:"absolute",top:"-20%",right:"-15%",width:250,height:250,borderRadius:"50%",background:"radial-gradient(circle,rgba(0,188,212,0.25),transparent)",pointerEvents:"none"}}/>
              <div style={{position:"relative",zIndex:2}}>
                <div style={{fontSize:48,marginBottom:18}}>📱</div>
                <div style={{fontFamily:"var(--font-d)",fontSize:22,fontWeight:900,color:"#fff",marginBottom:10}}>Digital-First & Phygital</div>
                <p style={{color:"rgba(255,255,255,0.68)",fontSize:14,lineHeight:1.75,marginBottom:20}}>100% paperless onboarding with AI-powered Video KYC. Our "phygital" strategy merges digital speed with human touch — faster than any traditional lender.</p>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {["Video KYC","AI Assessment","5-Min Approval","No Branch Visits"].map(t=>(
                    <span key={t} style={{background:"rgba(0,188,212,0.2)",border:"1px solid rgba(0,188,212,0.35)",color:"#00BCD4",borderRadius:20,padding:"4px 12px",fontSize:10,fontFamily:"var(--font-d)",fontWeight:700}}>{t}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Pillar 3 - LEAP Culture */}
            <div style={{background:"linear-gradient(135deg,#4A0072,#1a0030)",borderRadius:24,padding:"40px 36px",position:"relative",overflow:"hidden",minHeight:280}}>
              <div style={{position:"absolute",top:"-20%",right:"-15%",width:250,height:250,borderRadius:"50%",background:"radial-gradient(circle,rgba(142,68,173,0.25),transparent)",pointerEvents:"none"}}/>
              <div style={{position:"relative",zIndex:2}}>
                <div style={{fontSize:48,marginBottom:18}}>🚀</div>
                <div style={{fontFamily:"var(--font-d)",fontSize:22,fontWeight:900,color:"#fff",marginBottom:10}}>LEAP Culture</div>
                <p style={{color:"rgba(255,255,255,0.68)",fontSize:14,lineHeight:1.75,marginBottom:20}}>Our people thrive on <strong style={{color:"rgba(255,255,255,0.9)"}}>L</strong>earn → <strong style={{color:"rgba(255,255,255,0.9)"}}>E</strong>volve → <strong style={{color:"rgba(255,255,255,0.9)"}}>A</strong>ct → <strong style={{color:"rgba(255,255,255,0.9)"}}>P</strong>ropel. A high-performance, growth-oriented culture that powers exceptional service for every customer.</p>
                <div style={{display:"flex",gap:10}}>
                  {[{l:"Learn",c:"#9C27B0"},{l:"Evolve",c:"#7B1FA2"},{l:"Act",c:"#6A1B9A"},{l:"Propel",c:"#4A148C"}].map(({l,c})=>(
                    <div key={l} style={{flex:1,background:`${c}44`,border:`1px solid ${c}88`,borderRadius:10,padding:"8px 0",textAlign:"center"}}>
                      <div style={{fontFamily:"var(--font-d)",fontWeight:900,fontSize:14,color:"#fff"}}>{l}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Pillar 4 - Sustainable Growth */}
            <div style={{background:"linear-gradient(135deg,#1b5e20,#0a3b0d)",borderRadius:24,padding:"40px 36px",position:"relative",overflow:"hidden",minHeight:280}}>
              <div style={{position:"absolute",top:"-20%",right:"-15%",width:250,height:250,borderRadius:"50%",background:"radial-gradient(circle,rgba(76,175,80,0.2),transparent)",pointerEvents:"none"}}/>
              <div style={{position:"relative",zIndex:2}}>
                <div style={{fontSize:48,marginBottom:18}}>📊</div>
                <div style={{fontFamily:"var(--font-d)",fontSize:22,fontWeight:900,color:"#fff",marginBottom:10}}>Sustainable Growth</div>
                <p style={{color:"rgba(255,255,255,0.68)",fontSize:14,lineHeight:1.75,marginBottom:20}}>Built on the 4 P's: <strong style={{color:"rgba(255,255,255,0.9)"}}>Passion</strong>, <strong style={{color:"rgba(255,255,255,0.9)"}}>People</strong>, <strong style={{color:"rgba(255,255,255,0.9)"}}>Principles</strong> & <strong style={{color:"rgba(255,255,255,0.9)"}}>Possibilities</strong>. Predictable, productive, AI-driven growth that benefits customers and communities alike.</p>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {["AI Risk Management","RBI Compliant","DPDP 2023","Transparent Pricing"].map(t=>(
                    <span key={t} style={{background:"rgba(76,175,80,0.2)",border:"1px solid rgba(76,175,80,0.35)",color:"#81C784",borderRadius:20,padding:"4px 12px",fontSize:10,fontFamily:"var(--font-d)",fontWeight:700}}>{t}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══ FEATURES STRIP ══════════════════════════════════════════════════ */}
      <div style={{background:"#fff",padding:"60px 48px"}}>
        <div style={{maxWidth:1100,margin:"0 auto",textAlign:"center"}}>
          <h2 style={{fontFamily:"var(--font-d)",fontSize:"clamp(22px,2.5vw,34px)",fontWeight:900,color:"var(--navy)",marginBottom:10,letterSpacing:"-0.3px"}}>Why choose our Video Onboarding?</h2>
          <p style={{color:"var(--t2)",fontSize:14,marginBottom:44,maxWidth:480,margin:"0 auto 44px"}}>Next-generation AI platform — designed for Bharat</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:20}}>
            {[{icon:"🎥",t:"Video KYC",b:"RBI V-CIP compliant. Verify from home in minutes."},{icon:"🤖",t:"AI Assessment",b:"Real-time income & risk evaluation from your conversation."},{icon:"⚡",t:"5-Minute Decision",b:"From identity verification to personalised loan offer."},{icon:"🔒",t:"Bank-Grade Security",b:"End-to-end encrypted. DPDP Act 2023 compliant."}].map(f=>(
              <div key={f.t} style={{background:"var(--bg)",borderRadius:16,padding:"28px 20px",border:"1px solid var(--border)",transition:"transform 0.2s,box-shadow 0.2s"}}
                onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-4px)";e.currentTarget.style.boxShadow="var(--shadow-lg)";}}
                onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="";}}>
                <div style={{fontSize:36,marginBottom:14}}>{f.icon}</div>
                <div style={{fontFamily:"var(--font-d)",fontWeight:800,fontSize:15,color:"var(--navy)",marginBottom:8}}>{f.t}</div>
                <div style={{fontSize:13,color:"var(--t2)",lineHeight:1.6}}>{f.b}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ EMI CALCULATOR ════════════════════════════════════════════════════ */}
      <div style={{background:"var(--navy)",padding:"60px 48px"}}>
        <div style={{maxWidth:900,margin:"0 auto",display:"grid",gridTemplateColumns:"1fr 1fr",gap:60,alignItems:"center"}}>
          <div>
            <div style={{fontFamily:"var(--font-d)",fontSize:12,fontWeight:700,color:"rgba(255,255,255,0.4)",letterSpacing:"3px",textTransform:"uppercase",marginBottom:10}}>Plan Ahead</div>
            <h2 style={{fontFamily:"var(--font-d)",fontSize:"clamp(22px,2.5vw,34px)",fontWeight:900,color:"#fff",marginBottom:14,letterSpacing:"-0.3px"}}>Calculate Your EMI</h2>
            <p style={{color:"rgba(255,255,255,0.6)",fontSize:14,lineHeight:1.75,marginBottom:24}}>Adjust sliders to find the perfect loan amount, rate, and tenure for your budget. Your offer is personalised during the video call.</p>
            <button className="btn btn-full" onClick={()=>window.scrollTo({top:0,behavior:"smooth"})}
              style={{background:"linear-gradient(135deg,#F5881F,#e07010)",color:"#fff",border:"none",fontFamily:"var(--font-d)",fontWeight:800,borderRadius:10,maxWidth:240}}>
              Apply Now →
            </button>
          </div>
          <EmiCalculator/>
        </div>
      </div>

      <footer style={{textAlign:"center",padding:"16px",borderTop:"1px solid var(--border)",background:"var(--bg)"}}>
        <span style={{color:"var(--t3)",fontSize:11,fontFamily:"var(--font-m)"}}>🔒 End-to-end encrypted · RBI V-CIP Compliant · DPDP Act 2023 · Data retained 5 years per RBI norms</span>
      </footer>
    </div>
  );
}


/* ─── SCREEN 1: LOAN TYPE + APPLICANT CATEGORY SELECTOR ─────────────────── */
const LOAN_PRODUCT_CONFIG = {
  personal:               { label:"Personal Loan",           icon:"💼", category_options:["salaried","self_employed"] },
  instant_personal:       { label:"Instant Personal Loan",   icon:"⚡", category_options:["salaried"] },
  business:               { label:"Business Loan",           icon:"🏢", category_options:["self_employed","entrepreneur"] },
  professional:           { label:"Professional Loan",       icon:"🎓", category_options:["professional"] },
  home:                   { label:"Home Loan",               icon:"🏠", category_options:["salaried","self_employed","nri"] },
  education_domestic:     { label:"Education Loan (India)",  icon:"📚", category_options:["student"] },
  education_international:{ label:"Education Loan (Abroad)", icon:"✈️", category_options:["student"] },
  lap:                    { label:"Loan Against Property",   icon:"🏗️", category_options:["salaried","self_employed","entrepreneur"] },
  gold:                   { label:"Gold Loan",               icon:"🪙", category_options:["salaried","self_employed","student"] },
  pre_owned_car:          { label:"Pre-Owned Car Loan",      icon:"🚗", category_options:["salaried","self_employed"] },
  medical_equipment:      { label:"Medical Equipment Loan",  icon:"🏥", category_options:["professional"] },
  consumer_durable:       { label:"Consumer Durable Loan",   icon:"📺", category_options:["salaried","self_employed"] },
};

const CATEGORY_LABELS = {
  salaried:      "Salaried Employee",
  self_employed: "Self-Employed / Business Owner",
  professional:  "Professional (CA / Doctor / CS / Architect)",
  student:       "Student",
  entrepreneur:  "First-Time Entrepreneur",
  nri:           "NRI (Non-Resident Indian)",
};

function LoanSelectorScreen({ sessionId, onNext, preSelectedLoanType }) {
  const [loanType, setLoanType] = useState(preSelectedLoanType || "");
  const [category, setCategory] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [err,      setErr]      = useState("");

  const config  = loanType ? LOAN_PRODUCT_CONFIG[loanType] : null;
  const catOpts = config ? config.category_options : [];

  useEffect(() => {
    if (catOpts.length === 1 && category !== catOpts[0]) setCategory(catOpts[0]);
    if (catOpts.length > 1 && !catOpts.includes(category))  setCategory("");
  }, [loanType]);

  async function proceed() {
    setLoading(true); setErr("");
    try {
      const r = await fetch(`${API}/session/${sessionId}/configure`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ loan_type: loanType, applicant_category: category }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "Configuration failed");
      onNext(loanType, category);
    } catch(e) { setErr(e.message); }
    setLoading(false);
  }

  return (
    <div style={{ maxWidth:860, margin:"0 auto", padding:"40px 0" }}>
      <SectionHead sub="Select your loan product and applicant type — we'll show you exactly what documents you need">What would you like to apply for?</SectionHead>

      {preSelectedLoanType && loanType === preSelectedLoanType && (
        <div style={{ marginBottom:16, background:"var(--sky-light)", border:"1px solid var(--sky-mid)", borderRadius:10, padding:"10px 16px", fontSize:13, color:"var(--sky)", display:"flex", gap:8, alignItems:"center" }}>
          <span>✓</span><span>Pre-selected from your loan card choice — confirm below or change.</span>
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:28 }}>
        {Object.entries(LOAN_PRODUCT_CONFIG).map(([key, cfg]) => (
          <div key={key} onClick={() => setLoanType(key)}
            style={{ cursor:"pointer", borderRadius:12, padding:"16px 18px",
              border:`2px solid ${loanType===key?"var(--navy)":"var(--border)"}`,
              background:loanType===key?"var(--navy-light)":"var(--white)",
              transition:"all 0.2s", display:"flex", alignItems:"center", gap:12 }}
            onMouseEnter={e=>{ if(loanType!==key) e.currentTarget.style.borderColor="var(--border-mid)"; }}
            onMouseLeave={e=>{ if(loanType!==key) e.currentTarget.style.borderColor="var(--border)"; }}>
            <span style={{ fontSize:22, flexShrink:0 }}>{cfg.icon}</span>
            <div>
              <div style={{ fontFamily:"var(--font-d)", fontWeight:700, fontSize:13, color:loanType===key?"var(--navy)":"var(--t1)", lineHeight:1.3 }}>{cfg.label}</div>
            </div>
            {loanType===key && <span style={{ marginLeft:"auto", color:"var(--navy)", fontWeight:800 }}>✓</span>}
          </div>
        ))}
      </div>

      {loanType && catOpts.length > 1 && (
        <Card style={{ marginBottom:20 }}>
          <div style={{ fontFamily:"var(--font-d)", fontWeight:700, fontSize:15, color:"var(--navy)", marginBottom:14 }}>I am a…</div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {catOpts.map(cat => (
              <label key={cat} onClick={() => setCategory(cat)}
                style={{ display:"flex", alignItems:"center", gap:12, cursor:"pointer", padding:"12px 16px", borderRadius:10,
                  border:`1.5px solid ${category===cat?"var(--navy)":"var(--border)"}`,
                  background:category===cat?"var(--navy-light)":"var(--white)", transition:"all 0.2s" }}>
                <div style={{ width:18, height:18, borderRadius:"50%", border:`2px solid ${category===cat?"var(--navy)":"var(--border-mid)"}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  {category===cat && <div style={{ width:8, height:8, borderRadius:"50%", background:"var(--navy)" }}/>}
                </div>
                <span style={{ fontFamily:"var(--font-d)", fontWeight:600, fontSize:14, color:"var(--t1)" }}>{CATEGORY_LABELS[cat]}</span>
              </label>
            ))}
          </div>
        </Card>
      )}

      {loanType && category && (
        <Card style={{ marginBottom:24, background:"var(--sky-light)", borderColor:"var(--sky-mid)" }}>
          <div style={{ fontFamily:"var(--font-d)", fontWeight:700, fontSize:14, color:"var(--navy)", marginBottom:10 }}>Documents you'll need:</div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {["Aadhaar Card","PAN Card",
              ...(category==="salaried" ? ["Employee ID Card"] : []),
              ...(["business","lap"].includes(loanType)||["self_employed","entrepreneur"].includes(category) ? ["Business Registration (GST/Udyam)"] : []),
              ...(["professional","medical_equipment"].includes(loanType)||category==="professional" ? ["Certificate of Practice"] : []),
              ...(loanType.includes("education")&&category==="student" ? ["College ID or Admission Letter"] : []),
            ].map(d => <span key={d} className="tag tag-navy" style={{ padding:"6px 12px" }}>✓ {d}</span>)}
          </div>
          {loanType==="gold"               && <div style={{ marginTop:10, fontSize:12, color:"var(--t2)" }}>💡 State gold weight and purity (carats) during the video call</div>}
          {loanType==="lap"                && <div style={{ marginTop:10, fontSize:12, color:"var(--t2)" }}>💡 State property estimated value and type during the video call</div>}
          {loanType.includes("education")  && <div style={{ marginTop:10, fontSize:12, color:"var(--t2)" }}>💡 A parent or guardian must be present as co-applicant</div>}
          {loanType==="professional"        && <div style={{ marginTop:10, fontSize:12, color:"var(--t2)" }}>💡 Have your professional registration number ready</div>}
        </Card>
      )}

      <ErrBox msg={err}/>
      <button className="btn btn-primary btn-full btn-lg" onClick={proceed}
        disabled={!loanType || !category || loading}>
        {loading ? <><Spinner size={18} color="#fff"/>Saving…</> : `Proceed with ${config?.label || "selection"} →`}
      </button>
    </div>
  );
}

/* ─── SCREEN 2: KYC DOCS ─────────────────────────────────────────────────── */
function KycScreen({ sessionId, onNext, loanType, applicantCategory }) {
  const [aadhaarData,        setAadhaarData]        = useState(null);
  const [panData,            setPanData]            = useState(null);
  const [employeeIdData,     setEmployeeIdData]     = useState(null);
  const [studentIdData,      setStudentIdData]      = useState(null);
  const [professionalCertData, setProfessionalCertData] = useState(null);
  const [businessRegData,    setBusinessRegData]    = useState(null);
  const [crossResult,        setCrossResult]        = useState(null);
  const [loading,            setLoading]            = useState("");
  const [err,                setErr]                = useState("");

  async function upload(type, file) {
    const form = new FormData();
    form.append("file", file);
    setLoading(type); setErr("");
    try {
      const r = await fetch(`${API}/kyc/${sessionId}/upload-${type}`, { method:"POST", body:form });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || `${type} upload failed`);
      const extracted = d.extracted;
      if (type==="aadhaar")          setAadhaarData(extracted);
      else if (type==="pan")         setPanData(extracted);
      else if (type==="employee-id") {
        setEmployeeIdData(extracted);
        if (d.employer_mismatch) setErr(`⚠ ${d.employer_mismatch_note} — flagged for manual review`);
      }
      else if (type==="student-id" || type==="admission-letter") setStudentIdData(extracted);
      else if (type==="professional-cert") setProfessionalCertData(extracted);
      else if (type==="business-reg")      setBusinessRegData(extracted);
    } catch(e) { setErr(e.message); }
    setLoading("");
  }

  async function crossValidate() {
    setLoading("cross"); setErr("");
    try {
      const r = await fetch(`${API}/kyc/${sessionId}/cross-validate`, { method:"POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "Cross-validation failed");
      setCrossResult(d);
    } catch(e) { setErr(e.message); }
    setLoading("");
  }

  const DocUpload = ({ title, data, fileKey, icon, hint }) => (
    <Card style={{ marginBottom:14 }} glow={!!data}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:38, height:38, borderRadius:10, background:data?"var(--navy-light)":"var(--bg)", border:`1px solid ${data?"var(--border-mid)":"var(--border)"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>{icon}</div>
          <span style={{ fontFamily:"var(--font-d)", fontWeight:700, fontSize:15, color:"var(--navy)" }}>{title}</span>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          {data && <span className="tag tag-green">✓ Extracted</span>}
          {loading===fileKey && <div style={{ display:"flex", gap:6, alignItems:"center", color:"var(--t2)", fontSize:12 }}><Spinner size={14}/>Processing…</div>}
        </div>
      </div>
      {!data ? (
        <label style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10, padding:"28px", border:"2px dashed var(--border-mid)", borderRadius:12, cursor:"pointer", background:"var(--bg)", transition:"all 0.2s" }}
          onMouseEnter={e=>{e.currentTarget.style.background="var(--sky-light)";e.currentTarget.style.borderColor="var(--sky)";}}
          onMouseLeave={e=>{e.currentTarget.style.background="var(--bg)";e.currentTarget.style.borderColor="";}}
        >
          <svg width="28" height="28" fill="none" stroke="var(--sky)" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
          <div>
            <div style={{ color:"var(--navy)", fontFamily:"var(--font-d)", fontWeight:700, fontSize:14 }}>Click to upload {title}</div>
            <div style={{ color:"var(--t3)", fontSize:11, marginTop:2, textAlign:"center" }}>JPG · PNG · PDF · Max 10MB</div>
          {hint && <div style={{ color:"var(--t2)", fontSize:11, marginTop:4, textAlign:"center", fontStyle:"italic" }}>{hint}</div>}
          </div>
          <input type="file" accept="image/*,.pdf" style={{ display:"none" }} onChange={e=>e.target.files[0]&&upload(fileKey,e.target.files[0])} />
        </label>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          {Object.entries(data)
          .filter(([k,v]) =>
            v != null && v !== false && v !== "" &&
            !["document_type","extraction_method","raw_text","error",
              "employer_mismatch_flag","employer_mismatch_detail"].includes(k)
          )
          .map(([k,v]) => (
            <div key={k} style={{ background:"var(--bg)", borderRadius:8, padding:"10px 12px" }}>
              <div style={{ fontSize:10, color:"var(--t3)", textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:3, fontFamily:"var(--font-m)" }}>{k.replace(/_/g," ")}</div>
              <div style={{ fontSize:14, color:"var(--t1)", fontWeight:600 }}>{String(v)}</div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );

  return (
    <div style={{ maxWidth:620, margin:"0 auto", padding:"40px 0" }}>
      <SectionHead sub="Upload Aadhaar and PAN — AI extracts your details automatically">Identity Documents</SectionHead>
      <DocUpload title="Aadhaar Card" data={aadhaarData} fileKey="aadhaar" icon="🪪"/>
      <DocUpload title="PAN Card"     data={panData}     fileKey="pan"     icon="💳"/>

      {/* ── Conditional document uploads based on loan type + category ── */}
      {(applicantCategory==="salaried" || loanType==="instant_personal") && (
        <DocUpload title="Employee ID Card" data={employeeIdData} fileKey="employee-id" icon="🪪"
          hint="Company name on ID must match what you state in the video call"/>
      )}
      {(applicantCategory==="professional" || ["professional","medical_equipment"].includes(loanType)) && (
        <DocUpload title="Certificate of Practice" data={professionalCertData} fileKey="professional-cert" icon="📜"
          hint="Issued by ICAI / Medical Council / ICSI / relevant professional body"/>
      )}
      {(applicantCategory==="self_employed" || applicantCategory==="entrepreneur" || ["business","lap"].includes(loanType)) && (
        <DocUpload title="Business Registration (GST / Udyam)" data={businessRegData} fileKey="business-reg" icon="🏢"
          hint="GST certificate, Udyam registration, or MSME certificate"/>
      )}
      {applicantCategory==="student" && !loanType.includes("education") && (
        <DocUpload title="College / University ID Card" data={studentIdData} fileKey="student-id" icon="🎓" hint="Currently enrolled student ID"/>
      )}
      {loanType==="education_domestic" && (
        <DocUpload title="Student ID or Admission Letter" data={studentIdData} fileKey="student-id" icon="🎓"
          hint="College ID (enrolled) or Admission Letter (newly admitted)"/>
      )}
      {loanType==="education_international" && (
        <DocUpload title="Admission / Acceptance Letter (Foreign University)" data={studentIdData} fileKey="admission-letter" icon="✈️"
          hint="I-20 (USA) / CAS (UK) / CoE (Australia) or equivalent"/>
      )}

      {aadhaarData && panData && !crossResult && (
        <button className="btn btn-primary btn-full" onClick={crossValidate} disabled={loading==="cross"} style={{ marginTop:8, marginBottom:16 }}>
          {loading==="cross" ? <><Spinner size={16} color="#fff"/>Cross-validating…</> : "Validate Documents →"}
        </button>
      )}

      {crossResult && (
        <Card glow={crossResult.verified} warn={!crossResult.verified&&crossResult.can_proceed} style={{ marginBottom:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ width:48, height:48, borderRadius:"50%", background:crossResult.verified?"var(--green-light)":"var(--gold-light)", border:`1px solid ${crossResult.verified?"rgba(0,166,81,0.3)":"rgba(230,168,23,0.3)"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>
              {crossResult.verified ? "✓" : "⚠"}
            </div>
            <div>
              <div style={{ fontFamily:"var(--font-d)", fontWeight:700, fontSize:16, color:crossResult.verified?"var(--green)":"var(--gold)", marginBottom:3 }}>
                {crossResult.verified ? "Documents Verified" : "Minor Discrepancy"}
              </div>
              <div style={{ fontSize:13, color:"var(--t2)" }}>{crossResult.message}</div>
              {crossResult.flags?.length>0 && <div style={{ marginTop:6, display:"flex", gap:6, flexWrap:"wrap" }}>{crossResult.flags.map((f,i)=><span key={i} className="tag tag-gold">{f}</span>)}</div>}
            </div>
          </div>
        </Card>
      )}

      <ErrBox msg={err}/>
      {crossResult && crossResult.can_proceed !== false && (
        <button className="btn btn-primary btn-full btn-lg" onClick={onNext} style={{ marginTop:20 }}>Proceed to Liveness Check →</button>
      )}
    </div>
  );
}

/* ─── SCREEN 3: LIVENESS ─────────────────────────────────────────────────── */
function LivenessScreen({ sessionId, onNext }) {
  const videoRef  = useRef(null);
  const streamRef = useRef(null);
  const [frames,  setFrames]  = useState([]);
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [camReady,setCamReady]= useState(false);
  const [err,     setErr]     = useState("");

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video:{ width:1280, height:720 }, audio:false })
      .then(s => { streamRef.current=s; if(videoRef.current) videoRef.current.srcObject=s; setCamReady(true); })
      .catch(() => setErr("Camera access denied. Please allow camera permissions and reload."));
    return () => streamRef.current?.getTracks().forEach(t=>t.stop());
  }, []);

  function captureFrame() {
    const canvas = document.createElement("canvas");
    const v = videoRef.current;
    canvas.width = v.videoWidth||640; canvas.height = v.videoHeight||480;
    canvas.getContext("2d").drawImage(v,0,0);
    canvas.toBlob(blob => setFrames(f=>[...f,blob]), "image/jpeg", 0.85);
  }

  async function submitLiveness() {
    setLoading(true); setErr("");
    const form = new FormData();
    frames.forEach((f,i) => form.append("frames", f, `frame${i}.jpg`));
    try {
      const r = await fetch(`${API}/kyc/${sessionId}/liveness-check`, { method:"POST", body:form });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail||"Liveness check failed");
      setResult(d);
    } catch(e) { setErr(e.message); }
    setLoading(false);
  }

  return (
    <div style={{ maxWidth:680, margin:"0 auto", padding:"40px 0" }}>
      <SectionHead sub="Capture 3 webcam frames — AI verifies you are a live person, not a photo">Liveness Detection</SectionHead>

      <Card style={{ marginBottom:16 }}>
        <div style={{ position:"relative", borderRadius:12, overflow:"hidden", background:"#111", aspectRatio:"16/9" }}>
          <video ref={videoRef} autoPlay playsInline muted style={{ width:"100%", height:"100%", objectFit:"cover", transform:"scaleX(-1)" }}/>
          {camReady && <div style={{ position:"absolute", left:0, right:0, height:"1px", background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.6),transparent)", animation:"scanLine 3s linear infinite", opacity:0.5 }}/>}
          <CamCorners/>
          {!camReady && (
            <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:12, background:"rgba(0,0,0,0.8)", color:"#fff", fontSize:13 }}>
              <Spinner size={28} color="#fff"/><span>Requesting camera access…</span>
            </div>
          )}
        </div>

        {frames.length>0 && (
          <div style={{ display:"flex", gap:8, marginTop:16 }}>
            {[0,1,2].map(i=>(
              <div key={i} style={{ flex:1, height:5, borderRadius:3, background:i<frames.length?"var(--navy)":"var(--border)", transition:"all 0.3s" }}/>
            ))}
          </div>
        )}

        <div style={{ display:"flex", gap:12, marginTop:16 }}>
          <button className="btn btn-ghost" style={{ flex:1 }} onClick={captureFrame} disabled={!camReady||frames.length>=3}>
            📷 Capture Frame {frames.length>0?`(${frames.length}/3)`:""}
          </button>
          {frames.length>=3 && !result && (
            <button className="btn btn-primary" style={{ flex:1 }} onClick={submitLiveness} disabled={loading}>
              {loading ? <><Spinner size={16} color="#fff"/>Analysing…</> : "Run Liveness Check"}
            </button>
          )}
        </div>
      </Card>

      {result && (
        <Card glow={result.liveness_passed} danger={!result.liveness_passed}>
          <div style={{ display:"flex", gap:16, alignItems:"flex-start" }}>
            <div style={{ width:52, height:52, borderRadius:"50%", flexShrink:0, background:result.liveness_passed?"var(--green-light)":"var(--red-light)", border:`1.5px solid ${result.liveness_passed?"rgba(0,166,81,0.3)":"rgba(211,47,47,0.3)"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>
              {result.liveness_passed ? "✓" : "✗"}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:"var(--font-d)", fontWeight:800, fontSize:17, color:result.liveness_passed?"var(--green)":"var(--red)", marginBottom:4 }}>
                {result.liveness_passed ? "Live Person Confirmed" : "Liveness Check Failed"}
              </div>
              <div style={{ fontSize:13, color:"var(--t2)", lineHeight:1.6 }}>{result.reason}</div>
              {result.liveness_passed && (
                <div style={{ display:"flex", gap:8, marginTop:10, flexWrap:"wrap" }}>
                  <span className="tag tag-green">Faces: {Math.round((result.faces_detected_pct||0)*100)}%</span>
                  <span className="tag tag-sky">Movement: {result.avg_movement?.toFixed(2)||"—"}</span>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      <ErrBox msg={err}/>
      {result?.liveness_passed && (
        <button className="btn btn-primary btn-full btn-lg" onClick={onNext} style={{ marginTop:24 }}>Proceed to Face Verification →</button>
      )}
    </div>
  );
}

/* ─── SCREEN 4: FACE MATCH ─────────────────────────────────────────────────*/
function FaceMatchScreen({ sessionId, onNext }) {
  const videoRef  = useRef(null);
  const streamRef = useRef(null);
  const [result,         setResult]         = useState(null);
  const [loading,        setLoading]        = useState(false);
  const [capturePhase,   setCapturePhase]   = useState("idle");
  const [framesCaptured, setFramesCaptured] = useState(0);
  const [camReady,       setCamReady]       = useState(false);
  const [err,            setErr]            = useState("");
  const [aadhaarFaceUrl, setAadhaarFaceUrl] = useState(null);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video:true })
      .then(s => { streamRef.current=s; if(videoRef.current) videoRef.current.srcObject=s; setCamReady(true); })
      .catch(() => setErr("Camera access denied."));
    return () => streamRef.current?.getTracks().forEach(t=>t.stop());
  }, []);

  useEffect(() => {
    if (sessionId) {
      fetch(`${API}/kyc/${sessionId}/aadhaar-face`)
        .then(r => { if (r.ok) return r.blob(); throw new Error("No face"); })
        .then(blob => setAadhaarFaceUrl(URL.createObjectURL(blob)))
        .catch(() => setAadhaarFaceUrl(null));
    }
  }, [sessionId]);

  function captureOneFrame() {
    return new Promise(resolve => {
      const canvas = document.createElement("canvas");
      const v = videoRef.current;
      canvas.width = v.videoWidth || 640; canvas.height = v.videoHeight || 480;
      canvas.getContext("2d").drawImage(v, 0, 0);
      canvas.toBlob(blob => resolve(blob), "image/jpeg", 0.92);
    });
  }

  async function captureAndMatch() {
    setLoading(true); setErr(""); setFramesCaptured(0); setCapturePhase("capturing");
    try {
      const blobs = [];
      for (let i = 0; i < 3; i++) {
        const blob = await captureOneFrame();
        blobs.push(blob);
        setFramesCaptured(i + 1);
        if (i < 2) await new Promise(r => setTimeout(r, 800));
      }
      setCapturePhase("submitting");
      const form = new FormData();
      blobs.forEach((blob, i) => form.append("frames", blob, `frame${i}.jpg`));
      const r = await fetch(`${API}/kyc/${sessionId}/face-match`, { method:"POST", body:form });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "Face match failed");
      setResult(d);
    } catch(e) { setErr(e.message); }
    setLoading(false); setCapturePhase("idle");
  }

  const fm      = result?.face_match;
  const score   = fm ? Math.round((fm.similarity_score||0)*100) : 0;
  const verdict = result?.policy_verdict || (result?.overall_pass ? "PASS" : "FAIL");
  const VC = {
    PASS:          { color:"var(--green)",  bg:"var(--green-light)",  border:"rgba(0,166,81,0.25)",   icon:"✓", label:"Identity Confirmed",       tag:"tag-green",  btn:"Proceed to Video Assessment →" },
    MANUAL_REVIEW: { color:"var(--gold)",   bg:"var(--gold-light)",   border:"rgba(230,168,23,0.3)",  icon:"⚠", label:"Manual Review Required",   tag:"tag-gold",   btn:"Proceed (Flagged for Review) →" },
    FAIL:          { color:"var(--red)",    bg:"var(--red-light)",    border:"rgba(211,47,47,0.25)",  icon:"✗", label:"Verification Failed",      tag:"tag-red",    btn:null },
  };
  const vc = result ? (VC[verdict] || VC.FAIL) : null;

  return (
    <div style={{ maxWidth:700, margin:"0 auto", padding:"40px 0" }}>
      <SectionHead sub="Live face matched against your Aadhaar document photo">Face Verification</SectionHead>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:20 }}>
        <Card>
          <div className="section-label" style={{ marginBottom:10 }}>Live Camera</div>
          <div style={{ position:"relative", borderRadius:10, overflow:"hidden", aspectRatio:"4/3", background:"#111" }}>
            <video ref={videoRef} autoPlay playsInline muted style={{ width:"100%", height:"100%", objectFit:"cover", transform:"scaleX(-1)" }}/>
            {camReady && <div style={{ position:"absolute", left:0, right:0, height:1, background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.5),transparent)", animation:"scanLine 3s linear infinite" }}/>}
          </div>
          {capturePhase==="capturing" && (
            <div style={{ marginTop:10 }}>
              <div style={{ fontSize:12, color:"var(--t2)", marginBottom:6, textAlign:"center" }}>Capturing frame {framesCaptured} of 3…</div>
              <div style={{ display:"flex", gap:6 }}>
                {[0,1,2].map(i=><div key={i} style={{ flex:1, height:4, borderRadius:2, background:i<framesCaptured?"var(--navy)":"var(--border)", transition:"all 0.3s" }}/>)}
              </div>
            </div>
          )}
        </Card>
        <Card>
          <div className="section-label" style={{ marginBottom:10 }}>Aadhaar Photo</div>
          <div style={{ borderRadius:10, aspectRatio:"4/3", background:"var(--bg)", border:"2px dashed var(--border-mid)", overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center" }}>
            {aadhaarFaceUrl
              ? <img src={aadhaarFaceUrl} alt="Aadhaar face" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
              : <div style={{ textAlign:"center", color:"var(--t3)" }}><div style={{ fontSize:40 }}>👤</div><div style={{ fontSize:11, marginTop:6 }}>Extracted from Aadhaar</div></div>
            }
          </div>
        </Card>
      </div>

      {!result && (
        <button className="btn btn-primary btn-full btn-lg" onClick={captureAndMatch} disabled={loading||!camReady}>
          {capturePhase==="capturing" ? <><Spinner size={18} color="#fff"/>Capturing {framesCaptured}/3 frames…</>
          : capturePhase==="submitting" ? <><Spinner size={18} color="#fff"/>AI Verification in progress…</>
          : "Capture & Verify Face"}
        </button>
      )}

      {result && vc && (
        <Card glow={verdict==="PASS"} warn={verdict==="MANUAL_REVIEW"} danger={verdict==="FAIL"}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
            <div style={{ display:"flex", alignItems:"center", gap:14 }}>
              <div style={{ width:48, height:48, borderRadius:"50%", background:vc.bg, border:`1.5px solid ${vc.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, color:vc.color, flexShrink:0 }}>{vc.icon}</div>
              <div>
                <div style={{ fontFamily:"var(--font-d)", fontSize:18, fontWeight:800, color:vc.color, marginBottom:2 }}>{vc.label}</div>
                {fm?.policy_note && <div style={{ color:"var(--t2)", fontSize:12, maxWidth:340, lineHeight:1.5 }}>{fm.policy_note}</div>}
              </div>
            </div>
            <span className={`tag ${vc.tag}`}>{verdict.replace("_"," ")}</span>
          </div>

          <div style={{ marginBottom:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
              <span style={{ fontSize:12, color:"var(--t2)", fontFamily:"var(--font-m)" }}>Similarity Score</span>
              <span style={{ fontSize:16, fontWeight:700, fontFamily:"var(--font-d)", color:vc.color }}>{score}%</span>
            </div>
            <div style={{ height:8, background:"var(--bg)", borderRadius:4, overflow:"hidden", position:"relative", border:"1px solid var(--border)" }}>
              <div style={{ height:"100%", width:`${score}%`, background:verdict==="PASS"?"linear-gradient(90deg,var(--sky),var(--green))":verdict==="MANUAL_REVIEW"?"var(--gold)":"var(--red)", borderRadius:4, transition:"width 1s cubic-bezier(0.4,0,0.2,1)" }}/>
              <div style={{ position:"absolute", top:0, bottom:0, left:"38%", width:1, background:"rgba(0,0,0,0.15)" }}/>
              <div style={{ position:"absolute", top:0, bottom:0, left:"52%", width:1, background:"rgba(0,0,0,0.2)" }}/>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
              <span style={{ fontSize:10, color:"var(--t3)" }}>0%</span>
              <span style={{ fontSize:10, color:"var(--gold)" }}>38% review</span>
              <span style={{ fontSize:10, color:"var(--navy)" }}>52% pass</span>
              <span style={{ fontSize:10, color:"var(--t3)" }}>100%</span>
            </div>
          </div>

          {fm?.frames_processed > 1 && (
            <div style={{ background:"var(--bg)", borderRadius:8, padding:"10px 14px", display:"flex", gap:20, marginBottom:12 }}>
              <div style={{ fontSize:12, color:"var(--t2)" }}>Frames: <strong style={{ color:"var(--navy)" }}>{fm.frames_processed}</strong></div>
              <div style={{ fontSize:12, color:"var(--t2)" }}>Best: <strong style={{ color:vc.color }}>{score}%</strong></div>
              {fm.avg_similarity!=null && <div style={{ fontSize:12, color:"var(--t2)" }}>Avg: <strong>{Math.round(fm.avg_similarity*100)}%</strong></div>}
            </div>
          )}

          {/* Age Estimation — advisory only, never blocks */}
          <div style={{ background:"var(--bg)", borderRadius:10, padding:"12px 16px", border:"1px solid var(--border)", marginBottom:12 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <div>
                <div className="section-label" style={{ marginBottom:3 }}>Age Estimate (advisory only — Aadhaar DOB is authoritative)</div>
                {result.age_estimation?.estimated_age
                  ? <div style={{ fontSize:14, color:"var(--t1)", fontWeight:600 }}>
                      ~{result.age_estimation.estimated_age} yrs
                      {result.age_estimation.raw_age && result.age_estimation.raw_age !== result.age_estimation.estimated_age &&
                        <span style={{ color:"var(--t3)", fontSize:11, marginLeft:6 }}>
                          (raw: {result.age_estimation.raw_age} − {result.age_estimation.bias_correction}yr correction)
                        </span>
                      }
                      <span style={{ color:"var(--t2)", fontSize:11, marginLeft:6 }}>band: {result.age_estimation.age_band}</span>
                    </div>
                  : <div style={{ fontSize:13, color:"var(--t3)", fontStyle:"italic" }}>Estimation unavailable</div>
                }
                <div style={{ fontSize:11, color:"var(--t3)", marginTop:3 }}>
                  DeepFace ±8–15yr error on South Asian faces · Does not affect loan decision
                </div>
              </div>
              <button className="btn btn-ghost" style={{ fontSize:11, padding:"4px 10px", flexShrink:0 }}
                onClick={async () => {
                  // Re-capture a frame for fresh age estimation
                  const canvas = document.createElement("canvas");
                  const v = videoRef.current;
                  if (!v) return;
                  canvas.width = v.videoWidth||640; canvas.height = v.videoHeight||480;
                  canvas.getContext("2d").drawImage(v,0,0);
                  canvas.toBlob(async blob => {
                    const frm = new FormData();
                    frm.append("frames", blob, "age.jpg");
                    const r = await fetch(`${API}/kyc/${sessionId}/face-match`, {method:"POST",body:frm}).catch(()=>null);
                    if (r?.ok) { const d = await r.json(); setResult(prev => ({...prev, age_estimation: d.age_estimation})); }
                  }, "image/jpeg", 0.9);
                }}>
                ↺ Re-estimate
              </button>
            </div>
          </div>

          {result.age_flag_reason && (
            <div style={{ background:"var(--gold-light)", border:"1px solid rgba(230,168,23,0.3)", borderRadius:10, padding:"10px 14px", color:"var(--gold)", fontSize:12, display:"flex", gap:8 }}>
              <span style={{ flexShrink:0 }}>ℹ</span><span>{result.age_flag_reason}</span>
            </div>
          )}
        </Card>
      )}

      <ErrBox msg={err}/>
      {result && result.can_proceed && (
        <button className="btn btn-primary btn-full btn-lg" onClick={onNext} style={{ marginTop:24 }}>{vc?.btn}</button>
      )}
      {result && result.policy_verdict === "FAIL" && (
        <div style={{ marginTop:20, textAlign:"center", color:"var(--t2)", fontSize:13 }}>
          Face match failed. Ensure good lighting, remove glasses if possible, face camera directly.
          <br/>
          <div style={{ display:"flex", gap:10, justifyContent:"center", marginTop:12 }}>
            <button className="btn btn-ghost" onClick={()=>{setResult(null);setErr("");}}>Try Again</button>
            <button className="btn btn-ghost" style={{ color:"var(--gold)", borderColor:"rgba(230,168,23,0.5)" }}
              onClick={onNext}>
              Request Manual Review →
            </button>
          </div>
          <div style={{ marginTop:8, fontSize:11, color:"var(--t3)" }}>
            Manual review routes your application to a human officer for verification.
          </div>
        </div>
      )}
    </div>
  );
}


/* ─── LOAN-TYPE AWARE SCRIPT COMPONENT ──────────────────────────────────── */
function LoanTypeScript({ loanType, applicantCategory }) {
  const scripts = {
    personal: `"Hi, I'm [full name]. I work as [job title] at [employer name] for [X] years. My monthly income is ₹[amount]. I need a personal loan of ₹[amount] for [purpose — e.g. medical/travel/home renovation]. The loan tenure I prefer is [X] months. I give my full consent to proceed."`,

    instant_personal: `"Hi, I'm [full name]. I work at [employer name]. My monthly income is ₹[amount]. I need a quick personal loan of ₹[amount] for [purpose]. Preferred tenure is [X] months. I give my full consent to proceed."`,

    business: `"Hi, I'm [full name]. I run [business name] and have been in business for [X] years. My monthly business turnover is approximately ₹[amount]. I need a business loan of ₹[amount] for [purpose]. Preferred tenure is [X] months. I give my full consent to proceed."`,

    professional: `"Hi, I'm [full name], a [profession — CA / Doctor / CS / Architect]. I am registered with [body — ICAI / Medical Council / ICSI]. My registration number is [number]. My monthly income is ₹[amount]. I need a professional loan of ₹[amount] for [purpose]. Preferred tenure is [X] months. I give my full consent to proceed."`,

    home: `"Hi, I'm [full name]. I work as [job title] at [employer name]. My monthly income is ₹[amount]. I want a home loan of ₹[amount] for [purchasing / constructing] a [residential / commercial] property in [city]. Preferred tenure is [X] years. I give my full consent to proceed."`,

    education_domestic: `"Hi, I'm [student full name], admitted to [college name] for [course name — e.g. B.Tech AI&DS]. My parent / guardian is [guardian full name], who works at [employer name] with a monthly income of ₹[amount]. [OR: My parent / guardian does not have a regular income but owns a property worth ₹[property value].] The total course fee is ₹[amount]. We need an education loan of ₹[amount]. The preferred tenure is [X] months. We both give our full consent to proceed."`,

    education_international: `"Hi, I'm [student full name]. I have been admitted to [university name] in [country] for [programme name]. The total course fee is [amount in foreign currency]. We need an education loan of ₹[amount]. My co-applicant / guardian is [name] with a monthly income of ₹[amount]. [OR: My co-applicant owns a property worth ₹[property value] and does not have regular employment income.] Preferred tenure is [X] months. We both give our full consent to proceed."`,

    lap: `"Hi, I'm [full name]. I own a [residential / commercial] property in [location] with an estimated value of ₹[amount]. The property has no existing mortgage. I need a loan against this property of ₹[amount] for [purpose]. Preferred tenure is [X] months. I give my full consent to proceed."`,

    gold: `"Hi, I'm [full name]. I want a gold loan. I have [X] grams of gold [jewellery / coins] of approximately [X] carats purity. The estimated value of the gold is ₹[amount]. I need a loan of ₹[amount]. Preferred tenure is [X] months. I give my full consent to proceed."`,

    pre_owned_car: `"Hi, I'm [full name]. I work at [employer name]. My monthly income is ₹[amount]. I want to purchase a [make / model / year] car for approximately ₹[amount]. I need a pre-owned car loan of ₹[amount]. Preferred tenure is [X] months. The RC book and inspection report are available. I give my full consent to proceed."`,

    medical_equipment: `"Hi, I'm Dr. [full name], registered with [medical council name]. My registration number is [number]. I want to purchase [equipment name] from [vendor name] at a cost of ₹[amount]. I need a medical equipment loan of ₹[amount]. Preferred tenure is [X] months. I give my full consent to proceed."`,

    consumer_durable: `"Hi, I'm [full name]. My monthly income is ₹[amount]. I want to purchase [product name] for ₹[amount] from [retailer name]. I need a consumer durable loan of ₹[amount]. Preferred tenure is [X] months. I give my full consent to proceed."`,

    commercial_vehicle: `"Hi, I'm [full name]. I run a [transport / logistics] business for [X] years. I want to purchase a [vehicle type — truck / bus / tractor] for ₹[amount]. I need a commercial vehicle loan of ₹[amount]. Preferred tenure is [X] months. I give my full consent to proceed."`,
  };
  const script = scripts[loanType] || scripts.personal;

  // Highlight [placeholders] in a different colour so user knows what to replace
  const parts = script.split(/(\[[^\]]+\])/g);
  return (
    <div style={{ fontSize:13, color:"var(--t2)", lineHeight:1.9, background:"var(--sky-light)", borderRadius:10, padding:"14px 16px", borderLeft:"3px solid var(--sky)" }}>
      {parts.map((part, i) =>
        part.startsWith("[") && part.endsWith("]")
          ? <span key={i} style={{ color:"var(--navy)", fontWeight:700, fontStyle:"normal", background:"rgba(27,42,107,0.08)", borderRadius:3, padding:"0 2px" }}>{part}</span>
          : <span key={i} style={{ fontStyle:"italic" }}>{part}</span>
      )}
    </div>
  );
}

/* ─── SCREEN 5: VIDEO CALL ─────────────────────────────────────────────────*/
function VideoCallScreen({ sessionId, onNext, setTranscript, loanType, applicantCategory }) {
  const videoRef      = useRef(null);
  const streamRef     = useRef(null);
  const mrRef         = useRef(null);
  const chunksRef     = useRef([]);
  const timerRef      = useRef(null);
  const recognitionRef = useRef(null);   // Web Speech API ref
  const finalTextRef  = useRef("");      // accumulates final Web Speech results
  const [camReady,   setCamReady]   = useState(false);
  const [recording,  setRecording]  = useState(false);
  const [duration,   setDuration]   = useState(0);
  const [liveText,   setLiveText]   = useState("");
  const [processing, setProcessing] = useState(false);
  const [err,        setErr]        = useState("");

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video:true, audio:true })
      .then(s => { streamRef.current=s; if(videoRef.current) videoRef.current.srcObject=s; setCamReady(true); })
      .catch(() => setErr("Camera/microphone permission denied. Both are required."));
    return () => {
      streamRef.current?.getTracks().forEach(t=>t.stop());
      clearInterval(timerRef.current);
      try { recognitionRef.current?.stop(); } catch {}
    };
  }, []);

  function startRecording() {
    setErr("");

    // Step 1: Extract ONLY the audio tracks from the stream.
    // Passing a video+audio stream with an audio/* MIME type is what causes
    // NotSupportedError on Chrome — the codec combination is rejected.
    const audioTracks = streamRef.current?.getAudioTracks() || [];
    if (audioTracks.length === 0) {
      setErr("No microphone detected. Check microphone permissions and try again.");
      return;
    }
    const audioStream = new MediaStream(audioTracks);

    // Step 2: Find a MIME type the browser genuinely supports.
    const mimeTypes = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/ogg",
      "video/webm;codecs=vp8,opus",
      "video/webm",
      "", // browser default — absolute last resort
    ];
    const mime = mimeTypes.find(t => t === "" || MediaRecorder.isTypeSupported(t)) ?? "";

    // Step 3: Create recorder — two fallback levels
    let mr;
    try {
      mr = new MediaRecorder(audioStream, mime ? { mimeType: mime } : {});
    } catch (e1) {
      try {
        mr = new MediaRecorder(audioStream); // browser picks codec
      } catch (e2) {
        try {
          mr = new MediaRecorder(streamRef.current); // full stream last resort
        } catch (e3) {
          setErr(`Recording not supported in this browser. Use Chrome or Edge. (${e3.message})`);
          return;
        }
      }
    }

    mrRef.current     = mr;
    chunksRef.current = [];

    // Step 4: Accumulate chunks — send batch to Whisper only every 15s.
    // Whisper needs ≥8s of audio minimum; single 4s chunks return empty/garbled text.
    let accChunks = [];
    let lastSent  = Date.now();

    mr.ondataavailable = e => {
      if (!e.data?.size) return;
      chunksRef.current.push(e.data);
      accChunks.push(e.data);
      if (Date.now() - lastSent >= 15000 && accChunks.length >= 2) {
        const batch = new Blob(accChunks, { type: mr.mimeType || "audio/webm" });
        accChunks = []; lastSent = Date.now();
        const form = new FormData();
        form.append("audio", batch, "batch.webm");
        fetch(`${API}/loan/${sessionId}/transcribe-chunk`, { method:"POST", body:form })
          .then(r => r.json())
          .then(d => { if (d.chunk_text?.trim()) setLiveText(t => t ? t+" "+d.chunk_text : d.chunk_text); })
          .catch(() => {});
      }
    };

    mr.onerror = e => {
      setErr(`Recording error: ${e.error?.message || "unknown"}. Please stop and try again.`);
      setRecording(false);
      clearInterval(timerRef.current);
    };

    // Step 5: Start — wrapped in try/catch for any remaining edge cases
    try {
      mr.start(4000);
    } catch (e) {
      setErr(`Could not start recording: ${e.message}. Make sure your microphone is not in use by another app.`);
      return;
    }

    setRecording(true);
    timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);

    // ── Web Speech API: real-time live display (Chrome/Edge only) ─────────────
    // This runs ALONGSIDE MediaRecorder. MediaRecorder captures audio for Whisper
    // (accurate final transcript). Web Speech API shows words instantly as you speak.
    finalTextRef.current = "";
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRec) {
      try {
        const recognition     = new SpeechRec();
        recognition.continuous     = true;
        recognition.interimResults = true;
        recognition.lang           = "en-IN";
        recognition.maxAlternatives = 1;

        recognition.onresult = event => {
          let interim = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const text = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTextRef.current += text + " ";
            } else {
              interim = text;
            }
          }
          setLiveText(finalTextRef.current + interim);
        };

        recognition.onerror = e => {
          // "no-speech" is normal during pauses — don't show error
          if (e.error !== "no-speech" && e.error !== "aborted") {
            console.warn("[SpeechRec] error:", e.error);
          }
        };

        recognition.onend = () => {
          // Auto-restart if still recording (browser stops recognition after ~60s)
          if (mrRef.current?.state === "recording") {
            try { recognition.start(); } catch {}
          }
        };

        recognition.start();
        recognitionRef.current = recognition;
      } catch (e) {
        console.warn("[SpeechRec] Not available:", e.message);
        // Falls back gracefully — Whisper still captures full transcript at stop
      }
    } else {
      console.warn("[SpeechRec] Web Speech API not supported in this browser. Use Chrome/Edge.");
    }
  }

  async function stopAndProcess() {
    clearInterval(timerRef.current);
    setRecording(false);
    setProcessing(true);

    // Capture Web Speech text BEFORE stopping recognition — this is our best transcript
    const webSpeechText = finalTextRef.current.trim();

    // Stop Web Speech API
    try { recognitionRef.current?.stop(); recognitionRef.current = null; } catch {}

    // Wait for recorder to fully stop
    await new Promise(resolve => {
      const mr = mrRef.current;
      if (!mr || mr.state === "inactive") { resolve(); return; }
      mr.onstop = resolve;
      try { mr.stop(); } catch { resolve(); }
    });
    await new Promise(r => setTimeout(r, 400));

    // PRIMARY: Use Web Speech text if it has real content (>20 chars).
    // Web Speech runs in the browser with high accuracy.
    // Whisper (local base model on Windows) can garble audio-only webm streams.
    if (webSpeechText && webSpeechText.length > 20) {
      setTranscript(webSpeechText);
      setLiveText(webSpeechText);
      setProcessing(false);
      setTimeout(() => onNext(), 600);

      // Background: send to Whisper — only update if Whisper is substantially longer
      if (chunksRef.current.length > 0) {
        const blob = new Blob(chunksRef.current, { type: mrRef.current?.mimeType || "audio/webm" });
        const form = new FormData();
        form.append("audio", blob, "recording.webm");
        fetch(`${API}/loan/${sessionId}/transcribe-full`, { method:"POST", body:form })
          .then(r => r.json())
          .then(d => {
            const w = (d.transcript || "").trim();
            if (w.length > webSpeechText.length * 1.3) {
              console.log("[STT] Whisper richer — updating transcript");
              setTranscript(w);
            } else {
              console.log("[STT] Web Speech retained as primary transcript");
            }
          })
          .catch(() => {});
      }
      return;
    }

    // FALLBACK: Web Speech unavailable — use Whisper only
    if (chunksRef.current.length === 0) {
      setErr("No audio recorded. Please speak clearly and try again.");
      setProcessing(false);
      return;
    }
    const blob = new Blob(chunksRef.current, { type: mrRef.current?.mimeType || "audio/webm" });
    const form = new FormData();
    form.append("audio", blob, "recording.webm");
    try {
      const r = await fetch(`${API}/loan/${sessionId}/transcribe-full`, { method:"POST", body:form });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "Transcription failed");
      setTranscript(d.transcript);
      setLiveText(d.transcript);
      setTimeout(() => onNext(), 1200);
    } catch(e) { setErr(e.message); }
    setProcessing(false);
  }

  const fmt = s => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  return (
    <div style={{ maxWidth:960, margin:"0 auto", padding:"40px 0" }}>
      <SectionHead sub="Speak naturally about your employment, income, and loan requirement">Video Assessment</SectionHead>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
        <Card>
          <div style={{ position:"relative", borderRadius:12, overflow:"hidden", background:"#111", aspectRatio:"4/3" }}>
            <video ref={videoRef} autoPlay playsInline muted style={{ width:"100%", height:"100%", objectFit:"cover", transform:"scaleX(-1)" }}/>
            {camReady && <div style={{ position:"absolute", left:0, right:0, height:1, background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.5),transparent)", animation:"scanLine 4s linear infinite" }}/>}
            {recording && (
              <div style={{ position:"absolute", top:10, left:10, display:"flex", alignItems:"center", gap:6, background:"rgba(0,0,0,0.7)", borderRadius:20, padding:"6px 12px" }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:"var(--red)", animation:"blink 1s ease-in-out infinite" }}/>
                <span style={{ fontSize:12, fontWeight:600, color:"#fff", fontFamily:"var(--font-m)", letterSpacing:"1px" }}>REC {fmt(duration)}</span>
              </div>
            )}
            <CamCorners/>
          </div>
          <div style={{ display:"flex", gap:10, marginTop:14 }}>
            {!recording && !processing ? (
              <button className="btn btn-primary" style={{ flex:1 }} onClick={startRecording} disabled={!camReady}>
                ● Start Recording
              </button>
            ) : recording ? (
              <button className="btn btn-danger" style={{ flex:1 }} onClick={stopAndProcess}>
                ■ Stop & Process
              </button>
            ) : (
              <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:"12px", background:"var(--bg)", borderRadius:12, color:"var(--t2)", fontSize:14, border:"1px solid var(--border)" }}>
                <Spinner size={16}/>Transcribing speech…
              </div>
            )}
          </div>
        </Card>

        <Card>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <div className="section-label">Live Transcript</div>
            <div style={{ display:"flex", gap:6, alignItems:"center" }}>
              {recording && <div style={{ display:"flex", gap:5, alignItems:"center" }}><div style={{ width:6, height:6, borderRadius:"50%", background:"var(--red)", animation:"blink 1.5s infinite" }}/><span className="tag tag-red" style={{ fontSize:9 }}>LIVE</span></div>}
            </div>
          </div>
          <div style={{ minHeight:180, maxHeight:220, overflowY:"auto", background:"var(--bg)", borderRadius:10, padding:14, fontSize:14, color:"var(--t1)", lineHeight:1.7, border:"1px solid var(--border)" }}>
            {liveText
              ? liveText
              : recording
              ? <span style={{ color:"var(--t3)", fontStyle:"italic" }}>
                  {(window.SpeechRecognition || window.webkitSpeechRecognition)
                    ? "Listening… words will appear as you speak."
                    : "Listening… Live preview every 15s. Use Chrome/Edge for real-time display."
                  }
                </span>
              : <span style={{ color:"var(--t3)", fontStyle:"italic" }}>Your speech will appear here after recording starts…</span>
            }
          </div>
          {/* Recording quality tip */}
          {recording && (
            <div style={{ marginTop:8, padding:"8px 12px", background:"var(--sky-light)", borderRadius:8, fontSize:12, color:"var(--sky)", display:"flex", gap:6, alignItems:"flex-start" }}>
              <span style={{ flexShrink:0 }}>ℹ</span>
              <span>Speak clearly and at a normal pace. The full transcript is captured accurately when you stop — live preview is an approximation every 15 seconds.</span>
            </div>
          )}
          <div style={{ marginTop:16 }}>
            <div className="divider"/>
            <div className="section-label" style={{ marginBottom:10 }}>Suggested Script</div>
            <LoanTypeScript loanType={loanType} applicantCategory={applicantCategory} />
          </div>
        </Card>
      </div>
      <ErrBox msg={err}/>
    </div>
  );
}

/* ─── SCREEN 6: REVIEW ───────────────────────────────────────────────────── */
function ReviewScreen({ sessionId, transcript, onNext, setExtracted, loanType }) {
  const [data,      setData]      = useState(null);
  const [panNumber, setPanNumber] = useState("");
  const [loading,   setLoading]   = useState(false);
  const [err,       setErr]       = useState("");

  useEffect(() => { if(transcript) extract(); }, []);

  async function extract() {
    if (!transcript?.trim()) { setErr("No transcript found. Please complete the video call first."); return; }
    setLoading(true); setErr("");
    try {
      const r = await fetch(`${API}/loan/${sessionId}/extract-data`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ transcript }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail||"Extraction failed");
      setData(d); setExtracted(d);
    } catch(e) { setErr(e.message); }
    setLoading(false);
  }

  const ext = data?.extracted||{};

  // ── Loan-type-specific field sets ─────────────────────────────────────────
  const inr = n => n ? `₹${Number(n).toLocaleString("en-IN")}` : null;
  const consent = v => v===true ? "Captured" : "Not captured";

  const FIELD_SETS = {
    default: [
      { key:"name",                    label:"Full Name",             icon:"👤" },
      { key:"employer",                label:"Employer",              icon:"🏢" },
      { key:"employment_type",         label:"Employment Type",       icon:"💼" },
      { key:"years_experience",        label:"Years at Company",      icon:"📅" },
      { key:"monthly_income",          label:"Monthly Income",        icon:"₹",  fmt:inr },
      { key:"loan_amount_requested",   label:"Loan Requested",        icon:"💰", fmt:inr },
      { key:"loan_purpose",            label:"Loan Purpose",          icon:"🎯" },
      { key:"declared_city",           label:"City",                  icon:"📍" },
      { key:"tenure_requested_months", label:"Tenure (months)",       icon:"⏱" },
      { key:"verbal_consent",          label:"Verbal Consent",        icon:"✅", fmt:consent },
    ],
    education_domestic: [
      { key:"name",                    label:"Student Name",          icon:"👤" },
      { key:"institution_name",        label:"Institution",           icon:"🏛️" },
      { key:"course_name",             label:"Course / Programme",    icon:"📚" },
      { key:"study_destination",       label:"Study Type",            icon:"🗺️" },
      { key:"guardian_name",           label:"Parent / Guardian Name",icon:"👨‍👩‍👧" },
      { key:"guardian_income",         label:"Guardian Monthly Income",icon:"₹", fmt:inr },
      { key:"loan_amount_requested",   label:"Education Loan Required",icon:"💰",fmt:inr },
      { key:"loan_purpose",            label:"Purpose",               icon:"🎯" },
      { key:"tenure_requested_months", label:"Tenure (months)",       icon:"⏱" },
      { key:"verbal_consent",          label:"Verbal Consent (Both)", icon:"✅", fmt:consent },
    ],
    education_international: [
      { key:"name",                    label:"Student Name",          icon:"👤" },
      { key:"institution_name",        label:"University (Abroad)",   icon:"🏛️" },
      { key:"course_name",             label:"Programme",             icon:"📚" },
      { key:"study_destination",       label:"Country / Destination", icon:"✈️" },
      { key:"guardian_name",           label:"Co-applicant Name",     icon:"👨‍👩‍👧" },
      { key:"guardian_income",         label:"Co-applicant Income",   icon:"₹", fmt:inr },
      { key:"loan_amount_requested",   label:"Loan Required",         icon:"💰", fmt:inr },
      { key:"tenure_requested_months", label:"Tenure (months)",       icon:"⏱" },
      { key:"verbal_consent",          label:"Verbal Consent",        icon:"✅", fmt:consent },
    ],
    professional: [
      { key:"name",                            label:"Full Name",           icon:"👤" },
      { key:"professional_registration_number",label:"Registration No.",    icon:"🪪" },
      { key:"professional_body",               label:"Professional Body",   icon:"🏛️" },
      { key:"employer",                        label:"Firm / Practice Name",icon:"🏢" },
      { key:"monthly_income",                  label:"Monthly Income",      icon:"₹", fmt:inr },
      { key:"loan_amount_requested",           label:"Loan Requested",      icon:"💰", fmt:inr },
      { key:"loan_purpose",                    label:"Purpose",             icon:"🎯" },
      { key:"declared_city",                   label:"City",                icon:"📍" },
      { key:"tenure_requested_months",         label:"Tenure (months)",     icon:"⏱" },
      { key:"verbal_consent",                  label:"Verbal Consent",      icon:"✅", fmt:consent },
    ],
    gold: [
      { key:"name",                    label:"Full Name",             icon:"👤" },
      { key:"gold_weight_grams",       label:"Gold Weight (grams)",   icon:"⚖️" },
      { key:"gold_purity_carats",      label:"Gold Purity (carats)",  icon:"🪙" },
      { key:"loan_amount_requested",   label:"Loan Requested",        icon:"💰", fmt:inr },
      { key:"declared_city",           label:"City",                  icon:"📍" },
      { key:"tenure_requested_months", label:"Tenure (months)",       icon:"⏱" },
      { key:"verbal_consent",          label:"Verbal Consent",        icon:"✅", fmt:consent },
    ],
    lap: [
      { key:"name",                     label:"Full Name",             icon:"👤" },
      { key:"property_type",            label:"Property Type",         icon:"🏗️" },
      { key:"property_ownership",       label:"Ownership",             icon:"📋" },
      { key:"property_estimated_value", label:"Property Value (Est.)", icon:"₹", fmt:inr },
      { key:"monthly_income",           label:"Monthly Income",        icon:"₹", fmt:inr },
      { key:"loan_amount_requested",    label:"Loan Requested",        icon:"💰", fmt:inr },
      { key:"tenure_requested_months",  label:"Tenure (months)",       icon:"⏱" },
      { key:"verbal_consent",           label:"Verbal Consent",        icon:"✅", fmt:consent },
    ],
    business: [
      { key:"name",                    label:"Applicant Name",         icon:"👤" },
      { key:"employer",                label:"Business Name",          icon:"🏢" },
      { key:"business_vintage_years",  label:"Business Vintage (yrs)", icon:"📅" },
      { key:"monthly_income",          label:"Monthly Turnover (Est)", icon:"₹", fmt:inr },
      { key:"loan_amount_requested",   label:"Loan Requested",         icon:"💰", fmt:inr },
      { key:"loan_purpose",            label:"Purpose",                icon:"🎯" },
      { key:"declared_city",           label:"City",                   icon:"📍" },
      { key:"tenure_requested_months", label:"Tenure (months)",        icon:"⏱" },
      { key:"verbal_consent",          label:"Verbal Consent",         icon:"✅", fmt:consent },
    ],
    pre_owned_car: [
      { key:"name",                    label:"Full Name",              icon:"👤" },
      { key:"vehicle_make_model",      label:"Vehicle Make / Model",   icon:"🚗" },
      { key:"vehicle_estimated_value", label:"Vehicle Value (Est.)",   icon:"₹", fmt:inr },
      { key:"monthly_income",          label:"Monthly Income",         icon:"₹", fmt:inr },
      { key:"loan_amount_requested",   label:"Loan Requested",         icon:"💰", fmt:inr },
      { key:"tenure_requested_months", label:"Tenure (months)",        icon:"⏱" },
      { key:"verbal_consent",          label:"Verbal Consent",         icon:"✅", fmt:consent },
    ],
    home: [
      { key:"name",                    label:"Full Name",              icon:"👤" },
      { key:"employer",                label:"Employer",               icon:"🏢" },
      { key:"employment_type",         label:"Employment Type",        icon:"💼" },
      { key:"monthly_income",          label:"Monthly Income",         icon:"₹", fmt:inr },
      { key:"loan_amount_requested",   label:"Loan Requested",         icon:"💰", fmt:inr },
      { key:"loan_purpose",            label:"Property Location/Use",  icon:"🏠" },
      { key:"declared_city",           label:"City",                   icon:"📍" },
      { key:"tenure_requested_months", label:"Tenure (months)",        icon:"⏱" },
      { key:"verbal_consent",          label:"Verbal Consent",         icon:"✅", fmt:consent },
    ],
  };

  const REQUIRED_KEYS = {
    default:                ["name","monthly_income","loan_amount_requested"],
    education_domestic:     ["name","institution_name","guardian_name","guardian_income","loan_amount_requested"],
    education_international:["name","institution_name","guardian_name","guardian_income","loan_amount_requested"],
    professional:           ["name","monthly_income","loan_amount_requested","professional_registration_number"],
    gold:                   ["name","gold_weight_grams","loan_amount_requested"],
    lap:                    ["name","property_estimated_value","loan_amount_requested"],
    business:               ["name","loan_amount_requested"],
    pre_owned_car:          ["name","monthly_income","loan_amount_requested"],
    home:                   ["name","monthly_income","loan_amount_requested"],
  };

  const fields  = FIELD_SETS[loanType] || FIELD_SETS.default;
  const reqKeys = REQUIRED_KEYS[loanType] || REQUIRED_KEYS.default;
  const missing = reqKeys.filter(k => !ext[k]);

  return (
    <div style={{ maxWidth:700, margin:"0 auto", padding:"40px 0" }}>
      <SectionHead sub="Review the information captured from your video conversation">Review Extracted Data</SectionHead>

      {loading && (
        <Card style={{ textAlign:"center", padding:56 }}>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:16 }}>
            <Spinner size={36}/><div>
              <div style={{ fontFamily:"var(--font-d)", fontSize:16, fontWeight:700, color:"var(--navy)", marginBottom:4 }}>Analysing conversation…</div>
              <div style={{ color:"var(--t2)", fontSize:13 }}>Smart extraction · Real-time processing</div>
            </div>
          </div>
        </Card>
      )}

      {data && !loading && (
        <Card glow>
          <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
            <span className={`tag ${missing.length===0?"tag-green":"tag-gold"}`}>{missing.length===0?"✓ All fields captured":`⚠ ${missing.length} field${missing.length>1?"s":""} missing`}</span>
            <span className={`tag ${ext.verbal_consent===true?"tag-sky":"tag-red"}`}>{ext.verbal_consent===true?"✓ Consent captured":"⚠ Consent not found"}</span>
            {(FIELD_SETS[loanType]) && <span className="tag tag-navy">{loanType?.replace(/_/g," ").toUpperCase()}</span>}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            {fields.map(({ key, label, icon, fmt }) => {
              const val     = ext[key];
              const display = fmt ? fmt(val) : (val!=null&&val!==false&&val!==""?String(val):null);
              const isMissing = reqKeys.includes(key) && !display;
              return (
                <div key={key} style={{ background:isMissing?"var(--red-light)":"var(--bg)", borderRadius:10, padding:"12px 14px", border:`1px solid ${isMissing?"rgba(211,47,47,0.2)":"var(--border)"}` }}>
                  <div className="section-label" style={{ marginBottom:4 }}>{icon} {label}</div>
                  <div style={{ fontSize:15, fontWeight:600, color:display?"var(--t1)":"var(--t3)" }}>
                    {display || <span style={{ fontStyle:"italic", color:"var(--t3)" }}>Not captured</span>}
                  </div>
                </div>
              );
            })}
          </div>
          {transcript && (
            <>
              <div className="divider" style={{ marginTop:20 }}/>
              <div className="section-label" style={{ marginBottom:8 }}>Original Transcript</div>
              <div style={{ fontSize:13, color:"var(--t2)", lineHeight:1.75, background:"var(--bg)", borderRadius:8, padding:14, border:"1px solid var(--border)" }}>{transcript}</div>
            </>
          )}
        </Card>
      )}

      {data && !loading && missing.length > 0 && (
        <Card style={{ marginTop:16, borderColor:"rgba(230,168,23,0.35)" }}>
          <div style={{ fontFamily:"var(--font-d)", fontWeight:700, fontSize:14, color:"var(--gold)", marginBottom:4 }}>
            ⚠ {missing.length} required field{missing.length>1?"s":""} not captured from transcript
          </div>
          <div style={{ fontSize:13, color:"var(--t2)", marginBottom:14, lineHeight:1.6 }}>
            These values were in your speech but could not be extracted automatically.
            You can type them in below and click Re-extract, or fill them here directly.
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            {missing.map(key => {
              const fieldMeta = fields.find(f => f.key === key);
              return (
                <div key={key}>
                  <div className="section-label" style={{ marginBottom:4 }}>{fieldMeta?.icon} {fieldMeta?.label || key.replace(/_/g," ")}</div>
                  <input
                    placeholder={`Enter ${fieldMeta?.label || key}…`}
                    onChange={e => {
                      // Patch the extracted data directly so confirm works
                      const val = e.target.value.trim();
                      if (data?.extracted) {
                        const num = Number(val.replace(/,/g,""));
                        data.extracted[key] = isNaN(num) || val === "" ? val : num;
                      }
                    }}
                    style={{ fontSize:14 }}
                  />
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {data && !loading && (
        <Card style={{ marginTop:16 }}>
          <div style={{ fontFamily:"var(--font-d)", fontWeight:700, fontSize:15, color:"var(--navy)", marginBottom:4 }}>
            {loanType?.includes("education") ? "Co-applicant / Guardian PAN for Credit Check" : "PAN Number for Credit Check"}
          </div>
          <div style={{ fontSize:13, color:"var(--t2)", marginBottom:12 }}>
            {loanType?.includes("education")
              ? "For education loans, CIBIL check is run on the guardian/co-applicant (parent) — enter their PAN, not the student's"
              : "Required for CIBIL score lookup before risk assessment"
            }
          </div>
          <input placeholder="e.g. ABCDE1234F" value={panNumber} onChange={e=>setPanNumber(e.target.value.toUpperCase())} style={{ letterSpacing:"2px", fontFamily:"var(--font-m)" }} maxLength={10}/>
        </Card>
      )}

      <ErrBox msg={err}/>
      {data && (
        <div style={{ display:"flex", gap:12, marginTop:20 }}>
          <button className="btn btn-ghost" onClick={extract} disabled={loading} style={{ flex:1 }}>↺ Re-extract</button>
          <button className="btn btn-primary" onClick={()=>onNext(panNumber)} style={{ flex:2 }} disabled={loading||!panNumber||panNumber.length<10}>
            Confirm & Assess Risk →
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── SCREEN 7: DECISION ─────────────────────────────────────────────────── */
function DecisionScreen({ sessionId, panNumber, onNext, setRiskData }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState("");

  useEffect(() => { assess(); }, []);

  async function assess() {
    setLoading(true); setErr("");
    try {
      const r = await fetch(`${API}/loan/${sessionId}/assess-risk`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ pan_number: panNumber }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail||"Risk assessment failed");
      setData(d); setRiskData(d);
    } catch(e) { setErr(e.message); }
    setLoading(false);
  }

  const rr       = data?.risk_result;
  const approved = data?.decision === "approved";
  const bandColor = {A:"var(--green)",B:"var(--sky)",C:"var(--gold)",D:"var(--red)"}[rr?.risk_band]||"var(--sky)";
  const bandBg    = {A:"var(--green-light)",B:"var(--sky-light)",C:"var(--gold-light)",D:"var(--red-light)"}[rr?.risk_band]||"var(--sky-light)";

  const Tile = ({ label, value, sub, accent }) => (
    <div style={{ background:"var(--bg)", borderRadius:12, padding:16, textAlign:"center", border:"1px solid var(--border)" }}>
      <div className="section-label" style={{ marginBottom:6 }}>{label}</div>
      <div style={{ fontFamily:"var(--font-d)", fontSize:20, fontWeight:800, color:accent||"var(--navy)" }}>{value}</div>
      {sub && <div style={{ fontSize:10, color:"var(--t3)", marginTop:3 }}>{sub}</div>}
    </div>
  );

  return (
    <div style={{ maxWidth:720, margin:"0 auto", padding:"40px 0" }}>
      <SectionHead sub="RBI-compliant credit evaluation · FOIR · Credit score · Income verification">Risk Assessment</SectionHead>

      {loading && (
        <Card style={{ textAlign:"center", padding:64 }}>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:20 }}>
            <div style={{ position:"relative", width:64, height:64 }}>
              <div style={{ position:"absolute", inset:0, borderRadius:"50%", border:"2px solid var(--border)" }}/>
              <div style={{ position:"absolute", inset:0, borderRadius:"50%", border:"2px solid transparent", borderTopColor:"var(--navy)", animation:"spinSlow 1s linear infinite" }}/>
              <div style={{ position:"absolute", inset:8, borderRadius:"50%", border:"2px solid transparent", borderTopColor:"var(--sky)", animation:"spinSlow 1.5s linear infinite reverse" }}/>
            </div>
            <div>
              <div style={{ fontFamily:"var(--font-d)", fontSize:17, fontWeight:700, color:"var(--navy)", marginBottom:6 }}>Evaluating your application…</div>
              <div style={{ color:"var(--t2)", fontSize:13, lineHeight:1.6 }}>Income assessment · Credit check · Rate pricing<br/>Eligibility calculation · Personalised offer</div>
            </div>
          </div>
        </Card>
      )}

      {data && !loading && rr && (
        <>
          {/* Decision banner */}
          <div style={{ marginBottom:20, borderRadius:16, padding:"24px 28px", background:approved?"var(--green-light)":"var(--red-light)", border:`1.5px solid ${approved?"rgba(0,166,81,0.3)":"rgba(211,47,47,0.3)"}`, display:"flex", alignItems:"center", gap:20 }}>
            <div style={{ width:60, height:60, borderRadius:"50%", flexShrink:0, background:"var(--white)", border:`2px solid ${approved?"rgba(0,166,81,0.4)":"rgba(211,47,47,0.4)"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, color:approved?"var(--green)":"var(--red)" }}>
              {approved?"✓":"✗"}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:"var(--font-d)", fontSize:24, fontWeight:900, color:approved?"var(--green)":"var(--red)", marginBottom:4 }}>
                Loan {approved?"Approved":"Rejected"}
              </div>
              <div style={{ color:"var(--t2)", fontSize:14 }}>
                {approved ? `Risk Band ${rr.risk_band} · ${rr.cibil_band}` : rr.rejection_reasons?.[0]||"Does not meet eligibility criteria"}
              </div>
              {data.persona && <div style={{ marginTop:6 }}><span className="tag tag-navy">{data.persona}</span></div>}
            </div>
            {approved && (
              <span style={{ background:bandBg, color:bandColor, border:`1.5px solid ${bandColor}44`, fontFamily:"var(--font-d)", fontWeight:800, fontSize:28, padding:"8px 20px", borderRadius:12 }}>
                Band {rr.risk_band}
              </span>
            )}
          </div>

          {approved && (
            <Card glow style={{ marginBottom:20 }}>
              <div style={{ fontFamily:"var(--font-d)", fontWeight:700, fontSize:16, marginBottom:16, color:"var(--navy)" }}>✦ Your Personalised Offer</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:12 }}>
                <Tile label="Loan Amount"  value={`₹${(rr.approved_loan_amount/100000).toFixed(1)}L`} accent="var(--navy)"/>
                <Tile label="Monthly EMI"  value={`₹${Math.round(rr.emi).toLocaleString("en-IN")}`}  accent="var(--sky)"/>
                <Tile label="Tenure"       value={`${rr.tenure_months} mo`}/>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
                <Tile label="Interest Rate"  value={`${rr.interest_rate}%`} sub="per annum"/>
                <Tile label="APR"           value={`${rr.apr?.toFixed(2)}%`}/>
                <Tile label="FOIR After"    value={`${rr.foir_after?.toFixed(1)}%`} sub="limit: 50%" accent={rr.foir_after>40?"var(--gold)":"var(--green)"}/>
              </div>
              <div style={{ marginTop:14, padding:"12px 16px", background:"var(--bg)", borderRadius:10, display:"flex", justifyContent:"space-between", border:"1px solid var(--border)" }}>
                <span style={{ fontSize:13, color:"var(--t2)" }}>Processing Fee (2%)</span>
                <span style={{ fontSize:13, fontWeight:600, color:"var(--navy)" }}>₹{Math.round(rr.processing_fee).toLocaleString("en-IN")}</span>
              </div>
              <div style={{ padding:"10px 16px", display:"flex", justifyContent:"space-between" }}>
                <span style={{ fontSize:13, color:"var(--t2)" }}>Total Repayment</span>
                <span style={{ fontSize:14, fontWeight:700, fontFamily:"var(--font-d)", color:"var(--navy)" }}>₹{Math.round(rr.total_repayment).toLocaleString("en-IN")}</span>
              </div>
            </Card>
          )}

          <Card style={{ marginBottom:16 }}>
            <div style={{ fontFamily:"var(--font-d)", fontWeight:700, fontSize:14, marginBottom:14, color:"var(--t2)" }}>Credit Bureau Profile</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
              <Tile label="CIBIL Score"  value={data.bureau?.cibil_score||"—"} accent={data.bureau?.cibil_score>=750?"var(--green)":"var(--gold)"}/>
              <Tile label="Active Loans" value={data.bureau?.active_loans??"—"}/>
              <Tile label="Enquiries 6m" value={data.bureau?.enquiries_6m??"—"}/>
            </div>
          </Card>

          {rr.rejection_reasons?.length>0 && (
            <Card danger style={{ marginBottom:12 }}>
              <div style={{ fontFamily:"var(--font-d)", fontWeight:700, fontSize:14, color:"var(--red)", marginBottom:12 }}>Rejection Reasons</div>
              {rr.rejection_reasons.map((r,i)=>(
                <div key={i} style={{ padding:"8px 0", fontSize:13, color:"var(--t2)", borderBottom:i<rr.rejection_reasons.length-1?"1px solid var(--border)":"none" }}>● {r}</div>
              ))}
            </Card>
          )}

          {rr.fraud_flags?.length>0 && (
            <Card warn>
              <div style={{ fontFamily:"var(--font-d)", fontWeight:700, fontSize:13, color:"var(--gold)", marginBottom:10 }}>⚠ Review Signals</div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {rr.fraud_flags.map((f,i)=><span key={i} className="tag tag-gold">{f}</span>)}
              </div>
            </Card>
          )}
        </>
      )}

      <ErrBox msg={err}/>
      {approved && (
        <button className="btn btn-primary btn-full btn-lg" onClick={onNext} style={{ marginTop:24 }}>Review Key Facts Statement →</button>
      )}
      {data && !approved && !loading && (
        <div style={{ textAlign:"center", marginTop:28, color:"var(--t2)", fontSize:14, lineHeight:1.8 }}>
          You may re-apply after 6 months or contact our support team.<br/>
          <span style={{ fontSize:11, color:"var(--t3)", fontFamily:"var(--font-m)" }}>Ref: #{sessionId?.slice(0,8)}</span>
        </div>
      )}
    </div>
  );
}

/* ─── SCREEN 8: KFS ──────────────────────────────────────────────────────── */
function KfsScreen({ sessionId, onNext }) {
  const [kfs,       setKfs]       = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [accepted,  setAccepted]  = useState(false);
  const [err,       setErr]       = useState("");

  useEffect(() => { fetchKfs(); }, []);

  async function fetchKfs() {
    setLoading(true); setErr("");
    try {
      const r = await fetch(`${API}/loan/${sessionId}/generate-kfs`, { method:"POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail||"KFS generation failed");
      setKfs(d.kfs);
    } catch(e) { setErr(e.message); }
    setLoading(false);
  }

  async function acceptKfs() {
    setAccepting(true); setErr("");
    try {
      const r = await fetch(`${API}/loan/${sessionId}/accept-kfs`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ confirmed:true }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail||"KFS acceptance failed");
      setAccepted(true); setTimeout(() => onNext(), 1200);
    } catch(e) { setErr(e.message); }
    setAccepting(false);
  }

  const Row = ({ label, value }) => (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", padding:"11px 0", borderBottom:"1px solid var(--border)" }}>
      <span style={{ color:"var(--t2)", fontSize:14 }}>{label}</span>
      <span style={{ color:"var(--t1)", fontSize:14, fontWeight:600, textAlign:"right", maxWidth:"55%" }}>{value}</span>
    </div>
  );

  const Section = ({ title, children }) => (
    <div style={{ marginBottom:24 }}>
      <div style={{ fontSize:11, color:"var(--navy)", fontFamily:"var(--font-m)", textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:12, fontWeight:600 }}>▸ {title}</div>
      {children}
    </div>
  );

  const ld = kfs?.loan_details, cd = kfs?.cost_details, fc = kfs?.fees_and_charges, br = kfs?.borrower_rights, ln = kfs?.lender;

  return (
    <div style={{ maxWidth:700, margin:"0 auto", padding:"40px 0" }}>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:8 }}>
        <h2 style={{ fontFamily:"var(--font-d)", fontSize:22, fontWeight:800, color:"var(--navy)" }}>Key Facts Statement</h2>
        <span className="tag tag-orange">RBI Mandated</span>
      </div>
      <p style={{ color:"var(--t2)", fontSize:14, marginBottom:28 }}>Read carefully before accepting. A 3-day cooling-off period applies post-disbursal.</p>

      {loading && <Card style={{ textAlign:"center", padding:48 }}><Spinner size={28}/></Card>}

      {kfs && !loading && (
        <Card glow>
          {/* Header */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24, paddingBottom:20, borderBottom:"1px solid var(--border)" }}>
            <div>
              <div style={{ fontFamily:"var(--font-d)", fontSize:18, fontWeight:800, color:"var(--navy)", marginBottom:4 }}>{ln?.name}</div>
              <div style={{ fontSize:11, color:"var(--t3)", fontFamily:"var(--font-m)" }}>RBI Reg: {ln?.rbi_registration}</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div className="section-label" style={{ marginBottom:3 }}>BORROWER</div>
              <div style={{ fontWeight:700, color:"var(--navy)" }}>{kfs.borrower_name}</div>
              <div style={{ fontSize:12, color:"var(--t2)", marginTop:2 }}>{kfs.loan_purpose}</div>
            </div>
          </div>

          <Section title="Loan Details">
            <Row label="Sanctioned Amount"   value={`₹${ld?.sanctioned_loan_amount_inr?.toLocaleString("en-IN")}`}/>
            <Row label="Disbursal Amount"    value={`₹${ld?.disbursal_amount_inr?.toLocaleString("en-IN")}`}/>
            <Row label="Tenure"              value={`${ld?.tenure_months} months`}/>
            <Row label="Type"                value={`${ld?.type} · ${ld?.rate_type} Rate`}/>
          </Section>
          <Section title="Cost of Loan">
            <Row label="Annual Interest Rate" value={`${cd?.annual_interest_rate_pct}%`}/>
            <Row label="APR (Effective)"      value={`${cd?.apr_pct?.toFixed(2)}%`}/>
            <Row label="Monthly EMI"          value={`₹${Math.round(cd?.emi_inr).toLocaleString("en-IN")}`}/>
            <Row label="Total Interest"       value={`₹${Math.round(cd?.total_interest_payable_inr).toLocaleString("en-IN")}`}/>
            <Row label="Total Amount Payable" value={`₹${Math.round(cd?.total_repayment_inr).toLocaleString("en-IN")}`}/>
          </Section>
          <Section title="Fees & Charges">
            <Row label="Processing Fee"       value={`₹${fc?.processing_fee_inr?.toLocaleString("en-IN")} (${fc?.processing_fee_pct}%)`}/>
            <Row label="Late Payment Penalty" value={`${fc?.late_payment_penalty_per_month_pct}% per month`}/>
            <Row label="Cheque Bounce"        value={`₹${fc?.cheque_bounce_charge_inr}`}/>
            <Row label="Prepayment Penalty"   value={fc?.prepayment_penalty||"NIL after 12 EMIs"}/>
            <Row label="Cancellation"         value={fc?.loan_cancellation_charge||"NIL within 3-day cooling-off"}/>
          </Section>
          <Section title="Your Rights">
            <Row label="Cooling-off Period" value={br?.cooling_off_period||"3 business days"}/>
            <Row label="Prepayment Right"   value={br?.prepayment_right||"Allowed after 12 EMIs"}/>
            <Row label="Data Rights"        value={br?.data_rights||"DPDP Act 2023 — right to erase"}/>
            <Row label="Grievance Portal"   value={<a href={ln?.rbi_sachet_link} target="_blank" rel="noreferrer" style={{ color:"var(--sky)", textDecoration:"none" }}>RBI Sachet ↗</a>}/>
          </Section>

          <div style={{ background:"var(--sky-light)", border:"1px solid var(--sky-mid)", borderRadius:12, padding:"16px 20px", marginBottom:24 }}>
            <div style={{ fontFamily:"var(--font-d)", fontWeight:700, fontSize:13, color:"var(--navy)", marginBottom:12 }}>By accepting, you confirm:</div>
            {["You have read and understood all terms in this KFS","You consent to credit bureau enquiry on your PAN","You authorise e-NACH mandate for automatic EMI deduction","You are aware of your 3-day cooling-off right post-disbursal","Your data is processed per DPDP Act 2023"].map((item,i)=>(
              <div key={i} style={{ display:"flex", gap:8, marginBottom:6, fontSize:13, color:"var(--t1)" }}><span style={{ color:"var(--green)" }}>✓</span>{item}</div>
            ))}
          </div>

          {accepted
            ? <OkBox msg="KFS accepted. Proceeding to audit trail…"/>
            : <button className="btn btn-primary btn-full btn-lg" onClick={acceptKfs} disabled={accepting}>
                {accepting ? <><Spinner size={18} color="#fff"/>Recording acceptance…</> : "I Accept the Key Facts Statement"}
              </button>
          }
        </Card>
      )}
      <ErrBox msg={err}/>
    </div>
  );
}

/* ─── SCREEN 9: AUDIT TRAIL ──────────────────────────────────────────────── */
function AuditScreen({ sessionId, onNext }) {
  const [events,  setEvents]  = useState([]);
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState("");

  useEffect(() => { fetchAudit(); }, []);

  async function fetchAudit() {
    setLoading(true); setErr("");
    try {
      const r = await fetch(`${API}/session/${sessionId}/audit`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail||"Audit fetch failed");
      setEvents(d.events||[]);
    } catch(e) { setErr(e.message); }
    setLoading(false);
  }

  function tagFor(et) {
    const u = (et||"").toUpperCase();
    if (u.includes("FAIL")||u.includes("REJECT")) return "tag-red";
    if (u.includes("WARN")||u.includes("FLAG"))   return "tag-gold";
    if (u.includes("PASS")||u.includes("VERIF")||u.includes("APPROV")||u.includes("ACCEPT")||u.includes("COMPLETE")) return "tag-green";
    return "tag-navy";
  }

  const dotColor = (tc) => ({ "tag-green":"var(--green)", "tag-red":"var(--red)", "tag-gold":"var(--gold)", "tag-navy":"var(--navy)" })[tc] || "var(--sky)";
  const successCount = events.filter(e=>tagFor(e.event_type)==="tag-green").length;

  return (
    <div style={{ maxWidth:720, margin:"0 auto", padding:"40px 0" }}>
      <SectionHead sub="Tamper-proof compliance log of your entire onboarding session">Audit Trail</SectionHead>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:24 }}>
        {[{label:"Events Logged",value:events.length,color:"var(--navy)"},{label:"Successful",value:successCount,color:"var(--green)"},{label:"Session ID",value:sessionId?.slice(0,8)+"…",color:"var(--sky)",mono:true}].map(({ label, value, color, mono }) => (
          <Card key={label} style={{ textAlign:"center", padding:16 }}>
            <div className="section-label" style={{ marginBottom:6 }}>{label}</div>
            <div style={{ fontFamily:mono?"var(--font-m)":"var(--font-d)", fontSize:mono?13:22, fontWeight:700, color }}>{value}</div>
          </Card>
        ))}
      </div>

      {loading && <Card style={{ textAlign:"center", padding:40 }}><Spinner size={24}/></Card>}

      <Card>
        {events.map((ev,i) => {
          const tc = tagFor(ev.event);
          const dc = dotColor(tc);
          return (
            <div key={i} style={{ display:"flex", gap:16, padding:"14px 0", borderBottom:i<events.length-1?"1px solid var(--border)":"none", animation:`fadeUp 0.3s ease ${Math.min(i*0.04,0.5)}s both` }}>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", paddingTop:4, width:16 }}>
                <div style={{ width:10, height:10, borderRadius:"50%", flexShrink:0, background:dc }}/>
                {i<events.length-1 && <div style={{ width:1, flex:1, background:"var(--border)", marginTop:6 }}/>}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:4 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontFamily:"var(--font-d)", fontWeight:700, fontSize:13, color:"var(--navy)" }}>{ev.event?.replace(/_/g," ")}</span>
                    <span className={`tag ${tc}`} style={{ fontSize:9 }}>{{ "tag-green":"OK","tag-red":"FAIL","tag-gold":"WARN","tag-navy":"INFO" }[tc]}</span>
                  </div>
                  <span style={{ fontSize:11, color:"var(--t3)", fontFamily:"var(--font-m)", whiteSpace:"nowrap" }}>
                    {ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : ""}
                  </span>
                </div>
                {ev.details && (
                  <div style={{ fontSize:12, color:"var(--t2)", lineHeight:1.5 }}>
                    {typeof ev.details==="string" ? ev.details : Object.entries(ev.details).slice(0,4).map(([k,v])=>`${k}: ${v}`).join(" · ")}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {events.length===0&&!loading && <div style={{ textAlign:"center", padding:32, color:"var(--t3)", fontSize:13 }}>No events found for this session.</div>}
      </Card>

      <ErrBox msg={err}/>

      <div style={{ marginTop:32, textAlign:"center" }}>
        <div style={{ display:"inline-flex", flexDirection:"column", alignItems:"center", gap:16, padding:"32px 48px", borderRadius:20, background:"linear-gradient(135deg, var(--navy) 0%, var(--navy-dark) 100%)", boxShadow:"var(--shadow-lg)" }}>
          <div style={{ width:64, height:64, borderRadius:"50%", background:"rgba(255,255,255,0.15)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:28 }}>✓</div>
          <div>
            <div style={{ fontFamily:"var(--font-d)", fontSize:22, fontWeight:800, color:"#fff", marginBottom:6 }}>Onboarding Complete</div>
            <div style={{ color:"rgba(255,255,255,0.7)", fontSize:14, lineHeight:1.7 }}>Loan application processed successfully.<br/>Disbursal to verified account within 24 hours per KFS terms.</div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <span className="tag" style={{ background:"rgba(255,255,255,0.15)", color:"rgba(255,255,255,0.9)", border:"1px solid rgba(255,255,255,0.2)" }}>Session Sealed</span>
            <span className="tag" style={{ background:"rgba(255,255,255,0.15)", color:"rgba(255,255,255,0.9)", border:"1px solid rgba(255,255,255,0.2)" }}>RBI Compliant</span>
            <span className="tag" style={{ background:"rgba(255,255,255,0.15)", color:"rgba(255,255,255,0.9)", border:"1px solid rgba(255,255,255,0.2)" }}>DPDP 2023</span>
          </div>
          {onNext && (
            <button className="btn" onClick={onNext}
              style={{ marginTop:20, background:"rgba(255,255,255,0.15)", color:"#fff", border:"1.5px solid rgba(255,255,255,0.3)", fontFamily:"var(--font-d)", fontWeight:700 }}>
              Download Application Summary →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


/* ─── FINAL SCREEN: APPLICATION SUMMARY ─────────────────────────────────── */
function SummaryScreen({ sessionId }) {
  const [loading, setLoading] = useState(false);
  const [opened,  setOpened]  = useState(false);

  function openSummary() {
    setLoading(true);
    const url = `${API}/loan/${sessionId}/application-summary`;
    window.open(url, "_blank");
    setTimeout(() => { setLoading(false); setOpened(true); }, 1000);
  }

  return (
    <div style={{ maxWidth:680, margin:"0 auto", padding:"40px 0" }}>
      <SectionHead sub="Your complete loan application record — download for your records">Application Summary</SectionHead>

      {/* Completion card */}
      <div style={{ borderRadius:20, overflow:"hidden", marginBottom:24 }}>
        <div style={{ background:"linear-gradient(135deg, var(--navy) 0%, var(--navy-dark) 100%)", padding:"40px 40px 32px", textAlign:"center" }}>
          <div style={{ width:72, height:72, borderRadius:"50%", background:"rgba(255,255,255,0.15)", border:"2px solid rgba(255,255,255,0.3)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:32, margin:"0 auto 16px" }}>✓</div>
          <div style={{ fontFamily:"var(--font-d)", fontSize:26, fontWeight:900, color:"#fff", marginBottom:8 }}>Onboarding Complete</div>
          <div style={{ color:"rgba(255,255,255,0.7)", fontSize:14, lineHeight:1.7, maxWidth:400, margin:"0 auto" }}>
            Your loan application has been processed and recorded per RBI Digital Lending Directions 2025.
          </div>
          <div style={{ display:"flex", gap:8, justifyContent:"center", marginTop:18, flexWrap:"wrap" }}>
            {["Session Sealed","RBI Compliant","DPDP 2023","KFS Accepted","Audit Logged"].map(t=>(
              <span key={t} style={{ background:"rgba(255,255,255,0.15)", color:"rgba(255,255,255,0.9)", border:"1px solid rgba(255,255,255,0.2)", borderRadius:20, padding:"4px 12px", fontSize:11, fontFamily:"var(--font-d)", fontWeight:600 }}>{t}</span>
            ))}
          </div>
        </div>
        <div style={{ background:"var(--white)", border:"1px solid var(--border)", borderTop:"none", padding:"24px 32px" }}>
          <div style={{ display:"flex", gap:16, alignItems:"flex-start" }}>
            <div style={{ width:40, height:40, borderRadius:10, background:"var(--sky-light)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:18 }}>📧</div>
            <div>
              <div style={{ fontFamily:"var(--font-d)", fontWeight:700, fontSize:14, color:"var(--navy)", marginBottom:3 }}>Status Email Sent</div>
              <div style={{ fontSize:13, color:"var(--t2)", lineHeight:1.6 }}>
                A loan decision notification has been sent to your registered email address with your offer details and reference number.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary download */}
      <Card style={{ marginBottom:16 }}>
        <div style={{ display:"flex", gap:16, alignItems:"center" }}>
          <div style={{ width:52, height:52, borderRadius:12, background:"var(--navy-light)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, flexShrink:0 }}>📄</div>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:"var(--font-d)", fontWeight:700, fontSize:15, color:"var(--navy)", marginBottom:3 }}>Complete Application Summary</div>
            <div style={{ fontSize:13, color:"var(--t2)", lineHeight:1.6 }}>
              Full record: applicant details, documents verified, face match, credit assessment, offer, KFS, audit trail. Open → Ctrl+P → Save as PDF.
            </div>
          </div>
        </div>
        <button className="btn btn-primary btn-full btn-lg" onClick={openSummary} disabled={loading}
          style={{ marginTop:16 }}>
          {loading
            ? <><Spinner size={18} color="#fff"/>Generating Summary…</>
            : opened
            ? "↺ Open Summary Again"
            : "📄 Download Application Summary"}
        </button>
        {opened && (
          <div style={{ marginTop:10, fontSize:12, color:"var(--t2)", textAlign:"center" }}>
            Summary opened in a new tab. Use <strong>Ctrl+P → Save as PDF</strong> to save it.
          </div>
        )}
      </Card>

      {/* What happens next */}
      <Card>
        <div style={{ fontFamily:"var(--font-d)", fontWeight:700, fontSize:15, color:"var(--navy)", marginBottom:16 }}>What happens next?</div>
        {[
          { icon:"⏱", title:"Within 2 hours",   body:"Your application is reviewed by our credit team." },
          { icon:"✉️", title:"Email notification",body:"You receive final confirmation email at your registered address." },
          { icon:"💳", title:"Within 24 hours",  body:"Approved loans are disbursed directly to your verified bank account per KFS terms." },
          { icon:"📱", title:"Track your loan",  body:"Visit poonawallafincorp.com → Login → Quick Pay to view and pay your EMIs." },
        ].map(({ icon, title, body }) => (
          <div key={title} style={{ display:"flex", gap:14, padding:"12px 0", borderBottom:"1px solid var(--border)" }}>
            <span style={{ fontSize:20, flexShrink:0, marginTop:2 }}>{icon}</span>
            <div>
              <div style={{ fontFamily:"var(--font-d)", fontWeight:700, fontSize:13, color:"var(--navy)", marginBottom:3 }}>{title}</div>
              <div style={{ fontSize:13, color:"var(--t2)", lineHeight:1.5 }}>{body}</div>
            </div>
          </div>
        ))}
        <div style={{ marginTop:12, padding:"12px 0" }}>
          <div style={{ fontFamily:"var(--font-d)", fontWeight:700, fontSize:13, color:"var(--navy)", marginBottom:6 }}>Need help?</div>
          <div style={{ fontSize:13, color:"var(--t2)" }}>📞 1800-266-6444 (Toll Free) · ✉ customercare@poonawallafincorp.com</div>
        </div>
      </Card>
    </div>
  );
}


/* ─── FLOATING CHATBOT ───────────────────────────────────────────────────── */
function ChatBot() {
  const [open,    setOpen]    = useState(false);
  const [msgs,    setMsgs]    = useState([
    { role:"assistant", text:"Hi! I'm Poonawalla Fincorp's AI assistant. Ask me anything about our loans, eligibility, interest rates, or this application process." }
  ]);
  const [input,   setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:"smooth"}); },[msgs]);

  async function send() {
    const q = input.trim(); if(!q) return;
    setInput(""); setLoading(true);
    const newMsgs = [...msgs, {role:"user",text:q}];
    setMsgs(newMsgs);
    try {
      // Route through backend — browsers cannot call Anthropic API directly (CORS)
      const r = await fetch(`${API}/loan/chat`, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          messages: newMsgs
            .filter((m,i) => !(m.role==="assistant" && i===0)) // skip system welcome
            .map(m=>({role: m.role==="assistant"?"assistant":"user", content: m.text}))
        })
      });
      if(!r.ok) throw new Error(`Backend error ${r.status}`);
      const d = await r.json();
      setMsgs(p=>[...p,{role:"assistant", text: d.reply || "I couldn't get a response. Please try again."}]);
    } catch(e) {
      console.error("[ChatBot]", e.message);
      setMsgs(p=>[...p,{role:"assistant", text:"I'm having trouble connecting right now. Please check that the backend server is running on port 8000."}]);
    }
    setLoading(false);
  }

  return (
    <>
      {/* Floating button */}
      <div onClick={()=>setOpen(o=>!o)} style={{
        position:"fixed",bottom:28,right:28,zIndex:9999,
        width:60,height:60,borderRadius:"50%",
        background:"linear-gradient(135deg,#1B2A6B,#0f1d55)",
        boxShadow:"0 6px 28px rgba(27,42,107,0.55)",
        cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",
        border:"2.5px solid rgba(255,255,255,0.2)",
        transition:"transform 0.2s,box-shadow 0.2s",
      }}
        onMouseEnter={e=>{e.currentTarget.style.transform="scale(1.1)";}}
        onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";}}>
        <span style={{fontSize:26}}>{open?"✕":"💬"}</span>
        {!open&&msgs.length===1&&<div style={{position:"absolute",top:-2,right:-2,width:16,height:16,borderRadius:"50%",background:"#F5881F",border:"2px solid #fff",animation:"pulse2 2s infinite"}}/>}
      </div>

      {/* Chat window */}
      {open&&(
        <div style={{
          position:"fixed",bottom:102,right:28,zIndex:9998,
          width:340,height:480,borderRadius:20,
          background:"#fff",boxShadow:"0 20px 60px rgba(0,0,0,0.2)",
          display:"flex",flexDirection:"column",overflow:"hidden",
          border:"1px solid var(--border)",animation:"fadeUp 0.25s ease"
        }}>
          {/* Header */}
          <div style={{background:"linear-gradient(135deg,#1B2A6B,#0f1d55)",padding:"16px 18px",display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:38,height:38,borderRadius:"50%",background:"rgba(255,255,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🤖</div>
            <div>
              <div style={{fontFamily:"var(--font-d)",fontWeight:800,fontSize:13,color:"#fff"}}>Poonawalla AI</div>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.6)",display:"flex",alignItems:"center",gap:4}}>
                <div style={{width:6,height:6,borderRadius:"50%",background:"#4CAF50"}}/>Online · Loan Advisor
              </div>
            </div>
          </div>

          {/* Messages */}
          <div style={{flex:1,overflowY:"auto",padding:"14px 14px 8px",display:"flex",flexDirection:"column",gap:10}}>
            {msgs.map((m,i)=>(
              <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
                <div style={{
                  maxWidth:"82%",padding:"10px 13px",fontSize:13,lineHeight:1.55,
                  borderRadius:m.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px",
                  background:m.role==="user"?"linear-gradient(135deg,#1B2A6B,#0f1d55)":"var(--bg)",
                  color:m.role==="user"?"#fff":"var(--t1)",
                  boxShadow:"0 1px 4px rgba(0,0,0,0.08)"
                }}>{m.text}</div>
              </div>
            ))}
            {loading&&<div style={{display:"flex",justifyContent:"flex-start"}}>
              <div style={{background:"var(--bg)",borderRadius:"16px 16px 16px 4px",padding:"10px 14px",fontSize:12,color:"var(--t3)"}}>
                <span>●</span><span style={{animationDelay:"0.2s"}}>●</span><span style={{animationDelay:"0.4s"}}>●</span>
              </div>
            </div>}
            <div ref={bottomRef}/>
          </div>

          {/* Quick prompts */}
          {msgs.length===1&&(
            <div style={{padding:"0 12px 8px",display:"flex",gap:6,flexWrap:"wrap"}}>
              {["What is my EMI?","Gold loan LTV?","Education loan eligibility?","How does Video KYC work?"].map(q=>(
                <button key={q} onClick={()=>{setInput(q);}} style={{background:"var(--sky-light)",border:"1px solid var(--sky-mid)",borderRadius:20,padding:"4px 10px",fontSize:10.5,color:"var(--sky)",cursor:"pointer",fontFamily:"var(--font-d)",fontWeight:600}}>{q}</button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{padding:"10px 12px",borderTop:"1px solid var(--border)",display:"flex",gap:8}}>
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!loading&&send()}
              placeholder="Ask about loans…" style={{flex:1,padding:"10px 14px",borderRadius:12,fontSize:13,border:"1.5px solid var(--border)"}}/>
            <button onClick={send} disabled={loading||!input.trim()} style={{width:40,height:40,borderRadius:12,background:"var(--navy)",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <span style={{color:"#fff",fontSize:16}}>↑</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── SAVE & RESUME ─────────────────────────────────────────────────────── */
const SAVE_KEY = "pfl_session_v1";

function saveProgress(sessionId, step, loanType, applicantCategory, emailHint) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      session_id:sessionId, step, loan_type:loanType,
      applicant_category:applicantCategory,
      email_hint: emailHint ? emailHint.slice(0,3)+"***" : "",
      saved_at: new Date().toISOString(),
    }));
  } catch(e) { console.warn("[Save] localStorage unavailable"); }
}

function loadSavedProgress() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if(!raw) return null;
    const d = JSON.parse(raw);
    // Expire after 7 days
    if(new Date() - new Date(d.saved_at) > 7*24*60*60*1000) { localStorage.removeItem(SAVE_KEY); return null; }
    return d;
  } catch(e) { return null; }
}

function clearSavedProgress() {
  try { localStorage.removeItem(SAVE_KEY); } catch(e){}
}

/* ─── SAVE BANNER (shown on inner screens) ─────────────────────────────── */
function SaveBanner({ sessionId, step, loanType, applicantCategory, email }) {
  const [saved, setSaved] = useState(false);
  function doSave() {
    saveProgress(sessionId, step, loanType, applicantCategory, email);
    setSaved(true);
    setTimeout(()=>setSaved(false), 3000);
  }
  return (
    <div style={{display:"flex",justifyContent:"flex-end",padding:"8px 0 0",position:"relative",zIndex:10}}>
      <button onClick={doSave} style={{background:saved?"var(--green-light)":"rgba(27,42,107,0.06)",border:`1px solid ${saved?"var(--green)":"var(--border)"}`,borderRadius:10,padding:"7px 14px",fontSize:12,color:saved?"var(--green)":"var(--t2)",cursor:"pointer",fontFamily:"var(--font-d)",fontWeight:600,display:"flex",alignItems:"center",gap:6,transition:"all 0.2s"}}>
        {saved?"✓ Progress Saved!":"💾 Save & Continue Later"}
      </button>
    </div>
  );
}



/* ─── REFER & EARN PAGE ─────────────────────────────────────────────────── */
function ReferAndEarnPage({ onClose }) {
  const [email,        setEmail]        = useState("");
  const [otp,          setOtp]          = useState("");
  const [otpSent,      setOtpSent]      = useState(false);
  const [agreed,       setAgreed]       = useState({tc:false, referral:false, contact:false});
  const [loading,      setLoading]      = useState(false);
  const [success,      setSuccess]      = useState(false);
  const [err,          setErr]          = useState("");
  const [referralLink, setReferralLink] = useState("");
  const [copied,       setCopied]       = useState(false);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  async function sendOtp() {
    if(!emailValid){ setErr("Please enter a valid email address"); return; }
    setLoading(true); setErr("");
    try {
      const res = await fetch(`${API}/refer/send-otp`, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      });
      const data = await res.json();
      if(!res.ok){ setErr(data.detail || "Email not found. Please use your registered email."); setLoading(false); return; }
      setOtpSent(true);
    } catch(e) {
      setErr("Network error. Please try again.");
    }
    setLoading(false);
  }

  async function submit() {
    if(!agreed.tc||!agreed.referral){ setErr("Please accept the required terms to continue"); return; }
    if(otp.length<6){ setErr("Please enter the 6-digit OTP sent to your email"); return; }
    setLoading(true); setErr("");
    try {
      const res = await fetch(`${API}/refer/verify-otp`, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ email: email.trim().toLowerCase(), otp: otp.trim() })
      });
      const data = await res.json();
      if(!res.ok){ setErr(data.detail || "Invalid OTP. Please check and try again."); setLoading(false); return; }
      setReferralLink(data.referral_link);
      setSuccess(true);
    } catch(e) {
      setErr("Network error. Please try again.");
    }
    setLoading(false);
  }

  const canSubmit = agreed.tc && agreed.referral && otp.length >= 6 && !loading;

  return (
    <div style={{position:"fixed",inset:0,zIndex:2000,background:"#fff",display:"flex",flexDirection:"column",overflowY:"auto"}}>
      {/* Nav bar */}
      <div style={{background:"#fff",borderBottom:"1px solid #e8eef8",padding:"0 40px",height:64,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:10,boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <img src="/poonawalla-logo.jpg" alt="P" style={{height:36,width:"auto",objectFit:"contain"}} onError={e=>e.target.style.display="none"}/>
          <div><div style={{fontFamily:"var(--font-d)",fontWeight:900,fontSize:12,color:"var(--navy)"}}>POONAWALLA</div><div style={{fontFamily:"var(--font-d)",fontWeight:600,fontSize:8,color:"var(--t3)",letterSpacing:"2px"}}>FINCORP</div></div>
        </div>
        <button onClick={onClose} style={{background:"none",border:"1.5px solid var(--border)",borderRadius:8,padding:"8px 16px",cursor:"pointer",fontFamily:"var(--font-d)",fontWeight:700,fontSize:12,color:"var(--t2)",display:"flex",alignItems:"center",gap:6}}>
          ← Back to Home
        </button>
      </div>

      {/* Main content: two columns */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",flex:1,minHeight:"calc(100vh - 64px)"}}>

        {/* LEFT — Hero image (full bleed) */}
        <div style={{position:"relative",background:"linear-gradient(135deg,#0052CC,#0078FF)",overflow:"hidden",minHeight:"calc(100vh - 64px)"}}>
          {/* Full-bleed background image */}
          <img
            src="/images/refer-earn.png"
            alt="Refer and Earn"
            style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",objectPosition:"center center",display:"block"}}
          />
          {/* Gradient overlay so text stays readable */}
          <div style={{position:"absolute",inset:0,background:"linear-gradient(160deg,rgba(0,40,160,0.72) 0%,rgba(0,60,200,0.45) 50%,rgba(0,0,80,0.55) 100%)"}}/>

          {/* Headline overlay */}
          <div style={{position:"relative",zIndex:2,padding:"48px 44px",display:"flex",flexDirection:"column",height:"100%"}}>
            <div style={{flex:1}}>
              <h1 style={{fontFamily:"var(--font-d)",fontSize:"clamp(26px,2.8vw,42px)",fontWeight:900,color:"#fff",lineHeight:1.1,marginBottom:14,letterSpacing:"-0.5px",textShadow:"0 2px 12px rgba(0,0,0,0.3)"}}>
                REFER AND START<br/>EARNING NOW!
              </h1>
              <p style={{color:"rgba(255,255,255,0.88)",fontSize:16,marginBottom:22,fontWeight:500}}>A simple referral can get you</p>
              {/* Category pills */}
              <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:32}}>
                {["Gadgets","Appliances","Vouchers","Travel","Apparels & more!"].map((item,i)=>(
                  <span key={item} style={{background:"rgba(255,255,255,0.18)",backdropFilter:"blur(8px)",border:"1px solid rgba(255,255,255,0.35)",borderRadius:20,padding:"6px 14px",color:"#fff",fontSize:12,fontFamily:"var(--font-d)",fontWeight:700,display:"flex",alignItems:"center",gap:5}}>
                    <span style={{width:6,height:6,borderRadius:"50%",background:["#4CAF50","#FF9800","#2196F3","#9C27B0","#F44336"][i],display:"inline-block"}}/>
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* Bottom decorative badges */}
            <div style={{display:"flex",gap:12,marginTop:"auto"}}>
              <div style={{background:"rgba(255,255,255,0.15)",backdropFilter:"blur(10px)",border:"1px solid rgba(255,255,255,0.25)",borderRadius:12,padding:"10px 16px",textAlign:"center"}}>
                <div style={{fontFamily:"var(--font-d)",fontSize:20,fontWeight:900,color:"#FFD700"}}>20,000</div>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.7)",fontFamily:"var(--font-d)",fontWeight:600}}>MAX COINS / REFERRAL</div>
              </div>
              <div style={{background:"rgba(255,255,255,0.15)",backdropFilter:"blur(10px)",border:"1px solid rgba(255,255,255,0.25)",borderRadius:12,padding:"10px 16px",textAlign:"center"}}>
                <div style={{fontFamily:"var(--font-d)",fontSize:20,fontWeight:900,color:"#FFD700"}}>4🪙 = ₹1</div>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.7)",fontFamily:"var(--font-d)",fontWeight:600}}>COIN VALUE</div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — Form */}
        <div style={{background:"#f0f5ff",display:"flex",alignItems:"center",justifyContent:"center",padding:"48px 56px"}}>
          <div style={{width:"100%",maxWidth:460}}>

            {success ? (
              <div style={{textAlign:"center",padding:"40px 20px"}}>
                <div style={{fontSize:64,marginBottom:20}}>🎉</div>
                <div style={{fontFamily:"var(--font-d)",fontSize:24,fontWeight:900,color:"var(--navy)",marginBottom:12}}>Referral Registered!</div>
                <p style={{color:"var(--t2)",fontSize:15,lineHeight:1.7,marginBottom:28}}>Thank you! Your referral has been submitted. You'll earn coins when your referee completes their first loan disbursement.</p>
                <div style={{background:"var(--sky-light)",border:"1px solid var(--sky-mid)",borderRadius:14,padding:"18px 22px",marginBottom:16}}>
                  <div style={{fontSize:11,color:"var(--sky)",fontFamily:"var(--font-d)",fontWeight:700,marginBottom:4}}>YOUR REFERRAL LINK</div>
                  <div style={{fontFamily:"var(--font-m)",fontSize:12,color:"var(--navy)",background:"#fff",borderRadius:8,padding:"8px 12px",border:"1px solid var(--border)",wordBreak:"break-all"}}>
                    {referralLink}
                  </div>
                </div>
                {/* Floating toast - appears at bottom of screen when link is copied */}
                {copied && (
                  <div style={{position:"fixed",bottom:32,left:"50%",transform:"translateX(-50%)",background:"#1B2A6B",color:"#fff",padding:"12px 24px",borderRadius:10,fontSize:14,fontFamily:"var(--font-d)",fontWeight:700,boxShadow:"0 4px 20px rgba(0,0,0,0.2)",zIndex:9999,display:"flex",alignItems:"center",gap:8,animation:"fadeUp 0.25s ease"}}>
                    Referral link copied to clipboard!
                  </div>
                )}

                <div style={{display:"flex",gap:10,marginBottom:28,position:"relative"}}>
                  <button onClick={()=>{navigator.clipboard.writeText(referralLink);setCopied(true);setTimeout(()=>setCopied(false),2500);}}
                    style={{flex:1,padding:"10px",background:copied?"var(--green)":"var(--navy)",color:"#fff",border:"none",borderRadius:8,fontFamily:"var(--font-d)",fontWeight:700,fontSize:12,cursor:"pointer",transition:"background 0.2s",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                    {copied ? <>✅ Copied!</> : <>📋 Copy Link</>}
                  </button>
                  <a href={`https://wa.me/?text=Apply%20for%20a%20loan%20at%20Poonawalla%20Fincorp!%20Use%20my%20link:%20${encodeURIComponent(referralLink)}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{flex:1,padding:"10px",background:"#25D366",color:"#fff",border:"none",borderRadius:8,fontFamily:"var(--font-d)",fontWeight:700,fontSize:12,cursor:"pointer",textDecoration:"none",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                    💬 Share on WhatsApp
                  </a>
                </div>
                <button className="btn btn-primary btn-full" onClick={onClose}>← Back to Home</button>
              </div>
            ) : (
              <>
                <div style={{fontFamily:"var(--font-d)",fontWeight:900,fontSize:22,color:"var(--navy)",marginBottom:6}}>EARN UP TO 20,000 COINS</div>
                <div style={{fontFamily:"var(--font-d)",fontWeight:900,fontSize:22,color:"var(--navy)",marginBottom:8}}>ON SUCCESSFUL REFERRALS</div>
                <p style={{color:"var(--t2)",fontSize:13,marginBottom:28}}>Exclusive to Poonawalla Fincorp customers only</p>

                {/* How it works steps */}
                <div style={{display:"flex",gap:0,marginBottom:28,background:"#fff",borderRadius:14,overflow:"hidden",border:"1px solid var(--border)"}}>
                  {[{n:"1",t:"Share link",i:"🔗"},{n:"2",t:"Friend applies",i:"📝"},{n:"3",t:"Loan disbursed",i:"💰"},{n:"4",t:"Earn coins!",i:"🏆"}].map((s,idx)=>(
                    <div key={s.n} style={{flex:1,padding:"14px 8px",textAlign:"center",borderRight:idx<3?"1px solid var(--border)":"none"}}>
                      <div style={{fontSize:20,marginBottom:4}}>{s.i}</div>
                      <div style={{fontFamily:"var(--font-d)",fontWeight:800,fontSize:9,color:"var(--navy)",marginBottom:2}}>STEP {s.n}</div>
                      <div style={{fontSize:10,color:"var(--t2)",fontWeight:500}}>{s.t}</div>
                    </div>
                  ))}
                </div>

                <div style={{fontFamily:"var(--font-d)",fontWeight:700,fontSize:14,color:"var(--navy)",marginBottom:16}}>Enter Your Details</div>

                {/* Email input */}
                <div style={{marginBottom:14}}>
                  <div style={{position:"relative",display:"flex",gap:0}}>
                    <input
                      type="email" placeholder="Registered Email Address" value={email}
                      onChange={e=>setEmail(e.target.value)}
                      style={{flex:1,borderRadius:otpSent?"8px 8px 0 0":"8px",background:"#fff",border:"1.5px solid var(--border)",padding:"13px 16px",fontSize:14}}
                      disabled={otpSent}
                    />
                    {!otpSent && (
                      <button onClick={sendOtp} disabled={loading||!emailValid}
                        style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"var(--navy)",color:"#fff",border:"none",borderRadius:6,padding:"6px 14px",fontSize:11,fontFamily:"var(--font-d)",fontWeight:700,cursor:"pointer",opacity:!emailValid?0.4:1}}>
                        {loading?"Sending…":"Get OTP"}
                      </button>
                    )}
                  </div>
                  {otpSent && (
                    <>
                      <input type="text" placeholder="Enter 6-digit OTP" value={otp}
                        onChange={e=>setOtp(e.target.value.replace(/\D/g,"").slice(0,6))}
                        maxLength={6}
                        style={{width:"100%",borderRadius:"0 0 8px 8px",background:"#fff",border:"1.5px solid var(--navy)",borderTop:"none",padding:"13px 16px",fontSize:16,letterSpacing:"8px",textAlign:"center",fontFamily:"var(--font-m)"}}/>
                      <div style={{marginTop:8,padding:"8px 12px",background:"#f0f5ff",border:"1px solid var(--border)",borderRadius:8,display:"flex",alignItems:"center",gap:8}}>
                        <span style={{fontSize:13}}>📧</span>
                        <span style={{fontSize:12,color:"var(--t2)",flex:1}}>OTP sent to <strong>{email}</strong>. Valid for 10 minutes.</span>
                        <button onClick={sendOtp} disabled={loading}
                          style={{background:"none",border:"none",color:"var(--sky)",fontSize:12,fontFamily:"var(--font-d)",fontWeight:700,cursor:"pointer",padding:0,whiteSpace:"nowrap"}}>
                          Resend
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Checkboxes */}
                <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:24}}>
                  {[
                    {key:"tc",     text:<>I agree to the <span style={{color:"var(--sky)",textDecoration:"underline",cursor:"pointer"}}>Terms & Conditions, Privacy Policy of PFL</span> and have read/understood approach for <span style={{color:"var(--sky)",textDecoration:"underline",cursor:"pointer"}}>gradation of risk</span></>},
                    {key:"referral",text:<>I agree to the <span style={{color:"var(--sky)",textDecoration:"underline",cursor:"pointer"}}>Referral Terms & Conditions</span></>},
                    {key:"contact", text:"I agree to be contacted via e-mail, phone call, SMS, WhatsApp and/or any other mode (this shall override any registration for DNC/NDNC)."},
                  ].map(({key,text})=>(
                    <label key={key} style={{display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer"}}>
                      <div onClick={()=>setAgreed(a=>({...a,[key]:!a[key]}))}
                        style={{width:18,height:18,borderRadius:4,border:`2px solid ${agreed[key]?"var(--navy)":"var(--border-mid)"}`,background:agreed[key]?"var(--navy)":"#fff",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",marginTop:1,cursor:"pointer"}}>
                        {agreed[key]&&<span style={{color:"#fff",fontSize:11,fontWeight:900}}>✓</span>}
                      </div>
                      <span style={{fontSize:12,color:"var(--t2)",lineHeight:1.6}}>{text}</span>
                    </label>
                  ))}
                </div>

                {err&&<div style={{background:"rgba(211,47,47,0.08)",border:"1px solid rgba(211,47,47,0.25)",borderRadius:8,padding:"8px 12px",color:"#D32F2F",fontSize:12,marginBottom:14}}>⚠ {err}</div>}

                <button onClick={otpSent?submit:sendOtp} disabled={otpSent?!canSubmit:loading||!emailValid}
                  style={{width:"100%",padding:"14px",background:canSubmit||((!otpSent)&&emailValid)?"var(--navy)":"#BDC3D8",color:"#fff",border:"none",borderRadius:10,fontFamily:"var(--font-d)",fontWeight:800,fontSize:14,cursor:canSubmit||((!otpSent)&&emailValid)?"pointer":"not-allowed",letterSpacing:"1px",transition:"background 0.2s"}}>
                  {loading?"Please wait…":otpSent?"SUBMIT →":"GET OTP →"}
                </button>

                <div style={{marginTop:20,background:"#fff",borderRadius:12,padding:"14px 16px",border:"1px solid var(--border)",display:"flex",gap:10,alignItems:"flex-start"}}>
                  <span style={{fontSize:18,flexShrink:0}}>ℹ️</span>
                  <div style={{fontSize:11,color:"var(--t2)",lineHeight:1.6}}>
                    Coins earned are credited after successful loan disbursement to your referee. Coins can be redeemed for rewards in the PFL app. 4 Coins = ₹1 value.
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── ROOT APP ───────────────────────────────────────────────────────────── */
export default function App() {
  const [step,       setStep]       = useState(0);
  const [sessionId,  setSessionId]  = useState(null);
  const [loanType,   setLoanType]   = useState("personal");
  const [applicantCategory, setApplicantCategory] = useState("salaried");
  const [transcript, setTranscript] = useState("");
  const [extracted,  setExtracted]  = useState(null);
  const [riskData,   setRiskData]   = useState(null);
  const [panNumber,  setPanNumber]  = useState("");

  const next = (arg1, arg2) => {
    // Screen 0 (Landing) may pass preselected loan type from card click
    if (step === 0 && arg1 && typeof arg1 === "string" && !arg2) {
      setLoanType(arg1); // pre-fill loan type in selector screen
    }
    // Screen 1 (LoanSelector) passes (loanType, category)
    if (step === 1 && typeof arg1 === "string" && typeof arg2 === "string") {
      setLoanType(arg1); setApplicantCategory(arg2);
    }
    // Screen 6 (Review) passes panNumber
    if (step === 6 && typeof arg1 === "string" && arg1.length === 10) setPanNumber(arg1);
    setStep(s => s + 1);
  };

  const screens = [
    <LandingScreen      onNext={next}  setSessionId={setSessionId} />,
    <LoanSelectorScreen sessionId={sessionId} onNext={next} preSelectedLoanType={loanType} />,
    <KycScreen          sessionId={sessionId} onNext={next} loanType={loanType} applicantCategory={applicantCategory} />,
    <LivenessScreen     sessionId={sessionId} onNext={next} />,
    <FaceMatchScreen    sessionId={sessionId} onNext={next} />,
    <VideoCallScreen    sessionId={sessionId} onNext={next} setTranscript={setTranscript} loanType={loanType} applicantCategory={applicantCategory} />,
    <ReviewScreen       sessionId={sessionId} transcript={transcript} onNext={next} setExtracted={setExtracted} loanType={loanType} />,
    <DecisionScreen     sessionId={sessionId} panNumber={panNumber} onNext={next} setRiskData={setRiskData} />,
    <KfsScreen          sessionId={sessionId} onNext={next} />,
    <AuditScreen        sessionId={sessionId} onNext={next} />,
    <SummaryScreen      sessionId={sessionId} />,
  ];

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <div style={{ minHeight:"100vh", position:"relative" }}>
        {step > 0 && <TopNav step={step} sessionId={sessionId}/>}
        <div className={step > 0 ? "inner-page-bg" : ""} style={{ position:"relative" }}>
          <div style={{ maxWidth: step===0 ? "100%" : 1100, margin:"0 auto", padding: step===0 ? 0 : "0 32px 80px", position:"relative", zIndex:1 }}>
            {step > 0 && step < 10 && sessionId && (
              <SaveBanner sessionId={sessionId} step={step} loanType={loanType} applicantCategory={applicantCategory} email={""}/>
            )}
            {screens[step]}
          </div>
        </div>
        <ChatBot/>
      </div>
    </>
  );
}