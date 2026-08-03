-- One-time seed: Zoe's Food Profile + confirmed home inventory.
-- ZOE_USER_ID matches the fallback constant already used elsewhere in this
-- codebase (src/app/api/atelier/wardrobe/detect/route.ts) for this
-- single-user app. Run AFTER food_profile_schema.sql and
-- food_pantry_schema.sql. Safe to re-run: both statements upsert/skip
-- rather than duplicate.

-- Glass meal-prep containers intentionally excluded — not a food item.
-- "May need confirmation" items (bananas, buns, cucumbers, baby carrots,
-- Greek yogurt, granola, broccoli, heavy cream, Parmesan, sun-dried
-- tomatoes, garlic, pasta, potatoes) intentionally excluded per instruction
-- not to mark unconfirmed items as inventory — confirm those from the app
-- (Pantry tab) instead.

insert into public.food_pantry_items (user_id, name, category, expires_on, source)
select '5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb', v.name, v.category, current_date + (v.days || ' days')::interval, 'manual'
from (values
  ('Bell & Evans chicken breasts',   'protein',            2),
  ('Bell & Evans chicken tenderloins','protein',           2),
  ('Chicken patties or boxed chicken','frozen',            120),
  ('Atlantic salmon',                'protein',            2),
  ('White or sticky rice',           'pantry',             365),
  ('Frozen blueberries',             'frozen',             180),
  ('Peanut butter',                  'pantry',             180),
  ('Jelly',                          'pantry',             180),
  ('Bread',                          'bakery_and_grains',  7),
  ('Bagels',                         'bakery_and_grains',  7),
  ('French toast',                  'frozen',             90),
  ('Oatmeal',                        'pantry',             365),
  ('Pancake mix',                    'pantry',             180),
  ('Waffles',                        'frozen',             90),
  ('Spinach chips',                  'pantry',             60),
  ('Iceberg lettuce',                'produce',            7),
  ('Tomatoes',                       'produce',            5),
  ('Caesar dressing',                'dairy',              60),
  ('White American cheese',          'dairy',              21),
  ('Tortillas and wraps',            'bakery_and_grains',  14),
  ('Chicken broth',                  'pantry',             365),
  ('Chicken stock',                  'pantry',             365),
  ('Soy sauce',                      'pantry',             730),
  ('Worcestershire sauce',           'pantry',             730),
  ('Huy Fong sauce',                 'pantry',             730),
  ('Asian chili paste',              'pantry',             365),
  ('Panko breadcrumbs',              'pantry',             180),
  ('Cornstarch',                     'pantry',             730),
  ('Butter',                         'dairy',              90),
  ('Bottled water',                  'pantry',             365),
  ('Poppi',                          'pantry',             180),
  ('Powerade',                       'pantry',             180),
  ('Hibiscus tea',                   'pantry',             730)
) as v(name, category, days)
where not exists (
  select 1 from public.food_pantry_items p
  where p.user_id = '5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb' and p.name = v.name and p.consumed_at is null
);

