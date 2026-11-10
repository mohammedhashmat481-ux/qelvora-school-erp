path = r'D:\qelvora.in\dev_qelvora_school\dev_inkedu-main\record_full_fees_tour.py'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

# Replace all occurrences of page.wait_for_load_state("networkidle")
new_text = text.replace('page.wait_for_load_state("networkidle")', 'time.sleep(0.3)')

with open(path, 'w', encoding='utf-8') as f:
    f.write(new_text)

print('Replaced all networkidle calls successfully!')
