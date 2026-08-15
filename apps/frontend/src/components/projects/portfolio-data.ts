export interface PortfolioCategory {
  number: string;
  slug: string;
  navLabel: string;
  title: string;
  description: string;
  applications: string[];
  service: string;
}

/**
 * Curated capability framework used when the project CMS has no published records.
 * The available images are reference/capability visuals, not verified client-project photography.
 */
export const PORTFOLIO_CATEGORIES: PortfolioCategory[] = [
  {
    number: '01', slug: 'construction', navLabel: 'Construction',
    title: 'Turnkey Home Construction',
    description: 'Complete residential delivery coordinated from site planning and structure through services, finishes and handover.',
    applications: ['Foundation planning', 'RCC structure', 'Masonry and shell', 'Exterior finishing', 'Handover coordination'],
    service: 'Turnkey Home Construction',
  },
  {
    number: '02', slug: 'interiors', navLabel: 'Interiors',
    title: 'Interior Design & Execution',
    description: 'Layered residential interiors shaped through space planning, joinery, lighting, furniture and a disciplined finish palette.',
    applications: ['Living rooms', 'Bedrooms', 'Dining spaces', 'Media walls', 'Wardrobes and lighting'],
    service: 'Interior Design & Execution',
  },
  {
    number: '03', slug: 'kitchens', navLabel: 'Kitchens',
    title: 'Modular Kitchens & Furniture',
    description: 'Made-to-measure kitchens and fitted furniture balancing everyday ergonomics with refined surfaces and dependable hardware.',
    applications: ['Base and wall cabinets', 'Stone counters', 'Tall storage', 'Hardware systems', 'Custom furniture'],
    service: 'Modular Kitchens & Custom Furniture',
  },
  {
    number: '04', slug: 'aluminium', navLabel: 'Aluminium',
    title: 'Aluminium Doors, Windows & Systems',
    description: 'Precision-fabricated aluminium systems designed around opening size, weather performance, operation and architectural finish.',
    applications: ['Sliding windows', 'Sliding doors', 'Partitions', 'Large openings', 'Profile detailing'],
    service: 'Aluminium Doors, Windows & Systems',
  },
  {
    number: '05', slug: 'glass', navLabel: 'Glass',
    title: 'Architectural Glass Work',
    description: 'Clear, carefully detailed glass applications that preserve light, openness and safe day-to-day use across interior and exterior spaces.',
    applications: ['Toughened glazing', 'Glass partitions', 'Shower enclosures', 'Glass doors', 'Railing glass'],
    service: 'Architectural Glass Work',
  },
  {
    number: '06', slug: 'acp', navLabel: 'ACP',
    title: 'ACP Cladding & Facades',
    description: 'Architectural facade systems developed as a coordinated composition of substructure, panel rhythm, joints and weather-conscious detailing.',
    applications: ['Exterior cladding', 'Elevation panels', 'Feature bands', 'Commercial facades', 'Substructure coordination'],
    service: 'ACP, Cladding & Facade Work',
  },
  {
    number: '07', slug: 'steel', navLabel: 'Steel',
    title: 'Steel Fabrication',
    description: 'Purpose-built steel elements engineered and fabricated for structural clarity, reliable installation and a clean architectural expression.',
    applications: ['Frames and supports', 'Canopies', 'Sheds', 'Entrance structures', 'Installed steelwork'],
    service: 'Steel Fabrication',
  },
  {
    number: '08', slug: 'metalwork', navLabel: 'Metalwork',
    title: 'Railings, Gates & Metal Work',
    description: 'Slim, accurately fabricated metalwork for circulation, boundaries and architectural accents, resolved down to junction and finish.',
    applications: ['Stair railings', 'Balcony guards', 'Modern gates', 'Pergolas', 'Decorative metalwork'],
    service: 'Railings, Gates & Metal Works',
  },
  {
    number: '09', slug: 'ceilings', navLabel: 'Ceilings',
    title: 'False Ceiling & Gypsum',
    description: 'Proportioned ceiling systems that integrate lighting, services and subtle architectural depth without visual clutter.',
    applications: ['Gypsum ceilings', 'Cove lighting', 'Recessed profiles', 'Layered ceilings', 'Lighting integration'],
    service: 'False Ceiling, Gypsum & Decorative Ceilings',
  },
  {
    number: '10', slug: 'finishes', navLabel: 'Finishes',
    title: 'Flooring, Painting & Finishes',
    description: 'A coordinated finish layer spanning floors, walls, paint and polishing, selected for durability, alignment and tactile quality.',
    applications: ['Tile and stone', 'Flooring', 'Wall finishes', 'Painting', 'Decorative polishing'],
    service: 'Flooring, Painting & Finishes',
  },
  {
    number: '11', slug: 'renovation', navLabel: 'Renovation',
    title: 'Renovation & Remodelling',
    description: 'Careful upgrades to existing spaces through measured alterations, coordinated services and a coherent new finish language.',
    applications: ['Space alterations', 'Services upgrades', 'Kitchen renewal', 'Interior remodelling', 'Finish replacement'],
    service: 'Renovation & Remodelling',
  },
  {
    number: '12', slug: 'commercial', navLabel: 'Commercial',
    title: 'Commercial & Office Fit-outs',
    description: 'Integrated workplaces and customer-facing environments delivered through coordinated partitions, services, joinery, finishes and facade work.',
    applications: ['Office interiors', 'Shops and showrooms', 'Partitions', 'Counters and joinery', 'Commercial facades'],
    service: 'Commercial & Office Fit-outs',
  },
];

export const FEATURED_PORTFOLIO = PORTFOLIO_CATEGORIES.slice(0, 6);
