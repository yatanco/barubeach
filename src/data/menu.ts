export interface MenuItem {
  en: string;
  es: string;
  price: number | null;
  description_en?: string;
  description_es?: string;
}

export interface MenuCategory {
  id: string;
  en: { name: string };
  es: { name: string };
  items: MenuItem[];
}

export interface FoodPackageMeal {
  title: string;
  subtitle?: string;
  items: string[];
}

export interface FoodPackageContent {
  title: string;
  subtitle: string;
  price: string;
  premiumPrice: string;
  premiumLabel: string;
  includes: string[];
  note: string;
  breakfast: FoodPackageMeal;
  lunch: FoodPackageMeal;
}

export const menuData = {
  drinks: {
    en: { title: 'Food & Drinks', subtitle: 'Isla Barú · Colombia' },
    es: { title: 'Comida y Bebidas', subtitle: 'Isla Barú · Colombia' },
    note: {
      en: 'Additional payments: bank transfer or card.',
      es: 'Pagos adicionales: transferencia o tarjeta.',
    },
    categories: [
      {
        id: 'non-alcoholic',
        en: { name: 'Non-Alcoholic' },
        es: { name: 'Bebidas No Alcohólicas' },
        items: [
          { en: 'Still water', es: 'Agua sin gas', price: 8000 },
          { en: 'Fruit juice of the day', es: 'Jugo del día', price: 10000 },
          { en: 'Coca-Cola (Original / Zero)', es: 'Coca-Cola (Original y Zero)', price: 10000 },
        ],
      },
      {
        id: 'beers',
        en: { name: 'Beers' },
        es: { name: 'Cervezas' },
        items: [
          { en: 'Club Colombia', es: 'Cerveza Club Colombia', price: 12000 },
          { en: 'Corona', es: 'Cerveza Corona', price: 12000 },
          { en: 'Corona Zero', es: 'Corona Zero', price: 12000 },
        ],
      },
      {
        id: 'cocktails',
        en: { name: 'Cocktails' },
        es: { name: 'Cócteles' },
        items: [
          {
            en: 'Cuba Libre',
            es: 'Cuba Libre',
            price: 25000,
            description_en: 'Rum, lemon, Coca-Cola',
            description_es: 'Ron, zumo de limón y Coca-Cola',
          },
          {
            en: 'Gin & Tonic',
            es: 'Gin Tonic',
            price: 25000,
            description_en: 'Gin, tonic water',
            description_es: 'Ginebra y agua tónica',
          },
        ],
      },
      {
        id: 'spirits',
        en: { name: 'Spirits' },
        es: { name: 'Licores' },
        items: [
          {
            en: 'Ron Medellín',
            es: 'Ron Medellín',
            price: 100000,
            description_en: '375ml bottle',
            description_es: 'Botella 375ml',
          },
        ],
      },
    ] as MenuCategory[],
  },
  foodPackage: {
    en: {
      title: 'Food Package',
      subtitle: 'Fresh Caribbean meals prepared at the house',
      price: '$50 USD per person per day',
      premiumPrice: '$80 USD per person per day',
      premiumLabel: 'Premium (with lobster)',
      includes: [
        'Breakfast, lunch and dinner',
        'Fresh Caribbean cooking',
        'Natural juices included',
        'Non-alcoholic drinks included',
      ],
      note: 'Food package arranged in advance. Ask us when booking.',
      breakfast: {
        title: 'Breakfast',
        items: [
          'Grilled Arepa',
          'Scrambled Eggs',
          'Perico Eggs (scrambled with tomato and onion)',
          'Arepa with Egg',
          'Toasted Bread',
          'Coffee',
          'Milk',
          'Tropical Fruits',
        ],
      },
      lunch: {
        title: 'Lunch & Dinner',
        subtitle: 'Rotating menu — prepared fresh daily',
        items: [
          'Fried fish · coconut rice · fried plantains · salad',
          'Grilled chicken breast · boiled potatoes',
          'Pasta with shrimp',
          'Garlic shrimp',
          'Seafood paella',
          'Seafood casserole',
          'Grilled fish fillet · fried plantains',
        ],
      },
    } as FoodPackageContent,
    es: {
      title: 'Paquete de Alimentación',
      subtitle: 'Comida caribeña fresca preparada en la casa',
      price: '$50 USD por persona por día',
      premiumPrice: '$80 USD por persona por día',
      premiumLabel: 'Premium (con langosta)',
      includes: [
        'Desayuno, almuerzo y cena',
        'Cocina caribeña fresca',
        'Jugos naturales incluidos',
        'Bebidas no alcohólicas incluidas',
      ],
      note: 'Paquete de alimentación se coordina con anticipación. Pregúntanos al reservar.',
      breakfast: {
        title: 'Desayuno',
        items: [
          'Arepa a la plancha',
          'Huevos revueltos',
          'Huevos perico (revueltos con tomate y cebolla)',
          'Arepa con huevo',
          'Pan tostado',
          'Café',
          'Leche',
          'Frutas tropicales',
        ],
      },
      lunch: {
        title: 'Almuerzo y Cena',
        subtitle: 'Menú rotativo — preparado fresco cada día',
        items: [
          'Pescado frito · arroz de coco · patacones · ensalada',
          'Pechuga de pollo a la plancha · papas cocidas',
          'Pasta con camarones',
          'Camarones al ajillo',
          'Paella de mariscos',
          'Cazuela de mariscos',
          'Filete de pescado a la plancha · patacones',
        ],
      },
    } as FoodPackageContent,
  },
};

// Phase 2: add food items as they are defined
// Phase 3: simple ordering flow for day trips
// (select items → pre-filled WhatsApp order message)
