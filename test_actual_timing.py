import sys, time
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    b = p.chromium.launch(executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe', headless=True)
    ctx = b.new_context(viewport={'width': 1920, 'height': 1080})
    page = ctx.new_page()

    scene_durations = [10.01, 11.35, 11.57, 11.14, 11.71, 11.59, 12.43]
    t_global = time.time()

    # S1
    t0 = time.time()
    page.goto("https://school.qelvora.in/login")
    time.sleep(0.6)
    page.get_by_text('Student & Parent', exact=True).first.click()
    page.locator('button[type="submit"]').first.click()
    elapsed = time.time() - t0
    t_target = scene_durations[0]
    if elapsed < t_target: time.sleep(t_target - elapsed)
    print(f"S1 duration: {time.time() - t0:.2f}s (target: {t_target})")

    # S2
    t0 = time.time()
    page.goto("https://school.qelvora.in/dashboard")
    elapsed = time.time() - t0
    t_target = scene_durations[1]
    if elapsed < t_target: time.sleep(t_target - elapsed)
    print(f"S2 duration: {time.time() - t0:.2f}s (target: {t_target})")

    # S3
    t0 = time.time()
    page.goto("https://school.qelvora.in/student/profile")
    elapsed = time.time() - t0
    t_target = scene_durations[2]
    if elapsed < t_target: time.sleep(t_target - elapsed)
    print(f"S3 duration: {time.time() - t0:.2f}s (target: {t_target})")

    # S4
    t0 = time.time()
    elapsed = time.time() - t0
    t_target = scene_durations[3]
    if elapsed < t_target: time.sleep(t_target - elapsed)
    print(f"S4 duration: {time.time() - t0:.2f}s (target: {t_target})")

    # S5
    t0 = time.time()
    page.goto("https://school.qelvora.in/student/examination")
    elapsed = time.time() - t0
    t_target = scene_durations[4]
    if elapsed < t_target: time.sleep(t_target - elapsed)
    print(f"S5 duration: {time.time() - t0:.2f}s (target: {t_target})")

    # S6
    t0 = time.time()
    page.goto("https://school.qelvora.in/student/fees")
    elapsed = time.time() - t0
    t_target = scene_durations[5]
    if elapsed < t_target: time.sleep(t_target - elapsed)
    print(f"S6 duration: {time.time() - t0:.2f}s (target: {t_target})")

    # S7
    t0 = time.time()
    page.goto("https://school.qelvora.in/student/safe-pickup")
    elapsed = time.time() - t0
    t_target = scene_durations[6]
    if elapsed < t_target: time.sleep(t_target - elapsed)
    print(f"S7 duration: {time.time() - t0:.2f}s (target: {t_target})")

    print(f"TOTAL SCRIPT TIME: {time.time() - t_global:.2f}s")
    b.close()
