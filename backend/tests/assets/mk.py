from PIL import Image, ImageDraw, ImageFont
import random
W,H=800,1100
im=Image.new("RGB",(W,H))
d=ImageDraw.Draw(im)
for y in range(H):
    d.line([(0,y),(W,y)],fill=(40+y//8,10,90+y//10))
random.seed(3)
for _ in range(60):
    x,y,r=random.randint(0,W),random.randint(0,H),random.randint(5,40)
    d.ellipse([x-r,y-r,x+r,y+r],outline=(255,random.randint(100,220),60),width=3)
F="/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
f1,f2,f3=ImageFont.truetype(F,72),ImageFont.truetype(F,48),ImageFont.truetype(F,36)
d.rectangle([40,120,760,420],fill=(0,0,0))
d.text((70,150),"JAZZ NIGHT",font=f1,fill=(255,220,0))
d.text((70,250),"POTENZA",font=f1,fill=(255,255,255))
d.text((60,520),"SABATO 24 OTTOBRE 2026",font=f2,fill=(255,255,255))
d.text((60,600),"ORE 21:30",font=f2,fill=(255,200,80))
d.text((60,700),"Teatro Stabile - Centro Storico",font=f3,fill=(255,255,255))
d.text((60,760),"Ingresso 10 euro",font=f3,fill=(255,255,255))
im.save("poster.jpg","JPEG",quality=85)
