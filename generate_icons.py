from PIL import Image

def main():
    try:
        # Open images
        bg = Image.open('icon-bg.jpeg').convert('RGBA')
        fg = Image.open('icon-fore.png').convert('RGBA')
        
        # Ensure sizes match
        # Typically Android Adaptive Icons have a safe zone, 
        # let's just resize fg to fit in bg if they are different sizes,
        # but if they are meant to be layered directly, just resize both to 512x512.
        
        bg_512 = bg.resize((512, 512), Image.Resampling.LANCZOS)
        fg_512 = fg.resize((512, 512), Image.Resampling.LANCZOS)
        
        # Composite
        icon_512 = Image.alpha_composite(bg_512, fg_512)
        
        # Save as standard icon.png for the project (and as maskable)
        icon_512.save('icon.png')
        icon_512.save('pwa-512x512.png')
        
        # Create 192x192
        icon_192 = icon_512.resize((192, 192), Image.Resampling.LANCZOS)
        icon_192.save('pwa-192x192.png')
        
        # Create favicon
        icon_32 = icon_512.resize((32, 32), Image.Resampling.LANCZOS)
        icon_32.save('favicon.png')
        
        print("Icons generated successfully.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    main()
