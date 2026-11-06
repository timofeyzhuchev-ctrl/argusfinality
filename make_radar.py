from PIL import Image, ImageDraw, ImageFont
import math
from pathlib import Path

out = Path(__file__).parent / 'argusfinality/public/assets/telegram/processing.gif'
out.parent.mkdir(parents=True, exist_ok=True)
font = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 15)
title = ImageFont.truetype('C:/Windows/Fonts/seguisb.ttf', 34)
small = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 11)
frames = []
for frame in range(48):
    im = Image.new('RGB', (480, 270), '#06101d')
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((8, 8, 471, 261), 20, outline='#123149', width=1)
    d.polygon(((29,25),(33,29),(29,33),(25,29)), outline='#4edbe7')
    d.text((41, 23), 'ARGUS / VISION', fill='#7aa4b8', font=small)
    cx, cy, r = 121, 149, 78
    for x in range(45, 201, 13):
        d.line((x, 72, x, 226), fill='#0b2030')
    for y in range(72, 227, 13):
        d.line((44, y, 199, y), fill='#0b2030')
    for rad in (26, 52, 78):
        d.ellipse((cx-rad, cy-rad, cx+rad, cy+rad), outline='#174058')
    angle = frame * 360/48
    for k in range(42, 0, -1):
        a = math.radians(angle-k)
        brightness = (1-k/43)**2
        color = (8, int(45+95*brightness), int(65+85*brightness))
        d.line((cx, cy, cx+r*math.cos(a), cy+r*math.sin(a)), fill=color, width=2)
    a = math.radians(angle)
    d.line((cx, cy, cx+r*math.cos(a), cy+r*math.sin(a)), fill='#5feaf2', width=2)
    for dx, dy in ((-24,-39),(40,19),(-33,37)):
        point_angle = math.degrees(math.atan2(dy,dx)) % 360
        age = (angle-point_angle) % 360
        intensity = max(0.12, 1-age/120)
        color = (int(32+55*intensity), int(76+151*intensity), int(96+146*intensity))
        d.ellipse((cx+dx-3,cy+dy-3,cx+dx+3,cy+dy+3), fill=color)
    d.ellipse((cx-3,cy-3,cx+3,cy+3), fill='#b0f8fc')
    d.text((231, 79), 'АРГУС', fill='#e1f8ff', font=title)
    d.text((233, 126), 'ВИЗУАЛЬНЫЙ АНАЛИЗ', fill='#4edbe7', font=small)
    d.text((233, 161), 'Обрабатываю файл', fill='#abc7d8', font=font)
    for i in range(3):
        color = '#60ecf2' if (frame//8)%3==i else '#1d485f'
        d.ellipse((234+i*14,199,239+i*14,204), fill=color)
    d.text((233, 229), 'Отчёт появится в чате', fill='#67879c', font=small)
    frames.append(im)
frames[0].save(out, save_all=True, append_images=frames[1:], duration=60, loop=0, optimize=True)
frames[8].save(Path(__file__).parent / 'radar-preview.png')
print(f'{out.name}: {out.stat().st_size} bytes, {len(frames)} frames')
