import sys, time
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    b = p.chromium.launch(executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe', headless=True)
    page = b.new_page(viewport={'width': 1920, 'height': 1080})
    page.goto('https://school.qelvora.in/login')
    page.fill('input[type=email]', 'admin@qelvora.in')
    page.fill('input[type=password]', 'qelvora123')
    page.click('button[type=submit]')
    page.wait_for_url('**/dashboard', timeout=15000)

    # 1. Adjust Fees
    page.goto('https://school.qelvora.in/fees?tab=adjustments')
    time.sleep(1.5)
    btn_adj = page.get_by_text('Adjust Fees', exact=False).first
    print('Adjust Fees box:', btn_adj.bounding_box() if btn_adj.is_visible() else 'NONE')

    # 2. Collect Fees & Cash
    page.goto('https://school.qelvora.in/fees?tab=collection')
    time.sleep(1.5)
    btn_col = page.get_by_text('Collect Fees', exact=True).first
    print('Collect Fees box:', btn_col.bounding_box() if btn_col.is_visible() else 'NONE')
    if btn_col.is_visible():
        btn_col.click()
        time.sleep(1)
        btn_cash = page.get_by_text('Cash', exact=True).first
        print('Cash button box:', btn_cash.bounding_box() if btn_cash.is_visible() else 'NONE')
        btn_issue = page.get_by_text('Issue Receipt', exact=False).first
        print('Issue Receipt button box:', btn_issue.bounding_box() if btn_issue.is_visible() else 'NONE')

    # 3. Previous balance Collect button
    page.goto('https://school.qelvora.in/fees?tab=previous-balance')
    time.sleep(1.5)
    btn_prev_col = page.locator('text=Collect').first
    print('Previous balance Collect button box:', btn_prev_col.bounding_box() if btn_prev_col.is_visible() else 'NONE')

    b.close()
