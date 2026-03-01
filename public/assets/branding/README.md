# CapturePro Branding Assets

## Icon Design Specifications

### Color Palette
- **Background**: `#0F172A` (Dark Navy) - Primary brand color
- **Falcon**: `#FFFFFF` (White) with subtle glow effect
- **Letter C**: `#4A9EFF` (Blue) - Brand accent color
- **Letter P**: `#A3E635` (Lime Green) - Brand success color

### Design Elements
- **Falcon**: Dynamic side profile with spread wings symbolizing precision, speed, and motion
- **Typography**: Bold, modern sans-serif letters C and P
- **Layout**: Centered falcon with strategically overlapping C and P letters for visual balance

## Files Overview

### Source Files
- `web-icon.svg` - Full-size icon design (512×512) with all details
- `favicon.svg` - Simplified icon optimized for small sizes (32×32)
- `icon-generator.html` - HTML tool to generate PNG files from SVG sources

### Generated Files (via icon-generator.html)
- `favicon.png` - 32×32 PNG for browser favicon
- `app_icon_192.png` - 192×192 PNG for PWA manifest
- `app_icon_512.png` - 512×512 PNG for PWA manifest
- `apple-touch-icon.png` - 180×180 PNG for iOS home screen

## Generating PNG Icons

1. Open `icon-generator.html` in a web browser
2. Click the download button for each icon size
3. Replace the existing PNG files in this directory with the downloaded versions

**Note**: The SVG files are already referenced in `index.html` and `manifest.webmanifest` for modern browser support. PNG versions provide fallback support for older browsers.

## Usage in Code

### HTML (`index.html`)
```html
<link rel="icon" type="image/svg+xml" href="/assets/branding/favicon.svg" />
<link rel="icon" type="image/png" href="/assets/branding/favicon.png" />
<link rel="apple-touch-icon" href="/assets/branding/apple-touch-icon.png" />
<meta name="theme-color" content="#0F172A" />
```

### PWA Manifest (`manifest.webmanifest`)
```json
{
  "background_color": "#0F172A",
  "theme_color": "#0F172A",
  "icons": [
    {
      "src": "/assets/branding/app_icon_192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/assets/branding/app_icon_512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

## Design Philosophy

The falcon represents:
- **Precision**: Sharp vision and attention to detail in installation evidence
- **Speed**: Quick and efficient documentation process
- **Motion**: Dynamic workflow and progress tracking
- **Professional Excellence**: High standards in compliance and quality assurance

The C and P letters create immediate brand recognition while maintaining clean, modern aesthetics suitable for professional use.
