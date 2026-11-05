/* Presentation of recorded evidence only. No network calls or plan mutations. */
window.AgentBrain = {
  init() {
    const panel=document.createElement('details');panel.id='agent-brain';panel.className='panel agent-brain';panel.hidden=true;
    panel.innerHTML=`<summary>View Agent Brain</summary><h2>Ernie's Agent Brain</h2>
      <p><strong>Execution replay</strong> · Deterministic decisions · Simulated provider data</p>
      <p class="small">Recorded events from the completed LangGraph run. Playback speed is for presentation, not measured execution time. Approval happens separately.</p>
      <svg viewBox="0 0 540 240" role="img" aria-label="DECIDE to TOOL to OBSERVE, looping back to DECIDE; DECIDE can also FINISH">
      <defs><marker id="brain-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8Z" fill="currentColor"/></marker></defs>
      <g class="brain-links" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#brain-arrow)"><path d="M160 60H200"/><path d="M340 60H380"/><path d="M450 90V125H90V90"/><path d="M90 90V180H200"/></g>
      <text x="270" y="148" text-anchor="middle">Observe → Decide: evaluate evidence</text>
      <g data-node="DECIDE"><rect x="20" y="30" width="140" height="60" rx="12"/><text x="90" y="66">DECIDE</text></g>
      <g data-node="TOOL"><rect x="200" y="30" width="140" height="60" rx="12"/><text x="270" y="66">TOOL</text></g>
      <g data-node="OBSERVE"><rect x="380" y="30" width="140" height="60" rx="12"/><text x="450" y="66">OBSERVE</text></g>
      <g data-node="FINISH"><rect x="200" y="165" width="140" height="60" rx="12"/><text x="270" y="201">FINISH</text></g></svg>
      <p id="brain-position" class="small"></p><div id="brain-description" role="status" aria-live="polite"></div>
      <div class="share-actions"><button id="brain-prev" class="secondary">Previous</button><button id="brain-next" class="secondary">Next</button><button id="brain-play" class="primary">Replay</button><button id="brain-reset" class="secondary">Reset replay</button></div>`;
    document.querySelector('#planning-entry').after(panel);this.panel=panel;
    const evidence=document.createElement('p');evidence.id='brain-court-evidence';evidence.className='brain-evidence';evidence.hidden=true;
    document.querySelector('#planning-output').before(evidence);this.evidence=evidence;
    document.querySelector('#brain-prev').onclick=()=>this.select(this.index-1);
    document.querySelector('#brain-next').onclick=()=>this.select(this.index+1);
    document.querySelector('#brain-reset').onclick=()=>this.select(0);
    document.querySelector('#brain-play').onclick=()=>{if(this.timer){this.stop();return;}this.select(0);this.timer=setInterval(()=>{if(this.index>=this.events.length-1){this.stop();return;}this.select(this.index+1,false);},1400);document.querySelector('#brain-play').textContent='Pause replay';};
    panel.addEventListener('toggle',()=>{if(!panel.open)this.stop();});
  },
  stop(){clearInterval(this.timer);this.timer=null;if(this.panel)document.querySelector('#brain-play').textContent='Replay';},
  clear(){this.stop();this.events=[];this.panel.hidden=true;this.panel.open=false;this.evidence.hidden=true;this.evidence.textContent='';},
  load(result){this.clear();this.events=result.graph_events;this.scenario=result.scenario;this.panel.hidden=false;this.select(0);},
  select(index,stop=true){
    if(stop)this.stop();this.index=Math.max(0,Math.min(index,this.events.length-1));const e=this.events[this.index];if(!e)return;
    this.panel.querySelectorAll('[data-node]').forEach(n=>n.classList.toggle('active',n.dataset.node===e.node));
    document.querySelector('#brain-position').textContent=`Scenario ${this.scenario} · Event ${e.sequence} of ${this.events.length} · Iteration ${e.iteration} · ${e.event_id} · Run ${e.run_id}`;
    const o=e.observation;let description=`${e.node}${e.tool?' · '+e.tool:''}`;
    if(e.decision_source)description+=` · ${e.decision_source} decision`;
    if(e.reason_code)description+=` · ${e.reason_code.replaceAll('_',' ')}`;
    if(o)description+=` · ${o.status}${o.court_count!==undefined?`: ${o.court_count} simulated courts (${o.slot_id==='slot-0'?'first':'second'} agreed time)`:o.player_count!==undefined?`: ${o.player_count} fictional players, ${o.slot_count} times`:o.eligible_time_count!==undefined?`: ${o.eligible_time_count} eligible times`:''}`;
    if(e.terminal_outcome)description+=` · ${e.terminal_outcome.action} · ${e.terminal_outcome.outcome.replaceAll('_',' ')}`;
    document.querySelector('#brain-description').textContent=description;
    this.evidence.hidden=!o?.slot_id;
    this.evidence.textContent=o?.slot_id?(o.status==='empty'&&o.slot_id==='slot-0'?'0 available courts for the first agreed time':`${o.court_count??0} available simulated courts for the ${o.slot_id==='slot-0'?'first':'second'} agreed time`)+'. Execution replay · Simulated provider data. The completed plan below is unchanged.':'';
    document.querySelector('#brain-prev').disabled=this.index===0;document.querySelector('#brain-next').disabled=this.index===this.events.length-1;
  }
};
