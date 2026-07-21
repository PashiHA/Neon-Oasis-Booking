// src/components/GamesCatalog.js

import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import styles from "./GamesCatalog.module.css";

/* =========================================================
   НАСТРОЙКИ
========================================================= */

const VR_CATEGORIES = [
  "Все",
  "Дети",
  "Подростки",
  "Взрослые",
];

const VR_PLAYERS = [
  "Все",
  "2 игрока",
  "4 игрока",
];

const API_SERVER =
  process.env.REACT_APP_API_URL ||
  (
    process.env.NODE_ENV === "development"
      ? "http://localhost:5000"
      : ""
  );

const VR_GAMES_API =
  `${API_SERVER}/api/vr-games`;

const BOOKING_NOTICE_STYLE = {
  marginTop: "8px",
  padding: "6px 10px",
  borderRadius: "8px",
  background:
    "rgba(255, 196, 0, 0.12)",
  color: "#ffd54a",
  fontWeight: 700,
  fontSize: "0.9rem",
  width: "fit-content",
};

/* =========================================================
   КУПЛЕННЫЕ И БЕСПЛАТНЫЕ ИГРЫ
========================================================= */

const PURCHASED_VR_TITLES = new Set([
  "Beat Saber",
  "CleanSheet Soccer",
  "Escape Simulator",
  "Car Parking Simulator",
  "Vacation Simulator",
  "Elements Divided",
  "Batman: Arkham Shadow",
  "SuperHot",
  "The Climb 2",
  "Horror Simulator",
  "Swordsman",
  "Titans Clinic",
  "Creed: Rise to Glory Championship",
  "Metro Awakening",
  "DAVID",
  "VR Horror Stories",
  "Hunt Together",
  "FINAL FURY",
  "Arizona Sunshine 2",
]);

const FREE_VR_TITLES = new Set([
  "Aim XR",
  "First Encounters",
  "Epic Roller Coasters",
  "Blaston",
]);

/* =========================================================
   РЕЗЕРВНЫЙ КАТАЛОГ VR
========================================================= */

