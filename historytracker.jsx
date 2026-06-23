import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

// ── Constants ─────────────────────────────────────────────────────────────────
const FLAG_COLORS = [
  "#6366F1","#10B981","#F59E0B","#EF4444","#3B82F6",
  "#8B5CF6","#EC4899","#14B8A6","#F97316","#84CC16",
];
function getFlagColor(flags, name) {
  const i = flags.findIndex(f => f.name === name);
  return FLAG_COLORS[i % FLAG_COLORS.length] ?? "#94A3B8";
}
function todayStr() { return new Date().toISOString().slice(0,10); }

// ── localStorage ──────────────────────────────────────────────────────────────
function lsGet(key, fb) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fb; } catch { return fb; }
}
function lsSet(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }

function useLocal(key, init) {
  const [val, setVal] = useState(() => lsGet(key, init));
  const set = useCallback(up => {
    setVal(prev => {
      const next = typeof up === "function" ? up(prev) : up;
      lsSet(key, next);
      return next;
    });
  }, [key]);
  return [val, set];
}

// ── Shared tokens ─────────────────────────────────────────────────────────────
const T = {
  bg:     "#F5F5F7",
  card:   "#FFFFFF",
  border: "#E8E8EA",
  text:   "#1A1A1A",
  sub:    "#6E6E73",
  accent: "#6366F1",
};

const inputS = {
  width:"100%", padding:"11px 14px", borderRadius:10,
  border:`1px solid ${T.border}`, fontSize:15, color:T.text,
  background:"#FAFAFA", fontFamily:"inherit", boxSizing:"border-box",
  WebkitAppearance:"none", appearance:"none",
};
const labelWrap = { display:"flex", flexDirection:"column", gap:6, flex:1 };
const labelText  = { fontSize:11, fontWeight:700, color:T.sub, letterSpacing:"0.07em", textTransform:"uppercase" };

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, type="info" }) {
  if (!msg) return null;
  const bg = type==="error" ? "#EF4444" : type==="success" ? "#10B981" : "#1A1A1A";
  return (
    <div style={{
      position:"fixed", bottom:90, left:"50%", transform:"translateX(-50%)",
      background:bg, color:"#fff", padding:"12px 22px",
      borderRadius:12, fontSize:13, fontWeight:600, zIndex:999,
      boxShadow:"0 4px 24px rgba(0,0,0,.2)", animation:"fadein .2s ease",
      whiteSpace:"nowrap",
    }}>{msg}</div>
  );
}

