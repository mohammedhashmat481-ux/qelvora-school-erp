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
                box-shadow: 0 0 18px rgba(250, 204, 21, 0.95), 0 0 35px rgba(250, 204, 21, 0.7);
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
                background: rgba(250, 204, 21, 0.22);
                border: 2px solid rgba(250, 204, 21, 0.65);
                pointer-events: none;
                z-index: 2147483646;
                will-change: transform;
                transform: translate3d(189px, 189px, 0);
            }
            @keyframes rippleEffect {
                0% { transform: scale(0.3); opacity: 1; border-width: 3.5px; }
                100% { transform: scale(3.2); opacity: 0; border-width: 1px; }
            }
            .cursor-ripple {
                position: fixed;
                width: 36px;
                height: 36px;
                border-radius: 50%;
                border: 3px solid #FACC15;
                box-shadow: 0 0 22px #FACC15;
                pointer-events: none;
                z-index: 2147483647;
                animation: rippleEffect 0.45s cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
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

    // High performance 60 FPS GPU-accelerated cursor interpolation with timeout safety
    window.__moveCursorSmooth = (targetX, targetY, durationMs = 500) => {
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
            setTimeout(done, durationMs + 60);

            if (!window.__cursorEl || !window.__cursorEl.parentElement) {
                setupCursor();
            }
            const startX = window.__curX || 200;
            const startY = window.__curY || 200;
            const startTime = performance.now();

            function frame(now) {
                if (resolved) return;
                const elapsed = now - startTime;
                const p = Math.min(elapsed / durationMs, 1.0);
                
                // Ease out cubic
                const ease = 1 - Math.pow(1 - p, 3);
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

    window.__rippleAt = (x, y) => {
        const rip = document.createElement('div');
        rip.className = 'cursor-ripple';
        rip.style.left = (x - 18) + 'px';
        rip.style.top = (y - 18) + 'px';
        document.body.appendChild(rip);
        setTimeout(() => rip.remove(), 450);
    };
})();
"""

def smooth_glide(page, x, y, duration_ms=450):
    try:
        page.evaluate(f"window.__moveCursorSmooth({x}, {y}, {duration_ms})", timeout=duration_ms + 1000)
    except Exception:
        pass

def smooth_click(page, x, y, move_duration_ms=400):
    smooth_glide(page, x, y, move_duration_ms)
    try:
        page.evaluate(f"window.__rippleAt && window.__rippleAt({x}, {y})", timeout=500)
    except Exception:
        pass
    page.mouse.click(x, y)
    time.sleep(0.1)

def click_tab(page, tab_text, url):
    # Try finding the tab in horizontal bar or sidebar
    loc = page.get_by_text(tab_text, exact=True).first
    if loc.is_visible():
        box = loc.bounding_box()
        if box:
            cx = box["x"] + box["width"] / 2
            cy = box["y"] + box["height"] / 2
            smooth_click(page, cx, cy, move_duration_ms=400)
            time.sleep(0.4)
            return
    page.goto(url)
    time.sleep(0.4)

def main():
    print("🎬 Starting Master Fees Walkthrough (All Sub-Menus & Cash Collection)...")
    
    script_dir = os.path.dirname(os.path.abspath(__file__))
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    
    audio_files = [
        "f1_overview.mp3",
        "f2_heads.mp3",
        "f3_quotas.mp3",
        "f4_structure.mp3",
        "f5_assign.mp3",
        "f6_adjust.mp3",
        "f7_previous.mp3",
        "f8_collect_cash.mp3",
        "f9_receipts.mp3",
        "f10_closing.mp3"
    ]
    
    # 1. Concat master audio track
    concat_list = os.path.join(script_dir, "master_fees_concat.txt")
    with open(concat_list, "w", encoding="utf-8") as f:
        for a in audio_files:
            file_path = os.path.join(script_dir, a).replace("\\", "/")
            f.write(f"file '{file_path}'\n")

    synced_audio = os.path.join(script_dir, "master_fees_audio.mp3")
    concat_cmd = [ffmpeg_exe, "-y", "-f", "concat", "-safe", "0", "-i", concat_list, "-c", "copy", synced_audio]
    subprocess.run(concat_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    print("✅ Master Fees Voice Track Ready:", synced_audio)

    # 2. Setup Recording Directory
    video_dir = os.path.join(script_dir, "demo_output", "fees_master_raw")
    os.makedirs(video_dir, exist_ok=True)
    for old in os.listdir(video_dir):
        try: os.remove(os.path.join(video_dir, old))
        except: pass

    # 3. Launch Chrome with Playwright
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

        # Step 0: Login and navigate directly to Fees Management
        print("🔐 Logging into School ERP...")
        page.goto("https://school.qelvora.in/login")
        page.fill("input[type=email]", "admin@qelvora.in")
        page.fill("input[type=password]", "qelvora123")
        page.click("button[type=submit]")
        page.wait_for_url("**/dashboard", timeout=15000)
        time.sleep(1.0)
        
        # Open Fees module
        page.goto("https://school.qelvora.in/fees?tab=overview")
        time.sleep(2.0)

        # ==========================================
        # SCENE 1: Overview & Financial Intelligence (12.290s)
        # Voice: "Welcome to Qelvora Fees Management. Monitor live daily collections, class-wise pending dues, and overall institutional revenue with real-time financial tracking."
        # ==========================================
        print("▶️ Recording Scene 1: Overview & Financial Intelligence...")
        t0 = time.time()
        
        page.evaluate("window.__moveCursorSmooth(960, 450, 200)")
        time.sleep(0.5)

        # "Welcome to Qelvora Fees Management..." -> Glide to title header
        smooth_glide(page, 320, 70, duration_ms=650)
        time.sleep(1.2)

        # "Monitor live daily collections..." -> Glide to COLLECTED THIS MONTH
        smooth_glide(page, 728, 175, duration_ms=600)
        time.sleep(1.2)

        # "...class-wise pending dues..." -> Glide across TOTAL PENDING DUES & STUDENTS WITH DUES
        smooth_glide(page, 1035, 175, duration_ms=600)
        time.sleep(0.8)
        smooth_glide(page, 1350, 175, duration_ms=600)
        time.sleep(1.0)

        # "...and overall institutional revenue with real-time financial tracking." -> Glide to CLASS-WISE PENDING DUES
        smooth_glide(page, 1260, 385, duration_ms=650)
        time.sleep(1.0)
        smooth_glide(page, 1300, 440, duration_ms=600)

        elapsed = time.time() - t0
        print(f"Scene 1 action elapsed: {elapsed:.2f}s (target: 12.290s)")
        if elapsed < 12.290:
            time.sleep(12.290 - elapsed)

        # ==========================================
        # SCENE 2: Fee Heads Master (11.230s)
        # Voice: "Under Fee Heads, configure every fee category charged by your school, including monthly Tuition, Annual development, Computer Lab, and Examination fees."
        # ==========================================
        print("▶️ Recording Scene 2: Fee Heads Master...")
        t0 = time.time()

        # Click Fee Heads tab
        click_tab(page, "Fee Heads", "https://school.qelvora.in/fees?tab=heads")
        time.sleep(0.6)

        # "...monthly Tuition..." -> Glide to Tuition Fee
        smooth_glide(page, 240, 460, duration_ms=650)
        time.sleep(1.2)

        # "...Annual development..." -> Glide to Annual Development Fee
        smooth_glide(page, 260, 510, duration_ms=600)
        time.sleep(1.0)

        # "...Computer Lab..." -> Glide to Computer & AI Lab Fee
        smooth_glide(page, 270, 560, duration_ms=600)
        time.sleep(1.0)

        # "...and Examination fees." -> Glide to Examination Fee & Add New Button
        smooth_glide(page, 280, 605, duration_ms=600)
        time.sleep(0.8)
        smooth_glide(page, 1740, 365, duration_ms=650)

        elapsed = time.time() - t0
        print(f"Scene 2 action elapsed: {elapsed:.2f}s (target: 11.230s)")
        if elapsed < 11.230:
            time.sleep(11.230 - elapsed)

        # ==========================================
        # SCENE 3: Quota Master (Student Categories) (12.050s)
        # Voice: "Quota Master empowers you to create custom admission categories, such as General, RTE with full tuition waiver, Staff Ward concessions, and Merit scholarships."
        # ==========================================
        print("▶️ Recording Scene 3: Quota Master (Categories)...")
        t0 = time.time()

        # Click Quota Master tab
        click_tab(page, "Quota Master", "https://school.qelvora.in/fees?tab=quotas")
        time.sleep(0.6)

        # "...such as General..." -> Glide to General card
        smooth_glide(page, 300, 480, duration_ms=650)
        time.sleep(1.5)

        # "...RTE with full tuition waiver..." -> Glide to RTE card
        smooth_glide(page, 580, 480, duration_ms=700)
        time.sleep(1.6)

        # "...Staff Ward concessions..." -> Glide to Staff Ward card
        smooth_glide(page, 840, 480, duration_ms=700)
        time.sleep(1.6)

        # "...and Merit scholarships." -> Glide to Merit Scholarship card
        smooth_glide(page, 580, 660, duration_ms=700)

        elapsed = time.time() - t0
        print(f"Scene 3 action elapsed: {elapsed:.2f}s (target: 12.050s)")
        if elapsed < 12.050:
            time.sleep(12.050 - elapsed)

        # ==========================================
        # SCENE 4: Fee Structure & Term Installments (11.470s)
        # Voice: "Fee Structure lets you set multi-row fee grids for each class and quota, calculate annual demand, and automatically split fees into term installments."
        # ==========================================
        print("▶️ Recording Scene 4: Fee Structure & Terms...")
        t0 = time.time()

        # Click Fee Structure tab
        click_tab(page, "Fee Structure", "https://school.qelvora.in/fees?tab=structure")
        time.sleep(0.6)

        # "...multi-row fee grids for each class and quota..." -> Glide over Class/Quota dropdowns
        smooth_glide(page, 260, 425, duration_ms=650)
        time.sleep(1.0)
        smooth_glide(page, 720, 425, duration_ms=600)
        time.sleep(1.2)

        # "...calculate annual demand..." -> Glide to Total Annual Payable (₹90,900)
        smooth_glide(page, 940, 785, duration_ms=700)
        time.sleep(1.5)

        # "...and automatically split fees into term installments." -> Scroll down & glide to Term Installments
        page.mouse.wheel(0, 160)
        time.sleep(0.3)
        smooth_glide(page, 310, 890, duration_ms=650)
        time.sleep(0.8)
        smooth_glide(page, 570, 890, duration_ms=600)

        elapsed = time.time() - t0
        print(f"Scene 4 action elapsed: {elapsed:.2f}s (target: 11.470s)")
        if elapsed < 11.470:
            time.sleep(11.470 - elapsed)

        # ==========================================
        # SCENE 5: Assign Student Quota (11.110s)
        # Voice: "With Assign Quota, you can easily group students into specific fee categories in bulk, ensuring each student is billed the correct customized structure."
        # ==========================================
        print("▶️ Recording Scene 5: Assign Student Quota...")
        t0 = time.time()

        # Scroll up and click Assign Quota
        page.mouse.wheel(0, -160)
        time.sleep(0.3)
        click_tab(page, "Assign Quota", "https://school.qelvora.in/fees?tab=assign-quota")
        time.sleep(0.6)

        # "...easily group students into specific fee categories in bulk..." -> Glide to Class/Section
        smooth_glide(page, 240, 425, duration_ms=650)
        time.sleep(1.2)

        # "...ensuring each student is billed the correct customized structure." -> Glide across student rows
        smooth_glide(page, 380, 530, duration_ms=650)
        time.sleep(1.0)
        smooth_glide(page, 580, 530, duration_ms=600)
        time.sleep(1.2)
        # Glide to Assign To Quota and Apply to Selected button
        smooth_glide(page, 920, 425, duration_ms=650)

        elapsed = time.time() - t0
        print(f"Scene 5 action elapsed: {elapsed:.2f}s (target: 11.110s)")
        if elapsed < 11.110:
            time.sleep(11.110 - elapsed)

        # ==========================================
        # SCENE 6: Student Fee Adjustment (Discounts & Waivers) (10.940s)
        # Voice: "Student Fee Adjustment allows you to grant individual fee discounts, merit waivers, or custom adjustments without altering the standard class fee structure."
        # ==========================================
        print("▶️ Recording Scene 6: Student Fee Adjustment...")
        t0 = time.time()

        # Click Student Adjustment tab
        click_tab(page, "Student Adjustment", "https://school.qelvora.in/fees?tab=adjustments")
        time.sleep(0.6)

        # "...grant individual fee discounts, merit waivers..." -> Glide to student row and CLICK Adjust Fees
        smooth_click(page, 1740, 646, move_duration_ms=600)
        time.sleep(1.2)

        # Drawer opens with breakdown! -> Glide across Tuition Fee demand
        smooth_glide(page, 320, 715, duration_ms=650)
        time.sleep(1.2)

        # "...without altering the standard class fee structure." -> Glide to + Add Adjustment button
        smooth_glide(page, 1760, 550, duration_ms=700)
        time.sleep(0.5)
        page.evaluate("window.__rippleAt && window.__rippleAt(1760, 550)")

        elapsed = time.time() - t0
        print(f"Scene 6 action elapsed: {elapsed:.2f}s (target: 10.940s)")
        if elapsed < 10.940:
            time.sleep(10.940 - elapsed)

        # ==========================================
        # SCENE 7: Previous Year Balance Management (10.990s)
        # Voice: "Previous Year Balance tracks carried-forward student arrears, outstanding past balances, and historical reconciliations with one-click balance collection."
        # ==========================================
        print("▶️ Recording Scene 7: Previous Year Balance...")
        t0 = time.time()

        # Click Previous Balance tab
        click_tab(page, "Previous Balance", "https://school.qelvora.in/fees?tab=previous-balance")
        time.sleep(0.6)

        # "...tracks carried-forward student arrears..." -> Glide to Total Arrears Carried card
        smooth_glide(page, 260, 530, duration_ms=650)
        time.sleep(1.2)

        # "...outstanding past balances..." -> Glide to Recovered / Cleared card
        smooth_glide(page, 460, 530, duration_ms=600)
        time.sleep(1.0)

        # "...and historical reconciliations with one-click balance collection." -> Glide to student row and Collect button
        smooth_glide(page, 320, 855, duration_ms=650)
        time.sleep(1.0)
        smooth_glide(page, 1740, 855, duration_ms=650)
        time.sleep(0.4)
        page.evaluate("window.__rippleAt && window.__rippleAt(1740, 855)")

        elapsed = time.time() - t0
        print(f"Scene 7 action elapsed: {elapsed:.2f}s (target: 10.990s)")
        if elapsed < 10.990:
            time.sleep(10.990 - elapsed)

        # ==========================================
        # SCENE 8: Real-Time Fee Collection with Cash (13.370s)
        # Voice: "In Fee Collection, select any student to launch the collection desk. Choose fee heads, select Cash payment mode, and instantly collect dues with automated receipt generation."
        # ==========================================
        print("▶️ Recording Scene 8: Fee Collection with Cash...")
        t0 = time.time()

        # Click Collection tab
        click_tab(page, "Fee Collection", "https://school.qelvora.in/fees?tab=collection")
        time.sleep(0.6)

        # "...select any student to launch the collection desk..." -> CLICK green Collect Fees button
        smooth_click(page, 1746, 649, move_duration_ms=500)
        time.sleep(1.0)

        # Desk opens! Glide over Net Due banner
        smooth_glide(page, 1610, 592, duration_ms=600)
        time.sleep(0.8)

        # Scroll down to reveal payment mode & cash counter
        page.mouse.wheel(0, 500)
        time.sleep(0.4)

        # "...Choose fee heads..." -> Glide over fee heads
        smooth_glide(page, 320, 510, duration_ms=600)
        time.sleep(1.0)

        # "...select Cash payment mode..." -> Glide directly onto the green Cash button and ripple!
        smooth_glide(page, 1400, 923, duration_ms=650)
        time.sleep(0.5)
        page.evaluate("window.__rippleAt && window.__rippleAt(1400, 923)")
        time.sleep(1.2)

        # "...and instantly collect dues with automated receipt generation." -> Glide to Collect & Issue Receipt button
        smooth_glide(page, 1550, 1040, duration_ms=700)
        time.sleep(0.5)
        page.evaluate("window.__rippleAt && window.__rippleAt(1550, 1040)")

        elapsed = time.time() - t0
        print(f"Scene 8 action elapsed: {elapsed:.2f}s (target: 13.370s)")
        if elapsed < 13.370:
            time.sleep(13.370 - elapsed)

        # ==========================================
        # SCENE 9: Receipts Ledger & Audit (12.840s)
        # Voice: "The Receipts Ledger maintains a sequential, gap-free audit register of all transactions, complete with cashier details, payment modes, and instant A4 print previews."
        # ==========================================
        print("▶️ Recording Scene 9: Receipts Ledger & Print...")
        t0 = time.time()

        # Scroll back up and click Receipts tab
        page.mouse.wheel(0, -500)
        time.sleep(0.3)
        click_tab(page, "Receipts Ledger", "https://school.qelvora.in/fees?tab=receipts")
        time.sleep(0.6)

        # "...sequential, gap-free audit register of all transactions..." -> Glide to Receipt Number
        smooth_glide(page, 340, 645, duration_ms=650)
        time.sleep(1.2)

        # "...complete with cashier details, payment modes..." -> Glide to Cashier and Status
        smooth_glide(page, 720, 645, duration_ms=650)
        time.sleep(1.2)
        smooth_glide(page, 1100, 645, duration_ms=600)
        time.sleep(1.0)

        # "...and instant A4 print previews." -> Glide to Print icon button on the right and ripple!
        smooth_glide(page, 1765, 645, duration_ms=700)
        time.sleep(0.5)
        page.evaluate("window.__rippleAt && window.__rippleAt(1765, 645)")

        elapsed = time.time() - t0
        print(f"Scene 9 action elapsed: {elapsed:.2f}s (target: 12.840s)")
        if elapsed < 12.840:
            time.sleep(12.840 - elapsed)

        # ==========================================
        # SCENE 10: Conclusion & Comprehensive Control (11.740s)
        # Voice: "Take complete control of your school finances with Qelvora ERP, from fee setup to daily cash collection. Simple, transparent, and error-free."
        # ==========================================
        print("▶️ Recording Scene 10: Master Financial Conclusion...")
        t0 = time.time()

        # Return to Overview
        click_tab(page, "Overview", "https://school.qelvora.in/fees?tab=overview")
        time.sleep(0.8)

        # "...from fee setup to daily cash collection..." -> Glide across top analytics
        smooth_glide(page, 728, 175, duration_ms=700)
        time.sleep(1.2)
        smooth_glide(page, 1035, 175, duration_ms=650)
        time.sleep(1.2)

        # "...Simple, transparent, and error-free." -> Glide up to institutional branding & Admin badge
        smooth_glide(page, 180, 50, duration_ms=750)
        time.sleep(1.2)
        smooth_glide(page, 920, 70, duration_ms=700)
        time.sleep(1.0)
        smooth_glide(page, 920, 110, duration_ms=500)

        elapsed = time.time() - t0
        print(f"Scene 10 action elapsed: {elapsed:.2f}s (target: 11.740s)")
        if elapsed < 11.740:
            time.sleep(11.740 - elapsed)

        # Finish recording
        context.close()
        browser.close()
        print("✅ Master Fees Walkthrough raw video recorded!")

    # Find raw video
    video_files = [os.path.join(video_dir, f) for f in os.listdir(video_dir) if f.endswith(".webm")]
    if not video_files:
        print("❌ No raw video file found!")
        return

    raw_video = video_files[0]
    final_output = os.path.join(script_dir, "qelvora_fees_master_walkthrough.mp4")

    print("🎬 Merging 60 FPS Master Video + Synced Audio with FFmpeg...")
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
        artifact_path = r"C:\Users\ASUS\.gemini\antigravity\brain\6e4b10f6-ccb7-41d3-9d70-2ba30d370386\qelvora_fees_master_walkthrough.mp4"
        try:
            import shutil
            shutil.copy2(final_output, artifact_path)
            print("✅ Copied to artifacts directory!")
        except Exception as e:
            print("Note copying artifact:", e)

        size_mb = os.path.getsize(final_output) / (1024 * 1024)
        print(f"🎉 MASTER FEES WALKTHROUGH GENERATED: {final_output} ({size_mb:.2f} MB)")
    else:
        print("❌ Video merge failed.")

if __name__ == "__main__":
    main()
