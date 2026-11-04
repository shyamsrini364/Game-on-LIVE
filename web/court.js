// Original illustrated presets. Public visual seeds have no authority and are never credentials.
window.GameOnUI = (() => {
  const ns = 'http://www.w3.org/2000/svg';
  const presets = [
    {id:'rally', name:'Rally', seed:'000001120000'},
    {id:'ace', name:'Ace', seed:'000002650000'},
    {id:'sunny', name:'Sunny', seed:'000003980000'},
    {id:'river', name:'River', seed:'000004cb0000'},
    {id:'sky', name:'Sky', seed:'000005fe0000'},
    {id:'blaze', name:'Blaze', seed:'000007310000'}
  ];
  function shape(tag, attrs) {
    const node = document.createElementNS(ns, tag);
    for (const [key,value] of Object.entries(attrs)) node.setAttribute(key,value);
    return node;
  }
  function avatar(person) {
    const seed = presets.find(p=>p.id===person.avatar_id)?.seed || (/^[a-f0-9]{12}$/.test(person.avatar_seed) ? person.avatar_seed : '0123456789ab');
    const value = parseInt(seed.slice(0,8),16);
    const skin = ['#f6c6a0','#bb7852','#e2a278','#80503b'][value%4];
    const shirt = ['#0f766e','#0b2d56','#704b91','#b03d52','#27729f','#9b5d19'][(value>>>3)%6];
    const hair = ['#252d39','#5a3424','#996434','#dde2e7'][(value>>>6)%4];
    const svg = shape('svg',{viewBox:'0 0 100 100',class:'human-avatar','aria-hidden':'true'});
    svg.append(shape('circle',{cx:50,cy:50,r:49,fill:['#ddebff','#d9ff4a','#ffe066','#caece1'][(value>>>8)%4]}));
    svg.append(shape('path',{d:'M15 100Q18 70 40 70H60Q83 72 85 100',fill:shirt}));
    svg.append(shape('rect',{x:43,y:61,width:14,height:20,rx:6,fill:skin}));
    if(value%3===0)svg.append(shape('path',{d:'M25 63V38Q24 10 50 10T76 38V79L67 83 27 79Z',fill:hair}));
    svg.append(shape('ellipse',{cx:50,cy:44,rx:23,ry:29,fill:skin}));
    svg.append(shape('path',{d:value%2?'M27 43Q20 15 46 13Q76 11 74 43L61 24Q49 35 27 30Z':'M26 40Q22 12 49 12Q75 12 75 38L60 28 37 30Z',fill:hair}));
    for(const x of [41,59])svg.append(shape('circle',{cx:x,cy:44,r:2.3,fill:'#142c46'}));
    svg.append(shape('path',{d:'M42 57Q50 64 59 56',fill:'none',stroke:'#663e33','stroke-width':2.5,'stroke-linecap':'round'}));
    if(value%3===1){svg.append(shape('path',{d:'M25 32Q25 10 49 10Q73 10 76 32Z',fill:'#f8fafc'}));svg.append(shape('path',{d:'M24 32Q49 25 80 33L78 39Q53 32 24 37Z',fill:'#0b2d56'}));}
    if(value%5===0)for(const x of [40,60])svg.append(shape('rect',{x:x-8,y:38,width:16,height:12,rx:5,fill:'none',stroke:'#0b2d56','stroke-width':2}));
    return svg;
  }
  function player(person, isGame) {
    const item=document.createElement('div');item.className='court-player';item.dataset.avatarSeed=person.avatar_seed;
    item.dataset.avatarId=person.avatar_id || 'auto';
    const portrait=document.createElement('div');portrait.className='avatar-ring '+(isGame&&person.has_voted?'voted':'');portrait.append(avatar(person));
    const name=document.createElement('strong');name.textContent=person.name;
    const status=document.createElement('span');status.className='avatar-status';status.textContent=isGame?(person.has_voted?'✓ Voted':'Awaiting vote'):(person.role==='owner'?'Organiser':'Member');
    item.append(portrait,name,status);return item;
  }
  function renderCourt(root, people, {game=false,ready=false,minPlayers=4}={}) {
    const state=JSON.stringify([people,game,ready,minPlayers]);
    if(root.dataset.state===state)return;
    root.dataset.state=state;
    const expanded=root.querySelector('details')?.open||false;
    root.replaceChildren();root.className='crew-court'+(ready?' court-ready':'');
    const head=document.createElement('div');head.className='court-heading';
    const label=document.createElement('div');label.className='eyebrow';label.textContent=game?'Your game crew':'Your group clubhouse';
    const count=document.createElement('strong');const voted=people.filter(p=>p.has_voted).length;
    count.textContent=game?`${people.length} joined · ${voted} voted · ${people.length-voted} awaiting vote`:`${people.length} member${people.length===1?'':'s'} in your crew`;
    head.append(label,count);root.append(head);
    const court=document.createElement('div');court.className='court-surface';
    const lines=document.createElement('div');lines.className='court-lines';lines.setAttribute('aria-hidden','true');lines.append(document.createElement('i'));court.append(lines);
    const row=document.createElement('div');row.className='court-players';
    for(const person of people.slice(0,4))row.append(player(person,game));
    if(!people.length){const empty=document.createElement('p');empty.className='court-empty';empty.textContent=game?'Your crew starts here. Join this game to appear on court.':'Invite friends to build your crew.';row.append(empty);}
    court.append(row);root.append(court);
    if(people.length>4){const more=document.createElement('details');more.open=expanded;more.className='more-crew';const summary=document.createElement('summary');summary.textContent=`Meet the rest of your crew (+${people.length-4})`;const list=document.createElement('div');list.className='extra-players';for(const person of people.slice(4))list.append(player(person,game));more.append(summary,list);root.append(more);}
    const note=document.createElement('p');note.className='court-guidance';
    note.textContent=game?(ready?'A shared time is ready. Next: review venue suggestions.':people.length<minPlayers?`Invite more players: this game needs at least ${minPlayers}.`:people.length-voted?`${people.length-voted} player${people.length-voted===1?' still needs':'s still need'} to vote on the proposed times.`:'All votes are in. Check the time results below.'):'A reusable group for all your next games. Choose a game to see its votes.';
    const disclaimer=document.createElement('p');disclaimer.className='court-disclaimer';disclaimer.textContent='Your crew at a glance · Illustration only, not court positions or a reservation.';root.append(note,disclaimer);
  }
  function avatarPicker(root, selected='auto', seed) {
    root.replaceChildren();root.className='avatar-picker';
    for (const preset of [{id:'auto',name:'Automatic'}, ...presets]) {
      const label=document.createElement('label');label.className='avatar-choice';
      const input=document.createElement('input');input.type='radio';input.name=root.id;input.value=preset.id;input.checked=preset.id===selected;
      const name=document.createElement('span');name.textContent=preset.name;
      label.append(input,avatar({avatar_id:preset.id,avatar_seed:seed}),name);root.append(label);
    }
  }
  return {avatar,renderCourt,avatarPicker};
})();
