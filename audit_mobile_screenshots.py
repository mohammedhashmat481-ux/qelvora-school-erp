import sys, time
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    b = p.chromium.launch(executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe', headless=True)
    
    viewports = [
        ('mobile_375', {'width': 375, 'height': 812}),
        ('mobile_430', {'width': 430, 'height': 932}),
        ('tablet_768', {'width': 768, 'height': 1024}),
        ('desktop_1366', {'width': 1366, 'height': 768})
    ]
    
    for vp_name, vp in viewports:
        ctx = b.new_context(viewport=vp)
        page = ctx.new_page()
        
        # Test Login Page
        page.goto('https://school.qelvora.in/login')
        time.sleep(1.5)
        page.screenshot(path=rf'd:\qelvora.in\dev_qelvora_school\audit_{vp_name}_login.png')
        
        # Click admin demo and login
        admin_btn = page.get_by_text('Admin', exact=True).first
        if admin_btn.is_visible():
            admin_btn.click()
            time.sleep(0.3)
            page.locator('button[type="submit"]').click()
            time.sleep(3)
            page.screenshot(path=rf'd:\qelvora.in\dev_qelvora_school\audit_{vp_name}_admin_dashboard.png')
            
            # Check fees page
            page.goto('https://school.qelvora.in/fees')
            time.sleep(2)
            page.screenshot(path=rf'd:\qelvora.in\dev_qelvora_school\audit_{vp_name}_fees.png')
            
            # Check timetable / admin page
            page.goto('https://school.qelvora.in/admin')
            time.sleep(2)
            page.screenshot(path=rf'd:\qelvora.in\dev_qelvora_school\audit_{vp_name}_admin_page.png')

        ctx.close()
        print(f"Captured audit for {vp_name}")

    b.close()
