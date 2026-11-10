import sys, time, os, subprocess
sys.stdout.reconfigure(encoding='utf-8')
import imageio_ffmpeg
from playwright.sync_api import sync_playwright

ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
test_dir = r"D:\qelvora.in\dev_qelvora_school\dev_inkedu-main\demo_output\test_scene_sync"
os.makedirs(test_dir, exist_ok=True)

# 1. Login once and save state
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe', headless=True)
    auth_ctx = b.new_context()
    page = auth_ctx.new_page()
    page.goto('https://school.qelvora.in/login')
    page.get_by_text('Student & Parent', exact=True).first.click()
    page.locator('button[type="submit"]').click()
    page.wait_for_url('**/profile', timeout=10000)
    auth_path = os.path.join(test_dir, "auth.json")
    auth_ctx.storage_state(path=auth_path)
    auth_ctx.close()
    
    # 2. Record Scene 2 (Dashboard)
    raw_scene_dir = os.path.join(test_dir, "raw_scene_2")
    os.makedirs(raw_scene_dir, exist_ok=True)
    for old in os.listdir(raw_scene_dir):
        try: os.remove(os.path.join(raw_scene_dir, old))
        except: pass
        
    scene_ctx = b.new_context(
        storage_state=auth_path,
        viewport={'width': 1920, 'height': 1080},
        record_video_dir=raw_scene_dir,
        record_video_size={'width': 1920, 'height': 1080}
    )
    t_start = time.time()
    spage = scene_ctx.new_page()
    spage.goto('https://school.qelvora.in/dashboard')
    spage.wait_for_selector('text=Attendance')
    t_ready = time.time() - t_start
    print(f"Page ready at: {t_ready:.2f}s")
    
    # Target duration of p_en_2.mp3
    target_dur = 11.35
    t0_action = time.time()
    
    # Do some simple cursor moves or sleeps
    time.sleep(target_dur)
    
    scene_ctx.close()
    b.close()

# 3. Trim and mux with p_en_2.mp3
vids = [f for f in os.listdir(raw_scene_dir) if f.endswith('.webm')]
raw_vid = os.path.join(raw_scene_dir, vids[0])
audio_file = r"D:\qelvora.in\dev_qelvora_school\dev_inkedu-main\p_en_2.mp3"
final_scene = os.path.join(test_dir, "scene_2_synced.mp4")

cmd = [
    ffmpeg, "-y",
    "-ss", str(t_ready),
    "-i", raw_vid,
    "-i", audio_file,
    "-t", str(target_dur),
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-c:a", "aac",
    final_scene
]
subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)

# Probe duration
res = subprocess.run([ffmpeg, "-i", final_scene], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
for l in res.stderr.splitlines():
    if "Duration:" in l:
        print("Final Scene 2 duration:", l.strip())