// ── Data Modal (export/import) ────────────────────────────────────────────────
function DataModal({ flags, entries, setFlags, setEntries, onClose, showToast }) {
  const [tab, setTab]   = useState("export"); // export | import
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);

  const exportJson = useMemo(() => JSON.stringify(
    { version:1, exportedAt:new Date().toISOString(), flags, entries }, null, 2
  ), [flags, entries]);

  function handleCopy() {
    navigator.clipboard?.writeText(exportJson).then(() => {
      setCopied(true); setTimeout(()=>setCopied(false), 2000);
    }).catch(() => {
      // fallback: select textarea
      const ta = document.getElementById("export-ta");
      if (ta) { ta.select(); document.execCommand("copy"); }
      setCopied(true); setTimeout(()=>setCopied(false), 2000);
    });
  }

  function handleImport() {
    try {
      const data = JSON.parse(text);
      if (!Array.isArray(data.flags) || !Array.isArray(data.entries)) throw new Error();
      setFlags(data.flags);
      setEntries(data.entries);
      showToast(`✓ ${data.entries.length}개 기록 불러옴`, "success");
      onClose();
    } catch {
      showToast("올바른 형식이 아닙니다", "error");
    }
  }

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:500,
      background:"rgba(0,0,0,.45)", display:"flex", alignItems:"flex-end",
    }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{
        width:"100%", background:T.card, borderRadius:"20px 20px 0 0",
        padding:"0 0 32px",
        boxShadow:"0 -8px 40px rgba(0,0,0,.15)",
        animation:"slideup .25s ease",
        maxHeight:"80vh", display:"flex", flexDirection:"column",
      }}>
        {/* Handle */}
        <div style={{ display:"flex", justifyContent:"center", padding:"12px 0 4px" }}>
          <div style={{ width:36, height:4, borderRadius:2, background:"#DDD" }}/>
        </div>

        <div style={{ padding:"0 20px", display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
          <h3 style={{ margin:0, fontSize:17, fontWeight:700 }}>데이터 관리</h3>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:22, color:T.sub, cursor:"pointer", padding:"4px 8px" }}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", margin:"0 20px 16px", background:T.bg, borderRadius:10, padding:3 }}>
          {[["export","💾 내보내기"],["import","📂 불러오기"]].map(([id,lbl])=>(
            <button key={id} onClick={()=>setTab(id)} style={{
              flex:1, padding:"8px 0", borderRadius:8, border:"none", cursor:"pointer",
              fontSize:13, fontWeight:600, transition:"all .15s",
              background:tab===id?T.card:"transparent",
              color:tab===id?T.text:T.sub,
              boxShadow:tab===id?"0 1px 4px rgba(0,0,0,.08)":"none",
              fontFamily:"inherit",
            }}>{lbl}</button>
          ))}
        </div>

        <div style={{ flex:1, overflow:"auto", padding:"0 20px" }}>
          {tab==="export" ? (
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <p style={{ margin:0, fontSize:13, color:T.sub, lineHeight:1.6 }}>
                아래 JSON을 복사해서 메모장 등에 저장하세요. 나중에 불러오기로 복원할 수 있습니다.
              </p>
              <textarea id="export-ta" readOnly value={exportJson}
                style={{ ...inputS, fontSize:11, fontFamily:"monospace", minHeight:180, resize:"none", color:"#444" }}/>
              <button onClick={handleCopy} style={{
                padding:"13px", borderRadius:10, border:"none",
                background:copied?"#10B981":T.accent, color:"#fff",
                fontSize:15, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
                transition:"background .2s",
              }}>
                {copied ? "✓ 복사됨!" : "클립보드에 복사"}
              </button>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <p style={{ margin:0, fontSize:13, color:T.sub, lineHeight:1.6 }}>
                이전에 내보낸 JSON 데이터를 아래에 붙여넣으세요.
              </p>
              <textarea value={text} onChange={e=>setText(e.target.value)}
                placeholder='{"version":1,"flags":[...],"entries":[...]}'
                style={{ ...inputS, fontSize:11, fontFamily:"monospace", minHeight:180, resize:"none" }}/>
              <button onClick={handleImport} disabled={!text.trim()} style={{
                padding:"13px", borderRadius:10, border:"none",
                background:T.accent, color:"#fff",
                fontSize:15, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
                opacity:text.trim()?1:.4,
              }}>
                불러오기
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Bottom Tab Bar ─────────────────────────────────────────────────────────────
function TabBar({ view, setView, onDataPress }) {
  const tabs = [
    { id:"settings", icon:"⚙️", label:"설정" },
    { id:"input",    icon:"✏️", label:"기록" },
    { id:"viz",      icon:"📊", label:"시각화" },
  ];
  return (
    <div style={{
      position:"fixed", bottom:0, left:0, right:0, zIndex:100,
      background:"rgba(255,255,255,0.95)", backdropFilter:"blur(20px)",
      borderTop:`1px solid ${T.border}`,
      display:"flex", alignItems:"stretch",
      paddingBottom:"env(safe-area-inset-bottom, 0px)",
    }}>
      {tabs.map(t => (
        <button key={t.id} onClick={()=>setView(t.id)} style={{
          flex:1, display:"flex", flexDirection:"column", alignItems:"center",
          justifyContent:"center", gap:3, padding:"10px 0 12px",
          border:"none", background:"none", cursor:"pointer",
          color: view===t.id ? T.accent : T.sub,
          transition:"color .15s",
          fontFamily:"inherit",
        }}>
          <span style={{ fontSize:20, lineHeight:1 }}>{t.icon}</span>
          <span style={{ fontSize:10, fontWeight:view===t.id?700:500, letterSpacing:"0.03em" }}>{t.label}</span>
          {view===t.id && (
            <span style={{
              position:"absolute", top:0,
              width:24, height:2, background:T.accent, borderRadius:1,
              // can't use top:0 inside flex easily, use outline
            }}/>
          )}
        </button>
      ))}
      {/* Data button */}
      <button onClick={onDataPress} style={{
        flex:1, display:"flex", flexDirection:"column", alignItems:"center",
        justifyContent:"center", gap:3, padding:"10px 0 12px",
        border:"none", background:"none", cursor:"pointer",
        color: T.sub, fontFamily:"inherit",
      }}>
        <span style={{ fontSize:20, lineHeight:1 }}>🗄️</span>
        <span style={{ fontSize:10, fontWeight:500, letterSpacing:"0.03em" }}>데이터</span>
      </button>
    </div>
  );
}

// ── Top Header ────────────────────────────────────────────────────────────────
const VIEW_TITLES = { settings:"설정", input:"기록", viz:"시각화" };

function Header({ view }) {
  return (
    <div style={{
      position:"fixed", top:0, left:0, right:0, zIndex:100,
      background:"rgba(255,255,255,0.95)", backdropFilter:"blur(20px)",
      borderBottom:`1px solid ${T.border}`,
      paddingTop:"env(safe-area-inset-top, 0px)",
    }}>
      <div style={{ height:52, display:"flex", alignItems:"center", padding:"0 20px" }}>
        <span style={{ fontWeight:800, fontSize:20, letterSpacing:"-0.04em", color:T.text }}>
          {VIEW_TITLES[view]}
        </span>
      </div>
    </div>
  );
}

// ── Page wrapper ──────────────────────────────────────────────────────────────
function Page({ children }) {
  return (
    <div style={{
      maxWidth:540, margin:"0 auto",
      padding:"72px 16px 100px",
      display:"flex", flexDirection:"column", gap:12,
    }}>{children}</div>
  );
}

function Card({ title, subtitle, children, noPad }) {
  return (
    <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:16, overflow:"hidden" }}>
      {(title||subtitle) && (
        <div style={{ padding:"16px 16px 0" }}>
          {title    && <div style={{ fontSize:14, fontWeight:700, color:T.text, letterSpacing:"-0.01em" }}>{title}</div>}
          {subtitle && <div style={{ fontSize:12, color:T.sub, marginTop:3, lineHeight:1.5 }}>{subtitle}</div>}
        </div>
      )}
      <div style={noPad ? undefined : { padding:16 }}>{children}</div>
    </div>
  );
}

