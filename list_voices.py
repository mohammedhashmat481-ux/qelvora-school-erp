import asyncio, edge_tts

async def list_v():
    voices = await edge_tts.list_voices()
    for v in voices:
        s = v['ShortName'].lower()
        if any(k in s for k in ['kn-in', 'ur-in', 'ur-pk', 'en-in', 'hi-in']):
            print(f"{v['ShortName']} | {v['Gender']} | {v['Locale']}")

if __name__ == '__main__':
    asyncio.run(list_v())
