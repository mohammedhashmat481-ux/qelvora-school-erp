import sys, time
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

CURSOR_ENGINE_JS = """
(() => {
    function setupCursor() {
        if (document.getElementById('virtual-cursor')) return;
        const style = document.createElement('style');
        style.id = 'virtual-cursor-style';
        style.innerHTML = `
            #virtual-cursor { position: fixed; top: 0; left: 0; width: 22px; height: 22px; background: #FACC15; border: 2.5px solid #0F172A; border-radius: 50% 50% 50% 0; pointer-events: none; z-index: 2147483647; }
        `;
        document.head.appendChild(style);
        const cursor = document.createElement('div');
        cursor.id = 'virtual-cursor';
        document.body.appendChild(cursor);
        window.__cursorEl = cursor;
    }
    if (document.body) setupCursor();
    else document.addEventListener('DOMContentLoaded', setupCursor);
    window.__moveCursorFast = (tx, ty, d = 220) => Promise.resolve();
    window.__gestureCircle = (cx, cy, r = 24, d = 360) => Promise.resolve();
    window.__gestureUnderline = (sx, ex, y, d = 280) => Promise.resolve();
})();
"""

scene_durations = [10.01, 11.35, 11.57, 11.14, 11.71, 11.59, 12.43]

with sync_playwright() as p:
    b = p.chromium.launch(executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe', headless=True)
    ctx = b.new_context(viewport={'width': 1920, 'height': 1080})
    ctx.add_init_script(CURSOR_ENGINE_JS)
    page = ctx.new_page()

    # Scene 1:
    t_target = scene_durations[0]
    t0 = time.time()
    page.goto('https://school.qelvora.in/login')
    time.sleep(0.6)
    page.get_by_text('Student & Parent', exact=True).first.click()
    time.sleep(0.4)
    page.locator('button[type="submit"]').first.click()
    t_actions = time.time() - t0
    print(f"Scene 1 actions took: {t_actions:.2f}s (target: {t_target:.2f}s)")
    if t_actions < t_target: time.sleep(t_target - t_actions)
    print(f"Scene 1 total: {time.time() - t0:.2f}s")

    # Scene 2:
    t_target = scene_durations[1]
    t0 = time.time()
    page.goto('https://school.qelvora.in/dashboard')
    t_actions = time.time() - t0
    print(f"Scene 2 nav took: {t_actions:.2f}s (target: {t_target:.2f}s)")

    b.close()
