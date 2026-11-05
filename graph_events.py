"""Public replay projection: one event per real trace entry, no free-form reasoning."""
from gameon.erne.contracts import Snapshot, ScheduleObservation, DiscoveryObservation, ToolFailure

NODES = {'decision': 'DECIDE', 'tool': 'TOOL', 'observation': 'OBSERVE', 'final': 'FINISH'}
TOOLS = {'read_game', 'schedule_game', 'discover_courts'}

def project_graph_events(result):
    evidence = {e.evidence_id: e for e in result.observations}
    events = []
    for sequence, trace in enumerate(result.trace, 1):
        observation = None
        item = evidence.get(trace.event_id)
        if item is not None:
            payload = item.payload
            if isinstance(payload, Snapshot):
                observation = dict(status='success', player_count=len(payload.players), slot_count=len(payload.slots))
            elif isinstance(payload, ScheduleObservation):
                observation = dict(status=payload.status, eligible_time_count=len(payload.matches))
            elif isinstance(payload, DiscoveryObservation):
                observation = dict(status=payload.status, slot_id=payload.slot_id, court_count=len(payload.candidates))
            elif isinstance(payload, ToolFailure):
                observation = dict(status='error', code=payload.code)
        events.append(dict(run_id=result.run_id, event_id=trace.event_id, sequence=sequence,
            node=NODES[trace.phase], tool=trace.name if trace.name in TOOLS else None,
            decision_source=trace.decision_source,
            reason_code=trace.selection.reason_code if trace.selection else None,
            observation=observation, iteration=trace.iteration,
            simulated=trace.simulated, fictional_demo=True,
            terminal_outcome=dict(action=result.action, outcome=result.outcome) if trace.phase=='final' else None))
    return events
