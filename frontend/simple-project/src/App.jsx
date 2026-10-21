import React, { useState, useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

// ╔══════════════════════════════════════════════════════════════╗
//   SYMPTOMLENS AI — SECURE AUTH VERSION
//   Replace your entire App.jsx with this file.
//   All other screens remain identical.
//   Only the AUTH screen is upgraded with:
//   ✅ Real email format validation
//   ✅ Password strength meter (Weak/Fair/Strong/Very Strong)
//   ✅ Confirm password field on signup
//   ✅ Name validation (letters only, no numbers)
//   ✅ Local user database (localStorage)
//   ✅ Duplicate email detection
//   ✅ Wrong password / email not found errors
//   ✅ Show / Hide password toggle
//   ✅ Login attempt lockout (3 fails = 30s cooldown)
//   ✅ Forgot password flow (reset via stored data)
// ╚══════════════════════════════════════════════════════════════╝

const API = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

const T = {
  bg:"#030B14", bgCard:"#071626", bgPanel:"#0B1F33",
  bgGlass:"rgba(7,22,38,0.88)",
  cyan:"#00D4FF", cyanDim:"#00A8CC", teal:"#00FFB2", tealDim:"#00CC8E",
  red:"#FF3B5C", orange:"#FF8040", yellow:"#FFD200",
  green:"#00E87A", white:"#EEF6FF", silver:"#A8C0D8",
  muted:"#4A6A8A", border:"#0E2540", borderHi:"#1A3A5C",
  glow:"0 0 20px rgba(0,212,255,0.3)",
  glowHard:"0 0 42px rgba(0,212,255,0.6)",
};

const ORGANS = {
  Brain:       { hex:"#D4637A", three:0xD4637A, system:"Neurological",   emoji:"🧠", label:"Brain"           },
  Heart:       { hex:"#CC1E35", three:0xCC1E35, system:"Cardiovascular", emoji:"❤️", label:"Heart"           },
  Lungs:       { hex:"#C05070", three:0xC05070, system:"Respiratory",    emoji:"🫁", label:"Lungs"           },
  Liver:       { hex:"#8B2200", three:0x8B2200, system:"Digestive",      emoji:"🫀", label:"Liver"           },
  Stomach:     { hex:"#CC7755", three:0xCC7755, system:"Digestive",      emoji:"🫃", label:"Stomach"         },
  Kidneys:     { hex:"#AA2828", three:0xAA2828, system:"Renal",          emoji:"🫘", label:"Kidneys"         },
  SmallInt:    { hex:"#E89078", three:0xE89078, system:"Digestive",      emoji:"🌀", label:"Small Intestine" },
  LargeInt:    { hex:"#C85840", three:0xC85840, system:"Digestive",      emoji:"〰️", label:"Large Intestine" },
  Gallbladder: { hex:"#4A8A30", three:0x4A8A30, system:"Digestive",      emoji:"💚", label:"Gallbladder"     },
  Spleen:      { hex:"#8B3050", three:0x8B3050, system:"Immune",         emoji:"🫐", label:"Spleen"          },
  Bladder:     { hex:"#D8C060", three:0xD8C060, system:"Renal",          emoji:"🫧", label:"Bladder"         },
  Spine:       { hex:"#C8B880", three:0xC8B880, system:"Skeletal",       emoji:"🦴", label:"Spine"           },
  Pancreas:    { hex:"#D4A060", three:0xD4A060, system:"Endocrine",      emoji:"🍂", label:"Pancreas"        },
  Skin:        { hex:"#F08FA5", three:0xF08FA5, system:"Integumentary",   emoji:"🧴", label:"Skin / Face"      },
  Pelvic:      { hex:"#00D4FF", three:0x00D4FF, system:"Reproductive / Pelvic", emoji:"🌸", label:"Pelvic Region" },
  Joints:      { hex:"#8BB8FF", three:0x8BB8FF, system:"Musculoskeletal", emoji:"🦴", label:"Joints / Musculoskeletal" },
  Uterus:      { hex:"#E58AA8", three:0xE58AA8, system:"Reproductive",    emoji:"🌸", label:"Uterus" },
  Ovaries:     { hex:"#C97BCB", three:0xC97BCB, system:"Reproductive",    emoji:"🟣", label:"Ovaries" },
  Testes:      { hex:"#B99A6B", three:0xB99A6B, system:"Reproductive",    emoji:"⚕️", label:"Testes" },
  Prostate:    { hex:"#C68A6B", three:0xC68A6B, system:"Reproductive",    emoji:"⚕️", label:"Prostate" },
};

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  html,body,#root{height:100%}
  body{background:${T.bg};font-family:'Sora',sans-serif;color:${T.white};overflow-x:hidden;-webkit-font-smoothing:antialiased}
  ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:${T.bgPanel}}::-webkit-scrollbar-thumb{background:${T.cyanDim};border-radius:5px}
  @keyframes fadeUp{from{opacity:0;transform:translateY(26px)}to{opacity:1;transform:translateY(0)}}
  @keyframes scaleIn{from{opacity:0;transform:scale(.93)}to{opacity:1;transform:scale(1)}}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.95)}}
  @keyframes scanline{0%{top:-2px}100%{top:100vh}}
  @keyframes orbFloat{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-16px) scale(1.04)}}
  @keyframes dotPulse{0%,100%{opacity:.25;transform:scale(.75)}50%{opacity:1;transform:scale(1.1)}}
  @keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}
  @keyframes countdown{from{width:100%}to{width:0%}}
  .fu{animation:fadeUp .5s ease forwards}
  .fu1{animation:fadeUp .5s .1s ease both}
  .fu2{animation:fadeUp .5s .2s ease both}
  .fu3{animation:fadeUp .5s .3s ease both}
  .fu4{animation:fadeUp .5s .4s ease both}
  .fu5{animation:fadeUp .5s .5s ease both}
  .si{animation:scaleIn .4s ease forwards}
  .shake{animation:shake .4s ease}
  .scanline{position:fixed;left:0;right:0;height:3px;z-index:9999;pointer-events:none;background:linear-gradient(90deg,transparent,${T.cyan}55,transparent);animation:scanline 6s linear infinite}
  .grid-bg{background-image:linear-gradient(${T.border}66 1px,transparent 1px),linear-gradient(90deg,${T.border}66 1px,transparent 1px);background-size:48px 48px}
  .glass{background:${T.bgGlass};backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
  .btn{font-family:'Sora',sans-serif;font-weight:700;font-size:15px;border:none;border-radius:12px;cursor:pointer;transition:all .2s;letter-spacing:.3px;display:inline-flex;align-items:center;justify-content:center;gap:8px}
  .btn-primary{background:linear-gradient(135deg,${T.cyan},${T.teal});color:${T.bg};padding:14px 32px}
  .btn-primary:hover:not(:disabled){transform:translateY(-2px);box-shadow:${T.glowHard}}
  .btn-primary:disabled{opacity:.4;cursor:not-allowed}
  .btn-outline{background:transparent;color:${T.cyan};border:1px solid ${T.border};padding:12px 24px}
  .btn-outline:hover{border-color:${T.cyan};box-shadow:${T.glow}}
  .btn-sm{font-size:13px;padding:9px 18px;border-radius:9px}
  .inp{background:${T.bgPanel};border:1px solid ${T.border};border-radius:11px;color:${T.white};font-family:'Sora',sans-serif;font-size:15px;padding:13px 17px;width:100%;transition:all .2s;outline:none}
  .inp:focus{border-color:${T.cyan};box-shadow:${T.glow}}
  .inp::placeholder{color:${T.muted}}
  input[type="password"]::-ms-reveal,input[type="password"]::-ms-clear{display:none}
  .inp-err{border-color:${T.red} !important;box-shadow:0 0 12px rgba(255,59,92,0.25) !important}
  .inp-ok{border-color:${T.teal} !important}
  .inp-label{font-size:11px;font-weight:600;color:${T.muted};text-transform:uppercase;letter-spacing:1.2px;font-family:'JetBrains Mono',monospace;margin-bottom:7px;display:block}
  .card{background:${T.bgCard};border:1px solid ${T.border};border-radius:18px;padding:26px}
  .tag{display:inline-flex;align-items:center;gap:5px;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;font-family:'JetBrains Mono',monospace}
  .chip{background:${T.bgPanel};border:1px solid ${T.border};border-radius:20px;padding:7px 14px;font-size:12px;color:${T.silver};cursor:pointer;transition:all .18s;font-family:'Sora',sans-serif}
  .chip:hover{border-color:${T.cyan};color:${T.cyan}}
  .prob-track{background:${T.bgPanel};border-radius:6px;height:7px;overflow:hidden}
  .prob-fill{height:100%;border-radius:6px;transition:width 1.2s cubic-bezier(.4,0,.2,1)}
  .step-dot{width:9px;height:9px;border-radius:50%;background:${T.border};transition:all .3s}
  .step-dot.active{background:${T.cyan};box-shadow:${T.glow}}
  .step-dot.done{background:${T.teal}}
`;

// ╔══════════════════════════════════════════════════════════════╗
//   SECURE AUTH UTILITIES
// ╚══════════════════════════════════════════════════════════════╝

// ── Local "database" using localStorage ──────────────────────────────────────
const DB = {
  getUsers: () => {
    try {
      const parsed = JSON.parse(localStorage.getItem("sl_users") || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch { return {}; }
  },
  saveUser: (email, data) => {
    const users = DB.getUsers();
    users[String(email || "").trim().toLowerCase()] = data;
    localStorage.setItem("sl_users", JSON.stringify(users));
  },
  getUser: (email) => DB.getUsers()[String(email || "").trim().toLowerCase()] || null,
  userExists: (email) => !!DB.getUser(email),
};

// ── Attempt tracking ──────────────────────────────────────────────────────────
const ATTEMPTS = {
  get: (email) => { try { return JSON.parse(localStorage.getItem(`sl_att_${email}`) || '{"count":0,"lockedUntil":0}'); } catch { return {count:0,lockedUntil:0}; } },
  set: (email, data) => localStorage.setItem(`sl_att_${email}`, JSON.stringify(data)),
  increment: (email) => {
    const a = ATTEMPTS.get(email);
    a.count += 1;
    if (a.count >= 3) a.lockedUntil = Date.now() + 30000; // 30s lockout
    ATTEMPTS.set(email, a);
    return a;
  },
  reset: (email) => ATTEMPTS.set(email, { count: 0, lockedUntil: 0 }),
  isLocked: (email) => {
    const a = ATTEMPTS.get(email);
    return a.lockedUntil > Date.now();
  },
  secondsLeft: (email) => {
    const a = ATTEMPTS.get(email);
    return Math.ceil((a.lockedUntil - Date.now()) / 1000);
  },
};

// ── Simple hash (good enough for localStorage demo) ───────────────────────────
const hashPass = (password) => {
  let hash = 0;
  const salt = "sl_s3cur3_s4lt_2026";
  const str = password + salt;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(16);
};

// ── Validators ────────────────────────────────────────────────────────────────
const V = {
  email: (v) => {
    if (!v) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Enter a valid email address (e.g. name@gmail.com)";
    return "";
  },
  name: (v) => {
    if (!v) return "Full name is required";
    if (v.trim().length < 2) return "Name must be at least 2 characters";
    if (/\d/.test(v)) return "Name cannot contain numbers";
    if (!/^[a-zA-Z\s'-]+$/.test(v)) return "Name can only contain letters, spaces, hyphens, apostrophes";
    return "";
  },
  password: (v) => {
    if (!v) return "Password is required";
    if (v.length < 8) return "Password must be at least 8 characters";
    if (!/[A-Z]/.test(v)) return "Must contain at least one uppercase letter (A-Z)";
    if (!/[a-z]/.test(v)) return "Must contain at least one lowercase letter (a-z)";
    if (!/[0-9]/.test(v)) return "Must contain at least one number (0-9)";
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(v)) return "Must contain at least one special character (!@#$...)";
    return "";
  },
  confirmPassword: (v, pass) => {
    if (!v) return "Please confirm your password";
    if (v !== pass) return "Passwords do not match";
    return "";
  },
};

// ── Password strength calculator ──────────────────────────────────────────────
function getStrength(password) {
  if (!password) return { score: 0, label: "", color: T.border };
  let score = 0;
  if (password.length >= 8)  score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score++;

  if (score <= 2) return { score, label: "Weak",        color: T.red,    pct: 25  };
  if (score <= 3) return { score, label: "Fair",        color: T.orange, pct: 50  };
  if (score <= 4) return { score, label: "Strong",      color: T.yellow, pct: 75  };
  return           { score, label: "Very Strong",  color: T.teal,   pct: 100 };
}

// ── Password field with show/hide ─────────────────────────────────────────────
function PasswordInput({ label, value, onChange, error, placeholder = "Password", showStrength = false }) {
  const [show, setShow] = useState(false);
  const strength = showStrength ? getStrength(value) : null;

  return (
    <div>
      <label className="inp-label">{label}</label>
      <div style={{ position: "relative" }}>
        <input
          className={`inp ${error ? "inp-err" : value && !error ? "inp-ok" : ""}`}
          type={show ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          style={{ paddingRight: 48 }}
          autoComplete="off"
        />
        {/* Show/Hide toggle */}
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 18, padding: 0 }}
          title={show ? "Hide password" : "Show password"}
        >
          {show ? "🙈" : "👁️"}
        </button>
      </div>
      {/* Strength bar */}
      {showStrength && value && (
        <div style={{ marginTop: 8 }}>
          <div style={{ height: 4, background: T.border, borderRadius: 4, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${strength.pct}%`, background: strength.color, borderRadius: 4, transition: "all .3s" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
            <span style={{ fontSize: 11, color: strength.color, fontFamily: "'JetBrains Mono',monospace" }}>
              {strength.label}
            </span>
            <span style={{ fontSize: 11, color: T.muted, fontFamily: "'JetBrains Mono',monospace" }}>
              {["","✗ length","✗ uppercase","✗ lowercase","✗ number","✗ special"].find((_, i) => {
                if (value.length < 8 && i === 1) return true;
                if (!/[A-Z]/.test(value) && i === 2) return true;
                if (!/[a-z]/.test(value) && i === 3) return true;
                if (!/[0-9]/.test(value) && i === 4) return true;
                if (!/[!@#$%^&*]/.test(value) && i === 5) return true;
              }) || "All requirements met ✓"}
            </span>
          </div>
        </div>
      )}
      {error && <p style={{ color: T.red, fontSize: 12, marginTop: 5, fontFamily: "'JetBrains Mono',monospace" }}>⚠ {error}</p>}
    </div>
  );
}

// ── Validated Input ───────────────────────────────────────────────────────────
function ValidInput({ label, type = "text", value, onChange, error, placeholder, icon }) {
  return (
    <div>
      <label className="inp-label">{label}</label>
      <div style={{ position: "relative" }}>
        <input
          className={`inp ${error ? "inp-err" : value && !error ? "inp-ok" : ""}`}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          style={{ paddingLeft: icon ? 42 : 17 }}
          autoComplete="off"
        />
        {icon && (
          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 16 }}>{icon}</span>
        )}
        {value && !error && (
          <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: T.teal, fontSize: 14 }}>✓</span>
        )}
      </div>
      {error && <p style={{ color: T.red, fontSize: 12, marginTop: 5, fontFamily: "'JetBrains Mono',monospace" }}>⚠ {error}</p>}
    </div>
  );
}

// ── Step Bar ──────────────────────────────────────────────────────────────────
function StepBar({ current }) {
  const steps = ["Account","Profile","Symptoms","Analysis","Report","3D View"];
  const keys  = ["auth","profile","symptom","analyzing","report","anatomy"];
  const idx   = keys.indexOf(current);
  return (
    <div style={{ display:"flex", alignItems:"center", gap:4, justifyContent:"center", marginBottom:30 }}>
      {steps.map((s,i) => (
        <div key={s} style={{ display:"flex", alignItems:"center", gap:4 }}>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
            <div className={`step-dot${i===idx?" active":i<idx?" done":""}`}/>
            <span style={{ fontSize:9, fontFamily:"'JetBrains Mono',monospace", color:i===idx?T.cyan:i<idx?T.teal:T.muted }}>{s}</span>
          </div>
          {i<steps.length-1 && <div style={{ width:20, height:1, background:i<idx?T.teal:T.border, marginBottom:14 }}/>}
        </div>
      ))}
    </div>
  );
}

// ── Probability Bar ───────────────────────────────────────────────────────────
function ProbBar({ name, prob, severity }) {
  const col = severity==="Severe"?T.red:severity==="Moderate"?T.orange:T.teal;
  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:7 }}>
        <span style={{ fontSize:14, fontWeight:600 }}>{name}</span>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <span className="tag" style={{ background:`${col}18`, color:col, border:`1px solid ${col}44` }}>{severity}</span>
          <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:13, color:col, minWidth:36, textAlign:"right" }}>{prob}%</span>
        </div>
      </div>
      <div className="prob-track">
        <div className="prob-fill" style={{ width:`${prob}%`, background:`linear-gradient(90deg,${col},${col}66)`, boxShadow:`0 0 8px ${col}66` }}/>
      </div>
    </div>
  );
}

// ── SVG Body ──────────────────────────────────────────────────────────────────
function BodySVG({ organ, language="en-US" }) {
  const s = {
    Brain:{cx:100,cy:42}, Heart:{cx:86,cy:118}, Lungs:{cx:100,cy:112},
    Liver:{cx:114,cy:142}, Stomach:{cx:86,cy:148}, Kidneys:{cx:100,cy:168},
    SmallInt:{cx:100,cy:188}, LargeInt:{cx:100,cy:192}, Gallbladder:{cx:110,cy:156},
    Spleen:{cx:70,cy:148}, Bladder:{cx:100,cy:210}, Spine:{cx:100,cy:155},
    Pancreas:{cx:90,cy:158}, Skin:{cx:140,cy:120}, Pelvic:{cx:100,cy:208}, Joints:{cx:58,cy:198}, Uterus:{cx:100,cy:205}, Ovaries:{cx:86,cy:205}, Testes:{cx:100,cy:230}, Prostate:{cx:100,cy:220}
  };
  const dot = s[organ] || s.Stomach;
  const col = ORGANS[organ]?.hex || T.cyan;
  return (
    <svg viewBox="0 0 200 290" width="132" height="191" style={{ filter:`drop-shadow(0 0 12px ${col}55)`, flexShrink:0 }}>
      <defs><filter id="gf"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <ellipse cx="100" cy="38" rx="26" ry="30" fill="none" stroke="#1A3A5C" strokeWidth="1.5"/>
      <rect x="92" y="66" width="16" height="18" rx="4" fill="none" stroke="#1A3A5C" strokeWidth="1.5"/>
      <path d="M62,86 Q58,125 60,175 Q80,185 100,185 Q120,185 140,175 Q142,125 138,86 Q120,80 100,80 Q80,80 62,86Z" fill="none" stroke="#1A3A5C" strokeWidth="1.5"/>
      <path d="M62,92 Q48,130 52,168" fill="none" stroke="#1A3A5C" strokeWidth="1.5"/>
      <path d="M138,92 Q152,130 148,168" fill="none" stroke="#1A3A5C" strokeWidth="1.5"/>
      <path d="M84,185 Q80,222 82,260" fill="none" stroke="#1A3A5C" strokeWidth="1.5"/>
      <path d="M116,185 Q120,222 118,260" fill="none" stroke="#1A3A5C" strokeWidth="1.5"/>
      {[0,1,2,3,4,5].map(i=><path key={i} d={`M70,${96+i*12} Q100,${90+i*12} 130,${96+i*12}`} fill="none" stroke="#0D2E48" strokeWidth="1" opacity=".7"/>)}
      <line x1="100" y1="86" x2="100" y2="180" stroke="#0D2E48" strokeWidth="1" strokeDasharray="3,3" opacity=".5"/>
      <line x1="102" y1="110" x2="102" y2="180" stroke="#CC1E3566" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="98"  y1="110" x2="98"  y2="180" stroke="#1144AA66" strokeWidth="2" strokeLinecap="round"/>
      <circle cx={dot.cx} cy={dot.cy} r="14" fill={`${col}18`} stroke={col} strokeWidth="1.5" strokeDasharray="4,2" filter="url(#gf)">
        <animate attributeName="r" values="11;15;11" dur="1.8s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="1;.5;1" dur="1.8s" repeatCount="indefinite"/>
      </circle>
      <circle cx={dot.cx} cy={dot.cy} r="5" fill={col} filter="url(#gf)"/>
      <line x1={dot.cx+6} y1={dot.cy} x2={dot.cx+20} y2={dot.cy} stroke={col} strokeWidth="1" opacity=".6"/>
      <text x={dot.cx+22} y={dot.cy+4} fill={col} fontSize="9" fontFamily="JetBrains Mono" fontWeight="600">{localizedOrganLabel(organ, language)}</text>
    </svg>
  );
}

// ── 3D Anatomical Body Viewer ────────────────────────────────────────────────
// Anatomy-only implementation.
//
// Female: one optimized HuBMAP/Femora GLB (~32 MB) fetched at runtime.
// Male: real Anatria/Z-Anatomy system GLBs fetched lazily from the same
//       coordinate system. Only the base body + the system needed for the
//       selected organ are loaded; there is no procedural/fake anatomy.
//
// Female anatomy is bundled locally so it is reliable offline. Male anatomy is
// loaded lazily from the pinned Anatria release because the atlas is split by
// anatomical system; no fake/procedural geometry is used.

const ANATOMY_SOURCES = {
  female: [
    "/anatomy/female-atlas.glb",
    "https://zer01dollars.github.io/female-body-atlas/models/female-atlas.glb",
    "https://cdn.jsdelivr.net/gh/zer01dollars/female-body-atlas@main/public/models/female-atlas.glb",
    "https://raw.githubusercontent.com/zer01dollars/female-body-atlas/main/public/models/female-atlas.glb",
  ],
  maleBase: {
    muscles: [
      "https://cdn.jsdelivr.net/gh/Nurkan1/Anatria-3D@6320bd6/public/anatomy/muscular_male.glb",
      "https://raw.githubusercontent.com/Nurkan1/Anatria-3D/6320bd6/public/anatomy/muscular_male.glb",
    ],
    skeleton: [
      "https://cdn.jsdelivr.net/gh/Nurkan1/Anatria-3D@6320bd6/public/anatomy/skeletal_male.glb",
      "https://raw.githubusercontent.com/Nurkan1/Anatria-3D/6320bd6/public/anatomy/skeletal_male.glb",
    ],
  },
  maleSystems: {
    neurological: [
      "https://cdn.jsdelivr.net/gh/Nurkan1/Anatria-3D@6320bd6/public/anatomy/nervous_male.glb",
      "https://raw.githubusercontent.com/Nurkan1/Anatria-3D/6320bd6/public/anatomy/nervous_male.glb",
    ],
    cardiovascular: [
      "https://cdn.jsdelivr.net/gh/Nurkan1/Anatria-3D@6320bd6/public/anatomy/cardiovascular_male.glb",
      "https://raw.githubusercontent.com/Nurkan1/Anatria-3D/6320bd6/public/anatomy/cardiovascular_male.glb",
    ],
    respiratory: [
      "https://cdn.jsdelivr.net/gh/Nurkan1/Anatria-3D@6320bd6/public/anatomy/respiratory_male.glb",
      "https://raw.githubusercontent.com/Nurkan1/Anatria-3D/6320bd6/public/anatomy/respiratory_male.glb",
    ],
    digestive: [
      "https://cdn.jsdelivr.net/gh/Nurkan1/Anatria-3D@6320bd6/public/anatomy/digestive_male.glb",
      "https://raw.githubusercontent.com/Nurkan1/Anatria-3D/6320bd6/public/anatomy/digestive_male.glb",
    ],
    renal: [
      "https://cdn.jsdelivr.net/gh/Nurkan1/Anatria-3D@6320bd6/public/anatomy/renal_male.glb",
      "https://raw.githubusercontent.com/Nurkan1/Anatria-3D/6320bd6/public/anatomy/renal_male.glb",
    ],
    reproductive: [
      "https://cdn.jsdelivr.net/gh/Nurkan1/Anatria-3D@6320bd6/public/anatomy/reproductive_male.glb",
      "https://raw.githubusercontent.com/Nurkan1/Anatria-3D/6320bd6/public/anatomy/reproductive_male.glb",
    ],
    regional: [
      "https://cdn.jsdelivr.net/gh/Nurkan1/Anatria-3D@6320bd6/public/anatomy/regional_male.glb",
      "https://raw.githubusercontent.com/Nurkan1/Anatria-3D/6320bd6/public/anatomy/regional_male.glb",
    ],
    articular: [
      "https://cdn.jsdelivr.net/gh/Nurkan1/Anatria-3D@6320bd6/public/anatomy/articular_male.glb",
      "https://raw.githubusercontent.com/Nurkan1/Anatria-3D/6320bd6/public/anatomy/articular_male.glb",
    ],
    visceral: [
      "https://cdn.jsdelivr.net/gh/Nurkan1/Anatria-3D@6320bd6/public/anatomy/visceral_male.glb",
      "https://raw.githubusercontent.com/Nurkan1/Anatria-3D/6320bd6/public/anatomy/visceral_male.glb",
    ],
  },
};

const DRACO_DECODER_PATH = "https://cdn.jsdelivr.net/npm/three@0.183.2/examples/jsm/libs/draco/gltf/";

const ORGAN_PATTERNS = {
  // Anatria/Z-Anatomy preserves detailed anatomical names rather than a single
  // "organ" mesh. These semantic patterns intentionally group the real child
  // structures that belong to the selected educational target. GLTFLoader
  // sanitises names (spaces -> underscores), so classify both forms after
  // normalisation in classifyAnatomyNode().
  Brain: /\b(?:brain|cerebr|cerebell|brainstem|encephalon|telencephalon|diencephalon|medulla oblongata|pons|midbrain|thalamus|hypothalamus|hippocamp|amygdala|corpus callosum|gyrus|gyri|sulcus|sulci|cortex|lobe|lobes)\b/i,
  Heart: /\b(?:heart|atrium|ventricle|myocard(?:ium)?|endocard(?:ium)?|epicard(?:ium)?|pericard(?:ium)?|cardiac chamber|cardiac muscle|cardiac septum|interventricular septum|interatrial septum|aortic valve|mitral valve|tricuspid valve|pulmonary valve)\b/i,
  Lungs: /\b(?:lungs?|left lung|right lung|upper lobe of left lung|upper lobe of right lung|middle lobe of right lung|lower lobe of left lung|lower lobe of right lung|lung lobe|pulmonary lobe|alveol(?:us|i))\b/i,
  Liver: /\b(?:liver|hepatic lobe|hepatic segment|caudate lobe|quadrate lobe)\b/i,
  Stomach: /\b(?:stomach|gaster|gastric|pylor(?:us|ic)|fundus of stomach|body of stomach|lesser curvature of stomach|greater curvature of stomach)\b/i,
  Kidneys: /\b(?:kidneys?|renal cortex|renal medulla|renal pyramid|renal papilla|renal column|renal sinus|renal pelvis|renal calyx|calyx of kidney)\b/i,
  SmallInt: /\b(?:small intestine|small bowel|duodenum|jejunum|ileum|duodenal|jejunal|ileal)\b/i,
  LargeInt: /\b(?:large intestine|large bowel|colon|cecum|caecum|appendix|rectum|sigmoid|ascending colon|transverse colon|descending colon)\b/i,
  Gallbladder: /\b(?:gallbladder|gall bladder|vesica biliaris)\b/i,
  Spleen: /\b(?:spleen|lien)\b/i,
  Bladder: /\b(?:urinary bladder|bladder|vesica urinaria)\b/i,
  // Important: match vertebral substructures, not just the sacrum. This makes
  // a Spine target illuminate the real column from cervical through sacral
  // vertebrae instead of only the pelvic end.
  Spine: /\b(?:spine|vertebra|vertebrae|vertebral|vertebral column|cervical vertebra|thoracic vertebra|lumbar vertebra|sacral vertebra|coccygeal|coccyx|sacrum|atlas vertebra|axis vertebra|spinal cord)\b/i,
  Pancreas: /\b(?:pancreas|pancreatic)\b/i,
  Skin: /\b(?:skin|epidermis|dermis|integumentary system|skin surface|body surface)\b/i,
  Pelvic: /\b(?:pelvic girdle|pelvic bone|pelvis|ilium|ischium|pubis|os coxae|acetabulum|perineum)\b/i,
  Joints: /\b(?:joint|articular|articulation|joint capsule|meniscus|patella|acetabulum|condyle)\b/i,
  Uterus: /\b(?:uterus|body of uterus|fundus of uterus|cervix|endometrium|myometrium|uterine)\b/i,
  Ovaries: /\b(?:ovary|ovaries|left ovary|right ovary|ovarian)\b/i,
  Testes: /\b(?:testis|testes|testicle|testicles|scrotum|epididymis)\b/i,
  Prostate: /\b(?:prostate|prostatic)\b/i,
};

