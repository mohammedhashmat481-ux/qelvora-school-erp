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

    urls = [
        ('dashboard', 'https://school.qelvora.in/dashboard'),
        ('profile', 'https://school.qelvora.in/student/profile'),
        ('examination', 'https://school.qelvora.in/student/examination'),
        ('fees', 'https://school.qelvora.in/student/fees'),
        ('pickup', 'https://school.qelvora.in/student/safe-pickup')
    ]

    for name, u in urls:
        page.goto(u)
        time.sleep(1.5)
        shot_path = rf'D:\qelvora.in\dev_qelvora_school\parent_{name}.png'
        page.screenshot(path=shot_path)
        print(f'=== {name.upper()} ({u}) ===')
        title = page.locator('h1, h2, h3').all_inner_texts()
        print('Headings:', [t.strip() for t in title if t.strip()][:6])

    b.close()
