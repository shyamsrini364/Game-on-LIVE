"""Public fictional demo only. No real authentication, storage or provider routes."""
from pathlib import Path
from typing import Literal
import os
from threading import BoundedSemaphore
from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict
from demo_runtime import run_demo, fixture_day, DemoStore

app=FastAPI(title='Game On Week 3 fictional demo',docs_url=None,redoc_url=None,openapi_url=None)
capacity=BoundedSemaphore(2)

class Plan(BaseModel):
    model_config=ConfigDict(extra='forbid')
    scenario: Literal['A','B','C']

class Approval(Plan):
    day: str
    slot_id: Literal['slot-0','slot-1']
    venue_id: Literal['pickleholic-clayton','level-up-knox']
    approved: Literal[True]

@app.middleware('http')
async def safety(request: Request, call_next):
    from starlette.responses import JSONResponse
    if request.method=='POST' and len(await request.body())>2048:
        return JSONResponse({'detail':'Request too large'},status_code=413)
    response=await call_next(request)
    response.headers['Cache-Control']='no-store'
    response.headers['X-Content-Type-Options']='nosniff'
    response.headers['Referrer-Policy']='no-referrer'
    response.headers['Content-Security-Policy']="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://tiles.openfreemap.org; worker-src 'self' blob:; font-src 'self'; frame-ancestors 'none'; form-action 'none'; base-uri 'self'"
    return response

def execute(scenario):
    if not capacity.acquire(blocking=False): raise HTTPException(429,'Demo busy; retry shortly')
    try: return run_demo(scenario)
    finally: capacity.release()

@app.get('/api/health')
def health(): return dict(status='ok',demo=True,database='none',live_provider=False,paid_models=False)

@app.get('/api/map-config')
def map_config(): return dict(enabled=True,style_url='https://tiles.openfreemap.org/styles/liberty',resource_origins=['https://tiles.openfreemap.org'])

@app.get('/api/demo/setup')
def setup():
    game,_=DemoStore(fixture_day()).load_game_session('demo-game')
    return dict(slots=[dict(starts_at=s.starts_at.isoformat(),ends_at=s.ends_at.isoformat()) for s in game.slots])

@app.post('/api/demo/plan')
def plan(body: Plan): return execute(body.scenario)

@app.post('/api/demo/approve')
def approve(body: Approval):
    if body.day!=fixture_day(): raise HTTPException(409,'Demo day changed; reset and rerun')
    result=execute(body.scenario)
    choice=next((r for r in result['recommendations'] if r['selection']['venue_id']==body.venue_id and r['selection']['slot_id']==body.slot_id),None)
    if not choice: raise HTTPException(409,'Selection is not a successful scenario outcome')
    return dict(**choice,booking_status='not_booked',simulated=True)

app.mount('/',StaticFiles(directory=Path(__file__).parent/'web',html=True),name='web')

if __name__=='__main__':
    import uvicorn
    uvicorn.run(app,host='127.0.0.1',port=8020)
