import sys, time
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    b = p.chromium.launch(executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe', headless=True)
    page = b.new_page(viewport={'width': 1920, 'height': 1080})
    
    print('Loading https://school.qelvora.in/login ...')
    page.goto('https://school.qelvora.in/login')
    time.sleep(2)

    # Check the login tabs: Admin, Teacher, Student & Parent
    tabs = page.locator('button, [role=tab], a').all_inner_texts()
    print('Login buttons/tabs:', [t.strip() for t in tabs if t.strip()])

    # Check clicking Student & Parent tab
    p_tab = page.get_by_text('Student & Parent', exact=False).first
    if p_tab.is_visible():
        print('Found Student & Parent tab, clicking...')
        p_tab.click()
        time.sleep(1.5)
        page.screenshot(path='login_parent_tab.png')
        print('Inputs on Student & Parent tab:')
        for inp in page.locator('input, select, button').all_inner_texts():
            if inp.strip(): print(' -', inp.strip())

    # Also test checking URLs like /parent, /parents, /portal, /student
    for test_url in ['https://school.qelvora.in/parent', 'https://school.qelvora.in/student', 'https://school.qelvora.in/portal']:
        page.goto(test_url)
        time.sleep(1)
        print(f'Test {test_url} -> URL: {page.url}')

    b.close()
