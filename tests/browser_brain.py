"""Real graph API + recorded replay, with simulated inventory. No provider actions."""
import os,sys,json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
base=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8020'
out=Path('docs/screenshots');out.mkdir(exist_ok=True,parents=True)
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE'),headless=True)
    for width in (1280,375):
        context=browser.new_context(viewport={'width':width,'height':900},reduced_motion='reduce')
        page=context.new_page();calls=[];errors=[]
        page.on('request',lambda r:calls.append(r.url) if '/api/demo/plan' in r.url or '/api/demo/approve' in r.url else None)
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(base)
        for scenario in 'ABC':
            page.select_option('#scenario',scenario)
            expect(page.locator('#demo-home')).to_be_visible()
            expect(page.locator('#agent-brain')).to_be_hidden()
            page.locator('#demo-start').click();page.locator('#demo-next').click();page.locator('#demo-next').click()
            with page.expect_response('**/api/demo/plan',timeout=45000) as response:page.locator('#run-demo').click()
            result=response.value.json();events=result['graph_events'];count=len(calls)
            summary=page.locator('#agent-brain summary');summary.focus();page.keyboard.press('Enter')
            expect(page.locator('#brain-next')).to_be_visible()
            for index,event in enumerate(events):
                expect(page.locator('#brain-position')).to_contain_text(f"Event {event['sequence']} of")
                expect(page.locator('#agent-brain [data-node].active')).to_have_attribute('data-node',event['node'])
                if event['observation'] and event['observation'].get('slot_id')=='slot-0' and event['observation']['status']=='empty':
                    expect(page.locator('#brain-court-evidence')).to_contain_text('0 available courts for the first agreed time')
                    page.locator('#agent-brain').screenshot(path=str(out/f'brain-{scenario}-{width}.png'))
                if index<len(events)-1:page.locator('#brain-next').click()
            if scenario=='C':
                expect(page.locator('#brain-description')).to_contain_text('REQUEST_HELP')
                expect(page.locator('.court-action-bar')).to_have_count(0)
            if scenario=='A':page.locator('#agent-brain').screenshot(path=str(out/f'brain-A-{width}.png'))
            page.locator('#brain-prev').click();expect(page.locator('#brain-position')).to_contain_text(f'Event {len(events)-1} of')
            page.locator('#brain-reset').click();expect(page.locator('#brain-position')).to_contain_text('Event 1 of')
            page.locator('#brain-play').click();expect(page.locator('#brain-position')).to_contain_text('Event 2 of',timeout=5000)
            page.locator('#brain-play').click();assert len(calls)==count
            if scenario!='C':
                page.get_by_role('button',name='Approve & continue',exact=False).click()
                expect(page.locator('#handoff-panel')).to_be_visible(timeout=45000)
                before=page.locator('#handoff-when').text_content();count=len(calls)
                page.locator('#change-court').click();page.locator('#brain-reset').click()
                page.locator('#game-steps [data-step=handoff] button').click()
                expect(page.locator('#handoff-when')).to_have_text(before);assert len(calls)==count
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
            page.locator('#reset').click();expect(page.locator('#agent-brain')).to_be_hidden()
        assert not errors,errors
        context.close()
    browser.close()
print(json.dumps(dict(passed=True,base=base,widths=[1280,375],scenarios='ABC',replay_network_calls=0,reduced_motion=True)))