const vrGames = [
  {
    title: "Beat Saber",
    description:
      "Ритм-игра, где необходимо разрезать летящие блоки в такт музыке.",
    trailerUrl:
      "https://www.meta.com/experiences/quest/2448060205267927/",
    ageCategories: [
      "Дети",
      "Подростки",
      "Взрослые",
    ],
    maxPlayers: 5,
    imageUrl:
      "https://roadtovrlive-5ea0.kxcdn.com/wp-content/uploads/2019/02/beat-saber-5.jpg",
  },
  {
    title: "Arizona Sunshine 2",
    description:
      "Зомби-экшен с реалистичным оружием и совместной игрой.",
    trailerUrl:
      "https://www.meta.com/experiences/arizona-sunshine-2/5245041552210029/",
    ageCategories: [
      "Подростки",
      "Взрослые",
    ],
    maxPlayers: 4,
    imageUrl:
      "https://www.nerealnoemesto.ru/netcat_files/multifile/367/76/Arizona_Sunshine_2_6.jpg",
  },
  {
    title: "FINAL FURY",
    description:
      "Динамичный VR-файтинг с фантастическими бойцами.",
    trailerUrl:
      "https://www.meta.com/experiences/final-fury/5218982198148896/",
    ageCategories: [
      "Дети",
      "Подростки",
      "Взрослые",
    ],
    maxPlayers: 2,
    imageUrl:
      "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1782760/capsule_616x353.jpg",
  },
  {
    title: "Hunt Together",
    description:
      "Охота в режимах «Дуэль» и «Прятки».",
    trailerUrl:
      "https://www.meta.com/experiences/hunt-together/4404934906269269/",
    ageCategories: [
      "Дети",
      "Подростки",
      "Взрослые",
    ],
    maxPlayers: 4,
    imageUrl:
      "https://assets-prd.ignimgs.com/2023/12/06/hunttogether-thumb-1701881131396.jpg",
  },
  {
    title: "VR Horror Stories",
    description:
      "Мрачное хоррор-приключение в виртуальной реальности.",
    trailerUrl:
      "https://www.meta.com/experiences/vr-horror-stories/8049435668460032/",
    ageCategories: [
      "Подростки",
      "Взрослые",
    ],
    maxPlayers: 1,
    imageUrl:
      "https://i.ytimg.com/vi/s8skqii4wtr/maxresdefault.jpg",
  },
  {
    title: "DAVID",
    description:
      "Космическое приключение на выживание.",
    trailerUrl:
      "https://www.meta.com/experiences/david/3891771757540892/",
    ageCategories: [
      "Дети",
      "Подростки",
    ],
    maxPlayers: 1,
    imageUrl:
      "https://i.ytimg.com/vi/xp_S63ZkctA/maxresdefault.jpg",
  },
  {
    title: "Metro Awakening",
    description:
      "Сюжетное приключение в постапокалиптическом метро.",
    trailerUrl:
      "https://www.meta.com/experiences/metro-awakening/5096918017089406/",
    ageCategories: [
      "Подростки",
      "Взрослые",
    ],
    maxPlayers: 1,
    imageUrl:
      "https://gagadget.com/media/post_big/metro_smm.png",
  },
  {
    title: "Aim XR",
    description:
      "Бесплатный многопользовательский VR-шутер.",
    trailerUrl:
      "https://www.meta.com/experiences/aim-xr/4245506092131005/",
    ageCategories: [
      "Подростки",
      "Взрослые",
    ],
    maxPlayers: 12,
    imageUrl:
      "https://i.ytimg.com/vi/pBcU5w34nH0/maxresdefault.jpg",
  },
  {
    title:
      "Creed: Rise to Glory Championship",
    description:
      "Боксёрский VR-симулятор по мотивам фильма «Крид».",
    trailerUrl:
      "https://www.meta.com/experiences/creed-rise-to-glory-championship-edition/2366245336750543/",
    ageCategories: [
      "Подростки",
      "Взрослые",
    ],
    maxPlayers: 2,
    imageUrl:
      "https://survios.com/creed/wp-content/themes/creed/assets/img/screenshots/10.jpg",
  },
  {
    title: "Into Black",
    description:
      "Космический экшен с исследованием инопланетного мира.",
    trailerUrl:
      "https://www.meta.com/experiences/into-black/5289374691122516/",
    ageCategories: [
      "Подростки",
      "Взрослые",
    ],
    maxPlayers: 4,
    imageUrl:
      "https://holographica.space/wp-content/uploads/2024/09/39035308_2327028967637549_3896354194298482574_n.jpg",
  },
  {
    title: "Home Sports",
    description:
      "Спортивные мини-игры в виртуальной реальности.",
    trailerUrl:
      "https://www.meta.com/experiences/home-sports/8975028309180826/",
    ageCategories: [
      "Дети",
      "Подростки",
    ],
    maxPlayers: 1,
    imageUrl:
      "https://images.squarespace-cdn.com/content/v1/61813b3361b99650be1a2c4c/e56502a1-8d39-4772-8ddd-a39917055500/homesports_trailscreenshot1.jpeg",
  },
  {
    title: "Garden of the Sea",
    description:
      "Красочное приключение с исследованиями и головоломками.",
    trailerUrl:
      "https://www.meta.com/experiences/garden-of-the-sea/3684804704932159/",
    ageCategories: [
      "Дети",
      "Подростки",
    ],
    maxPlayers: 1,
    imageUrl:
      "https://image.api.playstation.com/vulcan/ap/rnd/202302/2415/9a00ab354fc172e94baaa108ac20d43ad51e84c22f9d3b8c.png",
  },
  {
    title: "Titans Clinic",
    description:
      "VR-симулятор клиники с необычными пациентами.",
    trailerUrl:
      "https://www.meta.com/experiences/titans-clinic/6035422123217068/",
    ageCategories: [
      "Подростки",
      "Взрослые",
    ],
    maxPlayers: 1,
    imageUrl:
      "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2596030/capsule_616x353.jpg",
  },
  {
    title: "Swordsman",
    description:
      "Сражения на мечах с реалистичной физикой.",
    trailerUrl:
      "https://www.meta.com/experiences/swordsman/4478419005520485/",
    ageCategories: [
      "Подростки",
      "Взрослые",
    ],
    maxPlayers: 1,
    imageUrl:
      "https://roadtovrlive-5ea0.kxcdn.com/wp-content/uploads/2021/10/swordsman-1.jpg",
  },
  {
    title: "Hoopzter Basketball",
    description:
      "Аркадный баскетбол в виртуальной реальности.",
    trailerUrl:
      "https://www.meta.com/experiences/hoopzter-basketball/6051606724925903/",
    ageCategories: [
      "Дети",
      "Подростки",
    ],
    maxPlayers: 1,
    imageUrl:
      "https://i.ytimg.com/vi/fgwHOeIrKj0/maxresdefault.jpg",
  },
  {
    title: "Horror Simulator",
    description:
      "Интенсивный хоррор для любителей острых ощущений.",
    trailerUrl:
      "https://www.meta.com/experiences/horror-simulator/6847023095354894/",
    ageCategories: [
      "Подростки",
      "Взрослые",
    ],
    maxPlayers: 1,
    imageUrl:
      "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3063780/header.jpg",
  },
  {
    title: "Red Matter",
    description:
      "Научно-фантастический квест на космической станции.",
    trailerUrl:
      "https://www.meta.com/experiences/red-matter/2180753588712484/",
    ageCategories: [
      "Подростки",
      "Взрослые",
    ],
    maxPlayers: 1,
    imageUrl:
      "https://gamingtrend.com/content/images/size/w1200/2025/02/untitled-1-11.jpg",
  },
  {
    title: "The Climb 2",
    description:
      "Реалистичное скалолазание в живописных локациях.",
    trailerUrl:
      "https://www.meta.com/experiences/the-climb-2/2617233878395214/",
    ageCategories: [
      "Подростки",
      "Взрослые",
    ],
    maxPlayers: 1,
    imageUrl:
      "https://sm.mashable.com/mashable_sea/fun/t/the-climb-/the-climb-2-is-a-thrilling-vr-free-solo-adventure-that-doubl_493s.jpg",
  },
  {
    title: "SuperHot",
    description:
      "Шутер, где время движется вместе с игроком.",
    trailerUrl:
      "https://www.meta.com/experiences/superhot-vr/1921533091289407/",
    ageCategories: [
      "Подростки",
      "Взрослые",
    ],
    maxPlayers: 1,
    imageUrl:
      "https://m.media-amazon.com/images/I/81VPGYDoWxL.jpg",
  },
  {
    title: "First Encounters",
    description:
      "Бесплатная игра для знакомства с возможностями Quest.",
    trailerUrl:
      "https://www.meta.com/experiences/first-encounters/6236169136472090/",
    ageCategories: ["Дети"],
    maxPlayers: 1,
    imageUrl:
      "https://d2z8nyy70yf33i.cloudfront.net/wp-content/uploads/encounters-2-950x534.jpg",
  },
  {
    title: "Batman: Arkham Shadow",
    description:
      "Приключение Бэтмена в виртуальной реальности.",
    trailerUrl:
      "https://www.meta.com/experiences/batman-arkham-shadow/3551691271620960/",
    ageCategories: [
      "Подростки",
      "Взрослые",
    ],
    maxPlayers: 1,
    imageUrl:
      "https://ixbt.online/gametech/covers/2024/09/27/nova-filepond-OiXHYt.jpg",
  },
  {
    title: "Elements Divided",
    description:
      "Управляйте огнём, водой, землёй и воздухом.",
    trailerUrl:
      "https://www.meta.com/experiences/elements-divided/9471144046261462/",
    ageCategories: [
      "Подростки",
      "Взрослые",
    ],
    maxPlayers: 1,
    imageUrl:
      "https://mixed-news.com/en/wp-content/uploads/2025/03/Elements-Divided-1200x675.jpg",
  },
  {
    title: "Walkabout Mini Golf",
    description:
      "Мини-гольф на фантастических полях.",
    trailerUrl:
      "https://www.meta.com/experiences/walkabout-mini-golf/2462678267173943/",
    ageCategories: [
      "Дети",
      "Подростки",
      "Взрослые",
    ],
    maxPlayers: 8,
    imageUrl:
      "https://i.ytimg.com/vi/03NGeTbk6O0/maxresdefault.jpg",
  },
  {
    title: "Pavlov Shack",
    description:
      "Тактический VR-шутер в стиле Counter-Strike.",
    trailerUrl:
      "https://www.meta.com/experiences/pavlov-shack/2443267419018232/",
    ageCategories: [
      "Подростки",
      "Взрослые",
    ],
    maxPlayers: 10,
    imageUrl:
      "https://static.tildacdn.com/tild6265-3565-4633-b830-393334633866/Pavlov_VR_1.jpg",
  },
  {
    title: "Vacation Simulator",
    description:
      "Весёлый симулятор отпуска с множеством заданий.",
    trailerUrl:
      "https://www.meta.com/experiences/vacation-simulator/2393300320759737/",
    ageCategories: [
      "Дети",
      "Подростки",
    ],
    maxPlayers: 1,
    imageUrl:
      "https://www.uploadvr.com/content/images/size/w1200/2019/04/Vacation-Simulator-Review-1.jpg",
  },
  {
    title: "Epic Roller Coasters",
    description:
      "Бесплатные американские горки в виртуальной реальности.",
    trailerUrl:
      "https://www.meta.com/experiences/epic-roller-coasters/2299465166734471/",
    ageCategories: [
      "Дети",
      "Подростки",
    ],
    maxPlayers: 1,
    imageUrl:
      "https://i.ytimg.com/vi/XLoIbN6TOYk/maxresdefault.jpg",
  },
  {
    title:
      "Angry Birds VR: Isle of Pigs",
    description:
      "Знаменитые Angry Birds в виртуальной реальности.",
    trailerUrl:
      "https://www.meta.com/experiences/angry-birds-vr-isle-of-pigs/2718606324833775/",
    ageCategories: [
      "Дети",
      "Подростки",
    ],
    maxPlayers: 1,
    imageUrl:
      "https://i.pcmag.com/imagery/reviews/02XsybD1jnhw085sdmcvWTd-1..v1696524785.jpg",
  },
  {
    title: "Premium Bowling",
    description:
      "Боулинг с реалистичной физикой кеглей.",
    trailerUrl:
      "https://www.meta.com/experiences/premium-bowling/2773034772778845/",
    ageCategories: [
      "Дети",
      "Подростки",
      "Взрослые",
    ],
    maxPlayers: 1,
    imageUrl:
      "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/898580/header.jpg",
  },
  {
    title: "Dungeons of Eternity",
    description:
      "Совместная ролевая игра с подземельями и сражениями.",
    trailerUrl:
      "https://www.meta.com/experiences/dungeons-of-eternity/6341779295861881/",
    ageCategories: [
      "Подростки",
      "Взрослые",
    ],
    maxPlayers: 4,
    imageUrl:
      "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3189340/header.jpg",
  },
  {
    title: "Cook-Out",
    description:
      "Совместное приготовление блюд на весёлой кухне.",
    trailerUrl:
      "https://www.meta.com/experiences/cook-out/2004774962957063/",
    ageCategories: [
      "Дети",
      "Подростки",
      "Взрослые",
    ],
    maxPlayers: 4,
    imageUrl:
      "https://a2.storyblok.com/f/163663/1920x1080/39e6a9fc6a/cook-out-lead.png",
  },
  {
    title: "Blaston",
    description:
      "Бесплатный соревновательный VR-шутер.",
    trailerUrl:
      "https://www.meta.com/experiences/blaston/2307085352735834/",
    ageCategories: [
      "Дети",
      "Подростки",
      "Взрослые",
    ],
    maxPlayers: 2,
    imageUrl:
      "https://images.squarespace-cdn.com/content/v1/61813b3361b99650be1a2c4c/e7178309-129f-4b2f-95bf-6df922a80b7c/Copy%2Bof%2Bscreenshot_swarm.jpeg",
  },
  {
    title: "Car Parking Simulator",
    description:
      "Симулятор парковки и вождения автомобилей.",
    trailerUrl:
      "https://www.meta.com/experiences/car-parking-simulator-driving-and-racing/3890415587677522/",
    ageCategories: [
      "Дети",
      "Подростки",
      "Взрослые",
    ],
    maxPlayers: 1,
    imageUrl:
      "https://i.ytimg.com/vi/4yuGraJbERI/hq720.jpg",
  },
  {
    title: "Elven Assassin",
    description:
      "Фэнтезийный экшен со стрельбой из лука.",
    trailerUrl:
      "https://www.meta.com/experiences/elven-assassin/2325731427501921/",
    ageCategories: [
      "Подростки",
      "Взрослые",
    ],
    maxPlayers: 4,
    imageUrl:
      "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/503770/header.jpg",
  },
  {
    title: "Deisim",
    description:
      "Симулятор бога, где вы создаёте собственный мир.",
    trailerUrl:
      "https://www.meta.com/experiences/deisim/3526702020710931/",
    ageCategories: [
      "Дети",
      "Подростки",
    ],
    maxPlayers: 1,
    imageUrl:
      "https://www.deisim.com/images/Screen-03.png",
  },
  {
    title: "Escape Simulator",
    description:
      "VR-квесты, комнаты и разнообразные головоломки.",
    trailerUrl:
      "https://www.meta.com/experiences/escape-free/24467240542922395/",
    ageCategories: [
      "Подростки",
      "Взрослые",
    ],
    maxPlayers: 1,
    imageUrl:
      "https://roadtovrlive-5ea0.kxcdn.com/wp-content/uploads/2023/06/escape-sim-vr.jpg",
  },
  {
    title: "Thief Simulator",
    description:
      "Стелс-игра с проникновениями и кражами.",
    trailerUrl:
      "https://www.meta.com/experiences/thief-simulator-vr-greenview-street/3395626290543887/",
    ageCategories: [
      "Подростки",
      "Взрослые",
    ],
    maxPlayers: 1,
    imageUrl:
      "https://fanatical.imgix.net/product/original/ba5ea90b-e0cc-4f7b-a8b9-b54741a45900.jpeg",
  },
  {
    title: "Ocean Rift",
    description:
      "Подводное путешествие среди морских животных.",
    trailerUrl:
      "https://www.meta.com/experiences/ocean-rift/2134272053250863/",
    ageCategories: ["Дети"],
    maxPlayers: 1,
    imageUrl:
      "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjU5O6CGkTuc9wvUmHeRU_7ZAUGvT4KfY_THHekZGKqbCgvTnWGfYl_xLcnH80DnAQViP2vYjTFc21egdULdVi9lOo1EWyrTUd20m4GAbiEXi1REVmDmrTx8PZF_UuZZrEdZJQds7prgRU/s1600/Ocean+Rift+4.jpg",
  },
  {
    title: "CleanSheet Soccer",
    description:
      "Футбольный симулятор с тренировками вратаря.",
    trailerUrl:
      "https://www.meta.com/experiences/cleansheet-soccer/5005632286166834/",
    ageCategories: [
      "Дети",
      "Подростки",
    ],
    maxPlayers: 1,
    imageUrl:
      "https://i.ytimg.com/vi/duzRr9zQxGA/maxresdefault.jpg",
  },
  {
    title: "Sweet Surrender",
    description:
      "Динамичный шутер-рогалик в антиутопической башне.",
    trailerUrl:
      "https://www.meta.com/experiences/sweet-surrender/4723352327707414/",
    ageCategories: [
      "Подростки",
      "Взрослые",
    ],
    maxPlayers: 1,
    imageUrl:
      "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/638130/header.jpg",
  },
];

