import subprocess, imageio_ffmpeg, os

script_dir = r'D:\qelvora.in\dev_qelvora_school\dev_inkedu-main'
ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()

for lang in ['en', 'hi', 'local']:
    prefix = 'loc' if lang == 'local' else lang
    print(f'=== {lang.upper()} CLIPS ===')
    for i in range(1, 11):
        f = f'{prefix}_{i}.mp3'
        p = os.path.join(script_dir, f)
        proc = subprocess.run([ffmpeg, '-i', p], stderr=subprocess.PIPE, text=True)
        dur = 0.0
        for line in proc.stderr.splitlines():
            if 'Duration:' in line:
                dur_str = line.split('Duration:')[1].split(',')[0].strip()
                h, m, s = dur_str.split(':')
                dur = float(h)*3600 + float(m)*60 + float(s)
        print(f'{f}: {dur:.3f}s')
