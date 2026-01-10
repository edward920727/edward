#!/usr/bin/env python3
"""
生成 favicon.png 和 favicon.ico 的 Python 腳本
需要安裝 Pillow: pip install Pillow
"""

try:
    from PIL import Image
    import os
    
    # 檢查 logo.png 是否存在
    if not os.path.exists('logo.png'):
        print("❌ 錯誤: logo.png 不存在於當前目錄")
        exit(1)
    
    print("📸 正在讀取 logo.png...")
    # 開啟原始 logo
    logo = Image.open('logo.png')
    
    # 確保是 RGBA 模式（支援透明背景）
    if logo.mode != 'RGBA':
        logo = logo.convert('RGBA')
    
    # 生成 48x48 的 favicon.png
    print("🔄 正在生成 favicon.png (48x48)...")
    favicon_png = logo.resize((48, 48), Image.Resampling.LANCZOS)
    favicon_png.save('favicon.png', 'PNG')
    print("✅ favicon.png 已生成")
    
    # 生成 favicon.ico (包含多種尺寸: 16x16, 32x32, 48x48)
    print("🔄 正在生成 favicon.ico (多種尺寸)...")
    sizes = [(16, 16), (32, 32), (48, 48)]
    ico_images = []
    
    for size in sizes:
        resized = logo.resize(size, Image.Resampling.LANCZOS)
        ico_images.append(resized)
    
    # 儲存為 ICO 格式
    ico_images[0].save(
        'favicon.ico',
        format='ICO',
        sizes=[(img.width, img.height) for img in ico_images]
    )
    print("✅ favicon.ico 已生成")
    
    print("\n✨ 完成！已生成以下檔案：")
    print("   - favicon.png (48x48)")
    print("   - favicon.ico (包含 16x16, 32x32, 48x48)")
    print("\n請將這些檔案放在專案根目錄。")
    
except ImportError:
    print("❌ 錯誤: 需要安裝 Pillow 套件")
    print("請執行: pip install Pillow")
    exit(1)
except Exception as e:
    print(f"❌ 錯誤: {e}")
    exit(1)
