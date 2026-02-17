// src/components/GamesCatalog.js
import React, { useMemo, useState } from "react";
import styles from "./GamesCatalog.module.css";

/* ===== ДАННЫЕ ===== */
const VR_CATEGORIES = ["Все", "Дети", "Подростки", "Взрослые"];

// Твои VR игры (перенёс как есть)
const vrGames = [
  {
    title: "Beat Saber",
    description:
      "VR-ритм-игра, где вы разрезаете летящие блоки в такт тщательно подобранной музыки.",
    trailerUrl: "https://www.meta.com/en-gb/experiences/quest/2448060205267927/",
    ageCategories: ["Дети", "Подростки", "Взрослые"],
    imageUrl:
      "https://roadtovrlive-5ea0.kxcdn.com/wp-content/uploads/2019/02/beat-saber-5.jpg",
  },
  {
    title: "Arizona Sunshine 2",
    description:
      "Сиквел зомби-апокалипсиса с еще более эффектными боями и реалистичным оружием в пустыне Аризоны.",
    trailerUrl:
      "https://www.meta.com/en-gb/experiences/arizona-sunshine-2/5245041552210029/",
    ageCategories: ["Подростки", "Взрослые"],
    imageUrl:
      "https://www.nerealnoemesto.ru/netcat_files/multifile/367/76/Arizona_Sunshine_2_6.jpg",
  },
  {
    title: "FINAL FURY",
    description:
      "FINAL FURY — VR-файтинг, который меняет представление о выходе на ринг. Сразитесь с бойцами галактики — офлайн или по всему миру.",
    trailerUrl: "https://www.meta.com/en-gb/experiences/final-fury/5218982198148896/",
    ageCategories: ["Дети", "Подростки", "Взрослые"],
    imageUrl:
      "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1782760/415a64132c2b37ab37b86b06babb461f037471f0/capsule_616x353.jpg?t=1750196515",
  },
  {
    title: "Hunt Together",
    description:
      "Ощутите азарт охоты в режиме «Дуэль» 1 на 1 или «Прятки» 1 на 3.",
    trailerUrl: "https://www.meta.com/en-gb/experiences/hunt-together/4404934906269269/",
    ageCategories: ["Дети", "Подростки", "Взрослые"],
    imageUrl:
      "https://assets-prd.ignimgs.com/2023/12/06/hunttogether-thumb-1701881131396.jpg",
  },
  {
    title: "VR Horror Stories",
    description:
      "Пассивный хоррор-опыт, который переносит зрителей в тёмные, наводящие ужас места.",
    trailerUrl: "https://www.meta.com/en-gb/experiences/vr-horror-stories/8049435668460032/",
    ageCategories: ["Подростки", "Взрослые"],
    imageUrl:
      "https://preview.redd.it/were-working-on-the-next-horror-short-for-vr-horror-stories-v0-s8skqii4wtre1.jpeg?auto=webp&s=0a60cff7645c5fde070d6cc6e8336aa69215a65e",
  },
  {
    title: "DAVID",
    description:
      "После долгой войны вы оказываетесь в одиночестве и теряетесь в космосе. Оставайтесь в живых.",
    trailerUrl: "https://www.meta.com/en-gb/experiences/david/3891771757540892/",
    ageCategories: ["Дети", "Подростки"],
    imageUrl: "https://i.ytimg.com/vi/xp_S63ZkctA/maxresdefault.jpg",
  },
  {
    title: "Metro Awakening",
    description: "Погружение в постапокалиптический мир метро с кинематографичным сюжетом.",
    trailerUrl: "https://www.meta.com/experiences/metro-awakening/5096918017089406/",
    ageCategories: ["Подростки", "Взрослые"],
    imageUrl: "https://gagadget.com/media/post_big/metro_smm.png",
  },
  {
    title: "Aim XR",
    description: "Тренировка меткости с различным оружием в режиме повышенной реальности.",
    trailerUrl: "https://www.meta.com/experiences/quest/4245506092131005/",
    ageCategories: ["Подростки", "Взрослые"],
    imageUrl: "https://i.ytimg.com/vi/pBcU5w34nH0/maxresdefault.jpg",
  },
  {
    title: "Creed: Rise to Glory Championship",
    description: "Боксерский симулятор по мотивам фильма «Крид», полноконтактные поединки.",
    trailerUrl:
      "https://www.meta.com/experiences/creed-rise-to-glory-championship-edition/2366245336750543/",
    ageCategories: ["Подростки", "Взрослые"],
    imageUrl: "https://survios.com/creed/wp-content/themes/creed/assets/img/screenshots/10.jpg",
  },
  {
    title: "Into Black",
    description: "Боевой экшен с исследованием таинственной инопланетной планеты.",
    trailerUrl: "https://www.meta.com/experiences/into-black/5289374691122516/",
    ageCategories: ["Подростки", "Взрослые"],
    imageUrl: "https://holographica.space/wp-content/uploads/2024/09/39035308_2327028967637549_3896354194298482574_n.jpg",
  },
  {
    title: "Home Sports",
    description: "Домашние тренировки: теннис, бокс и другие виды спорта в VR.",
    trailerUrl: "https://www.meta.com/experiences/home-sports/8975028309180826/",
    ageCategories: ["Дети", "Подростки"],
    imageUrl:
      "https://images.squarespace-cdn.com/content/v1/61813b3361b99650be1a2c4c/e56502a1-8d39-4772-8ddd-a39917055500/homesports_trailscreenshot1.jpeg",
  },
  {
    title: "Garden of the Sea",
    description: "Увлекательный квест в морском саду с головоломками для всей семьи.",
    trailerUrl: "https://www.meta.com/experiences/garden-of-the-sea/3684804704932159/",
    ageCategories: ["Дети", "Подростки"],
    imageUrl:
      "https://image.api.playstation.com/vulcan/ap/rnd/202302/2415/9a00ab354fc172e94baaa108ac20d43ad51e84c22f9d3b8c.png",
  },
  {
    title: "Titans Clinic",
    description: "Симулятор хирурга с реалистичной хирургической механикой.",
    trailerUrl: "https://www.meta.com/experiences/titans-clinic/6035422123217068/",
    ageCategories: ["Подростки", "Взрослые"],
    imageUrl:
      "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2596030/capsule_616x353.jpg?t=1744367023",
  },
  {
    title: "Swordsman",
    description: "Дуэли на мечах с физикой реального клинка.",
    trailerUrl: "https://www.meta.com/experiences/swordsman/4478419005520485/",
    ageCategories: ["Подростки", "Взрослые"],
    imageUrl: "https://roadtovrlive-5ea0.kxcdn.com/wp-content/uploads/2021/10/swordsman-1.jpg",
  },
  {
    title: "Hoopzter Basketball",
    description: "Аркадный баскетбол в виртуальной реальности.",
    trailerUrl: "https://www.meta.com/experiences/hoopzter-basketball/6051606724925903/",
    ageCategories: ["Дети", "Подростки"],
    imageUrl:
      "https://i.ytimg.com/vi/fgwHOeIrKj0/maxresdefault.jpg",
  },
  {
    title: "Horror Simulator",
    description: "Интенсивный хоррор для любителей пощекотать нервы.",
    trailerUrl: "https://www.meta.com/experiences/horror-simulator/6847023095354894/",
    ageCategories: ["Подростки", "Взрослые"],
    imageUrl:
      "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3063780/7297b7be4a07169d675a2f784bdefcfbc6683982/ss_7297b7be4a07169d675a2f784bdefcfbc6683982.1920x1080.jpg?t=1748329247",
  },
  {
    title: "Red Matter",
    description: "Научно-фантастический квест на заброшенной космической станции.",
    trailerUrl: "https://www.meta.com/experiences/red-matter/2180753588712484/",
    ageCategories: ["Подростки", "Взрослые"],
    imageUrl: "https://gamingtrend.com/content/images/size/w1200/2025/02/untitled-1-11.jpg",
  },
  {
    title: "The Climb 2",
    description: "Реалистичное скалолазание в живописных локациях.",
    trailerUrl: "https://www.meta.com/experiences/the-climb-2/2617233878395214/",
    ageCategories: ["Подростки", "Взрослые"],
    imageUrl:
      "https://sm.mashable.com/mashable_sea/fun/t/the-climb-/the-climb-2-is-a-thrilling-vr-free-solo-adventure-that-doubl_493s.jpg",
  },
  {
    title: "SuperHot",
    description: "Тактический шутер, где время движется только тогда, когда вы двигаетесь.",
    trailerUrl: "https://www.meta.com/experiences/superhot-vr/1921533091289407/",
    ageCategories: ["Подростки", "Взрослые"],
    imageUrl: "https://m.media-amazon.com/images/I/81VPGYDoWxL.jpg",
  },
  {
    title: "First Encounters",
    description: "Обучающий платформер для знакомства с VR-миром для самых маленьких.",
    trailerUrl: "https://www.meta.com/experiences/first-encounters/6236169136472090/",
    ageCategories: ["Дети"],
    imageUrl:
      "https://d2z8nyy70yf33i.cloudfront.net/wp-content/uploads/encounters-2-950x534.jpg",
  },
  {
    title: "Batman: Arkham Shadow",
    description: "Окунитесь в мир Бэтмена, патрулируйте Готэм и боритесь с преступностью.",
    trailerUrl: "https://www.meta.com/experiences/batman-arkham-shadow/3551691271620960/",
    ageCategories: ["Подростки", "Взрослые"],
    imageUrl: "https://ixbt.online/gametech/covers/2024/09/27/nova-filepond-OiXHYt.jpg",
  },
  {
    title: "Elements Divided",
    description: "Станьте воином стихий (огонь, вода, земля, воздух).",
    trailerUrl: "https://www.meta.com/experiences/elements-divided/9471144046261462/",
    ageCategories: ["Подростки", "Взрослые"],
    imageUrl: "https://mixed-news.com/en/wp-content/uploads/2025/03/Elements-Divided-1200x675.jpg",
  },
  {
    title: "Walkabout Mini Golf",
    description: "Мини-гольф на фантастических полях и развлечения для всей семьи.",
    trailerUrl: "https://www.meta.com/experiences/walkabout-mini-golf/2462678267173943/",
    ageCategories: ["Дети", "Подростки", "Взрослые"],
    imageUrl:
      "https://media.licdn.com/dms/image/v2/D5612AQHqX6jVNopu7A/article-cover_image-shrink_720_1280/article-cover_image-shrink_720_1280/0/1691498301306?e=2147483647&v=beta&t=Tsk6c5LgD7kQ-nuU2T0AhH_MhUZh59KQPqqYqPHNSKs",
  },
  {
    title: "Pavlov Shack",
    description: "Тактический шутер с мультиплеером в стиле Counter-Strike.",
    trailerUrl: "https://www.meta.com/experiences/pavlov-shack/2443267419018232/",
    ageCategories: ["Подростки", "Взрослые"],
    imageUrl: "https://static.tildacdn.com/tild6265-3565-4633-b830-393334633866/Pavlov_VR_1.jpg",
  },
  {
    title: "Vacation Simulator",
    description: "Веселый симулятор отпуска с мини-играми на тропическом острове.",
    trailerUrl: "https://www.meta.com/experiences/vacation-simulator/2393300320759737/",
    ageCategories: ["Дети", "Подростки"],
    imageUrl: "https://www.uploadvr.com/content/images/size/w1200/2019/04/Vacation-Simulator-Review-1.jpg",
  },
  {
    title: "Epic Roller Coasters",
    description: "Американские горки с реалистичными эффектами и головокружительными трассами.",
    trailerUrl: "https://www.meta.com/experiences/epic-roller-coasters/2299465166734471/",
    ageCategories: ["Дети", "Подростки"],
    imageUrl: "https://i.ytimg.com/vi/XLoIbN6TOYk/maxresdefault.jpg",
  },
  {
    title: "Angry Birds VR: Isle of Pigs",
    description: "Популярные птицы в VR — метайте птичек по свиньям-строителям.",
    trailerUrl: "https://www.meta.com/experiences/angry-birds-vr-isle-of-pigs/2718606324833775/",
    ageCategories: ["Дети", "Подростки"],
    imageUrl: "https://i.pcmag.com/imagery/reviews/02XsybD1jnhw085sdmcvWTd-1..v1696524785.jpg",
  },
  {
    title: "Premium Bowling",
    description: "Боулинг в потрясающей VR-арене с реалистичной физикой кеглей.",
    trailerUrl: "https://www.meta.com/experiences/premium-bowling/2773034772778845/",
    ageCategories: ["Дети", "Подростки", "Взрослые"],
    imageUrl: "https://img.gg.deals/9f/44/e9e56f122fdbb0b168c70cb62661991c272b_1920xt1080_S1000.jpg",
  },
  {
    title: "Dungeons of Eternity",
    description: "Ролевая игра с тактическими боями и эпическими подземельями.",
    trailerUrl: "https://www.meta.com/experiences/dungeons-of-eternity/6341779295861881/",
    ageCategories: ["Подростки", "Взрослые"],
    imageUrl:
      "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3189340/ss_6cb8780485d4b48dd38cfc4ba31dc1c9020a9277.1920x1080.jpg?t=1749850512",
  },
  {
    title: "Cook-Out",
    description: "Совместное приготовление блюд в хаотичной кухни-симуляции.",
    trailerUrl: "https://www.meta.com/experiences/cook-out/2004774962957063/",
    ageCategories: ["Дети", "Подростки", "Взрослые"],
    imageUrl:
      "https://a2.storyblok.com/f/163663/1920x1080/39e6a9fc6a/cook-out-lead.png/m/1920x0/filters:quality(90):format(webp)",
  },
  {
    title: "Blaston",
    description: "Аркадный дуэльный шутер на аренах футуристического мира.",
    trailerUrl: "https://www.meta.com/en-gb/experiences/blaston/2307085352735834/",
    ageCategories: ["Дети", "Подростки", "Взрослые"],
    imageUrl:
      "https://images.squarespace-cdn.com/content/v1/61813b3361b99650be1a2c4c/e7178309-129f-4b2f-95bf-6df922a80b7c/Copy%2Bof%2Bscreenshot_swarm.jpeg",
  },
  {
    title: "Car Parking Simulator",
    description: "Симулятор парковки с реалистичными автомобилями и задачами.",
    trailerUrl:
      "https://www.meta.com/en-gb/experiences/car-parking-simulator-driving-and-racing/3890415587677522/",
    ageCategories: ["Дети", "Подростки", "Взрослые"],
    imageUrl:
      "https://i.ytimg.com/vi/4yuGraJbERI/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLAo3hrZi5FzaGLJGYO2Rs17jzjR2A",
  },
  {
    title: "Elven Assassin",
    description: "Фэнтезийный экшен от первого лица с луком и магией.",
    trailerUrl: "https://www.meta.com/en-gb/experiences/elven-assassin/2325731427501921/",
    ageCategories: ["Подростки", "Взрослые"],
    imageUrl:
      "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/503770/ss_01f7c4ef499f45d9ce879b90fc748341ee6d2092.1920x1080.jpg?t=1737032857",
  },
  {
    title: "Deisim",
    description: "Симулятор бога: создавайте мир и наблюдайте за его обитателями.",
    trailerUrl: "https://www.meta.com/en-gb/experiences/deisim/3526702020710931/",
    ageCategories: ["Дети", "Подростки"],
    imageUrl: "https://www.deisim.com/images/Screen-03.png",
  },
  {
    title: "Escape Simulator",
    description: "Реалистичные квест-комнаты с головоломками.",
    trailerUrl: "https://www.meta.com/en-gb/experiences/escape-free/24467240542922395/",
    ageCategories: ["Подростки", "Взрослые"],
    imageUrl: "https://roadtovrlive-5ea0.kxcdn.com/wp-content/uploads/2023/06/escape-sim-vr.jpg",
  },
  {
    title: "Thief Simulator",
    description: "Проникновения и кражи в открытом мире с элементами стелса.",
    trailerUrl:
      "https://www.meta.com/en-gb/experiences/thief-simulator-vr-greenview-street/3395626290543887/",
    ageCategories: ["Подростки", "Взрослые"],
    imageUrl:
      "https://fanatical.imgix.net/product/original/ba5ea90b-e0cc-4f7b-a8b9-b54741a45900.jpeg?auto=compress,format&w=870&fit=crop&h=489",
  },
  {
    title: "Ocean Rift",
    description: "Подводная экспедиция среди морских обитателей.",
    trailerUrl: "https://www.meta.com/en-gb/experiences/ocean-rift/2134272053250863/",
    ageCategories: ["Дети"],
    imageUrl:
      "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjU5O6CGkTuc9wvUmHeRU_7ZAUGvT4KfY_THHekZGKqbCgvTnWGfYl_xLcnH80DnAQViP2vYjTFc21egdULdVi9lOo1EWyrTUd20m4GAbiEXi1REVmDmrTx8PZF_UuZZrEdZJQds7prgRU/s1600/Ocean+Rift+4.jpg",
  },
  {
    title: "CleanSheet Soccer",
    description: "Настольный футбол в VR с управлением движениями.",
    trailerUrl: "https://www.meta.com/en-gb/experiences/cleansheet-soccer/5005632286166834/",
    ageCategories: ["Дети", "Подростки"],
    imageUrl:
      "https://d16qp92u5x17m8.cloudfront.net/757.jpegl2ck1710120853.jpeg?quality=80&type=jpg&width=1920",
  },
  {
    title: "Sweet Surrender",
    description:
      "Динамичный шутер-рогалик в антиутопической мегабашне — адаптация под каждый забег.",
    trailerUrl: "https://www.meta.com/en-gb/experiences/sweet-surrender/4723352327707414/",
    ageCategories: ["Подростки", "Взрослые"],
    imageUrl:
      "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/638130/ss_b71f1fca91a684f6ba9e7b99ffc5b577d40d2aca.1920x1080.jpg?t=1730896980",
  },
];