const ORGAN_SYSTEM = {
  Brain: "neurological",
  Heart: "cardiovascular",
  Lungs: "respiratory",
  Liver: "digestive",
  Stomach: "digestive",
  SmallInt: "digestive",
  LargeInt: "digestive",
  Gallbladder: "digestive",
  Spleen: "lymphatic",
  Pancreas: "digestive",
  Kidneys: "renal",
  Bladder: "renal",
  Spine: "skeleton",
  Testes: "reproductive",
  Prostate: "reproductive",
  Uterus: "reproductive",
  Ovaries: "reproductive",
  Pelvic: "skeleton",
  Joints: "articular",
  Skin: "body",
};

function normalizeOrganKey(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  if (ORGANS[raw]) return raw;
  const normalized = raw
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  if (!normalized) return null;

  const aliases = {
    brain:"Brain", cerebrum:"Brain", cerebellum:"Brain", brainstem:"Brain", encephalon:"Brain",
    heart:"Heart", cardiac:"Heart", cardiovascular:"Heart", lung:"Lungs", lungs:"Lungs", pulmonary:"Lungs", respiratory:"Lungs",
    liver:"Liver", hepatic:"Liver", stomach:"Stomach", gastric:"Stomach",
    kidney:"Kidneys", kidneys:"Kidneys", renal:"Kidneys", "renal area":"Kidneys",
    "small intestine":"SmallInt", "small bowel":"SmallInt", smallint:"SmallInt", duodenum:"SmallInt", jejunum:"SmallInt", ileum:"SmallInt",
    "large intestine":"LargeInt", "large bowel":"LargeInt", largeint:"LargeInt", colon:"LargeInt", cecum:"LargeInt", caecum:"LargeInt", rectum:"LargeInt",
    gallbladder:"Gallbladder", "gall bladder":"Gallbladder", biliary:"Gallbladder",
    spleen:"Spleen", splenic:"Spleen", bladder:"Bladder", "urinary bladder":"Bladder",
    spine:"Spine", vertebra:"Spine", vertebrae:"Spine", backbone:"Spine", sacrum:"Spine", coccyx:"Spine",
    pancreas:"Pancreas", pancreatic:"Pancreas", skin:"Skin", "skin face":"Skin", face:"Skin",
    pelvis:"Pelvic", pelvic:"Pelvic", "pelvic region":"Pelvic", perineum:"Pelvic",
    joint:"Joints", joints:"Joints", knee:"Joints", knees:"Joints", musculoskeletal:"Joints",
    uterus:"Uterus", uterine:"Uterus", womb:"Uterus", cervix:"Uterus", endometrium:"Uterus", myometrium:"Uterus",
    ovary:"Ovaries", ovaries:"Ovaries", ovarian:"Ovaries",
    testis:"Testes", testes:"Testes", testicle:"Testes", testicles:"Testes", scrotum:"Testes",
    prostate:"Prostate", prostatic:"Prostate",
  };
  if (aliases[normalized]) return aliases[normalized];
  const compact = normalized.replace(/\s+/g, "");
  const compactAliases = Object.fromEntries(Object.entries(aliases).map(([k,v])=>[k.replace(/\s+/g,""),v]));
  if (compactAliases[compact]) return compactAliases[compact];

  const labelHit = Object.entries(ORGANS).find(([key, meta]) => {
    const keyNorm = key.toLowerCase().replace(/[^a-z0-9]+/g, " ");
    const labelNorm = String(meta.label || "").toLowerCase().replace(/[^a-z0-9]+/g, " ");
    return normalized === keyNorm || normalized === labelNorm || normalized.startsWith(`${labelNorm} `);
  });
  return labelHit?.[0] || null;
}

function anatomyAllowedForGender(key, gender) {
  const k = normalizeOrganKey(key) || key;
  if (gender === "Female") return !["Testes", "Prostate"].includes(k);
  if (gender === "Male") return !["Uterus", "Ovaries"].includes(k);
  return true;
}

const MALE_ASSET_CACHE = new Map();

function makeCandidateLoader(loader, candidates, timeoutMs=90000) {
  return candidates.reduce((chain, url) => chain.catch(() => new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error(`Timed out loading ${url}`));
      }
    }, timeoutMs);
    loader.load(
      url,
      gltf => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(gltf);
      },
      undefined,
      error => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(`Unable to load ${url}`));
      },
    );
  })), Promise.reject(new Error("No anatomy candidates were supplied.")));
}

function getMaleSystemCandidates(systemKey) {
  return ANATOMY_SOURCES.maleSystems[systemKey] || [];
}

function classifyAnatomyNode(name) {
  // GLTFLoader sanitises spaces and punctuation in node names. Keep matching
  // deliberately semantic and case-insensitive so names such as
  // "Kidney_l", "Posterior segment of liver (I)", "Right atrium" and
  // "Lumbar vertebra.l" remain selectable/colorable.
  const text = String(name || "")
    .replace(/[_\-]+/g, " ")
    .replace(/[.(),]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  if (!text) return null;
  for (const [organ, pattern] of Object.entries(ORGAN_PATTERNS)) {
    if (pattern.test(text)) return organ;
  }
  return null;
}

function cloneMaterial(material) {
  if (!material || typeof material.clone !== "function") return material;
  return material.clone();
}

function prepareRealAnatomy(root, groupKey, registry, options = {}) {
  const tintOrgans = Boolean(options.tintOrgans);
  const visit = (node, inheritedOrgan = null) => {
    if (!node || !node.isObject3D) return;

    const nodeLabel = `${node.name || ""} ${node.userData?.name || ""}`.toLowerCase();
    const isShellNamedNode = /skin|epiderm|dermis|body surface|integument/i.test(nodeLabel);
    // Never classify a body-surface mesh itself as an internal organ.
    const ownOrgan = !isShellNamedNode
      ? (classifyAnatomyNode(node.name) || classifyAnatomyNode(node.userData?.name) || null)
      : null;
    const organ = ownOrgan || inheritedOrgan;
    if (organ && node.userData) node.userData.symptomlensOrgan = organ;

    if (node.isMesh || node.isLine || node.isPoints) {
      if (node.material) {
        if (Array.isArray(node.material)) node.material = node.material.map(cloneMaterial);
        else node.material = cloneMaterial(node.material);
      }
      const mats = Array.isArray(node.material) ? node.material : [node.material];
      const isBodyShell = isShellNamedNode;
      const isMuscleLayer = groupKey === "muscles" || (!organ && /muscl|fasc/i.test(nodeLabel));
      const isSkeleton = groupKey === "skeleton" || /bone|vertebr|sacrum|coccyx|skull|rib|sternum|pelvis/i.test(nodeLabel);

      for (const mat of mats) {
        if (!mat) continue;
        const isOrganMesh = Boolean(organ && !isBodyShell && !isMuscleLayer && !isSkeleton);
        mat.transparent = Boolean(isBodyShell || isMuscleLayer || isSkeleton || isOrganMesh);
        if (isBodyShell) mat.opacity = 0.075;
        else if (isMuscleLayer) mat.opacity = 0.10;
        else if (isSkeleton) mat.opacity = 0.34;
        else mat.opacity = 0.98;
        mat.depthWrite = Boolean(isOrganMesh) || !(isBodyShell || isMuscleLayer || isSkeleton);
        if (isOrganMesh) {
          // Render classified organs after the transparent shell so their true
          // anatomy remains readable through the body. This is the key visual
          // treatment used by the working female atlas.
          mat.renderOrder = 3;
        }

        // The Anatria male GLBs commonly use pale/white source materials. Keep
        // the real geometry, but give each classified structure the project's
        // anatomically-inspired target color so organs are readable before a
        // selection is made. No primitive/fake geometry is introduced.
        if (tintOrgans && isOrganMesh && mat.color) {
          const hex = ORGANS[organ]?.three;
          if (hex != null) {
            const target = new THREE.Color(hex);
            const source = mat.color.clone();
            const minC = Math.min(source.r, source.g, source.b);
            const maxC = Math.max(source.r, source.g, source.b);
            const nearWhite = minC > 0.72 && (maxC - minC) < 0.20;
            const mixAmount = nearWhite ? 0.90 : 0.70;
            source.lerp(target, mixAmount);
            mat.color.copy(source);
            if (mat.roughness != null) mat.roughness = Math.max(0.48, mat.roughness);
            if ('toneMapped' in mat) mat.toneMapped = false;
            if ('side' in mat) mat.side = THREE.DoubleSide;
          }
        }

        if (mat.color && isMuscleLayer) mat.color.multiplyScalar(0.65);
        if (mat.emissive) mat.emissiveIntensity = 0;
        mat.needsUpdate = true;
      }

      if (organ && node.isMesh) {
        registry.byOrgan.set(organ, [...(registry.byOrgan.get(organ) || []), node]);
        registry.counts[organ] = (registry.counts[organ] || 0) + 1;
      }
    }

    for (const child of node.children || []) visit(child, organ);
  };
  visit(root);
}

function setMeshPulse(mesh, pulse, baseColor, active, emphasis = "normal") {
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  for (const mat of mats) {
    if (!mat) continue;
    if (!mat.userData.symptomlensBase) {
      mat.userData.symptomlensBase = {
        color: mat.color?.clone?.() || new THREE.Color(0xffffff),
        emissive: mat.emissive?.clone?.() || new THREE.Color(0x000000),
        emissiveIntensity: Number(mat.emissiveIntensity || 0),
        opacity: Number(mat.opacity ?? 1),
        transparent: Boolean(mat.transparent),
        depthWrite: mat.depthWrite,
      };
    }
    const base = mat.userData.symptomlensBase;
    const target = new THREE.Color(baseColor);
    const strong = emphasis === "male";

    if (mat.color) {
      const c = active ? target.clone() : base.color.clone();
      if (active) {
        // Strong, unmistakable organ color with a white pulse crest.
        c.lerp(new THREE.Color(0xffffff), 0.18 + 0.18 * pulse);
      } else {
        // Keep inactive real organs visibly colored instead of returning to a
        // white atlas material.
        c.lerp(target, strong ? 0.76 : 0.72);
        c.lerp(new THREE.Color(0xffffff), 0.18);
      }
      mat.color.copy(c);
      if ('toneMapped' in mat) mat.toneMapped = false;
    }

    if (mat.emissive) {
      if (active) {
        mat.emissive.copy(target);
        mat.emissiveIntensity = strong ? (2.8 + 4.2 * pulse) : (2.0 + 3.2 * pulse);
      } else {
        // A small fixed emissive tint keeps inactive organs legible through
        // the translucent body without making them look selected.
        mat.emissive.copy(target);
        mat.emissiveIntensity = strong ? 0.08 : 0.05;
      }
    }

    if (active) {
      mat.opacity = 0.98;
      mat.transparent = true;
      mat.depthWrite = true;
      if (mesh.renderOrder != null) mesh.renderOrder = strong ? 10 : 8;
    } else {
      mat.opacity = Math.max(base.opacity, 0.94);
      mat.transparent = true;
      mat.depthWrite = true;
      if (mesh.renderOrder != null) mesh.renderOrder = 3;
    }
    mat.needsUpdate = true;
  }
}

function fitCameraToObject(root, camera, targetHeight=5.65) {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  if (box.isEmpty()) throw new Error("The downloaded anatomy asset contains no renderable geometry.");
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const factor = targetHeight / Math.max(size.y, 0.001);
  root.scale.setScalar(factor);
  root.position.set(-center.x * factor, -center.y * factor, -center.z * factor);
  root.updateMatrixWorld(true);
  const fitted = new THREE.Box3().setFromObject(root);
  const fittedSize = fitted.getSize(new THREE.Vector3());
  const radius = Math.max(fittedSize.x, fittedSize.y, fittedSize.z) * 0.5;
  const fov = THREE.MathUtils.degToRad(32);
  const distance = Math.max(8.6, (radius / Math.sin(fov / 2)) * 1.18);
  camera.position.set(0, 0.1, distance);
  camera.lookAt(0, 0.1, 0);
}

function FemaleBodyViewer3D({ highlightOrgan, onOrganSelect, systemFilter="All", layers={skin:true,organs:true,skeleton:false}, gender="Female" }) {
  const mountRef = useRef(null);
  const stateRef = useRef({ highlight:null, systemFilter:"All", layers, meshes:new Map(), counts:{}, root:null });
  const [loading, setLoading] = useState(true);
  const [modelError, setModelError] = useState("");
  const [meshCounts, setMeshCounts] = useState({});

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return undefined;
    let disposed = false;
    let renderer = null;
    let animationFrame = 0;
    const ref = stateRef.current;
    ref.highlight = normalizeOrganKey(highlightOrgan);
    ref.systemFilter = systemFilter;
    ref.layers = layers;
    ref.meshes.clear();
    ref.counts = {};
    setLoading(true);
    setModelError("");
    setMeshCounts({});

    try {
      const W = Math.max(el.clientWidth, 320);
      const H = Math.max(el.clientHeight, 520);
      renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true, powerPreference:"high-performance" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setSize(W,H);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.domElement.style.cssText = "width:100%;height:100%;display:block;touch-action:none;cursor:grab";
      el.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(32, W / H, 0.01, 100);
      scene.add(new THREE.HemisphereLight(0xeaf6ff,0x07101b,2.2));
      const key = new THREE.DirectionalLight(0xffffff,3.4); key.position.set(4,8,9); scene.add(key);
      const fill = new THREE.DirectionalLight(0x7bdcff,1.8); fill.position.set(-4,2,7); scene.add(fill);
      const rim = new THREE.DirectionalLight(0xffd2dd,1.3); rim.position.set(0,5,-7); scene.add(rim);

      const root = new THREE.Group();
      scene.add(root);
      ref.root = root;
      const loader = new GLTFLoader();
      loader.setMeshoptDecoder(MeshoptDecoder);
      const draco = new DRACOLoader();
      draco.setDecoderPath(DRACO_DECODER_PATH);
      loader.setDRACOLoader(draco);

      const loadFemale = makeCandidateLoader(loader, ANATOMY_SOURCES.female, 120000);
      loadFemale.then(({scene: loadedScene}) => {
        if (disposed) return;
        prepareRealAnatomy(loadedScene, "body", {byOrgan: ref.meshes, counts: ref.counts});
        root.add(loadedScene);
        fitCameraToObject(root, camera, 5.7);
        setMeshCounts({...ref.counts});
        setLoading(false);
        if (ref.highlight && anatomyAllowedForGender(ref.highlight,"Female") && !ref.meshes.has(ref.highlight)) {
          const meshes = ref.counts[ref.highlight] || 0;
          if (!meshes) setModelError(`${ORGANS[ref.highlight]?.label || ref.highlight} is not present as a classified real mesh in this female asset.`);
        }
      }).catch(error => {
        if (disposed) return;
        console.error("[SymptomLens] female anatomy load failed", error);
        setLoading(false);
        setModelError("Female 3D anatomy could not be fetched. No fake/procedural anatomy is shown.");
      });

      const applyVisualState = () => {
        const active = normalizeOrganKey(ref.highlight);
        for (const meshes of ref.meshes.values()) {
          for (const mesh of meshes) {
            const organ = mesh.userData?.symptomlensOrgan;
            const isActive = Boolean(active && organ === active);
            const pulse = 0.5 + 0.5 * Math.sin(performance.now() * 0.009);
            setMeshPulse(mesh, pulse, ORGANS[organ]?.three || 0x00D4FF, isActive);
            mesh.visible = Boolean(ref.layers?.organs !== false) || isActive;
          }
        }
        root.traverse(node => {
          if (!node.isMesh) return;
          const n = `${node.name || ""} ${node.userData?.name || ""}`.toLowerCase();
          const shell = /skin|epiderm|dermis|body surface|integument/i.test(n);
          const skeleton = /bone|vertebr|sacrum|coccyx|skull|rib|sternum|pelvis/i.test(n);
          if (shell) node.visible = Boolean(ref.layers?.skin !== false);
          if (skeleton) node.visible = Boolean(ref.layers?.skeleton === true) || Boolean(active === "Spine" || active === "Pelvic");
        });
      };

      const pointer = {drag:false,moved:false,x:0,y:0,rx:0,ry:0};
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();
      const onPointerDown = e => { pointer.drag=true; pointer.moved=false; pointer.x=e.clientX; pointer.y=e.clientY; renderer.domElement.style.cursor="grabbing"; };
      const onPointerMove = e => {
        if (!pointer.drag) return;
        const dx=e.clientX-pointer.x, dy=e.clientY-pointer.y;
        if (Math.abs(dx)+Math.abs(dy)>2) pointer.moved=true;
        pointer.ry += dx * 0.005;
        pointer.rx = THREE.MathUtils.clamp(pointer.rx + dy * 0.0025,-0.28,0.28);
        pointer.x=e.clientX; pointer.y=e.clientY;
      };
      const onPointerUp = e => {
        if (!pointer.drag) return;
        pointer.drag=false;
        renderer.domElement.style.cursor="grab";
        if (pointer.moved) return;
        const rect=renderer.domElement.getBoundingClientRect();
        mouse.x=((e.clientX-rect.left)/rect.width)*2-1;
        mouse.y=-((e.clientY-rect.top)/rect.height)*2+1;
        raycaster.setFromCamera(mouse,camera);
        const hits=raycaster.intersectObjects(root.children,true);
        const findOrgan = hit => {
          let candidate = hit?.object || null;
          while(candidate && !candidate.userData?.symptomlensOrgan) candidate = candidate.parent;
          return candidate?.userData?.symptomlensOrgan || null;
        };
        const organHit = hits.find(h => h.object?.visible && findOrgan(h) && findOrgan(h) !== "Skin");
        const fallbackHit = hits.find(h => h.object?.visible && findOrgan(h));
        let obj = organHit?.object || fallbackHit?.object || null;
        while(obj && !obj.userData?.symptomlensOrgan) obj=obj.parent;
        const organ=obj?.userData?.symptomlensOrgan;
        if (organ && anatomyAllowedForGender(organ,"Female")) {
          ref.highlight=organ;
          ref.meshes.set(organ, ref.meshes.get(organ) || []);
          onOrganSelect?.(organ);
        }
      };
      const onWheel=e=>e.preventDefault();
      renderer.domElement.addEventListener("pointerdown",onPointerDown);
      renderer.domElement.addEventListener("pointermove",onPointerMove);
      renderer.domElement.addEventListener("pointerup",onPointerUp);
      renderer.domElement.addEventListener("pointercancel",onPointerUp);
      renderer.domElement.addEventListener("wheel",onWheel,{passive:false});
      const resize=()=>{const w=Math.max(el.clientWidth,320),h=Math.max(el.clientHeight,520);renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();};
      window.addEventListener("resize",resize);

      const animate=()=>{
        if (disposed) return;
        animationFrame=requestAnimationFrame(animate);
        root.rotation.y=pointer.ry;
        root.rotation.x=pointer.rx;
        applyVisualState();
        renderer.render(scene,camera);
      };
      animate();

    } catch(error) {
      console.error("[SymptomLens] female viewer init failed", error);
      setLoading(false);
      setModelError("3D viewer could not start in this browser.");
    }

    return () => {
      disposed=true;
      cancelAnimationFrame(animationFrame);
      if (renderer) {
        try { renderer.dispose(); } catch {}
        if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
      }
    };
  // The model must not be reloaded just because the selected organ changed.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gender]);

  useEffect(() => {
    const ref=stateRef.current;
    ref.highlight=normalizeOrganKey(highlightOrgan);
    ref.systemFilter=systemFilter;
    ref.layers=layers;
    if (ref.highlight && ref.counts?.[ref.highlight] === 0 && ref.meshes?.has(ref.highlight)) {
      ref.meshes.delete(ref.highlight);
    }
    if (ref.root && ref.highlight) {
      ref.root.traverse(node => {
        if (!node.isMesh) return;
        const organ=node.userData?.symptomlensOrgan;
        if (organ===ref.highlight && anatomyAllowedForGender(organ,gender)) node.visible=true;
      });
    }
  },[highlightOrgan,systemFilter,layers,gender]);

  return <div ref={mountRef} style={{width:"100%",height:"100%",position:"relative",background:"#030B14",overflow:"hidden"}}>
    {loading&&<div style={{position:"absolute",inset:0,zIndex:5,display:"flex",alignItems:"center",justifyContent:"center",padding:20,textAlign:"center",color:T.cyan,fontSize:12,background:"rgba(3,11,20,.36)"}}>Loading local female anatomy…<br/><span style={{fontSize:10,color:T.muted}}>HuBMAP/Femora Atlas · female-atlas.glb</span></div>}
    {modelError&&<div style={{position:"absolute",top:16,left:16,right:16,zIndex:8,padding:"11px 13px",border:`1px solid ${T.orange}`,borderRadius:10,background:"rgba(3,11,20,.96)",color:T.orange,fontSize:11,lineHeight:1.5}}>{modelError}</div>}
    <div style={{position:"absolute",top:14,left:14,zIndex:6,padding:"7px 11px",borderRadius:20,border:`1px solid ${T.border}`,background:"rgba(3,11,20,.82)",color:T.cyan,fontSize:10,fontFamily:"'JetBrains Mono',monospace"}}>VIEW: FEMALE · REAL ANATOMY · NO ORGAN ZOOM</div>
    {highlightOrgan&&!loading&&!modelError&&<div style={{position:"absolute",top:50,left:"50%",transform:"translateX(-50%)",zIndex:7,padding:"7px 16px",border:`1px solid ${T.cyan}`,borderRadius:20,background:"rgba(3,11,20,.88)",color:T.cyan,fontSize:11,fontFamily:"'JetBrains Mono',monospace",whiteSpace:"nowrap",boxShadow:`0 0 18px ${T.cyan}55`}}>{ORGANS[normalizeOrganKey(highlightOrgan)]?.emoji} {localizedOrganLabel(normalizeOrganKey(highlightOrgan))||highlightOrgan} — PULSING</div>}
    <div style={{position:"absolute",left:10,bottom:8,zIndex:4,fontSize:9,color:T.muted}}>↔ Drag to rotate · click a real structure · scroll zoom disabled</div>
    <div style={{position:"absolute",right:10,bottom:8,zIndex:4,fontSize:9,color:T.muted}}>{Object.keys(meshCounts).length} mapped organs</div>
  </div>;
}

function MaleBodyViewer3D({ highlightOrgan, onOrganSelect, systemFilter="All", layers={skin:true,organs:true,skeleton:false}, gender="Male" }) {
  const mountRef = useRef(null);
  const apiRef = useRef({target:null, ensureSystem:()=>{}, root:null});
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("Fetching real male anatomy…");
  const [error, setError] = useState("");
  const [meshCounts, setMeshCounts] = useState({});

  useEffect(() => {
    const el=mountRef.current;
    if (!el) return undefined;
    let disposed=false;
    let renderer=null;
    let animationFrame=0;
    const state={target:normalizeOrganKey(highlightOrgan), groups:new Map(), meshes:new Map(), counts:{}, rx:0, ry:0};
    apiRef.current.target=state.target;

    try {
      const W=Math.max(el.clientWidth,320), H=Math.max(el.clientHeight,520);
      renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:"high-performance"});
      renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
      renderer.setSize(W,H);
      renderer.outputColorSpace=THREE.SRGBColorSpace;
      renderer.domElement.style.cssText="width:100%;height:100%;display:block;touch-action:none;cursor:grab";
      el.appendChild(renderer.domElement);

      const scene=new THREE.Scene();
      const camera=new THREE.PerspectiveCamera(32,W/H,0.01,100);
      scene.add(new THREE.HemisphereLight(0xeaf6ff,0x07101b,2.2));
      const key=new THREE.DirectionalLight(0xffffff,3.5); key.position.set(4,8,9); scene.add(key);
      const fill=new THREE.DirectionalLight(0x7bdcff,1.8); fill.position.set(-4,2,7); scene.add(fill);
      const rim=new THREE.DirectionalLight(0xffd3dc,1.2); rim.position.set(0,5,-7); scene.add(rim);

      const root=new THREE.Group(); scene.add(root); state.root=root; apiRef.current.root=root;
      const loader=new GLTFLoader();
      loader.setMeshoptDecoder(MeshoptDecoder);
      const draco=new DRACOLoader(); draco.setDecoderPath(DRACO_DECODER_PATH); loader.setDRACOLoader(draco);

      const addScene=(systemKey,sceneObject,groupKey=systemKey)=>{
        if (disposed) return;
        const wrapper=new THREE.Group(); wrapper.name=`SymptomLens_${groupKey}`; wrapper.userData.system=systemKey;
        wrapper.add(sceneObject);
        prepareRealAnatomy(wrapper,groupKey,{byOrgan:state.meshes,counts:state.counts},{tintOrgans:true});
        root.add(wrapper);
        state.groups.set(systemKey,wrapper);
        setMeshCounts({...state.counts});
      };

      const loadSystem = async(systemKey, candidates, label=systemKey) => {
        if (!candidates?.length) throw new Error(`No source configured for ${label}.`);
        if (MALE_ASSET_CACHE.has(systemKey)) {
          const cached=MALE_ASSET_CACHE.get(systemKey);
          const gltf=await cached;
          addScene(systemKey, gltf.scene.clone(true), systemKey);
          return;
        }
        const promise=makeCandidateLoader(loader,candidates,90000).catch(error=>{MALE_ASSET_CACHE.delete(systemKey);throw error;});
        MALE_ASSET_CACHE.set(systemKey,promise);
        const gltf=await promise;
        addScene(systemKey,gltf.scene.clone(true),systemKey);
      };

      const fitOnce = () => {
        try { fitCameraToObject(root,camera,5.7); } catch {}
      };

      const ensureForOrgan = async organ => {
        const key=normalizeOrganKey(organ);
        if (!key || !anatomyAllowedForGender(key,"Male")) return;
        state.target = key;
        if (ORGAN_SYSTEM[key] === "body") return;
        const system=ORGAN_SYSTEM[key];
        if (!system) return;
        const candidates = system === "skeleton" ? ANATOMY_SOURCES.maleBase.skeleton
          : system === "muscles" ? ANATOMY_SOURCES.maleBase.muscles
          : getMaleSystemCandidates(system);
        if (!candidates.length) return;
        if (state.groups.has(system)) {
          setError("");
          setStatus(`${ORGANS[key]?.label || key} selected — pulse active`);
          return;
        }
        setError("");
        setStatus(`Fetching ${ORGANS[key]?.label || key} anatomy…`);
        try {
          await loadSystem(system,candidates,ORGANS[key]?.label || key);
          setStatus(`${ORGANS[key]?.label || key} loaded — pulse active`);
          if (!disposed && state.groups.size === 1) fitOnce();
        } catch(loadError) {
          console.error(`[SymptomLens] male ${system} load failed`,loadError);
          if (!disposed) {
            setError(`${ORGANS[key]?.label || key} could not be fetched from the anatomy source. Nothing unrelated is highlighted.`);
            setStatus("Anatomy source unavailable");
          }
        }
      };

      apiRef.current.ensureSystem = ensureForOrgan;

      (async()=>{
        try {
          setLoading(true); setError("");
          setStatus("Fetching real male anatomy base…");
          await loadSystem("muscles",ANATOMY_SOURCES.maleBase.muscles,"muscles");
          await loadSystem("skeleton",ANATOMY_SOURCES.maleBase.skeleton,"skeleton");
          fitOnce();
          if (state.target) {
            await ensureForOrgan(state.target);
            if (!state.meshes.get(state.target)?.length && !disposed) {
              setError(`${ORGANS[state.target]?.label || state.target} could not be matched to a real structure in this male atlas.`);
            }
          }
          setLoading(false);
          if (state.groups.has("skeleton")) setStatus("Real male anatomy ready");
        } catch(loadError) {
          console.error("[SymptomLens] male base anatomy load failed",loadError);
          if (!disposed) {
            setLoading(false);
            setError("Male 3D anatomy could not be fetched. No fake/procedural anatomy is shown.");
            setStatus("Real anatomy source unavailable");
          }
        }
      })();

      const applyVisualState=()=>{
        const active=state.target;
        const pulse=0.5+0.5*Math.sin(performance.now()*0.009);
        root.traverse(node=>{
          if (!node.isMesh) return;
          const organ=node.userData?.symptomlensOrgan;
          const activeNow=Boolean(active&&organ===active);
          if (organ) node.visible=layers?.organs!==false || activeNow;
          else {
            const parentSystem=node.parent?.parent?.userData?.system || node.parent?.userData?.system || node.userData?.system;
            if (parentSystem === "skeleton") node.visible=Boolean(layers?.skeleton);
            if (parentSystem === "muscles") node.visible=true;
          }
          if (activeNow) setMeshPulse(node,pulse,ORGANS[organ]?.three||0x00D4FF,true,"male");
          else if (organ) setMeshPulse(node,pulse,ORGANS[organ]?.three||0x00D4FF,false,"male");
        });
      };

      const pointer={drag:false,moved:false,x:0,y:0};
      const raycaster=new THREE.Raycaster();
      const mouse=new THREE.Vector2();
      const onPointerDown=e=>{pointer.drag=true;pointer.moved=false;pointer.x=e.clientX;pointer.y=e.clientY;renderer.domElement.style.cursor="grabbing";};
      const onPointerMove=e=>{if(!pointer.drag)return;const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;if(Math.abs(dx)+Math.abs(dy)>2)pointer.moved=true;state.ry+=dx*.005;state.rx=THREE.MathUtils.clamp(state.rx+dy*.0025,-0.28,0.28);pointer.x=e.clientX;pointer.y=e.clientY;};
      const onPointerUp=e=>{
        if(!pointer.drag)return;
        pointer.drag=false;renderer.domElement.style.cursor="grab";
        if(pointer.moved)return;
        const rect=renderer.domElement.getBoundingClientRect();
        mouse.x=((e.clientX-rect.left)/rect.width)*2-1;mouse.y=-((e.clientY-rect.top)/rect.height)*2+1;
        raycaster.setFromCamera(mouse,camera);
        const hits=raycaster.intersectObjects(root.children,true);
        const findOrgan = hit => {
          let candidate = hit?.object || null;
          while(candidate) {
            const mapped = candidate.userData?.symptomlensOrgan;
            if (mapped && mapped !== "Skin") return mapped;
            candidate = candidate.parent;
          }
          return null;
        };
        const organHit = hits.find(h => findOrgan(h));
        const organ = findOrgan(organHit);
        if(organ&&anatomyAllowedForGender(organ,"Male")){state.target=organ;apiRef.current.target=organ;setError("");onOrganSelect?.(organ);}
      };
      const onWheel=e=>e.preventDefault();
      renderer.domElement.addEventListener("pointerdown",onPointerDown);renderer.domElement.addEventListener("pointermove",onPointerMove);renderer.domElement.addEventListener("pointerup",onPointerUp);renderer.domElement.addEventListener("pointercancel",onPointerUp);renderer.domElement.addEventListener("wheel",onWheel,{passive:false});
      const resize=()=>{const w=Math.max(el.clientWidth,320),h=Math.max(el.clientHeight,520);renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();};
      window.addEventListener("resize",resize);
      const animate=()=>{if(disposed)return;animationFrame=requestAnimationFrame(animate);root.rotation.y=state.ry;root.rotation.x=state.rx;applyVisualState();renderer.render(scene,camera);}; animate();

    } catch(initError) {
      console.error("[SymptomLens] male viewer init failed",initError);
      setLoading(false);setError("3D viewer could not start in this browser.");
    }

    return ()=>{
      disposed=true;
      cancelAnimationFrame(animationFrame);
      if(renderer){try{renderer.dispose();}catch{} if(el.contains(renderer.domElement))el.removeChild(renderer.domElement);}
      apiRef.current.ensureSystem=()=>{};
      apiRef.current.root=null;
    };
  // Do not remount the expensive viewer when only the selected organ changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[gender]);

  useEffect(()=>{
    const key=normalizeOrganKey(highlightOrgan);
    apiRef.current.target=key;
    if(key) apiRef.current.ensureSystem(key);
  },[highlightOrgan]);

  return <div ref={mountRef} style={{width:"100%",height:"100%",position:"relative",background:"#030B14",overflow:"hidden"}}>
    {loading&&<div style={{position:"absolute",inset:0,zIndex:5,display:"flex",alignItems:"center",justifyContent:"center",padding:20,textAlign:"center",color:T.cyan,fontSize:12,background:"rgba(3,11,20,.36)"}}>{status}<br/><span style={{fontSize:10,color:T.muted}}>Anatria / Z-Anatomy · real anatomical GLBs · lazy-loaded systems</span></div>}
    {error&&<div style={{position:"absolute",top:16,left:16,right:16,zIndex:8,padding:"11px 13px",border:`1px solid ${T.orange}`,borderRadius:10,background:"rgba(3,11,20,.96)",color:T.orange,fontSize:11,lineHeight:1.5}}>{error}</div>}
    <div style={{position:"absolute",top:14,left:14,zIndex:6,padding:"7px 11px",borderRadius:20,border:`1px solid ${T.border}`,background:"rgba(3,11,20,.82)",color:T.cyan,fontSize:10,fontFamily:"'JetBrains Mono',monospace"}}>VIEW: MALE · REAL ANATOMY · NO ORGAN ZOOM</div>
    {highlightOrgan&&!error&&<div style={{position:"absolute",top:50,left:"50%",transform:"translateX(-50%)",zIndex:7,padding:"7px 16px",border:`1px solid ${T.cyan}`,borderRadius:20,background:"rgba(3,11,20,.88)",color:T.cyan,fontSize:11,fontFamily:"'JetBrains Mono',monospace",whiteSpace:"nowrap",boxShadow:`0 0 18px ${T.cyan}55`}}>{ORGANS[normalizeOrganKey(highlightOrgan)]?.emoji} {localizedOrganLabel(normalizeOrganKey(highlightOrgan))||highlightOrgan} — PULSING</div>}
    <div style={{position:"absolute",left:10,bottom:8,zIndex:4,fontSize:9,color:T.muted}}>↔ Drag to rotate · click a real structure · scroll zoom disabled</div>
    <div style={{position:"absolute",right:10,bottom:8,zIndex:4,fontSize:9,color:T.muted}}>{Object.keys(meshCounts).length} mapped organs loaded</div>
  </div>;
}

function BodyViewer3D(props) {
  return props.gender === "Male"
    ? <MaleBodyViewer3D {...props} />
    : <FemaleBodyViewer3D {...props} />;
}


// ── Symptom → anatomy fallback mapping ───────────────────────────────────────
// This prevents the app from always defaulting to Brain when the backend is
// unavailable. It also gives the UI an immediate, deterministic body target.
function inferOrganFromSymptoms(text = "") {
  const s = String(text)
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();

  // Explicit anatomy words get priority over generic symptoms. This prevents
  // words such as "pain" or "dizzy" from accidentally sending everything to
  // the Brain.
  const rules = [
    { organ:"Heart", system:"Cardiovascular", keys:[
      "heart pain","heart ache","my heart hurts","pain in my heart",
      "chest pain","chest ache","pain in my chest","pain around my chest",
      "my chest hurts","chest hurts","ಎದೆ ನೋವು","ಎದೆನೋವು","ede novu","palpitation","palpitations",
      "racing heart","heart beating fast","heart is beating fast"
    ]},
    { organ:"Lungs", system:"Respiratory", keys:[
      "lung pain","lungs pain","lung ache","lungs ache","pain in my lung",
      "pain in my lungs","lung area","lungs area","pain in my lung area","pain in my lungs area","my lung hurts","my lungs hurt","lung hurts",
      "lungs hurt","shortness of breath","difficulty breathing",
      "breathlessness","breathing problem","breathing difficulty",
      "can't breathe","cannot breathe","wheezing","wheeze","persistent cough",
      "coughing","cough","ಉಸಿರಾಟ","ಉಸಿರಾಟದ ತೊಂದರೆ","usirata","usirata da tondare","phlegm","mucus in my chest","chest tightness"
    ]},
    { organ:"Stomach", system:"Digestive", keys:[
      "stomach pain","stomach ache","stomachache","pain in my stomach","pain around my stomach",
      "my stomach hurts","stomach hurts","stomach area","stomach region","pain in my stomach area","pain/discomfort in my stomach area","tummy pain","tummy ache","my tummy hurts","abdominal pain","upper abdominal pain","upper abdomen pain",
      "indigestion","acid reflux","heartburn","nausea","nauseous",
      "vomit","vomiting","vomited","throwing up","threw up","throw up",
      "feeling like vomiting","feel like vomiting","feel like throwing up",
      "sick to my stomach","ಹೊಟ್ಟೆ ನೋವು","ಹೊಟ್ಟೆನೋವು","ವಾಂತಿ","ವಾಂತಿಯಾಗುತ್ತಿದೆ","hotte novu","hotte novu ide","vanti","vanti aguttide","stomach discomfort","stomach burning"
    ]},
    { organ:"Liver", system:"Digestive", keys:[
      "liver pain","pain in my liver","my liver hurts","right upper abdomen",
      "right upper abdominal pain","jaundice","yellow eyes","yellow skin"
    ]},
    { organ:"Gallbladder", system:"Digestive", keys:[
      "gallbladder pain","gall bladder pain","my gallbladder hurts","gallstones","gall stone"
    ]},
    { organ:"Pancreas", system:"Endocrine", keys:[
      "pancreas pain","pancreatic pain","my pancreas hurts","pancreatitis"
    ]},
    { organ:"Kidneys", system:"Renal", keys:[
      "kidney pain","pain in my kidney","pain in my kidneys","ಮೂತ್ರಪಿಂಡ ನೋವು","kidney novu","pain in my kidneys","my kidney hurts",
      "my kidneys hurt","my kidneys are hurting","kidney area","kidneys area","kidney region","kidneys region","pain in my kidney area","pain in my kidneys area","pain discomfort in my kidney area","pain discomfort in my kidneys area","pain in kidney area","pain in kidneys area","kidney stone","kidney stones","urine stone","blood in urine","flank pain","pain in my flank",
      "pain in my side","kidneys"
    ]},
    { organ:"Bladder", system:"Renal", keys:[
      "bladder pain","pain in my bladder","my bladder hurts","urine pain","urine problem","urinary problem","painful urination",
      "burning urination","burning urine","burning when i pee","it burns when i pee","burns when i pee","burning while peeing","frequent urination","frequent urine","urinary pain",
      "pain when urinating","pain when i urinate","pain when i pee","pain when i pass urine","ಮೂತ್ರ ಮಾಡುವಾಗ ನೋವು","ಮೂತ್ರ ನೋವು","mootra maduvaga novu","burning when i urinate","it burns when i urinate","burns when i urinate","burning while urinating"
    ]},
    { organ:"Spine", system:"Skeletal", keys:[
      "back pain","back ache","pain in my back","my back hurts","back area","back region","spine area","spine region","pain in my back area","pain in my spine area","spine pain",
      "pain in my spine","my spine hurts","lower back pain","upper back pain",
      "neck pain","ಬೆನ್ನು ನೋವು","ಬೆನ್ನುನೋವು","ಬೆನ್ನು","back novu","neck pain"
    ]},
    { organ:"SmallInt", system:"Digestive", keys:[
      "small intestine","small intestinal pain","small intestine pain","pain in my small intestine","small bowel pain","small bowel","intestinal pain","intestine pain",
      "pain in my intestine","bowel pain","abdominal cramps","stomach cramps",
      "diarrhea","constipation","loose motions","loose motion","bloating","gas pain"
    ]},
    { organ:"LargeInt", system:"Digestive", keys:[
      "large intestine","large intestinal pain","large intestine pain","pain in my large intestine","colon pain","pain in my colon","colon","blood in stool","bloody stool",
      "bowel movement pain"
    ]},
    { organ:"Spleen", system:"Immune", keys:[
      "spleen pain","pain in my spleen","my spleen hurts","left upper abdomen",
      "left upper abdominal pain"
    ]},
    { organ:"Pelvic", system:"Reproductive / Pelvic", keys:["period cramps","menstrual cramps","menstrual pain","period pain","pelvic pain","lower abdominal cramps","cramps during my period","period cramp"]},
    { organ:"Skin", system:"Integumentary", keys:["skin issue","skin problem","skin symptoms","skin","face skin","skin on my face","face problem","facial skin","acne","pimples","pimple","dark circles","dark circle","rash","itchy skin","skin rash","skin irritation","pigmentation","dry skin","redness","skin problem","skin issue","face problem","facial skin"]},
    { organ:"Joints", system:"Musculoskeletal", keys:["joint pain","joint ache","pain in my joint","my joints hurt","knee pain","shoulder pain","elbow pain","wrist pain","ankle pain","hip pain","knees hurt","shoulder hurts","joint swelling","muscle pain","muscle ache","body ache"]},
    { organ:"Uterus", system:"Reproductive", keys:["period cramps","menstrual cramps","menstrual pain","period pain","uterus pain","uterine pain","womb pain","cramps during my period","period cramp"]},
    { organ:"Pelvic", system:"Reproductive / Pelvic", keys:["pelvic pain","pelvic pressure","pelvic area","lower pelvic","lower abdominal cramps"]},
    { organ:"Uterus", system:"Reproductive", keys:["uterus","womb","ovary pain","ovary hurts","ovaries hurt","ovarian pain"]},
    { organ:"Prostate", system:"Reproductive", keys:["prostate pain","prostate problem"]},
    { organ:"Testes", system:"Reproductive", keys:["testicle pain","testicular pain","testis pain","testes pain","testicles hurt"]},
    { organ:"Brain", system:"Neurological", keys:[
      "headache","ತಲೆ ನೋವು","ತಲೆನೋವು","tale novu","migraine","head pain","pain in my head","head area","head region","pain in my head area","my head hurts",
      "brain pain","my brain hurts","dizziness","dizzy","vertigo","seizure",
      "fainting","memory problem","memory loss"
    ]},
  ];

  // Normalize common punctuation and slash phrasing before matching.
  // This catches natural inputs such as “pain/discomfort in my kidneys area”.
  const normalized = s.replace(/[\/]+/g, " ").replace(/\s+/g, " ").trim();
  const rankedRules = rules.map(rule => ({...rule, keys: rule.keys.map(k => k.replace(/[\/]+/g, " ").replace(/\s+/g, " ").trim())}));
  return rankedRules.find(rule => rule.keys.some(key => normalized.includes(key))) || null;
}

// ── Backend / symptom analysis ────────────────────────────────────────────────
function buildApiProfile(profile, languageOverride) {
  return {
    ...profile,
    age: Number(profile?.age),
    language: languageOverride || profile?.language || "en-US",
    cycle: profile?.cycle ? {
      ...profile.cycle,
      cycleLength: profile.cycle.cycleLength === "" || profile.cycle.cycleLength == null ? null : Number(profile.cycle.cycleLength),
      duration: profile.cycle.duration === "" || profile.cycle.duration == null ? null : Number(profile.cycle.duration),
    } : null,
  };
}

async function analyzeSymptoms(symptoms, profile, languageOverride, followups = []) {
  const normalizedProfile = buildApiProfile(profile, languageOverride);
  const payload = { symptoms: cleanSymptomText(symptoms), profile: normalizedProfile, followups };
  let lastNetworkError = null;

  // A single short retry handles the common race where the frontend opens just
  // before FastAPI has finished binding to port 8000. HTTP validation/server
  // errors are never retried or converted into fake results.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const res = await fetch(`${API}/analyze`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = typeof data.detail === "string" ? data.detail : (data.detail?.message || "Unable to analyze symptoms right now.");
        throw new Error(message);
      }
      return data;
    } catch (error) {
      if (error?.name === "AbortError") throw error;
      // Only retry browser-level network failures; do not mask API responses.
      if (error instanceof TypeError && attempt === 0) {
        lastNetworkError = error;
        await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }
      throw error;
    }
  }
  throw lastNetworkError || new Error("Unable to analyze symptoms right now.");
}