/* =========================================================
   ОБРАБОТКА VR-КАТАЛОГА
========================================================= */

function normalizeTitle(title = "") {
  return title
    .trim()
    .toLocaleLowerCase("ru-RU");
}

function getMetaId(game = {}) {
  if (game.metaId) {
    return String(game.metaId);
  }

  const match =
    game.trailerUrl?.match(
      /\/(\d+)\/?(?:\?|$)/
    );

  return match?.[1] || "";
}

function getOwnership(title) {
  if (
    PURCHASED_VR_TITLES.has(title)
  ) {
    return "purchased";
  }

  if (FREE_VR_TITLES.has(title)) {
    return "free";
  }

  return "horizon-plus";
}

const LOCAL_VR_GAMES =
  vrGames.map((game) => ({
    ...game,

    ownership:
      getOwnership(game.title),

    /*
     * Игры из старого каталога
     * уже установлены.
     */
    installed: true,
  }));

function mergeVrCatalog(remoteGames) {
  const localByTitle = new Map(
    LOCAL_VR_GAMES.map((game) => [
      normalizeTitle(game.title),
      game,
    ])
  );

  const localByMetaId = new Map(
    LOCAL_VR_GAMES
      .filter((game) =>
        getMetaId(game)
      )
      .map((game) => [
        getMetaId(game),
        game,
      ])
  );

  /*
   * Купленные и бесплатные игры
   * остаются всегда.
   */
  const permanentGames =
    LOCAL_VR_GAMES.filter(
      (game) =>
        game.ownership ===
          "purchased" ||
        game.ownership === "free"
    );

  const horizonGames = remoteGames
    .filter((remoteGame) => {
      const localGame =
        localByMetaId.get(
          getMetaId(remoteGame)
        ) ||
        localByTitle.get(
          normalizeTitle(
            remoteGame.title
          )
        );

      /*
       * Купленную или бесплатную
       * игру не превращаем обратно
       * в подписочную.
       */
      return (
        !localGame ||
        localGame.ownership ===
          "horizon-plus"
      );
    })
    .map((remoteGame) => {
      const localGame =
        localByMetaId.get(
          getMetaId(remoteGame)
        ) ||
        localByTitle.get(
          normalizeTitle(
            remoteGame.title
          )
        );

      return {
        ...localGame,
        ...remoteGame,

        title:
          localGame?.title ||
          remoteGame.title ||
          "Игра Horizon+",

        description:
          remoteGame.description ||
          localGame?.description ||
          "Игра из каталога Meta Horizon+.",

        trailerUrl:
          remoteGame.trailerUrl ||
          localGame?.trailerUrl ||
          "#",

        imageUrl:
          remoteGame.imageUrl ||
          localGame?.imageUrl ||
          "",

        ageCategories:
          remoteGame.ageCategories ||
          localGame?.ageCategories || [
            "Подростки",
            "Взрослые",
          ],

        /*
         * Для новых игр количество
         * игроков неизвестно.
         *
         * Не устанавливаем 1 автоматически.
         */
        maxPlayers:
          remoteGame.maxPlayers ??
          localGame?.maxPlayers ??
          null,

        ownership:
          "horizon-plus",

        installed:
          typeof remoteGame.installed ===
          "boolean"
            ? remoteGame.installed
            : localGame?.installed ??
              false,
      };
    });

  const mergedGames = new Map();

  [
    ...permanentGames,
    ...horizonGames,
  ].forEach((game) => {
    const key =
      getMetaId(game) ||
      normalizeTitle(game.title);

    mergedGames.set(key, game);
  });

  return [
    ...mergedGames.values(),
  ];
}

