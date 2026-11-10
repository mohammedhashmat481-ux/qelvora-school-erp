import os
import sys
import time
import subprocess

if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

import imageio_ffmpeg
from playwright.sync_api import sync_playwright

CURSOR_ENGINE_JS = """
(() => {
    function setupCursor() {
        if (document.getElementById('virtual-cursor')) return;

        const style = document.createElement('style');
        style.id = 'virtual-cursor-style';
        style.innerHTML = `
            #virtual-cursor {
                position: fixed;
                top: 0;
                left: 0;
                width: 22px;
                height: 22px;
                background: #FACC15;
                border: 2.5px solid #0F172A;
                border-radius: 50% 50% 50% 0;
                box-shadow: 0 0 20px rgba(250, 204, 21, 1), 0 0 35px rgba(250, 204, 21, 0.85);
                pointer-events: none;
                z-index: 2147483647;
                will-change: transform;
                transform: translate3d(200px, 200px, 0) rotate(-45deg);
                transition: filter 0.15s ease;
            }
            #cursor-halo {
                position: fixed;
                top: 0;
                left: 0;
                width: 44px;
                height: 44px;
                border-radius: 50%;
                background: rgba(250, 204, 21, 0.28);
                border: 2px solid rgba(250, 204, 21, 0.85);
                pointer-events: none;
                z-index: 2147483646;
                will-change: transform;
                transform: translate3d(189px, 189px, 0);
            }
            @keyframes teacherRipple {
                0% { transform: scale(0.3); opacity: 1; border-width: 4px; }
                100% { transform: scale(3.4); opacity: 0; border-width: 1px; }
            }
            .cursor-ripple {
                position: fixed;
                width: 38px;
                height: 38px;
                border-radius: 50%;
                border: 3.5px solid #FACC15;
                box-shadow: 0 0 24px #FACC15;
                pointer-events: none;
                z-index: 2147483647;
                animation: teacherRipple 0.4s cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
            }
        `;
        document.head.appendChild(style);

        const halo = document.createElement('div');
        halo.id = 'cursor-halo';
        const cursor = document.createElement('div');
        cursor.id = 'virtual-cursor';

        document.body.appendChild(halo);
        document.body.appendChild(cursor);

        window.__cursorEl = cursor;
        window.__haloEl = halo;
        window.__curX = 200;
        window.__curY = 200;
    }

    if (document.body) {
        setupCursor();
    } else {
        document.addEventListener('DOMContentLoaded', setupCursor);
    }

    // 1. FAST Glide (180ms - 280ms) with snappy spring-like cubic ease
    window.__moveCursorFast = (targetX, targetY, durationMs = 220) => {
        return new Promise(resolve => {
            let resolved = false;
            const done = () => {
                if (!resolved) {
                    resolved = true;
                    window.__curX = targetX;
                    window.__curY = targetY;
                    if (window.__cursorEl) {
                        window.__cursorEl.style.transform = `translate3d(${targetX}px, ${targetY}px, 0) rotate(-45deg)`;
                    }
                    if (window.__haloEl) {
                        window.__haloEl.style.transform = `translate3d(${targetX - 11}px, ${targetY - 11}px, 0)`;
                    }
                    resolve();
                }
            };
            setTimeout(done, durationMs + 50);

            if (!window.__cursorEl || !window.__cursorEl.parentElement) {
                setupCursor();
            }
            const startX = window.__curX || targetX;
            const startY = window.__curY || targetY;
            const startTime = performance.now();

            function frame(now) {
                if (resolved) return;
                const elapsed = now - startTime;
                const p = Math.min(elapsed / durationMs, 1.0);
                
                // Snappy easeOutQuart (fast burst, crisp landing)
                const ease = 1 - Math.pow(1 - p, 4);
                const curX = startX + (targetX - startX) * ease;
                const curY = startY + (targetY - startY) * ease;

                if (window.__cursorEl) {
                    window.__cursorEl.style.transform = `translate3d(${curX}px, ${curY}px, 0) rotate(-45deg)`;
                }
                if (window.__haloEl) {
                    window.__haloEl.style.transform = `translate3d(${curX - 11}px, ${curY - 11}px, 0)`;
                }

                if (p < 1.0) {
                    requestAnimationFrame(frame);
                } else {
                    done();
                }
            }
            requestAnimationFrame(frame);
        });
    };

    // 2. Teacher Circle Gesture (circles around an element like teacher circling a number on board)
    window.__gestureCircle = (cx, cy, radius = 24, durationMs = 360) => {
        return new Promise(resolve => {
            const startTime = performance.now();
            function frame(now) {
                const elapsed = now - startTime;
                const p = Math.min(elapsed / durationMs, 1.0);
                const angle = p * Math.PI * 2 - Math.PI / 2;
                const curX = cx + Math.cos(angle) * radius;
                const curY = cy + Math.sin(angle) * radius;

                if (window.__cursorEl) {
                    window.__cursorEl.style.transform = `translate3d(${curX}px, ${curY}px, 0) rotate(-45deg)`;
                }
                if (window.__haloEl) {
                    window.__haloEl.style.transform = `translate3d(${curX - 11}px, ${curY - 11}px, 0)`;
                }

                if (p < 1.0) {
                    requestAnimationFrame(frame);
                } else {
                    window.__curX = cx;
                    window.__curY = cy;
                    resolve();
                }
            }
            requestAnimationFrame(frame);
        });
    };

    // 3. Teacher Underline Gesture (sweeps from startX to endX along a line)
    window.__gestureUnderline = (startX, endX, y, durationMs = 280) => {
        return new Promise(async resolve => {
            await window.__moveCursorFast(startX, y, durationMs * 0.4);
            await window.__moveCursorFast(endX, y, durationMs * 0.6);
            resolve();
        });
    };

    // 4. Ripple Click Animation
    window.__rippleAt = (x, y) => {
        const rip = document.createElement('div');
        rip.className = 'cursor-ripple';
        rip.style.left = (x - 19) + 'px';
        rip.style.top = (y - 19) + 'px';
        document.body.appendChild(rip);
        setTimeout(() => rip.remove(), 400);
    };
})();
"""