const SYSTEMS = ["All", "Neurological", "Cardiovascular", "Respiratory", "Digestive", "Renal", "Immune", "Skeletal", "Endocrine", "Integumentary", "Reproductive", "Reproductive / Pelvic", "Musculoskeletal"];
const ORGAN_EDUCATION = {
  Brain:{what:"The brain coordinates movement, sensation, memory, thinking and many automatic body functions.", symptoms:"Headache, dizziness, changes in sensation, weakness, confusion or other neurological symptoms can involve many possible causes.", caution:"Sudden severe headache, new weakness, confusion, fainting or seizure needs urgent medical assessment."},
  Heart:{what:"The heart pumps blood through the body and supplies tissues with oxygen and nutrients.", symptoms:"Chest discomfort, palpitations, breathlessness and exercise intolerance can have many causes.", caution:"Severe or new chest pain, especially with breathlessness, sweating, fainting or pain spreading to the arm or jaw, needs urgent care."},
  Lungs:{what:"The lungs exchange oxygen and carbon dioxide during breathing.", symptoms:"Cough, wheezing, breathlessness and chest tightness can arise from several respiratory or other causes.", caution:"Severe breathing difficulty, blue lips, fainting or rapidly worsening symptoms require urgent care."},
  Liver:{what:"The liver processes nutrients, produces bile and helps regulate many chemicals in the blood.", symptoms:"Right-upper abdominal discomfort, jaundice and digestive symptoms can have several causes.", caution:"Yellow skin/eyes, severe abdominal pain, confusion or persistent vomiting should be medically assessed."},
  Stomach:{what:"The stomach stores and mixes food and begins digestion with acid and enzymes.", symptoms:"Pain, burning, nausea, vomiting, reflux and indigestion can have many causes.", caution:"Vomiting blood, black stools, severe persistent pain or dehydration needs medical attention."},
  Kidneys:{what:"The kidneys filter blood, regulate fluid and electrolytes and produce urine.", symptoms:"Flank pain, urinary changes and blood in urine can have several possible causes.", caution:"Severe flank pain, fever with urinary symptoms, inability to urinate or blood in urine needs assessment."},
  SmallInt:{what:"The small intestine digests food and absorbs most nutrients.", symptoms:"Cramping, bloating, diarrhea and other bowel changes can have many causes.", caution:"Severe abdominal pain, persistent vomiting, blood in stool or dehydration needs assessment."},
  LargeInt:{what:"The large intestine absorbs water and moves stool toward the rectum.", symptoms:"Changes in bowel habits, cramps, bloating or colon-area discomfort have many possible causes.", caution:"Heavy rectal bleeding, severe pain or persistent major bowel changes should be assessed."},
  Gallbladder:{what:"The gallbladder stores and releases bile to help digest fats.", symptoms:"Upper-right abdominal pain, especially after meals, can have several causes.", caution:"Severe persistent upper-right abdominal pain, fever or jaundice needs medical assessment."},
  Spleen:{what:"The spleen supports immune function and filters aging blood cells.", symptoms:"Left-upper abdominal discomfort can have several possible causes.", caution:"Severe left-upper abdominal pain after injury, fainting or worsening symptoms needs urgent assessment."},
  Bladder:{what:"The bladder stores urine until it is emptied through the urinary tract.", symptoms:"Burning urination, urgency, frequency and pelvic discomfort can have several causes.", caution:"Fever, flank pain, blood in urine or inability to urinate needs medical assessment."},
  Spine:{what:"The spine supports the body and protects the spinal cord.", symptoms:"Back or neck pain can involve muscles, joints, discs, nerves or other structures.", caution:"Back pain with new weakness, loss of bladder/bowel control or numbness around the groin needs urgent assessment."},
  Pancreas:{what:"The pancreas produces digestive enzymes and hormones including insulin.", symptoms:"Upper abdominal pain and digestive symptoms can have several possible causes.", caution:"Severe persistent upper abdominal pain, repeated vomiting or fainting needs medical assessment."},
  Skin:{what:"The skin forms a protective barrier and can change with inflammation, hormones, irritation, allergy and environmental factors.", symptoms:"Acne, rashes, itching, pigmentation and other skin changes have many possible causes.", caution:"Rapid swelling, severe allergic symptoms, spreading infection or a rapidly changing concerning lesion needs medical assessment."},
  Pelvic:{what:"The pelvis contains reproductive, urinary, digestive and musculoskeletal structures.", symptoms:"Pelvic pain or pressure can come from several systems and needs context from accompanying symptoms.", caution:"Severe pelvic pain, fainting, heavy bleeding or pregnancy-related concerns need urgent professional assessment."},
  Joints:{what:"Joints connect bones and are supported by cartilage, ligaments, tendons and surrounding muscles.", symptoms:"Joint pain, swelling and stiffness can have many causes including injury, overuse and inflammation.", caution:"A deformed joint, inability to bear weight, major swelling after injury or fever with a hot swollen joint needs assessment."},
  Uterus:{what:"The uterus is a reproductive organ where the uterine lining changes during the menstrual cycle.", symptoms:"Period cramps and pelvic symptoms can be associated with uterine contractions and many other causes.", caution:"Severe or unusual period pain, fainting, very heavy bleeding or pregnancy-related pain needs medical assessment."},
  Ovaries:{what:"The ovaries are reproductive organs that release eggs and produce hormones.", symptoms:"Pelvic or one-sided lower abdominal pain can have several possible causes.", caution:"Sudden severe one-sided pelvic pain, fainting or vomiting needs urgent assessment."},
  Testes:{what:"The testes are male reproductive organs that produce sperm and testosterone.", symptoms:"Testicular pain or swelling can have several possible causes.", caution:"Sudden severe testicular pain or swelling is an emergency and needs urgent assessment."},
  Prostate:{what:"The prostate is a gland below the bladder surrounding part of the urethra.", symptoms:"Urinary or pelvic symptoms can have several possible causes.", caution:"Inability to urinate, fever with urinary symptoms or blood in urine needs medical assessment."},
};


function getFollowupQuestions(text="") {
  const inferred = inferOrganFromSymptoms(text);
  const organ = inferred?.organ;
  const base = [
    {id:"duration", label:"How long have you had this symptom?", type:"text", placeholder:"e.g. 2 hours, 3 days, 1 week"},
    {id:"severity", label:"How severe is it right now?", type:"scale"},
    {id:"triggers", label:"What makes it better or worse?", type:"text", placeholder:"e.g. eating, movement, breathing, rest"},
  ];
  const extra = {
    Heart:{id:"associated",label:"Do you also have breathlessness, sweating, dizziness or pain spreading to the arm/jaw?",type:"text",placeholder:"Yes/no and describe"},
    Lungs:{id:"associated",label:"Do you also have cough, wheezing, fever or chest tightness?",type:"text",placeholder:"Yes/no and describe"},
    Stomach:{id:"associated",label:"Do you also have nausea, vomiting, reflux or changes after eating?",type:"text",placeholder:"Yes/no and describe"},
    Bladder:{id:"associated",label:"Do you also have burning, urgency, fever or blood in urine?",type:"text",placeholder:"Yes/no and describe"},
    Kidneys:{id:"associated",label:"Do you also have fever, urinary changes or blood in urine?",type:"text",placeholder:"Yes/no and describe"},
    Uterus:{id:"associated",label:"Are the cramps related to your period? Any heavy bleeding, fainting or unusual pain?",type:"text",placeholder:"Describe briefly"},
    Skin:{id:"associated",label:"When did the skin change start, and did you recently change products, medicines or skincare?",type:"text",placeholder:"Describe triggers or changes"},
    Joints:{id:"associated",label:"Was there an injury, swelling, redness, stiffness or fever?",type:"text",placeholder:"Describe associated symptoms"},
  }[organ];
  return extra ? [...base,extra] : base;
}
function deriveRelatedAreas(symptoms, organ) {
  const s=String(symptoms||"").toLowerCase();
  const out=[];
  if (organ==="Heart" && /(arm|jaw|shoulder|back)/.test(s)) out.push("Arm / shoulder / jaw / back can be described as associated areas");
  if (organ==="Lungs" && /(chest|shoulder)/.test(s)) out.push("Chest and upper back may feel involved");
  if (organ==="Stomach" && /(upper|chest|back)/.test(s)) out.push("Upper abdomen and sometimes chest/back discomfort");
  if (organ==="Kidneys" && /(back|side|flank)/.test(s)) out.push("Flank or back area");
  if (organ==="Pancreas" && /(back)/.test(s)) out.push("Upper back may also be uncomfortable");
  return out;
}
function normalizeHistory(items){ return Array.isArray(items)?items.slice(0,30):[]; }
function userHistoryKey(email){
  return `sl_history_${String(email || "").trim().toLowerCase()}`;
}
function readUserHistory(email){
  try { return normalizeHistory(JSON.parse(localStorage.getItem(userHistoryKey(email)) || "[]")); }
  catch { return []; }
}
function userProfileKey(email){
  return `sl_profile_${String(email || "").trim().toLowerCase()}`;
}
function readUserProfile(email){
  try {
    const p = JSON.parse(localStorage.getItem(userProfileKey(email)) || "null");
    return p && typeof p === "object" ? {age:"",gender:"Female",conditions:"",allergies:"",medications:"",mobile:"",language:"en-US",cycle:{lastPeriod:"",cycleLength:28,duration:5},...p} : { age:"", gender:"Female", conditions:"", allergies:"", medications:"", mobile:"", language:"en-US", cycle:{lastPeriod:"",cycleLength:28,duration:5} };
  } catch { return { age:"", gender:"Female", conditions:"", allergies:"", medications:"", mobile:"", language:"en-US", cycle:{lastPeriod:"",cycleLength:28,duration:5} }; }
}