/* =========================================================
   ОСТАЛЬНЫЕ КАТАЛОГИ
========================================================= */

const psGames = [
  {
    title: "EA FC 26",
    description: "Футбол на PS5.",
    trailerUrl: "#",
    imageUrl:
      "https://i.ytimg.com/vi/EbrAfuBn_2w/maxresdefault.jpg",
  },
  {
    title: "Mortal Kombat 1",
    description: "Файтинг на PS5.",
    trailerUrl: "#",
    imageUrl:
      "https://i.ytimg.com/vi/M-V5Wxc-D5E/maxresdefault.jpg",
  },
  {
    title: "GTA V",
    description:
      "Большой открытый мир.",
    trailerUrl: "#",
    imageUrl:
      "https://img.gta5-mods.com/q95/images/save-game-44/a82937-v_trunk_1920x1080.jpg",
  },
  {
    title: "UFC 5",
    description:
      "Смешанные единоборства.",
    trailerUrl: "#",
    imageUrl:
      "https://i.ytimg.com/vi/ZDwdRGJ_AAQ/maxresdefault.jpg",
  },
  {
    title: "Forza Horizon 5",
    description:
      "Аркадные гонки.",
    trailerUrl: "#",
    imageUrl:
      "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1551360/header.jpg",
  },
  {
    title: "Injustice 2",
    description:
      "Файтинг с супергероями.",
    trailerUrl: "#",
    imageUrl:
      "https://assets.altarofgaming.com/wp-content/uploads/2020/04/character-selection-screen-injustice-2.jpg",
  },
  {
    title: "A Way Out",
    description:
      "Сюжетная игра на двоих.",
    trailerUrl: "#",
    imageUrl:
      "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1222700/header.jpg",
  },
  {
    title:
      "Red Dead Redemption 2",
    description:
      "Приключение на Диком Западе.",
    trailerUrl: "#",
    imageUrl:
      "https://gaming-cdn.com/images/products/5679/orig/red-dead-redemption-2-pc-game-rockstar-cover.jpg",
  },
  {
    title: "Cyberpunk 2077",
    description:
      "Приключение в городе будущего.",
    trailerUrl: "#",
    imageUrl:
      "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1091500/header.jpg",
  },
];

