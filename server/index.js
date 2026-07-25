// server/index.js

require("dotenv").config({
  path: require("path").join(__dirname, "../.env"),
});

const express = require("express");
const cors = require("cors");
const path = require("path");
const basicAuth = require("express-basic-auth");
const { chromium } = require("playwright");

const app = express();
const PORT = process.env.PORT || 5000;

const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASS = process.env.ADMIN_PASS;

app.use(cors());
app.use(express.json());

/* =========================================================
   НАСТРОЙКИ КАТАЛОГА
========================================================= */

const HORIZON_CATALOGS = [
  {
    key: "main",
    name: "Основной каталог",
    url: "https://www.meta.com/experiences/section/746836817401205/",
  },
  {
    key: "indie",
    name: "Инди-каталог",
    url: "https://www.meta.com/experiences/section/3170833353093973/",
  },
];

const VR_CACHE_TIME = 6 * 60 * 60 * 1000;
const MIN_GAMES_PER_CATALOG = 1;

let vrCatalogCache = {
  games: [],
  catalogs: [],
  updatedAt: 0,
};

/*
 * Не позволяет нескольким запросам одновременно
 * запускать несколько Chromium.
 */
let vrCatalogRefreshPromise = null;

/* =========================================================
   НОРМАЛИЗАЦИЯ
========================================================= */

function normalizeTitle(title = "") {
  return String(title)
    .trim()
    .toLocaleLowerCase("en-US");
}

function titleFromSlug(slug = "") {
  const smallWords = new Set([
    "a",
    "an",
    "and",
    "at",
    "for",
    "from",
    "in",
    "of",
    "on",
    "the",
    "to",
    "with",
  ]);

  return slug
    .split("-")
    .filter(Boolean)
    .map((word, index) => {
      const normalizedWord = word.toLowerCase();

      if (
        index > 0 &&
        smallWords.has(normalizedWord)
      ) {
        return normalizedWord;
      }

      if (normalizedWord === "vr") {
        return "VR";
      }

      if (normalizedWord === "xr") {
        return "XR";
      }

      if (normalizedWord === "ii") {
        return "II";
      }

      if (normalizedWord === "iii") {
        return "III";
      }

      return (
        normalizedWord.charAt(0).toUpperCase() +
        normalizedWord.slice(1)
      );
    })
    .join(" ");
}

function normalizeMetaUrl(href = "") {
  try {
    return new URL(
      href,
      "https://www.meta.com"
    ).href;
  } catch {
    return "";
  }
}

function parseMetaGameUrl(href = "") {
  const normalizedUrl =
    normalizeMetaUrl(href);

  const match = normalizedUrl.match(
    /\/experiences\/(?:quest\/)?([^/]+)\/(\d+)\/?/i
  );

  if (!match) {
    return null;
  }

  const slug = match[1];
  const metaId = match[2];

  if (
    !slug ||
    !metaId ||
    slug === "section" ||
    slug === "quest" ||
    slug === "meta-horizon-plus"
  ) {
    return null;
  }

  return {
    slug,
    metaId,
    url:
      "https://www.meta.com/experiences/" +
      `${slug}/${metaId}/`,
  };
}

/* =========================================================
   ОЧИСТКА НАЗВАНИЙ
========================================================= */

function cleanMetaGameTitle(
  rawText,
  imageAlt,
  slug
) {
  let title =
    rawText ||
    imageAlt ||
    "";

  title = title
    .replace(/\s+/g, " ")
    .trim();

  title = title
    .replace(
      /^(top rated|best seller|bestseller|featured|popular|new release|new)\s*/i,
      ""
    )
    .trim();

  /*
   * Удаляет рейтинг:
   * GOLF+4.8 (53K) → GOLF+
   */
  title = title
    .split(
      /\d(?:\.\d)?\s*\(\s*\d+(?:\.\d+)?[KMB]?\s*\)/i
    )[0]
    .trim();

  /*
   * Удаляет категории и цену.
   */
  title = title
    .split(/\s*[·•]\s*Games\b/i)[0]
    .split(/\s*[·•]\s*Apps\b/i)[0]
    .split(/\s*[·•]\s*Sports\b/i)[0]
    .split(/\s*\$\s*\d/i)[0]
    .trim();

  const invalidTitles = new Set([
    "",
    "view",
    "home",
    "games",
    "apps",
    "sale",
    "get",
    "buy",
    "free",
    "learn more",
    "horizon+",
  ]);

  if (
    invalidTitles.has(
      normalizeTitle(title)
    ) ||
    title.length > 120
  ) {
    title = titleFromSlug(slug);
  }

  return title.trim();
}

