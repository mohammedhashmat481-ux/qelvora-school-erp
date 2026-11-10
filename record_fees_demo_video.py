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

    // High performance 60 FPS GPU-accelerated cursor interpolation
    window.__moveCursorSmooth = (targetX, targetY, durationMs = 500) => {
        return new Promise(resolve => {
            if (!window.__cursorEl || !window.__cursorEl.parentElement) {
                setupCursor();
            }
            const startX = window.__curX || 200;
            const startY = window.__curY || 200;
            const startTime = performance.now();

            function frame(now) {
                const elapsed = now - startTime;
                const p = Math.min(elapsed / durationMs, 1.0);
                
                // Ease out cubic for silky-smooth motion
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
                    window.__curX = targetX;
                    window.__curY = targetY;
                    resolve();
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
    page.evaluate(f"window.__moveCursorSmooth({x}, {y}, {duration_ms})")

def smooth_click(page, x, y, move_duration_ms=400):
    smooth_glide(page, x, y, move_duration_ms)
    page.evaluate(f"window.__rippleAt && window.__rippleAt({x}, {y})")
    page.mouse.click(x, y)
    time.sleep(0.1)

def click_box(page, box, move_duration_ms=400):
    cx = box["x"] + box["width"] / 2
    cy = box["y"] + box["height"] / 2
    smooth_click(page, cx, cy, move_duration_ms)

def main():
    print("🎬 Starting 100% Synchronized Fees Management Demo Video...")
    
    script_dir = os.path.dirname(os.path.abspath(__file__))
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    
    audio_files = [
        "fee_1_overview.mp3",
        "fee_2_dues.mp3",
        "fee_3_collection.mp3",
        "fee_4_receipts.mp3",
        "fee_5_closing.mp3"
    ]
    
    # 1. Concat master audio track
    concat_list = os.path.join(script_dir, "fees_audio_concat.txt")
    with open(concat_list, "w", encoding="utf-8") as f:
        for a in audio_files:
            file_path = os.path.join(script_dir, a).replace("\\", "/")
            f.write(f"file '{file_path}'\n")

    synced_audio = os.path.join(script_dir, "synced_fees_voice_master.mp3")
    concat_cmd = [ffmpeg_exe, "-y", "-f", "concat", "-safe", "0", "-i", concat_list, "-c", "copy", synced_audio]
    subprocess.run(concat_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    print("✅ Master Fees Voice Track Ready:", synced_audio)

    # 2. Recording Directory
    video_dir = os.path.join(script_dir, "demo_output", "fees_raw")
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
        print("🔐 Preparing Fees Management Environment...")
        page.goto("https://school.qelvora.in/login")
        page.wait_for_load_state("networkidle")
        page.fill("input[type=email]", "admin@qelvora.in")
        page.fill("input[type=password]", "qelvora123")
        page.click("button[type=submit]")
        page.wait_for_url("**/dashboard", timeout=15000)
        
        # Navigate to Fees module
        page.goto("https://school.qelvora.in/fees")
        page.wait_for_load_state("networkidle")
        time.sleep(2.0)

        # ==========================================
        # SCENE 1 (Exact duration: 9.790s)
        # Voice: "Welcome to Qelvora Fees Management. Track real-time collections, student pending dues, and academic revenue at a glance."
        # ==========================================
        print("▶️ Recording Scene 1: Financial Dashboard & Metrics...")
        t0 = time.time()
        
        # Cursor starts centered
        page.evaluate("window.__moveCursorSmooth(960, 400, 200)")
        time.sleep(0.5)

        # "Welcome to Qelvora Fees Management..." -> Glide to title header
        smooth_glide(page, 320, 70, duration_ms=650)
        time.sleep(1.2)

        # "Track real-time collections..." -> Glide to COLLECTED THIS MONTH
        smooth_glide(page, 728, 175, duration_ms=650)
        time.sleep(1.2)

        # "...student pending dues..." -> Glide across TOTAL PENDING DUES & STUDENTS WITH DUES
        smooth_glide(page, 1035, 175, duration_ms=600)
        time.sleep(0.8)
        smooth_glide(page, 1350, 175, duration_ms=600)
        time.sleep(1.0)

        # "...and academic revenue at a glance." -> Glide to PENDING PERCENTAGE
        smooth_glide(page, 1670, 175, duration_ms=650)

        # Pad to exactly 9.790s
        elapsed = time.time() - t0
        print(f"Scene 1 action elapsed: {elapsed:.2f}s (target: 9.790s)")
        if elapsed < 9.790:
            time.sleep(9.790 - elapsed)

        # ==========================================
        # SCENE 2 (Exact duration: 7.940s)
        # Voice: "Monitor class-wise overdue balances and live collection streams with one hundred percent transparency."
        # ==========================================
        print("▶️ Recording Scene 2: Class-Wise Dues & Recent Collections...")
        t0 = time.time()

        # "Monitor class-wise overdue balances..." -> Glide to CLASS-WISE PENDING DUES
        smooth_glide(page, 1260, 385, duration_ms=650)
        time.sleep(0.8)

        # Glide across Class 10th-A and Class 9th-A dues
        smooth_glide(page, 1300, 440, duration_ms=600)
        time.sleep(0.7)
        smooth_glide(page, 1300, 505, duration_ms=600)
        time.sleep(0.7)

        # "...and live collection streams with one hundred percent transparency." -> Glide to RECENT COLLECTIONS table
        smooth_glide(page, 440, 385, duration_ms=650)
        time.sleep(0.8)

        # Glide over student rows in recent collections
        smooth_glide(page, 440, 450, duration_ms=600)
        time.sleep(0.6)
        smooth_glide(page, 640, 450, duration_ms=500)

        # Pad to exactly 7.940s
        elapsed = time.time() - t0
        print(f"Scene 2 action elapsed: {elapsed:.2f}s (target: 7.940s)")
        if elapsed < 7.940:
            time.sleep(7.940 - elapsed)

        # ==========================================
        # SCENE 3 (Exact duration: 7.780s)
        # Voice: "Collect fees in seconds. Select any student to open the instant itemized collection desk."
        # ==========================================
        print("▶️ Recording Scene 3: Instant 1-Click Fee Collection Desk...")
        t0 = time.time()

        # "Collect fees in seconds..." -> Glide to Fee Collection toolbar tab and CLICK
        smooth_click(page, 1226, 306, move_duration_ms=500)
        time.sleep(0.8)

        # "Select any student..." -> Glide to first student's green Collect Fees button
        smooth_glide(page, 1750, 649, duration_ms=650)
        time.sleep(0.8)

        # "...to open the instant itemized collection desk." -> CLICK Collect Fees with ripple
        page.evaluate("window.__rippleAt && window.__rippleAt(1750, 649)")
        page.mouse.click(1750, 649)
        time.sleep(0.8)

        # Drawer expands -> Glide to Net Due badge
        smooth_glide(page, 1610, 592, duration_ms=650)
        time.sleep(1.0)

        # Pad to exactly 7.780s
        elapsed = time.time() - t0
        print(f"Scene 3 action elapsed: {elapsed:.2f}s (target: 7.780s)")
        if elapsed < 7.780:
            time.sleep(7.780 - elapsed)

        # ==========================================
        # SCENE 4 (Exact duration: 6.720s)
        # Voice: "Issue instant printable fee receipts with gap-free audit tracking for complete accountability."
        # ==========================================
        print("▶️ Recording Scene 4: Gap-Free Receipts & Audit Ledger...")
        t0 = time.time()

        # "Issue instant printable fee receipts..." -> Glide to Receipts Ledger tab and CLICK
        smooth_click(page, 1374, 306, move_duration_ms=500)
        time.sleep(0.8)

        # "...with gap-free audit tracking..." -> Glide to Receipt Number and Cashier info
        smooth_glide(page, 440, 645, duration_ms=650)
        time.sleep(1.2)

        # "...for complete accountability." -> Glide to Print Receipt Action button on the right
        smooth_glide(page, 1765, 645, duration_ms=700)
        time.sleep(0.5)
        page.evaluate("window.__rippleAt && window.__rippleAt(1765, 645)")

        # Pad to exactly 6.720s
        elapsed = time.time() - t0
        print(f"Scene 4 action elapsed: {elapsed:.2f}s (target: 6.720s)")
        if elapsed < 6.720:
            time.sleep(6.720 - elapsed)

        # ==========================================
        # SCENE 5 (Exact duration: 7.660s)
        # Voice: "Automate your school fee collections with zero errors. Experience Qelvora ERP today."
        # ==========================================
        print("▶️ Recording Scene 5: Financial Overview & Closing...")
        t0 = time.time()

        # "Automate your school fee collections with zero errors..." -> Glide back to Overview tab and CLICK
        smooth_click(page, 370, 306, move_duration_ms=500)
        time.sleep(1.0)

        # "...Experience Qelvora ERP today." -> Glide smoothly to Qelvora School logo & Admin Header
        smooth_glide(page, 180, 50, duration_ms=750)
        time.sleep(1.0)
        smooth_glide(page, 880, 70, duration_ms=700)
        time.sleep(1.2)

        # Gentle concluding rest
        smooth_glide(page, 920, 110, duration_ms=500)

        # Pad to exactly 7.660s
        elapsed = time.time() - t0
        print(f"Scene 5 action elapsed: {elapsed:.2f}s (target: 7.660s)")
        if elapsed < 7.660:
            time.sleep(7.660 - elapsed)

        # Flush raw video
        context.close()
        browser.close()
        print("✅ Raw Fees Management video recorded!")

    # Find raw video
    video_files = [os.path.join(video_dir, f) for f in os.listdir(video_dir) if f.endswith(".webm")]
    if not video_files:
        print("❌ No raw video file found!")
        return

    raw_video = video_files[0]
    final_output = os.path.join(script_dir, "qelvora_fees_management_demo.mp4")

    print("🎬 Merging 60 FPS Fees Video + Synced Audio with FFmpeg...")
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
        artifact_path = r"C:\Users\ASUS\.gemini\antigravity\brain\6e4b10f6-ccb7-41d3-9d70-2ba30d370386\qelvora_fees_management_demo.mp4"
        try:
            import shutil
            shutil.copy2(final_output, artifact_path)
            print("✅ Copied to artifacts directory!")
        except Exception as e:
            print("Note copying artifact:", e)

        size_mb = os.path.getsize(final_output) / (1024 * 1024)
        print(f"🎉 100% PERFECT FEES DEMO GENERATED: {final_output} ({size_mb:.2f} MB)")
    else:
        print("❌ Video merge failed.")

if __name__ == "__main__":
    main()
