#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Check Logo and Favicon image dimensions"""

import sys
import os

try:
    from PIL import Image
    
    files_to_check = {
        'logo.png': 'Logo Image',
        'favicon.png': 'Favicon PNG',
        'favicon.ico': 'Favicon ICO'
    }
    
    print("=" * 60)
    print("Logo and Favicon File Size Check")
    print("=" * 60)
    
    all_ok = True
    
    for filename, description in files_to_check.items():
        print(f"\n{description} ({filename}):")
        if os.path.exists(filename):
            try:
                if filename.endswith('.ico'):
                    # ICO file may contain multiple sizes
                    img = Image.open(filename)
                    sizes = img.sizes if hasattr(img, 'sizes') else [img.size]
                    print(f"  Status: EXISTS")
                    print(f"  Sizes: {sizes}")
                    print(f"  Format: {img.format}")
                else:
                    img = Image.open(filename)
                    width, height = img.size
                    file_size = os.path.getsize(filename)
                    
                    print(f"  Status: EXISTS")
                    print(f"  Dimensions: {width} x {height} pixels")
                    print(f"  File Size: {file_size / 1024:.2f} KB")
                    print(f"  Format: {img.format}")
                    print(f"  Mode: {img.mode}")
                    
                    # Check transparency
                    if img.mode in ('RGBA', 'LA', 'P'):
                        try:
                            # Check if has alpha channel
                            has_alpha = img.mode in ('RGBA', 'LA') or 'transparency' in img.info
                            print(f"  Transparency: {'YES' if has_alpha else 'NO'}")
                        except:
                            print(f"  Transparency: Unknown")
                    
                    # Size recommendations
                    if filename == 'logo.png':
                        if width < 512 or height < 512:
                            print(f"  WARNING: Logo should be 512x512 or larger")
                            print(f"  Recommendation: Resize to at least 512x512")
                            all_ok = False
                        else:
                            print(f"  OK: Logo size meets recommendation (>=512x512)")
                    
                    elif filename == 'favicon.png':
                        if width != 48 or height != 48:
                            print(f"  WARNING: Favicon PNG should be 48x48 pixels")
                            print(f"  Recommendation: Resize to 48x48")
                            all_ok = False
                        else:
                            print(f"  OK: Favicon PNG size is correct (48x48)")
                            
            except Exception as e:
                print(f"  Status: EXISTS")
                print(f"  ERROR: Cannot read image - {str(e)}")
                all_ok = False
        else:
            print(f"  Status: NOT FOUND")
            print(f"  Action: File does not exist!")
            all_ok = False
    
    print("\n" + "=" * 60)
    if all_ok:
        print("RESULT: All files are properly configured!")
    else:
        print("RESULT: Some files need adjustment")
    print("=" * 60)
    
except ImportError:
    print("ERROR: Pillow library is required")
    print("Please run: pip install Pillow")
    sys.exit(1)
except Exception as e:
    print(f"ERROR: {str(e)}")
    sys.exit(1)
