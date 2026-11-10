import sys, time
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    b = p.chromium.launch(executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe', headless=True)
    page = b.new_page(viewport={'width': 1920, 'height': 1080})
    page.goto('https://school.qelvora.in/login')
    page.get_by_text('Student & Parent', exact=True).first.click()
    page.locator('button[type="submit"]').click()
    time.sleep(2)

    links = page.locator('nav a, aside a, a').all()
    for a in links:
        txt = a.inner_text().strip()
        href = a.get_attribute('href')
        if txt and href:
            print(f'{txt} -> {href}')

    b.close()
