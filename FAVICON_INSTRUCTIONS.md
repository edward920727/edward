# Favicon 生成說明

## 需要的檔案
根據 `index.html` 的設置，您需要在根目錄放置以下檔案：
- `favicon.png` (48x48 像素，透明背景)
- `favicon.ico` (標準 favicon 格式，建議包含多種尺寸)

## 生成方法

### 方法 1：使用線上工具（推薦）
1. 訪問以下任一線上工具：
   - https://favicon.io/favicon-converter/ (推薦)
   - https://realfavicongenerator.net/
   - https://www.favicon-generator.org/

2. 上傳您的 `logo.png` 檔案（確保是透明背景的 PNG）

3. 生成並下載：
   - 下載 `favicon.png` (48x48)
   - 下載 `favicon.ico`
   - 將這些檔案放在專案根目錄

### 方法 2：使用 Python (如果已安裝 Pillow)
```bash
# 安裝 Pillow
pip install Pillow

# 執行生成腳本
python generate_favicon.py
```

### 方法 3：使用 ImageMagick
```bash
# 生成 48x48 的 favicon.png
magick convert logo.png -resize 48x48 -background transparent favicon.png

# 生成 favicon.ico (包含多種尺寸)
magick convert logo.png -define icon:auto-resize=16,32,48 favicon.ico
```

## 確認步驟
1. 確保 `logo.png` 有透明背景
2. 將生成的 `favicon.png` 和 `favicon.ico` 放在根目錄
3. 清除瀏覽器快取後重新載入頁面
4. 檢查瀏覽器分頁標籤是否顯示新的 favicon
