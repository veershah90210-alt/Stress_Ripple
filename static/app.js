
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

function renderNetwork(data){
  const svg=$("network"), ns="http://www.w3.org/2000/svg";
  svg.innerHTML="";
  for(const e of data.edges){
    const [x1,y1]=positions[e.source], [x2,y2]=positions[e.target];
    const line=document.createElementNS(ns,"line");
    line.setAttribute("x1",x1);line.setAttribute("y1",y1);line.setAttribute("x2",x2);line.setAttribute("y2",y2);
    line.setAttribute("stroke-width",2+e.weight*5);line.setAttribute("class","edge");
    line.addEventListener("click",()=>{$("relationshipHint").textContent=`${e.source} ↔ ${e.target}: ${e.relationship} • connection strength ${Math.round(e.weight*100)}%`;});
    svg.appendChild(line);
  }
  for(const n of data.nodes){
    const [x,y]=positions[n.id], r=15+n.stress*.22;
    const circle=document.createElementNS(ns,"circle");
    circle.setAttribute("cx",x);circle.setAttribute("cy",y);circle.setAttribute("r",r);
    circle.setAttribute("fill",stressColor(n.stress));
    circle.setAttribute("class","node"+(n.stress>=50?" high-risk":""));
    circle.addEventListener("click",()=>focusBorrower(n.id,true));
    const text=document.createElementNS(ns,"text");
    text.setAttribute("x",x);text.setAttribute("y",y+4);text.setAttribute("text-anchor","middle");text.setAttribute("class","node-label");
    text.textContent=n.id;
    svg.append(circle,text);
  }
}

function renderRows(nodes){
  // Kept simple: the focus card replaces a dense table on purpose.
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

function render(data){
  state=data;
  renderNetwork(data);renderRows(data.nodes);renderTimeline(data.history);updateStats(data.nodes,data.history);
  populateSelects(data.nodes);
  focusBorrower(data.shock,false);
}

async function run(){
  const p=new URLSearchParams({shock:$("shock").value,size:$("shockSize").value,rounds:$("rounds").value});
  const res=await fetch(`/api/state?${p}`); render(await res.json());
}

async function intervention(){
  const res=await fetch("/api/intervention",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({target:$("target").value,action:$("action").value})});
  const x=await res.json();
  const saved=Math.max(0,x.affected_before-x.affected_after);
  $("interventionResult").innerHTML=`<b>${x.target}</b> → ${x.action.replace("_"," ")}<br>
  High-risk before: <b>${x.affected_before}</b> • after: <b>${x.affected_after}</b><br>
  <span style="color:#74e0ca">Estimated cascade reduction: ${saved} borrower(s)</span>`;
}

$("shockSize").addEventListener("input",()=>{$("shockValue").textContent=$("shockSize").value});
$("run").addEventListener("click",run);
$("shock").addEventListener("change",()=>{updateSelectorHints();run()});
$("target").addEventListener("change",updateSelectorHints);
$("intervene").addEventListener("click",intervention);
$("highRiskOnly").addEventListener("click",()=>{
  if(!state)return;
  const risky=state.nodes.filter(n=>n.stress>=50);
  if(!risky.length){$("targetHint").textContent="No borrower is above the high-risk threshold. Increase the shock and run again.";return;}
  $("target").innerHTML=risky.map(n=>`<option value="${n.id}">🔴 ${n.id} — ${n.name} (${Math.round(n.stress)}%)</option>`).join("");
  $("target").value=risky[0].id;updateSelectorHints();
});
run();
