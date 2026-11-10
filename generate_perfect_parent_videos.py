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

script_dir = r"D:\qelvora.in\dev_qelvora_school\dev_inkedu-main"
ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
work_dir = os.path.join(script_dir, "demo_output", "perfect_parent_scenes")
os.makedirs(work_dir, exist_ok=True)
auth_state_path = os.path.join(work_dir, "parent_auth.json")

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
                transform: translate3d(960px, 500px, 0) rotate(-45deg);
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
                transform: translate3d(949px, 489px, 0);
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
        window.__curX = 960;
        window.__curY = 500;
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
            setTimeout(done, durationMs + 20);

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
            let resolved = false;
            const done = () => {
                if (!resolved) {
                    resolved = true;
                    window.__curX = cx;
                    window.__curY = cy;
                    if (window.__cursorEl) window.__cursorEl.style.transform = `translate3d(${cx}px, ${cy}px, 0) rotate(-45deg)`;
                    if (window.__haloEl) window.__haloEl.style.transform = `translate3d(${cx - 11}px, ${cy - 11}px, 0)`;
                    resolve();
                }
            };
            setTimeout(done, durationMs + 20);

            const startTime = performance.now();
            function frame(now) {
                if (resolved) return;
                const elapsed = now - startTime;
                const p = Math.min(elapsed / durationMs, 1.0);
                const angle = p * Math.PI * 2 - Math.PI / 2;
                const curX = cx + Math.cos(angle) * radius;
                const curY = cy + Math.sin(angle) * radius;

                if (window.__cursorEl) window.__cursorEl.style.transform = `translate3d(${curX}px, ${curY}px, 0) rotate(-45deg)`;
                if (window.__haloEl) window.__haloEl.style.transform = `translate3d(${curX - 11}px, ${curY - 11}px, 0)`;

                if (p < 1.0) requestAnimationFrame(frame);
                else done();
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

def fast_click(page, x, y, move_duration_ms=200):
    fast_glide(page, x, y, move_duration_ms)
    page.evaluate(f"window.__rippleAt && window.__rippleAt({x}, {y})")
    page.mouse.click(x, y)

def run_timeline(page, events, scene_duration):
    t0 = time.time()
    for trigger_time, action in sorted(events, key=lambda x: x[0]):
        elapsed = time.time() - t0
        if elapsed < trigger_time:
            time.sleep(trigger_time - elapsed)
        try:
            action()
        except Exception as e:
            pass
    elapsed = time.time() - t0
    if elapsed < scene_duration:
        time.sleep(scene_duration - elapsed)

def record_single_scene(browser, scene_num, target_dur, audio_clip, output_mp4, lang_code):
    scene_raw_dir = os.path.join(work_dir, f"raw_{lang_code}_{scene_num}")
    os.makedirs(scene_raw_dir, exist_ok=True)
    for old in os.listdir(scene_raw_dir):
        try: os.remove(os.path.join(scene_raw_dir, old))
        except: pass

    # Use auth state for scenes 2 to 7
    ctx_kwargs = {
        "viewport": {"width": 1920, "height": 1080},
        "record_video_dir": scene_raw_dir,
        "record_video_size": {"width": 1920, "height": 1080}
    }
    if scene_num > 1 and os.path.exists(auth_state_path):
        ctx_kwargs["storage_state"] = auth_state_path

    context = browser.new_context(**ctx_kwargs)
    context.add_init_script(CURSOR_ENGINE_JS)
    page = context.new_page()

    t_start = time.time()

    # Configure scene navigation and events
    if scene_num == 1:
        # Scene 1: Login Page
        page.goto("https://school.qelvora.in/login")
        page.wait_for_selector("text=Student & Parent")
        t_ready = time.time() - t_start

        events = [
            (0.4, lambda: underline_at(page, 850, 1070, 250, 280)),
            (2.8, lambda: circle_at(page, 1083, 757, 24, 340)),
            (3.4, lambda: fast_click(page, 1083, 757, 160)),
            (5.5, lambda: underline_at(page, 800, 1120, 485, 300)),
            (7.5, lambda: circle_at(page, 960, 650, 22, 320)),
            (8.0, lambda: fast_click(page, 960, 650, 160)),
        ]
        run_timeline(page, events, target_dur)

    elif scene_num == 2:
        # Scene 2: Dashboard
        page.goto("https://school.qelvora.in/dashboard")
        page.wait_for_selector("text=Attendance")
        t_ready = time.time() - t_start

        events = [
            (0.4, lambda: underline_at(page, 450, 780, 245, 300)),
            (3.2, lambda: circle_at(page, 1632, 331, 28, 360)),
            (3.8, lambda: underline_at(page, 1420, 1840, 345, 280)),
            (6.5, lambda: circle_at(page, 1105, 498, 24, 320)),
            (7.0, lambda: underline_at(page, 900, 1310, 520, 320)),
            (9.0, lambda: circle_at(page, 620, 720, 22, 300)),
        ]
        run_timeline(page, events, target_dur)

    elif scene_num == 3:
        # Scene 3: Student Profile
        page.goto("https://school.qelvora.in/student/profile")
        page.wait_for_selector("text=Aarav Sharma")
        t_ready = time.time() - t_start

        events = [
            (0.4, lambda: circle_at(page, 720, 480, 26, 340)),
            (0.9, lambda: underline_at(page, 650, 850, 495, 280)),
            (3.5, lambda: circle_at(page, 760, 620, 22, 300)),
            (4.0, lambda: underline_at(page, 680, 840, 625, 260)),
            (7.0, lambda: circle_at(page, 805, 805, 28, 360)),
            (7.6, lambda: underline_at(page, 720, 880, 825, 280)),
        ]
        run_timeline(page, events, target_dur)

    elif scene_num == 4:
        # Scene 4: Guardians & Safety
        page.goto("https://school.qelvora.in/student/profile")
        page.wait_for_selector("text=Sunita Sharma")
        t_ready = time.time() - t_start

        events = [
            (0.4, lambda: circle_at(page, 1156, 412, 26, 340)),
            (0.9, lambda: underline_at(page, 1030, 1280, 430, 280)),
            (3.2, lambda: circle_at(page, 1156, 460, 20, 300)),
            (5.5, lambda: circle_at(page, 1566, 412, 26, 340)),
            (6.0, lambda: underline_at(page, 1440, 1690, 430, 280)),
            (8.0, lambda: circle_at(page, 1566, 460, 20, 300)),
        ]
        run_timeline(page, events, target_dur)

    elif scene_num == 5:
        # Scene 5: Examination & Progress
        page.goto("https://school.qelvora.in/student/examination")
        page.wait_for_selector("text=Mathematics")
        t_ready = time.time() - t_start

        events = [
            (0.4, lambda: underline_at(page, 650, 1050, 175, 320)),
            (3.2, lambda: circle_at(page, 571, 687, 24, 320)),
            (3.7, lambda: underline_at(page, 500, 700, 695, 260)),
            (5.8, lambda: circle_at(page, 571, 740, 24, 320)),
            (6.3, lambda: underline_at(page, 500, 700, 748, 260)),
            (8.2, lambda: circle_at(page, 571, 793, 24, 320)),
            (8.7, lambda: underline_at(page, 500, 700, 801, 260)),
        ]
        run_timeline(page, events, target_dur)

    elif scene_num == 6:
        # Scene 6: Fees Due & Receipts
        page.goto("https://school.qelvora.in/student/fees")
        page.wait_for_selector("text=Due")
        t_ready = time.time() - t_start

        events = [
            (0.4, lambda: circle_at(page, 670, 311, 28, 360)),
            (0.9, lambda: underline_at(page, 500, 840, 325, 300)),
            (3.5, lambda: underline_at(page, 500, 720, 450, 260)),
            (6.0, lambda: circle_at(page, 833, 117, 22, 300)),
            (8.0, lambda: circle_at(page, 1400, 480, 24, 320)),
            (8.5, lambda: underline_at(page, 1250, 1550, 490, 280)),
        ]
        run_timeline(page, events, target_dur)

    elif scene_num == 7:
        # Scene 7: Safe Pickup Protocol & Closing
        page.goto("https://school.qelvora.in/student/safe-pickup")
        page.wait_for_selector("text=Safe Pickup")
        t_ready = time.time() - t_start

        events = [
            (0.4, lambda: underline_at(page, 650, 1050, 175, 320)),
            (3.2, lambda: circle_at(page, 720, 320, 26, 340)),
            (3.7, lambda: fast_click(page, 720, 320, 160)),
            (6.5, lambda: circle_at(page, 686, 466, 26, 340)),
            (7.0, lambda: underline_at(page, 520, 850, 480, 300)),
            (9.2, lambda: circle_at(page, 960, 500, 36, 450)),
        ]
        run_timeline(page, events, target_dur)

    context.close()

    # Find raw webm
    vids = [f for f in os.listdir(scene_raw_dir) if f.endswith(".webm")]
    raw_vid = os.path.join(scene_raw_dir, vids[0])

    # Trim loading time and mux with exact audio clip
    cmd = [
        ffmpeg_exe, "-y",
        "-ss", str(t_ready),
        "-i", raw_vid,
        "-i", audio_clip,
        "-t", str(target_dur),
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "19",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        output_mp4
    ]
    subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    print(f"  ✅ Scene {scene_num} synced: {target_dur:.2f}s -> {os.path.basename(output_mp4)}")

def generate_language_tour(lang_code, lang_name, scene_durations, final_output_name):
    print(f"\n========================================================")
    print(f"🎬 BUILDING FRAME-PERFECT SYNCED TOUR: {lang_name.upper()}")
    print(f"========================================================")

    lang_dir = os.path.join(work_dir, lang_code)
    os.makedirs(lang_dir, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe",
            headless=True
        )

        # 1. Login once if auth state missing
        if not os.path.exists(auth_state_path):
            print("🔐 Initializing parent session...")
            auth_ctx = browser.new_context()
            apage = auth_ctx.new_page()
            apage.goto("https://school.qelvora.in/login")
            apage.get_by_text("Student & Parent", exact=True).first.click()
            apage.locator('button[type="submit"]').click()
            apage.wait_for_url("**/profile", timeout=12000)
            auth_ctx.storage_state(path=auth_state_path)
            auth_ctx.close()
            print("✅ Parent session saved.")

        # 2. Record each of the 7 scenes
        scene_mp4s = []
        for i in range(1, 8):
            dur = scene_durations[i-1]
            prefix = "loc" if lang_code == "local" else lang_code
            audio_f = os.path.join(script_dir, f"p_{prefix}_{i}.mp3")
            scene_mp4 = os.path.join(lang_dir, f"scene_{i}.mp4")
            record_single_scene(browser, i, dur, audio_f, scene_mp4, lang_code)
            scene_mp4s.append(scene_mp4)

        browser.close()

    # 3. Concatenate all 7 scenes using FFmpeg concat demuxer
    concat_txt = os.path.join(lang_dir, "concat.txt")
    with open(concat_txt, "w", encoding="utf-8") as f:
        for mp4 in scene_mp4s:
            clean_p = mp4.replace("\\", "/")
            f.write(f"file '{clean_p}'\n")

    final_mp4 = os.path.join(r"D:\qelvora.in\dev_qelvora_school", final_output_name)
    artifact_dir = r"C:\Users\ASUS\.gemini\antigravity\brain\6e4b10f6-ccb7-41d3-9d70-2ba30d370386"
    artifact_mp4 = os.path.join(artifact_dir, final_output_name)

    print(f"🎬 Stitching all 7 scenes into: {final_mp4}")
    cmd = [
        ffmpeg_exe, "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", concat_txt,
        "-c", "copy",
        final_mp4
    ]
    subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    shutil.copyfile(final_mp4, artifact_mp4)
    size_mb = os.path.getsize(final_mp4) / (1024 * 1024)
    print(f"🎉 SUCCESS! {lang_name} Walkthrough is 100% frame-synced: {final_mp4} ({size_mb:.2f} MB)")
    print(f"📁 Copied to Artifacts: {artifact_mp4}")

def main():
    languages = [
        ("local", "Local Hinglish Mix", [11.81, 11.42, 11.11, 11.81, 11.88, 9.91, 14.38], "qelvora_parent_portal_local_hinglish.mp4"),
        ("ur", "Urdu", [11.23, 9.70, 9.12, 9.91, 10.03, 9.72, 14.21], "qelvora_parent_portal_urdu.mp4"),
        ("kn", "Kannada", [9.74, 8.21, 7.78, 8.93, 8.66, 8.33, 12.74], "qelvora_parent_portal_kannada.mp4")
    ]
    for code, name, durs, out_file in languages:
        generate_language_tour(code, name, durs, out_file)

if __name__ == "__main__":
    main()
