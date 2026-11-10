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

scripts = {
    'en': [
        ('en_1.mp3', 'Welcome to Qelvora Fees Management. Monitor live daily collections, class-wise pending dues, and overall institutional revenue with real-time financial tracking.', 'en-IN-PrabhatNeural'),
        ('en_2.mp3', 'Under Fee Heads, configure every fee category charged by your school, including monthly Tuition, Annual development, Computer Lab, and Examination fees.', 'en-IN-PrabhatNeural'),
        ('en_3.mp3', 'Quota Master empowers you to create custom admission categories, such as General, RTE with full tuition waiver, Staff Ward concessions, and Merit scholarships.', 'en-IN-PrabhatNeural'),
        ('en_4.mp3', 'Fee Structure lets you set multi-row fee grids for each class and quota, calculate annual demand, and automatically split fees into term installments.', 'en-IN-PrabhatNeural'),
        ('en_5.mp3', 'With Assign Quota, you can easily group students into specific fee categories in bulk, ensuring each student is billed the correct customized structure.', 'en-IN-PrabhatNeural'),
        ('en_6.mp3', 'Student Fee Adjustment allows you to grant individual fee discounts, merit waivers, or custom adjustments without altering the standard class fee structure.', 'en-IN-PrabhatNeural'),
        ('en_7.mp3', 'Previous Year Balance tracks carried-forward student arrears, outstanding past balances, and historical reconciliations with one-click balance collection.', 'en-IN-PrabhatNeural'),
        ('en_8.mp3', 'In Fee Collection, select any student to launch the collection desk. Choose fee heads, select Cash payment mode, and instantly collect dues with automated receipt generation.', 'en-IN-PrabhatNeural'),
        ('en_9.mp3', 'The Receipts Ledger stores every issued receipt. Click Print to preview the official CBSE affiliated receipt, showing student details, paid amount, cash mode, and authorized signature.', 'en-IN-PrabhatNeural'),
        ('en_10.mp3', 'Take complete control of your school finances with Qelvora ERP, from fee setup to daily cash collection. Simple, transparent, and error-free.', 'en-IN-PrabhatNeural')
    ],
    'hi': [
        ('hi_1.mp3', 'क़ेलवोरा फ़ीस मैनेजमेंट में आपका स्वागत है। यहाँ आप दैनिक फ़ीस कलेक्शन, कक्षा-वार बकाया राशि और स्कूल की कुल आय को रियल टाइम में आसानी से देख सकते हैं।', 'hi-IN-MadhurNeural'),
        ('hi_2.mp3', 'फ़ीस हेड्स में आप अपने स्कूल के सभी फ़ीस प्रकार सेट कर सकते हैं, जैसे मासिक ट्यूशन फ़ीस, वार्षिक विकास शुल्क, कंप्यूटर लैब फ़ीस और परीक्षा शुल्क।', 'hi-IN-MadhurNeural'),
        ('hi_3.mp3', 'कोटा मास्टर की मदद से आप छात्र श्रेणियां बना सकते हैं, जैसे जनरल, आरटीई में शत-प्रतिशत छूट, स्टाफ़ वार्ड के लिए पचास प्रतिशत छूट और मेरिट स्कॉलरशिप।', 'hi-IN-MadhurNeural'),
        ('hi_4.mp3', 'फ़ीस स्ट्रक्चर में आप प्रत्येक कक्षा और कोटा के लिए फ़ीस तालिका तैयार कर सकते हैं, कुल वार्षिक शुल्क तय कर सकते हैं और इसे किश्तों में बाँट सकते हैं।', 'hi-IN-MadhurNeural'),
        ('hi_5.mp3', 'असाइन कोटा के ज़रिये आप छात्रों को एक साथ उनके सही फ़ीस कोटे में जोड़ सकते हैं, ताकि हर छात्र से केवल उसकी निर्धारित फ़ीस ही ली जाए।', 'hi-IN-MadhurNeural'),
        ('hi_6.mp3', 'स्टूडेंट फ़ीस एडजस्टमेंट से आप किसी भी छात्र को विशेष छूट, मेरिट कन्सेशन या विशेष रियायत दे सकते हैं, बिना मुख्य कक्षा फ़ीस को बदले।', 'hi-IN-MadhurNeural'),
        ('hi_7.mp3', 'प्रीवियस ईयर बैलेंस में पिछले साल की बकाया फ़ीस का पूरा हिसाब रहता है, जहाँ से आप पिछले सत्र की बकाया राशि को एक क्लिक में वसूल कर सकते हैं।', 'hi-IN-MadhurNeural'),
        ('hi_8.mp3', 'फ़ीस कलेक्शन में किसी भी छात्र को चुनकर कलेक्शन डेस्क खोलें। फ़ीस हेड्स चुनें, कैश मोड का चयन करें और तुरंत रसीद बनाकर नकद फ़ीस जमा करें।', 'hi-IN-MadhurNeural'),
        ('hi_9.mp3', 'रसीद रजिस्टर में सभी जारी की गई रसीदें सुरक्षित रहती हैं। प्रिंट पर क्लिक करते ही स्कूल का लोगो, सीबीएसई मान्यता, छात्र विवरण, जमा राशि और हस्ताक्षर वाली पक्की रसीद खुल जाती है।', 'hi-IN-MadhurNeural'),
        ('hi_10.mp3', 'क़ेलवोरा ईआरपी के साथ अपने स्कूल के फ़ाइनेंस को बनाएं पूरी तरह डिजिटल और पारदर्शी। फ़ीस निर्धारण से लेकर नकद वसूली तक, सब कुछ बेहद आसान।', 'hi-IN-MadhurNeural')
    ],
    'local': [
        ('loc_1.mp3', 'Qelvora Fees Management mein aapka swagat hai. Yahan aap rozana ki live fee collection, class-wise pending dues, aur school ke poore revenue ko badi asaani se track kar sakte hain.', 'hi-IN-MadhurNeural'),
        ('loc_2.mp3', 'Fee Heads ke andar aap school ke tamam fee categories set kar sakte hain, jaise monthly tuition fee, annual development charge, computer lab fee, aur exam fees.', 'hi-IN-MadhurNeural'),
        ('loc_3.mp3', 'Quota Master se aap students ke alag-alag categories bana sakte hain, jaise General quota, RTE mein poori fee maafi, staff ke bachon ke liye special concession, aur merit scholarship.', 'hi-IN-MadhurNeural'),
        ('loc_4.mp3', 'Fee Structure mein aap har class aur quota ke hisab se poora fee chart ready kar sakte hain, saalana fees calculate kar sakte hain, aur use aasan term installments mein divide kar sakte hain.', 'hi-IN-MadhurNeural'),
        ('loc_5.mp3', 'Assign Quota ki madad se aap students ko ek click mein unke sahi fee quota mein daal sakte hain, taaki har student ka bilkul sahi aur accurate hisab bane.', 'hi-IN-MadhurNeural'),
        ('loc_6.mp3', 'Student Fee Adjustment se aap kisi bhi student ko individual discount, merit waiver, ya custom adjustment de sakte hain, bina poore class ka fee structure badle.', 'hi-IN-MadhurNeural'),
        ('loc_7.mp3', 'Previous Year Balance mein pichle saal ki jitni bhi baki fees ya arrears hote hain, unka poora record rehta hai, aur aap use single click mein collect kar sakte hain.', 'hi-IN-MadhurNeural'),
        ('loc_8.mp3', 'Fee Collection mein kisi bhi student ko select karke counter kholein. Fee heads chunein, payment mein Cash mode select karein, aur foran payment receive karke receipt generate karein.', 'hi-IN-MadhurNeural'),
        ('loc_9.mp3', 'Receipts Ledger mein har transaction ka mukammal hisab rehta hai. Print par click karte hi school ka official receipt khul jata hai, jisme CBSE affiliation, student details, cash amount aur authorized signature saaf dikhte hain.', 'hi-IN-MadhurNeural'),
        ('loc_10.mp3', 'Qelvora ERP ke sath apne school ka poora finance banayein aasan aur behtareen. Fee setup se lekar daily cash collection aur receipt print tak, 100% transparent aur error-free.', 'hi-IN-MadhurNeural')
    ]
}

async def generate_all():
    for lang, items in scripts.items():
        print(f"Generating {lang} audios...")
        concat_lines = []
        for fname, text, voice in items:
            out_p = os.path.join(script_dir, fname)
            comm = edge_tts.Communicate(text, voice)
            await comm.save(out_p)
            clean_path = out_p.replace('\\', '/')
            concat_lines.append(f"file '{clean_path}'")
        
        c_txt = os.path.join(script_dir, f"concat_{lang}.txt")
        with open(c_txt, "w", encoding="utf-8") as f:
            f.write("\n".join(concat_lines) + "\n")
            
        master_a = os.path.join(script_dir, f"master_{lang}.mp3")
        cmd = [ffmpeg, "-y", "-f", "concat", "-safe", "0", "-i", c_txt, "-c", "copy", master_a]
        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        print(f"✅ Master audio for {lang} ready: {master_a}")

if __name__ == "__main__":
    asyncio.run(generate_all())
