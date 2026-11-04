// Group-scoped bearer credentials never go in query strings or invitation links.
const $ = s => document.querySelector(s);
const groupKey = id => `gameon-group:${id}`;
let groupId = new URLSearchParams(location.search).get('group');
let credential = null, current = null, venues = [], pendingInvitation = null;
const fragment = new URLSearchParams(location.hash.slice(1));
if (fragment.has('invite')) {
  pendingInvitation = {code: fragment.get('code'), invitation_token: fragment.get('invite')};
  sessionStorage.setItem('gameon-pending-invitation', JSON.stringify(pendingInvitation));
  history.replaceState(null, '', '/groups.html'); // remove secret from visible URL/history immediately
} else {
  try { pendingInvitation = JSON.parse(sessionStorage.getItem('gameon-pending-invitation')); } catch (_) {}
}
function flash(text) { $('#flash').textContent = text; $('#flash').hidden = false; }
async function api(path, data, token = credential?.member_token) {
  const r = await fetch(path, {method: data === undefined ? 'GET' : 'POST',
    headers: {'Content-Type': 'application/json', ...(token ? {Authorization: `Bearer ${token}`} : {})},
    ...(data === undefined ? {} : {body: JSON.stringify(data)})});
  const result = await r.json();
  if (!r.ok) throw new Error(result.error || 'Request failed.');
  return result;
}
function save(result, name) {
  credential = {member_token: result.member_token, name, code: result.code}; groupId = result.group_id;
  localStorage.setItem(groupKey(groupId), JSON.stringify(credential));
  history.replaceState(null, '', `/groups.html?group=${encodeURIComponent(groupId)}`);
}
const pickers = new Map();
function choices(selector, selected = []) {
  pickers.set(selector, createVenuePicker($(selector), venues, selected));
}
function selected(selector) { return pickers.get(selector).selected(); }
function selectedAvatar(selector) { return $(selector).querySelector('input:checked')?.value || 'auto'; }
function invitation(token) {
  $('#invitation-output').hidden = !token;
  $('#invitation-link').value = token ? `${location.origin}/groups.html#code=${encodeURIComponent(current.code)}&invite=${encodeURIComponent(token)}` : '';
}
function listLinks(selector, items, href) {
  const root = $(selector); root.replaceChildren();
  for (const item of items) {
    const p = document.createElement('p'), a = document.createElement('a'); a.href = href(item); a.textContent = item.title || item.name; p.append(a); root.append(p);
  }
  if (!items.length) root.textContent = 'None yet.';
}
async function loadGroup() {
  current = await api(`/api/groups/${encodeURIComponent(groupId)}`);
  credential.name = current.name; credential.code = current.code;
  localStorage.setItem(groupKey(groupId), JSON.stringify(credential));
  $('#heading').textContent = current.name; $('#group-code').textContent = `Group code: ${current.code} (not a password)`;
  $('#join-entry').hidden = true; $('#groups-intro').hidden = true;
  GameOnUI.renderCourt($('#group-court'),current.members);
  let guide=$('#ernie-group');if(!guide){guide=document.createElement('aside');guide.id='ernie-group';$('#group-court').after(guide);}
  Ernie.show(guide,'coach','Your group stays together across games. Join a game session to vote on times; group membership alone is not a vote.');
  $('#group-role').textContent = `You are ${current.me.name}, ${current.me.role === 'owner' ? 'the organiser' : 'a member'}.`;
  for (const id of ['create-panel', 'invite-panel', 'saved-panel']) $(`#${id}`).hidden = true;
  $('#group-panel').hidden = false; $('#owner-panel').hidden = current.me.role !== 'owner';
  $('#create-game').hidden = current.me.role !== 'owner'; $('#create-game').href = `/?group=${encodeURIComponent(groupId)}`;
  $('#members').textContent = current.members.map(m => `${m.name}${m.role === 'owner' ? ' (organiser)' : ''}`).join(', ');
  listLinks('#games', current.games, g => `/?game=${encodeURIComponent(g.id)}&group=${encodeURIComponent(groupId)}`);
  $('#profile-name').value = current.me.name; $('#profile-suburb').value = current.me.suburb;
  GameOnUI.avatarPicker($('#profile-avatar'),current.me.avatar_id,current.members.find(m=>m.id===current.me.id)?.avatar_seed);
  $('#settings-name').value = current.name; $('#restrict').checked = current.restrict_venues;
  choices('#profile-favourites', current.me.favourites); choices('#group-favourites', current.favourites);
}
function on(selector, event, task) {
  $(selector).addEventListener(event, async e => {
    e.preventDefault(); $('#flash').hidden = true;
    const button = event === 'submit' ? e.target.querySelector('button[type="submit"]') : e.currentTarget;
    button.disabled = true;
    try { await task(); } catch(error) { flash(error.message); } finally { button.disabled = false; }
  });
}
async function copy(text) {
  try { await navigator.clipboard.writeText(text); flash('Copied.'); }
  catch (_) { window.prompt('Copy and keep this safely:', text); }
}
async function setup() {
  const directory = await api('/api/venues', undefined, null); venues = directory.venues;
  for (const suburb of directory.suburbs) { const option = document.createElement('option'); option.value = suburb; $('#suburbs').append(option); }
  choices('#join-favourites');
  GameOnUI.avatarPicker($('#creator-avatar')); GameOnUI.avatarPicker($('#join-avatar'));
  on('#create-group', 'submit', async () => {
    const result = await api('/api/groups', {name: $('#group-name').value, player_name: $('#creator-name').value, suburb: $('#creator-suburb').value, avatar_id: selectedAvatar('#creator-avatar')}, null);
    save(result, $('#group-name').value); await loadGroup(); invitation(result.invitation_token);
    flash('Group created. Save your group code and private access key safely. Share only the invitation below.');
  });
  on('#join-group', 'submit', async () => {
    const result = await api('/api/invitations/join', {...pendingInvitation, name: $('#join-name').value, suburb: $('#join-suburb').value, favourites: selected('#join-favourites'), avatar_id: selectedAvatar('#join-avatar')}, null);
    sessionStorage.removeItem('gameon-pending-invitation'); pendingInvitation = null;
    save(result, 'Group'); await loadGroup(); flash('You joined the group. Save your group code and private access key in a password manager so you can restore access later.');
  });
  on('#profile', 'submit', async () => { await api(`/api/groups/${groupId}/me`, {name: $('#profile-name').value, suburb: $('#profile-suburb').value, favourites: selected('#profile-favourites'), avatar_id: selectedAvatar('#profile-avatar')}); await loadGroup(); flash('Your profile is saved for this group’s games.'); });
  on('#settings', 'submit', async () => { await api(`/api/groups/${groupId}/settings`, {name: $('#settings-name').value, favourites: selected('#group-favourites'), restrict_venues: $('#restrict').checked}); await loadGroup(); flash('Group settings saved.'); });
  on('#new-invitation', 'click', async () => { const result = await api(`/api/groups/${groupId}/invitation`, {action: 'rotate'}); invitation(result.invitation_token); });
  on('#revoke-invitation', 'click', async () => { await api(`/api/groups/${groupId}/invitation`, {action:'revoke'}); invitation(null); flash('Invitation revoked. Existing members keep access.'); });
  on('#copy-invitation', 'click', () => copy($('#invitation-link').value));
  on('#whatsapp-invitation', 'click', async () => { window.open(`https://wa.me/?text=${encodeURIComponent(`Join ${current.name} on Game On!\n${$('#invitation-link').value}`)}`, '_blank', 'noopener,noreferrer'); });
  on('#backup', 'click', () => copy(credential.member_token));
  on('#rotate-credential', 'click', async () => {
    const result = await api(`/api/groups/${groupId}/credential`, {});
    credential.member_token = result.member_token; localStorage.setItem(groupKey(groupId), JSON.stringify(credential));
    flash('Old credential invalidated. Copy and save your new credential now.');
  });
  on('#restore-group', 'submit', async () => {
    const token = $('#restore-token').value.trim();
    const result = await api('/api/groups/restore', {code: $('#restore-code').value.trim()}, token);
    save({...result, member_token:token}, 'Group'); $('#restore-token').value = ''; await loadGroup();
  });
  if (groupId) { credential = JSON.parse(localStorage.getItem(groupKey(groupId)) || 'null'); if (credential) await loadGroup(); else flash('Restore membership below or open your group invitation.'); }
  else if (pendingInvitation) {
    // Reopening your own invitation must never replace an owner's saved credential.
    for (let i=0; i<localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key.startsWith('gameon-group:')) continue;
      let saved;
      try { saved = JSON.parse(localStorage.getItem(key)); } catch (_) { continue; }
      if (saved?.code === pendingInvitation.code) {
        groupId = key.slice('gameon-group:'.length); credential = saved;
        sessionStorage.removeItem('gameon-pending-invitation'); pendingInvitation = null;
        history.replaceState(null, '', `/groups.html?group=${encodeURIComponent(groupId)}`);
        await loadGroup(); return;
      }
    }
    const preview = await api('/api/invitations/preview', pendingInvitation, null);
    $('#create-panel').hidden = true; $('#invite-panel').hidden = false; $('#invite-heading').textContent = `Join ${preview.name}`;
  } else {
    const saved = [];
    for (let i=0; i<localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('gameon-group:')) { try { saved.push({id:key.slice('gameon-group:'.length), name: JSON.parse(localStorage.getItem(key)).name || 'Group'}); } catch (_) {} }
    }
    listLinks('#saved-groups', saved, g => `/groups.html?group=${encodeURIComponent(g.id)}`);
  }
}
setup().catch(e => flash(e.message));
// Refresh shared membership/game lists without overwriting profile/settings edits.
setInterval(async () => {
  if(!groupId || !credential || $('#group-panel').hidden)return;
  try {
    const latest=await api(`/api/groups/${encodeURIComponent(groupId)}`);
    GameOnUI.renderCourt($('#group-court'),latest.members);
    $('#members').textContent=latest.members.map(m=>`${m.name}${m.role==='owner'?' (organiser)':''}`).join(', ');
    listLinks('#games',latest.games,g=>`/?game=${encodeURIComponent(g.id)}&group=${encodeURIComponent(groupId)}`);
  } catch (_) { flash('Group updates are unavailable. Refresh or restore access to try again.'); }
},10000);