const simGames = [
  {
    title: "Assetto Corsa",
    description:
      "Реалистичная физика и трассы.",
    trailerUrl: "#",
    imageUrl:
      "https://i.ytimg.com/vi/l0Iga-UEN2w/hq720.jpg",
  },
  {
    title: "Forza Horizon 5",
    description:
      "Аркадные гонки с открытым миром.",
    trailerUrl: "#",
    imageUrl:
      "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1551360/header.jpg",
  },
  {
    title: "Forza Horizon 6",
    description:
      "Гонки по Японии: Токио, горные дороги и более 550 автомобилей.",
    trailerUrl:
      "https://www.xbox.com/en-US/games/forza-horizon-6",
    imageUrl:
      "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2483190/header.jpg",
  },
  {
    title: "Dirt Rally 2",
    description:
      "Ралли и бездорожье.",
    trailerUrl: "#",
    imageUrl:
      "https://delta-game.ru/wp-content/uploads/2019/02/DiRT-Rally-2.0_0002_4.png",
  },
  {
    title:
      "Euro Truck Simulator 2",
    description:
      "Симулятор дальнобойщика.",
    trailerUrl: "#",
    imageUrl:
      "https://www.eurotrucksimulator2.com/images/fb_image.jpg",
  },
];

const pcGames = [
  {
    title: "Counter-Strike 2",
    description:
      "Тактический командный шутер.",
    trailerUrl: "#",
    imageUrl:
      "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/730/header.jpg",
  },
  {
    title:
      "Call of Duty: Warzone",
    description:
      "Динамичная королевская битва.",
    trailerUrl: "#",
    imageUrl:
      "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1962663/header.jpg",
  },
  {
    title:
      "PUBG: BATTLEGROUNDS",
    description:
      "Королевская битва.",
    trailerUrl: "#",
    imageUrl:
      "https://cdn1.epicgames.com/spt-assets/53ec4985296b4facbe3a8d8d019afba9/pubg-battlegrounds-16v1j.jpg",
  },
  {
    title: "Dota 2",
    description:
      "Командная стратегия 5 на 5.",
    trailerUrl: "#",
    imageUrl:
      "https://cdn.fastly.steamstatic.com/steam/apps/570/header.jpg",
  },
  {
    title: "Apex Legends",
    description:
      "Командная королевская битва.",
    trailerUrl: "#",
    imageUrl:
      "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1172470/header.jpg",
  },
  {
    title: "Rust",
    description:
      "Выживание и строительство.",
    trailerUrl: "#",
    imageUrl:
      "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/252490/header.jpg",
  },
  {
    title: "Fortnite",
    description:
      "Battle Royale и другие режимы.",
    trailerUrl: "#",
    imageUrl:
      "https://i.ytimg.com/vi/adGdyCdvKz4/maxresdefault.jpg",
  },
  {
    title:
      "Arena Breakout: Infinite",
    description:
      "Тактический extraction-шутер.",
    trailerUrl: "#",
    imageUrl:
      "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2073620/header.jpg",
  },
  {
    title: "Minecraft",
    description:
      "Творчество и выживание.",
    trailerUrl: "#",
    imageUrl:
      "https://i.ytimg.com/vi_webp/ztNoBI0m_P0/maxresdefault.webp",
  },
  {
    title: "Rocket League",
    description:
      "Футбол на автомобилях.",
    trailerUrl: "#",
    imageUrl:
      "https://www.rocketleague.com/rr7/rl_evergreen-BuFUX3Ml.jpg",
  },
  {
    title: "World of Tanks",
    description:
      "Многопользовательские танковые бои.",
    trailerUrl: "#",
    imageUrl:
      "https://gaming-cdn.com/images/products/1943/orig/world-of-tanks-pc-mac-steam-cover.jpg",
  },
  {
    title: "VALORANT",
    description:
      "Тактический шутер 5 на 5.",
    trailerUrl: "#",
    imageUrl:
      "https://www.riotgames.com/darkroom/1440/8d5c497da1c2eeec8cffa99b01abc64b:5329ca773963a5b739e98e715957ab39/ps-f2p-val-console-launch-16x9.jpg",
  },
];

