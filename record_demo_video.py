import os
import sys
import time
import math
import asyncio
import subprocess

if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

import edge_tts
import imageio_ffmpeg
from playwright.sync_api import sync_playwright

VOICE_TEXT = (
    "Welcome to Qelvora School ERP, the complete all-in-one management platform designed for modern schools. "
    "Seamlessly manage class teachers, subject educators, and conflict-free timetables with automated scheduling. "
    "Track real-time student attendance, report cards, and fee collections with effortless precision. "
    "Transform your school operations today with Qelvora."
)

CURSOR_JS = """
(() => {
    if (document.getElementById('virtual-cursor')) return;
    
    const cursor = document.createElement('div');
    cursor.id = 'virtual-cursor';
    cursor.style.cssText = `
        position: fixed;
        width: 24px;
        height: 24px;
        background: #FACC15;
        border: 2.5px solid #000;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 0 16px rgba(250, 204, 21, 0.9), 0 0 30px rgba(250, 204, 21, 0.6);
        pointer-events: none;
        z-index: 9999999;
        transition: transform 0.12s ease;
        left: 100px;
        top: 100px;
    `;
    
    const halo = document.createElement('div');
    halo.id = 'cursor-halo';
    halo.style.cssText = `
        position: fixed;
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: rgba(250, 204, 21, 0.28);
        border: 2px solid rgba(250, 204, 21, 0.6);
        pointer-events: none;
        z-index: 9999998;
        transform: translate(-10px, -10px);
        left: 100px;
        top: 100px;
        transition: width 0.2s, height 0.2s, opacity 0.2s;
    `;

    document.body.appendChild(halo);
    document.body.appendChild(cursor);

    window.__moveCursor = (x, y) => {
        cursor.style.left = x + 'px';
        cursor.style.top = y + 'px';
        halo.style.left = (x - 10) + 'px';
        halo.style.top = (y - 10) + 'px';
    };

    window.__clickRipple = (x, y) => {
        const ripple = document.createElement('div');
        ripple.style.cssText = `
            position: fixed;
            left: ${x - 20}px;
            top: ${y - 20}px;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border: 3px solid #FACC15;
            box-shadow: 0 0 20px #FACC15;
            pointer-events: none;
            z-index: 9999999;
            animation: rippleAnim 0.45s ease-out forwards;
        `;
        document.body.appendChild(ripple);
        setTimeout(() => ripple.remove(), 450);
    };

    if (!document.getElementById('cursor-anim-style')) {
        const style = document.createElement('style');
        style.id = 'cursor-anim-style';
        style.innerHTML = `
            @keyframes rippleAnim {
                0% { transform: scale(0.6); opacity: 1; }
                100% { transform: scale(2.4); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
})();
"""

CURRENT_POS = {"x": 200, "y": 200}

def smooth_move(page, target_x, target_y, steps=25, delay=0.015):
    start_x = CURRENT_POS["x"]
    start_y = CURRENT_POS["y"]
    for i in range(1, steps + 1):
        t = i / steps
        # Smooth ease-in-out curve
        ease = t * t * (3 - 2 * t)
        curr_x = start_x + (target_x - start_x) * ease
        curr_y = start_y + (target_y - start_y) * ease
        page.evaluate(f"window.__moveCursor && window.__moveCursor({curr_x}, {curr_y})")
        time.sleep(delay)
    CURRENT_POS["x"] = target_x
    CURRENT_POS["y"] = target_y

def smooth_click(page, target_x, target_y):
    smooth_move(page, target_x, target_y, steps=20, delay=0.015)
    page.evaluate(f"window.__clickRipple && window.__clickRipple({target_x}, {target_y})")
    page.mouse.click(target_x, target_y)
    time.sleep(0.3)

def click_element_smooth(page, selector):
    try:
        el = page.locator(selector).first
        box = el.bounding_box()
        if box:
            cx = box["x"] + box["width"] / 2
            cy = box["y"] + box["height"] / 2
            smooth_click(page, cx, cy)
            return True
    except Exception as e:
        print(f"Click fallback for {selector}: {e}")
    return False

def inject_cursor(page):
    try:
        page.evaluate(CURSOR_JS)
        page.evaluate(f"window.__moveCursor && window.__moveCursor({CURRENT_POS['x']}, {CURRENT_POS['y']})")
    except Exception:
        pass

async def generate_voice():
    print("🎙️ Generating professional Indian English AI voiceover (Prabhat Neural)...")
    tts = edge_tts.Communicate(VOICE_TEXT, "en-IN-PrabhatNeural", rate="+2%")
    await tts.save("demo_voice.mp3")
    print("✅ Voice audio generated: demo_voice.mp3")

