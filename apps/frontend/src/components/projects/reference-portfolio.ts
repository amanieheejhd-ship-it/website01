export interface ReferenceVisual {
  id: string;
  title: string;
  scope: string;
  image: string;
}

const photo = (id: number) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1400`;

export const REFERENCE_PORTFOLIO: Record<string, ReferenceVisual[]> = {
  construction: [
    { id: 'construction-structure', title: 'Structural execution', scope: 'RCC frame · site coordination', image: photo(2219024) },
    { id: 'construction-shell', title: 'Residential shell', scope: 'Masonry · openings · envelope', image: photo(2219024) },
    { id: 'construction-site', title: 'Site delivery', scope: 'Structure · sequencing · workmanship', image: photo(1216589) },
    { id: 'construction-finish', title: 'Finished residence', scope: 'Exterior · landscape · handover', image: photo(259588) },
  ],
  interiors: [
    { id: 'interior-living', title: 'Living environment', scope: 'Furniture · lighting · finishes', image: photo(1571460) },
    { id: 'interior-bedroom', title: 'Bedroom interior', scope: 'Headboard · joinery · soft furnishing', image: photo(164595) },
    { id: 'interior-dining', title: 'Dining composition', scope: 'Lighting · furniture · wall treatment', image: photo(1571453) },
    { id: 'interior-lounge', title: 'Contemporary lounge', scope: 'Spatial styling · material palette', image: photo(276724) },
  ],
  kitchens: [
    { id: 'kitchen-island', title: 'Island kitchen', scope: 'Island · cabinetry · stone worktop', image: photo(2724749) },
    { id: 'kitchen-storage', title: 'Integrated storage', scope: 'Tall units · appliances · hardware', image: photo(1080721) },
    { id: 'kitchen-light', title: 'Warm modular kitchen', scope: 'Cabinetry · task lighting · counter', image: photo(2062426) },
    { id: 'kitchen-detail', title: 'Cabinet and counter detail', scope: 'Joinery · fixtures · finish alignment', image: photo(1599791) },
  ],
  aluminium: [
    { id: 'aluminium-opening', title: 'Large opening system', scope: 'Slim frames · sliding panels', image: photo(280222) },
    { id: 'aluminium-window', title: 'Window composition', scope: 'Profiles · glazing · weather sealing', image: photo(323780) },
    { id: 'aluminium-sliding', title: 'Sliding door system', scope: 'Large panels · track integration', image: photo(1642125) },
    { id: 'aluminium-commercial', title: 'Commercial framing', scope: 'Shopfront · mullions · installation', image: photo(323780) },
  ],
  glass: [
    { id: 'glass-partition', title: 'Glass partitioning', scope: 'Toughened glass · slim channels', image: photo(1170412) },
    { id: 'glass-shower', title: 'Shower enclosure', scope: 'Clear glass · fittings · wet area', image: photo(1457847) },
    { id: 'glass-railing', title: 'Glass balustrade', scope: 'Safety glass · edge detailing', image: photo(209296) },
    { id: 'glass-office', title: 'Office glazing', scope: 'Partitions · doors · visual openness', image: photo(1181406) },
  ],
  acp: [
    { id: 'acp-elevation', title: 'Panelled elevation', scope: 'Cladding rhythm · expressed joints', image: photo(325185) },
    { id: 'acp-commercial', title: 'Commercial frontage', scope: 'Facade panels · entrance emphasis', image: photo(269077) },
    { id: 'acp-detail', title: 'Facade detailing', scope: 'Corners · joints · substructure', image: photo(2079246) },
    { id: 'acp-feature', title: 'Feature facade', scope: 'Panel composition · exterior finish', image: photo(373912) },
  ],
  steel: [
    { id: 'steel-frame', title: 'Structural steel frame', scope: 'Fabrication · erection · connections', image: photo(236705) },
    { id: 'steel-workshop', title: 'Workshop fabrication', scope: 'Cutting · welding · finishing', image: photo(236705) },
    { id: 'steel-canopy', title: 'Steel canopy', scope: 'Supports · roof frame · installation', image: photo(256381) },
    { id: 'steel-industrial', title: 'Installed steelwork', scope: 'Frames · bracing · site assembly', image: photo(256381) },
  ],
  metalwork: [
    { id: 'metal-railing', title: 'Stair railing', scope: 'Slim balusters · handrail · finish', image: photo(2102587) },
    { id: 'metal-gate', title: 'Entrance gate', scope: 'Frame · infill · operating hardware', image: photo(534228) },
    { id: 'metal-balcony', title: 'Balcony metalwork', scope: 'Guarding · fabrication · coating', image: photo(2102587) },
    { id: 'metal-pergola', title: 'Architectural pergola', scope: 'Metal frame · shade structure', image: photo(1396122) },
  ],
  ceilings: [
    { id: 'ceiling-cove', title: 'Cove-lit ceiling', scope: 'Gypsum · indirect lighting', image: photo(1090638) },
    { id: 'ceiling-recessed', title: 'Recessed ceiling detail', scope: 'Profiles · downlights · alignment', image: photo(271795) },
    { id: 'ceiling-layered', title: 'Layered ceiling', scope: 'Levels · lighting integration', image: photo(1571458) },
    { id: 'ceiling-commercial', title: 'Commercial ceiling', scope: 'Services · lighting · finish', image: photo(380769) },
  ],
  finishes: [
    { id: 'finish-stone', title: 'Stone flooring', scope: 'Selection · laying · polishing', image: photo(6585754) },
    { id: 'finish-tile', title: 'Tile composition', scope: 'Grid · joints · edge detailing', image: photo(534151) },
    { id: 'finish-wall', title: 'Decorative wall finish', scope: 'Texture · colour · surface preparation', image: photo(2207894) },
    { id: 'finish-timber', title: 'Timber finish palette', scope: 'Floor · joinery · protective coating', image: photo(2082087) },
  ],
  renovation: [
    { id: 'renovation-room', title: 'Room renewal', scope: 'Layout · surfaces · lighting', image: photo(1910472) },
    { id: 'renovation-kitchen', title: 'Kitchen upgrade', scope: 'Cabinetry · counter · services', image: photo(3214064) },
    { id: 'renovation-bath', title: 'Bathroom upgrade', scope: 'Wet area · fixtures · finishes', image: photo(6585760) },
    { id: 'renovation-home', title: 'Residential remodelling', scope: 'Alteration · coordination · finish', image: photo(1866149) },
  ],
  commercial: [
    { id: 'commercial-office', title: 'Office fit-out', scope: 'Workstations · partitions · lighting', image: photo(1170412) },
    { id: 'commercial-retail', title: 'Retail environment', scope: 'Display · lighting · customer flow', image: photo(264507) },
    { id: 'commercial-meeting', title: 'Meeting space', scope: 'Glazing · furniture · acoustics', image: photo(1181396) },
    { id: 'commercial-workplace', title: 'Contemporary workplace', scope: 'Planning · services · finishes', image: photo(380769) },
  ],
};
