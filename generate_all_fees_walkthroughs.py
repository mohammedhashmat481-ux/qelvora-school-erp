import os
import sys
import time
import subprocess
import shutil

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

    window.__moveCursorFast = (targetX, targetY, durationMs = 220) => {
        return new Promise(resolve => {
            let resolved = false;
            const done = () => {
                if (!resolved) {
                    resolved = true;
                    window.__curX = targetX;
                    window.__curY = targetY;
                    if (window.__cursorEl) window.__cursorEl.style.transform = `translate3d(${targetX}px, ${targetY}px, 0) rotate(-45deg)`;
                    if (window.__haloEl) window.__haloEl.style.transform = `translate3d(${targetX - 11}px, ${targetY - 11}px, 0)`;
                    resolve();
                }
            };
            setTimeout(done, durationMs + 40);

            if (!window.__cursorEl || !window.__cursorEl.parentElement) setupCursor();
            const startX = window.__curX || targetX;
            const startY = window.__curY || targetY;
            const startTime = performance.now();

            function frame(now) {
                if (resolved) return;
                const elapsed = now - startTime;
                const p = Math.min(elapsed / durationMs, 1.0);
                const ease = 1 - Math.pow(1 - p, 4);
                const curX = startX + (targetX - startX) * ease;
                const curY = startY + (targetY - startY) * ease;

                if (window.__cursorEl) window.__cursorEl.style.transform = `translate3d(${curX}px, ${curY}px, 0) rotate(-45deg)`;
                if (window.__haloEl) window.__haloEl.style.transform = `translate3d(${curX - 11}px, ${curY - 11}px, 0)`;

                if (p < 1.0) requestAnimationFrame(frame);
                else done();
            }
            requestAnimationFrame(frame);
        });
    };

    window.__gestureCircle = (cx, cy, radius = 24, durationMs = 360) => {
        return new Promise(resolve => {
            const startTime = performance.now();
            function frame(now) {
                const elapsed = now - startTime;
                const p = Math.min(elapsed / durationMs, 1.0);
                const angle = p * Math.PI * 2 - Math.PI / 2;
                const curX = cx + Math.cos(angle) * radius;
                const curY = cy + Math.sin(angle) * radius;

                if (window.__cursorEl) window.__cursorEl.style.transform = `translate3d(${curX}px, ${curY}px, 0) rotate(-45deg)`;
                if (window.__haloEl) window.__haloEl.style.transform = `translate3d(${curX - 11}px, ${curY - 11}px, 0)`;

                if (p < 1.0) requestAnimationFrame(frame);
                else {
                    window.__curX = cx;
                    window.__curY = cy;
                    resolve();
                }
            }
            requestAnimationFrame(frame);
        });
    };

    window.__gestureUnderline = (startX, endX, y, durationMs = 280) => {
        return new Promise(async resolve => {
            await window.__moveCursorFast(startX, y, durationMs * 0.4);
            await window.__moveCursorFast(endX, y, durationMs * 0.6);
            resolve();
        });
    };

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