def fast_glide(page, x, y, duration_ms=220):
    page.evaluate(f"window.__moveCursorFast({x}, {y}, {duration_ms})")

def circle_at(page, x, y, radius=24, duration_ms=360):
    page.evaluate(f"window.__gestureCircle({x}, {y}, {radius}, {duration_ms})")

def underline_at(page, start_x, end_x, y, duration_ms=280):
    page.evaluate(f"window.__gestureUnderline({start_x}, {end_x}, {y}, {duration_ms})")

def fast_click(page, x, y, move_duration_ms=220):
    fast_glide(page, x, y, move_duration_ms)
    page.evaluate(f"window.__rippleAt && window.__rippleAt({x}, {y})")
    page.mouse.click(x, y)
    time.sleep(0.08)
    time.sleep(0.08)

def click_tab(page, tab_text, url):
    loc = page.get_by_text(tab_text, exact=True).first
    if loc.is_visible():
        box = loc.bounding_box()
        if box:
            cx = box["x"] + box["width"] / 2
            cy = box["y"] + box["height"] / 2
            fast_click(page, cx, cy, move_duration_ms=220)
            time.sleep(0.35)
            return
    page.goto(url)
    time.sleep(0.35)

def main():
    print("🎬 Starting Teacher-Style Fast & Animated Fees Walkthrough...")
    
    script_dir = os.path.dirname(os.path.abspath(__file__))
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    
    synced_audio = os.path.join(script_dir, "master_fees_audio.mp3")
    if not os.path.exists(synced_audio):
        print("❌ Master audio file not found:", synced_audio)
        return

    # Recording Directory
    video_dir = os.path.join(script_dir, "demo_output", "fees_teacher_raw")
    os.makedirs(video_dir, exist_ok=True)
    for old in os.listdir(video_dir):
        try: os.remove(os.path.join(video_dir, old))
        except: pass

    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe",
            headless=True
        )
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            record_video_dir=video_dir,
            record_video_size={"width": 1920, "height": 1080}
        )
        context.add_init_script(CURSOR_ENGINE_JS)
        page = context.new_page()

        # Login and start
        print("🔐 Logging into School ERP...")
        page.goto("https://school.qelvora.in/login")
        page.fill("input[type=email]", "admin@qelvora.in")
        page.fill("input[type=password]", "qelvora123")
        page.click("button[type=submit]")
        page.wait_for_url("**/dashboard", timeout=15000)
        time.sleep(0.8)
        
        page.goto("https://school.qelvora.in/fees?tab=overview")
        time.sleep(1.5)

        # ==========================================
        # SCENE 1: Overview & Financial Intelligence (12.290s)
        # Voice: "Welcome to Qelvora Fees Management. Monitor live daily collections, class-wise pending dues, and overall institutional revenue with real-time financial tracking."
        # ==========================================
        print("▶️ Scene 1: Overview & Active Gestures...")
        t0 = time.time()
        
        fast_glide(page, 960, 450, duration_ms=180)
        
        # "Welcome to Qelvora Fees Management..." -> Fast glide & underline title
        fast_glide(page, 220, 70, duration_ms=220)
        underline_at(page, 200, 420, 75, duration_ms=350)
        time.sleep(0.4)

        # "Monitor live daily collections..." -> Fast zip to Collected This Month & circle
        fast_glide(page, 728, 175, duration_ms=200)
        circle_at(page, 728, 175, radius=26, duration_ms=380)
        fast_click(page, 728, 175, move_duration_ms=150)
        time.sleep(0.4)

        # "...class-wise pending dues..." -> Fast zip to Total Pending Dues & circle
        fast_glide(page, 1035, 175, duration_ms=200)
        circle_at(page, 1035, 175, radius=28, duration_ms=380)
        
        # Zip to Students with dues & circle
        fast_glide(page, 1350, 175, duration_ms=200)
        circle_at(page, 1350, 175, radius=24, duration_ms=350)
        time.sleep(0.4)

        # "...and overall institutional revenue..." -> Fast zip down to Class-wise dues & underline
        fast_glide(page, 1260, 385, duration_ms=220)
        underline_at(page, 1150, 1420, 440, duration_ms=380)
        circle_at(page, 1550, 440, radius=20, duration_ms=320)
        underline_at(page, 1150, 1420, 505, duration_ms=380)

        # "...with real-time financial tracking." -> Fast zip to Recent Collections table
        fast_glide(page, 440, 385, duration_ms=220)
        underline_at(page, 340, 680, 450, duration_ms=380)

        elapsed = time.time() - t0
        print(f"Scene 1 done in {elapsed:.2f}s (target: 12.290s)")
        if elapsed < 12.290:
            time.sleep(12.290 - elapsed)

        # ==========================================
        # SCENE 2: Fee Heads Master (11.230s)
        # Voice: "Under Fee Heads, configure every fee category charged by your school, including monthly Tuition, Annual development, Computer Lab, and Examination fees."
        # ==========================================
        print("▶️ Scene 2: Fee Heads - Teacher Pointer...")
        t0 = time.time()

        # Fast zip and click Fee Heads tab
        click_tab(page, "Fee Heads", "https://school.qelvora.in/fees?tab=heads")
        time.sleep(0.3)

        # "...including monthly Tuition..." -> Fast zip to Tuition Fee, underline, circle Monthly badge
        fast_glide(page, 240, 460, duration_ms=200)
        underline_at(page, 200, 320, 460, duration_ms=280)
        fast_glide(page, 420, 460, duration_ms=180)
        circle_at(page, 420, 460, radius=20, duration_ms=320)

        # "...Annual development..." -> Fast zip to Annual Development Fee, underline
        fast_glide(page, 260, 510, duration_ms=180)
        underline_at(page, 200, 380, 510, duration_ms=280)
        fast_glide(page, 420, 510, duration_ms=180)
        circle_at(page, 420, 510, radius=20, duration_ms=300)

        # "...Computer Lab..." -> Fast zip to Computer & AI Lab Fee, underline
        fast_glide(page, 270, 560, duration_ms=180)
        underline_at(page, 200, 390, 560, duration_ms=280)
        fast_glide(page, 425, 560, duration_ms=180)
        circle_at(page, 425, 560, radius=20, duration_ms=300)

        # "...and Examination fees." -> Fast zip to Examination Fee, underline
        fast_glide(page, 280, 605, duration_ms=180)
        underline_at(page, 200, 420, 605, duration_ms=280)

        # Fast zip to + Add New Fee Head button & circle
        fast_glide(page, 1740, 365, duration_ms=240)
        circle_at(page, 1740, 365, radius=26, duration_ms=360)
        fast_click(page, 1740, 365, move_duration_ms=150)

        elapsed = time.time() - t0
        print(f"Scene 2 done in {elapsed:.2f}s (target: 11.230s)")
        if elapsed < 11.230:
            time.sleep(11.230 - elapsed)

        # ==========================================
        # SCENE 3: Quota Master (Categories) (12.050s)
        # Voice: "Quota Master empowers you to create custom admission categories, such as General, RTE with full tuition waiver, Staff Ward concessions, and Merit scholarships."
        # ==========================================
        print("▶️ Scene 3: Quota Master - Teacher Pointer...")
        t0 = time.time()

        click_tab(page, "Quota Master", "https://school.qelvora.in/fees?tab=quotas")
        time.sleep(0.3)

        # "...such as General..." -> Fast zip to General card, circle 28 students badge
        fast_glide(page, 300, 480, duration_ms=200)
        circle_at(page, 418, 500, radius=22, duration_ms=350)
        underline_at(page, 200, 380, 450, duration_ms=280)

        # "...RTE with full tuition waiver..." -> Fast zip to RTE card, underline 100% waiver, circle
        fast_glide(page, 580, 480, duration_ms=200)
        underline_at(page, 470, 700, 450, duration_ms=300)
        circle_at(page, 688, 500, radius=22, duration_ms=350)

        # "...Staff Ward concessions..." -> Fast zip to Staff Ward card, underline 50% concession, circle
        fast_glide(page, 840, 480, duration_ms=200)
        underline_at(page, 730, 950, 450, duration_ms=300)
        circle_at(page, 950, 500, radius=22, duration_ms=350)

        # "...and Merit scholarships." -> Fast zip to Merit Scholarship card, underline 25% concession
        fast_glide(page, 580, 660, duration_ms=200)
        underline_at(page, 470, 700, 630, duration_ms=300)
        circle_at(page, 688, 680, radius=22, duration_ms=350)

        elapsed = time.time() - t0
        print(f"Scene 3 done in {elapsed:.2f}s (target: 12.050s)")
        if elapsed < 12.050:
            time.sleep(12.050 - elapsed)

        # ==========================================
        # SCENE 4: Fee Structure & Terms (11.470s)
        # Voice: "Fee Structure lets you set multi-row fee grids for each class and quota, calculate annual demand, and automatically split fees into term installments."
        # ==========================================
        print("▶️ Scene 4: Fee Structure & Terms...")
        t0 = time.time()

        click_tab(page, "Fee Structure", "https://school.qelvora.in/fees?tab=structure")
        time.sleep(0.3)

        # "...multi-row fee grids for each class and quota..." -> Fast zip to Class 10th & Quota dropdowns
        fast_glide(page, 260, 425, duration_ms=200)
        circle_at(page, 260, 425, radius=22, duration_ms=300)
        fast_glide(page, 720, 425, duration_ms=200)
        circle_at(page, 720, 425, radius=22, duration_ms=300)

        # "...calculate annual demand..." -> Fast zip down over rows: Tuition -> Development -> AI Lab
        fast_glide(page, 320, 530, duration_ms=180)
        fast_glide(page, 950, 530, duration_ms=200)
        fast_glide(page, 950, 580, duration_ms=180)
        fast_glide(page, 950, 630, duration_ms=180)
        
        # Fast zip to Total Annual Payable (₹90,900) & circle
        fast_glide(page, 940, 785, duration_ms=200)
        circle_at(page, 940, 785, radius=26, duration_ms=380)

        # "...and automatically split fees into term installments." -> Scroll down & zip across 3 terms
        page.mouse.wheel(0, 160)
        time.sleep(0.2)
        fast_glide(page, 310, 890, duration_ms=200)
        circle_at(page, 310, 890, radius=24, duration_ms=320)
        fast_glide(page, 570, 890, duration_ms=200)
        circle_at(page, 570, 890, radius=24, duration_ms=320)
        fast_glide(page, 830, 890, duration_ms=200)
        circle_at(page, 830, 890, radius=24, duration_ms=320)

        elapsed = time.time() - t0
        print(f"Scene 4 done in {elapsed:.2f}s (target: 11.470s)")
        if elapsed < 11.470:
            time.sleep(11.470 - elapsed)

        # ==========================================
        # SCENE 5: Assign Student Quota (11.110s)
        # Voice: "With Assign Quota, you can easily group students into specific fee categories in bulk, ensuring each student is billed the correct customized structure."
        # ==========================================
        print("▶️ Scene 5: Assign Student Quota...")
        t0 = time.time()

        page.mouse.wheel(0, -160)
        time.sleep(0.2)
        click_tab(page, "Assign Quota", "https://school.qelvora.in/fees?tab=assign-quota")
        time.sleep(0.3)

        # "...easily group students into specific fee categories in bulk..." -> Fast zip to Class/Section dropdowns
        fast_glide(page, 240, 425, duration_ms=200)
        circle_at(page, 240, 425, radius=20, duration_ms=300)
        fast_glide(page, 340, 425, duration_ms=180)
        circle_at(page, 340, 425, radius=20, duration_ms=300)

        # "...ensuring each student is billed the correct customized structure." -> Fast zip student rows
        fast_glide(page, 380, 530, duration_ms=200)
        circle_at(page, 580, 530, radius=20, duration_ms=300)
        fast_glide(page, 380, 575, duration_ms=180)
        circle_at(page, 580, 575, radius=20, duration_ms=300)
        fast_glide(page, 380, 620, duration_ms=180)
        circle_at(page, 580, 620, radius=20, duration_ms=300)

        # Fast zip up to Assign To Quota & Apply to Selected button
        fast_glide(page, 830, 425, duration_ms=200)
        fast_glide(page, 920, 425, duration_ms=180)
        circle_at(page, 920, 425, radius=24, duration_ms=340)

        elapsed = time.time() - t0
        print(f"Scene 5 done in {elapsed:.2f}s (target: 11.110s)")
        if elapsed < 11.110:
            time.sleep(11.110 - elapsed)

        # ==========================================
        # SCENE 6: Student Fee Adjustment (Discounts & Waivers) (10.940s)
        # Voice: "Student Fee Adjustment allows you to grant individual fee discounts, merit waivers, or custom adjustments without altering the standard class fee structure."
        # ==========================================
        print("▶️ Scene 6: Student Fee Adjustment...")
        t0 = time.time()

        click_tab(page, "Student Adjustment", "https://school.qelvora.in/fees?tab=adjustments")
        time.sleep(0.3)

        # "...grant individual fee discounts, merit waivers..." -> Fast zip to student row & CLICK Adjust Fees
        fast_click(page, 1740, 646, move_duration_ms=220)
        time.sleep(0.5)

        # Drawer opens! Fast zip to Net Demand banner & circle
        fast_glide(page, 840, 592, duration_ms=200)
        circle_at(page, 840, 592, radius=24, duration_ms=350)

        # "...without altering the standard class fee structure." -> Fast zip to Tuition fee demand & concession
        fast_glide(page, 320, 715, duration_ms=200)
        underline_at(page, 200, 450, 715, duration_ms=300)
        fast_glide(page, 720, 715, duration_ms=200)
        circle_at(page, 720, 715, radius=20, duration_ms=300)

        # Fast zip up to + Add Adjustment button & circle
        fast_glide(page, 1760, 550, duration_ms=200)
        circle_at(page, 1760, 550, radius=24, duration_ms=360)
        fast_click(page, 1760, 550, move_duration_ms=150)

        elapsed = time.time() - t0
        print(f"Scene 6 done in {elapsed:.2f}s (target: 10.940s)")
        if elapsed < 10.940:
            time.sleep(10.940 - elapsed)

        # ==========================================
        # SCENE 7: Previous Year Balance Management (10.990s)
        # Voice: "Previous Year Balance tracks carried-forward student arrears, outstanding past balances, and historical reconciliations with one-click balance collection."
        # ==========================================
        print("▶️ Scene 7: Previous Year Balance...")
        t0 = time.time()

        click_tab(page, "Previous Balance", "https://school.qelvora.in/fees?tab=previous-balance")
        time.sleep(0.3)

        # "...tracks carried-forward student arrears..." -> Fast zip to Total Arrears Carried & circle ₹24,300
        fast_glide(page, 260, 530, duration_ms=200)
        circle_at(page, 260, 530, radius=26, duration_ms=360)

        # "...outstanding past balances..." -> Fast zip to Recovered / Cleared & circle ₹9,500
        fast_glide(page, 460, 530, duration_ms=200)
        circle_at(page, 460, 530, radius=26, duration_ms=360)

        # "...and historical reconciliations with one-click balance collection." -> Fast zip student row & Collect button
        fast_glide(page, 320, 855, duration_ms=200)
        underline_at(page, 200, 550, 855, duration_ms=300)
        fast_glide(page, 1740, 855, duration_ms=220)
        circle_at(page, 1740, 855, radius=24, duration_ms=350)
        fast_click(page, 1740, 855, move_duration_ms=150)

        elapsed = time.time() - t0
        print(f"Scene 7 done in {elapsed:.2f}s (target: 10.990s)")
        if elapsed < 10.990:
            time.sleep(10.990 - elapsed)

        # ==========================================
        # SCENE 8: Real-Time Fee Collection with Cash (13.370s)
        # Voice: "In Fee Collection, select any student to launch the collection desk. Choose fee heads, select Cash payment mode, and instantly collect dues with automated receipt generation."
        # ==========================================
        print("▶️ Scene 8: Fee Collection with Cash...")
        t0 = time.time()

        click_tab(page, "Fee Collection", "https://school.qelvora.in/fees?tab=collection")
        time.sleep(0.3)

        # "...select any student to launch the collection desk..." -> Fast zip & CLICK green Collect Fees button
        fast_click(page, 1746, 649, move_duration_ms=220)
        time.sleep(0.4)

        # Desk opens! Fast zip to Net Due banner & circle
        fast_glide(page, 1610, 592, duration_ms=200)
        circle_at(page, 1610, 592, radius=26, duration_ms=350)

        # Scroll down smoothly to reveal Cash payment counter
        page.mouse.wheel(0, 500)
        time.sleep(0.2)

        # "...Choose fee heads..." -> Fast zip across fee heads checkboxes
        fast_glide(page, 320, 510, duration_ms=200)
        circle_at(page, 195, 510, radius=18, duration_ms=260)
        fast_glide(page, 320, 560, duration_ms=180)
        circle_at(page, 195, 560, radius=18, duration_ms=260)

        # "...select Cash payment mode..." -> Fast zip directly onto Cash button & CLICK with ripple!
        fast_glide(page, 1400, 923, duration_ms=220)
        circle_at(page, 1400, 923, radius=24, duration_ms=350)
        fast_click(page, 1400, 923, move_duration_ms=150)

        # Fast zip to Cash Payment Counter banner
        fast_glide(page, 450, 930, duration_ms=200)
        underline_at(page, 200, 600, 930, duration_ms=300)

        # "...and instantly collect dues with automated receipt generation." -> Fast zip to Collect & Issue Receipt button
        fast_glide(page, 1550, 1040, duration_ms=220)
        circle_at(page, 1550, 1040, radius=28, duration_ms=380)
        fast_click(page, 1550, 1040, move_duration_ms=150)

        elapsed = time.time() - t0
        print(f"Scene 8 done in {elapsed:.2f}s (target: 13.370s)")
        if elapsed < 13.370:
            time.sleep(13.370 - elapsed)

        # ==========================================
        # SCENE 9: Receipts Ledger & Print (12.840s)
        # Voice: "The Receipts Ledger maintains a sequential, gap-free audit register of all transactions, complete with cashier details, payment modes, and instant A4 print previews."
        # ==========================================
        print("▶️ Scene 9: Receipts Ledger & Print...")
        t0 = time.time()

        page.mouse.wheel(0, -500)
        time.sleep(0.2)
        click_tab(page, "Receipts Ledger", "https://school.qelvora.in/fees?tab=receipts")
        time.sleep(0.3)

        # "...sequential, gap-free audit register of all transactions..." -> Fast zip to Receipt No & underline
        fast_glide(page, 340, 645, duration_ms=200)
        underline_at(page, 200, 480, 645, duration_ms=320)

        # "...complete with cashier details, payment modes..." -> Fast zip to Cashier & underline
        fast_glide(page, 720, 645, duration_ms=200)
        underline_at(page, 580, 850, 645, duration_ms=320)
        
        # Fast zip to Active badge & circle
        fast_glide(page, 1100, 645, duration_ms=180)
        circle_at(page, 1100, 645, radius=20, duration_ms=300)

        # Fast zip to row 2 & underline
        fast_glide(page, 340, 700, duration_ms=180)
        underline_at(page, 200, 480, 700, duration_ms=300)

        # "...and instant A4 print previews." -> Fast zip to Print icon & circle + tap
        fast_glide(page, 1765, 645, duration_ms=220)
        circle_at(page, 1765, 645, radius=24, duration_ms=360)
        fast_click(page, 1765, 645, move_duration_ms=150)

        elapsed = time.time() - t0
        print(f"Scene 9 done in {elapsed:.2f}s (target: 12.840s)")
        if elapsed < 12.840:
            time.sleep(12.840 - elapsed)

        # ==========================================
        # SCENE 10: Master Financial Conclusion (11.740s)
        # Voice: "Take complete control of your school finances with Qelvora ERP, from fee setup to daily cash collection. Simple, transparent, and error-free."
        # ==========================================
        print("▶️ Scene 10: Master Financial Conclusion...")
        t0 = time.time()

        click_tab(page, "Overview", "https://school.qelvora.in/fees?tab=overview")
        time.sleep(0.4)

        # "...from fee setup to daily cash collection..." -> Fast zip across top analytics & circle
        fast_glide(page, 728, 175, duration_ms=200)
        circle_at(page, 728, 175, radius=24, duration_ms=320)
        fast_glide(page, 1035, 175, duration_ms=200)
        circle_at(page, 1035, 175, radius=24, duration_ms=320)

        # "...Simple, transparent, and error-free." -> Fast zip up to Qelvora School logo & underline
        fast_glide(page, 220, 50, duration_ms=220)
        underline_at(page, 160, 420, 50, duration_ms=350)
        
        # Fast zip to Admin badge in header & concluding circle
        fast_glide(page, 920, 70, duration_ms=220)
        circle_at(page, 920, 70, radius=24, duration_ms=360)
        fast_glide(page, 920, 110, duration_ms=180)

        elapsed = time.time() - t0
        print(f"Scene 10 done in {elapsed:.2f}s (target: 11.740s)")
        if elapsed < 11.740:
            time.sleep(11.740 - elapsed)

        # Finish
        context.close()
        browser.close()
        print("✅ Raw video recorded with fast teacher gestures!")

    # Find raw video
    video_files = [os.path.join(video_dir, f) for f in os.listdir(video_dir) if f.endswith(".webm")]
    if not video_files:
        print("❌ No raw video file found!")
        return

    raw_video = video_files[0]
    final_output = os.path.join(script_dir, "qelvora_fees_teacher_walkthrough.mp4")

    print("🎬 Merging Fast 60 FPS Video + Synced Audio with FFmpeg...")
    merge_cmd = [
        ffmpeg_exe, "-y",
        "-i", raw_video,
        "-i", synced_audio,
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "18",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        final_output
    ]
    subprocess.run(merge_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)

    if os.path.exists(final_output):
        artifact_path = r"C:\Users\ASUS\.gemini\antigravity\brain\6e4b10f6-ccb7-41d3-9d70-2ba30d370386\qelvora_fees_teacher_walkthrough.mp4"
        try:
            import shutil
            shutil.copy2(final_output, artifact_path)
            print("✅ Copied to artifacts directory!")
        except Exception as e:
            print("Note copying artifact:", e)

        size_mb = os.path.getsize(final_output) / (1024 * 1024)
        print(f"🎉 TEACHER-STYLE FAST FEES WALKTHROUGH READY: {final_output} ({size_mb:.2f} MB)")
    else:
        print("❌ Video merge failed.")

if __name__ == "__main__":
    main()