function createSections(
  currentVrGames
) {
  return [
    {
      key: "ps",
      title: "PlayStation",
      subtitle: "Игры на PS5",
      items: psGames,
      hasVrFilter: false,
    },
    {
      key: "vr",
      title: "VR",
      subtitle:
        "Игры на VR-шлемах",
      items: currentVrGames,
      hasVrFilter: true,
    },
    {
      key: "sim",
      title: "Автосимулятор",
      subtitle: "Гонки на руле",
      items: simGames,
      hasVrFilter: false,
    },
    {
      key: "pc",
      title: "ПК",
      subtitle:
        "Игры на игровых ПК",
      items: pcGames,
      hasVrFilter: false,
    },
  ];
}

/* =========================================================
   МАЛЕНЬКАЯ КАРТОЧКА
========================================================= */

function MiniCard({ item }) {
  const isRealLink =
    item.trailerUrl &&
    item.trailerUrl !== "#";

  return (
    <a
      className={styles.miniCard}
      href={
        isRealLink
          ? item.trailerUrl
          : undefined
      }
      target={
        isRealLink
          ? "_blank"
          : undefined
      }
      rel={
        isRealLink
          ? "noopener noreferrer"
          : undefined
      }
      title={item.title}
    >
      <div
        className={styles.miniImg}
      >
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.title}
            loading="lazy"
          />
        ) : (
          <div
            className={
              styles.imgPlaceholder
            }
          >
            🎮
          </div>
        )}
      </div>

      <div
        className={styles.miniInfo}
      >
        <div
          className={styles.miniTitle}
        >
          {item.title}
        </div>

        <div
          className={styles.miniDesc}
        >
          {item.description}
        </div>

        {item.ownership ===
          "horizon-plus" &&
          !item.installed && (
            <div
              style={
                BOOKING_NOTICE_STYLE
              }
            >
              Забронируйте заранее
            </div>
          )}
      </div>
    </a>
  );
}

