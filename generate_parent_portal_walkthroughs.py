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

def click_nav_tab(page, tab_name, fallback_url):
    loc = page.locator(f"nav a:has-text('{tab_name}'), header a:has-text('{tab_name}')").first
    if loc.is_visible():
        box = loc.bounding_box()
        if box:
            cx = box["x"] + box["width"] / 2
            cy = box["y"] + box["height"] / 2
            fast_click(page, cx, cy, move_duration_ms=200)
            time.sleep(0.35)
            return
    page.goto(fallback_url)
    time.sleep(0.35)

def record_parent_language_video(lang_code, lang_name, scene_durations, output_filename):
    script_dir = r"D:\qelvora.in\dev_qelvora_school\dev_inkedu-main"
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    master_audio = os.path.join(script_dir, f"master_parent_{lang_code}.mp3")
    
    print(f"\n========================================================")
    print(f"🎬 RECORDING PARENTS PORTAL WALKTHROUGH: {lang_name.upper()}")
    print(f"Output File: {output_filename}")
    print(f"========================================================")

    video_dir = os.path.join(script_dir, "demo_output", f"raw_parent_{lang_code}")
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

        # ----------------------------------------------------
        # SCENE 1: Easy Login & Welcome (Target: scene_durations[0])
        # ----------------------------------------------------
        t_target = scene_durations[0]
        print(f"▶️ Scene 1: Login & Welcome (target: {t_target:.2f}s)...")
        t0 = time.time()

        page.goto("https://school.qelvora.in/login")
        time.sleep(0.6)

        # Highlight header
        fast_glide(page, 960, 240, duration_ms=200)
        underline_at(page, 850, 1070, 250, duration_ms=300)
        time.sleep(0.3)

        # Student & Parent button
        fast_glide(page, 1083, 757, duration_ms=220)
        circle_at(page, 1083, 757, radius=24, duration_ms=360)
        fast_click(page, 1083, 757, move_duration_ms=160)
        try:
            page.get_by_text('Student & Parent', exact=True).first.click()
        except:
            pass
        time.sleep(0.4)

        # Highlight auto-filled email
        fast_glide(page, 960, 480, duration_ms=200)
        underline_at(page, 800, 1120, 485, duration_ms=320)
        time.sleep(0.3)

        # Click Sign In button
        fast_glide(page, 960, 650, duration_ms=200)
        circle_at(page, 960, 650, radius=22, duration_ms=320)
        fast_click(page, 960, 650, move_duration_ms=160)
        try:
            page.locator('button[type="submit"]').first.click()
        except:
            pass

        elapsed = time.time() - t0
        if elapsed < t_target: time.sleep(t_target - elapsed)

        # ----------------------------------------------------
        # SCENE 2: Parent Dashboard & Attendance (Target: scene_durations[1])
        # ----------------------------------------------------
        t_target = scene_durations[1]
        print(f"▶️ Scene 2: Dashboard & Attendance (target: {t_target:.2f}s)...")
        t0 = time.time()

        click_nav_tab(page, "Dashboard", "https://school.qelvora.in/dashboard")
        time.sleep(0.4)

        # Greeting banner
        fast_glide(page, 550, 240, duration_ms=200)
        underline_at(page, 450, 780, 245, duration_ms=340)
        time.sleep(0.3)

        # Live Attendance card
        fast_glide(page, 1632, 331, duration_ms=220)
        circle_at(page, 1632, 331, radius=28, duration_ms=380)
        underline_at(page, 1420, 1840, 345, duration_ms=320)
        time.sleep(0.4)

        # Timetable
        fast_glide(page, 1105, 498, duration_ms=200)
        circle_at(page, 1105, 498, radius=24, duration_ms=340)
        underline_at(page, 900, 1310, 520, duration_ms=350)
        time.sleep(0.3)

        # Period / class recordings
        fast_glide(page, 620, 720, duration_ms=220)
        circle_at(page, 620, 720, radius=22, duration_ms=320)

        elapsed = time.time() - t0
        if elapsed < t_target: time.sleep(t_target - elapsed)

        # ----------------------------------------------------
        # SCENE 3: Student Profile & Academic Progression (Target: scene_durations[2])
        # ----------------------------------------------------
        t_target = scene_durations[2]
        print(f"▶️ Scene 3: Student Profile (target: {t_target:.2f}s)...")
        t0 = time.time()

        click_nav_tab(page, "Profile", "https://school.qelvora.in/student/profile")
        time.sleep(0.4)

        # Aarav Sharma name & badge
        fast_glide(page, 720, 480, duration_ms=200)
        circle_at(page, 720, 480, radius=26, duration_ms=360)
        underline_at(page, 650, 850, 495, duration_ms=300)
        time.sleep(0.3)

        # Grade 5-A & Sapphire House
        fast_glide(page, 760, 620, duration_ms=200)
        circle_at(page, 760, 620, radius=22, duration_ms=320)
        underline_at(page, 680, 840, 625, duration_ms=280)
        time.sleep(0.3)

        # Academic score 94.6%
        fast_glide(page, 805, 805, duration_ms=200)
        circle_at(page, 805, 805, radius=28, duration_ms=380)
        underline_at(page, 720, 880, 825, duration_ms=300)

        elapsed = time.time() - t0
        if elapsed < t_target: time.sleep(t_target - elapsed)

        # ----------------------------------------------------
        # SCENE 4: Verified Guardians & Child Safety (Target: scene_durations[3])
        # ----------------------------------------------------
        t_target = scene_durations[3]
        print(f"▶️ Scene 4: Guardians & Safety (target: {t_target:.2f}s)...")
        t0 = time.time()

        # Mother profile
        fast_glide(page, 1156, 412, duration_ms=200)
        circle_at(page, 1156, 412, radius=26, duration_ms=360)
        underline_at(page, 1030, 1280, 430, duration_ms=320)
        time.sleep(0.3)

        # Mother Government Verified badge
        fast_glide(page, 1156, 460, duration_ms=180)
        circle_at(page, 1156, 460, radius=20, duration_ms=320)
        time.sleep(0.3)

        # Father profile
        fast_glide(page, 1566, 412, duration_ms=200)
        circle_at(page, 1566, 412, radius=26, duration_ms=360)
        underline_at(page, 1440, 1690, 430, duration_ms=320)
        time.sleep(0.3)

        # Father Face Verified & Contact
        fast_glide(page, 1566, 460, duration_ms=180)
        circle_at(page, 1566, 460, radius=20, duration_ms=320)

        elapsed = time.time() - t0
        if elapsed < t_target: time.sleep(t_target - elapsed)

        # ----------------------------------------------------
        # SCENE 5: Examination & Progress (Target: scene_durations[4])
        # ----------------------------------------------------
        t_target = scene_durations[4]
        print(f"▶️ Scene 5: Examination & Progress (target: {t_target:.2f}s)...")
        t0 = time.time()

        click_nav_tab(page, "Exams", "https://school.qelvora.in/student/examination")
        time.sleep(0.4)

        # Term header
        fast_glide(page, 833, 165, duration_ms=200)
        underline_at(page, 650, 1050, 175, duration_ms=340)
        time.sleep(0.3)

        # Mathematics
        fast_glide(page, 571, 687, duration_ms=200)
        circle_at(page, 571, 687, radius=24, duration_ms=340)
        underline_at(page, 500, 700, 695, duration_ms=280)
        time.sleep(0.3)

        # Science
        fast_glide(page, 571, 740, duration_ms=180)
        circle_at(page, 571, 740, radius=24, duration_ms=340)
        underline_at(page, 500, 700, 748, duration_ms=280)
        time.sleep(0.3)

        # English
        fast_glide(page, 571, 793, duration_ms=180)
        circle_at(page, 571, 793, radius=24, duration_ms=340)
        underline_at(page, 500, 700, 801, duration_ms=280)

        elapsed = time.time() - t0
        if elapsed < t_target: time.sleep(t_target - elapsed)

        # ----------------------------------------------------
        # SCENE 6: Fees Due & Receipts (Target: scene_durations[5])
        # ----------------------------------------------------
        t_target = scene_durations[5]
        print(f"▶️ Scene 6: Fees Due & Receipts (target: {t_target:.2f}s)...")
        t0 = time.time()

        click_nav_tab(page, "Fees", "https://school.qelvora.in/student/fees")
        time.sleep(0.4)

        # Outstanding Fee Due
        fast_glide(page, 670, 311, duration_ms=200)
        circle_at(page, 670, 311, radius=28, duration_ms=380)
        underline_at(page, 500, 840, 325, duration_ms=320)
        time.sleep(0.3)

        # Tuition & Lab Fee breakdown
        fast_glide(page, 605, 450, duration_ms=200)
        underline_at(page, 500, 720, 455, duration_ms=280)
        time.sleep(0.3)

        # Pay Online button
        fast_glide(page, 833, 117, duration_ms=200)
        circle_at(page, 833, 117, radius=22, duration_ms=320)
        time.sleep(0.3)

        # Receipts list & Print action
        fast_glide(page, 1400, 480, duration_ms=220)
        circle_at(page, 1400, 480, radius=24, duration_ms=340)
        underline_at(page, 1250, 1550, 490, duration_ms=300)

        elapsed = time.time() - t0
        if elapsed < t_target: time.sleep(t_target - elapsed)

        # ----------------------------------------------------
        # SCENE 7: Safe Pickup Protocol & Closing (Target: scene_durations[6])
        # ----------------------------------------------------
        t_target = scene_durations[6]
        print(f"▶️ Scene 7: Safe Pickup & Closing (target: {t_target:.2f}s)...")
        t0 = time.time()

        click_nav_tab(page, "Pickup", "https://school.qelvora.in/student/safe-pickup")
        time.sleep(0.4)

        # Safe Pickup header
        fast_glide(page, 833, 165, duration_ms=200)
        underline_at(page, 650, 1050, 175, duration_ms=340)
        time.sleep(0.3)

        # Authorized guardian selector ("Who is going to pick up Aarav?")
        fast_glide(page, 720, 320, duration_ms=200)
        circle_at(page, 720, 320, radius=26, duration_ms=360)
        fast_click(page, 720, 320, move_duration_ms=160)
        time.sleep(0.4)

        # Gate Exit Status & Security
        fast_glide(page, 686, 466, duration_ms=200)
        circle_at(page, 686, 466, radius=26, duration_ms=360)
        underline_at(page, 520, 850, 480, duration_ms=320)
        time.sleep(0.4)

        # Smooth closing glide in center
        fast_glide(page, 960, 500, duration_ms=220)
        circle_at(page, 960, 500, radius=36, duration_ms=450)

        elapsed = time.time() - t0
        if elapsed < t_target: time.sleep(t_target - elapsed)

        print("🛑 Closing browser session to flush video stream...")
        context.close()
        browser.close()

    time.sleep(1.0)
    vids = [f for f in os.listdir(video_dir) if f.endswith(".webm")]
    if not vids:
        print("❌ Error: No webm video was recorded!")
        return

    raw_webm = os.path.join(video_dir, vids[0])
    final_mp4 = os.path.join(r"D:\qelvora.in\dev_qelvora_school", output_filename)
    artifact_dir = r"C:\Users\ASUS\.gemini\antigravity\brain\6e4b10f6-ccb7-41d3-9d70-2ba30d370386"
    artifact_mp4 = os.path.join(artifact_dir, output_filename)

    print(f"🎬 Multiplexing Video + Audio via FFmpeg: {final_mp4}")
    cmd = [
        ffmpeg_exe, "-y",
        "-i", raw_webm,
        "-i", master_audio,
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "20",
        "-c:a", "aac",
        "-b:a", "192k",
        "-map", "0:v:0",
        "-map", "1:a:0",
        "-shortest",
        final_mp4
    ]
    subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    shutil.copyfile(final_mp4, artifact_mp4)
    size_mb = os.path.getsize(final_mp4) / (1024 * 1024)
    print(f"🎉 SUCCESS! {lang_name} Walkthrough Video ready: {final_mp4} ({size_mb:.2f} MB)")
    print(f"📁 Copied to Artifacts: {artifact_mp4}")

def run_all():
    languages = [
        ("en", "English", [10.01, 11.35, 11.57, 11.14, 11.71, 11.59, 12.43], "qelvora_parent_portal_english.mp4"),
        ("local", "Local Hinglish Mix", [11.81, 11.42, 11.11, 11.81, 11.88, 9.91, 14.38], "qelvora_parent_portal_local_hinglish.mp4"),
        ("ur", "Urdu", [11.23, 9.70, 9.12, 9.91, 10.03, 9.72, 14.21], "qelvora_parent_portal_urdu.mp4"),
        ("kn", "Kannada", [9.74, 8.21, 7.78, 8.93, 8.66, 8.33, 12.74], "qelvora_parent_portal_kannada.mp4")
    ]

    for code, name, durs, out_file in languages:
        record_parent_language_video(code, name, durs, out_file)

if __name__ == "__main__":
    run_all()
