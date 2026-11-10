import asyncio
import edge_tts
import subprocess
import imageio_ffmpeg
import os
import sys

if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

script_dir = r'D:\qelvora.in\dev_qelvora_school\dev_inkedu-main'
ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()

# 7 tightly timed scenes for Parents Portal Walkthrough
scripts = {
    'en': [
        ('p_en_1.mp3', 'Welcome to Qelvora Parents Portal. Logging in is effortless from your smartphone or computer with secure one-click credentials.', 'en-IN-PrabhatNeural'),
        ('p_en_2.mp3', 'The Parent Dashboard gives you immediate visibility into your child’s daily life, featuring live attendance tracking, class timetable, and recorded lessons.', 'en-IN-PrabhatNeural'),
        ('p_en_3.mp3', 'In Student Profile, access verified academic records, Class 5-A details, Sapphire House, blood group, and continuous academic progression.', 'en-IN-PrabhatNeural'),
        ('p_en_4.mp3', 'Parents and Guardians profile displays government-verified identities for mother and father, authorized emergency contacts, and verified pickup permissions.', 'en-IN-PrabhatNeural'),
        ('p_en_5.mp3', 'Under Examination and Progress, review subject-wise marks across Mathematics, Science, and English, term report cards, and teacher remarks instantly.', 'en-IN-PrabhatNeural'),
        ('p_en_6.mp3', 'Fees Due and Receipts lets you view pending term dues, make instant online fee payments, and download official verified school receipts anytime from home.', 'en-IN-PrabhatNeural'),
        ('p_en_7.mp3', 'Safe Pickup protocol lets you authorize who picks up your child and track real-time gate exit status. Stay connected and assured with Qelvora School ERP.', 'en-IN-PrabhatNeural')
    ],
    'local': [
        ('p_loc_1.mp3', 'Qelvora Parents Portal mein aapka swagat hai. Ab parents apne mobile ya computer se sirf ek click mein asaani se login kar sakte hain.', 'hi-IN-MadhurNeural'),
        ('p_loc_2.mp3', 'Parent Dashboard par aate hi aapko bache ki daily live attendance, weekly timetable, aur classroom lectures ki poori jankari mil jati hai.', 'hi-IN-MadhurNeural'),
        ('p_loc_3.mp3', 'Student Profile mein bache ka Class 5-A, Roll number, House, blood group, aur saal-dar-saal ki shaandar academic progression saaf dikhti hai.', 'hi-IN-MadhurNeural'),
        ('p_loc_4.mp3', 'Parents and Guardians section mein Mother aur Father ki Government ID verified profile aur emergency contact details poori tarah surakshit rehti hain.', 'hi-IN-MadhurNeural'),
        ('p_loc_5.mp3', 'Examination aur Progress mein aap Term exams ke number, Mathematics, Science aur English ke marks aur teachers ke remarks ghar baithe dekh sakte hain.', 'hi-IN-MadhurNeural'),
        ('p_loc_6.mp3', 'Fees Due aur Receipts mein baki fees check karein, online fees jama karein, aur turant official school fee receipt download kar lein.', 'hi-IN-MadhurNeural'),
        ('p_loc_7.mp3', 'Safe Pickup se aap roz decide kar sakte hain ki bache ko school se kaun receive karega, aur live gate exit track kar sakte hain. Qelvora ERP ke sath bache hamesha mehfooz.', 'hi-IN-MadhurNeural')
    ],
    'ur': [
        ('p_ur_1.mp3', 'السلام علیکم! قیلورا پیرنٹس پورٹل میں خوش آمدید۔ والدین اب اپنے موبائل فون یا کمپیوٹر سے باآسانی لاگ ان کر سکتے ہیں۔', 'ur-IN-SalmanNeural'),
        ('p_ur_2.mp3', 'پیرنٹ ڈیش بورڈ پر آپ کو بچے کی روزانہ کی لائیو حاضری، ہفتہ وار ٹائم ٹیبل اور اسباق کی مکمل تفصیلات فوری نظر آ جاتی ہیں۔', 'ur-IN-SalmanNeural'),
        ('p_ur_3.mp3', 'اسٹوڈنٹ پروفائل میں بچے کی کلاس فائیو اے، رول نمبر، بلڈ گروپ اور سالانہ تعلیمی ترقی کا مکمل ریکارڈ موجود ہے۔', 'ur-IN-SalmanNeural'),
        ('p_ur_4.mp3', 'والدین اور سرپرست پروفائل میں والدہ اور والد کے تصدیق شدہ شناختی کارڈ اور ایمرجنسی رابطے کے مکمل کوائف محفوظ رہتے ہیں۔', 'ur-IN-SalmanNeural'),
        ('p_ur_5.mp3', 'امتحانات اور تعلیمی پیش رفت میں آپ ریاضی، سائنس اور انگریزی کے امتحانی نمبرات اور اساتذہ کی آراء گھر بیٹھے دیکھ سکتے ہیں۔', 'ur-IN-SalmanNeural'),
        ('p_ur_6.mp3', 'فیس واجبات اور رسیدات میں بقایا فیس دیکھیں، آن لائن فیس ادا کریں، اور اسکول کی تصدیق شدہ فیس رسید فوراً حاصل کریں۔', 'ur-IN-SalmanNeural'),
        ('p_ur_7.mp3', 'سیف پک اپ پروٹوکول کے ذریعے آپ بااختیار سرپرست چن سکتے ہیں اور گیٹ سے نکلنے کی لائیو اطلاع پا سکتے ہیں۔ قیلورا اسکول ای آر پی، آپ کے بچے کا بہترین اور محفوظ ساتھی۔', 'ur-IN-SalmanNeural')
    ],
    'kn': [
        ('p_kn_1.mp3', 'ಖೆಲ್ವೋರಾ ಪೇರೆಂಟ್ಸ್ ಪೋರ್ಟಲ್‌ಗೆ ಸುಸ್ವಾಗತ. ಪೋಷಕರು ತಮ್ಮ ಮೊಬೈಲ್ ಅಥವಾ ಕಂಪ್ಯೂಟರ್ ಮೂಲಕ ಕೇವಲ ಒಂದೇ ಕ್ಲಿಕ್‌ನಲ್ಲಿ ಸುಲಭವಾಗಿ ಲಾಗಿನ್ ಮಾಡಬಹುದು.', 'kn-IN-GaganNeural'),
        ('p_kn_2.mp3', 'ಪೇರೆಂಟ್ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್‌ನಲ್ಲಿ ನಿಮ್ಮ ಮಗುವಿನ ದೈನಂದಿನ ಲೈವ್ ಹಾಜರಾತಿ, ವಾರದ ವೇಳಾಪಟ್ಟಿ ಮತ್ತು ತರಗತಿ ರೆಕಾರ್ಡಿಂಗ್‌ಗಳನ್ನು ತಕ್ಷಣವೇ ನೋಡಬಹುದು.', 'kn-IN-GaganNeural'),
        ('p_kn_3.mp3', 'ಸ್ಟೂಡೆಂಟ್ ಪ್ರೊಫೈಲ್‌ನಲ್ಲಿ ತರಗತಿ ಐದು-ಎ, ರೋಲ್ ನಂಬರ್, ಬ್ಲಡ್ ಗ್ರೂಪ್ ಮತ್ತು ಶೈಕ್ಷಣಿಕ ಪ್ರಗತಿಯ ಸಂಪೂರ್ಣ ವಿವರಗಳು ಲಭ್ಯವಿವೆ.', 'kn-IN-GaganNeural'),
        ('p_kn_4.mp3', 'ಪೋಷಕರ ಪ್ರೊಫೈಲ್‌ನಲ್ಲಿ ತಾಯಿ ಮತ್ತು ತಂದೆಯ ಸರ್ಕಾರದ ಗುರುತಿನ ಚೀಟಿ ದೃಢೀಕರಿಸಿದ ದಾಖಲೆಗಳು ಮತ್ತು ತುರ್ತು ಸಂಪರ್ಕ ವಿವರಗಳು ಸುರಕ್ಷಿತವಾಗಿವೆ.', 'kn-IN-GaganNeural'),
        ('p_kn_5.mp3', 'ಪರೀಕ್ಷೆ ಮತ್ತು ಪ್ರಗತಿ ವಿಭಾಗದಲ್ಲಿ ಗಣಿತ, ವಿಜ್ಞಾನ ಮತ್ತು ಇಂಗ್ಲಿಷ್ ವಿಷಯಗಳ ಅಂಕಗಳು, ಪ್ರಗತಿ ಪತ್ರ ಹಾಗೂ ಶಿಕ್ಷಕರ ಅಭಿಪ್ರಾಯಗಳನ್ನು ವೀಕ್ಷಿಸಿ.', 'kn-IN-GaganNeural'),
        ('p_kn_6.mp3', 'ಫೀಸ್ ಬಾಕಿ ಮತ್ತು ರಸೀದಿಗಳ ವಿಭಾಗದಲ್ಲಿ ಶಾಲಾ ಶುಲ್ಕ ಪರಿಶೀಲಿಸಿ, ಆನ್‌ಲೈನ್‌ನಲ್ಲಿ ಪಾವತಿಸಿ ಮತ್ತು ಅಧಿಕೃತ ರಸೀದಿಯನ್ನು ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ.', 'kn-IN-GaganNeural'),
        ('p_kn_7.mp3', 'ಸುರಕ್ಷಿತ ಪಿಕಪ್ ಸೌಲಭ್ಯದ ಮೂಲಕ ಮಗುವನ್ನು ಯಾರು ಶಾಲೆಗೆ ಬಂದು ಕರೆದೊಯ್ಯಬೇಕು ಎಂಬುದನ್ನು ನಿರ್ಧರಿಸಿ ಮತ್ತು ಗೇಟ್ ಎಕ್ಸಿಟ್ ಪರಿಶೀಲಿಸಿ. ಖೆಲ್ವೋರಾ ಇಆರ್‌ಪಿ ನಿಮ್ಮ ಮಕ್ಕಳ ಭದ್ರತೆಯ ವಿಶ್ವಾಸಾರ್ಹ ತಾಣ.', 'kn-IN-GaganNeural')
    ]
}

