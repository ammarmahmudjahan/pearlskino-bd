export default {
  "shop.eyebrow": { default: "{BRAND} SHOP", label: "Heading: small line above the title" },
  "shop.title": { default: "Our *Collection.*", label: "Heading: big title" },
  "shop.text": {
    default:
      "Discover our carefully selected collection of skincare, fragrances and beauty essentials.",
    label: "Heading: paragraph",
    kind: "text",
  },

  "shop.filters.title": { default: "Refine", label: "Filters: title" },
  "shop.filters.category": { default: "Category", label: "Filters: category heading" },
  "shop.filters.all": { default: "All Categories", label: "Filters: \"all\" chip" },
  "shop.filters.searchCategory": {
    default: "Search category…",
    label: "Filters: category search box hint",
    inline: false,
  },
  "shop.filters.noCategory": {
    default: "No category matches that search.",
    label: "Filters: no category found",
  },
  "shop.filters.price": { default: "Price (৳)", label: "Filters: price heading" },
  "shop.filters.min": { default: "Min", label: "Filters: minimum price hint", inline: false },
  "shop.filters.max": { default: "Max", label: "Filters: maximum price hint", inline: false },
  "shop.filters.sort": { default: "Sort by", label: "Filters: sort heading" },
  "shop.sort.default": { default: "Default", label: "Sort option: default" },
  "shop.sort.asc": { default: "Price: Low → High", label: "Sort option: cheapest first" },
  "shop.sort.desc": { default: "Price: High → Low", label: "Sort option: dearest first" },
  "shop.filters.clear": { default: "Clear filters", label: "Filters: clear link" },
  "shop.results": {
    default: "{count} products",
    label: "Result count (many)",
    hint: "{count} fills in the number",
  },
  "shop.results1": { default: "1 product", label: "Result count (one)" },

  "shop.badge.out": { default: "Out of Stock", label: "Card: out of stock tag" },
  "shop.available": { default: "✓ Available", label: "Card: available tag" },
  "shop.view": { default: "View", label: "Card: view button" },
  "shop.from": { default: "From", label: "Card: \"From\" before a price range" },
  "shop.more": { default: "Show more", label: "Show more button" },
  "shop.loading": { default: "Loading the collection…", label: "Loading text" },

  "shop.empty.eyebrow": { default: "COLLECTION", label: "Empty shop: small heading" },
  "shop.empty.title": { default: "Nothing here yet.", label: "Empty shop: heading" },
  "shop.empty.text": {
    default: "Our collection is being prepared. Please check back soon.",
    label: "Empty shop: paragraph",
    kind: "text",
  },

  "shop.nomatch.title": { default: "Nothing matches these filters.", label: "No results: heading" },
  "shop.nomatch.text": {
    default: "Try a different category or price range, or clear the filters.",
    label: "No results: paragraph",
    kind: "text",
  },

  "shop.search.hint": { default: "Search the collection…", label: "Search box hint", inline: false },
  "shop.search.results": { default: "Results for \"{query}\"", label: "Search results heading", hint: "{query} fills in the search" },
  "shop.urgency": { default: "Only {count} left", label: "Card: last few tag", hint: "{count} fills in the number" },
};
