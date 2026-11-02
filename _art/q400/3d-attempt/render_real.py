import asyncio, base64, json, sys
from playwright.async_api import async_playwright
A='/tmp/claude-0/-home-claude/50225305-8dff-5630-9e06-d44c7e6a3126/scratchpad/art/'
async def main(opts, out):
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        pg=await b.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type in('error','warning') else None)
        await pg.goto('http://localhost:8799/real.html'); await pg.wait_for_function('window.ready===true', timeout=20000)
        url=await pg.evaluate('o=>window.renderPlane(o)', opts)
        open(out,'wb').write(base64.b64decode(url.split(',')[1]))
        print('ERRS',errs[:5]); await b.close()
asyncio.run(main(json.loads(sys.argv[1]), sys.argv[2]))