function isGarbageGameTitle(title = "") {
  const garbageTitles = new Set([
    "",
    "view",
    "home",
    "games",
    "apps",
    "sale",
    "get",
    "buy",
    "free",
    "learn more",
    "horizon+",
  ]);

  return garbageTitles.has(
    normalizeTitle(title)
  );
}

/* =========================================================
   ВОЗРАСТНЫЕ КАТЕГОРИИ
========================================================= */

function getAutomaticAgeCategories(
  title = ""
) {
  const normalized =
    normalizeTitle(title);

  const adultKeywords = [
    "horror",
    "zombie",
    "dead",
    "death",
    "gun",
    "shooter",
    "war",
    "warfare",
    "battle",
    "combat",
    "blood",
    "blade",
    "sword",
    "assassin",
    "thief",
    "boxing",
    "creed",
    "metro",
    "pavlov",
    "tabor",
    "resident evil",
    "arizona sunshine",
    "walking dead",
    "vampire",
    "killer",
    "sniper",
    "fighting",
    "fight",
  ];

  const hasAdultKeyword =
    adultKeywords.some((keyword) =>
      normalized.includes(keyword)
    );

  if (hasAdultKeyword) {
    return [
      "Подростки",
      "Взрослые",
    ];
  }

  const childrenKeywords = [
    "golf",
    "mini golf",
    "bowling",
    "basketball",
    "football",
    "soccer",
    "tennis",
    "table tennis",
    "sports",
    "fishing",
    "roller coaster",
    "rollercoaster",
    "angry birds",
    "garden",
    "ocean",
    "sea",
    "vacation",
    "job simulator",
    "cooking",
    "cook",
    "kitchen",
    "puzzle",
    "cubism",
    "lego",
    "moss",
    "fruit ninja",
    "racket",
    "dance",
    "music",
    "rhythm",
    "painting",
    "drawing",
    "color",
    "pets",
    "animals",
    "cat",
    "dog",
    "farm",
    "arcade",
    "pinball",
    "tetris",
    "walkabout",
    "home sports",
    "first encounters",
    "epic roller coasters",
    "hoopzter",
    "deisim",
    "clean sheet",
    "cleansheet",
    "miniature",
    "max mustard",
    "wallace",
    "gromit",
    "smurfs",
    "spongebob",
    "track craft",
    "little cities",
    "townsmen",
    "wonderglade",
    "forevr",
    "pool",
    "darts",
    "chess",
    "drums",
    "piano",
    "guitar",
  ];

  const hasChildrenKeyword =
    childrenKeywords.some((keyword) =>
      normalized.includes(keyword)
    );

  if (hasChildrenKeyword) {
    return [
      "Дети",
      "Подростки",
      "Взрослые",
    ];
  }

  return [
    "Подростки",
    "Взрослые",
  ];
}

/* =========================================================
   УСТАНОВЛЕННЫЕ ИГРЫ
========================================================= */

function getInstalledHorizonGames() {
  return new Set(
    (
      process.env
        .INSTALLED_HORIZON_PLUS_GAMES ||
      ""
    )
      .split(",")
      .map(normalizeTitle)
      .filter(Boolean)
  );
}

/* =========================================================
   COOKIE META
========================================================= */

async function dismissMetaCookies(page) {
  const buttonNames = [
    "Allow all cookies",
    "Accept all cookies",
    "Accept all",
    "Разрешить все файлы cookie",
    "Принять все",
  ];

  for (const buttonName of buttonNames) {
    try {
      const button =
        page.getByRole("button", {
          name: buttonName,
          exact: false,
        });

      if (
        (await button.count()) === 0
      ) {
        continue;
      }

      const firstButton =
        button.first();

      if (await firstButton.isVisible()) {
        await firstButton.click({
          timeout: 3000,
        });

        await page.waitForTimeout(500);
        return;
      }
    } catch {
      // Продолжаем загрузку без ошибки.
    }
  }
}

/* =========================================================
   ПРОКРУТКА СТРАНИЦЫ
========================================================= */

async function scrollToLoadAllGames(page) {
  let previousHeight = 0;
  let unchangedAttempts = 0;

  for (
    let attempt = 0;
    attempt < 30;
    attempt += 1
  ) {
    const currentHeight =
      await page.evaluate(() => {
        return document.body.scrollHeight;
      });

    await page.evaluate(() => {
      window.scrollTo(
        0,
        document.body.scrollHeight
      );
    });

    await page.waitForTimeout(700);

    if (
      currentHeight === previousHeight
    ) {
      unchangedAttempts += 1;
    } else {
      unchangedAttempts = 0;
    }

    previousHeight = currentHeight;

    if (unchangedAttempts >= 3) {
      break;
    }
  }

  await page.evaluate(() => {
    window.scrollTo(0, 0);
  });
}

