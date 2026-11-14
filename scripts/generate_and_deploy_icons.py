import math
import os
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
MOBILE_RES = os.path.join(ROOT, "apps/mobile/android/app/src/main/res")
MOBILE_WEB = os.path.join(ROOT, "apps/mobile/web")
MOBILE_IOS = os.path.join(ROOT, "apps/mobile/ios/Runner/Assets.xcassets/AppIcon.appiconset")
WEB_PUBLIC = os.path.join(ROOT, "apps/web/public")
WEB_APP = os.path.join(ROOT, "apps/web/src/app")

def create_background(w, h):
    """Emerald gradient background filling 100% of canvas."""
    top_c = (16, 185, 129)   # Emerald 500 (#10B981)
    mid_c = (5, 150, 105)    # Emerald 600 (#059669)
    bot_c = (4, 78, 57)      # Emerald 900 (#044E39)
    
    bg_data = bytearray(w * h * 4)
    for y in range(h):
        t = y / (h - 1)
        if t < 0.5:
            s = t * 2.0
            r = int(top_c[0] * (1 - s) + mid_c[0] * s)
            g = int(top_c[1] * (1 - s) + mid_c[1] * s)
            b = int(top_c[2] * (1 - s) + mid_c[2] * s)
        else:
            s = (t - 0.5) * 2.0
            r = int(mid_c[0] * (1 - s) + bot_c[0] * s)
            g = int(mid_c[1] * (1 - s) + bot_c[1] * s)
            b = int(mid_c[2] * (1 - s) + bot_c[2] * s)
        row_offset = y * w * 4
        for x in range(w):
            idx = row_offset + x * 4
            bg_data[idx] = r
            bg_data[idx + 1] = g
            bg_data[idx + 2] = b
            bg_data[idx + 3] = 255
    return Image.frombytes("RGBA", (w, h), bytes(bg_data))

