// server/index.js

require("dotenv").config({
  path: require("path").join(
    __dirname,
    "../.env"
  ),
});

const express = require("express");
const cors = require("cors");
const path = require("path");
const basicAuth = require(
  "express-basic-auth"
);
const { chromium } = require("playwright");

const app = express();

const PORT =
  process.env.PORT || 5000;

const ADMIN_USER =
  process.env.ADMIN_USER;

const ADMIN_PASS =
  process.env.ADMIN_PASS;

app.use(cors());
app.use(express.json());

/* =========================================================
   КАТАЛОГИ META HORIZON+
========================================================= */

const HORIZON_CATALOGS = [
  {
    key: "main",
    name: "Основной каталог",
    url:
      "https://www.meta.com/experiences/section/746836817401205/",
  },
  {
    key: "indie",
    name: "Инди-каталог",
    url:
      "https://www.meta.com/experiences/section/3170833353093973/",
  },
];

const VR_CACHE_TIME =
  6 * 60 * 60 * 1000;

const MIN_GAMES_PER_CATALOG = 1;

let vrCatalogCache = {
  games: [],
  catalogs: [],
  updatedAt: 0,
};

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
      if (
        index > 0 &&
        smallWords.has(word)
      ) {
        return word;
      }

      if (word === "vr") {
        return "VR";
      }

      if (word === "xr") {
        return "XR";
      }

      if (word === "ii") {
        return "II";
      }

      if (word === "iii") {
        return "III";
      }

      return (
        word.charAt(0).toUpperCase() +
        word.slice(1)
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

  const match =
    normalizedUrl.match(
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

  /*
   * Удаляем служебные надписи
   * перед названием игры.
   */
  title = title
    .replace(
      /^(top rated|best seller|bestseller|featured|popular|new release|new)\s*/i,
      ""
    )
    .trim();

  /*
   * Удаляем рейтинг и всё после него.
   *
   * Пример:
   * GOLF+4.8 (53K) Games Sports $29.99
   * превращается в:
   * GOLF+
   */
  title = title
    .split(
      /\d(?:\.\d)?\s*\(\s*\d+(?:\.\d+)?[KMB]?\s*\)/i
    )[0]
    .trim();

  /*
   * Удаляем категории и цену.
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

  /*
   * Если вместо названия получен
   * служебный текст, пробуем создать
   * название из адреса.
   */
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
   АВТОМАТИЧЕСКИЙ ВОЗРАСТ
========================================================= */

function getAutomaticAgeCategories(
  title = ""
) {
  const normalized =
    normalizeTitle(title);

  /*
   * Сначала проверяем слова,
   * указывающие на взрослый или
   * потенциально жестокий контент.
   */
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

  /*
   * Спокойные, семейные, спортивные,
   * музыкальные и творческие игры.
   */
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
    "lego",
    "max mustard",
    "wallace",
    "gromit",
    "smurfs",
    "spongebob",
    "track craft",
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

  /*
   * Если определить возраст нельзя,
   * детям игру автоматически
   * не рекомендуем.
   */
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

  for (
    const buttonName of buttonNames
  ) {
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

      if (
        await firstButton.isVisible()
      ) {
        await firstButton.click({
          timeout: 3000,
        });

        await page.waitForTimeout(700);

        return;
      }
    } catch {
      /*
       * Если кнопка отсутствует,
       * продолжаем загрузку.
       */
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
    attempt < 50;
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

    await page.waitForTimeout(1200);

    if (
      currentHeight === previousHeight
    ) {
      unchangedAttempts += 1;
    } else {
      unchangedAttempts = 0;
    }

    previousHeight = currentHeight;

    if (unchangedAttempts >= 5) {
      break;
    }
  }

  await page.evaluate(() => {
    window.scrollTo(0, 0);
  });
}

/* =========================================================
   ПОЛУЧЕНИЕ КАРТОЧЕК
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
      parseMetaGameUrl(
        rawCard.href
      );

    if (!parsedUrl) {
      continue;
    }

    const existingGame =
      games.get(parsedUrl.metaId);

    /*
     * Если карточка уже сохранена
     * с изображением, оставляем её.
     */
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

    /*
     * Полностью удаляем View,
     * Home, Games, Apps и Sale.
     */
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

      trailerUrl:
        parsedUrl.url,

      imageUrl:
        rawCard.imageUrl || "",

      ownership:
        "horizon-plus",

      catalog:
        catalog.key,

      catalogName:
        catalog.name,

      /*
       * Для автоматически добавленных
       * игр количество неизвестно.
       */
      maxPlayers: null,

      ageCategories:
        getAutomaticAgeCategories(
          title
        ),
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
   ЗАГРУЗКА КАТАЛОГА
========================================================= */

async function loadCatalogWithBrowser(
  browser,
  catalog
) {
  const context =
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
        width: 1440,
        height: 1000,
      },
    });

  const page =
    await context.newPage();

  try {
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

    await page.waitForTimeout(5000);

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
        `${catalog.name}: ` +
          "игры не обнаружены"
      );
    }

    console.log(
      `${catalog.name}: ` +
        `найдено игр — ${games.length}`
    );

    return {
      key: catalog.key,
      name: catalog.name,
      url: catalog.url,
      games,
    };
  } finally {
    await context.close();
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
        mergedGames.get(
          game.metaId
        );

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
                [
                  existingGame.catalog,
                ]
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
   ОБНОВЛЕНИЕ ОБОИХ КАТАЛОГОВ
========================================================= */

async function loadAllHorizonCatalogs() {
  let browser;

  try {
    browser =
      await chromium.launch({
        headless: true,
      });

    const catalogResults =
      await Promise.all(
        HORIZON_CATALOGS.map(
          (catalog) => {
            return loadCatalogWithBrowser(
              browser,
              catalog
            );
          }
        )
      );

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
      await browser.close();
    }
  }
}

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
        await loadAllHorizonCatalogs();

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

          source:
            "stale-cache",

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
        await loadAllHorizonCatalogs();

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
      token !==
      process.env.API_TOKEN
    ) {
      return res
        .status(403)
        .json({
          error: "Нет доступа",
        });
    }

    res.json(bookings);
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

    bookings.push({
      name,
      phone,
      date,
      time,
      activity,
    });

    res.status(200).json({
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
    "ADMIN_USER или ADMIN_PASS " +
      "не заданы в .env"
  );
}

/* =========================================================
   СТАТИКА REACT
========================================================= */

app.use(
  express.static(
    path.join(
      __dirname,
      "../build"
    )
  )
);

/* =========================================================
   REACT ROUTER
========================================================= */

app.get(
  /^\/(?!api).*/,
  (req, res) => {
    res.sendFile(
      path.join(
        __dirname,
        "../build",
        "index.html"
      )
    );
  }
);

/* =========================================================
   ЗАПУСК
========================================================= */

app.listen(PORT, () => {
  console.log(
    `Server is running on ` +
      `http://localhost:${PORT}`
  );

  console.log(
    `VR API: ` +
      `http://localhost:${PORT}/api/vr-games`
  );

  console.log(
    "Используются каталоги:"
  );

  HORIZON_CATALOGS.forEach(
    (catalog) => {
      console.log(
        `- ${catalog.name}: ` +
          catalog.url
      );
    }
  );
});