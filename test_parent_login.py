import sys, time
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    b = p.chromium.launch(executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe', headless=True)
    page = b.new_page(viewport={'width': 1920, 'height': 1080})
    page.goto('https://school.qelvora.in/login')
    time.sleep(1.5)

    # Click Student & Parent demo button
    page.get_by_text('Student & Parent', exact=True).first.click()
    time.sleep(1)

    # Click submit
    page.locator('button[type="submit"]').click()
    page.wait_for_url('**/**', timeout=15000)
    time.sleep(3)

    print('Logged in URL:', page.url)
    page.screenshot(path=r'D:\qelvora.in\dev_qelvora_school\parent_dashboard.png')
    print('Saved parent_dashboard.png')

    headings = page.locator('h1, h2, h3, h4').all_inner_texts()
    print('Headings:', [h.strip() for h in headings if h.strip()][:15])

    links = page.locator('a, button, [role=tab]').all_inner_texts()
    print('Links/Tabs:', [l.strip() for l in links if l.strip()][:30])

    b.close()