/* =========================================================
   ПОЛУЧЕНИЕ ИГР СО СТРАНИЦЫ
========================================================= */

async function extractGamesFromPage(
  page,
  catalog
) {
  const rawCards =
    await page.evaluate(() => {
      const links = [
        ...document.querySelectorAll(
          'a[href*="/experiences/"]'
        ),
      ];

      return links.map((link) => {
        const image =
          link.querySelector("img");

        const heading =
          link.querySelector(
            [
              "h1",
              "h2",
              "h3",
              "h4",
              "[role='heading']",
            ].join(",")
          );

        return {
          href:
            link.getAttribute("href") ||
            "",

          text:
            (
              heading?.textContent ||
              link.getAttribute(
                "aria-label"
              ) ||
              link.textContent ||
              ""
            ).trim(),

          imageUrl:
            image?.currentSrc ||
            image?.src ||
            image?.getAttribute("src") ||
            image?.getAttribute("data-src") ||
            "",

          imageAlt:
            image?.alt || "",
        };
      });
    });

  const installedGames =
    getInstalledHorizonGames();

  const games = new Map();

  for (const rawCard of rawCards) {
    const parsedUrl =
      parseMetaGameUrl(rawCard.href);

    if (!parsedUrl) {
      continue;
    }

    const existingGame =
      games.get(parsedUrl.metaId);

    if (
      existingGame &&
      (
        existingGame.imageUrl ||
        !rawCard.imageUrl
      )
    ) {
      continue;
    }

    const title =
      cleanMetaGameTitle(
        rawCard.text,
        rawCard.imageAlt,
        parsedUrl.slug
      );

    if (isGarbageGameTitle(title)) {
      continue;
    }

    const game = {
      metaId: parsedUrl.metaId,
      title,

      description:
        catalog.key === "indie"
          ? "Игра из инди-каталога Meta Horizon+."
          : "Игра из основного каталога Meta Horizon+.",

      trailerUrl: parsedUrl.url,
      imageUrl: rawCard.imageUrl || "",
      ownership: "horizon-plus",
      catalog: catalog.key,
      catalogName: catalog.name,

      /*
       * Не показываем неизвестное
       * количество игроков.
       */
      maxPlayers: null,

      ageCategories:
        getAutomaticAgeCategories(title),
    };

    if (
      installedGames.has(
        normalizeTitle(title)
      )
    ) {
      game.installed = true;
    }

    games.set(
      parsedUrl.metaId,
      game
    );
  }

  return [...games.values()];
}

/* =========================================================
   ЗАГРУЗКА ОДНОГО КАТАЛОГА
========================================================= */

async function loadCatalogWithBrowser(
  browser,
  catalog
) {
  let context;

  try {
    context =
      await browser.newContext({
        locale: "en-US",

        userAgent:
          "Mozilla/5.0 " +
          "(Windows NT 10.0; Win64; x64) " +
          "AppleWebKit/537.36 " +
          "(KHTML, like Gecko) " +
          "Chrome/131.0.0.0 " +
          "Safari/537.36",

        viewport: {
          width: 1100,
          height: 800,
        },
      });

    const page =
      await context.newPage();

    /*
     * Не загружаем тяжёлые ресурсы.
     * Ссылки на картинки остаются в DOM.
     */
    await page.route(
      "**/*",
      async (route) => {
        const resourceType =
          route
            .request()
            .resourceType();

        if (
          resourceType === "image" ||
          resourceType === "media" ||
          resourceType === "font"
        ) {
          return route.abort();
        }

        return route.continue();
      }
    );

    console.log(
      `Открываю ${catalog.name}...`
    );

    const response =
      await page.goto(
        catalog.url,
        {
          waitUntil:
            "domcontentloaded",

          timeout: 90000,
        }
      );

    if (
      response &&
      !response.ok()
    ) {
      throw new Error(
        `${catalog.name}: ` +
        `Meta вернула статус ` +
        response.status()
      );
    }

    await dismissMetaCookies(page);
    await page.waitForTimeout(3000);
    await scrollToLoadAllGames(page);

    const games =
      await extractGamesFromPage(
        page,
        catalog
      );

    if (
      games.length <
      MIN_GAMES_PER_CATALOG
    ) {
      throw new Error(
        `${catalog.name}: игры не обнаружены`
      );
    }

    console.log(
      `${catalog.name}: найдено игр — ${games.length}`
    );

    return {
      key: catalog.key,
      name: catalog.name,
      url: catalog.url,
      games,
    };
  } finally {
    if (context) {
      await context
        .close()
        .catch(() => {});
    }
  }
}