def create_foreground(size=1024):
    """
    Transparent foreground with Clean Savar leaf, recycling arcs, and cleanliness star.
    All key elements are strictly contained within the inner 66% safe zone radius.
    """
    scale = 4
    w = size * scale
    h = size * scale
    cx, cy = w // 2, h // 2
    
    canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    
    # 1. Recycling Orbit Ring / Stream Arcs
    stream_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    stream_draw = ImageDraw.Draw(stream_layer)
    orbit_r = int(w * 0.28)
    orbit_box = [cx - orbit_r, cy - orbit_r, cx + orbit_r, cy + orbit_r]
    
    # Outer faint guidance ring
    stream_draw.ellipse(orbit_box, outline=(255, 255, 255, 35), width=int(4 * scale))
    
    # Dynamic circulating arcs with arrowhead indicators
    arc_w = int(16 * scale)
    stream_draw.arc(orbit_box, start=195, end=335, fill=(209, 250, 229, 220), width=arc_w)
    stream_draw.arc(orbit_box, start=15, end=155, fill=(209, 250, 229, 220), width=arc_w)
    
    def draw_cap(angle_deg):
        rad = math.radians(angle_deg)
        px = cx + orbit_r * math.cos(rad)
        py = cy + orbit_r * math.sin(rad)
        r_dot = 10 * scale
        stream_draw.ellipse([px - r_dot, py - r_dot, px + r_dot, py + r_dot], fill=(220, 252, 231, 240))
        
    draw_cap(335)
    draw_cap(155)
    draw_cap(195)
    draw_cap(15)
    
    canvas = Image.alpha_composite(canvas, stream_layer)
    
    # 2. Organic Stem
    stem_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    stem_draw = ImageDraw.Draw(stem_layer)
    base_pt = (cx - int(100 * scale), cy + int(115 * scale))
    stem_end = (cx - int(155 * scale), cy + int(170 * scale))
    stem_mid = (cx - int(130 * scale), cy + int(150 * scale))
    stem_draw.line([stem_end, stem_mid, base_pt], fill=(220, 252, 231, 255), width=int(14 * scale))
    canvas = Image.alpha_composite(canvas, stem_layer)
    
    # 3. Leaf geometries
    tip_pt = (cx + int(120 * scale), cy - int(130 * scale))
    steps = 60
    
    # Right Half (Crisp White)
    rp0 = base_pt
    rp1 = (cx + int(20 * scale), cy + int(155 * scale))
    rp2 = (cx + int(170 * scale), cy + int(40 * scale))
    rp3 = tip_pt
    right_curve = []
    for i in range(steps + 1):
        t = i / steps
        x = (1-t)**3 * rp0[0] + 3*(1-t)**2*t * rp1[0] + 3*(1-t)*t**2 * rp2[0] + t**3 * rp3[0]
        y = (1-t)**3 * rp0[1] + 3*(1-t)**2*t * rp1[1] + 3*(1-t)*t**2 * rp2[1] + t**3 * rp3[1]
        right_curve.append((x, y))
        
    # Center Spine
    sp0 = tip_pt
    sp1 = (cx + int(40 * scale), cy - int(30 * scale))
    sp2 = (cx - int(25 * scale), cy + int(40 * scale))
    sp3 = base_pt
    center_spine = []
    for i in range(steps + 1):
        t = i / steps
        x = (1-t)**3 * sp0[0] + 3*(1-t)**2*t * sp1[0] + 3*(1-t)*t**2 * sp2[0] + t**3 * sp3[0]
        y = (1-t)**3 * sp0[1] + 3*(1-t)**2*t * sp1[1] + 3*(1-t)*t**2 * sp2[1] + t**3 * sp3[1]
        center_spine.append((x, y))
        
    # Left Half (Luminous Mint)
    lp0 = base_pt
    lp1 = (cx - int(155 * scale), cy + int(35 * scale))
    lp2 = (cx - int(115 * scale), cy - int(110 * scale))
    lp3 = tip_pt
    left_curve = []
    for i in range(steps + 1):
        t = i / steps
        x = (1-t)**3 * lp0[0] + 3*(1-t)**2*t * lp1[0] + 3*(1-t)*t**2 * lp2[0] + t**3 * lp3[0]
        y = (1-t)**3 * lp0[1] + 3*(1-t)**2*t * lp1[1] + 3*(1-t)*t**2 * lp2[1] + t**3 * lp3[1]
        left_curve.append((x, y))
        
    # Drop Shadow under leaf
    shadow_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow_layer)
    full_leaf_pts = right_curve + list(reversed(left_curve))
    shadow_pts = [(x + 12*scale, y + 22*scale) for x, y in full_leaf_pts]
    shadow_draw.polygon(shadow_pts, fill=(0, 20, 10, 120))
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(16 * scale))
    canvas = Image.alpha_composite(canvas, shadow_layer)
    
    # Draw leaf wings
    leaf_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    leaf_draw = ImageDraw.Draw(leaf_layer)
    
    # Left Wing (Mint)
    left_wing_pts = left_curve + center_spine
    leaf_draw.polygon(left_wing_pts, fill=(209, 250, 229, 255))
    
    # Right Wing (Pure Crisp White)
    right_wing_pts = right_curve + center_spine
    leaf_draw.polygon(right_wing_pts, fill=(255, 255, 255, 255))
    
    # Center Vein Division
    leaf_draw.line(center_spine, fill=(4, 120, 87, 255), width=int(10 * scale))
    
    # Secondary Veins (Right Wing)
    vein_color_r = (5, 150, 105, 220)
    leaf_draw.line([(cx + 20*scale, cy + 20*scale), (cx + 80*scale, cy + 60*scale)], fill=vein_color_r, width=int(5 * scale))
    leaf_draw.line([(cx + 65*scale, cy - 35*scale), (cx + 120*scale, cy - 5*scale)], fill=vein_color_r, width=int(5 * scale))
    leaf_draw.line([(cx - 30*scale, cy + 75*scale), (cx + 15*scale, cy + 115*scale)], fill=vein_color_r, width=int(5 * scale))
    
    # Secondary Veins (Left Wing)
    vein_color_l = (5, 150, 105, 180)
    leaf_draw.line([(cx - 20*scale, cy + 15*scale), (cx - 80*scale, cy - 15*scale)], fill=vein_color_l, width=int(5 * scale))
    leaf_draw.line([(cx + 25*scale, cy - 40*scale), (cx - 40*scale, cy - 75*scale)], fill=vein_color_l, width=int(5 * scale))
    leaf_draw.line([(cx - 70*scale, cy + 70*scale), (cx - 120*scale, cy + 40*scale)], fill=vein_color_l, width=int(5 * scale))
    
    # 4. Brilliant Golden Sparkle (Cleanliness / Excellence)
    spark_cx = cx + int(175 * scale)
    spark_cy = cy - int(155 * scale)
    spark_r1 = 32 * scale
    spark_r2 = 10 * scale
    spark_pts = []
    for i in range(8):
        ang = i * (math.pi / 4)
        r = spark_r1 if i % 2 == 0 else spark_r2
        spark_pts.append((spark_cx + r * math.cos(ang), spark_cy + r * math.sin(ang)))
    leaf_draw.polygon(spark_pts, fill=(254, 240, 138, 255))
    
    spark_core = []
    for i in range(8):
        ang = i * (math.pi / 4)
        r = (spark_r1 * 0.45) if i % 2 == 0 else (spark_r2 * 0.45)
        spark_core.append((spark_cx + r * math.cos(ang), spark_cy + r * math.sin(ang)))
    leaf_draw.polygon(spark_core, fill=(245, 158, 11, 255))
    
    canvas = Image.alpha_composite(canvas, leaf_layer)
    return canvas.resize((size, size), Image.Resampling.LANCZOS)

