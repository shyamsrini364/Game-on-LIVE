const $=s=>document.querySelector(s);
let currentGame={players:[],min_players:2},currentReady=true,selectedHandoff=null,generation=0,lastResult=null;
const Ernie={planAllowed:true,hasRecommendation:false,currentRevision:'A'};
const labels={A:'Successful recommendation',B:'Unavailable court → replan',C:'No suitable alternatives → human help'};
const timeLabel=s=>new Intl.DateTimeFormat('en-AU',{timeZone:'Australia/Melbourne',weekday:'short',day:'numeric',month:'short',hour:'numeric',minute:'2-digit'}).format(new Date(s));
function clearHandoff(){selectedHandoff=null;$('#handoff-panel').hidden=true;}
function text(id,value){$(id).textContent=value;}
async function api(path,body){const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw Error('Demo could not complete this action. Reset or try again.');return r.json();}
function reset(){
 generation++;lastResult=null;clearHandoff();Ernie.hasRecommendation=false;Ernie.currentRevision=$('#scenario').value;
 CourtFlow.barObserver?.disconnect();CourtFlow.bar?.remove();CourtFlow.dialog?.remove();ErnieGamePlan.clear();
 VenueView.dispose($('#group-map'));$('#group-map').replaceChildren();$('#planning-output').replaceChildren();
 $('#run-demo').disabled=false;text('#demo-error','');text('#scenario-label',`Scenario ${$('#scenario').value} — ${labels[$('#scenario').value]} · SIMULATED`);
 text('#game-heading','Your fictional crew is ready.');text('#game-eyebrow','Fictional Demo Crew · Two players');
 currentGame.players=[{id:'alex',name:'Alex',suburb:'Clayton',avatar_id:'ace',is_organiser:true,voted:true},{id:'sam',name:'Sam',suburb:'Springvale',avatar_id:'sky',voted:true}];
 GameOnUI.renderCourt($('#session-court'),currentGame.players,{game:true,ready:true,minPlayers:2});
 text('#rankings','Alex and Sam have both approved two future evening times. Run Ernie to see the exact dates.');
 text('#player-count','2 fictional players');text('#status','All fictional votes submitted');text('#game-duration-label','Singles · 60 minutes · Melbourne time');
 history.replaceState(null,'','/?step=court');CourtFlow.update();
}
async function plan(){
 const g=++generation,scenario=$('#scenario').value;$('#run-demo').disabled=true;text('#demo-error','');clearHandoff();Ernie.hasRecommendation=false;CourtFlow.bar?.remove();CourtFlow.dialog?.remove();ErnieGamePlan.start();
 try{const result=await api('/api/demo/plan',{scenario});if(g!==generation)return;
 lastResult=result;Ernie.currentRevision=scenario;ErnieGamePlan.finish(result);Ernie.hasRecommendation=!!result.recommendations.length;
 $('#planning-output').replaceChildren();CourtFlow.bar?.remove();CourtFlow.dialog?.remove();
 text('#rankings',result.slots.map(s=>`${timeLabel(s.starts_at)} — both players available`).join(' / '));
 if(result.recommendations.length){
  CourtFlow.render(result,$('#planning-output'),approve);
  VenueView.dispose($('#group-map'));$('#group-map').replaceChildren();
  VenueView.enhance($('#group-map'),result,{mode:'map'},null,null,{players:result.players,planning:true,onSelect:id=>Ernie.selectVenue?.(id)});
 }else{const help=document.createElement('p');help.className='demo-help';help.textContent='No suitable simulated court options remain. Ernie needs human help. Review group availability or switch scenarios. No time was changed and nothing is booked.';$('#planning-output').append(help);}
 const evidence=document.createElement('p');evidence.className='demo-evidence';evidence.textContent=`Executed tools: ${result.executed_tools.join(' → ')}. Provider observations: ${result.observed_slots.map(s=>`${s.slot_id}: ${s.status}`).join('; ')}. No LLM used.`;$('#planning-output').append(evidence);CourtFlow.update();
 }catch(e){if(g===generation){ErnieGamePlan.fail();text('#demo-error',e.message);}}
 finally{if(g===generation)$('#run-demo').disabled=false;}
}
function brief(d){return `GAME ON — FICTIONAL DEMO PLAN (NOT A BOOKING)\nVenue: ${d.name}\nAddress: ${d.venue.address}\nOfficial website: ${d.venue.booking_url||d.venue.website_url}\n${d.pricing.category} · ${d.pricing.court_name}\n${timeLabel(d.starts_at)} — ${timeLabel(d.ends_at)} (Australia/Melbourne)\nDuration: 60 minutes; 2 fictional players\nSimulated total: AUD ${(d.pricing.total_minor/100).toFixed(2)}; calculated share: AUD ${(d.pricing.estimated_per_player_minor/100).toFixed(2)}\nFixture generated: ${d.pricing.observed_at}\nReselect court and time and verify real availability and price. Obtain explicit user confirmation before any reservation or payment. This demo has not booked anything.`;}
async function approve(selection){
 const g=generation;const d=await api('/api/demo/approve',{...selection,approved:true});if(g!==generation)return;
 selectedHandoff=d;text('#handoff-venue',d.name);text('#handoff-address',d.venue.address);text('#handoff-when',timeLabel(d.starts_at)+' — '+timeLabel(d.ends_at));text('#handoff-format','Singles · 60 minutes');text('#handoff-players','2 fictional players');
 CourtPricing.render($('#handoff-pricing'),d.pricing);$('#handoff-avatars').replaceChildren(...currentGame.players.map(p=>GameOnUI.avatar(p)));
 text('#handoff-status','Demo approval only. No booking, hold or payment. The official venue website will require selecting court and time again.');$('#handoff-brief').value=brief(d);$('#handoff-next').hidden=true;text('#handoff-copy','Send to Personal Assistant');
 $('#handoff-unavailable').open=false;CourtFlow.go('handoff');
}
async function copyBrief(){if(!selectedHandoff)return;try{await navigator.clipboard.writeText(brief(selectedHandoff));text('#handoff-copy','Copied!');}catch(e){$('.brief-details').open=true;$('#handoff-brief').focus();$('#handoff-brief').select();text('#handoff-status','Clipboard unavailable. Copy the displayed fictional brief manually.');}}
function downloadCalendar(){if(!selectedHandoff)return;const d=selectedHandoff;const body=CourtFlow.calendar({...d,venue_name:d.name+' · FICTIONAL DEMO',venue_address:d.venue.address,booking_url:d.venue.booking_url});const url=URL.createObjectURL(new Blob([body],{type:'text/calendar'}));const a=document.createElement('a');a.href=url;a.download='game-on-fictional-plan.ics';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('#join-panel').remove();$('#vote-panel').remove();$('.game-share').remove();$('#manual-exploration').remove();
$('#planning-entry').innerHTML='<div><strong>Ernie · AI assistant demo</strong><p class="small">Bounded LangGraph with built-in decisions and simulated inventory.</p><p id="demo-error" role="alert"></p></div><button id="run-demo" class="primary" type="button">Run Ernie</button>';
text('#share-note','Fictional accounts and votes only. No personal registration or invitations.');
text('#next-step','These are fixed fictional votes. Reset restores the demonstration; no shared data is changed.');
CourtFlow.init();ErnieGamePlan.init();$('#run-demo').onclick=plan;$('#reset').onclick=reset;$('#scenario').onchange=reset;
$('#handoff-copy').onclick=copyBrief;$('#handoff-calendar').onclick=downloadCalendar;
$('#handoff-open').onclick=()=>{if(!selectedHandoff)return;const url=selectedHandoff.venue.booking_url||selectedHandoff.venue.website_url;window.open(url,'_blank','noopener,noreferrer');$('#handoff-next').hidden=false;text('#handoff-next-title','Demo handoff complete — nothing booked');text('#handoff-next-description','The official website opens without prefilled court/time. Stop before any hold, reservation or payment during this demonstration.');};
$('#handoff-next a').onclick=e=>{e.preventDefault();CourtFlow.go('court');};
reset();