/* =========================================================
   ОБЪЕДИНЕНИЕ КАТАЛОГОВ
========================================================= */

function mergeCatalogResults(
  catalogResults
) {
  const mergedGames = new Map();

  for (
    const catalogResult of
    catalogResults
  ) {
    for (
      const game of
      catalogResult.games
    ) {
      const existingGame =
        mergedGames.get(game.metaId);

      if (!existingGame) {
        mergedGames.set(
          game.metaId,
          {
            ...game,
            catalogs: [
              game.catalog,
            ],
          }
        );

        continue;
      }

      mergedGames.set(
        game.metaId,
        {
          ...existingGame,

          catalogs: [
            ...new Set([
              ...(
                existingGame.catalogs ||
                [existingGame.catalog]
              ),

              game.catalog,
            ]),
          ],

          catalogName:
            "Основной и инди-каталог",
        }
      );
    }
  }

  return [...mergedGames.values()];
}

/* =========================================================
   ОБНОВЛЕНИЕ КАТАЛОГОВ
========================================================= */

async function loadAllHorizonCatalogs() {
  let browser;

  try {
    console.log(
      "Запускаю экономный Chromium..."
    );

    browser =
      await chromium.launch({
        headless: true,

        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--no-zygote",
          "--disable-extensions",
          "--disable-background-networking",
          "--disable-background-timer-throttling",
          "--disable-renderer-backgrounding",
          "--disable-sync",
          "--disable-translate",
          "--metrics-recording-only",
          "--mute-audio",
        ],
      });

    /*
     * Каталоги загружаются по очереди.
     * Promise.all здесь использовать нельзя.
     */
    const catalogResults = [];

    for (
      const catalog of
      HORIZON_CATALOGS
    ) {
      const catalogResult =
        await loadCatalogWithBrowser(
          browser,
          catalog
        );

      catalogResults.push(
        catalogResult
      );
    }

    const games =
      mergeCatalogResults(
        catalogResults
      );

    if (games.length === 0) {
      throw new Error(
        "Объединённый каталог пуст"
      );
    }

    vrCatalogCache = {
      games,

      catalogs:
        catalogResults.map(
          (catalogResult) => ({
            key:
              catalogResult.key,

            name:
              catalogResult.name,

            url:
              catalogResult.url,

            gameCount:
              catalogResult
                .games.length,
          })
        ),

      updatedAt: Date.now(),
    };

    console.log(
      "Всего уникальных игр Horizon+:",
      games.length
    );

    return vrCatalogCache;
  } finally {
    if (browser) {
      await browser
        .close()
        .catch(() => {});
    }

    console.log(
      "Chromium полностью закрыт."
    );
  }
}

/*
 * Если каталог уже обновляется,
 * следующий запрос ожидает это же обновление.
 */
function refreshHorizonCatalogs() {
  if (vrCatalogRefreshPromise) {
    console.log(
      "Обновление уже выполняется. Ожидаю результат..."
    );

    return vrCatalogRefreshPromise;
  }

  vrCatalogRefreshPromise =
    loadAllHorizonCatalogs()
      .finally(() => {
        vrCatalogRefreshPromise = null;
      });

  return vrCatalogRefreshPromise;
}

/* =========================================================
   ПРОВЕРКА РАБОТЫ СЕРВЕРА
========================================================= */

app.get(
  "/api/health",
  (req, res) => {
    res.json({
      status: "ok",
      service: "Neon Oasis VR API",
      cacheGames:
        vrCatalogCache.games.length,

      updatedAt:
        vrCatalogCache.updatedAt
          ? new Date(
              vrCatalogCache.updatedAt
            ).toISOString()
          : null,
    });
  }
);

/* =========================================================
   API VR-ИГР
========================================================= */

app.get(
  "/api/vr-games",
  async (req, res) => {
    const cacheIsFresh =
      vrCatalogCache.games.length > 0 &&
      Date.now() -
        vrCatalogCache.updatedAt <
        VR_CACHE_TIME;

    if (cacheIsFresh) {
      return res.json({
        games:
          vrCatalogCache.games,

        catalogs:
          vrCatalogCache.catalogs,

        source: "cache",

        updatedAt: new Date(
          vrCatalogCache.updatedAt
        ).toISOString(),
      });
    }

    try {
      const result =
        await refreshHorizonCatalogs();

      return res.json({
        games: result.games,

        catalogs:
          result.catalogs,

        source:
          "meta-horizon-plus",

        updatedAt: new Date(
          result.updatedAt
        ).toISOString(),
      });
    } catch (error) {
      console.error(
        "Ошибка обновления Horizon+:",
        error
      );

      if (
        vrCatalogCache.games.length > 0
      ) {
        return res.json({
          games:
            vrCatalogCache.games,

          catalogs:
            vrCatalogCache.catalogs,

          source: "stale-cache",

          warning:
            "Показан предыдущий каталог.",

          updatedAt: new Date(
            vrCatalogCache.updatedAt
          ).toISOString(),
        });
      }

      return res
        .status(503)
        .json({
          games: [],
          catalogs: [],

          error:
            "Не удалось получить каталоги Horizon+.",

          details:
            error.message,
        });
    }
  }
);

