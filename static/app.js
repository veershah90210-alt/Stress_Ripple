const $ = id => document.getElementById(id);

const positions = {
  B01:[110,120], B02:[255,70], B03:[430,85], B04:[170,270],
  B05:[325,230], B06:[535,190], B07:[95,420], B08:[315,405],
  B09:[675,95], B10:[585,380], B11:[710,250], B12:[690,455]
};

let state = null;

function stressColor(v){
  if(v < 35) return "#64d69b";
  if(v < 50) return "#f6c65f";
  return "#ff7382";
}

function riskCopy(n){
  const c=n.classification;
  if(c.includes("Vulnerable")) return ["Network-vulnerable","This borrower is not necessarily in trouble on their own. Their main risk comes from stressed connected members."];
  if(c.includes("Independent")) return ["Independent deterioration","The borrower's own debt burden or liquidity is the stronger signal. The problem is mainly internal, not contagious."];
  if(c.includes("Mixed")) return ["Mixed / high risk","Both direct financial weakness and network exposure are contributing. This borrower deserves priority attention."];
  if(c.includes("Contained")) return ["Contained stress","There is some pressure, but current network effects are limited. Monitor rather than overreact."];
  return ["Healthy","No major direct or network pressure is detected right now."];
}

/* ---------- Toasts ---------- */
function toast(message, type="info"){
  const host = $("toastHost");
  const el = document.createElement("div");
  el.className = "toast" + (type==="error" ? " error" : "");
  el.textContent = message;
  host.appendChild(el);
  setTimeout(()=>{
    el.classList.add("fade");
    setTimeout(()=>el.remove(), 320);
  }, 3200);
}

/* ---------- Network render ---------- */
function renderNetwork(data){
  const svg=$("network"), ns="http://www.w3.org/2000/svg";
  svg.innerHTML="";
  for(const e of data.edges){
    const [x1,y1]=positions[e.source], [x2,y2]=positions[e.target];
    const line=document.createElementNS(ns,"line");
    line.setAttribute("x1",x1);line.setAttribute("y1",y1);line.setAttribute("x2",x2);line.setAttribute("y2",y2);
    line.setAttribute("stroke-width",2+e.weight*5);line.setAttribute("class","edge");
    line.addEventListener("click",()=>{$("relationshipHint").textContent=`${e.source} ↔ ${e.target}: ${e.relationship} • connection strength ${Math.round(e.weight*100)}%`;});
    const title=document.createElementNS(ns,"title");
    title.textContent=`${e.source} ↔ ${e.target}: ${e.relationship}`;
    line.appendChild(title);
    svg.appendChild(line);
  }
  for(const n of data.nodes){
    const [x,y]=positions[n.id], r=15+n.stress*.22;
    const circle=document.createElementNS(ns,"circle");
    circle.setAttribute("cx",x);circle.setAttribute("cy",y);circle.setAttribute("r",r);
    circle.setAttribute("fill",stressColor(n.stress));
    circle.setAttribute("class","node"+(n.stress>=50?" high-risk":""));
    circle.setAttribute("tabindex","0");
    circle.setAttribute("role","button");
    circle.setAttribute("aria-label",`${n.id} ${n.name}, stress ${Math.round(n.stress)} percent`);
    circle.addEventListener("click",()=>focusBorrower(n.id,true));
    circle.addEventListener("keydown",(ev)=>{
      if(ev.key==="Enter"||ev.key===" "){ev.preventDefault();focusBorrower(n.id,true);}
    });
    const title=document.createElementNS(ns,"title");
    title.textContent=`${n.id} — ${n.name} • ${Math.round(n.stress)}% stress`;
    circle.appendChild(title);
    const text=document.createElementNS(ns,"text");
    text.setAttribute("x",x);text.setAttribute("y",y+4);text.setAttribute("text-anchor","middle");text.setAttribute("class","node-label");
    text.textContent=n.id;
    svg.append(circle,text);
  }
}

function renderRows(nodes){
  const high=nodes.filter(n=>n.stress>=50).map(n=>n.id);
  $("headline").textContent=high.length ? `${high.length} borrower(s) are crossing the high-risk line` : "The ripple is still mostly contained";
  $("subheadline").textContent=high.length ? "Now inspect whether those borrowers are failing on their own or being pulled by the network." : "That is the key question: a shock is not automatically a contagion event.";
}

