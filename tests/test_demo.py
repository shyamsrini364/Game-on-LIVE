import unittest
from concurrent.futures import ThreadPoolExecutor
from fastapi.testclient import TestClient
from app import app

class DemoTests(unittest.TestCase):
    def test_scenarios_repeat_and_isolation(self):
        client=TestClient(app)
        for repeat in range(2):
            for scenario in 'ABC':
                r=client.post('/api/demo/plan',json={'scenario':scenario}).json()
                self.assertEqual(r['stop_reason'],'completed')
                self.assertFalse(r['llm_used'])
                self.assertTrue(r['simulated'])
                self.assertEqual(len(r['observed_slots']),1 if scenario=='A' else 2)
                if scenario=='B':
                    self.assertEqual([s['status'] for s in r['observed_slots']],['empty','results'])
                    self.assertTrue(any(e['stage']=='replanning' for e in r['activity_timeline']))
                    self.assertEqual(r['recommendations'][0]['selection']['slot_id'],'slot-1')
                if scenario=='C':
                    self.assertEqual(r['planning_state'],'needs_user_help');self.assertFalse(r['recommendations'])
                else:
                    choice=r['recommendations'][0]
                    self.assertEqual(choice['pricing']['participant_count'],2)
                    approval=client.post('/api/demo/approve',json={**choice['selection'],'approved':True})
                    self.assertEqual(approval.status_code,200)
                    self.assertEqual(approval.json()['booking_status'],'not_booked')
                    bad={**choice['selection'],'approved':True,'scenario':'C'}
                    self.assertEqual(client.post('/api/demo/approve',json=bad).status_code,409)

    def test_closed_routes_and_inputs(self):
        c=TestClient(app)
        for body in ({'scenario':'D'},{'scenario':'A','model':'paid'},{'scenario':'B','url':'https://example.com'}):
            self.assertEqual(c.post('/api/demo/plan',json=body).status_code,422)
        self.assertEqual(c.post('/api/games',json={}).status_code,405)
        self.assertEqual(c.get('/api/health').json()['database'],'none')
        self.assertEqual(c.get('/.env').status_code,404)
        self.assertEqual(c.get('/gameon/erne/playbypoint.py').status_code,404)

if __name__=='__main__':unittest.main()