// Заглушки для остальных разделов (замени на свои игры)
const psGames = [
  { title: "EA FC 26", description: "Футбол на PS5.", trailerUrl: "#", imageUrl: "https://i.ytimg.com/vi/EbrAfuBn_2w/maxresdefault.jpg" },
  { title: "Mortal Kombat 1", description: "Файтинг на PS5.", trailerUrl: "#", imageUrl: "https://i.ytimg.com/vi/M-V5Wxc-D5E/maxresdefault.jpg" },
  { title: "GTA V", description: "Открытый мир на PS.", trailerUrl: "#", imageUrl: "https://img.gta5-mods.com/q95/images/save-game-44/a82937-v_trunk_1920x1080.jpg" },
  { title: "UFC 5", description: "Смешанные единоборства.", trailerUrl: "#", imageUrl: "https://i.ytimg.com/vi/ZDwdRGJ_AAQ/maxresdefault.jpg" },
  { title: "Forza Horizon 5", description: "Гонки на PS5.", trailerUrl: "#", imageUrl: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1551360/header.jpg?t=1746471508" },
  { title: "Injustice 2", description: "Файтинг на PS5.", trailerUrl: "#", imageUrl: "https://assets.altarofgaming.com/wp-content/uploads/2020/04/character-selection-screen-injustice-2.jpg" },
  { title: "A Way Out", description: "Игра на двоих на PS5.", trailerUrl: "#", imageUrl: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1222700/ss_a7f52388d8d64bf56170baf5bd223fbbb1d9a94a.1920x1080.jpg?t=1730912036" },
  { title: "Red Dead Redemption 2", description: "Сюжетная игра на PS5.", trailerUrl: "#", imageUrl: "https://gaming-cdn.com/images/products/5679/orig/red-dead-redemption-2-pc-game-rockstar-cover.jpg?v=1713793245" },
  { title: "Cyberpunk 2077", description: "Сюжетная игра на PS5.", trailerUrl: "#", imageUrl: "https://static0.polygonimages.com/wordpress/wp-content/uploads/chorus/uploads/chorus_asset/file/22150614/ss_ae4465fa8a44dd330dbeb7992ba196c2f32cabb1.jpg" },
  
];

const simGames = [
  { title: "Assetto Corsa", description: "Реалистичная физика и трассы.", trailerUrl: "#", imageUrl: "https://i.ytimg.com/vi/l0Iga-UEN2w/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLBO7lGuwBT_OdXZz1J7YabZYtswQg" },
  { title: "Forza Horizon 5", description: "Аркадные гонки.", trailerUrl: "#", imageUrl: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1551360/header.jpg?t=1746471508" },
  { title: "Dirt Rally 2", description: "Ралли и бездорожье.", trailerUrl: "#", imageUrl: "https://delta-game.ru/wp-content/uploads/2019/02/DiRT-Rally-2.0_0002_4.png" },
  { title: "Euro Truck Simulator 2", description: "Симулятор дальнобойщика.", trailerUrl: "#", imageUrl: "https://www.eurotrucksimulator2.com/images/fb_image.jpg" },
];

const pcGames = [
  { title: "Counter-Strike 2", description: "Тактический шутер 5v5 на ПК.", trailerUrl: "#", imageUrl: "https://img.championat.com/news/big/l/h/crednij-onlajn-counter-strike-2-prevysil-900-tysyach-igrokov-vpervye-s-momenta-reliza_17146716661734489171.jpg" },
  { title: "Call of Duty: Warzone", description: "Королевская битва / extraction-сражения, динамичный шутер.", trailerUrl: "#", imageUrl: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1962663/54bd6a40eb3759aca46966aadd4c4d0d84b2713e/header.jpg?t=1770663938" },
  { title: "PUBG: BATTLEGROUNDS", description: "Королевская битва с реалистичной стрельбой.", trailerUrl: "#", imageUrl: "https://cdn1.epicgames.com/spt-assets/53ec4985296b4facbe3a8d8d019afba9/pubg-battlegrounds-16v1j.jpg" },
  { title: "Dota 2", description: "MOBA 5v5, командная стратегия и прокачка героев.", trailerUrl: "#", imageUrl: "https://cdn.fastly.steamstatic.com/steam/apps/570/header.jpg" },
  { title: "Apex Legends", description: "Командный баттл-рояль с героями и способностями.", trailerUrl: "#", imageUrl: "https://image.api.playstation.com/vulcan/ap/rnd/202510/3021/ffe1cbaa9ebc18b14b4726d3fa568e3460034080f097eafd.jpg" },
  { title: "Rust", description: "Выживание, строительство базы и PvP в открытом мире.", trailerUrl: "#", imageUrl: "https://hone.gg/blog/wp-content/uploads/2025/05/rust-banner_1rust-banner.webp" },
  { title: "Fortnite", description: "Battle Royale + режимы с постройкой и без.", trailerUrl: "#", imageUrl: "https://i.ytimg.com/vi/adGdyCdvKz4/maxresdefault.jpg" },
  { title: "Arena Breakout: Infinite", description: "Тактический extraction-шутер с лутом и эвакуацией.", trailerUrl: "#", imageUrl: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2073620/ac7dac1d370e242fc66801dd39441fd68a8ab001/capsule_616x353.jpg?t=1768449900" },
  { title: "Minecraft", description: "Песочница: выживание, строительство, креатив.", trailerUrl: "#", imageUrl: "https://i.ytimg.com/vi_webp/ztNoBI0m_P0/maxresdefault.webp" },
  { title: "Rocket League", description: "Футбол на машинах: быстрые матчи 2v2/3v3.", trailerUrl: "#", imageUrl: "https://www.rocketleague.com/rr7/rl_evergreen-BuFUX3Ml.jpg" },
  { title: "World of Tanks", description: "Танковые бои 15v15 с прокачкой техники.", trailerUrl: "#", imageUrl: "https://gaming-cdn.com/images/products/1943/orig/world-of-tanks-pc-mac-steam-cover.jpg?v=1756115288" },
  { title: "VALORANT", description: "Тактический шутер 5v5 с агентами и умениями.", trailerUrl: "#", imageUrl: "https://www.riotgames.com/darkroom/1440/8d5c497da1c2eeec8cffa99b01abc64b:5329ca773963a5b739e98e715957ab39/ps-f2p-val-console-launch-16x9.jpg" },
];


const SECTIONS = [
  { key: "ps", title: "PlayStation", subtitle: "Игры на PS5", items: psGames, hasVrFilter: false },
  { key: "vr", title: "VR", subtitle: "Игры на VR-шлемах", items: vrGames, hasVrFilter: true },
  { key: "sim", title: "Автосимулятор", subtitle: "Гонки на руле", items: simGames, hasVrFilter: false },
  { key: "pc", title: "ПК", subtitle: "Игры на игровых ПК", items: pcGames, hasVrFilter: false },
];

/* ===== UI: маленькая карточка ===== */
function MiniCard({ item }) {
  return (
    <a
      className={styles.miniCard}
      href={item.trailerUrl || "#"}
      target={item.trailerUrl && item.trailerUrl !== "#" ? "_blank" : undefined}
      rel={item.trailerUrl && item.trailerUrl !== "#" ? "noopener noreferrer" : undefined}
      title={item.title}
    >
      <div className={styles.miniImg} aria-hidden="true">
        {item.imageUrl ? <img src={item.imageUrl} alt={item.title} /> : <div className={styles.imgPlaceholder}>🎮</div>}
      </div>
      <div className={styles.miniInfo}>
        <div className={styles.miniTitle}>{item.title}</div>
        <div className={styles.miniDesc}>{item.description}</div>
      </div>
    </a>
  );
}

/* ===== UI: модалка ===== */
function Modal({ open, title, onClose, children }) {
  if (!open) return null;

  return (
    <div className={styles.backdrop} onMouseDown={onClose}>
      <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>{title}</div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Закрыть">
            ✕
          </button>
        </div>
        <div className={styles.modalBody}>{children}</div>
      </div>
    </div>
  );
}

/* ===== ОСНОВНОЙ КОМПОНЕНТ ===== */
export default function GamesCatalog() {
  const [openKey, setOpenKey] = useState(null); // какой раздел открыт в модалке
  const [vrFilter, setVrFilter] = useState("Все");

  const activeSection = useMemo(
    () => SECTIONS.find((s) => s.key === openKey) || null,
    [openKey]
  );

  const modalItems = useMemo(() => {
    if (!activeSection) return [];
    if (!activeSection.hasVrFilter) return activeSection.items;

    if (vrFilter === "Все") return activeSection.items;
    return activeSection.items.filter((g) => (g.ageCategories || []).includes(vrFilter));
  }, [activeSection, vrFilter]);

  const openModal = (key) => {
    setOpenKey(key);
    setVrFilter("Все");
  };

  return (
    <section className={styles.page}>
      <div className={styles.top}>
        <h2 className={styles.pageTitle}>Каталог игр Neon Oasis</h2>
        <p className={styles.pageSubtitle}>
          Разделы: PlayStation • VR • Автосимулятор • ПК
        </p>
      </div>

      {/* Оглавление */}
      

      {/* Превью-секции: 4 игры и кнопка "⋯" */}
      <div className={styles.sections}>
        {SECTIONS.map((s) => (
          <div key={s.key} className={styles.sectionCard}>
            <div className={styles.sectionHead}>
              <div>
                <div className={styles.sectionTitle}>{s.title}</div>
                <div className={styles.sectionSub}>{s.subtitle}</div>
              </div>

              <button className={styles.moreBtn} onClick={() => openModal(s.key)} title="Показать все">
                ⋯
              </button>
            </div>

            <div className={styles.previewGrid}>
              {s.items.slice(0, 4).map((item) => (
                <MiniCard key={item.title} item={item} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* МОДАЛКА со списком */}
      <Modal
        open={!!activeSection}
        title={activeSection ? `${activeSection.title} — все игры` : ""}
        onClose={() => setOpenKey(null)}
      >
        {/* Фильтр только для VR */}
        {activeSection?.hasVrFilter && (
          <div className={styles.filters}>
            {VR_CATEGORIES.map((cat) => (
              <button
                key={cat}
                className={`${styles.filterBtn} ${vrFilter === cat ? styles.active : ""}`}
                onClick={() => setVrFilter(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        <div className={styles.modalGrid}>
          {modalItems.map((game) => (
            <div key={game.title} className={styles.modalCard}>
              <div className={styles.modalImg}>
                {game.imageUrl ? (
                  <img src={game.imageUrl} alt={game.title} />
                ) : (
                  <div className={styles.imgPlaceholderBig}>🎮</div>
                )}
              </div>
              <div className={styles.modalInfo}>
                <div className={styles.modalGameTitle}>{game.title}</div>
                <div className={styles.modalDesc}>{game.description}</div>

                {activeSection?.hasVrFilter && (
                  <div className={styles.modalMeta}>
                    Возраст: {(game.ageCategories || []).join(", ")}
                  </div>
                )}

                {game.trailerUrl && game.trailerUrl !== "#" && (
                  <a
                    className={styles.link}
                    href={game.trailerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Подробнее
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </section>
  );
}