insert into public.food_profile (
  user_id, preferred_chicken_brand, rice_preference, dressing_preference,
  favorite_meals, behavior_rules, never_foods, cooking_techniques
) values (
  '5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb',
  'Bell & Evans',
  'Sticky, short-grain, or sushi-style rice — not fluffy long-grain rice.',
  'Caesar or buffalo-based.',
  '{
    "breakfast": ["French toast","Waffles","Pancakes","Oatmeal","Bagels","Belgian crepes","Protein oatmeal with frozen blueberries and peanut butter","Greek yogurt with granola, without berries mixed into the yogurt","Protein pancakes","Protein waffles","Smoothies","Hot breakfast tea","Matcha"],
    "chicken": ["Chicken tenders","Fried chicken strips","Barbecue chicken tenders","Crispy fried chicken sandwiches","Chick-fil-A-style chicken","Chicken Parmesan","Chicken Alfredo","Marry Me Chicken","Buffalo chicken","Buffalo chicken rice bowls","Buffalo chicken pasta","Chicken Caesar wraps","Crispy chicken bowls","Chicken fajita bowls","Baked chicken with broccoli","Mexican chicken meals"],
    "salmon_and_other": ["Salmon with sticky rice","Salmon lunch bowls","Honey-garlic salmon","Chicken-only sushi","Mexican steak meals","BBQ chicken pizza","Margherita pizza","Caesar salads","Buffalo chicken salads"],
    "snacks": ["Peanut butter and jelly sandwiches","Frozen blueberries with peanut butter","Apples with peanut butter","Greek yogurt with granola","Popcorn","Protein bars","Crackers","Frozen fruit snacks","Cookies","Honey Buns for Kaleb"]
  }'::jsonb,
  array[
    'Drinks tea every day, all day — always keep hot tea/hibiscus tea on hand and factor it into grocery lists and reminders.',
    'Prefer sticky, short-grain, or sushi-style rice — not fluffy long-grain rice.',
    'Breakfast and lunch suggestions should be fast, simple, and picky-eater-friendly.',
    'Likes buffalo sauce and hot sauce.',
    'For salad dressing, suggest Caesar or buffalo-based options.',
    'Prioritize meals that use food already in the house.',
    'Suggest the easiest meal first when she says she is hungry, tired, overwhelmed, or does not feel like cooking.',
    'Do not give a long recipe when she asks for something fast.',
    'Help her use raw chicken before it expires or needs to be frozen.',
    'Track leftovers and tell her when they should be eaten.',
    'Use her inventory to avoid buying duplicates.',
    'Write recipes at real, restaurant/chef quality with proper technique and actual seasonings — not generic bland instructions.'
  ],
  array['eggs','cream cheese','ranch dressing','mayonnaise','cottage cheese','hummus','feta','lunch meat','ground beef','mahi-mahi','cod','tuna with crackers','black beans'],
  '{
    "chicken_parmesan": "Pound chicken to 1/4in even thickness. Bread: seasoned flour (salt+pepper) -> egg wash -> panko mixed with Italian breadcrumbs, grated fresh parmesan, garlic, parsley, salt, pepper. Pan-fry until golden, then finish in the oven. Use a good tomato sauce and fresh mozzarella; don''t drown the crust in sauce/cheese or it goes soggy.",
    "buffalo_chicken": "Coat with buttermilk + hot sauce, garlic powder, onion powder, smoked paprika. Dredge in flour with a drizzle of hot sauce worked in for craggy bits, double-fry (lower temp first to cook through, higher temp second for crunch) or double-coat for oven version. Toss in classic buffalo (hot sauce + melted butter, ~2:1) right before serving so it stays crispy.",
    "marry_me_chicken": "Pound chicken to even 1/2in, season with salt/pepper, dredge in flour, sear ~5 min/side until golden. Sauce: garlic, chicken stock/bouillon, heavy cream, sun-dried tomatoes, tomato paste, grated parmesan, Italian seasoning (oregano, thyme, fresh basil), a touch of honey for balance, red pepper flakes for heat. Simmer chicken back into the sauce to finish.",
    "honey_garlic_salmon": "Pat salmon completely dry before searing. Season with salt, pepper, paprika, press in by hand. Sear in a hot heavy pan with high-smoke-point oil, undisturbed 3-4 min per side until it releases easily. Whisk honey, soy sauce, garlic, a splash of vinegar separately and have it ready — pour into the hot pan right after searing so it caramelizes into a sticky glaze.",
    "chicken_alfredo": "Season chicken with garlic powder, paprika, salt, pepper; cook to 160F internal, rest before slicing. Build the sauce in the same pan using the browned fond: butter + garlic, then heavy cream whisked in gradually, freshly grated parmesan only. Season the sauce itself, not just the chicken."
  }'::jsonb
)
on conflict (user_id) do update set
  preferred_chicken_brand = excluded.preferred_chicken_brand,
  rice_preference = excluded.rice_preference,
  dressing_preference = excluded.dressing_preference,
  favorite_meals = excluded.favorite_meals,
  behavior_rules = excluded.behavior_rules,
  never_foods = excluded.never_foods,
  cooking_techniques = excluded.cooking_techniques,
  updated_at = now();