def create_legacy_icon(size, is_round=False):
    """Generates legacy standalone icon with full bleed background."""
    bg = create_background(size, size)
    fg = create_foreground(size)
    comp = Image.alpha_composite(bg, fg)
    
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    if is_round:
        draw.ellipse([0, 0, size, size], fill=255)
    else:
        radius = int(size * 0.22)
        draw.rounded_rectangle([0, 0, size, size], radius=radius, fill=255)
        
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(comp, (0, 0), mask)
    return out

def main():
    print("🎨 Rendering Master High-Resolution Assets...")
    master_bg = create_background(1024, 1024)
    master_fg = create_foreground(1024)
    master_full = Image.alpha_composite(master_bg, master_fg)
    
    # -------------------------------------------------------------
    # 1. Android Adaptive Icons & Mipmaps
    # -------------------------------------------------------------
    print("📱 Generating Android Icons & XML Drawables...")
    
    # Foreground densities (108dp base)
    fg_sizes = {
        "mipmap-mdpi": 108,
        "mipmap-hdpi": 162,
        "mipmap-xhdpi": 216,
        "mipmap-xxhdpi": 324,
        "mipmap-xxxhdpi": 432
    }
    
    # Legacy icon densities (48dp base)
    legacy_sizes = {
        "mipmap-mdpi": 48,
        "mipmap-hdpi": 72,
        "mipmap-xhdpi": 96,
        "mipmap-xxhdpi": 144,
        "mipmap-xxxhdpi": 192
    }
    
    for folder, dim in fg_sizes.items():
        dest_dir = os.path.join(MOBILE_RES, folder)
        os.makedirs(dest_dir, exist_ok=True)
        fg_icon = master_fg.resize((dim, dim), Image.Resampling.LANCZOS)
        fg_icon.save(os.path.join(dest_dir, "ic_launcher_foreground.png"))
        
    for folder, dim in legacy_sizes.items():
        dest_dir = os.path.join(MOBILE_RES, folder)
        os.makedirs(dest_dir, exist_ok=True)
        # Regular squircle
        icon = create_legacy_icon(dim, is_round=False)
        icon.save(os.path.join(dest_dir, "ic_launcher.png"))
        # Round icon
        icon_round = create_legacy_icon(dim, is_round=True)
        icon_round.save(os.path.join(dest_dir, "ic_launcher_round.png"))
        
    # Drawables
    drawable_dir = os.path.join(MOBILE_RES, "drawable")
    os.makedirs(drawable_dir, exist_ok=True)
    with open(os.path.join(drawable_dir, "ic_launcher_background.xml"), "w") as f:
        f.write('''<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <gradient
        android:startColor="#10B981"
        android:centerColor="#059669"
        android:endColor="#044E39"
        android:angle="270" />
</shape>
''')

    # Values colors
    values_dir = os.path.join(MOBILE_RES, "values")
    os.makedirs(values_dir, exist_ok=True)
    colors_xml_path = os.path.join(values_dir, "colors.xml")
    with open(colors_xml_path, "w") as f:
        f.write('''<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#059669</color>
</resources>
''')

    # Adaptive Icon XMLs in mipmap-anydpi-v26
    anydpi_dir = os.path.join(MOBILE_RES, "mipmap-anydpi-v26")
    os.makedirs(anydpi_dir, exist_ok=True)
    
    adaptive_xml = '''<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
'''
    with open(os.path.join(anydpi_dir, "ic_launcher.xml"), "w") as f:
        f.write(adaptive_xml)
    with open(os.path.join(anydpi_dir, "ic_launcher_round.xml"), "w") as f:
        f.write(adaptive_xml)
        
    # -------------------------------------------------------------
    # 2. Web & PWA Icons
    # -------------------------------------------------------------
    print("🌐 Generating Web & PWA Icons...")
    icon_512 = master_full.resize((512, 512), Image.Resampling.LANCZOS)
    icon_192 = master_full.resize((192, 192), Image.Resampling.LANCZOS)
    icon_180 = master_full.resize((180, 180), Image.Resampling.LANCZOS)
    icon_48  = master_full.resize((48, 48), Image.Resampling.LANCZOS)
    
    # apps/web/public
    os.makedirs(WEB_PUBLIC, exist_ok=True)
    icon_512.save(os.path.join(WEB_PUBLIC, "icon-512.png"))
    icon_192.save(os.path.join(WEB_PUBLIC, "icon-192.png"))
    icon_180.save(os.path.join(WEB_PUBLIC, "apple-touch-icon.png"))
    icon_512.save(os.path.join(WEB_PUBLIC, "favicon.ico"), format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])
    
    # apps/web/src/app
    os.makedirs(WEB_APP, exist_ok=True)
    icon_512.save(os.path.join(WEB_APP, "icon.png"))
    icon_180.save(os.path.join(WEB_APP, "apple-icon.png"))
    icon_512.save(os.path.join(WEB_APP, "favicon.ico"), format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])
    
    # apps/mobile/web
    mob_icons = os.path.join(MOBILE_WEB, "icons")
    os.makedirs(mob_icons, exist_ok=True)
    icon_48.save(os.path.join(MOBILE_WEB, "favicon.png"))
    icon_192.save(os.path.join(mob_icons, "Icon-192.png"))
    icon_512.save(os.path.join(mob_icons, "Icon-512.png"))
    icon_192.save(os.path.join(mob_icons, "Icon-maskable-192.png"))
    icon_512.save(os.path.join(mob_icons, "Icon-maskable-512.png"))
    
    # -------------------------------------------------------------
    # 3. iOS Icons
    # -------------------------------------------------------------
    if os.path.exists(MOBILE_IOS):
        print("🍎 Generating iOS AppIcon set...")
        ios_sizes = {
            "Icon-App-20x20@1x.png": 20,
            "Icon-App-20x20@2x.png": 40,
            "Icon-App-20x20@3x.png": 60,
            "Icon-App-29x29@1x.png": 29,
            "Icon-App-29x29@2x.png": 58,
            "Icon-App-29x29@3x.png": 87,
            "Icon-App-40x40@1x.png": 40,
            "Icon-App-40x40@2x.png": 80,
            "Icon-App-40x40@3x.png": 120,
            "Icon-App-60x60@2x.png": 120,
            "Icon-App-60x60@3x.png": 180,
            "Icon-App-76x76@1x.png": 76,
            "Icon-App-76x76@2x.png": 152,
            "Icon-App-83.5x83.5@2x.png": 167,
            "Icon-App-1024x1024@1x.png": 1024,
        }
        for filename, px in ios_sizes.items():
            img = master_full.resize((px, px), Image.Resampling.LANCZOS)
            img.save(os.path.join(MOBILE_IOS, filename))
            
    print("✅ All Android Adaptive Icons, XMLs, Web, and iOS Icons updated successfully!")

if __name__ == "__main__":
    main()