/* =========================================================
   ПРИНУДИТЕЛЬНОЕ ОБНОВЛЕНИЕ
========================================================= */

app.post(
  "/api/vr-games/refresh",
  async (req, res) => {
    const authHeader =
      req.headers.authorization ||
      "";

    const token =
      authHeader.split(" ")[1];

    if (
      !process.env.API_TOKEN ||
      token !==
        process.env.API_TOKEN
    ) {
      return res
        .status(403)
        .json({
          error: "Нет доступа",
        });
    }

    try {
      vrCatalogCache.updatedAt = 0;

      const result =
        await refreshHorizonCatalogs();

      return res.json({
        message:
          "Каталог обновлён.",

        games: result.games,

        catalogs:
          result.catalogs,

        updatedAt: new Date(
          result.updatedAt
        ).toISOString(),
      });
    } catch (error) {
      console.error(
        "Ошибка принудительного обновления:",
        error
      );

      return res
        .status(503)
        .json({
          error:
            "Не удалось обновить каталог.",

          details:
            error.message,
        });
    }
  }
);

/* =========================================================
   API БРОНИРОВАНИЯ
========================================================= */

let bookings = [];

app.get(
  "/api/bookings",
  (req, res) => {
    const authHeader =
      req.headers.authorization ||
      "";

    const token =
      authHeader.split(" ")[1];

    if (
      !process.env.API_TOKEN ||
      token !==
        process.env.API_TOKEN
    ) {
      return res
        .status(403)
        .json({
          error: "Нет доступа",
        });
    }

    return res.json(bookings);
  }
);

app.post(
  "/api/book",
  (req, res) => {
    const {
      name,
      phone,
      date,
      time,
      activity,
    } = req.body;

    if (
      !name ||
      !phone ||
      !date ||
      !time ||
      !activity
    ) {
      return res
        .status(400)
        .json({
          error:
            "Заполнены не все поля бронирования.",
        });
    }

    bookings.push({
      name,
      phone,
      date,
      time,
      activity,
      createdAt:
        new Date().toISOString(),
    });

    return res
      .status(200)
      .json({
        message:
          "Бронирование успешно принято!",
      });
  }
);

/* =========================================================
   ЗАЩИТА АДМИНКИ
========================================================= */

if (ADMIN_USER && ADMIN_PASS) {
  app.use(
    "/admin",
    basicAuth({
      users: {
        [ADMIN_USER]:
          ADMIN_PASS,
      },

      challenge: true,
      realm: "Admin Panel",
    })
  );
} else {
  console.warn(
    "ADMIN_USER или ADMIN_PASS не заданы."
  );
}

/* =========================================================
   СТАТИКА REACT
========================================================= */

const buildPath =
  path.join(
    __dirname,
    "../build"
  );

app.use(
  express.static(buildPath)
);

/* =========================================================
   REACT ROUTER
========================================================= */

app.get(
  /^\/(?!api).*/,
  (req, res) => {
    const indexPath =
      path.join(
        buildPath,
        "index.html"
      );

    return res.sendFile(
      indexPath,
      (error) => {
        if (error) {
          return res
            .status(404)
            .json({
              error:
                "React-сборка отсутствует. API работает отдельно.",
            });
        }
      }
    );
  }
);

/* =========================================================
   ОБРАБОТКА НЕИЗВЕСТНЫХ API
========================================================= */

app.use(
  "/api",
  (req, res) => {
    return res
      .status(404)
      .json({
        error:
          "API-маршрут не найден.",
      });
  }
);

/* =========================================================
   ЗАПУСК
========================================================= */

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `Server is running on port ${PORT}`
  );

  console.log(
    `VR API: /api/vr-games`
  );

  console.log(
    `Health check: /api/health`
  );

  console.log(
    "Используются каталоги:"
  );

  for (
    const catalog of
    HORIZON_CATALOGS
  ) {
    console.log(
      `- ${catalog.name}: ${catalog.url}`
    );
  }
});