function renderTimeline(history){
  const maxOverall=Math.max(...history.flatMap(h=>Object.values(h)));
  $("timeline").innerHTML=history.map((r,i)=>{
    const vals=Object.values(r),avg=vals.reduce((a,b)=>a+b,0)/vals.length;
    const high=vals.filter(x=>x>=50).length, pct=Math.max(6,avg/Math.max(maxOverall,1)*100);
    return `<div><div class="timeline-meta"><span>Round ${i}</span><span>${avg.toFixed(1)} avg stress • ${high} high-risk</span></div><div class="timeline-bar"><div class="timeline-fill" style="width:${pct}%;background:${stressColor(avg)}"></div></div></div>`;
  }).join("");
}

function populateSelects(nodes){
  const opts=nodes.map(n=>{
    const icon=n.stress>=50?"🔴":n.stress>=35?"🟡":"🟢";
    return `<option value="${n.id}">${icon} ${n.id} — ${n.name} (${Math.round(n.stress)}%)</option>`;
  }).join("");
  $("shock").innerHTML=opts;$("target").innerHTML=opts;
  $("shock").value=state?.shock||"B07";$("target").value=state?.shock||"B07";
  updateSelectorHints();
}

function updateSelectorHints(){
  if(!state)return;
  const map=Object.fromEntries(state.nodes.map(n=>[n.id,n]));
  const s=map[$("shock").value],t=map[$("target").value];
  if(s)$("shockHint").textContent=`${s.id} ${s.name} • ${riskCopy(s)[0]} • ${Math.round(s.stress)}% stress`;
  if(t)$("targetHint").textContent=`${t.id} ${t.name} • ${riskCopy(t)[0]} • ${Math.round(t.stress)}% stress`;
  if(s)focusBorrower(s.id,false);
}

function focusBorrower(id, sync){
  if(!state)return;
  const n=state.nodes.find(x=>x.id===id); if(!n)return;
  $("focusTitle").textContent=`${n.id} — ${n.name}`;
  $("focusMeter").style.width=`${Math.min(100,n.stress)}%`;
  $("focusMeter").style.background=stressColor(n.stress);
  $("focusOwn").textContent=Math.round(n.own_pressure)+"%";
  $("focusNetwork").textContent=Math.round(n.network_pressure)+"%";
  const [title,desc]=riskCopy(n);
  $("focusDiagnosis").textContent=title;
  $("focusDiagnosis").style.background=n.stress>=50?"#48232a":n.stress>=35?"#4a3b1d":"#173425";
  $("focusDiagnosis").style.color=n.stress>=50?"#ffb0b9":n.stress>=35?"#f8d576":"#80e4ad";
  $("focusExplanation").textContent=n.explanation+" "+desc;
  document.querySelectorAll(".node").forEach(el=>el.classList.remove("selected"));
  const idx=Object.keys(positions).indexOf(id);
  const candidate=document.querySelectorAll(".node")[idx]; if(candidate)candidate.classList.add("selected");
  if(sync){$("shock").value=id;$("target").value=id;updateSelectorHints();}
}

function updateStats(nodes,history){
  $("highRisk").textContent=nodes.filter(n=>n.stress>=50).length;
  $("networkRisk").textContent=nodes.filter(n=>n.classification.includes("Vulnerable")).length;
  $("avgStress").textContent=(nodes.reduce((a,n)=>a+n.stress,0)/nodes.length).toFixed(1);
  let peak={i:0,avg:-1}; history.forEach((h,i)=>{const a=Object.values(h).reduce((x,y)=>x+y,0)/Object.keys(h).length;if(a>peak.avg)peak={i,avg:a};});
  $("peakRound").textContent=peak.i;
}

function markStorybarStep(step){
  document.querySelectorAll("#storybar .step").forEach(el=>{
    el.classList.toggle("active", Number(el.dataset.step) <= step);
  });
}

function render(data){
  state=data;
  renderNetwork(data);renderRows(data.nodes);renderTimeline(data.history);updateStats(data.nodes,data.history);
  populateSelects(data.nodes);
  focusBorrower(data.shock,false);
  markStorybarStep(3);
}

function setBusy(button, busy, busyLabel){
  if(!button) return;
  // The default label is captured once, up front, and stored on the element.
  // Reading "current text" while busy (the old approach) is what caused the
  // button to get stuck: if two runs overlapped, the second one could capture
  // "Simulating…" itself as the label to restore to.
  if(!button.dataset.defaultLabel){
    button.dataset.defaultLabel = button.querySelector(".btn-label")?.textContent || button.textContent;
  }
  const label = button.querySelector(".btn-label");
  if(busy){
    if(label) label.textContent = busyLabel; else button.textContent = busyLabel;
    button.disabled = true;
  } else {
    if(label) label.textContent = button.dataset.defaultLabel; else button.textContent = button.dataset.defaultLabel;
    button.disabled = false;
  }
}

