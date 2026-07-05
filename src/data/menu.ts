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

export interface FoodPackageOption {
  name: string;
  price: string;
  includes: string[];
}

export const menuData = {
  drinks: {
    en: { title: 'Drinks Menu', subtitle: 'Isla Barú · Colombia' },
    es: { title: 'Menú de Bebidas', subtitle: 'Isla Barú · Colombia' },
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
      description: 'Fresh Caribbean meals prepared at the house by our team.',
      options: [
        {
          name: 'Standard',
          price: '$50 USD per person per day',
          includes: [
            'Breakfast, lunch and dinner',
            'Fresh Caribbean cooking',
            'Natural juices included',
            'Non-alcoholic drinks included',
          ],
        },
        {
          name: 'Premium (with lobster)',
          price: '$80 USD per person per day',
          includes: ['Everything in Standard', 'Lobster included', 'Upgraded menu'],
        },
      ] as FoodPackageOption[],
      note: 'Food package arranged in advance. Ask us when booking.',
    },
    es: {
      title: 'Paquete de Alimentación',
      description: 'Comida caribeña fresca preparada en la casa por nuestro equipo.',
      options: [
        {
          name: 'Estándar',
          price: '$50 USD por persona por día',
          includes: [
            'Desayuno, almuerzo y cena',
            'Cocina caribeña fresca',
            'Jugos naturales incluidos',
            'Bebidas no alcohólicas incluidas',
          ],
        },
        {
          name: 'Premium (con langosta)',
          price: '$80 USD por persona por día',
          includes: ['Todo lo del estándar', 'Langosta incluida', 'Menú premium'],
        },
      ] as FoodPackageOption[],
      note: 'Paquete de alimentación se coordina con anticipación. Pregúntanos al reservar.',
    },
  },
};

// Phase 2: add food items as they are defined
// Phase 3: simple ordering flow for day trips
// (select items → pre-filled WhatsApp order message)
