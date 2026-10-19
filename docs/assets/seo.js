"use strict";
window.PORTFOLIO_PAGES.register("seo", document.currentScript.src, scope => {
  const {addEventListener, requestAnimationFrame, cancelAnimationFrame, setTimeout, clearTimeout, setInterval, clearInterval, ResizeObserver, IntersectionObserver, MutationObserver} = scope;

  const base = "https://bernie8026.github.io/lunarvow-united/";
  const supported = ["zh-HK", "en", "zh-CN"];
  const locales = {"zh-HK":"zh_HK", en:"en_HK", "zh-CN":"zh_CN"};
  const siteNames = {"zh-HK": "Bernie Leung 個人作品集", "en": "Bernie Leung Portfolio", "zh-CN": "Bernie Leung 个人作品集"};
  const imageAlts = {"zh-HK": "Bernie Leung 個人作品集：AI 與 ICT、網頁、攝影及 STEM。", "en": "Bernie Leung Portfolio: AI and ICT, web, photography and STEM.", "zh-CN": "Bernie Leung 个人作品集：AI 与 ICT、网页、摄影及 STEM。"};
  const pages = {
  "index": {
    "zh-HK": {
      "title": "首頁 — Bernie Leung 個人作品集",
      "description": "Bernie Leung 嘅香港學生作品集，分享 AI 與 ICT 學習、網頁製作、Cosplay 攝影同 STEM 教育概念。"
    },
    "en": {
      "title": "Home — Bernie Leung Portfolio",
      "description": "Explore Bernie Leung’s student portfolio from Hong Kong: AI and ICT learning, websites, Cosplay photography and STEM education concepts."
    },
    "zh-CN": {
      "title": "首页 — Bernie Leung 个人作品集",
      "description": "Bernie Leung 的香港学生作品集，分享 AI 与 ICT 学习、网页制作、Cosplay 摄影及 STEM 教育概念。"
    }
  },
  "about": {
    "zh-HK": {
      "title": "個人資料 — Bernie Leung 個人作品集",
      "description": "認識 Bernie Leung：喺香港學習 AI 與 ICT，透過網頁、Cosplay 攝影同 STEM 概念將技術與故事連結。"
    },
    "en": {
      "title": "About — Bernie Leung Portfolio",
      "description": "Meet Bernie Leung, a student in Hong Kong exploring AI and ICT, web design, Cosplay photography and STEM concepts."
    },
    "zh-CN": {
      "title": "个人资料 — Bernie Leung 个人作品集",
      "description": "认识 Bernie Leung：在香港学习 AI 与 ICT，通过网页、Cosplay 摄影及 STEM 概念连接技术与故事。"
    }
  },
  "experience": {
    "zh-HK": {
      "title": "工作經驗 — Bernie Leung 個人作品集",
      "description": "Bernie Leung 嘅兼職餐廳工作與個人網站實作，記錄團隊協作、時間安排、內容整理同網頁製作經驗。"
    },
    "en": {
      "title": "Experience — Bernie Leung Portfolio",
      "description": "Read about Bernie Leung’s part-time restaurant work and personal website projects, including teamwork, time management and organising digital content."
    },
    "zh-CN": {
      "title": "工作经历 — Bernie Leung 个人作品集",
      "description": "Bernie Leung 的兼职餐厅工作与个人网站实践，记录团队协作、时间安排、内容整理和网页制作经验。"
    }
  },
  "education": {
    "zh-HK": {
      "title": "教育背景 — Bernie Leung 個人作品集",
      "description": "了解 Bernie Leung 喺聖方濟各大學嘅 AI 與 ICT 學習方向、課堂實作同學習循環，並參閱大學官方資料。"
    },
    "en": {
      "title": "Education — Bernie Leung Portfolio",
      "description": "Explore Bernie Leung’s AI and ICT learning at Saint Francis University, coursework and learning process, with links to official university information."
    },
    "zh-CN": {
      "title": "教育背景 — Bernie Leung 个人作品集",
      "description": "了解 Bernie Leung 在圣方济各大学的 AI 与 ICT 学习方向、课堂实践和学习过程，并查阅大学官方资料。"
    }
  },
  "skills": {
    "zh-HK": {
      "title": "專業技能 — Bernie Leung 個人作品集",
      "description": "探索 Bernie Leung 嘅 HTML、CSS、JavaScript、Python／C++、攝影、STEM 概念同團隊協作技能，以及相關實作方向。"
    },
    "en": {
      "title": "Skills — Bernie Leung Portfolio",
      "description": "Explore Bernie Leung’s skills in HTML, CSS, JavaScript, Python and C++, photography, STEM concepts and teamwork, with related practical examples."
    },
    "zh-CN": {
      "title": "专业技能 — Bernie Leung 个人作品集",
      "description": "探索 Bernie Leung 的 HTML、CSS、JavaScript、Python／C++、摄影、STEM 概念和团队协作技能，以及相关实践方向。"
    }
  },
  "projects": {
    "zh-HK": {
      "title": "作品集 — Bernie Leung 個人作品集",
      "description": "瀏覽 Bernie Leung 嘅 Lunar Vow 網站、Aerovate 無人機教育概念同 Cosplay 攝影練習，了解作品思路及攝影器材。"
    },
    "en": {
      "title": "Projects — Bernie Leung Portfolio",
      "description": "Discover Bernie Leung’s Lunar Vow website, Aerovate drone education concept and Cosplay photography practice, with project ideas and camera equipment."
    },
    "zh-CN": {
      "title": "作品集 — Bernie Leung 个人作品集",
      "description": "浏览 Bernie Leung 的 Lunar Vow 网站、Aerovate 无人机教育概念和 Cosplay 摄影练习，了解作品思路及摄影器材。"
    }
  },
  "contact": {
    "zh-HK": {
      "title": "聯絡 — Bernie Leung 個人作品集",
      "description": "瀏覽 Bernie Leung 嘅公開 GitHub 項目，了解網頁、數碼內容、攝影同 STEM 方向，並整理可複製或下載嘅聯絡訊息。"
    },
    "en": {
      "title": "Contact — Bernie Leung Portfolio",
      "description": "Find Bernie Leung’s public GitHub projects and interests in websites, digital content, photography and STEM. Prepare a contact message to copy or download."
    },
    "zh-CN": {
      "title": "联系 — Bernie Leung 个人作品集",
      "description": "浏览 Bernie Leung 的公开 GitHub 项目，了解网页、数字内容、摄影和 STEM 方向，并整理可复制或下载的联系消息。"
    }
  },
  "sitemap": {
    "zh-HK": {
      "title": "網站地圖 — Bernie Leung 個人作品集",
      "description": "一覽 Bernie Leung 個人作品集嘅八個頁面：首頁、個人資料、工作經驗、教育背景、專業技能、作品集、聯絡同網站地圖。"
    },
    "en": {
      "title": "Site map — Bernie Leung Portfolio",
      "description": "Navigate all eight pages of Bernie Leung’s portfolio: Home, About, Experience, Education, Skills, Projects, Contact and Site map."
    },
    "zh-CN": {
      "title": "网站地图 — Bernie Leung 个人作品集",
      "description": "一览 Bernie Leung 个人作品集的八个页面：首页、个人资料、工作经历、教育背景、专业技能、作品集、联系和网站地图。"
    }
  }
};
  const page = document.body.dataset.page;
  if (!pages[page]) return;
  const update = () => {
    const language = supported.includes(document.documentElement.lang) ? document.documentElement.lang : "zh-HK";
    const metadata = pages[page][language];
    // Keep only the content language in the canonical URL; theme, cache and anchor state are not separate pages.
    const canonical = `${base}${page}.html?lang=${language}`;
    const setMeta = (selector, value) => document.querySelector(selector)?.setAttribute("content", value);
    document.querySelector('link[rel="canonical"]')?.setAttribute("href", canonical);
    setMeta('meta[name="description"]', metadata.description);
    setMeta('meta[property="og:title"]', metadata.title);
    setMeta('meta[property="og:description"]', metadata.description);
    setMeta('meta[property="og:site_name"]', siteNames[language]);
    setMeta('meta[property="og:locale"]', locales[language]);
    setMeta('meta[property="og:url"]', canonical);
    setMeta('meta[property="og:image:alt"]', imageAlts[language]);
    const alternatives = supported.filter(value => value !== language);
    document.querySelectorAll('meta[property="og:locale:alternate"]').forEach((node, index) => {
      node.setAttribute("content", locales[alternatives[index]]);
    });
    setMeta('meta[name="twitter:title"]', metadata.title);
    setMeta('meta[name="twitter:description"]', metadata.description);
    setMeta('meta[name="twitter:image:alt"]', imageAlts[language]);
  };
  scope.on(document, "portfolio:language", update);
  update();
});