// ╔══════════════════════════════════════════════════════════════╗
//   MAIN APP
// ╚══════════════════════════════════════════════════════════════╝

// ── 10/10 EXPERIENCE MODULES ────────────────────────────────────────────────
const LANGUAGES = [
  ["en-US","English"],["kn-IN","ಕನ್ನಡ"],["hi-IN","हिन्दी"]
];

const UI_TEXT = {
  "en-US": {
    healthDashboard:"PERSONAL HEALTH DASHBOARD", goodDay:"Good day", track:"Track habits, symptoms and health information in one place.",
    newAnalysis:"+ New Analysis", profile:"Profile", editProfile:"Edit Profile", logout:"Logout", checklist:"TODAY'S HEALTH CHECKLIST", quickTools:"QUICK HEALTH TOOLS",
    hospitals:"🏥 Hospitals & Specialists", trends:"📈 Symptom Trends", anatomy:"🧍 Full 3D Anatomy",
    healthProfile:"Health Profile", saveProfile:"💾 Save Profile", continue:"Continue →", howFeeling:"How are you feeling?",
    quickArea:"QUICK AREA:", clear:"Clear", analyze:"Analyze →", selectBody:"📍 Select on 3D Body",
    english:"English", kannada:"ಕನ್ನಡ", hindi:"हिन्दी",
    analysisComplete:"ANALYSIS COMPLETE", healthReport:"Your Health Report", primaryCondition:"PRIMARY CONDITION", differential:"DIFFERENTIAL DIAGNOSIS", interviewDetails:"SYMPTOM INTERVIEW DETAILS", rootCause:"ROOT CAUSE", lifestyle:"LIFESTYLE CONNECTION", mechanism:"PHYSIOLOGICAL MECHANISM", bodySystemView:"BODY SYSTEM VIEW", system:"SYSTEM", primaryArea:"PRIMARY RELATED AREA", organExplorer:"ORGAN EXPLORER", safetyTriage:"SAFETY TRIAGE", specialist:"SPECIALIST TO CONSIDER", immediateRelief:"IMMEDIATE RELIEF", avoid:"AVOID", eatMore:"EAT MORE", seeDoctor:"SEE A DOCTOR IF", disclaimer:"DISCLAIMER", modelConfidence:"MODEL CONFIDENCE", matchedSymptoms:"MATCHED SYMPTOMS", negatedSymptoms:"NEGATED SYMPTOMS", open3D:"🫀 Open 3D Anatomy Viewer →", modelEvidence:"MODEL EVIDENCE", whyLimits:"WHY THIS RESULT · LIMITS", showWhy:"Show Me Why", hide:"Hide", careNavigator:"Care Navigator", medicineExplorer:"Medicine Explorer", history:"Symptom History", doctorPdf:"Doctor Summary / PDF", relatedAreas:"Related areas", navigationNote:"This is a navigation suggestion based on the affected area, not a referral or diagnosis.", commonUses:"Common uses", whenUsed:"When it is commonly used", precautions:"Precautions / when to ask a professional", importantLimit:"Important limit", noLocalEntry:"No local entry found", allOrganSystems:"ALL ORGAN SYSTEMS", anatomyLayers:"ANATOMY LAYERS", selectedRegion:"SELECTED REGION", viewBySystem:"VIEW BY BODY SYSTEM", assetNotIncluded:"asset not included", openAnatomy:"Open 3D Anatomy", loadingAnatomy:"Loading real anatomy…", newBtn:"+ New"
  },
  "kn-IN": {
    healthDashboard:"ವೈಯಕ್ತಿಕ ಆರೋಗ್ಯ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್", goodDay:"ಶುಭ ದಿನ", track:"ಅಭ್ಯಾಸಗಳು, ಲಕ್ಷಣಗಳು ಮತ್ತು ಆರೋಗ್ಯ ಮಾಹಿತಿಯನ್ನು ಒಂದೇ ಸ್ಥಳದಲ್ಲಿ ಗಮನಿಸಿ.",
    newAnalysis:"+ ಹೊಸ ವಿಶ್ಲೇಷಣೆ", profile:"ಪ್ರೊಫೈಲ್", editProfile:"ಪ್ರೊಫೈಲ್ ಸಂಪಾದಿಸಿ", logout:"ಲಾಗ್‌ಔಟ್", checklist:"ಇಂದಿನ ಆರೋಗ್ಯ ಪರಿಶೀಲನೆ", quickTools:"ತ್ವರಿತ ಆರೋಗ್ಯ ಸಾಧನಗಳು",
    hospitals:"🏥 ಆಸ್ಪತ್ರೆಗಳು ಮತ್ತು ತಜ್ಞರು", trends:"📈 ಲಕ್ಷಣಗಳ ಇತಿಹಾಸ", anatomy:"🧍 ಸಂಪೂರ್ಣ 3D ದೇಹ",
    healthProfile:"ಆರೋಗ್ಯ ಪ್ರೊಫೈಲ್", saveProfile:"💾 ಪ್ರೊಫೈಲ್ ಉಳಿಸಿ", continue:"ಮುಂದುವರಿಸಿ →", howFeeling:"ನಿಮಗೆ ಹೇಗಿದೆ?",
    quickArea:"ತ್ವರಿತ ಪ್ರದೇಶ:", clear:"ಅಳಿಸಿ", analyze:"ವಿಶ್ಲೇಷಿಸಿ →", selectBody:"📍 3D ದೇಹದಲ್ಲಿ ಆಯ್ಕೆಮಾಡಿ",
    english:"English", kannada:"ಕನ್ನಡ", hindi:"ಹಿಂದಿ",
    analysisComplete:"ವಿಶ್ಲೇಷಣೆ ಪೂರ್ಣಗೊಂಡಿದೆ", healthReport:"ನಿಮ್ಮ ಆರೋಗ್ಯ ವರದಿ", primaryCondition:"ಮುಖ್ಯ ಸ್ಥಿತಿ", differential:"ಸಂಭಾವ್ಯ ಕಾರಣಗಳು", interviewDetails:"ಲಕ್ಷಣ ಸಂದರ್ಶನ ವಿವರಗಳು", rootCause:"ಮೂಲ ಕಾರಣ", lifestyle:"ಜೀವನಶೈಲಿ ಸಂಬಂಧ", mechanism:"ದೇಹದಲ್ಲಿ ನಡೆಯುವ ಪ್ರಕ್ರಿಯೆ", bodySystemView:"ದೇಹ ವ್ಯವಸ್ಥೆ", system:"ವ್ಯವಸ್ಥೆ", primaryArea:"ಮುಖ್ಯ ಸಂಬಂಧಿತ ಪ್ರದೇಶ", organExplorer:"ಅಂಗ ಪರಿಶೋಧಕ", safetyTriage:"ಸುರಕ್ಷತಾ ಮೌಲ್ಯಮಾಪನ", specialist:"ಪರಿಗಣಿಸಬೇಕಾದ ತಜ್ಞರು", immediateRelief:"ತಕ್ಷಣದ ಪರಿಹಾರ", avoid:"ತಪ್ಪಿಸಿ", eatMore:"ಹೆಚ್ಚು ಸೇವಿಸಿ", seeDoctor:"ವೈದ್ಯರನ್ನು ಸಂಪರ್ಕಿಸಿ", disclaimer:"ಹಕ್ಕುತ್ಯಾಗ", modelConfidence:"ಮಾದರಿ ವಿಶ್ವಾಸ", matchedSymptoms:"ಹೊಂದಿಕೆಯಾದ ಲಕ್ಷಣಗಳು", negatedSymptoms:"ನಿರಾಕರಿಸಿದ ಲಕ್ಷಣಗಳು", open3D:"🫀 3D ದೇಹದ ವೀಕ್ಷಕ →", newBtn:"+ ಹೊಸದು"
  },
  "hi-IN": {
    healthDashboard:"व्यक्तिगत स्वास्थ्य डैशबोर्ड", goodDay:"नमस्कार", track:"आदतों, लक्षणों और स्वास्थ्य जानकारी को एक जगह ट्रैक करें।",
    newAnalysis:"+ नया विश्लेषण", profile:"प्रोफ़ाइल", editProfile:"प्रोफ़ाइल संपादित करें", logout:"लॉगआउट", checklist:"आज की स्वास्थ्य सूची", quickTools:"त्वरित स्वास्थ्य उपकरण",
    hospitals:"🏥 अस्पताल और विशेषज्ञ", trends:"📈 लक्षण इतिहास", anatomy:"🧍 पूरा 3D शरीर",
    healthProfile:"स्वास्थ्य प्रोफ़ाइल", saveProfile:"💾 प्रोफ़ाइल सहेजें", continue:"जारी रखें →", howFeeling:"आप कैसा महसूस कर रहे हैं?",
    quickArea:"त्वरित क्षेत्र:", clear:"साफ़ करें", analyze:"विश्लेषण करें →", selectBody:"📍 3D शरीर पर चुनें",
    english:"English", kannada:"कन्नड़", hindi:"हिन्दी",
    analysisComplete:"विश्लेषण पूरा हुआ", healthReport:"आपकी स्वास्थ्य रिपोर्ट", primaryCondition:"मुख्य स्थिति", differential:"संभावित कारण", interviewDetails:"लक्षण विवरण", rootCause:"मूल कारण", lifestyle:"जीवनशैली संबंध", mechanism:"शरीर में क्या हो रहा है", bodySystemView:"शरीर प्रणाली", system:"प्रणाली", primaryArea:"मुख्य संबंधित क्षेत्र", organExplorer:"अंग जानकारी", safetyTriage:"सुरक्षा मूल्यांकन", specialist:"विचार करने योग्य विशेषज्ञ", immediateRelief:"तत्काल राहत", avoid:"बचें", eatMore:"अधिक खाएं", seeDoctor:"डॉक्टर से कब मिलें", disclaimer:"अस्वीकरण", modelConfidence:"मॉडल विश्वास", matchedSymptoms:"मिलान किए गए लक्षण", negatedSymptoms:"नकारे गए लक्षण", open3D:"🫀 3D एनाटॉमी देखें →", newBtn:"+ नया"
  }
};
const tx = (key, lang) => UI_TEXT[lang]?.[key] || UI_TEXT["en-US"][key] || key;
const UI_TEXT_EXTRA = {
  "kn-IN": {modelEvidence:"ಮಾದರಿ ಸಾಕ್ಷ್ಯ",whyLimits:"ಈ ಫಲಿತಾಂಶ · ಮಿತಿಗಳು",showWhy:"ಏಕೆ ಎಂದು ತೋರಿಸಿ",hide:"ಮರೆಮಾಡಿ",careNavigator:"ಆರೋಗ್ಯ ಮಾರ್ಗದರ್ಶಿ",medicineExplorer:"ಔಷಧ ಮಾಹಿತಿ",history:"ಲಕ್ಷಣಗಳ ಇತಿಹಾಸ",doctorPdf:"ವೈದ್ಯರ ಸಾರಾಂಶ / PDF",relatedAreas:"ಸಂಬಂಧಿತ ಪ್ರದೇಶಗಳು",navigationNote:"ಇದು ಪೀಡಿತ ಪ್ರದೇಶದ ಆಧಾರದ ಮೇಲಿನ ಮಾರ್ಗದರ್ಶನ ಮಾತ್ರ; ಇದು ರೆಫರಲ್ ಅಥವಾ ರೋಗನಿರ್ಣಯವಲ್ಲ.",commonUses:"ಸಾಮಾನ್ಯ ಬಳಕೆಗಳು",whenUsed:"ಸಾಮಾನ್ಯವಾಗಿ ಯಾವಾಗ ಬಳಸುತ್ತಾರೆ",precautions:"ಮುನ್ನೆಚ್ಚರಿಕೆಗಳು / ತಜ್ಞರನ್ನು ಸಂಪರ್ಕಿಸುವ ಸಂದರ್ಭ",importantLimit:"ಮುಖ್ಯ ಮಿತಿ",noLocalEntry:"ಸ್ಥಳೀಯ ಮಾಹಿತಿ ಕಂಡುಬಂದಿಲ್ಲ",allOrganSystems:"ಎಲ್ಲಾ ಅಂಗ ವ್ಯವಸ್ಥೆಗಳು",anatomyLayers:"ಅಂಗರಚನೆ ಪದರಗಳು",selectedRegion:"ಆಯ್ಕೆಮಾಡಿದ ಪ್ರದೇಶ",viewBySystem:"ದೇಹ ವ್ಯವಸ್ಥೆಯ ಮೂಲಕ ವೀಕ್ಷಿಸಿ",assetNotIncluded:"ಅಸೆಟ್ ಒಳಗೊಂಡಿಲ್ಲ",openAnatomy:"3D ಅಂಗರಚನೆ ತೆರೆಯಿರಿ",loadingAnatomy:"ನೈಜ ಅಂಗರಚನೆ ಲೋಡ್ ಆಗುತ್ತಿದೆ…"},
  "hi-IN": {modelEvidence:"मॉडल साक्ष्य",whyLimits:"यह परिणाम · सीमाएँ",showWhy:"क्यों दिखाएँ",hide:"छिपाएँ",careNavigator:"देखभाल मार्गदर्शक",medicineExplorer:"दवा जानकारी",history:"लक्षण इतिहास",doctorPdf:"डॉक्टर सारांश / PDF",relatedAreas:"संबंधित क्षेत्र",navigationNote:"यह प्रभावित क्षेत्र पर आधारित मार्गदर्शन है; यह रेफरल या निदान नहीं है।",commonUses:"सामान्य उपयोग",whenUsed:"आमतौर पर कब उपयोग किया जाता है",precautions:"सावधानियाँ / विशेषज्ञ से कब पूछें",importantLimit:"महत्वपूर्ण सीमा",noLocalEntry:"स्थानीय जानकारी नहीं मिली",allOrganSystems:"सभी अंग प्रणालियाँ",anatomyLayers:"शरीररचना परतें",selectedRegion:"चयनित क्षेत्र",viewBySystem:"शरीर प्रणाली के अनुसार देखें",assetNotIncluded:"एसेट शामिल नहीं है",openAnatomy:"3D एनाटॉमी खोलें",loadingAnatomy:"वास्तविक एनाटॉमी लोड हो रही है…"}
};
const tx2 = (key, lang) => UI_TEXT_EXTRA[lang]?.[key] || UI_TEXT[lang]?.[key] || UI_TEXT["en-US"]?.[key] || key;


// Localized deterministic analysis text used when the backend is running in
// demo/mock mode. AI-generated text is left untouched when a real provider is connected.
const LOCAL_RESULT_TEXT = {
  "kn-IN": {
    conditions:{"Neurological Symptoms":"ನರವ್ಯವಸ್ಥೆಯ ಲಕ್ಷಣಗಳು","Digestive / Stomach Symptoms":"ಜೀರ್ಣಕ್ರಿಯೆ / ಹೊಟ್ಟೆಯ ಲಕ್ಷಣಗಳು","Musculoskeletal / Joint Symptoms":"ಮಾಂಸಖಂಡ / ಸಂಧಿ ಲಕ್ಷಣಗಳು","Urinary / Bladder Symptoms":"ಮೂತ್ರ / ಮೂತ್ರಕೋಶದ ಲಕ್ಷಣಗಳು","Skin / Face Symptoms":"ಚರ್ಮ / ಮುಖದ ಲಕ್ಷಣಗಳು","Menstrual / Pelvic Symptoms":"ಮಾಸಿಕ / ಶ್ರೋಣಿಯ ಲಕ್ಷಣಗಳು","Respiratory Symptoms":"ಉಸಿರಾಟದ ಲಕ್ಷಣಗಳು","Chest / Heart Symptoms":"ಎದೆ / ಹೃದಯದ ಲಕ್ಷಣಗಳು","Liver-area Symptoms":"ಯಕೃತ್ ಪ್ರದೇಶದ ಲಕ್ಷಣಗಳು","Gallbladder-area Symptoms":"ಪಿತ್ತಕೋಶ ಪ್ರದೇಶದ ಲಕ್ಷಣಗಳು","Pancreatic-area Symptoms":"ಅಗ್ನ್ಯಾಶಯ ಪ್ರದೇಶದ ಲಕ್ಷಣಗಳು","Kidney-area Symptoms":"ಮೂತ್ರಪಿಂಡ ಪ್ರದೇಶದ ಲಕ್ಷಣಗಳು","Back / Spine Symptoms":"ಬೆನ್ನು / ಬೆನ್ನುಹುರಿಯ ಲಕ್ಷಣಗಳು","Intestinal Symptoms":"ಕರುಳಿನ ಲಕ್ಷಣಗಳು","Bowel / Colon Symptoms":"ಕರುಳು / ಕೊಲನ್ ಲಕ್ಷಣಗಳು","Spleen-area Symptoms":"ಪ್ಲೀಹಾ ಪ್ರದೇಶದ ಲಕ್ಷಣಗಳು","Reproductive / Pelvic Symptoms":"ಪ್ರಜನನ / ಶ್ರೋಣಿಯ ಲಕ್ಷಣಗಳು","Prostate / Urinary Symptoms":"ಪ್ರೋಸ್ಟೇಟ್ / ಮೂತ್ರದ ಲಕ್ಷಣಗಳು","Testicular Symptoms":"ವೃಷಣದ ಲಕ್ಷಣಗಳು"},
    system:{"Neurological":"ನರವ್ಯವಸ್ಥೆ","Cardiovascular":"ಹೃದಯ ಮತ್ತು ರಕ್ತನಾಳ ವ್ಯವಸ್ಥೆ","Respiratory":"ಉಸಿರಾಟ ವ್ಯವಸ್ಥೆ","Digestive":"ಜೀರ್ಣಕ್ರಿಯೆ ವ್ಯವಸ್ಥೆ","Renal":"ಮೂತ್ರಪಿಂಡ ವ್ಯವಸ್ಥೆ","Immune":"ರೋಗನಿರೋಧಕ ವ್ಯವಸ್ಥೆ","Skeletal":"ಅಸ್ಥಿ ವ್ಯವಸ್ಥೆ","Endocrine":"ಅಂತಃಸ್ರಾವಕ ವ್ಯವಸ್ಥೆ","Integumentary":"ಚರ್ಮ ವ್ಯವಸ್ಥೆ","Reproductive":"ಪ್ರಜನನ ವ್ಯವಸ್ಥೆ","Reproductive / Pelvic":"ಪ್ರಜನನ / ಶ್ರೋಣಿ","Musculoskeletal":"ಮಾಂಸಖಂಡ ಮತ್ತು ಸಂಧಿಗಳು"},
    common:{why:"ಈ ಲಕ್ಷಣಗಳಿಗೆ ಹಲವು ಸಾಧ್ಯ ಕಾರಣಗಳಿರಬಹುದು. ಲಕ್ಷಣಗಳ ತೀವ್ರತೆ, ಅವಧಿ ಮತ್ತು ಇತರ ಬದಲಾವಣೆಗಳನ್ನು ಗಮನಿಸಿ.",lifestyle:"ಜೀವನಶೈಲಿ ಕೆಲವು ಲಕ್ಷಣಗಳ ಮೇಲೆ ಪರಿಣಾಮ ಬೀರಬಹುದು, ಆದರೆ ಇದರಿಂದ ರೋಗನಿರ್ಣಯ ಮಾಡಲಾಗುವುದಿಲ್ಲ. ಸಮಯ, ಪ್ರಚೋದಕಗಳು ಮತ್ತು ಬದಲಾವಣೆಗಳನ್ನು ದಾಖಲಿಸಿ.",mechanism:"ದೇಹದ ಸಂಬಂಧಿತ ಅಂಗ ಅಥವಾ ವ್ಯವಸ್ಥೆಯಲ್ಲಿ ಬದಲಾವಣೆ, ಉರಿಯೂತ ಅಥವಾ ಒತ್ತಡವು ಈ ರೀತಿಯ ಲಕ್ಷಣಗಳಿಗೆ ಕಾರಣವಾಗಬಹುದು.",relief:["ವಿಶ್ರಾಂತಿ ತೆಗೆದುಕೊಳ್ಳಿ ಮತ್ತು ಲಕ್ಷಣವನ್ನು ಗಮನಿಸಿ","ಸಾಮಾನ್ಯವಾಗಿ ಸಾಕಷ್ಟು ನೀರು ಕುಡಿಯಿರಿ","ಲಕ್ಷಣವನ್ನು ಹೆಚ್ಚಿಸುವ ಚಟುವಟಿಕೆ ಅಥವಾ ಕಾರಣಗಳನ್ನು ತಪ್ಪಿಸಿ","ತೀವ್ರವಾದರೆ ಅಥವಾ ಹೆಚ್ಚಾದರೆ ವೈದ್ಯಕೀಯ ಸಲಹೆ ಪಡೆಯಿರಿ"],avoid:["ನಿಮಗೆ ತಿಳಿದಿರುವ ವೈಯಕ್ತಿಕ ಪ್ರಚೋದಕಗಳು","ಅತಿಯಾದ ಮದ್ಯಪಾನ","ತುಂಬಾ ಭಾರವಾದ ಊಟ"],eat:["ನೀರು","ಹಣ್ಣುಗಳು","ತರಕಾರಿಗಳು"],doctor:"ತೀವ್ರ, ಹಠಾತ್, ಹೆಚ್ಚುತ್ತಿರುವ ಅಥವಾ ಅಸಾಮಾನ್ಯ ಲಕ್ಷಣಗಳಿಗೆ ತಕ್ಷಣ ವೈದ್ಯಕೀಯ ಸಹಾಯ ಪಡೆಯಿರಿ. ನಿರಂತರ ಅಥವಾ ಕಳವಳಕಾರಿ ಲಕ್ಷಣಗಳಿಗೆ ಅರ್ಹ ವೈದ್ಯರನ್ನು ಸಂಪರ್ಕಿಸಿ.",recovery:"ಮೂಲ ಕಾರಣದ ಮೇಲೆ ಅವಲಂಬಿತವಾಗಿದೆ",disclaimer:"ಈ ವಿಶ್ಲೇಷಣೆ ಶೈಕ್ಷಣಿಕ ಉದ್ದೇಶಗಳಿಗಾಗಿ ಮಾತ್ರ. SymptomLens ವೈದ್ಯಕೀಯ ರೋಗನಿರ್ಣಯ ನೀಡುವುದಿಲ್ಲ. ಅರ್ಹ ಆರೋಗ್ಯ ವೃತ್ತಿಪರರನ್ನು ಸಂಪರ್ಕಿಸಿ."}
  },
  "hi-IN": {
    conditions:{"Neurological Symptoms":"न्यूरोलॉजिकल लक्षण","Digestive / Stomach Symptoms":"पाचन / पेट के लक्षण","Musculoskeletal / Joint Symptoms":"मांसपेशी / जोड़ के लक्षण","Urinary / Bladder Symptoms":"मूत्र / मूत्राशय के लक्षण","Skin / Face Symptoms":"त्वचा / चेहरे के लक्षण","Menstrual / Pelvic Symptoms":"मासिक धर्म / पेल्विक लक्षण","Respiratory Symptoms":"श्वसन लक्षण","Chest / Heart Symptoms":"छाती / हृदय के लक्षण","Liver-area Symptoms":"यकृत क्षेत्र के लक्षण","Gallbladder-area Symptoms":"पित्ताशय क्षेत्र के लक्षण","Pancreatic-area Symptoms":"अग्न्याशय क्षेत्र के लक्षण","Kidney-area Symptoms":"गुर्दे के क्षेत्र के लक्षण","Back / Spine Symptoms":"पीठ / रीढ़ के लक्षण","Intestinal Symptoms":"आंतों के लक्षण","Bowel / Colon Symptoms":"आंत / कोलन के लक्षण","Spleen-area Symptoms":"प्लीहा क्षेत्र के लक्षण","Reproductive / Pelvic Symptoms":"प्रजनन / पेल्विक लक्षण","Prostate / Urinary Symptoms":"प्रोस्टेट / मूत्र के लक्षण","Testicular Symptoms":"अंडकोष के लक्षण"},
    system:{"Neurological":"न्यूरोलॉजिकल","Cardiovascular":"हृदय और रक्तवाहिका","Respiratory":"श्वसन","Digestive":"पाचन","Renal":"मूत्र / गुर्दे","Immune":"प्रतिरक्षा","Skeletal":"कंकाल","Endocrine":"अंतःस्रावी","Integumentary":"त्वचा","Reproductive":"प्रजनन","Reproductive / Pelvic":"प्रजनन / पेल्विक","Musculoskeletal":"मांसपेशी और जोड़"},
    common:{why:"इन लक्षणों के कई संभावित कारण हो सकते हैं। लक्षणों की तीव्रता, अवधि और अन्य बदलावों पर ध्यान दें।",lifestyle:"जीवनशैली कुछ लक्षणों को प्रभावित कर सकती है, लेकिन इससे निदान तय नहीं होता। समय, ट्रिगर और बदलावों को नोट करें।",mechanism:"संबंधित अंग या शरीर प्रणाली में बदलाव, सूजन या तनाव इस प्रकार के लक्षण पैदा कर सकते हैं।",relief:["आराम करें और लक्षण पर नज़र रखें","सामान्य रूप से पर्याप्त पानी पिएँ","लक्षण बढ़ाने वाली गतिविधि या ट्रिगर से बचें","लक्षण गंभीर या बढ़ता हो तो चिकित्सकीय सलाह लें"],avoid:["ज्ञात व्यक्तिगत ट्रिगर","अधिक शराब","बहुत भारी भोजन"],eat:["पानी","फल","सब्जियाँ"],doctor:"गंभीर, अचानक, बढ़ते या असामान्य लक्षणों के लिए तुरंत चिकित्सा सहायता लें। लगातार या चिंताजनक लक्षणों के लिए योग्य डॉक्टर से संपर्क करें।",recovery:"मूल कारण पर निर्भर करता है",disclaimer:"यह विश्लेषण केवल शैक्षणिक जानकारी के लिए है। SymptomLens चिकित्सा निदान प्रदान नहीं करता। योग्य स्वास्थ्य पेशेवर से सलाह लें।"}
  }
};
function localizedOrganLabel(organ, lang) {
  const key=normalizeOrganKey(organ);
  const maps={
    "kn-IN":{Brain:"ಮೆದುಳು",Heart:"ಹೃದಯ",Lungs:"ಶ್ವಾಸಕೋಶಗಳು",Liver:"ಯಕೃತ್",Stomach:"ಹೊಟ್ಟೆ",Kidneys:"ಮೂತ್ರಪಿಂಡಗಳು",SmallInt:"ಸಣ್ಣ ಕರುಳು",LargeInt:"ದೊಡ್ಡ ಕರುಳು",Gallbladder:"ಪಿತ್ತಕೋಶ",Spleen:"ಪ್ಲೀಹ",Bladder:"ಮೂತ್ರಕೋಶ",Spine:"ಬೆನ್ನುಹುರಿ",Pancreas:"ಅಗ್ನ್ಯಾಶಯ",Skin:"ಚರ್ಮ / ಮುಖ",Pelvic:"ಶ್ರೋಣಿ ಪ್ರದೇಶ",Joints:"ಸಂಧಿಗಳು / ಮಾಂಸಖಂಡ",Uterus:"ಗರ್ಭಾಶಯ",Ovaries:"ಅಂಡಾಶಯಗಳು",Testes:"ವೃಷಣಗಳು",Prostate:"ಪ್ರೋಸ್ಟೇಟ್"},
    "hi-IN":{Brain:"मस्तिष्क",Heart:"हृदय",Lungs:"फेफड़े",Liver:"यकृत",Stomach:"पेट",Kidneys:"गुर्दे",SmallInt:"छोटी आंत",LargeInt:"बड़ी आंत",Gallbladder:"पित्ताशय",Spleen:"प्लीहा",Bladder:"मूत्राशय",Spine:"रीढ़",Pancreas:"अग्न्याशय",Skin:"त्वचा / चेहरा",Pelvic:"पेल्विक क्षेत्र",Joints:"जोड़ / मांसपेशियां",Uterus:"गर्भाशय",Ovaries:"अंडाशय",Testes:"अंडकोष",Prostate:"प्रोस्टेट"}
  };
  return maps[lang]?.[key] || ORGANS[key]?.label || organ || "";
}
function localizedSystemLabel(system, lang) { return UI_TEXT[lang]?.system?.[system] || system || ""; }

