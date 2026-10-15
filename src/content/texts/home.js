export default {
  "home.marquee": {
    kind: "list",
    label: "Announcement strip (moving line at the top)",
    itemLabel: "announcement",
    hint: "Short lines. They scroll across the top of the home page.",
    max: 12,
    fields: [{ key: "text", label: "Text" }],
    default: [
      { text: "PICKUP IN SELECTED AREAS" },
      { text: "COD AVAILABLE IN METROPOLITAN AREA" },
      { text: "AUTHENTIC BEAUTY & FRAGRANCE" },
      { text: "CURATED WITH CARE" },
    ],
  },

  "home.hero.eyebrow": {
    default: "CURATED BEAUTY • {BRAND}",
    label: "Hero: small heading",
    hint: "{BRAND} = store name in capitals",
  },
  "home.hero.title": {
    default: "Your glow,\n*your story.*",
    label: "Hero: big heading",
    kind: "text",
    hint: "Put the accent words between *stars*",
  },
  "home.hero.text": {
    default:
      "Discover carefully selected skincare and fragrances designed to make every day feel a little more beautiful.",
    label: "Hero: paragraph",
    kind: "text",
  },
  "home.hero.cta1": { default: "Explore Collection", label: "Hero: first button" },
  "home.hero.cta2": { default: "Our Story", label: "Hero: second button" },

  "home.featured.eyebrow": { default: "A LITTLE SOMETHING", label: "Products: small heading" },
  "home.featured.title": {
    default: "Selected *for you.*",
    label: "Products: big heading",
  },
  "home.featured.link": { default: "View all", label: "Products: \"view all\" link" },
  "home.featured.loading": { default: "Discovering something beautiful…", label: "Products: loading text" },
  "home.featured.empty": { default: "New selections are coming soon…", label: "Products: nothing to show text" },
  "home.island.soldout": { default: "Sold out", label: "Product card: sold-out tag" },
  "home.island.from": { default: "From", label: "Product card: \"From\" before a price range" },

  "home.reviews.eyebrow": { default: "KIND WORDS", label: "Reviews: small heading" },
  "home.reviews.title": { default: "Loved by *our customers.*", label: "Reviews: big heading" },
  "home.reviews.verified": { default: "Verified purchase", label: "Reviews: verified tag" },

  "home.cta.eyebrow": { default: "FIND YOUR BEAUTY RITUAL", label: "Closing section: small heading" },
  "home.cta.title": {
    default: "A little beauty,\n*made personal.*",
    label: "Closing section: big heading",
    kind: "text",
  },
  "home.cta.text": {
    default:
      "From everyday essentials to captivating scents, discover pieces chosen to become part of your story.",
    label: "Closing section: paragraph",
    kind: "text",
  },
  "home.cta.button1": { default: "Explore Collection", label: "Closing section: first button" },
  "home.cta.button2": { default: "Our Story", label: "Closing section: second button" },

  "home.flag.new.eyebrow": { default: "JUST LANDED", label: "New arrivals: small heading" },
  "home.flag.new.title": { default: "New *arrivals.*", label: "New arrivals: heading" },
  "home.flag.trending.eyebrow": { default: "EVERYONE'S TALKING ABOUT", label: "Trending: small heading" },
  "home.flag.trending.title": { default: "Trending *now.*", label: "Trending: heading" },
  "home.flag.featured.eyebrow": { default: "HAND-PICKED", label: "Featured: small heading" },
  "home.flag.featured.title": { default: "Our *favourites.*", label: "Featured: heading" },
  "home.flag.deal.eyebrow": { default: "WHILE IT LASTS", label: "Deals: small heading" },
  "home.flag.deal.title": { default: "Special *deals.*", label: "Deals: heading" },
  "home.flag.link": { default: "See all", label: "New / trending / featured / deals: \"see all\" link" },

  "home.recent.eyebrow": { default: "PICK UP WHERE YOU LEFT OFF", label: "Recently viewed: small heading" },
  "home.recent.title": { default: "Recently *viewed.*", label: "Recently viewed: heading" },
};