def main():
    asyncio.run(generate_voice())

    os.makedirs("demo_output", exist_ok=True)
    video_dir = os.path.abspath("demo_output/raw_video")
    os.makedirs(video_dir, exist_ok=True)

    print("🚀 Launching Chrome in Full HD (1920x1080) for Automated Recording...")
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
        page = context.new_page()

        # Step 1: Open Login Screen
        print("📹 Recording Step 1: Login Page...")
        page.goto("https://school.qelvora.in/login")
        page.wait_for_load_state("networkidle")
        inject_cursor(page)
        time.sleep(1.2)

        # Move cursor to email and fill
        email_box = page.locator("input[type=email]").first.bounding_box()
        if email_box:
            smooth_click(page, email_box["x"] + 80, email_box["y"] + email_box["height"] / 2)
            page.fill("input[type=email]", "admin@qelvora.in")
            time.sleep(0.5)

        # Move to password and fill
        pwd_box = page.locator("input[type=password]").first.bounding_box()
        if pwd_box:
            smooth_click(page, pwd_box["x"] + 80, pwd_box["y"] + pwd_box["height"] / 2)
            page.fill("input[type=password]", "qelvora123")
            time.sleep(0.5)

        # Click Login
        btn_box = page.locator("button[type=submit]").first.bounding_box()
        if btn_box:
            smooth_click(page, btn_box["x"] + btn_box["width"] / 2, btn_box["y"] + btn_box["height"] / 2)

        # Step 2: Dashboard Overview
        print("📹 Recording Step 2: Interactive Dashboard...")
        page.wait_for_url("**/dashboard", timeout=12000)
        page.wait_for_load_state("networkidle")
        time.sleep(1.0)
        inject_cursor(page)

        # Smooth glide over the welcome banner
        smooth_move(page, 450, 180, steps=25, delay=0.02)
        time.sleep(0.8)

        # Hover stats cards
        smooth_move(page, 320, 310, steps=20, delay=0.02)
        time.sleep(0.6)
        smooth_move(page, 650, 310, steps=20, delay=0.02)
        time.sleep(0.6)
        smooth_move(page, 980, 310, steps=20, delay=0.02)
        time.sleep(0.8)

        # Step 3: Timetable Management Tab
        print("📹 Recording Step 3: Daily Timetable System...")
        tt_tab = page.locator("text=Daily Timetable").first
        if tt_tab.is_visible():
            box = tt_tab.bounding_box()
            if box:
                smooth_click(page, box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
                time.sleep(1.5)
                inject_cursor(page)

        # Smooth scroll down to show the full period grid
        smooth_move(page, 700, 520, steps=20, delay=0.02)
        for _ in range(4):
            page.mouse.wheel(0, 120)
            time.sleep(0.2)
        time.sleep(1.5)

        # Step 4: Teacher Schedule Tab
        print("📹 Recording Step 4: Teacher Schedule & Workload...")
        ts_tab = page.locator("text=Teacher Schedule").first
        if ts_tab.is_visible():
            box = ts_tab.bounding_box()
            if box:
                smooth_click(page, box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
                time.sleep(1.5)
                inject_cursor(page)

        # Hover over Class Teacher badges & subject expertise
        smooth_move(page, 550, 580, steps=22, delay=0.02)
        time.sleep(0.8)
        smooth_move(page, 550, 680, steps=20, delay=0.02)
        time.sleep(1.2)

        # Step 5: Wrap up view (Attendance or Safe Pickup)
        print("📹 Recording Step 5: Safe Campus & Smart Features...")
        sidebar_att = page.locator("text=Attendance System").first
        if sidebar_att.is_visible():
            box = sidebar_att.bounding_box()
            if box:
                smooth_click(page, box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
                time.sleep(1.8)
                inject_cursor(page)

        smooth_move(page, 960, 400, steps=25, delay=0.02)
        time.sleep(2.0)

        # Finalize video recording
        context.close()
        browser.close()
        print("✅ Raw browser video capture complete!")

    # Find the recorded webm video
    video_files = [os.path.join(video_dir, f) for f in os.listdir(video_dir) if f.endswith(".webm")]
    if not video_files:
        print("❌ No video file captured!")
        return

    raw_video = video_files[0]
    final_output = os.path.abspath("qelvora_school_demo_30s.mp4")
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()

    print("🎬 Merging 1080p Video + AI Voice with FFmpeg...")
    # Merge audio + video: match audio duration, smooth 60fps h264 export
    cmd = [
        ffmpeg_exe, "-y",
        "-i", raw_video,
        "-i", "demo_voice.mp3",
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "18",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        final_output
    ]

    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if os.path.exists(final_output):
        file_size_mb = os.path.getsize(final_output) / (1024 * 1024)
        print(f"🎉 FINAL VIDEO READY: {final_output} ({file_size_mb:.2f} MB)")
    else:
        print("❌ FFmpeg merge failed:", res.stderr)

if __name__ == "__main__":
    main()