// Token guards: if a newer run()/intervention() call starts before an older
// one's fetch resolves, the older call becomes stale and must not touch the
// UI when it finally finishes — otherwise it can leave the button/spinner
// stuck showing "busy" forever, which is what "keeps loading" looked like.
let runToken = 0;
let interventionToken = 0;

async function run(){
  const myToken = ++runToken;
  const btn=$("run");
  setBusy(btn, true, "Simulating…");
  $("graphLoading").hidden = false;
  const controller = new AbortController();
  const timeout = setTimeout(()=>controller.abort(), 8000); // never let this hang forever
  try{
    const p=new URLSearchParams({shock:$("shock").value,size:$("shockSize").value,rounds:$("rounds").value});
    const res=await fetch(`/api/state?${p}`, { signal: controller.signal });
    if(myToken !== runToken) return; // superseded by a newer request
    if(!res.ok) throw new Error("Request failed");
    render(await res.json());
    if(myToken !== runToken) return;
    toast(`Ripple simulated for ${$("rounds").value} round(s).`);
  }catch(err){
    if(myToken === runToken){
      const msg = err?.name === "AbortError"
        ? "The simulation took too long and was cancelled. Check the server is running and try again."
        : "Could not run the simulation. Check the server and try again.";
      toast(msg, "error");
    }
  }finally{
    clearTimeout(timeout);
    if(myToken === runToken){
      setBusy(btn, false);
      $("graphLoading").hidden = true;
    }
  }
}

async function intervention(){
  const myToken = ++interventionToken;
  const btn=$("intervene");
  setBusy(btn, true, "Comparing…");
  const controller = new AbortController();
  const timeout = setTimeout(()=>controller.abort(), 8000);
  try{
    const res=await fetch("/api/intervention",{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({target:$("target").value,action:$("action").value}), signal: controller.signal});
    if(myToken !== interventionToken) return;
    if(!res.ok) throw new Error("Request failed");
    const x=await res.json();
    if(myToken !== interventionToken) return;
    const saved=Math.max(0,x.affected_before-x.affected_after);
    $("interventionResult").classList.remove("empty");
    $("interventionResult").innerHTML=`<b>${x.target}</b> → ${x.action_label||x.action.replace("_"," ")}<br>
    High-risk before: <b>${x.affected_before}</b> • after: <b>${x.affected_after}</b><br>
    <span style="color:#74e0ca">Estimated cascade reduction: ${saved} borrower(s)</span>`;
    markStorybarStep(4);
    toast(saved > 0 ? `That intervention pulls ${saved} borrower(s) back from high risk.` : "That intervention didn't change the high-risk count this time — try a different action.");
  }catch(err){
    if(myToken === interventionToken){
      const msg = err?.name === "AbortError"
        ? "The comparison took too long and was cancelled. Check the server is running and try again."
        : "Could not compare the intervention. Check the server and try again.";
      toast(msg, "error");
    }
  }finally{
    clearTimeout(timeout);
    if(myToken === interventionToken) setBusy(btn, false);
  }
}

$("shockSize").addEventListener("input",()=>{$("shockValue").textContent=$("shockSize").value});
$("run").addEventListener("click",run);
$("shock").addEventListener("change",()=>{updateSelectorHints();markStorybarStep(2);run()});
$("target").addEventListener("change",updateSelectorHints);
$("intervene").addEventListener("click",intervention);
$("highRiskOnly").addEventListener("click",()=>{
  if(!state)return;
  const risky=state.nodes.filter(n=>n.stress>=50);
  if(!risky.length){$("targetHint").textContent="No borrower is above the high-risk threshold. Increase the shock and run again.";return;}
  $("target").innerHTML=risky.map(n=>`<option value="${n.id}">🔴 ${n.id} — ${n.name} (${Math.round(n.stress)}%)</option>`).join("");
  $("target").value=risky[0].id;updateSelectorHints();
});