function localizeResult(result, lang) {
  if (!result || !LOCAL_RESULT_TEXT[lang]) return result;

  const l = LOCAL_RESULT_TEXT[lang];
  const out = { ...result };
  const map = { ...(l.conditions || {}) };

  // Dynamic result translations used by the analysis report.
  // These are kept separate from the general UI text so English
  // condition/organ/severity values returned by the backend are
  // displayed in the selected language.
  const dynamicTranslations = {
    "kn-IN": {
      "Tension Headache": "ಒತ್ತಡದ ತಲೆನೋವು",
      "Other possible cause": "ಇತರೆ ಸಾಧ್ಯ ಕಾರಣ",
      "Needs clinical assessment": "ವೈದ್ಯಕೀಯ ಮೌಲ್ಯಮಾಪನ ಅಗತ್ಯ",
      "Brain": "ಮೆದುಳು",
      "Heart": "ಹೃದಯ",
      "Lungs": "ಶ್ವಾಸಕೋಶಗಳು",
      "Liver": "ಯಕೃತ್",
      "Stomach": "ಹೊಟ್ಟೆ",
      "Kidneys": "ಮೂತ್ರಪಿಂಡಗಳು",
      "Bladder": "ಮೂತ್ರಕೋಶ",
      "Pancreas": "ಅಗ್ನ್ಯಾಶಯ",
      "Spleen": "ಪ್ಲೀಹ",
      "Uterus": "ಗರ್ಭಾಶಯ",
      "Ovaries": "ಅಂಡಾಶಯಗಳು",
      "Spine": "ಬೆನ್ನುಹುರಿ",
      "Moderate": "ಮಧ್ಯಮ",
      "Mild": "ಸೌಮ್ಯ",
      "Severe": "ತೀವ್ರ",
      "High model probability": "ಹೆಚ್ಚಿನ ಮಾದರಿ ಸಾಧ್ಯತೆ",
      "Moderate model probability": "ಮಧ್ಯಮ ಮಾದರಿ ಸಾಧ್ಯತೆ",
      "Low model probability": "ಕಡಿಮೆ ಮಾದರಿ ಸಾಧ್ಯತೆ"
    },
    "hi-IN": {
      "Tension Headache": "तनावजन्य सिरदर्द",
      "Other possible cause": "अन्य संभावित कारण",
      "Needs clinical assessment": "चिकित्सकीय मूल्यांकन आवश्यक",
      "Brain": "मस्तिष्क",
      "Heart": "हृदय",
      "Lungs": "फेफड़े",
      "Liver": "यकृत",
      "Stomach": "पेट",
      "Kidneys": "गुर्दे",
      "Bladder": "मूत्राशय",
      "Pancreas": "अग्न्याशय",
      "Spleen": "प्लीहा",
      "Uterus": "गर्भाशय",
      "Ovaries": "अंडाशय",
      "Spine": "रीढ़",
      "Moderate": "मध्यम",
      "Mild": "हल्का",
      "Severe": "गंभीर",
      "High model probability": "उच्च मॉडल संभावना",
      "Moderate model probability": "मध्यम मॉडल संभावना",
      "Low model probability": "कम मॉडल संभावना"
    }
  };

  const dynamic = dynamicTranslations[lang] || {};
  Object.assign(map, dynamic);

  // Primary condition
  out.primary_condition =
    map[out.primary_condition] || out.primary_condition;

  // Keep organ/system identifiers canonical for the application state and 3D
  // mapping. The report translates their visible labels instead of replacing
  // the internal keys with localized strings.
  if (Array.isArray(out.matched_symptoms)) {
    const symptomMap = lang === "kn-IN" ? {headache:"ತಲೆನೋವು", fever:"ಜ್ವರ", nausea:"ವಾಕರಿಕೆ", cough:"ಕೆಮ್ಮು", "sore throat":"ಗಂಟಲು ನೋವು", fatigue:"ಆಯಾಸ", weakness:"ದೌರ್ಬಲ್ಯ", vomiting:"ವಾಂತಿ"} : lang === "hi-IN" ? {headache:"सिरदर्द", fever:"बुखार", nausea:"मतली", cough:"खांसी", "sore throat":"गले में खराश", fatigue:"थकान", weakness:"कमजोरी", vomiting:"उल्टी"} : {};
    out.matched_symptoms = out.matched_symptoms.map(x => symptomMap[x] || x);
  }
  if (Array.isArray(out.negated_symptoms)) {
    const symptomMap = lang === "kn-IN" ? {headache:"ತಲೆನೋವು", fever:"ಜ್ವರ", nausea:"ವಾಕರಿಕೆ", cough:"ಕೆಮ್ಮು"} : lang === "hi-IN" ? {headache:"सिरदर्द", fever:"बुखार", nausea:"मतली", cough:"खांसी"} : {};
    out.negated_symptoms = out.negated_symptoms.map(x => symptomMap[x] || x);
  }

  if (out.affected_organ) {
    out.affected_organ =
      dynamic[out.affected_organ] || out.affected_organ;
  }

  // Differential diagnosis names and severity badges
  if (Array.isArray(out.conditions)) {
    out.conditions = out.conditions.map(c => ({
      ...c,
      name: map[c.name] || c.name,
      severity: dynamic[c.severity] || c.severity
    }));
  }

  // Deterministic explanatory content
  out.why_it_happened = l.common.why;
  out.lifestyle_connection = l.common.lifestyle;
  out.mechanism = l.common.mechanism;
  out.immediate_relief = l.common.relief;
  out.foods_to_avoid = l.common.avoid;
  out.foods_to_eat = l.common.eat;
  out.see_doctor_if = l.common.doctor;
  out.recovery_time = l.common.recovery;
  out.disclaimer = l.common.disclaimer;

  return out;
}


const MEDICINES = {
  paracetamol:{name:"Paracetamol (Acetaminophen)",category:"Pain / fever",uses:"Commonly used for pain and fever relief.",when:"Often used for short-term mild to moderate pain or fever according to the package label.",avoid:"Do not exceed the label dose. Avoid duplicate products containing paracetamol and ask a clinician/pharmacist if you have liver disease or heavy alcohol use.",notFor:"It does not treat the underlying cause of every type of pain or fever."},
  acetaminophen:{name:"Paracetamol (Acetaminophen)",category:"Pain / fever",uses:"Commonly used for pain and fever relief.",when:"Often used for short-term mild to moderate pain or fever according to the package label.",avoid:"Do not exceed the label dose. Avoid duplicate products containing paracetamol and ask a clinician/pharmacist if you have liver disease or heavy alcohol use.",notFor:"It does not treat the underlying cause of every type of pain or fever."},
  ibuprofen:{name:"Ibuprofen",category:"Pain / inflammation",uses:"An NSAID commonly used for pain, inflammation and fever.",when:"Used for some short-term pain or inflammatory symptoms when appropriate for the person.",avoid:"Check the label and ask a clinician/pharmacist if you have stomach ulcers, kidney disease, take blood thinners, or are pregnant.",notFor:"Not appropriate for everyone; do not combine NSAIDs without professional advice."},
  cetirizine:{name:"Cetirizine",category:"Allergy",uses:"An antihistamine commonly used for allergy symptoms such as sneezing and itching.",when:"Used for common allergy symptoms according to the product label.",avoid:"May cause drowsiness in some people. Check the label and ask a clinician/pharmacist about interactions.",notFor:"It does not treat every cause of cough, rash or breathing difficulty."},
  loratadine:{name:"Loratadine",category:"Allergy",uses:"An antihistamine used for common allergy symptoms.",when:"Used according to the product label for allergy symptoms.",avoid:"Check the label for interactions and age restrictions.",notFor:"It does not treat every cause of breathing difficulty."},
  omeprazole:{name:"Omeprazole",category:"Acid-related symptoms",uses:"Reduces stomach acid and is used for some acid-related conditions.",when:"Used for certain acid-related symptoms according to product or clinician instructions.",avoid:"Persistent symptoms need assessment; check interactions and label directions.",notFor:"It should not be used to self-diagnose unexplained chest or abdominal pain."},
  antacid:{name:"Antacid",category:"Heartburn / indigestion",uses:"Neutralizes stomach acid and can provide short-term relief of heartburn or indigestion.",when:"Used for occasional acid-related discomfort according to the label.",avoid:"Check interactions and separate from medicines when the product label advises it.",notFor:"Persistent or severe abdominal/chest symptoms need medical assessment."},
  oralrehydration:{name:"Oral Rehydration Solution (ORS)",category:"Hydration",uses:"Replaces water and electrolytes lost during dehydration from conditions such as diarrhea or vomiting.",when:"Used when fluid and electrolyte replacement is needed, following the product instructions.",avoid:"Do not use as a substitute for urgent care when dehydration is severe.",notFor:"It does not treat the underlying cause of persistent diarrhea or vomiting."},
  diphenhydramine:{name:"Diphenhydramine",category:"Allergy / antihistamine",uses:"An antihistamine used for some allergy symptoms; it can cause drowsiness.",when:"Use only according to the product label and age guidance.",avoid:"Can cause drowsiness and interact with other sedating medicines; avoid driving if drowsy.",notFor:"Not a treatment for severe breathing difficulty or an unexplained serious reaction."},
  famotidine:{name:"Famotidine",category:"Acid-related symptoms",uses:"Reduces stomach acid and is used for some heartburn and acid-related conditions.",when:"Use according to the product label or clinician instructions.",avoid:"Persistent chest or abdominal pain needs assessment rather than self-treatment.",notFor:"Does not diagnose the cause of unexplained pain."},
  calciumcarbonate:{name:"Calcium Carbonate",category:"Antacid / calcium",uses:"Neutralizes stomach acid and is used for occasional heartburn or indigestion.",when:"Use according to the product label.",avoid:"Check interactions with other medicines and avoid exceeding label directions.",notFor:"Persistent or severe symptoms need medical assessment."},
  naproxen:{name:"Naproxen",category:"Pain / inflammation",uses:"An NSAID used for some pain and inflammatory conditions.",when:"Use only when appropriate and according to label or clinician directions.",avoid:"Ask a clinician/pharmacist if you have ulcers, kidney disease, take blood thinners, or are pregnant.",notFor:"Do not combine NSAIDs without professional advice."},
  diclofenac:{name:"Diclofenac",category:"Pain / inflammation",uses:"An NSAID used for some pain and inflammation.",when:"Use according to product or clinician instructions.",avoid:"Check cardiovascular, kidney, stomach and medicine-interaction risks with a clinician/pharmacist.",notFor:"Not suitable for everyone."},
  zincoxide:{name:"Zinc Oxide",category:"Skin protectant",uses:"A topical skin protectant used for some irritation and moisture-related skin problems.",when:"Apply according to the product label.",avoid:"Do not use on serious wounds or if the product causes a reaction.",notFor:"It does not diagnose the cause of a rash or skin lesion."},
  benzoylperoxide:{name:"Benzoyl Peroxide",category:"Acne topical",uses:"A topical ingredient commonly used to reduce acne-causing bacteria and clogged pores.",when:"Use according to the product label; start gradually if irritation occurs.",avoid:"Can irritate or dry skin and can bleach fabrics.",notFor:"Severe or persistent acne may need a dermatologist."},
  clotrimazole:{name:"Clotrimazole topical",category:"Antifungal",uses:"A topical antifungal used for some fungal skin infections.",when:"Used for specific superficial fungal infections according to the product label or clinician advice.",avoid:"Avoid eyes and stop/use medical advice if severe irritation occurs.",notFor:"Not appropriate for every rash or skin condition."},
  hydrocortisone:{name:"Hydrocortisone topical",category:"Skin inflammation",uses:"A mild topical corticosteroid used for some inflammatory skin conditions.",when:"Used short-term and exactly as directed on the product label or by a clinician.",avoid:"Do not use on untreated infections, eyes, or large areas without professional advice.",notFor:"It does not treat every cause of acne or rash."},
  salbutamol:{name:"Salbutamol (Albuterol)",category:"Bronchodilator",uses:"A prescription/inhaled bronchodilator used to relieve bronchospasm in conditions such as asthma.",when:"Use only according to the prescribed or product instructions.",avoid:"Do not use someone else's inhaler or delay urgent care for severe breathing difficulty.",notFor:"It is not a substitute for emergency assessment of severe breathing problems."},
  amoxicillin:{name:"Amoxicillin",category:"Antibiotic",uses:"A prescription antibiotic used for certain bacterial infections.",when:"Only when prescribed or specifically recommended by a qualified clinician.",avoid:"Do not self-start antibiotics or use leftover doses; check allergy history and interactions.",notFor:"It does not treat viral infections or most uncomplicated colds."},
  azithromycin:{name:"Azithromycin",category:"Antibiotic",uses:"A prescription antibiotic used for selected bacterial infections.",when:"Only when prescribed by a qualified clinician.",avoid:"Do not self-medicate; interactions and heart-rhythm risks can matter.",notFor:"It does not treat viral infections."}
};

const SPECIALISTS = {
  Brain:"Neurologist", Heart:"Cardiologist", Lungs:"Pulmonologist", Liver:"Gastroenterologist",
  Stomach:"Gastroenterologist", Kidneys:"Nephrologist", Bladder:"Urologist", Spine:"Orthopedist",
  SmallInt:"Gastroenterologist", LargeInt:"Gastroenterologist", Gallbladder:"Gastroenterologist",
  Spleen:"General Physician", Pancreas:"Gastroenterologist", Skin:"Dermatologist", Pelvic:"Gynecologist", Uterus:"Gynecologist", Ovaries:"Gynecologist",
  Joints:"Orthopedist", Testes:"Urologist", Prostate:"Urologist"
};

function cleanSymptomText(text=""){
  let s=String(text).trim();
  const replacements={hedache:"headache",headche:"headache",fevr:"fever",stomch:"stomach",stomache:"stomach",kidny:"kidney",kidnes:"kidneys",lungss:"lungs",pian:"pain",pianful:"painful",vomitng:"vomiting",urinitate:"urinate",urinatng:"urinating",breth:"breath",brething:"breathing",dizzyy:"dizzy",acheing:"aching"};
  Object.entries(replacements).forEach(([a,b])=>{s=s.replace(new RegExp(`\\b${a}\\b`,"gi"),b);});
  return s.replace(/\s+/g," ").trim();
}

function triageForResult(result, text=""){
  const s=(text||"").toLowerCase();
  const redFlags=["severe chest pain","crushing chest pain","difficulty breathing","can't breathe","cannot breathe","fainted","fainting","seizure","sudden weakness","face drooping","slurred speech","heavy bleeding","vomiting blood","blood in vomit","black stool","severe allergic reaction"];
  if(redFlags.some(x=>s.includes(x))) return {level:"Urgent",color:T.red,icon:"🚨",text:"This symptom pattern may need urgent medical assessment. If severe or rapidly worsening, seek emergency care now."};
  return {level:"Monitor / Consider care",color:T.yellow,icon:"🟡",text:"SymptomLens provides educational guidance, not a diagnosis. Persistent, worsening, or concerning symptoms should be assessed by a qualified clinician."};
}

function specialistFor(result){
  return SPECIALISTS[normalizeOrganKey(result?.organ_affected)] || "General Physician";
}

function loadJSON(key, fallback){try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback));}catch{return fallback;}}

class AppErrorBoundary extends React.Component {
  constructor(props){ super(props); this.state={error:null}; }
  static getDerivedStateFromError(error){ return {error}; }
  componentDidCatch(error, info){ console.error("[SymptomLens] Render error", error, info); }
  render(){
    if(this.state.error){
      return <div style={{minHeight:"100vh",background:T.bg,color:T.white,padding:40,fontFamily:"Sora, sans-serif"}}><div style={{maxWidth:760,margin:"60px auto",background:T.bgCard,border:`1px solid ${T.red}66`,borderRadius:16,padding:28}}><div style={{fontSize:12,color:T.red,fontFamily:"'JetBrains Mono', monospace",letterSpacing:1.5,marginBottom:8}}>SYMPTOMLENS RENDER ERROR</div><h1 style={{fontSize:28,marginBottom:10}}>The screen could not be rendered.</h1><p style={{color:T.silver,lineHeight:1.7}}>The app caught the render error instead of showing a blank white page.</p><pre style={{marginTop:16,padding:14,background:T.bgPanel,borderRadius:10,color:"#FFAABB",whiteSpace:"pre-wrap",fontSize:11,overflowX:"auto"}}>{String(this.state.error?.stack || this.state.error)}</pre><button className="btn btn-primary" style={{marginTop:16}} onClick={()=>window.location.reload()}>Refresh SymptomLens</button></div></div>;
    }
    return this.props.children;
  }
}

