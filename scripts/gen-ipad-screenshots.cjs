const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const W = 2048, H = 2732; // iPad Pro 13" (M4) / 12.9" Gen 3+
const OUT = path.join(__dirname, '../screenshots/ipad');
fs.mkdirSync(OUT, { recursive: true });

const screens = [
  { name: '1-patients', html: `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>*{margin:0;padding:0;box-sizing:border-box;font-family:'Inter',sans-serif}
body{background:#0f172a;color:#f8fafc;width:${W}px;height:${H}px;overflow:hidden}
.status{height:54px;background:#0f172a;display:flex;align-items:center;justify-content:space-between;padding:0 60px;font-size:32px;font-weight:600}
.topbar{background:#1e293b;padding:48px 60px 36px;border-bottom:1px solid #334155}
.topbar h1{font-size:64px;font-weight:700;color:#f8fafc;margin-bottom:10px}
.topbar p{font-size:34px;color:#94a3b8}
.search{background:#0f172a;border:1px solid #334155;border-radius:24px;padding:34px 48px;margin:40px 60px 0;display:flex;align-items:center;gap:28px;font-size:36px;color:#64748b}
.tabs{display:flex;gap:0;padding:0 60px;background:#1e293b;border-bottom:1px solid #334155}
.tab{padding:40px 48px;font-size:34px;font-weight:500;color:#64748b;border-bottom:3px solid transparent}
.tab.active{color:#3b82f6;border-bottom-color:#3b82f6}
.list{padding:0 60px;overflow:hidden}
.card{background:#1e293b;border-radius:28px;padding:48px;margin-bottom:28px;border:1px solid #334155;display:flex;align-items:flex-start;gap:40px}
.avatar{width:104px;height:104px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:40px;font-weight:700;flex-shrink:0}
.info{flex:1}
.name{font-size:42px;font-weight:600;color:#f8fafc;margin-bottom:10px}
.meta{font-size:32px;color:#94a3b8;margin-bottom:20px}
.badges{display:flex;gap:14px;flex-wrap:wrap}
.badge{padding:10px 24px;border-radius:999px;font-size:28px;font-weight:500}
.crit{background:#7f1d1d;color:#fca5a5}
.high{background:#7c2d12;color:#fdba74}
.norm{background:#14532d;color:#86efac}
.tag{background:#1e3a8a;color:#93c5fd}
.bed{font-size:30px;color:#64748b;margin-top:10px}
</style></head><body>
<div class="status">9:41 <span style="display:flex;gap:16px;align-items:center"><span>▋▋▋▋</span><span>WiFi</span><span>🔋</span></span></div>
<div class="topbar"><h1>Ward Patients</h1><p>Sunday, 16 March 2026</p></div>
<div class="search">🔍 &nbsp; Search patients...</div>
<div class="tabs" style="margin-top:8px">
  <div class="tab active">All (12)</div>
  <div class="tab">Critical (2)</div>
  <div class="tab">My Patients (6)</div>
</div>
<div class="list" style="padding-top:40px">
  <div class="card">
    <div class="avatar" style="background:#1e3a8a">AK</div>
    <div class="info">
      <div class="name">Ahmed Al-Khalidi</div>
      <div class="meta">M · 67 yrs · MRN 20241089</div>
      <div class="badges"><span class="badge crit">Critical</span><span class="badge tag">Cardiology</span></div>
      <div class="bed">Bed 4A · Admitted 14 Mar</div>
    </div>
    <span style="color:#ef4444;font-size:40px">⚠</span>
  </div>
  <div class="card">
    <div class="avatar" style="background:#14532d">FN</div>
    <div class="info">
      <div class="name">Fatima Al-Nasser</div>
      <div class="meta">F · 45 yrs · MRN 20241102</div>
      <div class="badges"><span class="badge high">High</span><span class="badge tag">Respiratory</span></div>
      <div class="bed">Bed 6B · Admitted 15 Mar</div>
    </div>
  </div>
  <div class="card">
    <div class="avatar" style="background:#4c1d95">MY</div>
    <div class="info">
      <div class="name">Mohammed Al-Yaqoubi</div>
      <div class="meta">M · 52 yrs · MRN 20241098</div>
      <div class="badges"><span class="badge norm">Stable</span><span class="badge tag">Gastro</span></div>
      <div class="bed">Bed 9C · Admitted 12 Mar</div>
    </div>
  </div>
  <div class="card">
    <div class="avatar" style="background:#7c2d12">SR</div>
    <div class="info">
      <div class="name">Sara Al-Rashidi</div>
      <div class="meta">F · 38 yrs · MRN 20241115</div>
      <div class="badges"><span class="badge norm">Stable</span><span class="badge tag">Nephrology</span></div>
      <div class="bed">Bed 2A · Admitted 16 Mar</div>
    </div>
  </div>
  <div class="card">
    <div class="avatar" style="background:#1e3a8a">HM</div>
    <div class="info">
      <div class="name">Hassan Al-Mutairi</div>
      <div class="meta">M · 71 yrs · MRN 20241077</div>
      <div class="badges"><span class="badge high">High</span><span class="badge tag">Neurology</span></div>
      <div class="bed">Bed 11D · Admitted 13 Mar</div>
    </div>
  </div>
</div>
</body></html>` },

  { name: '2-patient-detail', html: `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>*{margin:0;padding:0;box-sizing:border-box;font-family:'Inter',sans-serif}
body{background:#0f172a;color:#f8fafc;width:${W}px;height:${H}px;overflow:hidden}
.status{height:54px;background:#0f172a;display:flex;align-items:center;justify-content:space-between;padding:0 60px;font-size:32px;font-weight:600}
.header{background:linear-gradient(135deg,#1e3a8a,#1d4ed8);padding:60px;padding-top:40px}
.back{font-size:34px;color:#93c5fd;margin-bottom:28px}
.pt-name{font-size:68px;font-weight:700;margin-bottom:14px}
.pt-meta{font-size:34px;color:#bfdbfe;margin-bottom:28px}
.vitals{display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;margin-top:28px}
.vital{background:rgba(255,255,255,0.12);border-radius:20px;padding:28px 32px}
.vl{font-size:28px;color:#bfdbfe;margin-bottom:8px}
.vv{font-size:44px;font-weight:700}
.tabs{display:flex;gap:0;background:#1e293b;border-bottom:1px solid #334155}
.tab{padding:36px 40px;font-size:32px;font-weight:500;color:#64748b;border-bottom:3px solid transparent}
.tab.active{color:#3b82f6;border-bottom-color:#3b82f6}
.section{padding:48px 60px}
.sh{font-size:36px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:2px;margin-bottom:28px}
.card{background:#1e293b;border-radius:24px;padding:44px;border:1px solid #334155;margin-bottom:28px}
.cv{font-size:32px;color:#94a3b8;line-height:1.6}
.chip{display:inline-block;padding:10px 24px;border-radius:999px;font-size:28px;background:#1e3a8a;color:#93c5fd;margin:8px 8px 0 0}
</style></head><body>
<div class="status">9:41 <span style="display:flex;gap:16px;align-items:center"><span>▋▋▋▋</span><span>WiFi</span><span>🔋</span></span></div>
<div class="header">
  <div class="back">← Ward Patients</div>
  <div class="pt-name">Ahmed Al-Khalidi</div>
  <div class="pt-meta">Male · 67 yrs · MRN 20241089 · Bed 4A</div>
  <div class="vitals">
    <div class="vital"><div class="vl">HR</div><div class="vv" style="color:#ef4444">118 bpm</div></div>
    <div class="vital"><div class="vl">BP</div><div class="vv" style="color:#f97316">158/94</div></div>
    <div class="vital"><div class="vl">SpO₂</div><div class="vv" style="color:#22c55e">97%</div></div>
    <div class="vital"><div class="vl">Temp</div><div class="vv">38.2°C</div></div>
    <div class="vital"><div class="vl">RR</div><div class="vv">22/min</div></div>
    <div class="vital"><div class="vl">GCS</div><div class="vv">15/15</div></div>
  </div>
</div>
<div class="tabs">
  <div class="tab active">Overview</div>
  <div class="tab">History</div>
  <div class="tab">Labs</div>
  <div class="tab">Notes</div>
  <div class="tab">Tasks</div>
</div>
<div class="section">
  <div class="sh">Presenting Complaint</div>
  <div class="card"><div class="cv">Chest pain radiating to left arm, onset 6 hours ago. Associated with diaphoresis and shortness of breath. No similar episodes previously.</div></div>
  <div class="sh" style="margin-top:8px">Known Conditions</div>
  <div class="card">
    <div class="chip">T2 Diabetes Mellitus</div>
    <div class="chip">Hypertension</div>
    <div class="chip">Hyperlipidaemia</div>
    <div class="chip">Ex-smoker</div>
  </div>
  <div class="sh" style="margin-top:40px">Current Medications</div>
  <div class="card">
    <div style="display:grid;gap:20px">
      <div style="display:flex;justify-content:space-between"><span style="font-size:34px;color:#f8fafc">Metformin 1g</span><span style="font-size:32px;color:#94a3b8">BD oral</span></div>
      <div style="display:flex;justify-content:space-between"><span style="font-size:34px;color:#f8fafc">Amlodipine 10mg</span><span style="font-size:32px;color:#94a3b8">OD oral</span></div>
      <div style="display:flex;justify-content:space-between"><span style="font-size:34px;color:#f8fafc">Atorvastatin 40mg</span><span style="font-size:32px;color:#94a3b8">ON oral</span></div>
    </div>
  </div>
</div>
</body></html>` },

  { name: '3-labs', html: `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>*{margin:0;padding:0;box-sizing:border-box;font-family:'Inter',sans-serif}
body{background:#0f172a;color:#f8fafc;width:${W}px;height:${H}px;overflow:hidden}
.status{height:54px;background:#0f172a;display:flex;align-items:center;justify-content:space-between;padding:0 60px;font-size:32px;font-weight:600}
.topbar{background:#1e293b;padding:44px 60px;border-bottom:1px solid #334155;display:flex;align-items:center;justify-content:space-between}
.topbar h1{font-size:58px;font-weight:700}
.scan-btn{background:#3b82f6;color:white;border:none;border-radius:20px;padding:26px 44px;font-size:32px;font-weight:600}
.panel{margin:40px 60px;background:#1e293b;border-radius:28px;border:1px solid #334155;overflow:hidden}
.panel-h{padding:40px 48px;border-bottom:1px solid #334155;display:flex;align-items:center;justify-content:space-between}
.panel-title{font-size:40px;font-weight:600}
.panel-date{font-size:30px;color:#64748b}
.ai-box{background:#0f172a;border-left:5px solid #3b82f6;margin:28px 48px;padding:34px;border-radius:0 14px 14px 0}
.ai-title{font-size:30px;color:#93c5fd;font-weight:600;margin-bottom:14px}
.ai-text{font-size:30px;color:#94a3b8;line-height:1.6}
.row{display:flex;align-items:center;padding:30px 48px;border-bottom:1px solid #1e293b}
.rname{flex:1;font-size:34px;color:#f8fafc}
.rval{font-size:34px;font-weight:600;margin-right:28px}
.rref{font-size:28px;color:#64748b}
.hi{color:#ef4444}
.lo{color:#3b82f6}
.ok{color:#22c55e}
</style></head><body>
<div class="status">9:41 <span style="display:flex;gap:16px;align-items:center"><span>▋▋▋▋</span><span>WiFi</span><span>🔋</span></span></div>
<div class="topbar"><div><h1>Lab Results</h1><p style="font-size:32px;color:#94a3b8;margin-top:8px">Ahmed Al-Khalidi</p></div><button class="scan-btn">📷 Scan Labs</button></div>
<div class="panel">
  <div class="panel-h"><span class="panel-title">Cardiac Panel</span><span class="panel-date">16 Mar 2026 · 06:30</span></div>
  <div class="ai-box">
    <div class="ai-title">🤖 AI Analysis</div>
    <div class="ai-text">Elevated troponin I at 2.8 µg/L strongly suggests myocardial injury. Combined with ECG changes and clinical presentation, NSTEMI is highly probable. Urgent cardiology review recommended.</div>
  </div>
  <div class="row"><span class="rname">Troponin I</span><span class="rval hi">2.8 µg/L ↑</span><span class="rref">&lt;0.04</span></div>
  <div class="row"><span class="rname">CK-MB</span><span class="rval hi">42 U/L ↑</span><span class="rref">0–25</span></div>
  <div class="row"><span class="rname">BNP</span><span class="rval hi">380 pg/mL ↑</span><span class="rref">&lt;100</span></div>
  <div class="row"><span class="rname">D-Dimer</span><span class="rval ok">0.4 mg/L</span><span class="rref">&lt;0.5</span></div>
</div>
<div class="panel">
  <div class="panel-h"><span class="panel-title">Full Blood Count</span><span class="panel-date">16 Mar 2026 · 06:30</span></div>
  <div class="row"><span class="rname">Haemoglobin</span><span class="rval lo">10.8 g/dL ↓</span><span class="rref">13.5–17.5</span></div>
  <div class="row"><span class="rname">WBC</span><span class="rval hi">13.2 ×10⁹/L ↑</span><span class="rref">4.0–11.0</span></div>
  <div class="row"><span class="rname">Platelets</span><span class="rval ok">224 ×10⁹/L</span><span class="rref">150–400</span></div>
</div>
</body></html>` },

  { name: '4-tasks', html: `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>*{margin:0;padding:0;box-sizing:border-box;font-family:'Inter',sans-serif}
body{background:#0f172a;color:#f8fafc;width:${W}px;height:${H}px;overflow:hidden}
.status{height:54px;background:#0f172a;display:flex;align-items:center;justify-content:space-between;padding:0 60px;font-size:32px;font-weight:600}
.topbar{background:#1e293b;padding:44px 60px;border-bottom:1px solid #334155;display:flex;align-items:center;justify-content:space-between}
.topbar h1{font-size:58px;font-weight:700}
.add-btn{background:#3b82f6;color:white;border:none;border-radius:50%;width:96px;height:96px;font-size:56px;display:flex;align-items:center;justify-content:center}
.filter{display:flex;gap:20px;padding:36px 60px;background:#1e293b;border-bottom:1px solid #334155}
.fc{padding:20px 36px;border-radius:999px;font-size:30px;font-weight:500}
.fc.active{background:#1e3a8a;color:#93c5fd}
.fc:not(.active){background:#0f172a;color:#64748b}
.task{margin:28px 60px;background:#1e293b;border-radius:24px;padding:44px;border:1px solid #334155;border-left:7px solid}
.tc{font-size:38px;font-weight:600;color:#f8fafc;margin-bottom:14px}
.tp{font-size:31px;color:#94a3b8;margin-bottom:24px}
.task-meta{display:flex;align-items:center;justify-content:space-between}
.avatar-sm{width:64px;height:64px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:700;background:#1e3a8a;color:#93c5fd}
.ttime{font-size:28px;color:#64748b}
.tbadge{padding:10px 24px;border-radius:999px;font-size:28px;font-weight:500}
</style></head><body>
<div class="status">9:41 <span style="display:flex;gap:16px;align-items:center"><span>▋▋▋▋</span><span>WiFi</span><span>🔋</span></span></div>
<div class="topbar"><div><h1>Tasks</h1><p style="font-size:32px;color:#94a3b8;margin-top:8px">8 pending · 3 urgent</p></div><div class="add-btn">+</div></div>
<div class="filter">
  <div class="fc active">All (8)</div>
  <div class="fc">Urgent (3)</div>
  <div class="fc">Mine (5)</div>
  <div class="fc">Done</div>
</div>
<div class="task" style="border-left-color:#ef4444">
  <div class="tc">Urgent ECG — Ahmed Al-Khalidi</div>
  <div class="tp">Repeat ECG post troponin result. Compare with admission ECG for ST changes.</div>
  <div class="task-meta"><div style="display:flex;align-items:center;gap:20px"><div class="avatar-sm">BA</div><span style="font-size:30px;color:#94a3b8">Dr. Bader</span></div><span class="tbadge" style="background:#7f1d1d;color:#fca5a5">Urgent</span><div class="ttime">09:45</div></div>
</div>
<div class="task" style="border-left-color:#f97316">
  <div class="tc">Cardiology Referral — Ahmed Al-Khalidi</div>
  <div class="tp">Refer to cardiology for NSTEMI management. Include troponin trend and ECG findings.</div>
  <div class="task-meta"><div style="display:flex;align-items:center;gap:20px"><div class="avatar-sm">BA</div><span style="font-size:30px;color:#94a3b8">Dr. Bader</span></div><span class="tbadge" style="background:#7c2d12;color:#fdba74">High</span><div class="ttime">10:00</div></div>
</div>
<div class="task" style="border-left-color:#3b82f6">
  <div class="tc">Fluid Review — Fatima Al-Nasser</div>
  <div class="tp">Review fluid balance. Patient on IV fluids since admission. Check urine output and adjust rate.</div>
  <div class="task-meta"><div style="display:flex;align-items:center;gap:20px"><div class="avatar-sm">NA</div><span style="font-size:30px;color:#94a3b8">Dr. Noura</span></div><span class="tbadge" style="background:#1e3a8a;color:#93c5fd">Routine</span><div class="ttime">11:00</div></div>
</div>
<div class="task" style="border-left-color:#f97316">
  <div class="tc">Repeat Cultures — Hassan Al-Mutairi</div>
  <div class="tp">Blood cultures x2 peripherally. Urine C&S. Patient spiked 38.8°C at 07:00.</div>
  <div class="task-meta"><div style="display:flex;align-items:center;gap:20px"><div class="avatar-sm">BA</div><span style="font-size:30px;color:#94a3b8">Dr. Bader</span></div><span class="tbadge" style="background:#7c2d12;color:#fdba74">High</span><div class="ttime">10:30</div></div>
</div>
</body></html>` },

  { name: '5-handover', html: `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>*{margin:0;padding:0;box-sizing:border-box;font-family:'Inter',sans-serif}
body{background:#0f172a;color:#f8fafc;width:${W}px;height:${H}px;overflow:hidden}
.status{height:54px;background:#0f172a;display:flex;align-items:center;justify-content:space-between;padding:0 60px;font-size:32px;font-weight:600}
.topbar{background:linear-gradient(135deg,#134e4a,#0f766e);padding:60px;padding-top:40px}
.topbar h1{font-size:64px;font-weight:700;margin-bottom:14px}
.topbar p{font-size:34px;color:#99f6e4}
.gen-btn{background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.3);color:white;border-radius:20px;padding:26px 44px;font-size:32px;font-weight:600;margin-top:32px;display:inline-block}
.section{padding:44px 60px}
.sh{font-size:34px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:2px;margin-bottom:24px}
.sbar-card{background:#1e293b;border-radius:24px;border:1px solid #334155;overflow:hidden;margin-bottom:32px}
.sbar-h{padding:36px 44px;background:#134e4a;border-bottom:1px solid #334155;display:flex;align-items:center;justify-content:space-between}
.sbar-pt{font-size:38px;font-weight:600}
.sbar-badge{padding:10px 24px;border-radius:999px;font-size:28px;background:rgba(255,255,255,0.15);color:#99f6e4}
.sbar-body{padding:36px 44px}
.sbar-row{margin-bottom:24px}
.sbar-label{font-size:28px;color:#0d9488;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px}
.sbar-text{font-size:32px;color:#f8fafc;line-height:1.5}
.oncall{background:#1e293b;border-radius:24px;border:1px solid #334155;padding:40px 44px;margin-bottom:28px;display:flex;align-items:center;justify-content:space-between}
.oc-name{font-size:40px;font-weight:600;margin-bottom:10px}
.oc-role{font-size:32px;color:#94a3b8}
.oc-time{font-size:30px;color:#0d9488}
</style></head><body>
<div class="status">9:41 <span style="display:flex;gap:16px;align-items:center"><span>▋▋▋▋</span><span>WiFi</span><span>🔋</span></span></div>
<div class="topbar">
  <div style="font-size:32px;color:#99f6e4;margin-bottom:20px">← Back</div>
  <h1>Handover & On-Call</h1>
  <p>AI-generated SBAR handover for all ward patients</p>
  <div class="gen-btn">🤖 Generate Handover</div>
</div>
<div class="section">
  <div class="sh">SBAR Handover</div>
  <div class="sbar-card">
    <div class="sbar-h"><span class="sbar-pt">Ahmed Al-Khalidi · Bed 4A</span><span class="sbar-badge">Critical</span></div>
    <div class="sbar-body">
      <div class="sbar-row"><div class="sbar-label">Situation</div><div class="sbar-text">67M admitted with chest pain, elevated troponin I 2.8 µg/L. Working diagnosis NSTEMI.</div></div>
      <div class="sbar-row"><div class="sbar-label">Background</div><div class="sbar-text">T2DM, HTN, hyperlipidaemia. No prior cardiac history.</div></div>
      <div class="sbar-row"><div class="sbar-label">Assessment</div><div class="sbar-text">Haemodynamically stable. HR 118, BP 158/94. ECG: ST depression V4–V6.</div></div>
      <div class="sbar-row"><div class="sbar-label">Recommendation</div><div class="sbar-text">Urgent cardiology review. Load aspirin + heparin. Serial troponins q6h.</div></div>
    </div>
  </div>
  <div class="sh">On-Call Tonight</div>
  <div class="oncall">
    <div><div class="oc-name">Dr. Noura Al-Sabah</div><div class="oc-role">Senior Resident · Internal Medicine</div></div>
    <div class="oc-time">20:00 – 08:00</div>
  </div>
  <div class="oncall">
    <div><div class="oc-name">Dr. Faisal Al-Enezi</div><div class="oc-role">Intern · Cardiology</div></div>
    <div class="oc-time">20:00 – 08:00</div>
  </div>
</div>
</body></html>` }
];

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });

  for (const s of screens) {
    console.log(`Generating ${s.name}...`);
    await page.setContent(s.html, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.screenshot({ path: require('path').join(OUT, `${s.name}.png`), type: 'png' });
    console.log(`  ✅ ${s.name}.png`);
  }

  await browser.close();
  console.log('\nAll iPad screenshots saved to screenshots/ipad/');
})();
