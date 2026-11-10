import sys, time
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    b = p.chromium.launch(executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe', headless=True)
    page = b.new_page(viewport={'width': 1920, 'height': 1080})
    
    # 1. Login
    page.goto('https://school.qelvora.in/login')
    time.sleep(1)
    sp_btn = page.get_by_text('Student & Parent', exact=True).first
    print('Login SP btn box:', sp_btn.bounding_box())
    sub_btn = page.locator('button[type="submit"]')
    print('Login Submit btn box:', sub_btn.bounding_box())
    
    sp_btn.click()
    time.sleep(0.3)
    sub_btn.click()
    time.sleep(3)
    print("Logged in, current URL:", page.url)

    # 2. Profile
    print("\n--- PROFILE ELEMENTS ---")
    page.goto('https://school.qelvora.in/student/profile')
    time.sleep(2)
    # Get positions of Aarav Sharma, Sapphire, 94.6%, Guardians
    for text in ['Aarav Sharma', 'Grade 5-A', 'Sapphire House', '94.6%', 'Sunita Sharma', 'Rajesh Sharma', 'Government ID Verified']:
        loc = page.get_by_text(text, exact=False).first
        if loc.is_visible():
            print(f"Profile '{text}' box: {loc.bounding_box()}")

    # 3. Dashboard
    print("\n--- DASHBOARD ELEMENTS ---")
    page.goto('https://school.qelvora.in/dashboard')
    time.sleep(2)
    for text in ['Aarav Sharma', 'Attendance', 'Timetable', 'Period']:
        loc = page.get_by_text(text, exact=False).first
        if loc.is_visible():
            print(f"Dashboard '{text}' box: {loc.bounding_box()}")

    # 4. Examination
    print("\n--- EXAMINATION ELEMENTS ---")
    page.goto('https://school.qelvora.in/student/examination')
    time.sleep(2)
    for text in ['Exam', 'Progress', 'Mathematics', 'English', 'Science', 'Term']:
        loc = page.get_by_text(text, exact=False).first
        if loc.is_visible():
            print(f"Exam '{text}' box: {loc.bounding_box()}")

    # 5. Fees
    print("\n--- FEES ELEMENTS ---")
    page.goto('https://school.qelvora.in/student/fees')
    time.sleep(2)
    for text in ['Fees', '₹', 'Due', 'Tuition', 'Receipt', 'Pay']:
        loc = page.get_by_text(text, exact=False).first
        if loc.is_visible():
            print(f"Fees '{text}' box: {loc.bounding_box()}")

    # 6. Safe Pickup
    print("\n--- SAFE PICKUP ELEMENTS ---")
    page.goto('https://school.qelvora.in/student/safe-pickup')
    time.sleep(2)
    for text in ['Safe Pickup', 'Gate', 'Guardian', 'Security', 'Exit', 'Aarav']:
        loc = page.get_by_text(text, exact=False).first
        if loc.is_visible():
            print(f"Pickup '{text}' box: {loc.bounding_box()}")

    b.close()
