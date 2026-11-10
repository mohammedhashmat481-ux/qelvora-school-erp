import sys, time
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    b = p.chromium.launch(executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe', headless=True)
    page = b.new_page(viewport={'width': 1920, 'height': 1080})
    page.goto('https://school.qelvora.in/login')
    time.sleep(1.5)
    page.get_by_text('Student & Parent', exact=True).first.click()
    time.sleep(0.5)
    page.locator('button[type="submit"]').click()
    time.sleep(3)

    tabs = [
        ('Dashboard', 'p_dashboard.png'),
        ('Homework & Learning Map', 'p_homework.png'),
        ('Examination & Progress', 'p_exams.png'),
        ('Fees Due & Receipts', 'p_fees.png'),
        ('Safe Pickup & Campus Status', 'p_pickup.png')
    ]

    for name, shot in tabs:
        loc = page.get_by_text(name, exact=True).first
        if loc.is_visible():
            loc.click()
            time.sleep(1.5)
            page.screenshot(path=rf'D:\qelvora.in\dev_qelvora_school\{shot}')
            print(f'Captured {name} -> {shot}')
        else:
            print(f'{name} NOT VISIBLE')

    b.close()
