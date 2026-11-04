// Local bounded chat; saved game rules remain authoritative.
window.Ernie = {
  contexts: new Map(),
  init() {
    if (this.widget) return;
    const widget = document.createElement('aside');
    widget.className = 'ernie-widget';
    widget.innerHTML = `<button class="ernie-launcher" aria-expanded="false" aria-controls="ernie-chat" aria-label="Chat with Ernie · AI assistant"><img src="/assets/ernie/player-v3.webp" alt="" width="64" height="43"><span>Ernie <small>AI assistant</small></span></button>
      <section id="ernie-chat" role="dialog" aria-labelledby="ernie-title" hidden>
        <header><div><strong id="ernie-title">Ernie · AI assistant</strong><small>Let's get your crew on court</small></div><button class="ernie-close" aria-label="Close Ernie chat">×</button></header>
        <p class="ernie-disclosure">Built-in help, not model-generated chat. I can help with Game On! steps, but can't check live availability or book courts.</p>

        <div class="ernie-conversation"><div class="erne-planning" hidden><button type="button" class="primary erne-plan">Ernie, find the best court for us</button><details class="small erne-mode"><summary>How Ernie plans</summary><p>Ernie uses your real game data and fixed rules to compare venues. Live AI model planning is not switched on here.</p></details><div class="erne-plan-result" role="status" aria-live="polite"></div></div><div class="ernie-context"></div><div class="ernie-messages" role="log" aria-label="Conversation with Ernie" aria-live="polite" aria-relevant="additions"></div></div>
        <div class="ernie-questions"><button type="button">What next?</button><button type="button">How do I vote?</button><button type="button">Help with venues</button></div>
        <form class="ernie-form"><label for="ernie-question">Ask about your game</label><div><input id="ernie-question" maxlength="500" autocomplete="off" placeholder="How can I invite friends?"><button type="submit">Send</button></div></form>
      </section>`;
    document.body.append(widget); this.widget = widget;
    const launcher = widget.querySelector('.ernie-launcher'), chat = widget.querySelector('#ernie-chat');
    const toggle = open => {
      chat.hidden = !open; launcher.setAttribute('aria-expanded', String(open));
      (open ? widget.querySelector('.ernie-close') : launcher).focus();
      if (open) this.renderContext();
    };
    launcher.onclick = () => toggle(chat.hidden);
    widget.querySelector('.ernie-close').onclick = () => toggle(false);
    widget.addEventListener('keydown', e => { if(e.key === 'Escape' && !chat.hidden) { e.preventDefault(); toggle(false); } });
    widget.querySelector('img').onerror = e => { e.target.hidden = true; };
    widget.querySelector('.ernie-form').onsubmit = e => {
      e.preventDefault(); const input = widget.querySelector('input');
      const question = input.value.trim(); if (!question) return;
      this.ask(question); input.value = ''; input.focus();
    };
    widget.querySelectorAll('.ernie-questions button').forEach(b => b.onclick = () => this.ask(b.textContent));
    this.renderContext();
  },
  activeContexts() {
    return [...this.contexts.values()].filter(({root}) => root.isConnected && !root.parentElement.closest('[hidden]'));
  },
  renderContext() {
    if (!this.widget) return;
    const text = this.activeContexts().map(c => c.message).join('\n\n') || 'Hi, I’m Ernie. Create or join a group, invite your friends, then choose game times together. What would you like help with?';
    const context = this.widget.querySelector('.ernie-context');
    if (context.textContent !== text) context.textContent = text;
  },
  ask(question) {
    const q = question.toLowerCase(), contexts = this.activeContexts();
    const get = id => contexts.find(c => c.root.id === id)?.message;
    let answer;
    if (/book|reserv|price|cost|pay|availab/.test(q)) answer = 'Check actual availability and prices on the venue website. The organiser can review a venue and use the booking handoff. Copying instructions or opening a website does not confirm a reservation. I cannot book or pay for you.';
    else if (/venue|court|distance|map/.test(q)) answer = get('ernie-venues') || 'After everyone votes and a future time meets the player minimum, review venue suggestions. Compare preferences and approximate distances. Availability and prices still need checking with the venue.';
    else if (/vote|time|respond/.test(q)) answer = [get('ernie-game'), 'Join the game session, select every start time that works for the full session duration, then save your votes. You can update them later. Joining a group alone does not count as voting.'].filter(Boolean).join(' ');
    else if (/invit|friend|share/.test(q)) answer = 'In My groups, the organiser can copy the group invitation for friends. Existing members can use the session link to join a game and vote. Keep recovery and management credentials private.';
    else if (/next|status|player|ready/.test(q)) answer = get('ernie-game') || get('ernie-group') || 'Create or join a group in My groups, invite friends, then create a game with proposed times.';
    else answer = 'I can help with inviting friends, voting, venue suggestions and booking steps. Try one of the suggested questions. This chat uses built-in guidance, so I cannot answer general questions or change your game.';
    const log = this.widget.querySelector('.ernie-messages');
    for (const [speaker, text] of [['You', question], ['Ernie', answer]]) {
      const p = document.createElement('p'); p.className = speaker === 'You' ? 'ernie-user' : 'ernie-answer';
      const label = document.createElement('strong'); label.textContent = speaker;
      p.append(label, document.createTextNode(text)); log.append(p);
    }
    while (log.children.length > 40) log.firstElementChild.remove();
    log.lastElementChild.scrollIntoView({block:'nearest'});
  },
  planning(allowed, run, approve, revision) {
    const area = this.widget.querySelector('.erne-planning');
    area.hidden = !allowed;
    const button = area.querySelector('.erne-plan'), output = area.querySelector('.erne-plan-result');
    if (this.planRevision && (this.planRevision !== revision || !allowed)) {
      this.planRevision = null;
      output.textContent = 'The game changed. Ask Ernie for a fresh recommendation before approving.';
    }
    this.currentRevision = revision;
    this.approvePlan = approve;
    button.onclick = async () => {
      if (button.disabled) return;
      button.disabled = true; this.planRevision = null;
      area.setAttribute('aria-busy', 'true');
      output.textContent = 'Ernie is working. Completed activity will appear when the run finishes.';
      try {
        const result = await run();
        if (!allowed || result.revision !== this.currentRevision) throw new Error('The game changed. Ask Ernie for a fresh recommendation.');
        output.replaceChildren(); this.planRevision = result.revision;
        const add = (tag, text, root = output) => { const el = document.createElement(tag); el.textContent = text; root.append(el); return el; };
        const modes = {deterministic: 'Deterministic planning — no model used', mock_model: 'Mocked model decisions — offline test', model: 'Model-driven planning'};
        add('p', `${modes[result.execution_mode] || 'Execution mode unavailable'} · ${result.elapsed_seconds}s`);
        if (result.execution_status === 'failed') add('p', 'Planning stopped before completion. No approval or booking was made.');
        add('p', result.reason);
        for (const text of result.missing_information) add('p', text);
        const activityPanel = add('details', '');
        add('summary', 'What Ernie did', activityPanel);
        const activities = add('ol', '', activityPanel); activities.className = 'erne-activities';
        for (const activity of result.activities) add('li', `${activity.status === 'completed' ? 'Done' : 'Not completed'}: ${activity.label}. ${activity.detail}`, activities);
        if (result.recommendations.length) {
          const proposal = add('div', ''); proposal.className = 'erne-proposal';
          const choice = add('p', '', proposal), explanation = add('p', '', proposal);
          let selected = result.recommendations[0];
          const describe = () => {
            const time = new Intl.DateTimeFormat('en-AU', {timeZone:'Australia/Melbourne', weekday:'short', day:'numeric', month:'short', hour:'numeric', minute:'2-digit'}).format(new Date(selected.starts_at));
            choice.textContent = `${selected.player_count} players are available ${time} (Melbourne), for ${selected.duration_minutes} minutes. I suggest ${selected.name}. Proceed with this venue?`;
            explanation.textContent = `Ranked using your saved preferences and approximate suburb distances. Average: ${selected.average_distance_km} km; longest: ${selected.longest_distance_km} km. These are straight-line distances, not travel times.`;
          };
          describe();
          const controls = add('div', '', proposal); controls.className = 'erne-confirm-actions';
          const accept = add('button', 'Approve this venue', controls); accept.type = 'button'; accept.className = 'primary'; accept.disabled = !selected.selection;
          const compare = add('button', 'Compare alternatives', controls); compare.type = 'button'; compare.className = 'secondary';
          const dismiss = add('button', 'Not now', controls); dismiss.type = 'button'; dismiss.className = 'secondary';
          const alternatives = add('div', '', proposal); alternatives.hidden = true;
          compare.onclick = () => {
            alternatives.hidden = false; alternatives.replaceChildren();
            if (result.recommendations.length < 2) add('p', 'No other recommendations were found in this run. No extra search or model call has been made.', alternatives);
            for (const venue of result.recommendations.filter(v => v.venue_id !== selected.venue_id)) {
              const option = add('button', `${venue.name} · ${venue.suburb}`, alternatives); option.type = 'button'; option.className = 'secondary';
              option.onclick = () => { selected = venue; describe(); accept.disabled = !selected.selection; alternatives.hidden = true; };
            }
          };
          dismiss.onclick = () => { proposal.replaceChildren(); add('p', 'Proposal dismissed. Votes and booking status are unchanged.', proposal); this.planRevision = null; };
          accept.onclick = async () => {
            if (this.planRevision !== result.revision || this.currentRevision !== result.revision) return;
            controls.querySelectorAll('button').forEach(b => b.disabled = true);
            try {
              await this.approvePlan(selected.selection);
              proposal.replaceChildren(); add('p', 'Venue approved for enquiry. Review the booking handoff. Availability and booking remain unverified.', proposal);
              this.widget.querySelector('.ernie-close').click();
            } catch (error) { proposal.replaceChildren(); add('p', error.message || 'Approval failed. Review the current game and try again.', proposal); this.planRevision = null; }
          };
        }
        const details = add('details', '');
        add('summary', 'Executed actions and decisions', details);
        const list = add('ol', '', details);
        for (const event of result.trace) add('li', `${event.phase}: ${event.action}${event.decision_source ? ` (${event.decision_source})` : ''} — ${event.summary}`, list);
        add('p', 'Availability and prices are not checked. Approving a venue is permission to enquire, not a reservation or payment.');
      } catch (error) { output.textContent = error.message || 'Planning is unavailable. Your votes are unchanged.'; }
      finally { button.disabled = false; area.setAttribute('aria-busy', 'false'); }
    };
  },
  show(root, persona, message) {
    if (!root) return;
    this.init(); root.replaceChildren();
    // Tips marked .ernie-tip show inline beside the step; other contexts only feed the chat.
    if (root.classList.contains('ernie-tip') && message) {
      root.hidden = false;
      const img = document.createElement('img'); img.src = '/assets/ernie/player-v3.webp'; img.alt = ''; img.width = 96; img.height = 64;
      const bubble = document.createElement('p'); bubble.textContent = message;
      root.append(img, bubble);
    } else root.hidden = true;
    this.contexts.set(root.id, {root, message}); this.renderContext();
  },
  openPlanner() {
    this.init();
    const chat = this.widget.querySelector('#ernie-chat');
    if (chat.hidden) this.widget.querySelector('.ernie-launcher').click();
    this.widget.querySelector('.erne-plan')?.focus();
  },
  game(root, game, ready) {
    const voted = game.players.filter(p => p.has_voted).length, pending = game.players.length - voted;
    const message = ready ? 'A time works for enough of you. Pick a court on the map, or ask me to suggest the fairest one.' : game.players.length < game.min_players ? `${game.players.length} of ${game.min_players} players are in. Share the game link to bring your crew together.` : pending ? `${voted} of ${game.players.length} players have voted. Waiting on ${pending} more. You can explore courts while you wait.` : 'Everyone has voted, but no time works for enough players yet. The organiser can start a new game with other times.';
    this.show(root, 'assistant', message);
  }
};
window.Ernie.init();
