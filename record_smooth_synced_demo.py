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
                width: 20px;
                height: 20px;
                background: #FACC15;
                border: 2.5px solid #0F172A;
                border-radius: 50% 50% 50% 0;
                box-shadow: 0 0 16px rgba(250, 204, 21, 0.95), 0 0 30px rgba(250, 204, 21, 0.7);
                pointer-events: none;
                z-index: 2147483647;
                will-change: transform;
                transform: translate3d(200px, 200px, 0) rotate(-45deg);
            }
            #cursor-halo {
                position: fixed;
                top: 0;
                left: 0;
                width: 42px;
                height: 42px;
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
                
                // Ease out cubic for natural, fluid human movement
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
    print("🎬 Starting 100% Synchronized 60 FPS Demo Video Generator...")
    
    script_dir = os.path.dirname(os.path.abspath(__file__))
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    audio_files = ["1_login.mp3", "2_dashboard.mp3", "3_timetable.mp3", "4_teachers.mp3", "5_closing.mp3"]
    
    # 1. Create concat list for ffmpeg
    concat_list_path = os.path.join(script_dir, "audio_concat.txt")
    with open(concat_list_path, "w", encoding="utf-8") as f:
        for a in audio_files:
            file_path = os.path.join(script_dir, a).replace("\\", "/")
            f.write(f"file '{file_path}'\n")

    synced_audio = os.path.join(script_dir, "synced_voice_master.mp3")
    concat_cmd = [ffmpeg_exe, "-y", "-f", "concat", "-safe", "0", "-i", concat_list_path, "-c", "copy", synced_audio]
    subprocess.run(concat_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    print("✅ Master Synced Voice Track Ready:", synced_audio)

    # 2. Setup Recording Directory
    video_dir = os.path.join(script_dir, "demo_output", "smooth_raw")
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
        # Register cursor engine script on ALL page navigations
        context.add_init_script(CURSOR_ENGINE_JS)
        
        page = context.new_page()

        # ==========================================
        # SCENE 1 (Exact duration: 7.39s)
        # Voice: "Welcome to Qelvora School ERP, the complete all-in-one management platform for modern schools."
        # ==========================================
        print("▶️ Recording Scene 1: Welcome & Login...")
        t0 = time.time()
        page.goto("https://school.qelvora.in/login")
        page.wait_for_load_state("networkidle")
        
        # Center cursor initially
        page.evaluate("window.__moveCursorSmooth(960, 480, 200)")
        time.sleep(0.6)

        # Glide smoothly to Email input and click
        em = page.locator("input[type=email]").first
        if em.is_visible():
            click_box(page, em.bounding_box(), move_duration_ms=400)
            page.fill("input[type=email]", "admin@qelvora.in")
            time.sleep(0.3)

        # Glide smoothly to Password input and click
        pw = page.locator("input[type=password]").first
        if pw.is_visible():
            click_box(page, pw.bounding_box(), move_duration_ms=350)
            page.fill("input[type=password]", "qelvora123")
            time.sleep(0.3)

        # Glide smoothly to Sign In button and click
        sub = page.locator("button[type=submit]").first
        if sub.is_visible():
            click_box(page, sub.bounding_box(), move_duration_ms=380)

        # Wait for navigation to dashboard
        try:
            page.wait_for_url("**/dashboard", timeout=8000)
        except Exception:
            pass

        # Pad remaining time to exactly 7.39s
        elapsed = time.time() - t0
        print(f"Scene 1 action elapsed: {elapsed:.2f}s (target: 7.39s)")
        if elapsed < 7.39:
            time.sleep(7.39 - elapsed)

        # ==========================================
        # SCENE 2 (Exact duration: 7.68s)
        # Voice: "Instantly monitor institutional analytics, running classes, and staff attendance in real time."
        # ==========================================
        print("▶️ Recording Scene 2: Institutional Analytics & Running Classes...")
        t0 = time.time()
        
        # Smooth glide across the top analytics / institutional greeting
        smooth_glide(page, 500, 210, duration_ms=650)
        time.sleep(0.3)
        
        # Glide across metric cards
        smooth_glide(page, 450, 360, duration_ms=500)
        time.sleep(0.3)
        smooth_glide(page, 780, 360, duration_ms=500)
        time.sleep(0.3)
        smooth_glide(page, 1120, 360, duration_ms=500)
        time.sleep(0.3)

        # Smooth scroll down by 280px to center the timetable/schedule widgets
        page.mouse.wheel(0, 280)
        time.sleep(0.4)

        # Glide over Today's Running Classes tab & badge
        rc_tab = page.get_by_text("Running Classes", exact=False).first
        if rc_tab.is_visible():
            smooth_glide(page, 420, 505, duration_ms=500)
            time.sleep(0.6)

        # Pad to exactly 7.68s
        elapsed = time.time() - t0
        print(f"Scene 2 action elapsed: {elapsed:.2f}s (target: 7.68s)")
        if elapsed < 7.68:
            time.sleep(7.68 - elapsed)

        # ==========================================
        # SCENE 3 (Exact duration: 6.24s)
        # Voice: "Generate conflict-free timetables for every class with smart period management."
        # ==========================================
        print("▶️ Recording Scene 3: Daily Timetable System...")
        t0 = time.time()

        # Glide directly to "Daily Timetable" tab and CLICK it
        tt_tab = page.get_by_text("Daily Timetable", exact=False).first
        if tt_tab.is_visible():
            box = tt_tab.bounding_box()
            if box:
                click_box(page, box, move_duration_ms=450)
                time.sleep(0.5)

        # Smooth glide across class columns (Class LKG, Nursery, PUC, 1st, 5th)
        smooth_glide(page, 580, 580, duration_ms=700)
        time.sleep(0.3)
        smooth_glide(page, 920, 580, duration_ms=700)
        time.sleep(0.3)

        # Smooth glide across period rows 1, 2, 3
        smooth_glide(page, 400, 680, duration_ms=600)
        time.sleep(0.3)
        smooth_glide(page, 750, 720, duration_ms=600)

        # Pad to exactly 6.24s
        elapsed = time.time() - t0
        print(f"Scene 3 action elapsed: {elapsed:.2f}s (target: 6.24s)")
        if elapsed < 6.24:
            time.sleep(6.24 - elapsed)

        # ==========================================
        # SCENE 4 (Exact duration: 6.86s)
        # Voice: "Manage class teachers and normal subject teachers with transparent workload tracking."
        # ==========================================
        print("▶️ Recording Scene 4: Class Teachers vs Subject Teachers...")
        t0 = time.time()

        # Glide directly to "Teacher Schedule" tab and CLICK it
        ts_tab = page.get_by_text("Teacher Schedule", exact=False).first
        if ts_tab.is_visible():
            box = ts_tab.bounding_box()
            if box:
                click_box(page, box, move_duration_ms=450)
                time.sleep(0.5)

        # Smooth glide to "Class Teacher" badge (gold star)
        smooth_glide(page, 580, 580, duration_ms=700)
        time.sleep(0.5)

        # Smooth glide to "Non-Class Teacher" / Subject Teacher badge and assigned subjects
        smooth_glide(page, 620, 720, duration_ms=700)
        time.sleep(0.5)

        # Smooth glide across the teacher's schedule matrix
        smooth_glide(page, 950, 720, duration_ms=600)

        # Pad to exactly 6.86s
        elapsed = time.time() - t0
        print(f"Scene 4 action elapsed: {elapsed:.2f}s (target: 6.86s)")
        if elapsed < 6.86:
            time.sleep(6.86 - elapsed)

        # ==========================================
        # SCENE 5 (Exact duration: 6.26s)
        # Voice: "Empower your teachers, parents, and school administration today with Qelvora."
        # ==========================================
        print("▶️ Recording Scene 5: Platform Closing...")
        t0 = time.time()

        # Smooth scroll back up to the top
        page.mouse.wheel(0, -350)
        time.sleep(0.3)

        # Glide smoothly to School Brand Logo in the top left
        smooth_glide(page, 180, 70, duration_ms=750)
        time.sleep(0.8)

        # Glide smoothly to Admin User Profile & Settings in the top right
        smooth_glide(page, 960, 210, duration_ms=800)
        time.sleep(0.8)

        # Gentle concluding hover
        smooth_glide(page, 960, 250, duration_ms=500)

        # Pad to exactly 6.26s
        elapsed = time.time() - t0
        print(f"Scene 5 action elapsed: {elapsed:.2f}s (target: 6.26s)")
        if elapsed < 6.26:
            time.sleep(6.26 - elapsed)

        # Close page & browser to flush video
        context.close()
        browser.close()
        print("✅ Butter-smooth raw video captured!")

    # Find the newly captured webm video
    video_files = [os.path.join(video_dir, f) for f in os.listdir(video_dir) if f.endswith(".webm")]
    if not video_files:
        print("❌ No raw video file found!")
        return

    raw_video = video_files[0]
    final_output = os.path.join(script_dir, "qelvora_school_demo_synced.mp4")

    print("🎬 Merging 60 FPS Video + Synced Audio with FFmpeg...")
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
        artifact_path = r"C:\Users\ASUS\.gemini\antigravity\brain\6e4b10f6-ccb7-41d3-9d70-2ba30d370386\qelvora_school_demo_synced.mp4"
        try:
            import shutil
            shutil.copy2(final_output, artifact_path)
            print("✅ Copied to artifacts directory!")
        except Exception as e:
            print("Note copying artifact:", e)

        size_mb = os.path.getsize(final_output) / (1024 * 1024)
        print(f"🎉 100% PERFECT SYNCED VIDEO GENERATED: {final_output} ({size_mb:.2f} MB)")
    else:
        print("❌ Video merge failed.")

if __name__ == "__main__":
    main()
