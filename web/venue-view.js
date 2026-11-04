// Shared street-map/list view. No geolocation, geocoding or booking-provider calls.
window.VenueView = (() => {
  const el = (tag, text, cls) => { const n=document.createElement(tag); if(text)n.textContent=text; if(cls)n.className=cls; return n; };
  const position = venue => venue.map_location || venue.location;
  const cleanups = new WeakMap();
  function dispose(root) { cleanups.get(root)?.(); cleanups.delete(root); }
  function capture(root) { return {mode:root.dataset.mode || root.dataset.defaultMode || 'list', selected:root.dataset.highlight || ''}; }
  function enhance(root, result, state = {}, handoff, preferenceButton, {listOnly=false} = {}) {
    dispose(root);
    if (!result.recommendations.length) return;
    const cards=[...root.querySelectorAll('.venue-card')];
    // A list-only view sits beside the page's main map, so it gets numbered cards and no second map.
    if (listOnly) { cards.forEach((c,i)=>{c.tabIndex=-1;const badge=el('span',String(i+1),'venue-art');badge.setAttribute('aria-label',`Suggestion ${i+1}`);c.prepend(badge);c.classList.toggle('venue-highlight',c.dataset.venueId===state.selected);}); root.dataset.mode='list'; return; }
    const controls=el('div',null,'venue-tabs');controls.setAttribute('aria-label','Venue display');
    const list=el('button','List','secondary'), map=el('button','Map','secondary');
    list.type=map.type='button';controls.append(map,list);
    const panel=el('section',null,'area-panel');panel.setAttribute('aria-label','Venue street map');
        const status=el('p','Loading street map...','small map-status');status.setAttribute('role','status');
    const retry=el('button','Retry map','secondary');retry.type='button';retry.hidden=true;
    panel.append(status,retry);
    const plot=el('div',null,'street-map');plot.setAttribute('aria-label','Interactive Victoria venue map');panel.append(plot);
    const areaStatus=el('p','','small');areaStatus.setAttribute('role','status');
    const valid=result.recommendations.filter(r=>Number.isFinite(position(r.venue)?.latitude)&&Number.isFinite(position(r.venue)?.longitude));
    const markers=[];
    // The complete catalogue stays in memory. Pan/zoom never calls a venue service.
    let visibleIds=null, requestedFocus=null;
    const showCards=()=>cards.forEach(c=>c.hidden=root.dataset.mode==='map' || (visibleIds!==null && !visibleIds.has(c.dataset.venueId)));
    const filterArea=()=>{
      if(disposed || mapFailed || !instance || root.dataset.mode!=='map' || result.mode!=='general_browse')return;
      const bounds=instance.getBounds();
      visibleIds=new Set(valid.filter(r=>bounds.contains([position(r.venue).longitude,position(r.venue).latitude])).map(r=>r.venue.id));
      markers.forEach(b=>b.hidden=!visibleIds.has(b.dataset.venueId));
      showCards();
      areaStatus.textContent=visibleIds.size?`${visibleIds.size} venue${visibleIds.size===1?'':'s'} in this map area.`:'No directory venues in this map area. Zoom out or search another suburb. Our directory doesn’t list every court.';
      if(!visibleIds.has(root.dataset.highlight))select(valid.find(r=>visibleIds.has(r.venue.id))?.venue.id || '');
    };
    let instance=null, starting=false, disposed=false, timeout=null, mapFailed=false;
    const controller=new AbortController();
    const resize=new ResizeObserver(()=>instance?.resize());resize.observe(plot);
    const failed=()=>{if(disposed)return;mapFailed=true;visibleIds=null;showCards();if(result.mode==='general_browse')areaStatus.textContent='Showing the full directory while the street map is unavailable.';status.textContent='Street map could not load fully. Use List to explore venues, or retry.';retry.hidden=false;plot.dataset.loaded='false';};
    async function startMap(){
      if(instance || starting || disposed)return;
      starting=true;mapFailed=false;retry.hidden=true;status.textContent='Loading street map...';
      try {
        const response=await fetch('/api/map-config',{signal:controller.signal});
        if(!response.ok)throw new Error('config');
        const config=await response.json();if(disposed)return;
        if(!config.enabled || !window.maplibregl)throw new Error('unavailable');
        maplibregl.setWorkerUrl('/vendor/maplibre/maplibre-gl-csp-worker.js');
        instance=new maplibregl.Map({container:plot,style:config.style_url,center:[145.05,-37.85],zoom:9,
          attributionControl:false,cooperativeGestures:true,
          transformRequest:(url)=>{
            const target=new URL(url,location.href);
            if(target.origin!==location.origin && !config.resource_origins.includes(target.origin))throw new Error('Map origin not allowed');
            return {url:target.href,credentials:'omit'};
          }});
        instance.addControl(new maplibregl.NavigationControl({showCompass:false}),'top-right');
        instance.addControl(new maplibregl.AttributionControl({compact:false}),'bottom-right');
        instance.on('error',failed);
        instance.on('idle',()=>{if(disposed || mapFailed || !instance?.isStyleLoaded() || !instance.areTilesLoaded())return;clearTimeout(timeout);status.textContent='';retry.hidden=true;plot.dataset.loaded='true';});
        timeout=setTimeout(failed,15000);
        for(const r of valid){
          const v=r.venue,i=result.recommendations.indexOf(r),b=el('button',String(i+1),'area-marker');
          b.type='button';b.dataset.venueId=v.id;
          const approximate=position(v).accuracy!=='verified_venue';
          b.classList.toggle('approximate-marker',approximate);
          b.setAttribute('aria-label',`Review ${v.name} in ${v.suburb}${approximate?' (approximate suburb location)':''}`);
          b.onclick=()=>select(v.id);markers.push(b);
          new maplibregl.Marker({element:b}).setLngLat([position(v).longitude,position(v).latitude]).addTo(instance);
        }
        if(result.mode==='general_browse' && result.search_location){
          const focus=result.search_location,bounds=new maplibregl.LngLatBounds();bounds.extend([focus.longitude,focus.latitude]);
          // Include the nearest few directory venues so the map does not start nearly empty.
          valid.slice(0,4).forEach(r=>bounds.extend([position(r.venue).longitude,position(r.venue).latitude]));
          instance.fitBounds(bounds,{padding:55,maxZoom:11,duration:0});
        }
        else if(valid.length){const bounds=new maplibregl.LngLatBounds();valid.forEach(r=>bounds.extend([position(r.venue).longitude,position(r.venue).latitude]));instance.fitBounds(bounds,{padding:55,maxZoom:14,duration:0});}
        else status.textContent='Venue coordinates unavailable. Use List to explore venues.';
        if(requestedFocus){instance.jumpTo({center:[requestedFocus.longitude,requestedFocus.latitude],zoom:12});requestedFocus=null;}
        select(root.dataset.highlight || '');
        instance.on('moveend',filterArea);filterArea();
      }catch(error){if(!disposed)failed();}
      finally{starting=false;}
    }
    retry.onclick=()=>{clearTimeout(timeout);instance?.remove();instance=null;markers.length=0;startMap();};
    cleanups.set(root,()=>{disposed=true;controller.abort();clearTimeout(timeout);resize.disconnect();instance?.remove();instance=null;});
    const detail=el('div',null,'area-detail');panel.append(detail);
        const select = id => {
      root.dataset.highlight=id;
      cards.forEach(c=>c.classList.toggle('venue-highlight',c.dataset.venueId===id));
      markers.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.venueId===id)));
      const r=result.recommendations.find(r=>r.venue.id===id);detail.replaceChildren();if(!r)return;
      const head=el('div',null,'area-detail-head'),info=el('div');
      info.append(el('h3',r.venue.name),el('p',r.venue.suburb+' · '+r.venue.address,'small'));
      head.append(info,el('span','Availability not checked','badge-muted'));detail.append(head);
      if(position(r.venue)?.accuracy!=='verified_venue')detail.append(el('p','Approximate location. Check the address before travelling.','small'));
      const actions=el('div',null,'area-detail-actions');detail.append(actions);
      if(preferenceButton)actions.append(preferenceButton(r.venue));
      const review=el('button','See in list','secondary');review.type='button';review.onclick=()=>{setMode('list');const c=cards.find(c=>c.dataset.venueId===id);c.focus();};actions.append(review);
      if(result.can_prepare_handoff){const b=el('button','Choose this venue','primary handoff-select');b.type='button';b.onclick=()=>handoff({revision:result.revision,slot_id:result.slot_id,venue_id:id});actions.append(b);}
    };
    const setMode=mode=>{root.dataset.mode=mode;panel.hidden=mode!=='map';showCards();list.setAttribute('aria-pressed',String(mode==='list'));map.setAttribute('aria-pressed',String(mode==='map'));if(mode==='map'){instance?.resize();startMap();}};
    list.onclick=()=>setMode('list');map.onclick=()=>setMode('map');markers.forEach(b=>b.onclick=()=>select(b.dataset.venueId));
    cards.forEach((c,i)=>{c.tabIndex=-1;const badge=el('span',String(i+1),'venue-art');badge.setAttribute('aria-label',`Map pin ${i+1}`);c.prepend(badge);const b=el('button','Show on map','secondary');b.type='button';b.onclick=()=>{
      requestedFocus=position(result.recommendations[i].venue);setMode('map');
      if(instance){instance.jumpTo({center:[requestedFocus.longitude,requestedFocus.latitude],zoom:12});requestedFocus=null;}
      select(c.dataset.venueId);markers.find(m=>m.dataset.venueId===c.dataset.venueId)?.focus();
    };c.append(b);});
    root.prepend(controls,areaStatus,panel);select(state.selected || '');setMode(state.mode || 'list');
  }
  return {capture,enhance,dispose};
})();
