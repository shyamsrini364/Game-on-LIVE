"""Stateless fictional scenarios. No database, network provider or booking writes."""
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from decimal import Decimal, ROUND_HALF_UP
from gameon.models import GameSession, Player, TimeSlot
from gameon.erne.contracts import RunRequest, DiscoveryObservation, Candidate
from gameon.erne.graph import run_erne
from gameon.erne.activity import project_activity, completion_state
from gameon.venues.directory import CuratedDirectory, distance

LABELS = {'A':'Successful recommendation', 'B':'Unavailable court → replan', 'C':'No suitable alternatives → human help'}
VENUES = ('pickleholic-clayton', 'level-up-knox')

@dataclass(frozen=True)
class DemoStore:
    """Only these two fictional participants; reconstructed independently per request."""
    day: str
    def load_game_session(self, game_id):
        if game_id != 'demo-game': raise ValueError('Unknown fictional game')
        start=datetime.fromisoformat(self.day+'T18:30:00').replace(tzinfo=ZoneInfo('Australia/Melbourne'))
        slots=tuple(TimeSlot(f'slot-{i}',start+timedelta(days=i),start+timedelta(days=i,hours=1)) for i in range(2))
        game=GameSession(id=game_id,sport='pickleball',slots=slots,min_players=2,duration_minutes=60)
        for pid,name,suburb in [('alex','Alex','Clayton'),('sam','Sam','Springvale')]:
            game.add_player(Player(pid,name,suburb));game.submit_availability(pid,{s.id for s in slots})
        return game,'Fictional Demo Crew'

@dataclass(frozen=True)
class SimulatedInventory:
    scenario: str
    def search(self, request):
        # Responses depend on the graph-selected slot, not a canned activity timeline.
        available=self.scenario=='A' or (self.scenario=='B' and request.slot_id=='slot-1')
        ids=VENUES if self.scenario=='A' else VENUES[1:]
        return DiscoveryObservation(snapshot_id=request.snapshot_id,slot_id=request.slot_id,
            status='results' if available else 'empty',
            candidates=tuple(Candidate(id=i,name={'pickleholic-clayton':'Pickleholic','level-up-knox':'Level Up Pickleball'}[i]) for i in ids) if available else ())

def fixture_day():
    today=datetime.now(ZoneInfo('Australia/Melbourne')).date()
    return (today+timedelta(days=(5-today.weekday())%7+7)).isoformat()

def run_demo(scenario):
    store=DemoStore(fixture_day())
    result=run_erne(RunRequest(game_id='demo-game',deadline_seconds=20.0,tool_timeout_seconds=5.0),store,discovery=SimulatedInventory(scenario))
    game,_=store.load_game_session('demo-game')
    directory=CuratedDirectory()
    records={v.id:v for v in directory.venues}
    players=[dict(id='alex',name='Alex',suburb='Clayton',avatar_id='ace',location=dict(latitude=-37.925,longitude=145.12)),dict(id='sam',name='Sam',suburb='Springvale',avatar_id='sky',location=dict(latitude=-37.95,longitude=145.15))]
    recommendations=[]
    if result.outcome=='discovery_recommendation' and result.stop_reason=='completed':
        found=next(e.payload for e in reversed(result.observations) if isinstance(e.payload,DiscoveryObservation) and e.payload.status=='results')
        slot=next(s for s in game.slots if s.id==found.slot_id)
        for candidate in found.candidates:
            v=records[candidate.id]; total=5125 if v.id==VENUES[0] else 5000
            from gameon.venues.contracts import Point
            d=[distance(Point(latitude=p['location']['latitude'],longitude=p['location']['longitude'],source_url='https://example.invalid/fictional-suburb'),v.location) for p in players]
            pricing=dict(category='Main Courts' if v.id==VENUES[0] else 'Individual courts',court_name='Court 3',currency='AUD',total_minor=total,estimated_per_player_minor=int((Decimal(total)/2).quantize(Decimal('1'),rounding=ROUND_HALF_UP)),participant_count=2,observed_at=datetime.now(timezone.utc).isoformat(),stale=False,refresh_due=False,refresh_status='simulated')
            recommendations.append(dict(venue_id=v.id,name=v.name,suburb=v.suburb,venue=v.model_dump(mode='json'),pricing=pricing,starts_at=slot.starts_at.isoformat(),ends_at=slot.ends_at.isoformat(),duration_minutes=60,player_count=2,average_distance_km=round(sum(d)/2,1),longest_distance_km=round(max(d),1),selection=dict(scenario=scenario,day=store.day,slot_id=slot.id,venue_id=v.id)))
    return dict(scenario=scenario,label=LABELS[scenario],simulated=True,llm_used=result.llm_used,run_id=result.run_id,revision=scenario,planning_state=completion_state(result),activity_timeline=project_activity(result),stop_reason=result.stop_reason,executed_tools=[t.name for t in result.trace if t.phase=='tool'],observed_slots=[dict(slot_id=e.payload.slot_id,status=e.payload.status,source='simulated_provider') for e in result.observations if isinstance(e.payload,DiscoveryObservation)],recommendations=recommendations,players=players,slots=[dict(id=s.id,starts_at=s.starts_at.isoformat(),ends_at=s.ends_at.isoformat()) for s in game.slots])