function Empty({ icon="📭", children }) {
  return (
    <div style={{ padding:"32px 16px", textAlign:"center" }}>
      <div style={{ fontSize:32, marginBottom:10 }}>{icon}</div>
      <div style={{ fontSize:13, color:T.sub, lineHeight:1.6 }}>{children}</div>
    </div>
  );
}

function StatRow({ stats }) {
  return (
    <div style={{ display:"flex", gap:10 }}>
      {stats.map(({ label, value, color }) => (
        <div key={label} style={{
          flex:1, background:T.card, border:`1px solid ${T.border}`,
          borderRadius:14, padding:"14px 12px",
        }}>
          <div style={{ fontSize:24, fontWeight:800, color:color||T.text, letterSpacing:"-0.04em" }}>{value}</div>
          <div style={{ fontSize:10, color:T.sub, marginTop:2, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase" }}>{label}</div>
        </div>
      ))}
    </div>
  );
}

// ── SETTINGS ──────────────────────────────────────────────────────────────────
function SettingsPage({ flags, setFlags }) {
  const [inp, setInp] = useState("");

  function add() {
    const n = inp.trim();
    if (!n || flags.find(f => f.name.toLowerCase()===n.toLowerCase())) return;
    setFlags(p => [...p, { name:n, id:Date.now() }]);
    setInp("");
  }

  const steps = [
    { icon:"🏷️", title:"플래그 만들기",      desc:"기록에 붙일 카테고리입니다. Work · Health · Study 등 자유롭게 설정하세요." },
    { icon:"✏️", title:"기록 탭에서 입력",    desc:"날짜·플래그·내용을 입력하면 아래 스택에 쌓입니다." },
    { icon:"📊", title:"시각화로 분석",       desc:"타임라인·막대·라인 차트로 패턴을 한눈에 확인하세요." },
    { icon:"🗄️", title:"데이터 탭으로 백업",  desc:"하단 '데이터' 버튼으로 JSON을 복사하거나 불러올 수 있습니다." },
  ];

  return (
    <Page>
      <Card title="플래그 관리" subtitle="기록에 붙일 카테고리를 추가하세요.">
        <div style={{ display:"flex", gap:8, marginBottom:flags.length?14:0 }}>
          <input value={inp} onChange={e=>setInp(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&add()}
            placeholder="새 플래그 이름…" style={{ ...inputS, flex:1 }}/>
          <button onClick={add} style={{
            padding:"11px 18px", borderRadius:10, border:"none",
            background:T.text, color:"#fff", fontSize:14, fontWeight:700,
            cursor:"pointer", fontFamily:"inherit", flexShrink:0,
          }}>추가</button>
        </div>

        {flags.length>0 && (
          <ul style={{ margin:0, padding:0, listStyle:"none", display:"flex", flexDirection:"column", gap:8 }}>
            {flags.map((f,i) => (
              <li key={f.id} style={{
                display:"flex", alignItems:"center", justifyContent:"space-between",
                padding:"12px 14px", borderRadius:12,
                background:T.bg, border:`1px solid ${T.border}`,
              }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ width:10, height:10, borderRadius:"50%", background:FLAG_COLORS[i%FLAG_COLORS.length], flexShrink:0 }}/>
                  <span style={{ fontSize:15, fontWeight:500 }}>{f.name}</span>
                </div>
                <button onClick={()=>setFlags(p=>p.filter(x=>x.id!==f.id))} style={{
                  background:"none", border:"none", cursor:"pointer",
                  fontSize:13, color:"#CCC", padding:"6px 10px", borderRadius:8,
                  fontFamily:"inherit",
                }}
                  onMouseEnter={e=>e.target.style.color="#EF4444"}
                  onMouseLeave={e=>e.target.style.color="#CCC"}
                >삭제</button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="이용 가이드">
        <div style={{ display:"flex", flexDirection:"column" }}>
          {steps.map((s,i) => (
            <div key={i} style={{
              display:"flex", gap:14, padding:"14px 0",
              borderBottom:i<steps.length-1?`1px solid ${T.border}`:"none",
            }}>
              <div style={{ fontSize:22, width:30, textAlign:"center", flexShrink:0 }}>{s.icon}</div>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:3 }}>{s.title}</div>
                <div style={{ fontSize:13, color:T.sub, lineHeight:1.6 }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop:14, padding:"14px", borderRadius:12, background:"#F0EEFF", border:"1px solid #DDD8FF" }}>
          <div style={{ fontSize:12, fontWeight:700, color:T.accent, marginBottom:8 }}>💡 Tips</div>
          <ul style={{ margin:0, padding:"0 0 0 14px", fontSize:12, color:"#555", lineHeight:1.9 }}>
            <li>플래그는 최대 10개까지 고유 색상이 자동 배정됩니다.</li>
            <li>같은 날 여러 플래그로 여러 건 기록할 수 있습니다.</li>
            <li>데이터는 이 기기 브라우저에만 저장됩니다.</li>
          </ul>
        </div>
      </Card>
    </Page>
  );
}

// ── INPUT ─────────────────────────────────────────────────────────────────────
function InputPage({ flags, entries, setEntries }) {
  const [date,    setDate]    = useState(todayStr());
  const [flag,    setFlag]    = useState(() => flags[0]?.name ?? "");
  const [context, setContext] = useState("");
  const [err,     setErr]     = useState(false);
  const [flash,   setFlash]   = useState(false);

  useEffect(() => { if (flags.length && !flag) setFlag(flags[0].name); }, [flags]);

  function submit() {
    if (!flag || !context.trim()) { setErr(true); setTimeout(()=>setErr(false), 500); return; }
    setEntries(p => [{ id:Date.now(), date, flag, context:context.trim() }, ...p]);
    setContext("");
    setDate(todayStr());
    setFlash(true); setTimeout(()=>setFlash(false), 1800);
  }

  const sorted = [...entries].sort((a,b) => b.date.localeCompare(a.date)||b.id-a.id);

  return (
    <Page>
      {/* Input form */}
      <Card>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {/* Date + Flag row */}
          <div style={{ display:"flex", gap:10 }}>
            <label style={labelWrap}>
              <span style={labelText}>날짜</span>
              <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={inputS}/>
            </label>
            <label style={labelWrap}>
              <span style={labelText}>플래그</span>
              <div style={{ position:"relative" }}>
                <select value={flag} onChange={e=>setFlag(e.target.value)}
                  style={{ ...inputS, paddingRight:30 }}>
                  {flags.length===0&&<option value="">— 설정에서 추가 —</option>}
                  {flags.map(f=><option key={f.id} value={f.name}>{f.name}</option>)}
                </select>
                <span style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", pointerEvents:"none", fontSize:10, color:T.sub }}>▼</span>
              </div>
            </label>
          </div>

          {/* Context */}
          <label style={labelWrap}>
            <span style={labelText}>내용</span>
            <textarea value={context} onChange={e=>setContext(e.target.value)}
              placeholder="오늘 어떤 일이 있었나요…" rows={4}
              style={{
                ...inputS, resize:"none", minHeight:96,
                borderColor: err?"#EF4444":T.border,
                animation: err?"shake .35s ease":"none",
                lineHeight:1.6,
              }}/>
          </label>

          <button onClick={submit} disabled={flags.length===0} style={{
            padding:"14px", borderRadius:12, border:"none",
            background: flash?"#10B981":T.accent, color:"#fff",
            fontSize:15, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
            transition:"background .25s",
          }}>
            {flash ? "✓ 기록됨!" : "기록 추가"}
          </button>
        </div>
      </Card>

      {/* Stack */}
      <div style={{ fontSize:12, fontWeight:700, color:T.sub, padding:"4px 4px 0", letterSpacing:"0.05em" }}>
        기록 {entries.length}개
      </div>

      {entries.length===0
        ? <Card><Empty icon="📝">아직 기록이 없습니다.<br/>위 폼으로 첫 기록을 남겨보세요.</Empty></Card>
        : <Card noPad>
            {sorted.map((e,i) => {
              const color = getFlagColor(flags, e.flag);
              return (
                <div key={e.id} style={{
                  padding:"14px 16px",
                  borderLeft:`3px solid ${color}`,
                  borderBottom:i<sorted.length-1?`1px solid ${T.border}`:"none",
                  transition:"background .1s",
                }}
                  onMouseEnter={e=>e.currentTarget.style.background=T.bg}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                >
                  {/* Top row: date + flag badge + delete */}
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontSize:11, color:T.sub, fontWeight:500 }}>{e.date}</span>
                      <span style={{
                        display:"inline-block", padding:"2px 9px", borderRadius:999,
                        fontSize:11, fontWeight:700, background:`${color}18`, color,
                      }}>{e.flag}</span>
                    </div>
                    <button onClick={()=>setEntries(p=>p.filter(x=>x.id!==e.id))} style={{
                      background:"none", border:"none", cursor:"pointer",
                      fontSize:18, color:"#CCC", padding:"2px 6px", lineHeight:1,
                    }}
                      onMouseEnter={ev=>ev.target.style.color="#EF4444"}
                      onMouseLeave={ev=>ev.target.style.color="#CCC"}
                    >×</button>
                  </div>
                  {/* Context */}
                  <div style={{ fontSize:14, color:T.text, lineHeight:1.6 }}>{e.context}</div>
                </div>
              );
            })}
          </Card>
      }
    </Page>
  );
}

// ── TIMELINE ──────────────────────────────────────────────────────────────────
function Timeline({ entries, flags, flagFilter }) {
  const [tooltip, setTooltip] = useState(null);
  const scrollRef = useRef(null);

  const filtered = useMemo(() => {
    const base = flagFilter==="all" ? entries : entries.filter(e=>e.flag===flagFilter);
    return [...base].sort((a,b)=>a.date.localeCompare(b.date));
  }, [entries, flagFilter]);

  if (!filtered.length) return <Empty icon="🗓️">타임라인에 표시할 데이터가 없습니다.</Empty>;

  const minD    = new Date(filtered[0].date);
  const maxD    = new Date(filtered[filtered.length-1].date);
  const pad     = 18 * 86400000;
  const startMs = minD.getTime() - pad;
  const endMs   = maxD.getTime() + pad;
  const spanMs  = endMs - startMs;

  function pct(ds) { return ((new Date(ds).getTime()-startMs)/spanMs)*100; }

  // Group by date
  const byDate = {};
  filtered.forEach(e => {
    if (!byDate[e.date]) byDate[e.date]=[];
    byDate[e.date].push(e);
  });
  const dateList = Object.keys(byDate).sort();

  // Alternating side per date
  const dateSide = {};
  dateList.forEach((d,i) => dateSide[d] = i%2===0?"top":"bottom");

  // Month ticks
  const ticks = [];
  const tc = new Date(startMs); tc.setDate(1);
  while (tc.getTime()<=endMs) { ticks.push(new Date(tc)); tc.setMonth(tc.getMonth()+1); }

  const todayPct = pct(todayStr());
  const STEM=48, GAP=32;
  // max stacks above/below
  const maxStack = Math.max(...dateList.map(d=>byDate[d].length));
  const halfH = STEM + maxStack*GAP + 24;

  return (
    <div style={{ position:"relative" }}>
      <div ref={scrollRef} style={{ overflowX:"auto", WebkitOverflowScrolling:"touch" }}>
        <div style={{
          minWidth: Math.max(360, dateList.length*80),
          position:"relative",
          height: halfH*2 + 2,
          padding:`0 24px`,
        }}>
          {/* Grid */}
          {ticks.map((t,i)=>{
            const p=((t.getTime()-startMs)/spanMs)*100;
            if(p<0||p>100) return null;
            return <div key={i} style={{ position:"absolute", left:`${p}%`, top:0, bottom:0, borderLeft:"1px solid #F0F0F0", pointerEvents:"none" }}/>;
          })}

          {/* Axis */}
          <div style={{
            position:"absolute", left:24, right:24,
            top:"50%", height:2, background:"#E0E0E2", transform:"translateY(-50%)",
          }}/>

          {/* Today */}
          {todayPct>=0&&todayPct<=100&&(
            <div style={{
              position:"absolute",
              left:`calc(24px + ${todayPct}% * (100% - 48px) / 100)`,
              top:0, bottom:0,
              borderLeft:"2px dashed #6366F1", pointerEvents:"none",
            }}>
              <span style={{ position:"absolute", top:8, left:4, fontSize:9, color:"#6366F1", fontWeight:800 }}>TODAY</span>
            </div>
          )}

          {/* Month labels */}
          <div style={{ position:"absolute", left:24, right:24, bottom:4 }}>
            {ticks.map((t,i)=>{
              const p=((t.getTime()-startMs)/spanMs)*100;
              if(p<0||p>100) return null;
              const isJan=t.getMonth()===0;
              return(
                <div key={i} style={{ position:"absolute", left:`${p}%`, transform:"translateX(-50%)", textAlign:"center", whiteSpace:"nowrap" }}>
                  <div style={{ fontSize:10, color:isJan?"#333":"#BBB", fontWeight:isJan?700:400 }}>{t.getMonth()+1}월</div>
                  {isJan&&<div style={{ fontSize:9, color:"#999" }}>{t.getFullYear()}년</div>}
                </div>
              );
            })}
          </div>

          {/* Events */}
          {dateList.map(dateStr=>{
            const evs    = byDate[dateStr];
            const p      = pct(dateStr);
            const isTop  = dateSide[dateStr]==="top";
            const col0   = getFlagColor(flags, evs[0].flag);

            return (
              <div key={dateStr} style={{
                position:"absolute",
                left:`calc(24px + ${p}% * (100% - 48px) / 100)`,
                top:"50%", transform:"translateX(-50%)",
              }}>
                {/* Dot */}
                <div style={{
                  position:"absolute", width:10, height:10, borderRadius:"50%",
                  background:col0, border:"2px solid #fff", boxShadow:`0 0 0 2px ${col0}55`,
                  left:"50%", top:"50%", transform:"translate(-50%,-50%)", zIndex:3,
                }}/>

                {/* Date label */}
                <div style={{
                  position:"absolute", left:"50%", transform:"translateX(-50%)",
                  ...(isTop?{top:"calc(50% + 10px)"}:{bottom:"calc(50% + 10px)"}),
                  fontSize:8, color:"#BBB", fontWeight:600, whiteSpace:"nowrap",
                }}>{dateStr.slice(5)}</div>

                {/* Stem */}
                <div style={{
                  position:"absolute", left:"50%", transform:"translateX(-50%)",
                  width:1.5, background:`${col0}45`,
                  ...(isTop?{bottom:"50%",height:STEM+(evs.length-1)*GAP}:{top:"50%",height:STEM+(evs.length-1)*GAP}),
                }}/>

                {/* Bubbles */}
                {evs.map((ev,bi)=>{
                  const evCol=getFlagColor(flags,ev.flag);
                  const off=STEM+bi*GAP;
                  return(
                    <div key={ev.id}
                      onMouseEnter={e=>{
                        const r=e.currentTarget.getBoundingClientRect();
                        const wr=scrollRef.current?.getBoundingClientRect();
                        setTooltip({ entry:ev, x:r.left-(wr?.left||0)+r.width/2, y:r.top-(wr?.top||0), isTop });
                      }}
                      onMouseLeave={()=>setTooltip(null)}
                      onClick={e=>{
                        const r=e.currentTarget.getBoundingClientRect();
                        const wr=scrollRef.current?.getBoundingClientRect();
                        setTooltip(t=>t?.entry?.id===ev.id?null:{ entry:ev, x:r.left-(wr?.left||0)+r.width/2, y:r.top-(wr?.top||0), isTop });
                      }}
                      style={{
                        position:"absolute", left:"50%", transform:"translateX(-50%)",
                        ...(isTop?{bottom:`calc(50% + ${off}px)`}:{top:`calc(50% + ${off}px)`}),
                        cursor:"pointer", zIndex:4,
                      }}
                    >
                      <div style={{
                        background:evCol, color:"#fff",
                        padding:"4px 10px 4px 8px", borderRadius:20,
                        fontSize:11, fontWeight:700,
                        boxShadow:`0 2px 8px ${evCol}40`,
                        display:"flex", alignItems:"center", gap:5,
                        whiteSpace:"nowrap", transition:"transform .12s",
                      }}
                        onMouseEnter={e=>e.currentTarget.style.transform="scale(1.07)"}
                        onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}
                      >
                        <span style={{ width:6,height:6,borderRadius:"50%",background:"rgba(255,255,255,.6)",flexShrink:0 }}/>
                        {ev.flag}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tooltip */}
      {tooltip&&(
        <div style={{
          position:"absolute",
          left:Math.min(tooltip.x, 260), top:tooltip.isTop?tooltip.y-8:tooltip.y+8,
          transform:`translateX(-50%) translateY(${tooltip.isTop?"-100%":"0%"})`,
          background:"#1C1C1E", color:"#fff",
          padding:"12px 14px", borderRadius:14,
          fontSize:12, lineHeight:1.7,
          boxShadow:"0 8px 28px rgba(0,0,0,.25)", zIndex:200,
          pointerEvents:"none", maxWidth:220, wordBreak:"break-word",
        }}>
          <div style={{ fontSize:10, color:"rgba(255,255,255,.5)", marginBottom:2 }}>{tooltip.entry.date}</div>
          <div style={{ fontWeight:700, color:getFlagColor(flags,tooltip.entry.flag), marginBottom:6 }}>
            {tooltip.entry.flag}
          </div>
          <div style={{ opacity:.9 }}>{tooltip.entry.context}</div>
        </div>
      )}

      {/* Legend */}
      <div style={{ display:"flex", gap:12, flexWrap:"wrap", padding:"8px 4px 0" }}>
        {[...new Set(filtered.map(e=>e.flag))].map(f=>(
          <div key={f} style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:T.sub }}>
            <span style={{ width:8,height:8,borderRadius:"50%",background:getFlagColor(flags,f),flexShrink:0 }}/>
            {f}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── VISUALIZATION ─────────────────────────────────────────────────────────────
function filterByDuration(entries, d) {
  const now = new Date();
  return entries.filter(e=>{
    const dt=new Date(e.date);
    if(d==="7d")    return (now-dt)/86400000<=7;
    if(d==="30d")   return (now-dt)/86400000<=30;
    if(d==="month") return dt.getMonth()===now.getMonth()&&dt.getFullYear()===now.getFullYear();
    return true;
  });
}
function buildChartData(entries, ff) {
  const base=ff==="all"?entries:entries.filter(e=>e.flag===ff);
  const m={};
  base.forEach(e=>{
    if(!m[e.date])m[e.date]={};
    m[e.date][e.flag]=(m[e.date][e.flag]||0)+1;
  });
  return Object.entries(m).sort(([a],[b])=>a.localeCompare(b)).map(([date,f])=>({date,...f}));
}

function VizPage({ flags, entries }) {
  const [flagFilter,setFlagFilter]=useState("all");
  const [duration,  setDuration]  =useState("all");
  const [chartType, setChartType] =useState("timeline");

  const df=useMemo(()=>filterByDuration(entries,duration),[entries,duration]);
  const cd=useMemo(()=>buildChartData(df,flagFilter),[df,flagFilter]);
  const af=flagFilter==="all"?[...new Set(df.map(e=>e.flag))]:[flagFilter];
  const total=df.filter(e=>flagFilter==="all"||e.flag===flagFilter).length;

  return (
    <Page>
      {/* Filters */}
      <Card>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {[
            {lbl:"플래그",   val:flagFilter,set:setFlagFilter,
              opts:[{v:"all",l:"전체 플래그"},...flags.map(f=>({v:f.name,l:f.name}))]},
            {lbl:"기간",     val:duration,  set:setDuration,
              opts:[{v:"7d",l:"최근 7일"},{v:"30d",l:"최근 30일"},{v:"month",l:"이번 달"},{v:"all",l:"전체"}]},
            {lbl:"차트 유형",val:chartType, set:setChartType,
              opts:[{v:"timeline",l:"🕐 타임라인"},{v:"bar",l:"📊 막대 차트"},{v:"line",l:"📈 라인 차트"}]},
          ].map(({lbl,val,set,opts})=>(
            <label key={lbl} style={labelWrap}>
              <span style={labelText}>{lbl}</span>
              <div style={{ position:"relative" }}>
                <select value={val} onChange={e=>set(e.target.value)}
                  style={{ ...inputS, paddingRight:30 }}>
                  {opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
                <span style={{ position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",pointerEvents:"none",fontSize:10,color:T.sub }}>▼</span>
              </div>
            </label>
          ))}
        </div>
      </Card>

      <StatRow stats={[
        {label:"기간 내 기록",value:total,color:T.accent},
        {label:"데이터 날짜", value:cd.length},
        {label:"플래그 수",   value:af.length},
      ]}/>

      <Card title={chartType==="timeline"?"타임라인":"차트"}>
        {chartType==="timeline"
          ? <Timeline entries={df} flags={flags} flagFilter={flagFilter}/>
          : (cd.length===0
              ? <Empty icon="📉">선택한 조건에 맞는 데이터가 없습니다.</Empty>
              : <div style={{width:"100%",height:260}}>
                  <ResponsiveContainer>
                    {chartType==="bar"
                      ? <BarChart data={cd} barCategoryGap="35%">
                          <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false}/>
                          <XAxis dataKey="date" tick={{fontSize:10,fill:"#AAA"}} tickLine={false} axisLine={false}/>
                          <YAxis allowDecimals={false} tick={{fontSize:10,fill:"#AAA"}} tickLine={false} axisLine={false} width={20}/>
                          <Tooltip contentStyle={{borderRadius:10,border:`1px solid ${T.border}`,fontSize:12}} cursor={{fill:"#F5F5F5"}}/>
                          <Legend iconType="circle" iconSize={7} wrapperStyle={{fontSize:12,paddingTop:10}}/>
                          {af.map(f=><Bar key={f} dataKey={f} fill={getFlagColor(flags,f)} radius={[4,4,0,0]}/>)}
                        </BarChart>
                      : <LineChart data={cd}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false}/>
                          <XAxis dataKey="date" tick={{fontSize:10,fill:"#AAA"}} tickLine={false} axisLine={false}/>
                          <YAxis allowDecimals={false} tick={{fontSize:10,fill:"#AAA"}} tickLine={false} axisLine={false} width={20}/>
                          <Tooltip contentStyle={{borderRadius:10,border:`1px solid ${T.border}`,fontSize:12}}/>
                          <Legend iconType="circle" iconSize={7} wrapperStyle={{fontSize:12,paddingTop:10}}/>
                          {af.map(f=>(
                            <Line key={f} type="monotone" dataKey={f} stroke={getFlagColor(flags,f)}
                              strokeWidth={2.5} dot={{r:4,strokeWidth:0,fill:getFlagColor(flags,f)}} activeDot={{r:6}}/>
                          ))}
                        </LineChart>
                    }
                  </ResponsiveContainer>
                </div>
          )
        }
      </Card>
    </Page>
  );
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [view,    setView]    = useState("input");
  const [flags,   setFlags]   = useLocal("ht_flags",   []);
  const [entries, setEntries] = useLocal("ht_entries", []);
  const [modal,   setModal]   = useState(false);
  const [toast,   setToast]   = useState(null);  // {msg, type}

  function showToast(msg, type="info") {
    setToast({msg,type});
    setTimeout(()=>setToast(null), 3000);
  }

  return (
    <div style={{
      minHeight:"100vh", background:T.bg,
      fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif",
      color:T.text,
    }}>
      <style>{`
        *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
        input:focus,select:focus,textarea:focus{
          outline:none;border-color:${T.accent}!important;
          box-shadow:0 0 0 3px rgba(99,102,241,.12);
        }
        button{transition:opacity .15s}
        button:active{opacity:.6}
        button:disabled{opacity:.35;cursor:not-allowed}
        @keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-5px)}40%,80%{transform:translateX(5px)}}
        @keyframes fadein{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideup{from{transform:translateY(100%)}to{transform:translateY(0)}}
        ::-webkit-scrollbar{height:3px;width:3px}
        ::-webkit-scrollbar-thumb{background:#DDD;border-radius:2px}
        select{-webkit-appearance:none}
      `}</style>

      <Header view={view}/>

      {view==="settings" && <SettingsPage flags={flags} setFlags={setFlags}/>}
      {view==="input"    && <InputPage    flags={flags} entries={entries} setEntries={setEntries}/>}
      {view==="viz"      && <VizPage      flags={flags} entries={entries}/>}

      <TabBar view={view} setView={setView} onDataPress={()=>setModal(true)}/>

      {modal && (
        <DataModal
          flags={flags} entries={entries}
          setFlags={setFlags} setEntries={setEntries}
          onClose={()=>setModal(false)}
          showToast={showToast}
        />
      )}

      <Toast msg={toast?.msg} type={toast?.type}/>
    </div>
  );
}
