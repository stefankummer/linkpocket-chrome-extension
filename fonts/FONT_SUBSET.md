# Bundled fonts

The popup no longer loads fonts from the Google Fonts CDN (render-blocking
network request on every popup open → blank/slow popup). Both families are
bundled here and loaded via `fonts.css`.

- `quicksand-latin.woff2` / `quicksand-latin-ext.woff2` — Quicksand variable
  font (weights 400–700), latin + latin-ext subsets (covers en/fr/de).
- `material-symbols-subset.woff2` — Material Symbols Outlined, subset to the
  ligatures the popup uses (`BUNDLED_MATERIAL_ICONS` in `popup.js`).

## Adding a new icon

1. Add the ligature to the `icon_names` list below **and** to
   `BUNDLED_MATERIAL_ICONS` in `popup.js` (unknown ligatures are remapped to a
   keyword fallback, so an icon missing from both simply renders as `folder`).
2. Regenerate the subset (a browser User-Agent is required to get woff2):

```sh
ICONS="add,add_circle,arrow_back,auto_awesome,auto_fix_high,bookmark,bookmark_add,check,check_circle,chevron_right,close,cloud,cloud_off,code,contrast,create_new_folder,delete_sweep,error,expand_more,folder,folder_off,folder_open,folder_shared,folder_special,headphones,history,home,image,keyboard,language,library_books,link_off,lock,login,logout,mail,manage_accounts,menu_book,movie,music_note,open_in_new,photo_library,public,search,sell,shopping_cart,sports_esports,swap_vert,sync,tune,work"
UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"
curl -s -A "$UA" "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&icon_names=${ICONS}&display=block"
# then download the woff2 URL from the returned CSS as material-symbols-subset.woff2
```
