import unittest
from demo_runtime import DemoStore, SimulatedInventory, fixture_day
from gameon.erne.graph import run_erne
from gameon.erne.contracts import RunRequest
from graph_events import project_graph_events, NODES

class GraphEventsTests(unittest.TestCase):
    def test_real_trace_projection(self):
        for scenario in 'ABC':
            result=run_erne(RunRequest(game_id='demo-game'),DemoStore(fixture_day()),discovery=SimulatedInventory(scenario))
            events=project_graph_events(result)
            self.assertEqual(len(events),len(result.trace))
            for i,(event,trace) in enumerate(zip(events,result.trace),1):
                self.assertEqual((event['event_id'],event['sequence'],event['iteration'],event['node']),
                    (trace.event_id,i,trace.iteration,NODES[trace.phase]))
                self.assertEqual(event['simulated'],trace.simulated)
                self.assertEqual(event['run_id'],result.run_id)
                self.assertNotIn('summary',event);self.assertNotIn('explanation',event)
                self.assertNotIn('offered_options',event)
            discovery=[e for e in events if e['node']=='OBSERVE' and e['tool']=='discover_courts']
            self.assertEqual([e['observation']['status'] for e in discovery],{'A':['results'],'B':['empty','results'],'C':['empty','empty']}[scenario])
            if scenario=='B':
                self.assertEqual(sum(e['node']=='TOOL' and e['tool']=='discover_courts' for e in events),2)
                self.assertTrue(any(e['reason_code']=='alternative_slot' for e in events))
            if scenario=='C':self.assertEqual(events[-1]['terminal_outcome']['action'],'REQUEST_HELP')

if __name__=='__main__':unittest.main()
