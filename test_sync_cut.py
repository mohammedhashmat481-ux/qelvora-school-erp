import sys, time, os, subprocess
sys.stdout.reconfigure(encoding='utf-8')
import imageio_ffmpeg
from playwright.sync_api import sync_playwright

ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
test_dir = r"D:\qelvora.in\dev_qelvora_school\dev_inkedu-main\demo_output\test_sync"
os.makedirs(test_dir, exist_ok=True)

with sync_playwright() as p:
    b = p.chromium.launch(executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe', headless=True)
    ctx = b.new_context(
        viewport={'width': 1920, 'height': 1080},
        record_video_dir=test_dir,
        record_video_size={'width': 1920, 'height': 1080}
    )
    t_start = time.time()
    page = ctx.new_page()
    
    # 1. Login
    page.goto('https://school.qelvora.in/login')
    page.get_by_text('Student & Parent', exact=True).first.click()
    page.locator('button[type="submit"]').click()
    page.wait_for_url('**/profile', timeout=10000)
    time.sleep(1)
    
    # 2. Benchmark cut
    t_seg_start = time.time() - t_start
    print(f"Segment start relative to video start: {t_seg_start:.2f}s")
    
    # Do 5 seconds of work
    time.sleep(5)
    t_seg_end = time.time() - t_start
    print(f"Segment end relative to video start: {t_seg_end:.2f}s, dur = {t_seg_end - t_seg_start:.2f}s")
    
    ctx.close()
    b.close()

# Check raw video
vids = [f for f in os.listdir(test_dir) if f.endswith('.webm')]
raw_vid = os.path.join(test_dir, vids[0])
cut_mp4 = os.path.join(test_dir, "cut_test.mp4")

cmd = [
    ffmpeg, "-y",
    "-ss", str(t_seg_start),
    "-to", str(t_seg_end),
    "-i", raw_vid,
    "-c:v", "libx264",
    "-c:a", "aac",
    cut_mp4
]
subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)

# probe cut duration
res = subprocess.run([ffmpeg, "-i", cut_mp4], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
for l in res.stderr.splitlines():
    if "Duration:" in l:
        print("Cut MP4 duration:", l.strip())
