import sys, time
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    b = p.chromium.launch(executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe', headless=True)
    page = b.new_page(viewport={'width': 1920, 'height': 1080})
    page.goto('https://school.qelvora.in/login')
    page.get_by_text('Student & Parent', exact=True).first.click()
    page.locator('button[type="submit"]').click()
    time.sleep(3)
    
    # print all links with href
    links = page.eval_on_selector_all('a', 'elements => elements.map(e => ({ text: e.innerText.trim(), href: e.href }))')
    for l in links:
        if l['text'] or 'student' in l['href']:
            print(f"Link: {l['text']} -> {l['href']}")
            
    b.close()
