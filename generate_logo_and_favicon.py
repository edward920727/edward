#!/usr/bin/env python3
"""
生成/調整 logo.png (512x512) 和 favicon.ico 的完整腳本
需要安裝 Pillow: pip install Pillow
"""

try:
    from PIL import Image, ImageDraw, ImageFont
    import os
    
    print("=" * 50)
    print("Logo and Favicon Generator")
    print("=" * 50)
    
    # 檢查是否存在現有的 logo.png
    if os.path.exists('logo.png'):
        print("\n[INFO] Found existing logo.png, resizing...")
        logo = Image.open('logo.png')
        
        # 確保是 RGBA 模式（支援透明背景）
        if logo.mode != 'RGBA':
            logo = logo.convert('RGBA')
        
        # 調整為 512x512，保持透明背景
        print("[INFO] Resizing logo.png to 512x512 pixels (transparent background)...")
        logo_512 = logo.resize((512, 512), Image.Resampling.LANCZOS)
        logo_512.save('logo.png', 'PNG', optimize=True)
        print("[OK] logo.png updated to 512x512 pixels")
    else:
        print("\n[WARN] logo.png not found, creating default 512x512 transparent PNG...")
        # 創建一個 512x512 的透明 PNG（作為備用）
        logo_512 = Image.new('RGBA', (512, 512), (0, 0, 0, 0))
        
        # 如果用戶需要，可以在這裡添加文字或圖形
        # 目前只創建透明背景
        logo_512.save('logo.png', 'PNG', optimize=True)
        print("[OK] logo.png created (transparent background, 512x512)")
        print("     Note: This is an empty transparent image, please replace with actual logo")
    
    # 使用更新後的 logo 生成 favicon
    if os.path.exists('logo.png'):
        logo = Image.open('logo.png')
        if logo.mode != 'RGBA':
            logo = logo.convert('RGBA')
        
        # 生成 48x48 的 favicon.png
        print("\n[INFO] Generating favicon.png (48x48)...")
        favicon_png = logo.resize((48, 48), Image.Resampling.LANCZOS)
        favicon_png.save('favicon.png', 'PNG', optimize=True)
        print("[OK] favicon.png generated (48x48)")
        
        # 生成 favicon.ico (包含多種尺寸: 16x16, 32x32, 48x48)
        print("[INFO] Generating favicon.ico (multiple sizes: 16x16, 32x32, 48x48)...")
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
        print("[OK] favicon.ico generated (16x16, 32x32, 48x48)")
        
    # 檢查並刪除沒有副檔名的 logo 檔案
    print("\n[INFO] Checking for logo files without extension...")
    current_dir = os.getcwd()
    files = os.listdir(current_dir)
    logo_files_no_ext = [f for f in files if f.lower() == 'logo' and os.path.isfile(os.path.join(current_dir, f)) and not f.endswith('.png') and not f.endswith('.ico') and not f.endswith('.jpg') and not f.endswith('.jpeg') and not f.endswith('.svg')]
    
    if logo_files_no_ext:
        print(f"[WARN] Found logo files without extension: {logo_files_no_ext}")
        for file in logo_files_no_ext:
            try:
                os.remove(file)
                print(f"     [OK] Deleted: {file}")
            except Exception as e:
                print(f"     [ERROR] Cannot delete {file}: {e}")
    else:
        print("[OK] No logo files without extension found")
    
    print("\n" + "=" * 50)
    print("SUCCESS! All done!")
    print("=" * 50)
    print("\nGenerated/Updated files:")
    print("   - logo.png (512x512, transparent background)")
    print("   - favicon.png (48x48)")
    print("   - favicon.ico (16x16, 32x32, 48x48)")
    print("\nPlease clear browser cache and reload page to see the changes.")
    
except ImportError:
    print("\nERROR: Need to install Pillow package")
    print("Please run the following command to install:")
    print("   pip install Pillow")
    print("   or")
    print("   python -m pip install Pillow")
    exit(1)
except Exception as e:
    print(f"\nERROR: {e}")
    import traceback
    traceback.print_exc()
    exit(1)
