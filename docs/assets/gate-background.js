"use strict";
(() => {
  // Public background media has no access to the authentication closure.
  const stage = document.getElementById("gate-video-stage");
  const video = document.getElementById("gate-video-background");
  const toggle = document.getElementById("gate-video-toggle");
  const sound = document.getElementById("gate-video-sound");
  const status = document.getElementById("gate-video-status");
  const source = document.getElementById("gate-video-source");
  if (!stage || !video || !toggle || !sound || !status || !source) return;
  if (video.hasAttribute("data-controller-ready")) return;
  video.setAttribute("data-controller-ready", "");
  const label = toggle.querySelector('[data-gate-video-copy="toggle"]') || toggle;
  const group = toggle.parentElement;
  const main = toggle.closest("main");
  const loading = document.getElementById("gate-loading");
  const reduced = typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  const dictionary = {
    "zh-HK": {
      play: "播放背景影片", pause: "暫停背景影片", unmute: "開啟會歌聲音", mute: "靜音", controls: "背景影片控制",
      ready: "背景影片已暫停。按播放繼續；開聲需要你按一下。", loading: "正在載入背景影片…",
      playing: "背景影片播放中，已靜音。按「開啟會歌聲音」一齊聽。", audible: "會歌播放中。你可以隨時靜音或暫停。",
      paused: "背景影片已暫停，聲音已關閉。", error: "暫時播放唔到背景影片。可以重試，或開啟會歌連結。", source: "You’ll Never Walk Alone · YouTube ↗"
    },
    en: {
      play: "Play background video", pause: "Pause background video", unmute: "Turn anthem sound on", mute: "Mute", controls: "Background video controls",
      ready: "Background video is paused. Press play to continue; sound needs a tap.", loading: "Loading background video…",
      playing: "Background video is playing muted. Turn anthem sound on to listen.", audible: "Anthem sound is on. Mute or pause at any time.",
      paused: "Background video is paused and muted.", error: "Background video could not play. Try again or open the anthem link.", source: "You’ll Never Walk Alone · YouTube ↗"
    },
    "zh-CN": {
      play: "播放背景视频", pause: "暂停背景视频", unmute: "开启队歌声音", mute: "静音", controls: "背景视频控制",
      ready: "背景视频已暂停。点击播放继续；开启声音需要点击按钮。", loading: "正在加载背景视频…",
      playing: "背景视频正在静音播放。点击「开启队歌声音」收听。", audible: "队歌正在播放。你可以随时静音或暂停。",
      paused: "背景视频已暂停，声音已关闭。", error: "暂时无法播放背景视频。请重试，或打开队歌链接。", source: "You’ll Never Walk Alone · YouTube ↗"
    },
    ja: {
      play: "背景動画を再生", pause: "背景動画を一時停止", unmute: "応援歌の音声をオン", mute: "ミュート", controls: "背景動画の操作",
      ready: "背景動画は停止中です。再生を押してください。音声はタップでオンにできます。", loading: "背景動画を読み込み中…",
      playing: "背景動画をミュートで再生中です。音声をオンにすると応援歌が流れます。", audible: "応援歌を再生中です。いつでもミュートや一時停止ができます。",
      paused: "背景動画を一時停止し、音声をオフにしました。", error: "背景動画を再生できません。再試行するか、応援歌のリンクを開いてください。", source: "You’ll Never Walk Alone · YouTube ↗"
    },
    ko: {
      play: "배경 영상 재생", pause: "배경 영상 일시 정지", unmute: "응원가 소리 켜기", mute: "음소거", controls: "배경 영상 제어",
      ready: "배경 영상이 일시 정지되었습니다. 재생을 누르세요. 소리는 버튼으로 켤 수 있습니다.", loading: "배경 영상 불러오는 중…",
      playing: "배경 영상이 음소거로 재생 중입니다. 응원가 소리를 켜서 들어보세요.", audible: "응원가가 재생 중입니다. 언제든 음소거하거나 일시 정지할 수 있습니다.",
      paused: "배경 영상을 일시 정지하고 소리를 껐습니다.", error: "배경 영상을 재생할 수 없습니다. 다시 시도하거나 응원가 링크를 여세요.", source: "You’ll Never Walk Alone · YouTube ↗"
    },
    th: {
      play: "เล่นวิดีโอพื้นหลัง", pause: "พักวิดีโอพื้นหลัง", unmute: "เปิดเสียงเพลงสโมสร", mute: "ปิดเสียง", controls: "ควบคุมวิดีโอพื้นหลัง",
      ready: "วิดีโอพื้นหลังหยุดชั่วคราว กดเล่นเพื่อดูต่อและแตะเพื่อเปิดเสียง", loading: "กำลังโหลดวิดีโอพื้นหลัง…",
      playing: "วิดีโอพื้นหลังกำลังเล่นแบบปิดเสียง แตะเปิดเสียงเพื่อฟังเพลงสโมสร", audible: "กำลังเล่นเพลงสโมสร ปิดเสียงหรือหยุดชั่วคราวได้ทุกเมื่อ",
      paused: "พักวิดีโอพื้นหลังและปิดเสียงแล้ว", error: "เล่นวิดีโอพื้นหลังไม่ได้ ลองอีกครั้งหรือเปิดลิงก์เพลงสโมสร", source: "You’ll Never Walk Alone · YouTube ↗"
    },
    ru: {
      play: "Включить фоновое видео", pause: "Приостановить видео", unmute: "Включить звук гимна", mute: "Выключить звук", controls: "Управление фоновым видео",
      ready: "Видео приостановлено. Нажмите для воспроизведения; звук включается отдельной кнопкой.", loading: "Загрузка фонового видео…",
      playing: "Фоновое видео воспроизводится без звука. Включите звук, чтобы послушать гимн.", audible: "Гимн воспроизводится. Звук и видео можно отключить в любой момент.",
      paused: "Фоновое видео приостановлено, звук выключен.", error: "Не удалось воспроизвести видео. Повторите попытку или откройте ссылку на гимн.", source: "You’ll Never Walk Alone · YouTube ↗"
    }
  };
  let state = "ready", active = true, wantsPlayback = false, attempt = 0;
  function copy() {
    const lang = document.documentElement.lang;
    return dictionary[Object.hasOwn(dictionary, lang) ? lang : "zh-HK"];
  }
  function write(node, text) { if (node.textContent !== text) node.textContent = text; }
  function covered() { return !!main?.inert || !!(loading && !loading.hidden); }
  function available() { return active && document.visibilityState !== "hidden" && !covered(); }
  function render() {
    const text = copy();
    write(label, wantsPlayback ? text.pause : text.play);
    write(sound, video.muted ? text.unmute : text.mute);
    write(status, text[state === "playing" && !video.muted ? "audible" : state]);
    write(source, text.source);
    sound.setAttribute("aria-pressed", String(!video.muted));
    toggle.setAttribute("aria-pressed", String(wantsPlayback));
    if (group?.getAttribute("role") === "group") group.setAttribute("aria-label", text.controls);
  }
  function pause(next = "paused") {
    attempt++;
    wantsPlayback = false;
    video.muted = true;
    video.pause();
    state = next;
    render();
  }
  function fail() { pause("error"); }
  function play(audible = false) {
    if (!available()) return;
    const current = ++attempt;
    wantsPlayback = true;
    video.muted = !audible;
    state = "loading";
    if (!video.getAttribute("src")) video.src = video.getAttribute("data-src");
    if (video.error) video.load();
    render();
    try {
      const request = video.play();
      request?.catch?.(() => {
        if (current !== attempt) return;
        // Autoplay or audible playback may be blocked by browser preferences.
        // Keep the user controls usable and report no false playback success.
        pause(video.error ? "error" : "ready");
      });
    } catch { if (current === attempt) pause(video.error ? "error" : "ready"); }
  }
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.loop = true;
  video.addEventListener("playing", () => {
    if (!wantsPlayback || !available()) { pause(); return; }
    state = "playing";
    stage.setAttribute("data-video-visible", "true");
    render();
  });
  video.addEventListener("waiting", () => { if (wantsPlayback) { state = "loading"; render(); } });
  video.addEventListener("pause", () => {
    if (wantsPlayback) pause();
  });
  video.addEventListener("volumechange", render);
  video.addEventListener("error", () => {
    stage.removeAttribute("data-video-visible");
    fail();
  });
  toggle.disabled = false;
  sound.disabled = false;
  toggle.setAttribute("aria-controls", "gate-video-background");
  sound.setAttribute("aria-controls", "gate-video-background");
  toggle.addEventListener("click", () => { if (wantsPlayback) pause(); else play(); });
  sound.addEventListener("click", () => {
    if (!available()) return;
    if (!video.muted) { video.muted = true; render(); }
    else if (wantsPlayback && !video.paused) { video.muted = false; render(); }
    else play(true);
  });
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") pause(); });
  window.addEventListener("pagehide", () => { active = false; pause(); });
  window.addEventListener("pageshow", () => { active = true; });
  reduced?.addEventListener?.("change", event => { if (event.matches) pause(); });
  const visibility = new MutationObserver(() => { if (covered()) pause(); });
  if (main) visibility.observe(main, { attributes: true, attributeFilter: ["inert"] });
  if (loading) visibility.observe(loading, { attributes: true, attributeFilter: ["hidden"] });
  new MutationObserver(render).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  render();
  if (!reduced?.matches) play();
})();