/* =========================================================
   МОДАЛЬНОЕ ОКНО
========================================================= */

function Modal({
  open,
  title,
  onClose,
  children,
}) {
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener(
      "keydown",
      handleEscape
    );

    document.body.style.overflow =
      "hidden";

    return () => {
      document.removeEventListener(
        "keydown",
        handleEscape
      );

      document.body.style.overflow =
        "";
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      className={styles.backdrop}
      onMouseDown={onClose}
    >
      <div
        className={styles.modal}
        onMouseDown={(event) =>
          event.stopPropagation()
        }
        role="dialog"
        aria-modal="true"
      >
        <div
          className={
            styles.modalHeader
          }
        >
          <div
            className={
              styles.modalTitle
            }
          >
            {title}
          </div>

          <button
            className={styles.closeBtn}
            onClick={onClose}
            type="button"
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>

        <div
          className={styles.modalBody}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   ОСНОВНОЙ КОМПОНЕНТ
========================================================= */

export default function GamesCatalog() {
  const [openKey, setOpenKey] =
    useState(null);

  const [vrFilter, setVrFilter] =
    useState("Все");

  const [vrPlayers, setVrPlayers] =
    useState("Все");

  const [
    currentVrGames,
    setCurrentVrGames,
  ] = useState(LOCAL_VR_GAMES);

  useEffect(() => {
    const controller =
      new AbortController();

    async function updateVrCatalog() {
      try {
        const response = await fetch(
          VR_GAMES_API,
          {
            signal:
              controller.signal,

            headers: {
              Accept:
                "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error(
            `Ошибка API: ${response.status}`
          );
        }

        const payload =
          await response.json();

        const remoteGames =
          Array.isArray(payload)
            ? payload
            : payload.games;

        /*
         * Пустой ответ не принимаем,
         * чтобы каталог не очистился.
         */
        if (
          !Array.isArray(
            remoteGames
          ) ||
          remoteGames.length === 0
        ) {
          throw new Error(
            "API вернул пустой каталог"
          );
        }

        setCurrentVrGames(
          mergeVrCatalog(
            remoteGames
          )
        );
      } catch (error) {
        if (
          error.name !==
          "AbortError"
        ) {
          console.warn(
            "Не удалось обновить каталог Horizon+.",
            error
          );
        }
      }
    }

    updateVrCatalog();

    return () => {
      controller.abort();
    };
  }, []);

  const sections = useMemo(
    () =>
      createSections(
        currentVrGames
      ),
    [currentVrGames]
  );

  const activeSection = useMemo(
    () =>
      sections.find(
        (section) =>
          section.key === openKey
      ) || null,
    [sections, openKey]
  );

  const modalItems = useMemo(() => {
    if (!activeSection) {
      return [];
    }

    if (
      !activeSection.hasVrFilter
    ) {
      return activeSection.items;
    }

    let items = [
      ...activeSection.items,
    ];

    /*
     * Возрастной фильтр.
     */
    if (vrFilter !== "Все") {
      items = items.filter(
        (game) =>
          (
            game.ageCategories ||
            []
          ).includes(vrFilter)
      );
    }

    /*
     * Фильтр по количеству игроков.
     */
    if (vrPlayers !== "Все") {
      const requiredPlayers =
        vrPlayers === "2 игрока"
          ? 2
          : 4;

      items = items.filter(
        (game) => {
          /*
           * Если количество неизвестно,
           * игру показываем при любом
           * выбранном фильтре.
           */
          if (
            game.maxPlayers ===
              null ||
            game.maxPlayers ===
              undefined
          ) {
            return true;
          }

          return (
            game.maxPlayers >=
            requiredPlayers
          );
        }
      );
    }

    return items;
  }, [
    activeSection,
    vrFilter,
    vrPlayers,
  ]);

  function openModal(key) {
    setOpenKey(key);
    setVrFilter("Все");
    setVrPlayers("Все");
  }

  function closeModal() {
    setOpenKey(null);
  }

  return (
    <section className={styles.page}>
      <div className={styles.top}>
        <h2
          className={styles.pageTitle}
        >
          Каталог игр Neon Oasis
        </h2>

        <p
          className={
            styles.pageSubtitle
          }
        >
          PlayStation • VR •
          Автосимулятор • ПК
        </p>
      </div>

      <div
        className={styles.sections}
      >
        {sections.map(
          (section) => (
            <div
              key={section.key}
              className={
                styles.sectionCard
              }
            >
              <div
                className={
                  styles.sectionHead
                }
              >
                <div>
                  <div
                    className={
                      styles.sectionTitle
                    }
                  >
                    {section.title}
                  </div>

                  <div
                    className={
                      styles.sectionSub
                    }
                  >
                    {section.subtitle}
                  </div>
                </div>

                <button
                  className={
                    styles.moreBtn
                  }
                  onClick={() =>
                    openModal(
                      section.key
                    )
                  }
                  type="button"
                  title="Показать все"
                >
                  ⋯
                </button>
              </div>

              <div
                className={
                  styles.previewGrid
                }
              >
                {section.items
                  .slice(0, 4)
                  .map((item) => (
                    <MiniCard
                      key={
                        getMetaId(
                          item
                        ) ||
                        item.title
                      }
                      item={item}
                    />
                  ))}
              </div>
            </div>
          )
        )}
      </div>

      <Modal
        open={Boolean(activeSection)}
        title={
          activeSection
            ? `${activeSection.title} — все игры`
            : ""
        }
        onClose={closeModal}
      >
        {activeSection?.hasVrFilter && (
          <>
            <div
              className={
                styles.filters
              }
            >
              {VR_CATEGORIES.map(
                (category) => (
                  <button
                    key={category}
                    className={`${
                      styles.filterBtn
                    } ${
                      vrFilter ===
                      category
                        ? styles.active
                        : ""
                    }`}
                    onClick={() =>
                      setVrFilter(
                        category
                      )
                    }
                    type="button"
                  >
                    {category}
                  </button>
                )
              )}
            </div>

            <div
              className={
                styles.filters
              }
            >
              {VR_PLAYERS.map(
                (players) => (
                  <button
                    key={players}
                    className={`${
                      styles.filterBtn
                    } ${
                      vrPlayers ===
                      players
                        ? styles.active
                        : ""
                    }`}
                    onClick={() =>
                      setVrPlayers(
                        players
                      )
                    }
                    type="button"
                  >
                    {players}
                  </button>
                )
              )}
            </div>
          </>
        )}

        <div
          className={styles.modalGrid}
        >
          {modalItems.map((game) => (
            <div
              key={
                getMetaId(game) ||
                game.title
              }
              className={
                styles.modalCard
              }
            >
              <div
                className={
                  styles.modalImg
                }
              >
                {game.imageUrl ? (
                  <img
                    src={game.imageUrl}
                    alt={game.title}
                    loading="lazy"
                  />
                ) : (
                  <div
                    className={
                      styles.imgPlaceholderBig
                    }
                  >
                    🎮
                  </div>
                )}
              </div>

              <div
                className={
                  styles.modalInfo
                }
              >
                <div
                  className={
                    styles.modalGameTitle
                  }
                >
                  {game.title}
                </div>

                <div
                  className={
                    styles.modalDesc
                  }
                >
                  {game.description}
                </div>

                {game.ownership ===
                  "horizon-plus" &&
                  !game.installed && (
                    <div
                      style={
                        BOOKING_NOTICE_STYLE
                      }
                    >
                      Забронируйте заранее
                    </div>
                  )}

                {activeSection
                  ?.hasVrFilter && (
                  <div
                    className={
                      styles.modalMeta
                    }
                  >
                    <div>
                      Возраст:{" "}
                      {(
                        game.ageCategories ||
                        []
                      ).join(", ")}
                    </div>

                    {game.maxPlayers !==
                      null &&
                      game.maxPlayers !==
                        undefined && (
                        <div>
                          Игроков: до{" "}
                          {
                            game.maxPlayers
                          }
                        </div>
                      )}
                  </div>
                )}

                {game.trailerUrl &&
                  game.trailerUrl !==
                    "#" && (
                    <a
                      className={
                        styles.link
                      }
                      href={
                        game.trailerUrl
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Подробнее
                    </a>
                  )}
              </div>
            </div>
          ))}

          {modalItems.length === 0 && (
            <div>
              По выбранным фильтрам
              игры не найдены.
            </div>
          )}
        </div>
      </Modal>
    </section>
  );
}