function App() {
  const [screen,   setScreen]   = useState("welcome");
  const [authMode, setAuthMode] = useState("signup");
  const [user,     setUser]     = useState(null);
  const [profile,  setProfile]  = useState({ age:"", gender:"Female", conditions:"", allergies:"", medications:"", mobile:"", language:"en-US", cycle:{lastPeriod:"",cycleLength:28,duration:5} });
  const [symptoms, setSymptoms] = useState("");

// MICROPHONE FEATURE
  const recognitionRef = useRef(null);
  const [voiceLanguage, setVoiceLanguage] = useState(()=>localStorage.getItem("sl_voice_language")||localStorage.getItem("sl_language")||"en-US");
  const [isListening, setIsListening] = useState(false);
  const [micError, setMicError] = useState("");

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMicError("Speech input is not supported here. Please use Google Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = voiceLanguage;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setMicError("");
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0]?.transcript || "")
        .join(" ")
        .trim();
      if (transcript) {
        setSymptoms(prev => prev.trim() ? `${prev.trim()} ${transcript}` : transcript);
        setSymptomErr("");
      }
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      console.error("Microphone error:", event.error);
      setIsListening(false);
      const messages = {
        "not-allowed": "Microphone permission was blocked. Click the lock icon beside localhost and allow Microphone.",
        "service-not-allowed": "Speech recognition is not available. Try Google Chrome.",
        "no-speech": "I didn't hear anything. Please try again and speak clearly.",
        "audio-capture": "No microphone was found. Check your microphone connection.",
      };
      setMicError(messages[event.error] || "Microphone could not be started. Please try again.");
    };

    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;

    return () => {
      try { recognition.abort(); } catch {}
      recognitionRef.current = null;
    };
  }, [voiceLanguage]);

  const startListening = async () => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      setMicError("Speech input is not supported here. Please use Google Chrome.");
      return;
    }
    if (isListening) {
      try { recognition.stop(); } catch {}
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setMicError("");
      recognition.lang = voiceLanguage;
      recognition.start();
    } catch (err) {
      console.error(err);
      setIsListening(false);
      setMicError("Please allow microphone access for localhost:5173, then click Speak again.");
    }
  };
  const [result,   setResult]   = useState(null);
  const [loadMsg,  setLoadMsg]  = useState("");
  const [history,  setHistory]  = useState([]);
  const [followupQuestions, setFollowupQuestions] = useState([]);
  const [followupAnswers, setFollowupAnswers] = useState({});
  const [followupIndex, setFollowupIndex] = useState(0);
  const [followupBaseSymptoms, setFollowupBaseSymptoms] = useState("");
  const [selectedOrgan, setSelectedOrgan] = useState(null);
  const [systemFilter, setSystemFilter] = useState("All");
  const [whyOpen, setWhyOpen] = useState(false);
  const [doctorSummary, setDoctorSummary] = useState(null);
  const [painLocation, setPainLocation] = useState("");
  const [dashboardChecks, setDashboardChecks] = useState({});
  useEffect(()=>{ if(user?.email) setDashboardChecks(loadJSON(`sl_daily_checks_${user.email.toLowerCase()}`,{})); },[user?.email]);
  const [language, setLanguage] = useState(()=>localStorage.getItem("sl_language")||"en-US");
  useEffect(()=>{
    setVoiceLanguage(language);
    localStorage.setItem("sl_voice_language", language);
    if (user?.email) {
      try {
        const stored = readUserProfile(user.email);
        localStorage.setItem(userProfileKey(user.email), JSON.stringify({ ...stored, ...profile, language, cycle: profile.gender === "Female" ? cycle : null }));
      } catch {}
    }
  },[language]);
  const [medicineQuery, setMedicineQuery] = useState("");
  const [medicineInfo, setMedicineInfo] = useState(null);
  const [anatomyLayers, setAnatomyLayers] = useState({skin:true,organs:true,skeleton:false,muscles:false,nerves:false,vessels:false});
  const [cycle, setCycle] = useState(()=>loadJSON("sl_cycle",{lastPeriod:"",cycleLength:28,duration:5}));
  const [dashboardNote, setDashboardNote] = useState(()=>localStorage.getItem(`sl_note_${user?.email||"guest"}`)||"");

  useEffect(() => {
    if (!selectedOrgan) return;
    if (!anatomyAllowedForGender(selectedOrgan, profile.gender)) {
      setSelectedOrgan(null);
      setSystemFilter("All");
    }
  }, [profile.gender]);

  const openAnatomy = (organ = null) => {
    const key = normalizeOrganKey(organ || selectedOrgan || result?.organ_affected);
    if (key) {
      setSelectedOrgan(key);
      setSystemFilter(ORGANS[key]?.system || "All");
    } else {
      setSystemFilter("All");
    }
    setScreen("anatomy");
  };

  const startNewAnalysis = () => {
    setSymptoms("");
    setSymptomErr("");
    setResult(null);
    setSelectedOrgan(null);
    setSystemFilter("All");
    setPainLocation("");
    setFollowupBaseSymptoms("");
    setFollowupQuestions([]);
    setFollowupAnswers({});
    setFollowupIndex(0);
    setWhyOpen(false);
    setDoctorSummary(null);
    setScreen("symptom");
  };
  const logout = () => {
    setUser(null);
    setProfile({ age:"", gender:"Female", conditions:"", allergies:"", medications:"", mobile:"", language, cycle:{lastPeriod:"",cycleLength:28,duration:5} });
    setSymptoms("");
    setResult(null);
    setSelectedOrgan(null);
    setHistory([]);
    setAuthMode("login");
    setForm({name:"",email:"",password:"",confirm:""});
    setScreen("welcome");
  };
  useEffect(() => {
    if (!user?.email) return;
    try { localStorage.setItem(userHistoryKey(user.email), JSON.stringify(history)); } catch {}
  }, [history, user?.email]);

  // ── Auth form state ─────────────────────────────────────────────────────────
  const [form, setForm] = useState({ name:"", email:"", password:"", confirm:"" });
  const [errs, setErrs] = useState({ name:"", email:"", password:"", confirm:"" });
  const [authErr, setAuthErr]   = useState("");
  const [shakeForm, setShake]   = useState(false);
  const [lockdown,  setLockdown]= useState(false);
  const [lockSecs,  setLockSecs]= useState(0);

  // ── Forgot password state ───────────────────────────────────────────────────
  const [forgotMode,   setForgotMode]   = useState(false);
  const [forgotEmail,  setForgotEmail]  = useState("");
  const [forgotNew,    setForgotNew]    = useState("");
  const [forgotConfirm,setForgotConfirm]= useState("");
  const [forgotStep,   setForgotStep]   = useState(1); // 1=email, 2=reset
  const [forgotMsg,    setForgotMsg]    = useState("");

  const MSGS = ["Parsing symptom patterns...","Cross-referencing medical database...","Mapping to body systems...","Identifying physiological mechanism...","Generating your personalised report..."];

  // ── Live field validation ───────────────────────────────────────────────────
  const validateField = (name, value) => {
    let e = "";
    if (name === "name")     e = V.name(value);
    if (name === "email")    e = V.email(value);
    if (name === "password") e = V.password(value);
    if (name === "confirm")  e = V.confirmPassword(value, form.password);
    setErrs(prev => ({ ...prev, [name]: e }));
  };

  const handleChange = (field) => (e) => {
    const val = e.target.value;
    setForm(prev => ({ ...prev, [field]: val }));
    validateField(field, val);
    setAuthErr("");
  };

  // ── Trigger shake ───────────────────────────────────────────────────────────
  const shake = (msg) => {
    setAuthErr(msg);
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  // ── SIGNUP ──────────────────────────────────────────────────────────────────
  const handleSignup = () => {
    // Validate all fields
    const nameErr     = V.name(form.name);
    const emailErr    = V.email(form.email);
    const passErr     = V.password(form.password);
    const confirmErr  = V.confirmPassword(form.confirm, form.password);
    setErrs({ name: nameErr, email: emailErr, password: passErr, confirm: confirmErr });

    if (nameErr || emailErr || passErr || confirmErr) {
      shake("Please fix the errors above before continuing.");
      return;
    }
    if (DB.userExists(form.email)) {
      shake("An account with this email already exists. Please sign in instead.");
      return;
    }

    // Save user to localStorage
    DB.saveUser(form.email, {
      name:     form.name.trim(),
      email:    form.email.toLowerCase(),
      password: hashPass(form.password),
      createdAt: new Date().toISOString(),
    });

    const newUser = { name: form.name.trim(), email: form.email.toLowerCase() };
    setHistory(readUserHistory(newUser.email));
    setUser(newUser);
    setProfile({ age:"", gender:"Female", conditions:"", allergies:"", medications:"", mobile:"", language, cycle:{lastPeriod:"",cycleLength:28,duration:5} });
    setScreen("profile");
  };

  // ── LOGIN ───────────────────────────────────────────────────────────────────
  const handleLogin = () => {
    const email = String(form.email || "").trim().toLowerCase();
    const password = String(form.password || "");
    setForm(prev => ({ ...prev, email }));
    const emailErr = V.email(email);
    setErrs(prev => ({ ...prev, email: emailErr }));
    setAuthErr("");
    if (emailErr) { shake("Please enter a valid email address."); return; }
    if (!password) { shake("Please enter your password."); return; }
    try {
      if (ATTEMPTS.isLocked(email)) {
        const secs = ATTEMPTS.secondsLeft(email);
        setLockdown(true); setLockSecs(secs);
        shake(`Too many failed attempts. Try again in ${secs} seconds.`);
        return;
      }
      const storedUser = DB.getUser(email);
      if (!storedUser) { shake("No account found with this email. Please sign up first."); return; }
      if (storedUser.password !== hashPass(password)) {
        const attempt = ATTEMPTS.increment(email);
        const remaining = 3 - attempt.count;
        if (remaining <= 0) {
          shake("Too many failed attempts. Account locked for 30 seconds.");
          setLockdown(true); setLockSecs(30);
          setTimeout(() => { setLockdown(false); setLockSecs(0); }, 30000);
        } else {
          shake(`Incorrect password. ${remaining} attempt${remaining>1?"s":""} remaining.`);
        }
        return;
      }
      ATTEMPTS.reset(email);
      const loggedInUser = { name: storedUser.name || email.split("@")[0], email: storedUser.email || email };
      const loadedProfile = readUserProfile(loggedInUser.email);
      setHistory(readUserHistory(loggedInUser.email));
      setProfile(loadedProfile);
      setLanguage(loadedProfile.language || "en-US");
      setCycle(loadedProfile.cycle || {lastPeriod:"",cycleLength:28,duration:5});
      setUser(loggedInUser);
      setScreen("dashboard");
    } catch (error) {
      console.error("[SymptomLens] login failed", error);
      shake("Sign in could not be completed. Please refresh and try again.");
    }
  };

  // ── FORGOT PASSWORD ─────────────────────────────────────────────────────────
  const handleForgotStep1 = () => {
    const emailErr = V.email(forgotEmail);
    if (emailErr) { setForgotMsg(emailErr); return; }
    if (!DB.userExists(forgotEmail)) { setForgotMsg("No account found with this email."); return; }
    setForgotMsg(""); setForgotStep(2);
  };

  const handleForgotStep2 = () => {
    const passErr    = V.password(forgotNew);
    const confirmErr = V.confirmPassword(forgotConfirm, forgotNew);
    if (passErr)    { setForgotMsg(passErr); return; }
    if (confirmErr) { setForgotMsg(confirmErr); return; }
    const stored = DB.getUser(forgotEmail);
    DB.saveUser(forgotEmail, { ...stored, password: hashPass(forgotNew) });
    setForgotMsg(""); setForgotMode(false); setForgotStep(1);
    setAuthMode("login");
    setAuthErr("✅ Password reset successful! Please sign in with your new password.");
  };

  // ── PROFILE ─────────────────────────────────────────────────────────────────
  const [profileErr, setProfileErr] = useState("");
  const [profileSaved, setProfileSaved] = useState(false);
  function saveProfileOnly() {
    setProfileSaved(false);
    if (!profile.age || isNaN(profile.age) || Number(profile.age) < 1 || Number(profile.age) > 120) { setProfileErr("Please enter a valid age between 1 and 120."); return false; }
    if (profile.mobile && !/^\d{10}$/.test(profile.mobile.replace(/[\s-]/g,""))) { setProfileErr("Enter a valid 10-digit mobile number or leave it blank."); return false; }
    if (profile.gender === "Female" && cycle.lastPeriod && new Date(cycle.lastPeriod) > new Date()) { setProfileErr("Last period date cannot be in the future."); return false; }
    const saved = {...profile, language, cycle: profile.gender === "Female" ? cycle : null};
    if (user?.email) { try { localStorage.setItem(userProfileKey(user.email), JSON.stringify(saved)); } catch {} }
    localStorage.setItem("sl_language",language);
    localStorage.setItem("sl_cycle",JSON.stringify(cycle));
    setProfile({...saved});
    setProfileErr("");
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2500);
    return true;
  }

  function handleProfile() {
    if (saveProfileOnly()) setScreen("symptom");
  }

  function savePainLocation(organ) {
    setPainLocation(ORGANS[organ]?.label || organ);
    setSelectedOrgan(organ);
    setSystemFilter(ORGANS[organ]?.system || "All");
  }

  function makeDoctorSummary() {
    if (!result) return;
    setDoctorSummary({
      name: user?.name || "",
      age: profile.age,
      gender: profile.gender,
      symptoms: result.user_symptoms || symptoms,
      organ: result.organ_affected,
      system: result.body_system,
      condition: result.primary_condition,
      severity: followupAnswers.severity || "Not recorded",
      date: new Date().toLocaleDateString(),
      warning: result.see_doctor_if
    });
    setScreen("doctor");
  }

  // ── ANALYZE / SMART INTERVIEW ───────────────────────────────────────────────
  const [symptomErr, setSymptomErr] = useState("");
  async function runAnalysis(finalSymptoms) {
  finalSymptoms = cleanSymptomText(finalSymptoms);

  setSymptomErr("");
  setScreen("analyzing");

  let i = 0;
  setLoadMsg(MSGS[0]);

  const iv = setInterval(() => {
    i = (i + 1) % MSGS.length;
    setLoadMsg(MSGS[i]);
  }, 1100);

  try {
    const data = await analyzeSymptoms(
      finalSymptoms,
      { ...profile, language },
      language
    );

    clearInterval(iv);

    data.user_symptoms = finalSymptoms;

    /*
     * IMPORTANT:
     * The Quick Area / manual anatomy selection is only an INPUT shortcut.
     * It must NOT override the AI condition -> organ mapping.
     *
     * The backend prediction is the primary authority.
     * inferOrganFromSymptoms() is used only as a deterministic safety
     * fallback when the backend returns an unusable/missing organ.
     */

    const predictedCondition = String(
      data.primary_condition || ""
    ).toLowerCase();

    const symptomText = String(finalSymptoms || "").toLowerCase();

    let predictedOrgan = normalizeOrganKey(data.organ_affected);

    /*
     * Deterministic condition/symptom safety mappings.
     * These protect the existing 3D anatomy mapping from unrelated
     * backend organ labels without changing the anatomy itself.
     */

    if (
      predictedCondition.includes("migraine") ||
      (
        /headache|head pain|throbbing head|severe headache/.test(symptomText) &&
        /nausea|vomit|light sensitivity|photophobia/.test(symptomText)
      )
    ) {
      predictedOrgan = "Brain";
    }

    else if (
      predictedCondition.includes("common cold") ||
      (
        /runny nose|sneezing|coryza|nasal congestion|blocked nose/.test(symptomText) &&
        /sore throat|throat pain/.test(symptomText)
      )
    ) {
      predictedOrgan = "Lungs";
    }

    else if (
      predictedCondition.includes("pneumonia") ||
      (
        /cough/.test(symptomText) &&
        /fever/.test(symptomText) &&
        /difficulty breathing|shortness of breath|breathlessness/.test(symptomText)
      )
    ) {
      predictedOrgan = "Lungs";
    }

    else if (
      predictedCondition.includes("chronic back pain") ||
      /lower back pain|low back pain|back pain|backache/.test(symptomText)
    ) {
      predictedOrgan = "Spine";
    }

    /*
     * If the backend did not provide a usable organ, use the existing
     * symptom-to-anatomy helper as fallback.
     */
    if (!predictedOrgan || !ORGANS[predictedOrgan]) {
      predictedOrgan = inferOrganFromSymptoms(finalSymptoms)?.organ || null;
    }

    /*
     * Gender safety remains exactly as before.
     */
    const genderSafeOrgan =
      profile.gender === "Female" &&
      ["Testes", "Prostate"].includes(predictedOrgan)
        ? "Pelvic"
        : (
            profile.gender === "Male" &&
            ["Uterus", "Ovaries"].includes(predictedOrgan)
          )
          ? "Pelvic"
          : predictedOrgan;

    data.organ_affected =
      normalizeOrganKey(genderSafeOrgan) || "Unspecified";

    /*
     * Always derive the system from the FINAL organ.
     * This prevents stale Quick Area state from producing a mismatched
     * organ/system combination.
     */
    data.body_system =
      ORGANS[data.organ_affected]?.system ||
      data.body_system ||
      "Unspecified";

    data.related_areas = deriveRelatedAreas(
      finalSymptoms,
      data.organ_affected
    );

    data.triage = triageForResult(
      data,
      finalSymptoms
    );

    data.suggested_specialist = specialistFor(data);

    Object.assign(
      data,
      localizeResult(data, language)
    );

    if (!data.evidence_note) {
      data.evidence_note =
        "SymptomLens uses the symptom text, profile context and follow-up answers to organize possible explanations. This is not a validated diagnostic model.";
    }

    /*
     * CRITICAL:
     * Synchronize the existing anatomy viewer with the FINAL AI result.
     *
     * selectedOrgan may contain a temporary Quick Area choice.
     * It must never be used here.
     */
    setSelectedOrgan(data.organ_affected);
    setSystemFilter(data.body_system);

    setResult(data);

    const entry = {
      id: Date.now(),
      symptoms: finalSymptoms,
      result: data,
      date: new Date().toLocaleDateString(),
      severity: followupAnswers.severity || ""
    };

    setHistory(h => [entry, ...h].slice(0, 30));

    setScreen("report");

  } catch (error) {
    clearInterval(iv);

    console.error(
      "[SymptomLens] Analysis failed:",
      error
    );

    setSymptomErr(
      error?.name === "AbortError"
        ? "Analysis timed out. Please make sure the backend is running and try again."
        : (
            error?.message ||
            "Unable to analyze symptoms right now. Please check the backend connection and try again."
          )
    );

    setScreen("symptom");
  }
}
  async function handleAnalyze() {
    const cleaned = symptoms.trim();

    if (cleaned.length < 10) {
      setSymptomErr("Please describe your symptoms in more detail (at least 10 characters).");
      return;
    }

    const hasLetters = /\p{L}/u.test(cleaned);
    if (!hasLetters) {
      setSymptomErr(
        "Please describe an actual symptom, such as pain, fever, cough, dizziness, nausea, or another change you are experiencing."
      );
      return;
    }

    setSymptomErr("");

    let qs = getFollowupQuestions(cleaned);
    try {
      const res = await fetch(`${API}/followups`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({symptoms: cleaned, profile})
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.questions) && data.questions.length) qs = data.questions;
      }
    } catch {}

    setFollowupBaseSymptoms(cleaned);
    setFollowupQuestions(qs);
    setFollowupAnswers({});
    setFollowupIndex(0);
    setPainLocation("");
    setScreen("followup");
  }

  // ══════════════════════════════════════════════════════════════
  //   SCREEN: WELCOME
  // ══════════════════════════════════════════════════════════════
  if (screen === "welcome") return (
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 24px",position:"relative",overflow:"hidden"}} className="grid-bg">
      <style>{STYLES}</style><div className="scanline"/>
      <div style={{position:"absolute",width:500,height:500,borderRadius:"50%",background:`radial-gradient(circle,${T.cyan}0A,transparent 70%)`,top:-150,left:-150,animation:"orbFloat 6s ease-in-out infinite"}}/>
      <div style={{position:"absolute",width:400,height:400,borderRadius:"50%",background:`radial-gradient(circle,${T.teal}08,transparent 70%)`,bottom:-100,right:-100,animation:"orbFloat 8s 2s ease-in-out infinite"}}/>
      <div style={{maxWidth:580,textAlign:"center",position:"relative",zIndex:1}}>
        <div className="fu" style={{display:"inline-flex",alignItems:"center",gap:8,background:`${T.cyan}12`,border:`1px solid ${T.cyan}33`,borderRadius:24,padding:"6px 20px",marginBottom:36}}>
          <span style={{width:7,height:7,borderRadius:"50%",background:T.teal,animation:"pulse 1.5s infinite"}}/>
          <span style={{fontSize:11,color:T.teal,fontFamily:"'JetBrains Mono',monospace",letterSpacing:2}}>AI HEALTH INTELLIGENCE · BETA</span>
        </div>
        <h1 className="fu1" style={{fontSize:66,fontWeight:800,lineHeight:1,letterSpacing:-2,marginBottom:20}}>
          <span style={{color:T.white}}>Symptom</span>
          <span style={{background:`linear-gradient(135deg,${T.cyan},${T.teal})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Lens</span>
        </h1>
        <p className="fu2" style={{fontSize:18,color:T.silver,lineHeight:1.7,marginBottom:8}}>Describe how you feel. SymptomLens helps organize symptoms and map them to a</p>
        <p className="fu3" style={{fontSize:18,color:T.silver,lineHeight:1.7,marginBottom:44}}><span style={{color:T.cyan,fontWeight:600}}>360° interactive 3D human body</span> — showing what's happening inside.</p>
        <div className="fu4" style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
          <button className="btn btn-primary" style={{fontSize:16,padding:"16px 44px"}} onClick={()=>{setAuthMode("signup");setScreen("auth");}}>Get Started Free →</button>
          <button className="btn btn-outline" onClick={()=>{setAuthMode("login");setScreen("auth");}}>Sign In</button>
        </div>
        <div className="fu5" style={{display:"flex",marginTop:52,borderTop:`1px solid ${T.border}`,paddingTop:32}}>
          {[["🧠","AI Symptom Analysis","Explainable & safety-first"],["🫀","3D Anatomy","Pain-region mapping"],["🏥","Care Navigator","Specialist + nearby care"],["🕑","Health Dashboard","Habits + history"]].map(([ic,lb,sub],i)=>(
            <div key={lb} style={{flex:1,textAlign:"center",padding:"0 12px",borderRight:i<3?`1px solid ${T.border}`:"none"}}>
              <div style={{fontSize:24,marginBottom:5}}>{ic}</div>
              <div style={{fontSize:13,fontWeight:700,marginBottom:2}}>{lb}</div>
              <div style={{fontSize:10,color:T.muted,fontFamily:"'JetBrains Mono',monospace"}}>{sub}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════
  //   SCREEN: AUTH (SECURE)
  // ══════════════════════════════════════════════════════════════
  if (screen === "auth") return (
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:24}} className="grid-bg">
      <style>{STYLES}</style><div className="scanline"/>

      {/* ── FORGOT PASSWORD OVERLAY ── */}
      {forgotMode && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,padding:24}}>
          <div className="card si" style={{width:"100%",maxWidth:420,padding:32}}>
            <h3 style={{fontSize:20,fontWeight:800,marginBottom:6}}>Reset Password</h3>
            <p style={{color:T.muted,fontSize:13,marginBottom:24}}>
              {forgotStep===1 ? "Enter your registered email to continue." : "Enter your new password below."}
            </p>

            {forgotStep === 1 && (
              <div style={{display:"flex",flexDirection:"column",gap:14}}>
                <ValidInput label="Registered Email" type="email" value={forgotEmail} placeholder="you@email.com" icon="📧"
                  onChange={e=>{setForgotEmail(e.target.value);setForgotMsg("");}}
                  error={forgotMsg&&forgotMsg.includes("email")?forgotMsg:""}/>
                {forgotMsg && <p style={{color:T.red,fontSize:12,fontFamily:"'JetBrains Mono',monospace"}}>⚠ {forgotMsg}</p>}
                <div style={{display:"flex",gap:10}}>
                  <button className="btn btn-outline" style={{flex:1}} onClick={()=>{setForgotMode(false);setForgotStep(1);setForgotMsg("");}}>Cancel</button>
                  <button className="btn btn-primary" style={{flex:1}} onClick={handleForgotStep1}>{tx("continue",language)}</button>
                </div>
              </div>
            )}

            {forgotStep === 2 && (
              <div style={{display:"flex",flexDirection:"column",gap:14}}>
                <PasswordInput label="New Password" value={forgotNew} placeholder="New password" showStrength
                  onChange={e=>{setForgotNew(e.target.value);setForgotMsg("");}} error=""/>
                <PasswordInput label="Confirm New Password" value={forgotConfirm} placeholder="Confirm new password"
                  onChange={e=>{setForgotConfirm(e.target.value);setForgotMsg("");}} error=""/>
                {forgotMsg && <p style={{color:T.red,fontSize:12,fontFamily:"'JetBrains Mono',monospace"}}>⚠ {forgotMsg}</p>}
                <div style={{display:"flex",gap:10}}>
                  <button className="btn btn-outline" style={{flex:1}} onClick={()=>setForgotStep(1)}>← Back</button>
                  <button className="btn btn-primary" style={{flex:1}} onClick={handleForgotStep2}>Reset Password</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{width:"100%",maxWidth:460}}>
        <button className="btn btn-outline btn-sm" onClick={()=>setScreen("welcome")} style={{marginBottom:26}}>← Back</button>
        <StepBar current="auth"/>

        <div className={`card si ${shakeForm?"shake":""}`} style={{padding:36}}>
          {/* Header */}
          <div style={{textAlign:"center",marginBottom:28}}>
            <div style={{fontSize:36,marginBottom:10}}>🔐</div>
            <h2 style={{fontSize:24,fontWeight:800,marginBottom:6}}>
              {authMode==="signup" ? "Create your SymptomLens account" : "Sign in to your SymptomLens account"}
            </h2>
            <p style={{color:T.muted,fontSize:13}}>
              {authMode==="signup"
                ? "New here? Create an account to save your profile and history."
                : "Already registered? Sign in to continue to your saved profile and history."}
            </p>
          </div>

          <div style={{background:T.bgPanel,border:`1px solid ${T.border}`,borderRadius:10,padding:"10px 12px",marginBottom:20,textAlign:"center"}}>
            <span style={{fontSize:11,color:T.muted,fontFamily:"'JetBrains Mono',monospace"}}>
              {authMode==="signup" ? "CREATE ACCOUNT" : "SIGN IN"} · Use the Home button to choose the other option.
            </span>
          </div>

          {/* Fields */}
          <div style={{display:"flex",flexDirection:"column",gap:16}}>

            {authMode === "signup" && (
              <ValidInput label="Full Name" value={form.name} placeholder="e.g. Bhavana Sharma" icon="👤"
                onChange={handleChange("name")} error={errs.name}/>
            )}

            <ValidInput label="Email Address" type="email" value={form.email} placeholder="you@gmail.com" icon="📧"
              onChange={handleChange("email")} error={errs.email}/>

            <PasswordInput
              label={authMode==="signup" ? "Create Password" : "Password"}
              value={form.password}
              placeholder={authMode==="signup" ? "Min 8 chars, uppercase, number, symbol" : "Enter your password"}
              showStrength={authMode==="signup"}
              onChange={handleChange("password")}
              error={errs.password}
            />

            {authMode === "signup" && (
              <PasswordInput label="Confirm Password" value={form.confirm} placeholder="Re-enter your password"
                onChange={handleChange("confirm")} error={errs.confirm}/>
            )}

            {/* Password requirements hint for signup */}
            {authMode === "signup" && (
              <div style={{background:`${T.bgPanel}`,border:`1px solid ${T.border}`,borderRadius:10,padding:12}}>
                <p style={{fontSize:11,color:T.muted,fontFamily:"'JetBrains Mono',monospace",marginBottom:6,letterSpacing:1}}>PASSWORD MUST CONTAIN:</p>
                {[
                  ["length", "At least 8 characters",    form.password.length >= 8],
                  ["upper",  "One uppercase letter (A-Z)",/[A-Z]/.test(form.password)],
                  ["lower",  "One lowercase letter (a-z)",/[a-z]/.test(form.password)],
                  ["number", "One number (0-9)",          /[0-9]/.test(form.password)],
                  ["symbol", "One special character (!@#$...)",/[!@#$%^&*]/.test(form.password)],
                ].map(([k,label,met]) => (
                  <div key={k} style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                    <span style={{fontSize:12,color:met?T.teal:T.muted}}>{met?"✓":"○"}</span>
                    <span style={{fontSize:12,color:met?T.teal:T.muted}}>{label}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Lockdown bar */}
            {lockdown && (
              <div style={{background:`${T.red}15`,border:`1px solid ${T.red}44`,borderRadius:10,padding:12}}>
                <p style={{color:T.red,fontSize:13,textAlign:"center",marginBottom:8}}>🔒 Account locked — {lockSecs}s remaining</p>
                <div style={{height:4,background:`${T.red}33`,borderRadius:4,overflow:"hidden"}}>
                  <div style={{height:"100%",background:T.red,borderRadius:4,animation:`countdown ${lockSecs}s linear forwards`}}/>
                </div>
              </div>
            )}

            {/* Auth message */}
            {authErr && (
              <div style={{background: authErr.startsWith("✅") ? `${T.teal}15` : `${T.red}15`,
                border:`1px solid ${authErr.startsWith("✅") ? T.teal : T.red}44`,
                borderRadius:10,padding:"10px 14px"}}>
                <p style={{color: authErr.startsWith("✅") ? T.teal : T.red, fontSize:13, textAlign:"center"}}>
                  {authErr}
                </p>
              </div>
            )}

            {/* Submit */}
            <button className="btn btn-primary"
              style={{width:"100%",fontSize:16,marginTop:4,opacity:lockdown?0.4:1}}
              disabled={lockdown}
              onClick={authMode==="signup" ? handleSignup : handleLogin}>
              {authMode==="signup" ? "Create Account →" : "Sign In →"}
            </button>
          </div>

          <div style={{marginTop:18,display:"flex",justifyContent:"flex-end",alignItems:"center"}}>
            {authMode === "login" && (
              <span style={{color:T.muted,fontSize:13,cursor:"pointer",textDecoration:"underline"}}
                onClick={()=>{setForgotMode(true);setForgotEmail(form.email);setForgotMsg("");setForgotStep(1);}}>
                Forgot password?
              </span>
            )}
          </div>
        </div>

        {/* Registered users count hint */}
        <p style={{textAlign:"center",marginTop:14,color:T.muted,fontSize:11,fontFamily:"'JetBrains Mono',monospace"}}>
          🔒 Demo accounts are stored locally in this browser · {Object.keys(DB.getUsers()).length} registered users
        </p>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════
  //   SCREEN: PROFILE
  // ══════════════════════════════════════════════════════════════
  if (screen === "profile") return (
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:24}} className="grid-bg">
      <style>{STYLES}</style><div className="scanline"/>
      <div style={{width:"100%",maxWidth:480}}>
        <StepBar current="profile"/>
        <div className="card si" style={{padding:36}}>
          <div style={{textAlign:"center",marginBottom:28}}>
            <div style={{fontSize:36,marginBottom:10}}>🩺</div>
            <h2 style={{fontSize:22,fontWeight:800,marginBottom:6}}>{screen === "profile" && user ? "Health Profile" : "Health Profile"}</h2>
            <p style={{color:T.muted,fontSize:13}}>Welcome, <span style={{color:T.cyan,fontWeight:600}}>{user?.name}</span>. This personalises your analysis.</p>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:18}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <div>
                <label className="inp-label">Age</label>
                <input className="inp" type="number" placeholder="e.g. 22" min="1" max="120" value={profile.age}
                  onChange={e=>setProfile({...profile,age:e.target.value})}/>
              </div>
              <div>
                <label className="inp-label">Biological Sex</label>
                <select className="inp" value={profile.gender} onChange={e=>setProfile({...profile,gender:e.target.value})} style={{cursor:"pointer"}}>
                  <option>Female</option><option>Male</option><option>Other</option>
                </select>
              </div>
            </div>
            <div>
              <label className="inp-label">Pre-existing Conditions <span style={{color:T.muted,textTransform:"lowercase",letterSpacing:0}}>(optional)</span></label>
              <input className="inp" placeholder="e.g. Diabetes, Hypertension..." value={profile.conditions||""} onChange={e=>setProfile({...profile,conditions:e.target.value})}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <div><label className="inp-label">Allergies <span style={{color:T.muted,textTransform:"lowercase",letterSpacing:0}}>(optional)</span></label><input className="inp" placeholder="e.g. Penicillin, peanuts..." value={profile.allergies||""} onChange={e=>setProfile({...profile,allergies:e.target.value})}/></div>
              <div><label className="inp-label">Current Medications <span style={{color:T.muted,textTransform:"lowercase",letterSpacing:0}}>(optional)</span></label><input className="inp" placeholder="e.g. None" value={profile.medications||""} onChange={e=>setProfile({...profile,medications:e.target.value})}/></div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <div><label className="inp-label">Preferred Language</label><select className="inp" value={language} onChange={e=>{setLanguage(e.target.value);localStorage.setItem("sl_language",e.target.value)}}>{LANGUAGES.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div>
              <div><label className="inp-label">Mobile Number <span style={{color:T.muted,textTransform:"lowercase",letterSpacing:0}}>(optional)</span></label><input className="inp" placeholder="For future OTP login" value={profile.mobile||""} onChange={e=>setProfile({...profile,mobile:e.target.value})}/></div>
            </div>
            {profile.gender === "Female" && <div style={{background:`${T.pink||"#ff6fa8"}0A`,border:`1px solid ${T.border}`,borderRadius:12,padding:14}}><div style={{fontWeight:700,marginBottom:10}}>🩸 Menstrual Health <span style={{fontSize:10,color:T.muted}}>(optional)</span></div><div style={{display:"grid",gridTemplateColumns:"1.4fr 1fr 1fr",gap:10}}><div><label className="inp-label">Last period</label><input className="inp" type="date" value={cycle.lastPeriod} onChange={e=>setCycle({...cycle,lastPeriod:e.target.value})}/></div><div><label className="inp-label">Cycle days</label><input className="inp" type="number" min="15" max="60" value={cycle.cycleLength} onChange={e=>setCycle({...cycle,cycleLength:e.target.value})}/></div><div><label className="inp-label">Duration</label><input className="inp" type="number" min="1" max="14" value={cycle.duration} onChange={e=>setCycle({...cycle,duration:e.target.value})}/></div></div><p style={{fontSize:10,color:T.muted,marginTop:8}}>Cycle dates are estimates for personal tracking, not medical diagnosis.</p></div>}
            <div style={{background:T.bgPanel,borderRadius:10,padding:12,border:`1px solid ${T.border}`}}>
              <p style={{fontSize:11,color:T.muted,lineHeight:1.7}}>🔒 Your data stays private. Used only to personalise your symptom analysis.</p>
            </div>
            <div style={{background:T.bgPanel,borderRadius:10,padding:12,border:`1px solid ${T.border}`}}><div className="inp-label" style={{marginBottom:4}}>Registered Email</div><div style={{fontSize:13,color:T.white}}>{user?.email||"—"}</div><div style={{fontSize:10,color:T.muted,marginTop:4}}>This is your account email and is not changed from the profile form.</div></div>
            {profileErr && <p style={{color:T.red,fontSize:12,fontFamily:"'JetBrains Mono',monospace"}}>⚠ {profileErr}</p>}
            {profileSaved && <p style={{color:T.teal,fontSize:12,fontFamily:"'JetBrains Mono',monospace"}}>✓ Profile saved successfully.</p>}
            <div style={{display:"flex",gap:10}}><button className="btn btn-outline" style={{flex:1}} onClick={()=>saveProfileOnly()}>{tx("saveProfile",language)}</button><button className="btn btn-primary" style={{flex:1}} onClick={handleProfile}>{tx("continue",language)}</button></div>
          </div>
        </div>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════
  //   SCREEN: PERSONALIZED HOME DASHBOARD
  // ══════════════════════════════════════════════════════════════
  if (screen === "dashboard") {
    const tasks=["Drink water regularly","Move / walk for 30 minutes","Eat a balanced meal","Take a screen break","Sleep at a consistent time"];
    const today=new Date().toISOString().slice(0,10); const checks=dashboardChecks[today]||{};
    const setCheck=(i)=>{const next={...dashboardChecks,[today]:{...checks,[i]:!checks[i]}};setDashboardChecks(next); if(user?.email) localStorage.setItem(`sl_daily_checks_${user.email.toLowerCase()}`,JSON.stringify(next));};
    const completed=tasks.filter((_,i)=>checks[i]).length;
    const daysSince=cycle.lastPeriod?Math.max(0,Math.floor((Date.now()-new Date(cycle.lastPeriod).getTime())/86400000)):null;
    const nextPeriod=daysSince!=null?Math.max(0,Number(cycle.cycleLength||28)-daysSince):null;
    return <div style={{minHeight:"100vh",background:T.bg,padding:"28px 20px"}} className="grid-bg"><style>{STYLES}</style><div className="scanline"/><div style={{maxWidth:1000,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,marginBottom:24,flexWrap:"wrap"}}><div><div style={{fontSize:10,color:T.cyan,fontFamily:"'JetBrains Mono',monospace",letterSpacing:2}}>{tx("healthDashboard",language)}</div><h1 style={{fontSize:30,fontWeight:800}}>{tx("goodDay",language)}, {user?.name||"there"} 👋</h1><p style={{color:T.muted,marginTop:6}}>{tx("track",language)}</p></div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}><button className="btn btn-primary btn-sm" onClick={()=>setScreen("symptom")}>{tx("newAnalysis",language)}</button><button className="btn btn-outline btn-sm" onClick={()=>setScreen("profile")}>✏️ {tx("editProfile",language)}</button><button className="btn btn-outline btn-sm" onClick={logout}>{tx("logout",language)}</button></div></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))",gap:14}}>
        <div className="card"><div style={{fontSize:11,color:T.cyan,fontFamily:"'JetBrains Mono',monospace",letterSpacing:1}}>{tx("checklist",language)}</div><div style={{fontSize:24,fontWeight:800,margin:"8px 0 14px"}}>{completed}/{tasks.length} complete</div>{tasks.map((t,i)=><label key={t} style={{display:"flex",gap:10,alignItems:"center",padding:"9px 0",borderTop:`1px solid ${T.border}`,cursor:"pointer"}}><input type="checkbox" checked={!!checks[i]} onChange={()=>setCheck(i)}/><span style={{fontSize:13,color:checks[i]?T.teal:T.silver,textDecoration:checks[i]?"line-through":"none"}}>{t}</span></label>)}</div>
        <div className="card"><div style={{fontSize:11,color:T.teal,fontFamily:"'JetBrains Mono',monospace",letterSpacing:1}}>{tx("quickTools",language)}</div><div style={{display:"grid",gap:9,marginTop:14}}><button className="btn btn-outline" onClick={()=>setScreen("medicine")}>💊 {tx2("medicineExplorer",language)}</button><button className="btn btn-outline" onClick={()=>setScreen("care")}>{tx("hospitals",language)}</button><button className="btn btn-outline" onClick={()=>setScreen("history")}>{tx("trends",language)}</button><button className="btn btn-outline" onClick={()=>openAnatomy()}>{tx("anatomy",language)}</button></div></div>
        <div className="card"><div style={{fontSize:11,color:T.orange,fontFamily:"'JetBrains Mono',monospace",letterSpacing:1}}>PERSONALIZATION</div><p style={{marginTop:12,lineHeight:1.7,color:T.silver,fontSize:13}}><b>{profile.age||"—"}</b> years · <b>{profile.gender}</b><br/>Language: <b>{LANGUAGES.find(x=>x[0]===language)?.[1]||"English"}</b></p>{profile.gender==="Female"&&<div style={{marginTop:12,padding:10,background:T.bgPanel,borderRadius:10}}><b>Menstrual health</b><p style={{fontSize:11,color:T.muted,marginTop:4}}>{cycle.lastPeriod?`Estimated next period window: ~${nextPeriod} day(s)`:"Optional cycle details not added."}</p><button className="btn btn-outline btn-sm" style={{marginTop:8}} onClick={()=>setScreen("profile")}>Update cycle</button></div>}</div>
      </div>
      <div className="card" style={{marginTop:14}}><div style={{fontSize:11,color:T.muted,fontFamily:"'JetBrains Mono',monospace",letterSpacing:1}}>HEALTH NOTE</div><textarea className="inp" rows={2} value={dashboardNote} onChange={e=>{setDashboardNote(e.target.value);localStorage.setItem(`sl_note_${user?.email||"guest"}`,e.target.value)}} placeholder="Write a private note for yourself..." style={{marginTop:8}}/><p style={{fontSize:10,color:T.muted,marginTop:7}}>This is a personal note and is not used as a diagnosis.</p></div>
    </div></div>;
  }

  // ══════════════════════════════════════════════════════════════
  //   SCREEN: SYMPTOM INPUT
  // ══════════════════════════════════════════════════════════════
  if (screen === "symptom") return (
    <div style={{minHeight:"100vh",background:T.bg,padding:"30px 20px"}} className="grid-bg">
      <style>{STYLES}</style><div className="scanline"/>
      <div style={{maxWidth:680,margin:"0 auto"}}>
        <StepBar current="symptom"/>
        <div className="fu" style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:22}}>
          <div>
            <div style={{fontSize:11,color:T.muted,fontFamily:"'JetBrains Mono',monospace",letterSpacing:2,marginBottom:5}}>STEP 3 OF 6</div>
            <h1 style={{fontSize:28,fontWeight:800}}>{tx("howFeeling",language)}</h1>
          </div>
          <div style={{textAlign:"right"}}><button className="btn btn-outline btn-sm" onClick={()=>setScreen("dashboard")} style={{marginBottom:7}}>← Home</button>
            <div style={{fontSize:13,fontWeight:600}}>{user?.name}</div>
            <div style={{fontSize:12,color:T.cyan,fontFamily:"'JetBrains Mono',monospace"}}>Age {profile.age} · {profile.gender} · {profile.gender === "Female" ? "Female anatomy" : profile.gender === "Male" ? "Male anatomy" : "General anatomy"}</div>
          </div>
        </div>
        <div className="fu1" style={{marginBottom:12}}>
          <p style={{fontSize:11,color:T.muted,fontFamily:"'JetBrains Mono',monospace",letterSpacing:1,marginBottom:8}}>TRY AN EXAMPLE:</p>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {["Throbbing headache behind left eye, nausea, light sensitivity for 2 days","Sharp pain upper right abdomen after eating, bloating, and yellow skin","Persistent lower back pain radiating down my left leg for a week","Shortness of breath, dry cough, and chest tightness since yesterday"].map(ex=>(
              <button key={ex} className="chip" onClick={()=>{setSymptoms(ex);setSelectedOrgan(null);setPainLocation("");setSystemFilter("All");setSymptomErr("");}} style={{fontSize:12}}>{ex.slice(0,44)}…</button>
            ))}
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:8}}><button className="chip" onClick={()=>{setSymptoms("Painful menstrual cramps in my lower abdomen");setSelectedOrgan("Uterus");setSystemFilter("Reproductive");setPainLocation("Uterus");setSymptomErr("");}}>🩸 Period cramps</button><select className="chip" value={language} onChange={e=>{setLanguage(e.target.value);localStorage.setItem("sl_language",e.target.value)}} style={{background:T.bgPanel}}>{LANGUAGES.map(([v,l])=><option key={v} value={v}>🌐 {l}</option>)}</select></div>
        </div>
        <div className="fu2 card" style={{padding:0,overflow:"hidden",marginBottom:12}}>
          <textarea className="inp" value={symptoms} onChange={e=>{
  const value=e.target.value;
  setSymptoms(value);
  const inferred=inferOrganFromSymptoms(value)?.organ || null;
  setSelectedOrgan(inferred);
  setPainLocation(inferred ? (ORGANS[inferred]?.label || inferred) : "");
  setSystemFilter(inferred ? (ORGANS[inferred]?.system || "All") : "All");
  setSymptomErr("");
}} rows={7}
            placeholder={"Describe your symptoms in detail...\n\nInclude: location of pain, duration, severity, what makes it better or worse, recent diet, sleep, stress, medications..."}
            style={{borderRadius:18,border:"none",resize:"vertical",lineHeight:1.75,padding:20,fontSize:15,minHeight:160}}/>
          <div style={{padding:"9px 16px",borderTop:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",background:T.bgPanel}}>
            <span style={{fontSize:11,color:T.muted,fontFamily:"'JetBrains Mono',monospace"}}>{symptoms.length} chars {symptoms.length>30?"✓":"— aim for 50+"}</span>
            <div style={{display:"flex",gap:10,alignItems:"center"}}>
  <button className="btn btn-outline btn-sm" onClick={()=>{
  const next = voiceLanguage==="en-US" ? "kn-IN" : voiceLanguage==="kn-IN" ? "hi-IN" : "en-US";
  setVoiceLanguage(next); localStorage.setItem("sl_voice_language",next);
}}>{voiceLanguage==="en-US" ? "ಕನ್ನಡ" : voiceLanguage==="kn-IN" ? "हिन्दी" : "English"}</button>

  <button
    className="btn btn-outline btn-sm"
    onClick={startListening}
    style={{
      border:"1px solid #00E5FF",
      color:"#00E5FF"
    }}
  >
    {isListening ? "🎙 Listening..." : `🎤 Speak (${voiceLanguage === "kn-IN" ? "ಕನ್ನಡ" : voiceLanguage === "hi-IN" ? "हिन्दी" : "English"})`}
  </button>

  <button
    className="btn btn-outline btn-sm"
    onClick={()=>{setSymptoms("");setSelectedOrgan(null);setPainLocation("");setSystemFilter("All");setSymptomErr("");}}
  >
    Clear
  </button>
</div>
          </div>
          {micError && <div style={{padding:"8px 16px 12px",color:T.orange,fontSize:11,fontFamily:"'JetBrains Mono',monospace",lineHeight:1.5}}>{micError}</div>}
        </div>
        <div className="fu3" style={{marginBottom:16}}>
          <p style={{fontSize:11,color:T.muted,fontFamily:"'JetBrains Mono',monospace",letterSpacing:1,marginBottom:8}}>{tx("quickArea",language)}</p>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {[['🧠','Head/Brain','Brain','I have a headache.'],['❤️','Chest/Heart','Heart','I have chest pain.'],['🫁','Lungs','Lungs','I have shortness of breath and cough.'],['🫃','Stomach','Stomach','I have stomach pain.'],['🫘','Kidneys','Kidneys','I have kidney pain.'],['🦴','Back/Spine','Spine','I have back pain.'],['🩸','Period / Pelvis','Uterus','I have painful menstrual cramps.'],['🦵','Joint / Knee','Joints','I have joint pain.'],['🚻','Urinary / Bladder','Bladder','I have burning when I urinate.'],['🌡️','Fever',null,'I have fever.']].filter(([,l])=>l!=="Skin / Face" && (profile.gender==="Female" || l!=="Period / Pelvis")).map(([e,l,organ,phrase])=>(
              <button key={l} className="chip" style={{fontSize:12,borderColor:selectedOrgan===organ?T.cyan:T.border,color:selectedOrgan===organ?T.cyan:T.silver}}
                onClick={()=>{
                  if (organ) {
                    setSelectedOrgan(organ);
                    setSystemFilter(ORGANS[organ]?.system || "All");
                    setPainLocation(ORGANS[organ]?.label || organ);
                  }
                  setSymptoms(phrase);
                  setSymptomErr("");
                }}>{e} {l}</button>
            ))}
          </div>
        </div>
        <div className="fu4" style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:14}}>
          <p style={{fontSize:12,color:T.muted,lineHeight:1.6,maxWidth:340}}>⚠️ For <strong>educational purposes only</strong>. Not a substitute for professional medical advice.</p>
          <button className="btn btn-outline btn-sm" onClick={()=>openAnatomy()}>{tx("selectBody",language)}</button>
          <button
  type="button"
  className="btn btn-primary"
  style={{fontSize:15,padding:"14px 36px",flexShrink:0}}
  onClick={() => {
    const cleaned = symptoms.trim();
    if (cleaned.length < 10) {
      setSymptomErr("Please describe your symptoms in more detail (at least 10 characters).");
      return;
    }
    if (!/\p{L}/u.test(cleaned)) {
      setSymptomErr("Please describe an actual symptom, such as pain, fever, cough, dizziness, nausea, or another change you are experiencing.");
      return;
    }
    setSymptomErr("");
    runAnalysis(cleaned);
  }}
>
  {tx("analyze",language)}
</button>
        </div>
        {symptomErr && <p style={{color:T.red,fontSize:12,marginTop:10,fontFamily:"'JetBrains Mono',monospace"}}>⚠ {symptomErr}</p>}
        {history.length>0&&(
          <div className="fu5" style={{marginTop:28}}>
            <p style={{fontSize:11,color:T.muted,fontFamily:"'JetBrains Mono',monospace",letterSpacing:1,marginBottom:9}}>RECENT SESSIONS:</p>
            {history.slice(0,3).map(h=>(
              <div key={h.id} onClick={()=>{setResult(h.result);setScreen("report");}} style={{padding:"10px 14px",background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:10,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7,transition:"all .2s"}}
                onMouseEnter={e=>e.currentTarget.style.borderColor=T.cyanDim}
                onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
                <div>
                  <div style={{fontSize:13,fontWeight:600,marginBottom:2}}>{h.result.primary_condition}</div>
                  <div style={{fontSize:11,color:T.muted}}>{h.symptoms.slice(0,50)}…</div>
                </div>
                <div style={{fontSize:11,color:T.muted,fontFamily:"'JetBrains Mono',monospace",flexShrink:0,marginLeft:12}}>{h.date}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════
  //   SCREEN: SMART FOLLOW-UP INTERVIEW
  // ══════════════════════════════════════════════════════════════
  if (screen === "followup") return (
    <div style={{minHeight:"100vh",background:T.bg,padding:"30px 20px"}} className="grid-bg">
      <style>{STYLES}</style><div className="scanline"/>
      <div style={{maxWidth:720,margin:"0 auto"}}>
        <div style={{fontSize:10,color:T.cyan,fontFamily:"'JetBrains Mono',monospace",letterSpacing:2,marginBottom:8}}>SMART SYMPTOM INTERVIEW</div>
        <h1 style={{fontSize:30,fontWeight:800,marginBottom:8}}>Let's understand your symptom better.</h1>
        <p style={{color:T.muted,lineHeight:1.7,marginBottom:20}}>These follow-up questions help the system use your location, duration and severity rather than relying on a single sentence.</p>
        <div className="card" style={{marginBottom:14}}>
          <div style={{fontSize:11,color:T.cyan,fontFamily:"'JetBrains Mono',monospace",letterSpacing:1,marginBottom:10}}>YOUR SYMPTOM</div>
          <div style={{fontSize:15,lineHeight:1.7}}>{followupBaseSymptoms}</div>
        </div>
        <div className="card" style={{marginBottom:14}}>
          <div style={{fontSize:11,color:T.muted,fontFamily:"'JetBrains Mono',monospace",letterSpacing:1,marginBottom:12}}>QUESTION {followupIndex+1} OF {followupQuestions.length}</div>
          {followupQuestions[followupIndex]?.type === "scale" ? (
            <>
              <h2 style={{fontSize:20,marginBottom:18}}>{followupQuestions[followupIndex].label}</h2>
              <div style={{display:"grid",gridTemplateColumns:"repeat(11,1fr)",gap:6}}>{Array.from({length:11},(_,i)=><button key={i} className="chip" onClick={()=>setFollowupAnswers(a=>({...a,severity:String(i)}))} style={{padding:"12px 0",borderColor:followupAnswers.severity===String(i)?T.cyan:T.border,color:followupAnswers.severity===String(i)?T.cyan:T.silver}}>{i}</button>)}</div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:T.muted,marginTop:7}}><span>No pain</span><span>Worst pain</span></div>
            </>
          ) : (
            <>
              <h2 style={{fontSize:20,marginBottom:16}}>{followupQuestions[followupIndex]?.label}</h2>
              <input className="inp" value={followupAnswers[followupQuestions[followupIndex]?.id]||""} placeholder={followupQuestions[followupIndex]?.placeholder||"Type your answer"} onChange={e=>setFollowupAnswers(a=>({...a,[followupQuestions[followupIndex].id]:e.target.value}))}/>
            </>
          )}
        </div>
        {painLocation && <div className="card" style={{marginBottom:14,border:`1px solid ${T.teal}44`}}>📍 Selected body location: <strong style={{color:T.teal}}>{painLocation}</strong></div>}
        <div style={{display:"flex",gap:10,justifyContent:"space-between"}}>
          <button className="btn btn-outline" onClick={()=>setScreen("symptom")}>← Back</button>
          <div style={{display:"flex",gap:10}}>
            <button className="btn btn-outline" onClick={async()=>{const answerText=followupQuestions.filter(q=>followupAnswers[q.id]).map(q=>`${q.label}: ${followupAnswers[q.id]}`).join(". "); await runAnalysis(`${followupBaseSymptoms}. ${answerText}.`);}}>Skip remaining →</button>
            {followupIndex < followupQuestions.length-1 ? <button className="btn btn-primary" onClick={()=>{setSymptomErr("");setFollowupIndex(i=>i+1)}}>Next →</button> : <button className="btn btn-primary" onClick={submitFollowups}>Analyze My Symptoms →</button>}
          </div>
        </div>
        {symptomErr&&<p style={{color:T.red,fontSize:12,marginTop:10}}>{symptomErr}</p>}
        <div className="card" style={{marginTop:16}}>
          <div style={{fontSize:11,color:T.muted,fontFamily:"'JetBrains Mono',monospace",letterSpacing:1,marginBottom:8}}>3D LOCATION</div>
          <p style={{fontSize:12,color:T.silver,lineHeight:1.6,marginBottom:10}}>You can also open the anatomy viewer after analysis and click a real organ to learn about it.</p>
          <button className="btn btn-outline btn-sm" onClick={()=>openAnatomy()}>Open 3D Anatomy</button>
        </div>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════
  //   SCREEN: ANALYZING
  // ══════════════════════════════════════════════════════════════
  if (screen === "analyzing") return (
    <div style={{height:"100vh",background:T.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:32}} className="grid-bg">
      <style>{STYLES}</style><div className="scanline"/>
      <div style={{position:"relative",width:130,height:130}}>
        <div style={{position:"absolute",inset:0,border:`1px solid ${T.border}`,borderRadius:"50%"}}/>
        <div style={{position:"absolute",inset:8,border:`2px solid ${T.cyan}33`,borderRadius:"50%",animation:"spin 4s linear infinite"}}/>
        <div style={{position:"absolute",inset:18,border:`2px solid ${T.cyan}88`,borderRadius:"50%",animation:"spin 2s linear infinite reverse"}}/>
        <div style={{position:"absolute",inset:28,border:`3px solid ${T.cyan}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin 1s linear infinite"}}/>
        <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:40}}>🧬</div>
      </div>
      <div style={{textAlign:"center",maxWidth:300}}>
        <h2 style={{fontSize:20,fontWeight:700,marginBottom:9}}>Analysing your symptoms</h2>
        <p style={{color:T.cyan,fontFamily:"'JetBrains Mono',monospace",fontSize:13,animation:"pulse 1.5s infinite",minHeight:20}}>{loadMsg}</p>
      </div>
      <div style={{display:"flex",gap:7}}>
        {[0,1,2,3,4].map(i=><div key={i} style={{width:8,height:8,borderRadius:"50%",background:T.cyan,animation:`dotPulse 1.5s ${i*0.25}s ease-in-out infinite`}}/>)}
      </div>
      <p style={{color:T.muted,fontSize:11,fontFamily:"'JetBrains Mono',monospace"}}>Powered by Claude AI · SymptomLens</p>
    </div>
  );

  // ══════════════════════════════════════════════════════════════
  //   SCREEN: REPORT
  // ══════════════════════════════════════════════════════════════
  if (screen === "report" && result) {
    const oc = ORGANS[result.organ_affected]?.hex || T.cyan;
    return (
      <div style={{minHeight:"100vh",background:T.bg,padding:"26px 18px"}} className="grid-bg">
        <style>{STYLES}</style><div className="scanline"/>
        <div style={{maxWidth:800,margin:"0 auto"}}>
          <StepBar current="report"/>
          <div className="fu" style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
            <div>
              <div style={{fontSize:11,color:T.muted,fontFamily:"'JetBrains Mono',monospace",letterSpacing:2,marginBottom:4}}>{tx("analysisComplete",language)}</div>
              <h1 style={{fontSize:24,fontWeight:800}}>{tx("healthReport",language)}</h1>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button className="btn btn-outline btn-sm" onClick={()=>openAnatomy()}>🫀 3D View</button>
              <button className="btn btn-outline btn-sm" onClick={startNewAnalysis}>{tx("newBtn",language)}</button>
              <button className="btn btn-outline btn-sm" onClick={logout}>{tx("logout",language)}</button>
            </div>
          </div>
          <div className="fu1 card" style={{marginBottom:13,border:`1px solid ${oc}44`,background:`linear-gradient(135deg,${T.bgCard},${oc}08)`,padding:24}}>
            <div style={{display:"flex",gap:20,alignItems:"center",flexWrap:"wrap"}}>
              <div style={{flex:1,minWidth:180}}>
                <div style={{fontSize:11,color:T.muted,fontFamily:"'JetBrains Mono',monospace",letterSpacing:1.5,marginBottom:7}}>{tx("primaryCondition",language)}</div>
                <h2 style={{fontSize:26,fontWeight:800,color:oc,marginBottom:11,lineHeight:1.1}}>{result.primary_condition}</h2>
                <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
                  <span className="tag" style={{background:`${T.cyan}15`,color:T.cyan,border:`1px solid ${T.cyan}33`}}>🧭 {localizedSystemLabel(result.body_system, language)}</span>
                  <span className="tag" style={{background:`${oc}15`,color:oc,border:`1px solid ${oc}33`}}>{ORGANS[result.organ_affected]?.emoji} {localizedOrganLabel(result.organ_affected, language)}</span>
                  <span className="tag" style={{background:`${T.teal}15`,color:T.teal,border:`1px solid ${T.teal}33`}}>⏱ {result.recovery_time}</span>
                </div>
              </div>
              <BodySVG organ={result.organ_affected} language={language}/>
            </div>
          </div>
          <div className="fu2 card" style={{marginBottom:13}}>
            {(() => {
              const raw = Number(result.model_confidence ?? 0);
              const hasModelMatch = Boolean((result.matched_symptoms?.length || 0) > 0 || (result.top_predictions?.length || 0) > 0 || raw > 0);
              const noFeatureMatch = raw === 0 && !hasModelMatch;
              const displayValue = `${raw.toFixed(1)}%`;
              const displayLabel = noFeatureMatch ? "No matching RF feature" : (result.confidence_label || "Low model probability");
              const explanation = noFeatureMatch
                ? "The anatomy target was recognized, but the current full 377-feature Random Forest has no matching positive feature for this wording. A disease probability is not applicable; the anatomy mapping is still available."
                : result.primary_condition === "Insufficient evidence"
                  ? `The Random Forest recognized ${result.matched_symptoms?.length || 1} supported symptom feature${(result.matched_symptoms?.length || 1) === 1 ? "" : "s"}, but the current evidence policy did not find enough support for a useful condition prediction. Add relevant symptoms or answer the follow-up questions. This is not a diagnosis.`
                  : null;
              return <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:14,flexWrap:"wrap"}}>
                <div>
                  <div style={{fontSize:11,color:T.muted,fontFamily:"'JetBrains Mono',monospace",letterSpacing:2,marginBottom:6}}>{tx("modelConfidence",language)}</div>
                  <div style={{display:"flex",alignItems:"baseline",gap:8}}><div style={{fontSize:22,fontWeight:800,color:noFeatureMatch?T.orange:T.cyan}}>{displayValue}</div><span style={{fontSize:9,color:T.muted,fontFamily:"'JetBrains Mono',monospace"}}>RF MODEL OUTPUT</span></div>
                  <div style={{fontSize:11,color:noFeatureMatch?T.orange:T.silver,marginTop:3,fontWeight:600}}>{displayLabel}</div>
                  {explanation && <div style={{fontSize:10,color:T.orange,marginTop:7,lineHeight:1.55,maxWidth:650}}>{explanation}</div>}
                </div>
                <div style={{fontSize:11,color:T.muted,maxWidth:360,lineHeight:1.6}}>Random Forest probability is a model output, not calibrated clinical certainty. The 3D target is an educational anatomy mapping.</div>
              </div>;
            })()}
          </div>
          <div className="fu2 card" style={{marginBottom:13}}>
            <div style={{fontSize:11,color:T.muted,fontFamily:"'JetBrains Mono',monospace",letterSpacing:2,marginBottom:16}}>{tx("differential",language)}</div>
            {result.conditions.map(c=><ProbBar key={c.name} name={c.name} prob={c.probability} severity={c.severity}/>)}
          </div>
          <div className="fu3 card" style={{marginBottom:12}}><div style={{fontSize:11,color:T.cyan,fontFamily:"'JetBrains Mono',monospace",letterSpacing:1,marginBottom:10}}>{tx("interviewDetails",language)}</div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10}}>{followupQuestions.map(q=>followupAnswers[q.id]?<div key={q.id} style={{background:T.bgPanel,borderRadius:8,padding:10}}><div style={{fontSize:9,color:T.muted,fontFamily:"'JetBrains Mono',monospace",marginBottom:4}}>{q.label}</div><div style={{fontSize:12}}>{followupAnswers[q.id]}</div></div>:null)}{!followupQuestions.some(q=>followupAnswers[q.id])&&<div style={{background:T.bgPanel,borderRadius:8,padding:10}}><div style={{fontSize:9,color:T.muted,fontFamily:"'JetBrains Mono',monospace",marginBottom:4}}>Recognized symptoms</div><div style={{fontSize:12,lineHeight:1.6}}>{(result.recognized_symptoms?.length ? result.recognized_symptoms : result.matched_symptoms || []).join(" • ") || "No symptom details recorded."}</div></div>}</div></div>
          {(result.matched_symptoms?.length || result.negated_symptoms?.length) ? <div className="fu3 card" style={{marginBottom:12}}>
            <div style={{fontSize:11,color:T.cyan,fontFamily:"'JetBrains Mono',monospace",letterSpacing:1,marginBottom:10}}>{tx2("modelEvidence",language)}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div style={{background:T.bgPanel,borderRadius:8,padding:10}}><div style={{fontSize:9,color:T.muted,marginBottom:6}}>{tx("matchedSymptoms",language)}</div><div style={{fontSize:12,lineHeight:1.6}}>{result.matched_symptoms?.length ? result.matched_symptoms.join(" • ") : "—"}</div></div>
              <div style={{background:T.bgPanel,borderRadius:8,padding:10}}><div style={{fontSize:9,color:T.muted,marginBottom:6}}>{tx("negatedSymptoms",language)}</div><div style={{fontSize:12,lineHeight:1.6}}>{result.negated_symptoms?.length ? result.negated_symptoms.join(" • ") : "—"}</div></div>
            </div>
          </div> : null}
          <div className="fu3" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
            <div className="card"><div style={{fontSize:18,marginBottom:8}}>🔍</div><div style={{fontSize:11,color:T.muted,fontFamily:"'JetBrains Mono',monospace",letterSpacing:1,marginBottom:8}}>{tx("rootCause",language)}</div><p style={{fontSize:13,lineHeight:1.8}}>{result.why_it_happened}</p></div>
            <div className="card"><div style={{fontSize:18,marginBottom:8}}>🍽️</div><div style={{fontSize:11,color:T.muted,fontFamily:"'JetBrains Mono',monospace",letterSpacing:1,marginBottom:8}}>{tx("lifestyle",language)}</div><p style={{fontSize:13,lineHeight:1.8}}>{result.lifestyle_connection}</p></div>
          </div>
          <div className="fu4 card" style={{marginBottom:12,border:`1px solid ${T.teal}33`,background:`${T.teal}04`}}>
            <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
              <span style={{fontSize:24,flexShrink:0}}>⚙️</span>
              <div style={{flex:1}}>
                <div style={{fontSize:11,color:T.teal,fontFamily:"'JetBrains Mono',monospace",letterSpacing:1,marginBottom:8}}>{tx("mechanism",language)}</div>
                <p style={{fontSize:13,lineHeight:1.85}}>{result.mechanism}</p>
                <button className="btn btn-primary" style={{marginTop:14,fontSize:13,padding:"9px 22px",background:`linear-gradient(135deg,${T.teal},${T.cyan})`}} onClick={()=>openAnatomy(result.organ_affected)}>See This in 3D Anatomy →</button>
                <button className="btn btn-outline btn-sm" style={{marginTop:10,marginLeft:8}} onClick={()=>setWhyOpen(v=>!v)}>💡 {whyOpen?tx2("hide",language):tx2("showWhy",language)}</button>
                {whyOpen&&<div style={{marginTop:10,padding:12,background:T.bgPanel,borderRadius:9,color:T.silver,fontSize:12,lineHeight:1.7}}><strong style={{color:T.cyan}}>Why {localizedOrganLabel(result.organ_affected, language)}?</strong><br/>{result.mechanism}</div>}
              </div>
            </div>
          </div>
          <div className="fu4 card" style={{marginBottom:12}}>
            <div style={{fontSize:11,color:T.cyan,fontFamily:"'JetBrains Mono',monospace",letterSpacing:2,marginBottom:12}}>{tx("bodySystemView",language)}</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:8}}>
              <div style={{padding:11,background:T.bgPanel,borderRadius:9}}><div style={{fontSize:10,color:T.muted}}>{tx("system",language)}</div><div style={{fontWeight:700,marginTop:4}}>{localizedSystemLabel(result.body_system, language)}</div></div>
              <div style={{padding:11,background:T.bgPanel,borderRadius:9}}><div style={{fontSize:10,color:T.muted}}>{tx("primaryArea",language)}</div><div style={{fontWeight:700,marginTop:4}}>{localizedOrganLabel(result.organ_affected, language)}</div></div>
              <div style={{padding:11,background:T.bgPanel,borderRadius:9}}><div style={{fontSize:10,color:T.muted}}>3D target</div><div style={{fontWeight:700,marginTop:4,color:ORGANS[result.organ_affected]?.hex||T.cyan}}>Selected anatomy</div></div>
            </div>
            {result.related_areas?.length>0 && <div style={{marginTop:10,fontSize:11,color:T.silver}}>{tx2("relatedAreas",language)}: {result.related_areas.join(" • ")}</div>}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}><div className="card" style={{border:`1px solid ${(result.triage?.color||T.yellow)}55`}}><div style={{fontSize:11,color:result.triage?.color||T.yellow,fontFamily:"'JetBrains Mono',monospace",letterSpacing:1,marginBottom:7}}>{tx("safetyTriage",language)}</div><div style={{fontWeight:800,fontSize:18}}>{result.triage?.icon||"🟡"} {result.triage?.level||"Monitor / Consider care"}</div><p style={{fontSize:12,color:T.silver,lineHeight:1.7,marginTop:6}}>{result.triage?.text||"Use professional assessment for persistent or concerning symptoms."}</p></div><div className="card"><div style={{fontSize:11,color:T.cyan,fontFamily:"'JetBrains Mono',monospace",letterSpacing:1,marginBottom:7}}>{tx("specialist",language)}</div><div style={{fontWeight:800,fontSize:18}}>🩺 {result.suggested_specialist||specialistFor(result)}</div><p style={{fontSize:12,color:T.muted,lineHeight:1.7,marginTop:6}}>This is a navigation suggestion based on the affected area, not a referral or diagnosis.</p></div></div>
          <div className="card" style={{marginBottom:12}}><div style={{fontSize:11,color:T.teal,fontFamily:"'JetBrains Mono',monospace",letterSpacing:1,marginBottom:7}}>{tx2("whyLimits",language)}</div><p style={{fontSize:12,color:T.silver,lineHeight:1.7}}>{result.evidence_note||"SymptomLens organizes symptoms and profile context into educational information. It is not a validated diagnostic model."}</p></div>
          <div className="fu5" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
            <div className="card">
              <div style={{fontSize:18,marginBottom:8}}>💊</div>
              <div style={{fontSize:11,color:T.muted,fontFamily:"'JetBrains Mono',monospace",letterSpacing:1,marginBottom:11}}>{tx("immediateRelief",language)}</div>
              <div style={{display:"flex",flexDirection:"column",gap:7}}>
                {result.immediate_relief.map((s,i)=>(
                  <div key={i} style={{display:"flex",gap:9,alignItems:"flex-start",padding:"8px 11px",background:T.bgPanel,borderRadius:8}}>
                    <div style={{width:20,height:20,borderRadius:"50%",background:`${T.cyan}18`,border:`1px solid ${T.cyan}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:T.cyan,fontFamily:"'JetBrains Mono',monospace",flexShrink:0,marginTop:1}}>{i+1}</div>
                    <span style={{fontSize:12,lineHeight:1.6}}>{s}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div className="card" style={{flex:1}}><div style={{fontSize:11,color:T.red,fontFamily:"'JetBrains Mono',monospace",letterSpacing:1,marginBottom:9}}>🚫 {tx("avoid",language)}</div><div style={{display:"flex",flexWrap:"wrap",gap:5}}>{result.foods_to_avoid.map(f=><span key={f} className="tag" style={{background:`${T.red}12`,color:T.red,border:`1px solid ${T.red}33`}}>{f}</span>)}</div></div>
              <div className="card" style={{flex:1}}><div style={{fontSize:11,color:T.green,fontFamily:"'JetBrains Mono',monospace",letterSpacing:1,marginBottom:9}}>✅ {tx("eatMore",language)}</div><div style={{display:"flex",flexWrap:"wrap",gap:5}}>{result.foods_to_eat.map(f=><span key={f} className="tag" style={{background:`${T.green}12`,color:T.green,border:`1px solid ${T.green}33`}}>{f}</span>)}</div></div>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:24}}>
            <div className="card" style={{border:`1px solid ${T.red}33`,background:`${T.red}06`}}><div style={{fontSize:18,marginBottom:7}}>🚨</div><div style={{fontSize:11,color:T.red,fontFamily:"'JetBrains Mono',monospace",letterSpacing:1,marginBottom:7}}>{tx("seeDoctor",language)}</div><p style={{fontSize:12,lineHeight:1.7,color:"#FFAABB"}}>{result.see_doctor_if}</p></div>
            <div className="card"><div style={{fontSize:18,marginBottom:7}}>📋</div><div style={{fontSize:11,color:T.muted,fontFamily:"'JetBrains Mono',monospace",letterSpacing:1,marginBottom:7}}>{tx("disclaimer",language)}</div><p style={{fontSize:12,lineHeight:1.7,color:T.muted}}>{result.disclaimer}</p></div>
          </div>
          <div style={{textAlign:"center"}}>
            <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}><button className="btn btn-outline btn-sm" onClick={()=>setScreen("care")}>🏥 {tx2("careNavigator",language)}</button><button className="btn btn-outline btn-sm" onClick={()=>setScreen("medicine")}>💊 {tx2("medicineExplorer",language)}</button><button className="btn btn-primary" style={{fontSize:15,padding:"16px 42px"}} onClick={()=>openAnatomy(result?.organ_affected)}>{tx2("open3D",language)}</button><button className="btn btn-outline" style={{fontSize:15,padding:"16px 30px"}} onClick={makeDoctorSummary}>📄 {tx2("doctorPdf",language)}</button><button className="btn btn-outline" style={{fontSize:15,padding:"16px 30px"}} onClick={()=>setScreen("history")}>📈 {tx2("history",language)}</button></div>
          </div>
        </div>
      </div>
    );
  }

  const medicineKey = (value="") => String(value).toLowerCase().replace(/[^a-z0-9]/g, "");
  const MEDICINE_ALIASES = { dolo:"paracetamol", dolo650:"paracetamol", crocin:"paracetamol", calpol:"paracetamol", tylenol:"paracetamol", combiflam:"paracetamol" };

  // ══════════════════════════════════════════════════════════════
  //   SCREEN: MEDICINE EXPLORER
  // ══════════════════════════════════════════════════════════════
  if (screen === "medicine") return (
    <div style={{minHeight:"100vh",background:T.bg,padding:"30px 20px"}} className="grid-bg">
      <style>{STYLES}</style><div className="scanline"/><div style={{maxWidth:760,margin:"0 auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}><div><div style={{fontSize:10,color:T.cyan,fontFamily:"'JetBrains Mono',monospace",letterSpacing:2}}>{tx2("medicineExplorer",language).toUpperCase()}</div><h1 style={{fontSize:30,fontWeight:800}}>Learn about a medicine</h1></div><button className="btn btn-outline btn-sm" onClick={()=>setScreen(result?"report":"dashboard")}>← Back</button></div>
        <div className="card" style={{marginBottom:14}}><p style={{fontSize:12,color:T.muted,lineHeight:1.7,marginBottom:12}}>Educational information only. Medicine information can depend on age, allergies, pregnancy, kidney/liver function and other medicines. Do not use this as a prescription.</p><div style={{display:"flex",gap:10}}><input className="inp" value={medicineQuery} onChange={e=>setMedicineQuery(e.target.value)} placeholder="Type medicine name e.g. paracetamol" onKeyDown={e=>{if(e.key==="Enter"){const raw=medicineKey(medicineQuery); const k=MEDICINE_ALIASES[raw]||raw; setMedicineInfo(MEDICINES[k]||{name:medicineQuery,notFound:true});}}}/><button className="btn btn-primary" onClick={()=>{const raw=medicineKey(medicineQuery); const k=MEDICINE_ALIASES[raw]||raw; setMedicineInfo(MEDICINES[k]||{name:medicineQuery,notFound:true});}}>Search</button></div></div>
        {medicineInfo&&<div className="card" style={{border:`1px solid ${medicineInfo.notFound?T.orange:T.teal}55`}}>{medicineInfo.notFound?<><h2 style={{fontSize:20}}>{tx2("noLocalEntry",language)}</h2><p style={{color:T.silver,lineHeight:1.7,marginTop:8}}>We couldn't find <b>{medicineInfo.name}</b> in the built-in educational list. Check the spelling or ask a pharmacist/clinician.</p></>:<><h2 style={{fontSize:22,color:T.cyan}}>{medicineInfo.name}</h2><div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:8}}>{medicineInfo.category&&<span className="tag" style={{background:`${T.cyan}15`,color:T.cyan,border:`1px solid ${T.cyan}33`}}>{medicineInfo.category}</span>}</div><div style={{marginTop:14}}><div className="inp-label">{tx2("commonUses",language)}</div><p style={{lineHeight:1.7}}>{medicineInfo.uses}</p></div>{medicineInfo.when&&<div style={{marginTop:14}}><div className="inp-label">{tx2("whenUsed",language)}</div><p style={{lineHeight:1.7}}>{medicineInfo.when}</p></div>}<div style={{marginTop:14}}><div className="inp-label">{tx2("precautions",language)}</div><p style={{lineHeight:1.7,color:"#FFAABB"}}>{medicineInfo.avoid}</p></div><div style={{marginTop:14}}><div className="inp-label">{tx2("importantLimit",language)}</div><p style={{lineHeight:1.7,color:T.silver}}>{medicineInfo.notFor}</p></div></>}</div>}
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════
  //   SCREEN: CARE NAVIGATOR
  // ══════════════════════════════════════════════════════════════
  if (screen === "care") {
    const specialist = result?.suggested_specialist || specialistFor(result || {});
    const query = encodeURIComponent(`${specialist} near me`);
    return <div style={{minHeight:"100vh",background:T.bg,padding:"30px 20px"}} className="grid-bg"><style>{STYLES}</style><div className="scanline"/><div style={{maxWidth:820,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}><div><div style={{fontSize:10,color:T.cyan,fontFamily:"'JetBrains Mono',monospace",letterSpacing:2}}>CARE NAVIGATOR</div><h1 style={{fontSize:30,fontWeight:800}}>Find the right care</h1></div><button className="btn btn-outline btn-sm" onClick={()=>setScreen(result?"report":"dashboard")}>← Back</button></div>
      <div className="card" style={{marginBottom:14}}><div className="inp-label">Suggested specialist</div><h2 style={{fontSize:24,color:T.cyan}}>🩺 {specialist}</h2><p style={{color:T.muted,lineHeight:1.7,marginTop:8}}>This is a navigation suggestion based on the symptom area, not a diagnosis or referral.</p></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:12}}><div className="card"><h3>🏥 Nearby hospitals</h3><p style={{color:T.muted,lineHeight:1.7,margin:"8px 0 14px"}}>Open a live map search for hospitals near your current location.</p><button className="btn btn-primary btn-sm" onClick={()=>window.open("https://www.google.com/maps/search/?api=1&query=hospitals+near+me","_blank","noopener,noreferrer")}>Find Hospitals →</button></div><div className="card"><h3>🩺 Nearby {specialist}</h3><p style={{color:T.muted,lineHeight:1.7,margin:"8px 0 14px"}}>Search for the suggested specialist near you.</p><button className="btn btn-outline btn-sm" onClick={()=>window.open(`https://www.google.com/maps/search/?api=1&query=${query}`,"_blank","noopener,noreferrer")}>Find Specialist →</button></div></div>
      <div className="card" style={{marginTop:14,border:`1px solid ${T.yellow}44`}}><div className="inp-label" style={{color:T.yellow}}>Emergency</div><p style={{color:T.silver,lineHeight:1.7}}>For severe, sudden or rapidly worsening symptoms, use your local emergency service rather than waiting for an app recommendation.</p></div>
    </div></div>;
  }

  // ══════════════════════════════════════════════════════════════
  //   SCREEN: HISTORY / TIMELINE
  // ══════════════════════════════════════════════════════════════
  if (screen === "history") return (
    <div style={{minHeight:"100vh",background:T.bg,padding:"30px 20px"}} className="grid-bg">
      <style>{STYLES}</style><div className="scanline"/><div style={{maxWidth:850,margin:"0 auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}><div><div style={{fontSize:10,color:T.cyan,fontFamily:"'JetBrains Mono',monospace",letterSpacing:2}}>SYMPTOM TIMELINE</div><h1 style={{fontSize:30,fontWeight:800}}>Your recent symptom history</h1></div><button className="btn btn-outline btn-sm" onClick={()=>setScreen(result?"report":"symptom")}>← Back</button></div>
        {history.length===0?<div className="card">No saved analyses yet. Your future analyses will appear here.</div>:<>
          <div className="card" style={{marginBottom:14}}><div style={{fontSize:11,color:T.muted,fontFamily:"'JetBrains Mono',monospace",letterSpacing:1,marginBottom:12}}>SEVERITY TREND</div><div style={{display:"flex",alignItems:"end",gap:10,height:150}}>{history.slice(0,12).reverse().map(h=>{const n=parseInt(h.severity,10); const v=Number.isFinite(n)?n:0; return <div key={h.id} style={{flex:1,textAlign:"center"}}><div style={{height:Math.max(8,v*12),background:`linear-gradient(180deg,${T.cyan},${T.teal})`,borderRadius:"6px 6px 2px 2px"}} title={`${h.severity}/10`}/><div style={{fontSize:9,color:T.muted,marginTop:5}}>{h.date}</div></div>})}</div></div>
          {history.map(h=><div key={h.id} className="card" style={{marginBottom:8,cursor:"pointer"}} onClick={()=>{const key=normalizeOrganKey(h.result.organ_affected);setResult(h.result);setSelectedOrgan(key);setSystemFilter(ORGANS[key]?.system||"All");setScreen("report")}}><div style={{display:"flex",justifyContent:"space-between",gap:12}}><div><div style={{fontWeight:700}}>{h.result.primary_condition}</div><div style={{fontSize:11,color:T.muted,marginTop:4}}>{h.symptoms.slice(0,120)}</div></div><div style={{textAlign:"right",fontSize:10,color:T.cyan}}>{h.date}<br/>{h.severity?`Severity ${h.severity}/10`:""}</div></div></div>)}
        </>}
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════
  //   SCREEN: DOCTOR SUMMARY
  // ══════════════════════════════════════════════════════════════
  if (screen === "doctor") return (
    <div style={{minHeight:"100vh",background:T.bg,padding:"30px 20px"}} className="grid-bg">
      <style>{STYLES}</style><div className="scanline"/><div style={{maxWidth:760,margin:"0 auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}><div><div style={{fontSize:10,color:T.cyan,fontFamily:"'JetBrains Mono',monospace",letterSpacing:2}}>DOCTOR CONVERSATION SUMMARY</div><h1 style={{fontSize:28,fontWeight:800}}>SymptomLens Summary</h1></div><button className="btn btn-outline btn-sm" onClick={()=>setScreen("report")}>← Back</button></div>
        {doctorSummary&&<div className="card" style={{lineHeight:1.8}}><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:18}}><div><b>Name</b><br/>{doctorSummary.name}</div><div><b>Date</b><br/>{doctorSummary.date}</div><div><b>Age / Gender</b><br/>{doctorSummary.age} / {doctorSummary.gender}</div><div><b>Severity</b><br/>{doctorSummary.severity}/10</div></div><hr style={{borderColor:T.border,marginBottom:18}}/><h3 style={{marginBottom:6}}>Reported symptoms</h3><p style={{color:T.silver,marginBottom:16}}>{doctorSummary.symptoms}</p><h3 style={{marginBottom:6}}>System / region identified by SymptomLens</h3><p>{ORGANS[doctorSummary.organ]?.emoji} {localizedOrganLabel(doctorSummary.organ, language)} · {localizedSystemLabel(doctorSummary.system, language)}</p><h3 style={{marginTop:16,marginBottom:6}}>AI result</h3><p>{doctorSummary.condition}</p><h3 style={{marginTop:16,marginBottom:6,color:T.red}}>Safety / follow-up</h3><p style={{color:"#FFAABB"}}>{doctorSummary.warning}</p><p style={{fontSize:11,color:T.muted,marginTop:20}}>This summary is a conversation aid, not a diagnosis or medical record.</p></div>}
        <div style={{display:"flex",gap:10,justifyContent:"center",marginTop:16}}><button className="btn btn-primary" onClick={()=>window.print()}>🖨 Print / Save as PDF</button><button className="btn btn-outline" onClick={()=>openAnatomy()}>3D Anatomy</button></div>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════
  //   SCREEN: 3D ANATOMY
  // ══════════════════════════════════════════════════════════════
  if (screen === "anatomy") return (
    <div style={{height:"100vh",background:T.bg,display:"flex",flexDirection:"column"}} className="grid-bg">
      <style>{STYLES}</style><div className="scanline"/>
      <div className="glass" style={{padding:"13px 20px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
        <div>
          <div style={{fontSize:10,color:T.muted,fontFamily:"'JetBrains Mono',monospace",letterSpacing:2,marginBottom:2}}>3D ANATOMY · INTERACTIVE VIEWER</div>
          <h1 style={{fontSize:16,fontWeight:800,lineHeight:1}}>{selectedOrgan ? `${ORGANS[selectedOrgan]?.emoji} ${ORGANS[selectedOrgan]?.label||selectedOrgan} — highlighted` : (result ? `${ORGANS[result.organ_affected]?.emoji} ${localizedOrganLabel(result.organ_affected, language)} — ${result.primary_condition}` : "Human Anatomy Explorer")}</h1>
        </div>
        <div style={{display:"flex",gap:7}}>
          {result&&<button className="btn btn-outline btn-sm" onClick={()=>setScreen("report")}>← Report</button>}
          <button className="btn btn-outline btn-sm" onClick={()=>setScreen("history")}>History</button><button className="btn btn-outline btn-sm" onClick={startNewAnalysis}>New Analysis</button>
        </div>
      </div>
      <div style={{flex:1,display:"flex",overflow:"hidden"}}>
        <div style={{flex:1,position:"relative"}}><BodyViewer3D highlightOrgan={normalizeOrganKey(selectedOrgan || result?.organ_affected)} onOrganSelect={savePainLocation} systemFilter={systemFilter} layers={anatomyLayers} gender={profile.gender}/></div>
        <div style={{width:265,borderLeft:`1px solid ${T.border}`,background:T.bgCard,padding:16,overflowY:"auto",display:"flex",flexDirection:"column",gap:14,flexShrink:0}}>
          <div style={{padding:11,background:T.bgPanel,border:`1px solid ${T.border}`,borderRadius:10}}><div style={{fontSize:10,color:T.muted,fontFamily:"'JetBrains Mono',monospace",letterSpacing:1,marginBottom:6}}>{tx2("anatomyLayers",language)}</div>{Object.entries({skin:"Skin / body surface",organs:"Organs",skeleton:"Skeleton",muscles:"Muscles",nerves:"Nervous system",vessels:"Blood vessels"}).map(([k,l])=>{const available=["skin","organs"].includes(k);return <label key={k} style={{display:"flex",gap:8,alignItems:"center",fontSize:11,color:available?(anatomyLayers[k]?T.white:T.muted):T.muted,marginBottom:6,opacity:available?1:.6}}><input type="checkbox" disabled={!available} checked={available?anatomyLayers[k]:false} onChange={()=>available&&setAnatomyLayers(a=>({...a,[k]:!a[k]}))}/>{l}{!available&&<span style={{fontSize:9,color:T.orange}}>asset not included</span>}</label>})}<div style={{fontSize:9,color:T.muted,lineHeight:1.5,marginTop:4}}>Muscle, nerve and vessel layers require additional licensed anatomy assets; the viewer will not pretend unavailable data is present.</div>
           <div style={{marginTop:8,padding:8,borderRadius:8,background:`${T.cyan}08`,border:`1px solid ${T.cyan}22`,fontSize:10,color:T.silver}}>
             Anatomy profile: <b style={{color:T.cyan}}>{profile.gender==="Female"?"Female":profile.gender==="Male"?"Male":"General"}</b>. A sex-specific full-body reference model is used, and reproductive structures are filtered to match the profile.
           </div></div>
          <div style={{padding:11,background:T.bgPanel,border:`1px solid ${T.border}`,borderRadius:10}}><div style={{fontSize:10,color:T.muted,fontFamily:"'JetBrains Mono',monospace",letterSpacing:1,marginBottom:6}}>{tx2("viewBySystem",language)}</div><select className="inp" value={systemFilter} onChange={e=>setSystemFilter(e.target.value)} style={{fontSize:12,padding:9}}>{SYSTEMS.map(s=><option key={s}>{s}</option>)}</select></div>
          {(selectedOrgan || result)&&(<div style={{padding:"12px 13px",background:`${ORGANS[selectedOrgan || result?.organ_affected]?.hex||T.cyan}18`,border:`1px solid ${ORGANS[selectedOrgan || result?.organ_affected]?.hex||T.cyan}44`,borderRadius:11}}>
            <div style={{fontSize:10,color:T.muted,fontFamily:"'JetBrains Mono',monospace",letterSpacing:1,marginBottom:4}}>{tx2("selectedRegion",language)}</div>
            <div style={{fontSize:14,fontWeight:700,color:ORGANS[selectedOrgan || result?.organ_affected]?.hex||T.cyan}}>{ORGANS[selectedOrgan || result?.organ_affected]?.emoji} {ORGANS[selectedOrgan || result?.organ_affected]?.label||selectedOrgan || result?.organ_affected}</div>
            <div style={{fontSize:11,color:T.muted,marginTop:2}}>{ORGANS[selectedOrgan || result?.organ_affected]?.system}</div>
          </div>)}
          <div>
            <div style={{fontSize:10,color:T.muted,fontFamily:"'JetBrains Mono',monospace",letterSpacing:2,marginBottom:10}}>{tx2("allOrganSystems",language)}</div>
            <div style={{display:"flex",flexDirection:"column",gap:3}}>
              {Object.entries(ORGANS).filter(([key])=>{
  if (profile.gender==="Female") return !["Testes","Prostate"].includes(key);
  if (profile.gender==="Male") return !["Uterus","Ovaries"].includes(key);
  return !["Uterus","Ovaries","Testes","Prostate"].includes(key);
}).map(([key,{hex,label,system,emoji}])=>{
                const active=key===(selectedOrgan || result?.organ_affected);
                return (<div key={key} onClick={()=>{setSelectedOrgan(key);setSystemFilter(ORGANS[key]?.system||"All");}} style={{display:"flex",alignItems:"center",gap:7,padding:"7px 9px",borderRadius:7,background:active?`${hex}15`:T.bgPanel,border:`1px solid ${active?hex:T.border}`,transition:"all .25s",cursor:"pointer"}}>
                  <div style={{width:7,height:7,borderRadius:"50%",background:hex,boxShadow:active?`0 0 7px ${hex}`:"none",flexShrink:0}}/>
                  <div style={{flex:1}}><div style={{fontSize:11,fontWeight:active?700:400,color:active?T.white:T.muted}}>{emoji} {label}</div><div style={{fontSize:9,color:active?hex:T.border,fontFamily:"'JetBrains Mono',monospace"}}>{system}</div></div>
                  {active&&<span style={{fontSize:8,color:hex,animation:"pulse 1.5s infinite"}}>●</span>}
                </div>);
              })}
            </div>
          </div>
          {(selectedOrgan || result?.organ_affected) && <div className="card" style={{padding:12}}><div style={{fontSize:10,color:T.cyan,fontFamily:"'JetBrains Mono',monospace",letterSpacing:1,marginBottom:7}}>ORGAN EXPLORER</div><div style={{fontWeight:800,fontSize:14,marginBottom:6}}>{ORGANS[selectedOrgan || result?.organ_affected]?.emoji} {ORGANS[selectedOrgan || result?.organ_affected]?.label}</div><p style={{fontSize:11,lineHeight:1.65,color:T.silver}}>{ORGAN_EDUCATION[selectedOrgan || result?.organ_affected]?.what}</p><div style={{marginTop:7,fontSize:10,color:T.muted}}>Common symptom links</div><p style={{fontSize:11,lineHeight:1.6}}>{ORGAN_EDUCATION[selectedOrgan || result?.organ_affected]?.symptoms}</p><div style={{marginTop:7,fontSize:10,color:T.red}}>Safety note</div><p style={{fontSize:10,lineHeight:1.6,color:"#FFAABB"}}>{ORGAN_EDUCATION[selectedOrgan || result?.organ_affected]?.caution}</p></div>}
          {result?.related_areas?.length>0&&<div className="card" style={{padding:12}}><div style={{fontSize:10,color:T.orange,fontFamily:"'JetBrains Mono',monospace",letterSpacing:1,marginBottom:6}}>RELATED AREAS</div>{result.related_areas.map((x,i)=><div key={i} style={{fontSize:11,color:T.silver,lineHeight:1.6}}>• {x}</div>)}</div>}
          {result&&(<div>
            <div style={{fontSize:10,color:T.muted,fontFamily:"'JetBrains Mono',monospace",letterSpacing:2,marginBottom:8}}>MECHANISM</div>
            <div style={{fontSize:11,lineHeight:1.8,padding:11,background:T.bgPanel,borderRadius:8,border:`1px solid ${T.border}`,color:T.silver}}>{result.mechanism}</div>
          </div>)}
          <div style={{padding:11,background:`${T.cyan}08`,border:`1px solid ${T.cyan}22`,borderRadius:8}}>
            <p style={{fontSize:11,color:T.muted,lineHeight:1.85}}>
              <span style={{color:T.cyan}}>Glowing organ</span> = affected region<br/>
              ❤️ Heart has live <span style={{color:T.red}}>beating pulse</span><br/>
              🫁 Lungs show <span style={{color:T.teal}}>breathing rhythm</span><br/>
              🖱 <strong>Drag</strong> to rotate 360°
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return null;
}


export default function RootApp(){ return <AppErrorBoundary><App /></AppErrorBoundary>; }
