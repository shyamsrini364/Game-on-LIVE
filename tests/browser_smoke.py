"""Live app and graph; fictional scenario data. Never navigate provider booking flow."""
import json,sys,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect

base=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8020'
out=Path('docs/screenshots');out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path=os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE') or None)
 for width in (1280,375):
  context=browser.new_context(viewport={'width':width,'height':900},permissions=['clipboard-read','clipboard-write'])
  page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(base);expect(page.locator('#scenario-label')).to_contain_text('Scenario A')
  for scenario in ('A','B','C','B','A'):
   page.select_option('#scenario',scenario)
   expect(page.locator('#handoff-panel')).to_be_hidden()
   expect(page.locator('.court-action-bar')).to_have_count(0)
   with page.expect_response('**/api/demo/plan',timeout=45000) as response:page.locator('#run-demo').click()
   r=response.value.json();assert r['scenario']==scenario and r['stop_reason']=='completed'
   expect(page.locator('#ernie-game-plan')).to_have_attribute('data-run-id',r['run_id'])
   if scenario=='C':
    expect(page.locator('.demo-help')).to_be_visible();expect(page.locator('.court-action-bar')).to_have_count(0)
   else:
    if '--live-map' in sys.argv:
     expect(page.locator('#group-map .street-map')).to_have_attribute('data-loaded','true',timeout=30000)
    page.get_by_role('button',name='Compare',exact=True).click();expect(page.get_by_role('dialog')).to_be_visible();page.get_by_role('button',name='Close comparison').click()
    page.get_by_role('button',name='Approve & continue',exact=False).click()
    expect(page.locator('#handoff-panel')).to_be_visible(timeout=45000)
    page.locator('#handoff-copy').click();expect(page.locator('#handoff-copy')).to_have_text('Copied!')
    copied=page.evaluate('navigator.clipboard.readText()');assert 'FICTIONAL DEMO' in copied and 'explicit user confirmation' in copied
    assert 'token' not in copied.lower() and 'cookie' not in copied.lower()
    # Observe the destination without contacting a provider or creating any hold.
    target=r['recommendations'][0]['venue']['booking_url'] or r['recommendations'][0]['venue']['website_url']
    context.route(target,lambda route:route.fulfill(content_type='text/html',body='<h1>Intercepted official landing URL. No booking.</h1>'))
    with page.expect_popup() as popup:page.locator('#handoff-open').click()
    expect(popup.value).to_have_url(target)
    expect(page.locator('#handoff-next-title')).to_contain_text('nothing booked')
    popup.value.close()
    expect(page.locator('#handoff-copy')).to_be_visible()
    with page.expect_download() as download:page.locator('#handoff-calendar').click()
    calendar=Path(download.value.path()).read_text();assert 'STATUS:TENTATIVE' in calendar and 'FICTIONAL DEMO' in calendar
    page.locator('#change-court').click()
    expect(page.locator('#ernie-game-plan')).to_have_attribute('data-run-id',r['run_id'])
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   page.screenshot(path=str(out/f'{scenario}-{width}.png'),full_page=True)
  page.locator('#reset').click();expect(page.locator('.court-action-bar')).to_have_count(0)
  expect(page.locator('#ernie-game-plan')).to_be_hidden()
  with page.expect_response('**/api/demo/plan',timeout=45000):
   page.locator('#run-demo').click();page.locator('#reset').click()
  expect(page.locator('#ernie-game-plan')).to_be_hidden()
  expect(page.locator('.court-action-bar')).to_have_count(0)
  assert not errors,errors
  context.close()
 browser.close()
print(json.dumps({'base':base,'widths':[1280,375],'scenarios':'A B C B A + reset','provider':'simulated','paid_model':False,'bookings':False,'passed':True}))
