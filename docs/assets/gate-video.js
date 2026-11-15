"use strict";
(() => {
  // This controller owns only the public video UI. Authentication, form
  // values and browser storage are deliberately outside its boundary.
  const stage = document.getElementById("gate-video-stage");
  const toggle = document.getElementById("gate-video-toggle");
  const status = document.getElementById("gate-video-status");
  const source = document.getElementById("gate-video-source");
  if (!stage || !toggle || !status || !source) return;

  const label = toggle.querySelector('[data-gate-video-copy="toggle"]') || toggle;
  const group = toggle.parentElement;
  const poster = Array.from(stage.childNodes);
  const main = stage.closest("main");
  const loading = document.getElementById("gate-loading");
  const videoId = "zVe7bvDkhbc";
  const watchUrl = "https://www.youtube.com/watch?v=" + videoId;
  const reducedMotion = typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  const dictionary = {
    "zh-HK": {
      load: "載入會歌影片", stop: "停止影片", controls: "影片控制",
      ready: "載入後先會連接 YouTube。播放、暫停同聲音可喺播放器控制。",
      loaded: "請喺播放器控制播放同聲音；可能需要再按播放。如播放唔到，可喺 YouTube 睇原片。",
      stopped: "影片已停止。想再睇，請重新載入影片。",
      source: "喺 YouTube 睇原片 ↗",
      title: "Liverpool FC — You’ll Never Walk Alone 影片播放器"
    },
    en: {
      load: "Load anthem video", stop: "Stop video", controls: "Video controls",
      ready: "YouTube connects only when you load the video. Use the player for playback, pause and sound.",
      loaded: "Use the player’s controls for playback and sound. You may need to press play; if unavailable, watch on YouTube.",
      stopped: "Video stopped. Load it again when you want to watch.",
      source: "Watch on YouTube ↗",
      title: "Liverpool FC — You’ll Never Walk Alone video player"
    },
    "zh-CN": {
      load: "加载队歌视频", stop: "停止视频", controls: "视频控制",
      ready: "加载后才会连接 YouTube。播放、暂停和声音可在播放器中控制。",
      loaded: "请在播放器中控制播放和声音；可能需要再次点击播放。如无法播放，可在 YouTube 观看原视频。",
      stopped: "视频已停止。想继续观看，请重新加载视频。",
      source: "在 YouTube 观看原视频 ↗",
      title: "Liverpool FC — You’ll Never Walk Alone 视频播放器"
    },
    ja: {
      load: "応援歌の動画を読み込む", stop: "動画を停止", controls: "動画の操作",
      ready: "動画を読み込むと YouTube に接続します。再生・一時停止・音量はプレーヤーで操作できます。",
      loaded: "再生と音量はプレーヤーで操作してください。再生ボタンを押す必要がある場合があります。再生できない場合は YouTube でご覧ください。",
      stopped: "動画を停止しました。もう一度見るには動画を読み込んでください。",
      source: "YouTube で見る ↗",
      title: "Liverpool FC — You’ll Never Walk Alone 動画プレーヤー"
    },
    ko: {
      load: "응원가 영상 불러오기", stop: "영상 정지", controls: "영상 제어",
      ready: "영상을 불러올 때만 YouTube에 연결합니다. 재생, 일시 정지, 소리는 플레이어에서 조절하세요.",
      loaded: "플레이어에서 재생과 소리를 조절하세요. 재생 버튼을 눌러야 할 수 있습니다. 재생되지 않으면 YouTube에서 시청하세요.",
      stopped: "영상이 정지되었습니다. 다시 시청하려면 영상을 불러오세요.",
      source: "YouTube에서 시청 ↗",
      title: "Liverpool FC — You’ll Never Walk Alone 동영상 플레이어"
    },
    th: {
      load: "โหลดวิดีโอเพลงประจำสโมสร", stop: "หยุดวิดีโอ", controls: "ควบคุมวิดีโอ",
      ready: "จะเชื่อมต่อ YouTube เมื่อโหลดวิดีโอเท่านั้น ใช้ตัวเล่นเพื่อเล่น หยุดชั่วคราว และปรับเสียง",
      loaded: "ใช้ตัวเล่นเพื่อควบคุมการเล่นและเสียง อาจต้องกดปุ่มเล่นอีกครั้ง หากเล่นไม่ได้ ให้ดูบน YouTube",
      stopped: "หยุดวิดีโอแล้ว โหลดอีกครั้งเมื่อต้องการรับชม",
      source: "ดูบน YouTube ↗",
      title: "เครื่องเล่นวิดีโอ Liverpool FC — You’ll Never Walk Alone"
    },
    ru: {
      load: "Загрузить видео с гимном", stop: "Остановить видео", controls: "Управление видео",
      ready: "Подключение к YouTube происходит только после загрузки видео. Воспроизведением, паузой и звуком управляет плеер.",
      loaded: "Управляйте видео и звуком в плеере. Возможно, потребуется нажать кнопку воспроизведения. Если видео недоступно, откройте его на YouTube.",
      stopped: "Видео остановлено. Загрузите его снова, чтобы посмотреть.",
      source: "Смотреть на YouTube ↗",
      title: "Видеоплеер Liverpool FC — You’ll Never Walk Alone"
    }
  };
  let frame = null;
  let state = "ready";
  let pageActive = true;

  function copy() {
    const language = document.documentElement.lang;
    return dictionary[Object.hasOwn(dictionary, language) ? language : "zh-HK"];
  }
  function render() {
    const text = copy();
    const action = frame ? text.stop : text.load;
    if (label.textContent !== action) label.textContent = action;
    if (status.textContent !== text[state]) status.textContent = text[state];
    if (source.textContent !== text.source) source.textContent = text.source;
    if (group?.getAttribute("role") === "group") group.setAttribute("aria-label", text.controls);
    if (frame) frame.title = text.title;
  }
  function stop() {
    if (!frame) return;
    // Removing the browsing context stops playback even when an embed is
    // blocked or its internal state is unavailable to this origin.
    stage.replaceChildren(...poster);
    frame = null;
    state = "stopped";
    render();
  }
  function covered() {
    return !!main?.inert || !!(loading && !loading.hidden);
  }
  function load() {
    if (!pageActive || document.visibilityState === "hidden" || covered()) return;
    const url = new URL("https://www.youtube-nocookie.com/embed/" + videoId);
    url.searchParams.set("controls", "1");
    url.searchParams.set("playsinline", "1");
    url.searchParams.set("loop", "1");
    url.searchParams.set("playlist", videoId);
    // A deliberate click requests playback. Browsers may still require a
    // click inside the player; no load event is treated as playback success.
    url.searchParams.set("autoplay", reducedMotion?.matches ? "0" : "1");
    url.searchParams.set("origin", location.origin);
    frame = document.createElement("iframe");
    frame.id = "gate-video-frame";
    frame.className = "gate-video-frame";
    frame.title = copy().title;
    frame.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
    frame.setAttribute("allow", "autoplay; encrypted-media; picture-in-picture; fullscreen");
    frame.setAttribute("allowfullscreen", "");
    frame.src = url.href;
    stage.replaceChildren(frame);
    state = "loaded";
    render();
  }

  source.href = watchUrl;
  source.target = "_blank";
  source.rel = "noopener noreferrer";
  source.hidden = false;
  toggle.setAttribute("aria-controls", "gate-video-stage");
  toggle.disabled = false;
  toggle.addEventListener("click", () => { if (frame) stop(); else load(); });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") stop();
  });
  window.addEventListener("pagehide", () => { pageActive = false; stop(); });
  window.addEventListener("pageshow", () => { pageActive = true; });
  reducedMotion?.addEventListener?.("change", event => { if (event.matches) stop(); });
  // Stop before the auth loading overlay can leave audio playing beneath it.
  // Observe visibility attributes only; never inspect authentication content.
  const visibility = new MutationObserver(() => { if (covered()) stop(); });
  if (main) visibility.observe(main, { attributes: true, attributeFilter: ["inert"] });
  if (loading) visibility.observe(loading, { attributes: true, attributeFilter: ["hidden"] });
  // The auth gate changes <html lang> directly. Observe only this public
  // attribute so a language change never reads or resets the login form.
  new MutationObserver(render).observe(document.documentElement, {
    attributes: true, attributeFilter: ["lang"]
  });
  render();
})();
