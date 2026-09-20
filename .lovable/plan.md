# Optimize the 15 flagged website images

## Scope
- Optimize the ten Thames Towpath Challenge photos used on `/thames-challenge`.
- Optimize `royal-arch-robes` used on the Royal Arch Explained news page.
- Optimize the Double Initiation photograph used on its article and news listings.
- Optimize the three APGM Visit photographs used on that article and its news listing.

## Implementation
- Download the current CDN originals for pointer-backed images and use the existing local originals for bundled images.
- Preserve aspect ratio and orientation, cap width at 1,920px where needed, strip unnecessary metadata, and encode photographic content as progressive JPEG around quality 78, adjusting only if necessary to keep every result below 400KB without visible degradation.
- For CDN-backed images, upload the optimized replacement and update the existing `.asset.json` pointer file so all current imports stay unchanged. Keep old CDN objects intact because deleting them would break already-published versions.
- For bundled images, overwrite the existing source file at the same path, correcting the APGM files that currently contain PNG data despite their `.jpg` names.
- Update only any direct crawler metadata URL that bypasses the asset import, so the `/thames-challenge` social image also points to the optimized Maidenhead photograph.

## Verification
- Record exact before/after byte sizes and dimensions for all 15 images.
- Confirm all resulting files are valid images below 400KB and that the existing import paths still resolve.
- Run the project type check and production build.
- Report each image’s source file, page usage, dimensions, and before/after size.

## Assumptions
- “Replace in place” means preserving every source import path; immutable CDN asset URLs will change behind the existing pointer files.
- No image will be enlarged; images already below the width cap retain their dimensions and receive compression only.
