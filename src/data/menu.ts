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

export interface DrinkItem {
  en: string;
  es: string;
  price_unit: number;
  price_6pack: number | null;
  description_en?: string;
  description_es?: string;
}

export interface DrinkCategory {
  id: string;
  en: { name: string };
  es: { name: string };
  items: DrinkItem[];
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

export const drinksData = {
  en: {
    title: 'Drinks',
    subtitle: 'Isla Barú · Colombia',
    description: "Cold drinks available at the house. Ask Manuel — we'll bring it to your hammock.",
    note: 'Prices in COP. Subject to availability. Payment at end of stay or via transfer.',
    whatsappText: 'Hola! Estamos en Casa Gaviota y queremos pedir: ',
  },
  es: {
    title: 'Bebidas',
    subtitle: 'Isla Barú · Colombia',
    description: 'Bebidas frías disponibles en la casa. Pídeselo a Manuel — te lo llevamos a la hamaca.',
    note: 'Precios en COP. Sujeto a disponibilidad. Pago al final de la estadía o por transferencia.',
    whatsappText: 'Hola! Estamos en Casa Gaviota y queremos pedir: ',
  },
  categories: [
    {
      id: 'cervezas',
      en: { name: 'Beers' },
      es: { name: 'Cervezas' },
      items: [
        {
          en: 'Budweiser',
          es: 'Budweiser',
          price_unit: 6000,
          price_6pack: 32000,
          description_en: '269ml',
          description_es: '269ml',
        },
        {
          en: 'Club Colombia Dorada',
          es: 'Club Colombia Dorada',
          price_unit: 8000,
          price_6pack: 42000,
          description_en: '330ml',
          description_es: '330ml',
        },
        {
          en: 'Coronita Extra',
          es: 'Coronita Extra',
          price_unit: 7500,
          price_6pack: 40000,
          description_en: '210ml',
          description_es: '210ml',
        },
      ],
    },
    {
      id: 'wine',
      en: { name: 'Wine' },
      es: { name: 'Vino' },
      items: [
        {
          en: 'White Wine',
          es: 'Vino Blanco',
          price_unit: 30000,
          price_6pack: null,
          description_en: 'Bottle',
          description_es: 'Botella',
        },
        {
          en: 'Red Wine',
          es: 'Vino Tinto',
          price_unit: 30000,
          price_6pack: null,
          description_en: 'Bottle',
          description_es: 'Botella',
        },
      ],
    },
    {
      id: 'spirits',
      en: { name: 'Spirits' },
      es: { name: 'Licores' },
      items: [
        {
          en: 'Aguardiente Antioqueño',
          es: 'Aguardiente Antioqueño',
          price_unit: 70000,
          price_6pack: null,
          description_en: 'Bottle',
          description_es: 'Botella',
        },
        {
          en: 'Ron Medellín',
          es: 'Ron Medellín',
          price_unit: 80000,
          price_6pack: null,
          description_en: '375ml bottle',
          description_es: 'Botella 375ml',
        },
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
          price_unit: 18000,
          price_6pack: null,
          description_en: 'Rum, lemon, Coca-Cola',
          description_es: 'Ron, limón, Coca-Cola',
        },
        {
          en: 'Gin & Tonic',
          es: 'Gin Tonic',
          price_unit: 18000,
          price_6pack: null,
          description_en: 'Gin, tonic water',
          description_es: 'Ginebra, agua tónica',
        },
      ],
    },
    {
      id: 'non-alcoholic',
      en: { name: 'Non-Alcoholic' },
      es: { name: 'Sin Alcohol' },
      items: [
        {
          en: 'Still water',
          es: 'Agua sin gas',
          price_unit: 5000,
          price_6pack: null,
          description_en: 'Served cold',
          description_es: 'Servida fría',
        },
        {
          en: 'Coca-Cola',
          es: 'Coca-Cola',
          price_unit: 6000,
          price_6pack: null,
          description_en: 'Original / Zero',
          description_es: 'Original / Zero',
        },
        {
          en: 'Juice of the day',
          es: 'Jugo del día',
          price_unit: 7000,
          price_6pack: null,
          description_en: 'Fresh fruit',
          description_es: 'Fruta fresca',
        },
      ],
    },
  ] as DrinkCategory[],
};

// Phase 2: add food items as they are defined
// Phase 3: simple ordering flow for day trips
// (select items → pre-filled WhatsApp order message)