def record_language_video(lang_code, lang_name, scene_durations, output_filename):
    script_dir = r"D:\qelvora.in\dev_qelvora_school\dev_inkedu-main"
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    master_audio = os.path.join(script_dir, f"master_{lang_code}.mp3")
    
    print(f"\n========================================================")
    print(f"🎬 RECORDING WALKTHROUGH: {lang_name.upper()} ({output_filename})")
    print(f"========================================================")

    video_dir = os.path.join(script_dir, "demo_output", f"raw_{lang_code}")
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

        print("🔐 Logging into School ERP...")
        page.goto("https://school.qelvora.in/login")
        page.fill("input[type=email]", "admin@qelvora.in")
        page.fill("input[type=password]", "qelvora123")
        page.click("button[type=submit]")
        page.wait_for_url("**/dashboard", timeout=15000)
        time.sleep(0.8)
        
        page.goto("https://school.qelvora.in/fees?tab=overview")
        time.sleep(1.5)

        # ----------------------------------------------------
        # SCENE 1: Overview & Financial Intelligence
        # ----------------------------------------------------
        t_target = scene_durations[0]
        print(f"▶️ Scene 1: Overview (target: {t_target:.2f}s)...")
        t0 = time.time()

        fast_glide(page, 960, 450, duration_ms=180)
        fast_glide(page, 220, 70, duration_ms=220)
        underline_at(page, 200, 420, 75, duration_ms=350)
        time.sleep(0.4)

        fast_glide(page, 728, 175, duration_ms=200)
        circle_at(page, 728, 175, radius=26, duration_ms=380)
        fast_click(page, 728, 175, move_duration_ms=150)
        time.sleep(0.4)

        fast_glide(page, 1035, 175, duration_ms=200)
        circle_at(page, 1035, 175, radius=28, duration_ms=380)
        fast_glide(page, 1350, 175, duration_ms=200)
        circle_at(page, 1350, 175, radius=24, duration_ms=350)
        time.sleep(0.4)

        fast_glide(page, 1260, 385, duration_ms=220)
        underline_at(page, 1150, 1420, 440, duration_ms=380)
        circle_at(page, 1550, 440, radius=20, duration_ms=320)
        underline_at(page, 1150, 1420, 505, duration_ms=380)

        fast_glide(page, 440, 385, duration_ms=220)
        underline_at(page, 340, 680, 450, duration_ms=380)

        elapsed = time.time() - t0
        if elapsed < t_target: time.sleep(t_target - elapsed)

        # ----------------------------------------------------
        # SCENE 2: Fee Heads Master
        # ----------------------------------------------------
        t_target = scene_durations[1]
        print(f"▶️ Scene 2: Fee Heads Master (target: {t_target:.2f}s)...")
        t0 = time.time()

        click_tab(page, "Fee Heads", "https://school.qelvora.in/fees?tab=heads")
        time.sleep(0.3)

        fast_glide(page, 240, 460, duration_ms=200)
        underline_at(page, 200, 320, 460, duration_ms=280)
        fast_glide(page, 420, 460, duration_ms=180)
        circle_at(page, 420, 460, radius=20, duration_ms=320)

        fast_glide(page, 260, 510, duration_ms=180)
        underline_at(page, 200, 380, 510, duration_ms=280)
        fast_glide(page, 420, 510, duration_ms=180)
        circle_at(page, 420, 510, radius=20, duration_ms=300)

        fast_glide(page, 270, 560, duration_ms=180)
        underline_at(page, 200, 390, 560, duration_ms=280)
        fast_glide(page, 425, 560, duration_ms=180)
        circle_at(page, 425, 560, radius=20, duration_ms=300)

        fast_glide(page, 280, 605, duration_ms=180)
        underline_at(page, 200, 420, 605, duration_ms=280)

        fast_glide(page, 1740, 365, duration_ms=240)
        circle_at(page, 1740, 365, radius=26, duration_ms=360)
        fast_click(page, 1740, 365, move_duration_ms=150)

        elapsed = time.time() - t0
        if elapsed < t_target: time.sleep(t_target - elapsed)

        # ----------------------------------------------------
        # SCENE 3: Quota Master (Categories)
        # ----------------------------------------------------
        t_target = scene_durations[2]
        print(f"▶️ Scene 3: Quota Master (target: {t_target:.2f}s)...")
        t0 = time.time()

        click_tab(page, "Quota Master", "https://school.qelvora.in/fees?tab=quotas")
        time.sleep(0.3)

        fast_glide(page, 300, 480, duration_ms=200)
        circle_at(page, 418, 500, radius=22, duration_ms=350)
        underline_at(page, 200, 380, 450, duration_ms=280)

        fast_glide(page, 580, 480, duration_ms=200)
        underline_at(page, 470, 700, 450, duration_ms=300)
        circle_at(page, 688, 500, radius=22, duration_ms=350)

        fast_glide(page, 840, 480, duration_ms=200)
        underline_at(page, 730, 950, 450, duration_ms=300)
        circle_at(page, 950, 500, radius=22, duration_ms=350)

        fast_glide(page, 580, 660, duration_ms=200)
        underline_at(page, 470, 700, 630, duration_ms=300)
        circle_at(page, 688, 680, radius=22, duration_ms=350)

        elapsed = time.time() - t0
        if elapsed < t_target: time.sleep(t_target - elapsed)

        # ----------------------------------------------------
        # SCENE 4: Fee Structure & Terms
        # ----------------------------------------------------
        t_target = scene_durations[3]
        print(f"▶️ Scene 4: Fee Structure (target: {t_target:.2f}s)...")
        t0 = time.time()

        click_tab(page, "Fee Structure", "https://school.qelvora.in/fees?tab=structure")
        time.sleep(0.3)

        fast_glide(page, 260, 425, duration_ms=200)
        circle_at(page, 260, 425, radius=22, duration_ms=300)
        fast_glide(page, 720, 425, duration_ms=200)
        circle_at(page, 720, 425, radius=22, duration_ms=300)

        fast_glide(page, 320, 530, duration_ms=180)
        fast_glide(page, 950, 530, duration_ms=200)
        fast_glide(page, 950, 580, duration_ms=180)
        fast_glide(page, 950, 630, duration_ms=180)
        
        fast_glide(page, 940, 785, duration_ms=200)
        circle_at(page, 940, 785, radius=26, duration_ms=380)

        page.mouse.wheel(0, 160)
        time.sleep(0.2)
        fast_glide(page, 310, 890, duration_ms=200)
        circle_at(page, 310, 890, radius=24, duration_ms=320)
        fast_glide(page, 570, 890, duration_ms=200)
        circle_at(page, 570, 890, radius=24, duration_ms=320)
        fast_glide(page, 830, 890, duration_ms=200)
        circle_at(page, 830, 890, radius=24, duration_ms=320)

        elapsed = time.time() - t0
        if elapsed < t_target: time.sleep(t_target - elapsed)

        # ----------------------------------------------------
        # SCENE 5: Assign Student Quota
        # ----------------------------------------------------
        t_target = scene_durations[4]
        print(f"▶️ Scene 5: Assign Quota (target: {t_target:.2f}s)...")
        t0 = time.time()

        page.mouse.wheel(0, -160)
        time.sleep(0.2)
        click_tab(page, "Assign Quota", "https://school.qelvora.in/fees?tab=assign-quota")
        time.sleep(0.3)

        fast_glide(page, 240, 425, duration_ms=200)
        circle_at(page, 240, 425, radius=20, duration_ms=300)
        fast_glide(page, 340, 425, duration_ms=180)
        circle_at(page, 340, 425, radius=20, duration_ms=300)

        fast_glide(page, 380, 530, duration_ms=200)
        circle_at(page, 580, 530, radius=20, duration_ms=300)
        fast_glide(page, 380, 575, duration_ms=180)
        circle_at(page, 580, 575, radius=20, duration_ms=300)
        fast_glide(page, 380, 620, duration_ms=180)
        circle_at(page, 580, 620, radius=20, duration_ms=300)

        fast_glide(page, 830, 425, duration_ms=200)
        fast_glide(page, 920, 425, duration_ms=180)
        circle_at(page, 920, 425, radius=24, duration_ms=340)

        elapsed = time.time() - t0
        if elapsed < t_target: time.sleep(t_target - elapsed)

        # ----------------------------------------------------
        # SCENE 6: Student Fee Adjustment
        # ----------------------------------------------------
        t_target = scene_durations[5]
        print(f"▶️ Scene 6: Student Adjustment (target: {t_target:.2f}s)...")
        t0 = time.time()

        click_tab(page, "Student Adjustment", "https://school.qelvora.in/fees?tab=adjustments")
        time.sleep(0.3)

        fast_click(page, 1740, 646, move_duration_ms=220)
        time.sleep(0.5)

        fast_glide(page, 840, 592, duration_ms=200)
        circle_at(page, 840, 592, radius=24, duration_ms=350)

        fast_glide(page, 320, 715, duration_ms=200)
        underline_at(page, 200, 450, 715, duration_ms=300)
        fast_glide(page, 720, 715, duration_ms=200)
        circle_at(page, 720, 715, radius=20, duration_ms=300)

        fast_glide(page, 1760, 550, duration_ms=200)
        circle_at(page, 1760, 550, radius=24, duration_ms=360)
        fast_click(page, 1760, 550, move_duration_ms=150)

        elapsed = time.time() - t0
        if elapsed < t_target: time.sleep(t_target - elapsed)

        # ----------------------------------------------------
        # SCENE 7: Previous Year Balance
        # ----------------------------------------------------
        t_target = scene_durations[6]
        print(f"▶️ Scene 7: Previous Balance (target: {t_target:.2f}s)...")
        t0 = time.time()

        click_tab(page, "Previous Balance", "https://school.qelvora.in/fees?tab=previous-balance")
        time.sleep(0.3)

        fast_glide(page, 260, 530, duration_ms=200)
        circle_at(page, 260, 530, radius=26, duration_ms=360)

        fast_glide(page, 460, 530, duration_ms=200)
        circle_at(page, 460, 530, radius=26, duration_ms=360)

        fast_glide(page, 320, 855, duration_ms=200)
        underline_at(page, 200, 550, 855, duration_ms=300)
        fast_glide(page, 1740, 855, duration_ms=220)
        circle_at(page, 1740, 855, radius=24, duration_ms=350)
        fast_click(page, 1740, 855, move_duration_ms=150)

        elapsed = time.time() - t0
        if elapsed < t_target: time.sleep(t_target - elapsed)

        # ----------------------------------------------------
        # SCENE 8: Real-Time Fee Collection with Cash
        # ----------------------------------------------------
        t_target = scene_durations[7]
        print(f"▶️ Scene 8: Cash Fee Collection (target: {t_target:.2f}s)...")
        t0 = time.time()

        click_tab(page, "Fee Collection", "https://school.qelvora.in/fees?tab=collection")
        time.sleep(0.3)

        fast_click(page, 1746, 649, move_duration_ms=220)
        time.sleep(0.4)

        fast_glide(page, 1610, 592, duration_ms=200)
        circle_at(page, 1610, 592, radius=26, duration_ms=350)

        page.mouse.wheel(0, 500)
        time.sleep(0.2)

        fast_glide(page, 320, 510, duration_ms=200)
        circle_at(page, 195, 510, radius=18, duration_ms=260)
        fast_glide(page, 320, 560, duration_ms=180)
        circle_at(page, 195, 560, radius=18, duration_ms=260)

        fast_glide(page, 1400, 923, duration_ms=220)
        circle_at(page, 1400, 923, radius=24, duration_ms=350)
        fast_click(page, 1400, 923, move_duration_ms=150)

        fast_glide(page, 450, 930, duration_ms=200)
        underline_at(page, 200, 600, 930, duration_ms=300)

        fast_glide(page, 1550, 1040, duration_ms=220)
        circle_at(page, 1550, 1040, radius=28, duration_ms=380)
        fast_click(page, 1550, 1040, move_duration_ms=150)

        elapsed = time.time() - t0
        if elapsed < t_target: time.sleep(t_target - elapsed)

        # ----------------------------------------------------
        # SCENE 9: Receipts Ledger & LIVE OFFICIAL RECEIPT INSPECTION
        # ----------------------------------------------------
        t_target = scene_durations[8]
        print(f"▶️ Scene 9: Receipts & Official Receipt Modal (target: {t_target:.2f}s)...")
        t0 = time.time()

        page.mouse.wheel(0, -500)
        time.sleep(0.2)
        click_tab(page, "Receipts Ledger", "https://school.qelvora.in/fees?tab=receipts")
        time.sleep(0.4)

        # Click the blue Print Receipt icon button to OPEN the full modal!
        fast_click(page, 1781, 656, move_duration_ms=220)
        time.sleep(0.8)

        # The official receipt modal is now OPEN in center screen!
        # Underline school name & CBSE affiliation in header
        fast_glide(page, 960, 350, duration_ms=220)
        underline_at(page, 800, 1120, 350, duration_ms=350)
        fast_glide(page, 960, 370, duration_ms=180)
        underline_at(page, 840, 1080, 370, duration_ms=300)

        # Circle OFFICIAL FEE RECEIPT badge
        fast_glide(page, 960, 410, duration_ms=180)
        circle_at(page, 960, 410, radius=22, duration_ms=350)

        # Circle Receipt No
        fast_glide(page, 410, 460, duration_ms=200)
        circle_at(page, 410, 460, radius=22, duration_ms=350)

        # Circle Student Name (Rishi Bose) & Roll No
        fast_glide(page, 1340, 460, duration_ms=200)
        circle_at(page, 1340, 460, radius=24, duration_ms=350)

        # Circle TOTAL PAID: ₹ 2,500
        fast_glide(page, 1420, 575, duration_ms=200)
        circle_at(page, 1420, 575, radius=26, duration_ms=380)

        # Underline Payment Mode: Cash & Authorized Signature
        fast_glide(page, 720, 640, duration_ms=200)
        underline_at(page, 620, 820, 640, duration_ms=300)
        fast_glide(page, 1320, 720, duration_ms=200)
        underline_at(page, 1200, 1440, 720, duration_ms=350)

        # Zip across print format toggles: A4 Full, Half Page, Thermal 80mm
        fast_glide(page, 1020, 275, duration_ms=200)
        circle_at(page, 1020, 275, radius=18, duration_ms=260)
        fast_glide(page, 1085, 275, duration_ms=160)
        circle_at(page, 1085, 275, radius=18, duration_ms=260)
        fast_glide(page, 1195, 275, duration_ms=160)
        circle_at(page, 1195, 275, radius=18, duration_ms=260)

        # Circle blue Print button on receipt modal
        fast_glide(page, 1300, 275, duration_ms=180)
        circle_at(page, 1300, 275, radius=22, duration_ms=340)

        # Close receipt modal
        fast_click(page, 1360, 275, move_duration_ms=160)
        time.sleep(0.3)

        elapsed = time.time() - t0
        if elapsed < t_target: time.sleep(t_target - elapsed)

        # ----------------------------------------------------
        # SCENE 10: Master Financial Conclusion
        # ----------------------------------------------------
        t_target = scene_durations[9]
        print(f"▶️ Scene 10: Conclusion (target: {t_target:.2f}s)...")
        t0 = time.time()

        click_tab(page, "Overview", "https://school.qelvora.in/fees?tab=overview")
        time.sleep(0.4)

        fast_glide(page, 728, 175, duration_ms=200)
        circle_at(page, 728, 175, radius=24, duration_ms=320)
        fast_glide(page, 1035, 175, duration_ms=200)
        circle_at(page, 1035, 175, radius=24, duration_ms=320)

        fast_glide(page, 220, 50, duration_ms=220)
        underline_at(page, 160, 420, 50, duration_ms=350)
        
        fast_glide(page, 920, 70, duration_ms=220)
        circle_at(page, 920, 70, radius=24, duration_ms=360)
        fast_glide(page, 920, 110, duration_ms=180)

        elapsed = time.time() - t0
        if elapsed < t_target: time.sleep(t_target - elapsed)

        context.close()
        browser.close()
        print(f"✅ Raw video for {lang_name} captured!")

    # Find raw webm video
    video_files = [os.path.join(video_dir, f) for f in os.listdir(video_dir) if f.endswith(".webm")]
    if not video_files:
        print("❌ No raw video file found!")
        return None

    raw_video = video_files[0]
    final_output = os.path.join(script_dir, output_filename)

    print(f"🎬 Merging {lang_name} video + audio with FFmpeg...")
    merge_cmd = [
        ffmpeg_exe, "-y",
        "-i", raw_video,
        "-i", master_audio,
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
        artifact_path = os.path.join(r"C:\Users\ASUS\.gemini\antigravity\brain\6e4b10f6-ccb7-41d3-9d70-2ba30d370386", output_filename)
        try:
            shutil.copy2(final_output, artifact_path)
            print(f"✅ Copied {output_filename} to artifacts directory!")
        except Exception as e:
            print("Note copying artifact:", e)

        size_mb = os.path.getsize(final_output) / (1024 * 1024)
        print(f"🎉 SUCCESS: {final_output} ({size_mb:.2f} MB)")
        return final_output
    else:
        print("❌ Merge failed.")
        return None

def main():
    # Scene durations measured directly from audio
    durations = {
        'en': [12.290, 11.230, 12.050, 11.470, 11.110, 10.940, 10.990, 13.370, 14.230, 11.740],
        'hi': [14.140, 11.590, 12.170, 12.220, 10.970, 10.820, 11.740, 12.380, 16.370, 12.820],
        'local': [14.740, 12.700, 13.200, 13.990, 11.470, 11.620, 12.100, 13.080, 18.530, 15.170]
    }

    # Generate all 3 walkthroughs
    record_language_video('en', 'English', durations['en'], 'qelvora_fees_walkthrough_english.mp4')
    record_language_video('hi', 'Hindi', durations['hi'], 'qelvora_fees_walkthrough_hindi.mp4')
    record_language_video('local', 'Local Dialect (Hindi-Urdu-English)', durations['local'], 'qelvora_fees_walkthrough_local_hinglish.mp4')

if __name__ == "__main__":
    main()