async def generate_all():
    durations = {}
    for lang, items in scripts.items():
        print(f"\n🎙️ Generating {lang.upper()} audios...")
        concat_lines = []
        lang_durations = []
        for fname, text, voice in items:
            out_p = os.path.join(script_dir, fname)
            comm = edge_tts.Communicate(text, voice)
            await comm.save(out_p)
            
            # get clip duration via ffprobe
            probe_cmd = [
                ffmpeg.replace('ffmpeg.exe', 'ffprobe.exe') if os.path.exists(ffmpeg.replace('ffmpeg.exe', 'ffprobe.exe')) else ffmpeg,
                "-i", out_p
            ]
            # using ffmpeg to get duration
            res = subprocess.run([ffmpeg, "-i", out_p], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            dur = 0.0
            for line in res.stderr.splitlines():
                if "Duration:" in line:
                    t_str = line.split("Duration:")[1].split(",")[0].strip()
                    h, m, s = t_str.split(":")
                    dur = int(h)*3600 + int(m)*60 + float(s)
                    break
            lang_durations.append(dur)
            print(f"  - {fname}: {dur:.2f}s")
            
            clean_path = out_p.replace('\\', '/')
            concat_lines.append(f"file '{clean_path}'")
        
        durations[lang] = lang_durations
        c_txt = os.path.join(script_dir, f"concat_parent_{lang}.txt")
        with open(c_txt, "w", encoding="utf-8") as f:
            f.write("\n".join(concat_lines) + "\n")
            
        master_a = os.path.join(script_dir, f"master_parent_{lang}.mp3")
        cmd = [ffmpeg, "-y", "-f", "concat", "-safe", "0", "-i", c_txt, "-c", "copy", master_a]
        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        print(f"✅ Master audio for {lang} ready: {master_a} (Total: {sum(lang_durations):.2f}s)")

    print("\nSUMMARY OF SCENE DURATIONS:")
    for lang, durs in durations.items():
        print(f"'{lang}': {[round(d, 2) for d in durs]},")

if __name__ == "__main__":
    asyncio.run(generate_all())
