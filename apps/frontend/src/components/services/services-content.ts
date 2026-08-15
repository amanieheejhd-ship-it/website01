export interface CoreService {
  number: string;
  slug: string;
  shortName: string;
  title: string;
  positioning: string;
  description: string;
  includes: string[];
  applications: string;
  materials: string;
}

export const CORE_SERVICES: CoreService[] = [
  {
    number: '01',
    slug: 'turnkey-home-construction',
    shortName: 'Construction',
    title: 'Turnkey Home Construction',
    positioning: 'One accountable execution team, from the first excavation to final handover.',
    description:
      'We coordinate complete residential construction as one connected scope instead of a chain of disconnected contractors. Civil work, services and finishes are planned together so decisions made at structure stage support the final home.',
    includes: ['Site preparation and excavation', 'Foundation and RCC structure', 'Brick or block work and plaster', 'Waterproofing and concealed services', 'Flooring, painting and final finishes', 'Snagging, completion and handover'],
    applications: 'Independent homes, villas, additions and complete residential builds.',
    materials: 'Concrete, reinforcement, masonry systems, waterproofing assemblies and finish materials selected for the project requirement.',
  },
  {
    number: '02',
    slug: 'architecture-space-planning',
    shortName: 'Planning',
    title: 'Architecture & Space Planning',
    positioning: 'Practical layouts shaped around movement, light, privacy and construction reality.',
    description:
      'We translate the brief into clear floor planning, zoning and elevation direction, then coordinate those decisions with execution. The focus is usable space and buildable detailing; statutory approvals or specialist consultancy can be coordinated separately where required.',
    includes: ['Requirement and room planning', 'Circulation and functional zoning', 'Furniture-aware floor layouts', 'Elevation and exterior concepts', 'Space optimisation', 'Execution-friendly detail coordination'],
    applications: 'New homes, floor additions, renovations, offices and commercial layouts.',
    materials: 'Planning decisions are developed alongside structural grids, services, openings and intended finish systems.',
  },
  {
    number: '03',
    slug: 'interior-design-execution',
    shortName: 'Interiors',
    title: 'Interior Design & Execution',
    positioning: 'Design intent and site execution carried through as one continuous process.',
    description:
      'We create cohesive interiors where storage, lighting, surfaces and furniture belong to the same visual language. Design development stays connected to fabrication and installation, reducing compromises between drawings and the finished room.',
    includes: ['Living, dining and bedroom interiors', 'Office and commercial interiors', 'TV and media walls', 'Wardrobes and custom storage', 'Wall panels and feature surfaces', 'Ceiling, lighting and finish coordination'],
    applications: 'Complete homes, selected rooms, offices, retail spaces and interior upgrades.',
    materials: 'Boards, veneers, laminates, fabrics, metals, glass, lighting and surface finishes selected for appearance, use and durability.',
  },
  {
    number: '04',
    slug: 'modular-kitchens-custom-furniture',
    shortName: 'Kitchens',
    title: 'Modular Kitchens & Custom Furniture',
    positioning: 'Intelligent storage, durable hardware and clean detailing tailored to daily use.',
    description:
      'Kitchen and furniture layouts are designed around ergonomics, appliance positions and the way each client uses the space. Cabinet modules, shutters, worktops and hardware are coordinated before fabrication for a precise installation.',
    includes: ['Base, wall and tall kitchen units', 'Pantry and corner storage solutions', 'Shutters, channels and hardware', 'Countertop and backsplash coordination', 'Wardrobes, TV units and vanities', 'Purpose-made cabinets and furniture'],
    applications: 'New kitchens, kitchen renovations, wardrobes, home storage and commercial cabinetry.',
    materials: 'Appropriate cabinet boards, laminates or veneers, stone surfaces, hardware and moisture-resistant specifications by location.',
  },
  {
    number: '05',
    slug: 'aluminium-systems',
    shortName: 'Aluminium',
    title: 'Aluminium Doors, Windows & Systems',
    positioning: 'Slim, accurately fabricated systems with dependable movement and weather detailing.',
    description:
      'We fabricate and install aluminium openings and partition systems with attention to profile selection, alignment, sealing and hardware. Each assembly is measured for its actual opening and coordinated with adjacent finishes.',
    includes: ['Sliding and openable windows', 'Aluminium doors and frames', 'Partitions and office systems', 'Fixed glazing frames', 'Profile and hardware selection', 'Fabrication, fitting and sealing'],
    applications: 'Homes, balconies, offices, shops, internal partitions and exterior openings.',
    materials: 'Powder-coated or suitable finished aluminium profiles, compatible hardware, gaskets, sealants and selected glazing.',
  },
  {
    number: '06',
    slug: 'architectural-glass-work',
    shortName: 'Glass',
    title: 'Architectural Glass Work',
    positioning: 'Measured transparency, clean junctions and glass selected for the intended application.',
    description:
      'Our glass work supports open, light-filled interiors and refined exterior details without overlooking safety or usability. Thickness, edge treatment, fittings and support conditions are considered as part of every installation.',
    includes: ['Toughened glass doors and partitions', 'Office and internal glazing', 'Shower enclosures', 'Railing glass', 'Mirrors and decorative glass', 'Facade glazing where applicable'],
    applications: 'Bathrooms, offices, balconies, staircases, storefronts and feature interiors.',
    materials: 'Toughened or application-appropriate glass with compatible channels, patch fittings, profiles, sealants and hardware.',
  },
  {
    number: '07',
    slug: 'acp-cladding-facades',
    shortName: 'Facades',
    title: 'ACP, Cladding & Facade Work',
    positioning: 'Contemporary exterior surfaces resolved through disciplined grids and crisp junctions.',
    description:
      'We execute modern facade treatments that bring structure, depth and a finished identity to an elevation. Subframes, panel setting-out and edge details are coordinated to keep lines deliberate and maintenance practical.',
    includes: ['ACP exterior cladding', 'Commercial elevation treatments', 'Feature bands and volumes', 'Framing and substructure', 'Panel joints and edge closures', 'Integration with glass and signage zones'],
    applications: 'Homes, offices, shops, showrooms, commercial fronts and renovation facades.',
    materials: 'ACP panels, suitable framing systems, fixings, sealants and complementary exterior finishes selected for exposure conditions.',
  },
  {
    number: '08',
    slug: 'steel-fabrication',
    shortName: 'Steel',
    title: 'Steel Fabrication',
    positioning: 'Purpose-built frames and supports fabricated for accurate fit and reliable installation.',
    description:
      'We fabricate steel elements for architectural and practical building needs, from canopies to custom support frames. Work is measured, prepared and installed to the agreed project detail; specialist structural design can be coordinated where required.',
    includes: ['Steel frames and custom supports', 'Sheds and lightweight structures', 'Canopies and entrance frames', 'Equipment or cladding supports', 'On-site installation', 'Finishing and protective coating coordination'],
    applications: 'Residential additions, commercial premises, terraces, utility areas and specialist support works.',
    materials: 'MS sections, plates, fasteners, welding systems and suitable primer, paint or finish specifications.',
  },
  {
    number: '09',
    slug: 'railings-gates-metal-work',
    shortName: 'Metalwork',
    title: 'Railings, Gates & Metal Works',
    positioning: 'Functional metalwork treated as an architectural detail, not an afterthought.',
    description:
      'We design and fabricate metal elements around the dimensions and character of the property. Proportion, grip, spacing, movement and finish are resolved alongside the surrounding masonry, glass or wood.',
    includes: ['Stair and balcony railings', 'MS and SS fabrication', 'Entrance and driveway gates', 'Pergolas and screens', 'Decorative metal features', 'Custom brackets and frames'],
    applications: 'Staircases, balconies, terraces, entrances, boundaries and interior feature work.',
    materials: 'Mild steel, stainless steel, selected finishes, glass combinations, hardware and protective coating systems.',
  },
  {
    number: '10',
    slug: 'false-ceiling-gypsum',
    shortName: 'Ceilings',
    title: 'False Ceiling, Gypsum & Decorative Ceilings',
    positioning: 'Quiet ceiling architecture that organises light, services and room proportion.',
    description:
      'Ceilings are planned as part of the interior rather than applied at the end. Levels, service access, recessed lighting and cove provisions are coordinated to create clean lines and a controlled final finish.',
    includes: ['Gypsum and false ceilings', 'Recessed channels and shadow gaps', 'Cove-light provisions', 'Decorative ceiling features', 'Lighting and service coordination', 'Joint treatment and finishing'],
    applications: 'Living rooms, bedrooms, kitchens, offices, retail and hospitality-style interiors.',
    materials: 'Appropriate framing, boards, jointing systems, access provisions and finish coats for the room condition.',
  },
  {
    number: '11',
    slug: 'electrical-plumbing-mep',
    shortName: 'MEP',
    title: 'Electrical, Plumbing & MEP Coordination',
    positioning: 'Concealed building services coordinated before surfaces are closed and finishes begin.',
    description:
      'We coordinate everyday electrical and plumbing execution with the architectural and interior plan. Point locations, routes and fixtures are reviewed early so switches, lights, sanitary fittings and appliances land where the finished space needs them.',
    includes: ['Electrical point and DB coordination', 'Lighting and ceiling provisions', 'Plumbing supply and waste lines', 'Kitchen and bathroom connections', 'Sanitary fixture installation', 'Drainage and concealed-service coordination'],
    applications: 'New construction, interior fit-outs, kitchens, bathrooms and renovation projects.',
    materials: 'Application-appropriate pipes, conduits, wiring accessories, fittings and fixtures selected to the agreed scope; specialist certification is coordinated where required.',
  },
  {
    number: '12',
    slug: 'flooring-finishes-renovation',
    shortName: 'Finishes',
    title: 'Flooring, Painting, Finishes & Renovation',
    positioning: 'The final surfaces—and the careful preparation beneath them—that make a project feel complete.',
    description:
      'We handle finish packages and renovation scopes with close attention to substrate preparation, alignment and junctions. Existing spaces are assessed before work begins so repairs and new finishes form one coherent result.',
    includes: ['Tile, stone and flooring installation', 'Wall preparation and painting', 'Polishing and surface finishes', 'Bathroom and kitchen renovation', 'Repairs and remodelling', 'Partial or complete property upgrades'],
    applications: 'Homes, apartments, offices, shops, bathrooms, kitchens and occupied-property upgrades.',
    materials: 'Tiles, stone, adhesives, grouts, primers, paints, polishing systems and repair materials appropriate to the existing substrate.',
  },
];

export const SERVICES_FAQS = [
  ['Do you handle complete construction projects?', 'Yes. We can coordinate the required civil, services, interior and finishing scope from site preparation through handover.'],
  ['Can I hire you only for interior work?', 'Yes. Interior design and execution can be commissioned independently for a complete property or selected rooms.'],
  ['Do you take aluminium, glass or ACP work separately?', 'Yes. These specialist packages can be delivered independently or coordinated within a wider construction or renovation project.'],
  ['Do you handle renovation projects?', 'Yes. We undertake focused kitchen or bathroom upgrades as well as partial and complete residential or commercial renovations.'],
  ['Can multiple services be combined under one quotation?', 'Yes. After reviewing the site and scope, related disciplines can be grouped into one coordinated proposal.'],
  ['How do I receive a project estimate?', 'Share the location, approximate area, drawings if available and the work you need. We will clarify the scope and arrange the next suitable step.'],
] as const;
