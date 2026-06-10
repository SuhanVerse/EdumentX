export type Property = {
  id: string;
  title: string;
  address: string;
  city: string;
  price: number;
  discount?: number;
  category: 'Home' | 'Hotel' | 'Apartment' | 'Office';
  floors: number;
  beds: number;
  baths: number;
  rating: number;
  reviews: number;
  image: string;
  gallery: string[];
  description: string;
  area: number;
  agent: { name: string; role: string; avatar: string };
};

export const PROPERTIES: Property[] = [
  {
    id: 'p1',
    title: 'Oakridge Residence',
    address: '24 Oak Street',
    city: 'London',
    price: 28600,
    discount: 15,
    category: 'Home',
    floors: 1,
    beds: 4,
    baths: 2,
    rating: 5.0,
    reviews: 128,
    image: 'https://images.unsplash.com/photo-1591474200742-8e512e6f98f8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    gallery: [
      'https://images.unsplash.com/photo-1591474200742-8e512e6f98f8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
      'https://images.unsplash.com/photo-1724582586529-62622e50c0b3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
      'https://images.unsplash.com/photo-1653972233229-1b8c042d6d8e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    ],
    description:
      'A quiet two-story home set back from the road, with timber accents, a private garden and abundant natural light through floor-to-ceiling windows.',
    area: 2140,
    agent: {
      name: 'Abdur Rob',
      role: 'Senior Agent',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    },
  },
  {
    id: 'p2',
    title: 'Maple Hollow',
    address: '12 Maple Avenue',
    city: 'Brooklyn',
    price: 19400,
    discount: 20,
    category: 'Home',
    floors: 2,
    beds: 3,
    baths: 2,
    rating: 4.8,
    reviews: 86,
    image: 'https://images.unsplash.com/photo-1721815693498-cc28507c0ba2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    gallery: [
      'https://images.unsplash.com/photo-1721815693498-cc28507c0ba2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
      'https://images.unsplash.com/photo-1689043528099-2ba014dd7c64?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    ],
    description:
      'Balconies on every floor and a corner lot with mature trees. Walking distance to coffee shops and the metro line.',
    area: 1820,
    agent: {
      name: 'Maya Chen',
      role: 'Lead Agent',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    },
  },
  {
    id: 'p3',
    title: 'Hillside Loft',
    address: '7 Crestview Lane',
    city: 'Aspen',
    price: 32100,
    category: 'Apartment',
    floors: 1,
    beds: 2,
    baths: 1,
    rating: 4.9,
    reviews: 54,
    image: 'https://images.unsplash.com/photo-1698994705178-d244d73ea573?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    gallery: [
      'https://images.unsplash.com/photo-1698994705178-d244d73ea573?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
      'https://images.unsplash.com/photo-1667510436110-79d3dabc2008?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    ],
    description:
      'Perched on a quiet hillside with sweeping valley views, open-plan living and a wood-burning stove for cooler evenings.',
    area: 1140,
    agent: {
      name: 'Joseph Lin',
      role: 'Property Advisor',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    },
  },
  {
    id: 'p4',
    title: 'Harbor View Suite',
    address: '88 Harbor Road',
    city: 'Lisbon',
    price: 24200,
    discount: 10,
    category: 'Hotel',
    floors: 1,
    beds: 2,
    baths: 2,
    rating: 4.7,
    reviews: 212,
    image: 'https://images.unsplash.com/photo-1628012209120-d9db7abf7eab?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    gallery: [
      'https://images.unsplash.com/photo-1628012209120-d9db7abf7eab?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
      'https://images.unsplash.com/photo-1738168279272-c08d6dd22002?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    ],
    description:
      'A bright suite with sea-facing terrace, walk-in shower and tile work by a local artisan studio.',
    area: 980,
    agent: {
      name: 'Abdur Rob',
      role: 'Senior Agent',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    },
  },
];

export const getProperty = (id: string) => PROPERTIES.find((p) => p.id === id) ?? PROPERTIES[0];