/* ---------- Info-dot tooltips (touch + mouse + keyboard) ---------- */
(function initInfoDots(){
  const host = $("tipHost");
  function show(el){
    const tip = el.dataset.tip;
    if(!tip) return;
    host.textContent = tip;
    host.hidden = false;
    const r = el.getBoundingClientRect();
    const top = r.bottom + 8;
    let left = r.left;
    const maxLeft = window.innerWidth - 250;
    if(left > maxLeft) left = maxLeft;
    host.style.top = `${top}px`;
    host.style.left = `${Math.max(8,left)}px`;
  }
  function hide(){ host.hidden = true; }
  document.addEventListener("mouseover", e=>{
    if(e.target.classList?.contains("info-dot")) show(e.target);
  });
  document.addEventListener("mouseout", e=>{
    if(e.target.classList?.contains("info-dot")) hide();
  });
  document.addEventListener("focusin", e=>{
    if(e.target.classList?.contains("info-dot")) show(e.target);
  });
  document.addEventListener("focusout", e=>{
    if(e.target.classList?.contains("info-dot")) hide();
  });
  document.addEventListener("click", e=>{
    if(e.target.classList?.contains("info-dot")){ e.preventDefault(); show(e.target); setTimeout(hide, 3500); }
  });
})();

/* ---------- Guided tour ---------- */
(function initTour(){
  const steps = [
    { target: "#controlsPanel", title: "Start here: pick a spark", body: "Choose which borrower feels the first shock, and drag the slider to decide how big it is. Everything else in the app reacts to this choice." },
    { target: "#run", title: "Run the simulation", body: "Create ripple runs the shock forward for several rounds, letting stress spill over into connected borrowers before naturally decaying." },
    { target: "#graphPanel", title: "Read the network map", body: "Each circle is a borrower — size and color show stress. Line thickness shows how strong a connection is. Click any node or edge to inspect it." },
    { target: "#focusPanel", title: "Separate cause from symptom", body: "This panel is the key idea: it splits a borrower's own finances from pressure arriving through their network, so you don't blame the wrong person." },
    { target: "#chartPanel", title: "Watch the ripple rise and fall", body: "Stress is damped each round, so a shock can spread for a while and then die out — the timeline shows exactly when it peaked." },
    { target: "#interventionPanel", title: "Test a fix before you commit", body: "Pick a target and an action, then compare how many borrowers are pulled back below the high-risk line. Small, targeted help can stop the whole cascade." }
  ];
  let i = 0;
  const overlay = $("tourOverlay"), spotlight = $("tourSpotlight"), card = $("tourCard");
  const SEEN_KEY = "rippleTutorialSeen";

  function place(){
    const step = steps[i];
    const el = document.querySelector(step.target);
    if(!el){ next(); return; }
    const r = el.getBoundingClientRect();
    const pad = 10;
    spotlight.style.top = `${r.top - pad}px`;
    spotlight.style.left = `${r.left - pad}px`;
    spotlight.style.width = `${r.width + pad*2}px`;
    spotlight.style.height = `${r.height + pad*2}px`;

    $("tourStepNum").textContent = i+1;
    $("tourStepTotal").textContent = steps.length;
    $("tourTitle").textContent = step.title;
    $("tourBody").textContent = step.body;
    $("tourBack").disabled = i === 0;
    $("tourNext").querySelector ? null : null;
    $("tourNext").textContent = i === steps.length-1 ? "Finish" : "Next";

    // position card near the element, keeping it on-screen
    const cardWidth = 300;
    let top = r.bottom + 18;
    let left = r.left;
    if(top + 220 > window.innerHeight) top = Math.max(14, r.top - 230);
    if(left + cardWidth > window.innerWidth - 14) left = window.innerWidth - cardWidth - 14;
    if(left < 14) left = 14;
    card.style.top = `${top}px`;
    card.style.left = `${left}px`;

    el.scrollIntoView({block:"center", behavior:"smooth"});
  }

  function open(){
    i = 0;
    overlay.hidden = false;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(place);
  }
  function close(){
    overlay.hidden = true;
    document.body.style.overflow = "";
    localStorage.setItem(SEEN_KEY, "1");
  }
  function next(){
    if(i >= steps.length-1){ close(); return; }
    i++; place();
  }
  function back(){
    if(i <= 0) return;
    i--; place();
  }

  $("startTour").addEventListener("click", open);
  $("replayTour").addEventListener("click", open);
  $("helpFab").addEventListener("click", open);
  $("tourNext").addEventListener("click", next);
  $("tourBack").addEventListener("click", back);
  $("tourSkip").addEventListener("click", close);
  window.addEventListener("resize", ()=>{ if(!overlay.hidden) place(); });
  document.addEventListener("keydown", e=>{
    if(overlay.hidden) return;
    if(e.key === "Escape") close();
    if(e.key === "ArrowRight") next();
    if(e.key === "ArrowLeft") back();
  });

  if(!localStorage.getItem(SEEN_KEY)){
    setTimeout(open, 500);
  }
})();

run();
