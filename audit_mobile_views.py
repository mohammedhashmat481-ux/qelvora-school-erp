import sys, time
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    b = p.chromium.launch(executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe', headless=True)
    ctx = b.new_context(viewport={'width': 375, 'height': 812})
    page = ctx.new_page()
    page.goto('https://school.qelvora.in/login')
    page.get_by_text('Admin', exact=True).first.click()
    page.locator('button[type="submit"]').click()
    page.wait_for_url('**/dashboard', timeout=10000)
    time.sleep(1)
    
    # Click Menu button
    menu_btn = page.locator('button:has-text("Menu")').first
    menu_btn.click()
    time.sleep(0.5)
    page.screenshot(path=r'd:\qelvora.in\dev_qelvora_school\audit_mobile_drawer_open.png')
    
    # Also check what happens on teacher view
    ctx2 = b.new_context(viewport={'width': 375, 'height': 812})
    page2 = ctx2.new_page()
    page2.goto('https://school.qelvora.in/login')
    page2.get_by_text('Teacher', exact=True).first.click()
    page2.locator('button[type="submit"]').click()
    page2.wait_for_url('**/dashboard', timeout=10000)
    time.sleep(1)
    page2.screenshot(path=r'd:\qelvora.in\dev_qelvora_school\audit_mobile_teacher_dashboard.png')

    # Also check Student & Parent view
    ctx3 = b.new_context(viewport={'width': 375, 'height': 812})
    page3 = ctx3.new_page()
    page3.goto('https://school.qelvora.in/login')
    page3.get_by_text('Student & Parent', exact=True).first.click()
    page3.locator('button[type="submit"]').click()
    time.sleep(2)
    page3.screenshot(path=r'd:\qelvora.in\dev_qelvora_school\audit_mobile_parent_profile.png')

    b.close()
