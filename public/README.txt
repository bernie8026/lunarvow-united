BERNIE LEUNG PERSONAL PORTFOLIO
CIS222 Web Design and Development / CIS282 Web Development and Security

OPEN THE WEBSITE
Unzip the complete folder and open index.html in a modern browser.
Keep all HTML files and the assets folder together. The site does not require
a server, a build step, an account, or an external font/CDN.

PAGES
index.html       Home
about.html       Personal information
experience.html  Working experience
education.html   Education background
skills.html      Skills with categories and examples
projects.html    Project portfolio with search, filters and details
contact.html     Public GitHub profile and message organiser
sitemap.html     Linked site map of all eight pages

INTERACTIONS
Traditional Chinese (Hong Kong), English and Simplified Chinese; mobile menu;
light/dark theme; native expandable course notes; skill and project filters;
project search; accessible project dialogs; print profile; validated contact
message draft with copy and text download. The contact form does not send mail.
Language, theme and ambient-motion preferences are saved in browser storage.
The original cinematic arrival (orbits, particles and an iris reveal) has been
adapted to the portfolio. First arrival lasts at least 10 seconds unless skipped.
Use Replay intro in the footer to see it again. Completion is session-based,
so ordinary navigation does not repeat the 10-second arrival. Motion includes
orbital depth and shooting stars, education paths and parallax, distinct project
transitions, interactive product photos, a local flash demo and skill filtering.
The footer pauses animations. All motion respects reduced-motion preferences.
Resource progress reflects actual downloads; offline ZIP previews preload images.

EDITING
HTML contains readable Traditional Chinese fallback content. Translations are
in assets/content.js, styles in assets/site.css and behaviour in assets/site.js.
Review the personal information before using this for a formal job application.
No employment dates, academic grades or certifications have been invented.

IMAGES AND CREDITS
identity.svg, drone.svg, camera.svg and brand.svg are custom vector illustrations.
WebP copies provide consistent illustration colours in both website themes.
The drone and camera illustrations are not product photos or original photography.
lunar-project.webp is game artwork from the original Lunar Vow fan website.
Game imagery remains the property of miHoYo / HoYoverse.
See assets/LUNAR-ART-CREDITS.md for the retained original attribution.

ASSIGNMENT COVERAGE
Eight .html files; linked pages; personal information, working experience,
education, skills and related projects; HTML site map; HTML/CSS/JavaScript;
responsive layout; interactive components; local images. All website materials
are included in this one root folder for ZIP submission.

配色 / Palette
藍紫主題：深藍背景、藍紫漸變、冷色光環與插圖；淺色模式使用淡藍紫底色。
Blue-violet theme with a navy background, blue-to-violet accents, matching intro and illustrations, and a pale light theme.

OFFICIAL RESEARCH / 15 OCTOBER 2026
The education page includes a sourced SFU campus profile and a separately labelled
HDAI-ICT programme reference. This does not establish a new personal qualification.
The project page includes Nikon D5300 and Godox V480N equipment specifications,
and Ryze Tello EDU as a four-rotor concept reference for Aerovate. Product pictures
are official manufacturer images; the pictured Nikon lens is illustrative.
See assets/education/asset-credits.md and assets/equipment/asset-credits.md.
The interactive project stage now uses real camera and drone product images.

VARIED PRESENTATION
Education uses a campus image and connected timeline; projects use distinct image
spreads and open specifications. Experience follows a continuous journey, skills
use typographic rows, and contact uses a letter-style form. assets/editorial.css
contains page-specific layouts. Shared card reveals and page overlays are removed.

ANIMATION CONTROLS
Use the footer's Pause animations button to stop motion. Education has drawn
timelines and native course transitions; project switches have individual scenes.
The flash photo offers a single user-triggered light demonstration. Reduced
motion and hidden-tab states stop or settle decorative movement.


無刷新選單 / Seamless navigation
線上版本以 Fetch + History API 切換八個獨立 HTML 頁面，支援返回／前進、頁面定位、三語介面及頁面互動。新頁面備妥後才切換，載入失敗可重試；支援 View Transitions 嘅瀏覽器使用連續轉場，其餘使用淡出／滑入，減少動態模式則直接切換。每次轉頁會清理上一頁嘅監聽、計時器及粒子動畫。解壓 ZIP 直接用 file:// 開啟時，保留一般 HTML 導覽。
