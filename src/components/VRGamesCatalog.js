// === VRGamesCatalog.js ===
import React, { useState } from 'react';
import styles from './VRGamesCatalog.module.css';

// Категории фильтрации
const categories = ['Все', 'Дети', 'Подростки', 'Взрослые'];

// Список VR-игр с возможностью нескольких возрастных категорий
const games = [
    {
        title: 'Beat Saber',
        description: 'VR-ритм-игра, где вы разрезаете летящие блоки в такт тщательно подобранной музыки.',
        trailerUrl: 'https://www.meta.com/en-gb/experiences/quest/2448060205267927/',
        ageCategories: ['Дети','Подростки','Взрослые'],
        imageUrl: 'https://roadtovrlive-5ea0.kxcdn.com/wp-content/uploads/2019/02/beat-saber-5.jpg',
      },
    {
      title: 'Arizona Sunshine 2',
      description: 'Сиквел зомби-апокалипсиса с еще более эффектными боями и реалистичным оружием в пустыне Аризоны.',
      trailerUrl: 'https://www.meta.com/en-gb/experiences/arizona-sunshine-2/5245041552210029/',
      ageCategories: ['Подростки', 'Взрослые'],
      imageUrl : 'https://www.nerealnoemesto.ru/netcat_files/multifile/367/76/Arizona_Sunshine_2_6.jpg',
    },
    {
          title: 'FINAL FURY',
          description: ' FINAL FURY — VR-файтинг, который меняет представление о выходе на ринг. Сразитесь с самыми свирепыми бойцами галактики — офлайн или по всему миру.',
          trailerUrl: 'https://www.meta.com/en-gb/experiences/final-fury/5218982198148896/',
          ageCategories: ['Дети','Подростки','Взрослые'],
          imageUrl: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1782760/415a64132c2b37ab37b86b06babb461f037471f0/capsule_616x353.jpg?t=1750196515',
        },
      {
        title: 'Hunt Together',
        description: 'Ощутите азарт охоты в режиме «Дуэль» 1 на 1 или «Прятки» 1 на 3, который проверит ваш ум, проницательность и отвагу на пределе возможностей. ',
        trailerUrl: 'https://www.meta.com/en-gb/experiences/hunt-together/4404934906269269/',
        ageCategories: ['Дети','Подростки', 'Взрослые'],
        imageUrl : 'https://assets-prd.ignimgs.com/2023/12/06/hunttogether-thumb-1701881131396.jpg',
      },
      {
        title: 'VR Horror Stories',
        description: 'VR Horror Stories» — это пассивный хоррор-опыт, который переносит зрителей в тёмные, наводящие ужас места, где вокруг вас таятся ужасающие монстры, зомби, призраки или демоны.',
        trailerUrl: 'https://www.meta.com/en-gb/experiences/vr-horror-stories/8049435668460032/',
        ageCategories: ['Подростки','Взрослые'],
        imageUrl: 'https://preview.redd.it/were-working-on-the-next-horror-short-for-vr-horror-stories-v0-s8skqii4wtre1.jpeg?auto=webp&s=0a60cff7645c5fde070d6cc6e8336aa69215a65e',
      },
    {
      title: 'DAVID',
      description: 'После долгой и безнадежной войны вы оказываетесь в одиночестве и теряетесь в космосе. Оставайтесь в живых и попытайтесь найти свой последний шанс на выживание.',
      trailerUrl: 'https://www.meta.com/en-gb/experiences/david/3891771757540892/',
      ageCategories: ['Дети','Подростки'],
      imageUrl : 'https://i.ytimg.com/vi/xp_S63ZkctA/maxresdefault.jpg',
    },
    {
      title: 'Metro Awakening',
      description: 'Погружение в постапокалиптический мир метро с кинематографичным сюжетом.',
      trailerUrl: 'https://www.meta.com/experiences/metro-awakening/5096918017089406/',
      ageCategories: ['Подростки', 'Взрослые'],
      imageUrl : 'https://gagadget.com/media/post_big/metro_smm.png',
    },
    {
      title: 'Aim XR',
      description: 'Тренировка меткости с различным оружием в режиме повышенной реальности.',
      trailerUrl: 'https://www.meta.com/experiences/quest/4245506092131005/',
      ageCategories: ['Подростки', 'Взрослые'],
      imageUrl : 'https://i.ytimg.com/vi/pBcU5w34nH0/maxresdefault.jpg',
    },
    {
      title: 'Creed: Rise to Glory Championship',
      description: 'Боксерский симулятор по мотивам фильма «Крид», полноконтактные поединки.',
      trailerUrl: 'https://www.meta.com/experiences/creed-rise-to-glory-championship-edition/2366245336750543/',
      ageCategories: ['Подростки', 'Взрослые'],
      imageUrl : 'https://survios.com/creed/wp-content/themes/creed/assets/img/screenshots/10.jpg',
    },
    {
      title: 'Into Black',
      description: 'Боевой экшен с исследованием таинственной инопланетной планеты.',
      trailerUrl: 'https://www.meta.com/experiences/into-black/5289374691122516/',
      ageCategories: ['Подростки', 'Взрослые'],
      imageUrl : 'https://holographica.space/wp-content/uploads/2024/09/39035308_2327028967637549_3896354194298482574_n.jpg',
    },
    {
      title: 'Home Sports',
      description: 'Домашние тренировки: теннис, бокс и другие виды спорта в VR.',
      trailerUrl: 'https://www.meta.com/experiences/home-sports/8975028309180826/',
      ageCategories: ['Дети', 'Подростки'],
      imageUrl : 'https://images.squarespace-cdn.com/content/v1/61813b3361b99650be1a2c4c/e56502a1-8d39-4772-8ddd-a39917055500/homesports_trailscreenshot1.jpeg',
    },
    {
      title: 'Garden of the Sea',
      description: 'Увлекательный квест в морском саду с головоломками для всей семьи.',
      trailerUrl: 'https://www.meta.com/experiences/garden-of-the-sea/3684804704932159/',
      ageCategories: ['Дети', 'Подростки'],
      imageUrl : 'https://image.api.playstation.com/vulcan/ap/rnd/202302/2415/9a00ab354fc172e94baaa108ac20d43ad51e84c22f9d3b8c.png',
    },
    {
      title: 'Titans Clinic',
      description: 'Симулятор хирурга с реалистичной хирургической механикой.',
      trailerUrl: 'https://www.meta.com/experiences/titans-clinic/6035422123217068/',
      ageCategories: ['Подростки', 'Взрослые'],
      imageUrl : 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2596030/capsule_616x353.jpg?t=1744367023',
    },
    {
      title: 'Swordsman',
      description: 'Дуэли на мечах с физикой реального клинка.',
      trailerUrl: 'https://www.meta.com/experiences/swordsman/4478419005520485/',
      ageCategories: ['Подростки', 'Взрослые'],
      imageUrl : 'https://roadtovrlive-5ea0.kxcdn.com/wp-content/uploads/2021/10/swordsman-1.jpg',
    },
    {
      title: 'Hoopzter Basketball',
      description: 'Аркадный баскетбол в виртуальной реальности.',
      trailerUrl: 'https://www.meta.com/experiences/hoopzter-basketball/6051606724925903/',
      ageCategories: ['Дети', 'Подростки'],
      imageUrl : 'https://cdn.altlabvr.com/22974.jpegs8j71710095295.jpeg?quality=80&type=jpg&width=1920',
    },
    {
      title: 'Horror Simulator',
      description: 'Интенсивный хоррор для любителей пощекотать нервы.',
      trailerUrl: 'https://www.meta.com/experiences/horror-simulator/6847023095354894/',
      ageCategories: ['Подростки', 'Взрослые'],
      imageUrl : 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3063780/7297b7be4a07169d675a2f784bdefcfbc6683982/ss_7297b7be4a07169d675a2f784bdefcfbc6683982.1920x1080.jpg?t=1748329247',
    },
    {
      title: 'Red Matter',
      description: 'Научно-фантастический квест на заброшенной космической станции.',
      trailerUrl: 'https://www.meta.com/experiences/red-matter/2180753588712484/',
      ageCategories: ['Подростки', 'Взрослые'],
      imageUrl : 'https://gamingtrend.com/content/images/size/w1200/2025/02/untitled-1-11.jpg',
    },
    {
      title: 'The Climb 2',
      description: 'Реалистичное скалолазание в живописных локациях.',
      trailerUrl: 'https://www.meta.com/experiences/the-climb-2/2617233878395214/',
      ageCategories: ['Подростки', 'Взрослые'],
      imageUrl : 'https://sm.mashable.com/mashable_sea/fun/t/the-climb-/the-climb-2-is-a-thrilling-vr-free-solo-adventure-that-doubl_493s.jpg',
    },
    {
      title: 'SuperHot',
      description: 'Тактический шутер, где время движется только тогда, когда вы двигаетесь.',
      trailerUrl: 'https://www.meta.com/experiences/superhot-vr/1921533091289407/',
      ageCategories: ['Подростки', 'Взрослые'],
      imageUrl : 'https://m.media-amazon.com/images/I/81VPGYDoWxL.jpg',
    },
    {
      title: 'First Encounters',
      description: 'Обучающий платформер для знакомства с VR-миром для самых маленьких.',
      trailerUrl: 'https://www.meta.com/experiences/first-encounters/6236169136472090/',
      ageCategories: ['Дети'],
      imageUrl : 'https://d2z8nyy70yf33i.cloudfront.net/wp-content/uploads/encounters-2-950x534.jpg',
    },
    {
      title: 'Batman: Arkham Shadow',
      description: 'Окунитесь в мир Бэтмена, патрулируйте Готэм и боритесь с преступностью.',
      trailerUrl: 'https://www.meta.com/experiences/batman-arkham-shadow/3551691271620960/',
      ageCategories: ['Подростки', 'Взрослые'],
      imageUrl : 'https://ixbt.online/gametech/covers/2024/09/27/nova-filepond-OiXHYt.jpg',
    },
    {
      title: 'Elements Divided',
      description: 'Elements Divided позволяет вам стать высшим воином стихий(огонь, вода, земля, воздух).',
      trailerUrl: 'https://www.meta.com/experiences/elements-divided/9471144046261462/',
      ageCategories: ['Подростки', 'Взрослые'],
      imageUrl : 'https://mixed-news.com/en/wp-content/uploads/2025/03/Elements-Divided-1200x675.jpg',
    },
    {
      title: 'Walkabout Mini Golf',
      description: 'Мини-гольф на фантастических полях и развлечения для всей семьи.',
      trailerUrl: 'https://www.meta.com/experiences/walkabout-mini-golf/2462678267173943/',
      ageCategories: ['Дети','Подростки', 'Взрослые'],
      imageUrl : 'https://media.licdn.com/dms/image/v2/D5612AQHqX6jVNopu7A/article-cover_image-shrink_720_1280/article-cover_image-shrink_720_1280/0/1691498301306?e=2147483647&v=beta&t=Tsk6c5LgD7kQ-nuU2T0AhH_MhUZh59KQPqqYqPHNSKs',
    },
    {
      title: 'Pavlov Shack',
      description: 'Тактический шутер с мультиплеером в стиле Counter-Strike.',
      trailerUrl: 'https://www.meta.com/experiences/pavlov-shack/2443267419018232/',
      ageCategories: ['Подростки', 'Взрослые'],
      imageUrl : 'https://static.tildacdn.com/tild6265-3565-4633-b830-393334633866/Pavlov_VR_1.jpg',
    },
    {
      title: 'Vacation Simulator',
      description: 'Веселый симулятор отпуска с мини-играми на тропическом острове.',
      trailerUrl: 'https://www.meta.com/experiences/vacation-simulator/2393300320759737/',
      ageCategories: ['Дети', 'Подростки'],
      imageUrl : 'https://www.uploadvr.com/content/images/size/w1200/2019/04/Vacation-Simulator-Review-1.jpg',
    },
    {
      title: 'Epic Roller Coasters',
      description: 'Американские горки с реалистичными эффектами и головокружительными трассами.',
      trailerUrl: 'https://www.meta.com/experiences/epic-roller-coasters/2299465166734471/',
      ageCategories: ['Дети', 'Подростки'],
      imageUrl : 'https://i.ytimg.com/vi/XLoIbN6TOYk/maxresdefault.jpg',
    },
    {
      title: 'Angry Birds VR: Isle of Pigs',
      description: 'Популярные птицы в VR — метайте птичек по свиньям-строителям.',
      trailerUrl: 'https://www.meta.com/experiences/angry-birds-vr-isle-of-pigs/2718606324833775/',
      ageCategories: ['Дети', 'Подростки'],
      imageUrl : 'https://i.pcmag.com/imagery/reviews/02XsybD1jnhw085sdmcvWTd-1..v1696524785.jpg',
    },
    {
      title: 'Premium Bowling',
      description: 'Боулинг в потрясающей VR-арене с реалистичной физикой кеглей.',
      trailerUrl: 'https://www.meta.com/experiences/premium-bowling/2773034772778845/',
      ageCategories: ['Дети', 'Подростки', 'Взрослые'],
      imageUrl : 'https://img.gg.deals/9f/44/e9e56f122fdbb0b168c70cb62661991c272b_1920xt1080_S1000.jpg',
    },
    {
      title: 'Dungeons of Eternity',
      description: 'Пошаговая ролевая игра с тактическими боями и эпическими подземельями.',
      trailerUrl: 'https://www.meta.com/experiences/dungeons-of-eternity/6341779295861881/',
      ageCategories: ['Подростки', 'Взрослые'],
      imageUrl : 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3189340/ss_6cb8780485d4b48dd38cfc4ba31dc1c9020a9277.1920x1080.jpg?t=1749850512',
    },
    {
      title: 'Cook-Out',
      description: 'Совместное приготовление блюд в хаотичной кухни-симуляции.',
      trailerUrl: 'https://www.meta.com/experiences/cook-out/2004774962957063/',
      ageCategories: ['Дети', 'Подростки', 'Взрослые'],
      imageUrl : 'https://a2.storyblok.com/f/163663/1920x1080/39e6a9fc6a/cook-out-lead.png/m/1920x0/filters:quality(90):format(webp)',
    },

    { 
        title: 'Blaston', 
        description: 'Аркадный дуэльный шутер на аренах футуристического мира.', 
        trailerUrl: 'https://www.meta.com/en-gb/experiences/blaston/2307085352735834/', 
        ageCategories: ['Дети','Подростки', 'Взрослые'],
        imageUrl : 'https://images.squarespace-cdn.com/content/v1/61813b3361b99650be1a2c4c/e7178309-129f-4b2f-95bf-6df922a80b7c/Copy%2Bof%2Bscreenshot_swarm.jpeg', 
    },
        
    { 
        title: 'Car Parking Simulator', 
        description: 'Симулятор парковки с реалистичными автомобилями и задачами.', 
        trailerUrl: 'https://www.meta.com/en-gb/experiences/car-parking-simulator-driving-and-racing/3890415587677522/', 
        ageCategories: ['Дети', 'Подростки','Взрослые'],
        imageUrl : 'https://i.ytimg.com/vi/4yuGraJbERI/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLAo3hrZi5FzaGLJGYO2Rs17jzjR2A',
    },
    { 
        title: 'Elven Assassin', 
        description: 'Фэнтезийный экшен от первого лица с луком и магией.', 
        trailerUrl: 'https://www.meta.com/en-gb/experiences/elven-assassin/2325731427501921/', 
        ageCategories: ['Подростки', 'Взрослые'],
        imageUrl : 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/503770/ss_01f7c4ef499f45d9ce879b90fc748341ee6d2092.1920x1080.jpg?t=1737032857',
    },
    { 
        title: 'Deisim', 
        description: 'Симулятор бога: создавайте мир и наблюдайте за его обитателями.', 
        trailerUrl: 'https://www.meta.com/en-gb/experiences/deisim/3526702020710931/', 
        ageCategories: ['Дети', 'Подростки'],
        imageUrl : 'https://www.deisim.com/images/Screen-03.png',
     },
    { 
        title: 'Escape Simulator', 
        description: 'Реалистичные квест-комнаты с головоломками для взрослых и подростков.', 
        trailerUrl: 'https://www.meta.com/en-gb/experiences/escape-free/24467240542922395/', 
        ageCategories: ['Подростки', 'Взрослые'],
        imageUrl : 'https://roadtovrlive-5ea0.kxcdn.com/wp-content/uploads/2023/06/escape-sim-vr.jpg', 
    },
    { 
        title: 'Thief Simulator', 
        description: 'Проникновения и кражи в открытом мире с элементами стелса.', 
        trailerUrl: 'https://www.meta.com/en-gb/experiences/thief-simulator-vr-greenview-street/3395626290543887/', 
        ageCategories: ['Подростки', 'Взрослые'], 
        imageUrl : 'https://fanatical.imgix.net/product/original/ba5ea90b-e0cc-4f7b-a8b9-b54741a45900.jpeg?auto=compress,format&w=870&fit=crop&h=489',
    },
    { 
        title: 'Ocean Rift', 
        description: 'Подводная экспедиция среди морских обитателей и сундуков сокровищ.', 
        trailerUrl: 'https://www.meta.com/en-gb/experiences/ocean-rift/2134272053250863/', 
        ageCategories: ['Дети'],
        imageUrl : 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjU5O6CGkTuc9wvUmHeRU_7ZAUGvT4KfY_THHekZGKqbCgvTnWGfYl_xLcnH80DnAQViP2vYjTFc21egdULdVi9lOo1EWyrTUd20m4GAbiEXi1REVmDmrTx8PZF_UuZZrEdZJQds7prgRU/s1600/Ocean+Rift+4.jpg',
    },
    { 
        title: 'CleanSheet Soccer', 
        description: 'Настольный футбол в VR с управлением движениями.', 
        trailerUrl: 'https://www.meta.com/en-gb/experiences/cleansheet-soccer/5005632286166834/', 
        ageCategories: ['Дети', 'Подростки'],
        imageUrl : 'https://cdn.altlabvr.com/757.jpegl2ck1710120853.jpeg?quality=80&type=jpg&width=1920',
    },
    { 
        title: 'Sweet Surrender', 
        description: 'Sweet Surrender — это динамичный шутер-рогалик, действие которого происходит в антиутопической мегабашне, которая заставляет вас адаптироваться к этой беспощадной, полной действий битве не на жизнь, а на смерть.', 
        trailerUrl: 'https://www.meta.com/en-gb/experiences/sweet-surrender/4723352327707414/', 
        ageCategories: ['Подростки', 'Взрослые'],
        imageUrl : 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/638130/ss_b71f1fca91a684f6ba9e7b99ffc5b577d40d2aca.1920x1080.jpg?t=1730896980',
    },
  ];

  export default function VRGamesCatalog() {
    const [filter, setFilter] = useState('Все');
    const filteredGames = filter === 'Все'
      ? games
      : games.filter(game => game.ageCategories.includes(filter));
  
    return (
      <section className={styles.catalog}>
        <header className={styles.header}>
          <h2>Каталог VR игр</h2>
        </header>
  
        <div className={styles.filters}>
          {categories.map(cat => (
            <button
              key={cat}
              className={`${styles.filterButton} ${filter === cat ? styles.active : ''}`}
              onClick={() => setFilter(cat)}
            >{cat}</button>
          ))}
        </div>
  
        <div className={styles.list}>
          {filteredGames.map(game => (
            <div key={game.title} className={styles.card}>
              {/* Картинка игры */}
              <div className={styles.imageWrapper}>
                <img src={game.imageUrl} alt={game.title} className={styles.image} />
              </div>
              <div className={styles.info}>
                <h3 className={styles.title}>{game.title}</h3>
                <p className={styles.description}>{game.description}</p>
                <p className={styles.ageCategory}>Возраст: {game.ageCategories.join(', ')}</p>
                <a href={game.trailerUrl} target="_blank" rel="noopener noreferrer" className={styles.trailerLink}>
                  Подробнее
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }
  