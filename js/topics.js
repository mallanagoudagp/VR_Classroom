// ── DOMAIN VOCABULARY DICTIONARIES ──
// Words that indicate domain knowledge when used in a prompt
const DOMAIN_VOCAB = {
  Physics: {
    beginner: ['force','speed','weight','light','heat','sound','energy','power','motion','push','pull','fall','fast','slow','magnet','electric','gravity','wave','ball','move'],
    intermediate: ['velocity','acceleration','momentum','friction','inertia','kinetic','potential','displacement','vector','scalar','amplitude','frequency','wavelength','refraction','reflection','diffraction','resistance','voltage','current','circuit','torque','equilibrium','newton','joule','watt'],
    advanced: ['electromagnetic','thermodynamics','entropy','quantum','photon','oscillation','angular momentum','centripetal','gravitational field','superposition','interference','polarization','capacitance','inductance','relativistic','conservation','proportional','inversely','coefficient','magnitude','dimensional analysis']
  },
  Maths: {
    beginner: ['add','subtract','multiply','divide','number','equal','plus','minus','count','shape','circle','square','triangle','angle','area','length','width','height','fraction','percent'],
    intermediate: ['equation','quadratic','polynomial','function','graph','slope','intercept','variable','coefficient','exponent','logarithm','matrix','determinant','probability','permutation','combination','derivative','integral','limit','sequence','series','ratio','proportion','trigonometry','sine','cosine','tangent'],
    advanced: ['differential','asymptote','convergence','divergence','eigenvalue','eigenvector','transformation','isomorphism','bijection','continuity','differentiable','riemann','laplace','fourier','stochastic','topology','manifold','vector space','linear independence','orthogonal']
  },
  Chemistry: {
    beginner: ['atom','element','water','air','gas','solid','liquid','metal','acid','base','mix','solution','react','burn','rust','salt','carbon','oxygen','hydrogen','iron'],
    intermediate: ['molecule','compound','ionic','covalent','bond','electron','proton','neutron','nucleus','orbital','valence','oxidation','reduction','catalyst','equilibrium','concentration','molarity','pH','electrolysis','isotope','periodic table','electronegativity','enthalpy','exothermic','endothermic'],
    advanced: ['stoichiometry','thermochemistry','hybridization','resonance','chirality','stereoisomer','nucleophilic','electrophilic','polymerization','spectroscopy','chromatography','titration','buffer','galvanic','electrolytic','coordination','lattice energy','born-haber','le chatelier','arrhenius']
  },
  Biology: {
    beginner: ['cell','plant','animal','food','body','blood','heart','brain','bone','muscle','skin','leaf','root','seed','grow','breathe','eat','water','sun','flower'],
    intermediate: ['photosynthesis','respiration','mitosis','meiosis','chromosome','gene','DNA','RNA','protein','enzyme','membrane','organelle','mitochondria','chloroplast','nucleus','tissue','organ','ecosystem','habitat','species','evolution','mutation','heredity','genotype','phenotype'],
    advanced: ['transcription','translation','ribosome','endoplasmic reticulum','golgi apparatus','lysosome','cytoskeleton','apoptosis','epigenetics','crispr','polymerase','replication','recombination','biogeochemical','trophic','symbiosis','phylogenetic','cladistics','homeostasis','neurotransmitter']
  }
};

// ── TOPIC KNOWLEDGE BASE ──
const TOPIC_DB = {
  // PHYSICS
  gravity: {
    subject: 'Physics',
    keywords: ['gravity','fall','weight','gravitational','free fall','drop','heavy','light','g=9.8','falling','heavier','lighter'],
    videoTitle: 'Gravity & Mass: Why Objects Fall Equally',
    duration: '1:12',
    keyPoints: ["Galileo's experiment at the Tower of Pisa","Gravitational acceleration g = 9.8 m/s²","Air resistance vs. vacuum conditions","F = ma — why mass cancels out in free fall"],
    concept: 'Both objects experience the same gravitational acceleration g = 9.8 m/s² regardless of mass. The gravitational force is proportional to mass, and so is the inertia. These cancel out, giving every object the same free-fall acceleration.',
    visual: 'gravity'
  },
  newton_laws: {
    subject: 'Physics',
    keywords: ['newton','law of motion','laws of motion','inertia','action reaction','f=ma','force and motion','push pull'],
    videoTitle: "Newton's Three Laws of Motion",
    duration: '1:45',
    keyPoints: ["1st Law: Objects resist changes in motion (inertia)","2nd Law: F = ma — force equals mass times acceleration","3rd Law: Every action has an equal and opposite reaction","Real-world examples: seatbelts, rockets, walking"],
    concept: "Newton's laws form the foundation of classical mechanics. The first law says objects stay at rest or in uniform motion unless acted on by a force. The second law quantifies this: F = ma. The third law states that forces always come in pairs — equal in magnitude, opposite in direction.",
    visual: 'newton'
  },
  electricity: {
    subject: 'Physics',
    keywords: ['electric','circuit','current','voltage','ohm','resistance','battery','charge','electron flow','conductor','wire','bulb','led'],
    videoTitle: "Ohm's Law & Electric Circuits",
    duration: '1:30',
    keyPoints: ["Ohm's Law: V = IR (Voltage = Current × Resistance)","Current flows from high to low potential","Resistors in series vs parallel","Power dissipation: P = VI = I²R"],
    concept: "Electric current is the flow of electrons through a conductor. Ohm's Law (V = IR) relates voltage, current, and resistance. In a series circuit, resistances add up. In parallel, the reciprocals add. This governs how every electronic device works.",
    visual: 'circuit'
  },
  waves: {
    subject: 'Physics',
    keywords: ['wave','frequency','wavelength','amplitude','sound','oscillation','vibration','hertz','transverse','longitudinal','doppler'],
    videoTitle: 'Wave Properties: Frequency, Wavelength & Amplitude',
    duration: '1:18',
    keyPoints: ["Waves transfer energy without transferring matter","v = fλ (velocity = frequency × wavelength)","Transverse vs longitudinal waves","Superposition and interference patterns"],
    concept: "A wave is a disturbance that transfers energy through a medium or space. The key properties are amplitude (height), frequency (cycles per second), and wavelength (distance between peaks). The wave equation v = fλ connects speed, frequency, and wavelength.",
    visual: 'waves'
  },
  optics: {
    subject: 'Physics',
    keywords: ['light','lens','mirror','reflection','refraction','prism','rainbow','color','spectrum','focal','image','concave','convex','snell'],
    videoTitle: 'Light & Optics: Reflection and Refraction',
    duration: '1:25',
    keyPoints: ["Law of reflection: angle of incidence = angle of reflection","Snell's law: n₁ sin θ₁ = n₂ sin θ₂","Concave mirrors converge light, convex mirrors diverge","Lenses form real and virtual images"],
    concept: "Light travels in straight lines and changes direction at boundaries between media. Reflection follows the equal-angle law. Refraction bends light according to Snell's law. Mirrors and lenses use these principles to form images used in telescopes, cameras, and our eyes.",
    visual: 'optics'
  },
  // MATHS
  quadratic: {
    subject: 'Maths',
    keywords: ['quadratic','parabola','roots','discriminant','ax²','bx+c','quadratic formula','completing the square','factoring','factor'],
    videoTitle: 'Quadratic Equations: Finding Roots',
    duration: '1:35',
    keyPoints: ["Standard form: ax² + bx + c = 0","Quadratic formula: x = (-b ± √(b²-4ac)) / 2a","Discriminant determines number of real roots","Graphically: roots are x-intercepts of the parabola"],
    concept: "A quadratic equation has the form ax² + bx + c = 0. The discriminant D = b² - 4ac tells us: if D > 0, two distinct real roots; if D = 0, one repeated root; if D < 0, no real roots (complex roots). The parabola opens up when a > 0 and down when a < 0.",
    visual: 'quadratic'
  },
  trigonometry: {
    subject: 'Maths',
    keywords: ['trigonometry','sin','cos','tan','sine','cosine','tangent','angle','triangle','hypotenuse','pythagorean','right angle','unit circle','radian'],
    videoTitle: 'Trigonometric Ratios & the Unit Circle',
    duration: '1:40',
    keyPoints: ["sin θ = opposite/hypotenuse","cos θ = adjacent/hypotenuse","tan θ = opposite/adjacent = sin θ/cos θ","Pythagorean identity: sin²θ + cos²θ = 1"],
    concept: "Trigonometry relates angles to side ratios in right triangles. The three primary ratios — sine, cosine, and tangent — can be visualized on the unit circle. As the angle sweeps around the circle, sin and cos trace smooth wave patterns, connecting geometry to periodic functions.",
    visual: 'trigonometry'
  },
  calculus: {
    subject: 'Maths',
    keywords: ['derivative','integral','differentiation','integration','calculus','limit','slope','tangent line','area under','rate of change','dy/dx'],
    videoTitle: 'Introduction to Calculus: Derivatives & Integrals',
    duration: '1:50',
    keyPoints: ["Derivative = instantaneous rate of change","f'(x) = lim h→0 [f(x+h) - f(x)] / h","Integral = area under the curve","Fundamental Theorem: differentiation and integration are inverses"],
    concept: "Calculus studies how things change. The derivative tells you the slope of a curve at any point — the instantaneous rate of change. The integral accumulates area under a curve. These two operations are inverses of each other, connected by the Fundamental Theorem of Calculus.",
    visual: 'calculus'
  },
  // CHEMISTRY
  periodic_table: {
    subject: 'Chemistry',
    keywords: ['periodic table','element','period','group','atomic number','metal','nonmetal','metalloid','alkali','halogen','noble gas'],
    videoTitle: 'The Periodic Table: Organization of Elements',
    duration: '1:28',
    keyPoints: ["Elements arranged by increasing atomic number","Rows (periods) and columns (groups) show patterns","Metals on the left, nonmetals on the right","Group determines chemical behavior (valence electrons)"],
    concept: "The periodic table organizes all known elements by atomic number. Elements in the same group (column) share similar chemical properties because they have the same number of valence electrons. Trends like electronegativity, atomic radius, and ionization energy follow predictable patterns across periods and groups.",
    visual: 'periodic'
  },
  chemical_bonds: {
    subject: 'Chemistry',
    keywords: ['bond','ionic','covalent','metallic','sharing','electron','transfer','molecule','compound','bonding','valence'],
    videoTitle: 'Chemical Bonds: Ionic vs Covalent',
    duration: '1:32',
    keyPoints: ["Ionic bonds: electron transfer between metals and nonmetals","Covalent bonds: electron sharing between nonmetals","Electronegativity difference determines bond type","Bond strength affects material properties"],
    concept: "Chemical bonds form when atoms share or transfer electrons to achieve stable electron configurations. Ionic bonds involve complete electron transfer (like NaCl), while covalent bonds involve sharing electrons (like H₂O). The type of bond determines a substance's melting point, conductivity, and solubility.",
    visual: 'bonds'
  },
  // BIOLOGY
  photosynthesis: {
    subject: 'Biology',
    keywords: ['photosynthesis','chlorophyll','sunlight','carbon dioxide','glucose','oxygen','leaf','chloroplast','light reaction','calvin cycle','plant food'],
    videoTitle: 'Photosynthesis: How Plants Make Food',
    duration: '1:45',
    keyPoints: ["6CO₂ + 6H₂O + light → C₆H₁₂O₆ + 6O₂","Light reactions occur in thylakoid membranes","Calvin cycle fixes carbon in the stroma","Chlorophyll absorbs red and blue light, reflects green"],
    concept: "Photosynthesis converts light energy into chemical energy stored in glucose. In the light-dependent reactions, water is split to produce oxygen and energy carriers (ATP, NADPH). In the Calvin cycle, CO₂ is fixed into glucose using that energy. This process is the foundation of nearly all food chains on Earth.",
    visual: 'photosynthesis'
  },
  cell_biology: {
    subject: 'Biology',
    keywords: ['cell','organelle','membrane','nucleus','mitochondria','ribosome','cytoplasm','prokaryote','eukaryote','cell wall','cell structure'],
    videoTitle: 'Cell Structure: The Building Blocks of Life',
    duration: '1:38',
    keyPoints: ["Cells are the basic unit of life","Nucleus contains DNA and controls the cell","Mitochondria are the powerhouses (ATP production)","Plant cells have cell walls and chloroplasts"],
    concept: "Every living organism is made of cells. Eukaryotic cells contain membrane-bound organelles: the nucleus houses DNA, mitochondria produce energy (ATP), the endoplasmic reticulum synthesizes proteins and lipids, and the Golgi apparatus packages and ships molecules. Plant cells additionally have rigid cell walls and chloroplasts for photosynthesis.",
    visual: 'cell'
  },
  dna: {
    subject: 'Biology',
    keywords: ['dna','gene','chromosome','genetic','heredity','double helix','base pair','adenine','thymine','guanine','cytosine','replication','mutation'],
    videoTitle: 'DNA: The Blueprint of Life',
    duration: '1:42',
    keyPoints: ["DNA is a double helix of nucleotides","Base pairing: A-T and G-C","DNA replication is semi-conservative","Genes encode proteins that determine traits"],
    concept: "DNA (deoxyribonucleic acid) carries the genetic instructions for all living organisms. It consists of two strands twisted into a double helix, connected by complementary base pairs: Adenine with Thymine, Guanine with Cytosine. During replication, each strand serves as a template for a new complementary strand, ensuring genetic information is faithfully copied.",
    visual: 'dna'
  }
};

// ── MANIM VISUAL GENERATORS (topic-specific SVGs) ──
function generateManimForTopic(topicId) {
  const uid = Math.random().toString(36).slice(2,8);
  const bg = `<defs>
    <radialGradient id="bg-${uid}" cx="50%" cy="50%" r="50%"><stop offset="0%" style="stop-color:#1e3a8a"/><stop offset="100%" style="stop-color:#0f172a"/></radialGradient>
    <filter id="gl-${uid}"><feGaussianBlur stdDeviation="3" result="c"/><feMerge><feMergeNode in="c"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs><rect width="400" height="220" fill="url(#bg-${uid})"/>`;
  const grid = `<line x1="0" y1="110" x2="400" y2="110" stroke="#1e40af" stroke-width="1" stroke-opacity="0.4"/>
    <line x1="200" y1="0" x2="200" y2="220" stroke="#1e40af" stroke-width="1" stroke-opacity="0.4"/>`;
  const particles = [...Array(5)].map((_,i)=>`<circle cx="${40+i*80}" cy="${50+Math.sin(i)*35}" r="2" fill="#60a5fa" opacity="0.5"><animate attributeName="cy" values="${50+Math.sin(i)*35};${30+Math.sin(i)*35};${50+Math.sin(i)*35}" dur="${1.5+i*0.3}s" repeatCount="indefinite"/></circle>`).join('');

  const visuals = {
    gravity: `${grid}
      <line x1="20" y1="110" x2="380" y2="110" stroke="#3b82f6" stroke-width="2"/>
      <line x1="200" y1="200" x2="200" y2="20" stroke="#3b82f6" stroke-width="2"/>
      <path d="M 60,180 Q 200,30 340,180" stroke="#60a5fa" stroke-width="2.5" fill="none" filter="url(#gl-${uid})" stroke-dasharray="300"><animate attributeName="stroke-dashoffset" from="300" to="0" dur="2s" repeatCount="indefinite"/></path>
      <circle cx="200" cy="110" r="8" fill="#3b82f6" filter="url(#gl-${uid})"><animateMotion dur="3s" repeatCount="indefinite"><mpath href="#gp-${uid}"/></animateMotion></circle>
      <path id="gp-${uid}" d="M 60,180 Q 200,30 340,180" fill="none"/>
      <text x="320" y="130" fill="#93c5fd" font-size="12" font-family="monospace">g = 9.8</text>
      <text x="320" y="145" fill="#93c5fd" font-size="10" font-family="monospace">m/s²</text>
      <text x="60" y="100" fill="#fbbf24" font-size="11" font-family="monospace">F = ma</text>`,
    newton: `${grid}
      <rect x="80" y="90" width="40" height="40" rx="4" fill="#3b82f6" opacity="0.8"><animate attributeName="x" values="80;280;80" dur="4s" repeatCount="indefinite"/></rect>
      <line x1="120" y1="110" x2="190" y2="110" stroke="#fbbf24" stroke-width="3" marker-end="url(#arr)"><animate attributeName="x2" values="190;260;190" dur="4s" repeatCount="indefinite"/></line>
      <text x="140" y="80" fill="#fbbf24" font-size="14" font-family="monospace" font-weight="bold">F = ma</text>
      <text x="60" y="180" fill="#34d399" font-size="11" font-family="monospace">Action</text>
      <text x="280" y="180" fill="#f87171" font-size="11" font-family="monospace">Reaction</text>
      <line x1="100" y1="165" x2="160" y2="165" stroke="#34d399" stroke-width="2"/>
      <line x1="300" y1="165" x2="240" y2="165" stroke="#f87171" stroke-width="2"/>
      <text x="120" y="40" fill="#93c5fd" font-size="12" font-family="monospace">Newton's Laws</text>`,
    circuit: `
      <rect x="60" y="60" width="280" height="100" rx="8" fill="none" stroke="#3b82f6" stroke-width="2.5"/>
      <rect x="50" y="90" width="20" height="40" rx="2" fill="#fbbf24" stroke="#f59e0b" stroke-width="1"/>
      <text x="52" y="85" fill="#fbbf24" font-size="10" font-family="monospace">+</text>
      <text x="52" y="145" fill="#fbbf24" font-size="10" font-family="monospace">−</text>
      <rect x="180" y="52" width="40" height="16" rx="3" fill="#8b5cf6"/>
      <text x="185" y="64" fill="#fff" font-size="9" font-family="monospace">R</text>
      <circle cx="300" cy="110" r="15" fill="none" stroke="#fbbf24" stroke-width="2"><animate attributeName="opacity" values="0.3;1;0.3" dur="1s" repeatCount="indefinite"/></circle>
      <text x="294" y="115" fill="#fbbf24" font-size="14">💡</text>
      <circle cx="120" cy="60" r="4" fill="#60a5fa"><animate attributeName="cx" values="70;340;340;70;70" dur="3s" repeatCount="indefinite"/><animate attributeName="cy" values="110;110;60;60;110" dur="3s" repeatCount="indefinite"/></circle>
      <text x="100" y="190" fill="#93c5fd" font-size="14" font-family="monospace" font-weight="bold">V = IR</text>
      <text x="240" y="190" fill="#34d399" font-size="11" font-family="monospace">P = VI</text>`,
    waves: `${grid}
      <path d="M 20,110 Q 60,50 100,110 Q 140,170 180,110 Q 220,50 260,110 Q 300,170 340,110 Q 360,80 380,110" stroke="#60a5fa" stroke-width="2.5" fill="none" filter="url(#gl-${uid})">
        <animate attributeName="d" values="M 20,110 Q 60,50 100,110 Q 140,170 180,110 Q 220,50 260,110 Q 300,170 340,110 Q 360,80 380,110;M 20,110 Q 60,170 100,110 Q 140,50 180,110 Q 220,170 260,110 Q 300,50 340,110 Q 360,140 380,110;M 20,110 Q 60,50 100,110 Q 140,170 180,110 Q 220,50 260,110 Q 300,170 340,110 Q 360,80 380,110" dur="2s" repeatCount="indefinite"/>
      </path>
      <line x1="60" y1="60" x2="60" y2="110" stroke="#fbbf24" stroke-width="1.5" stroke-dasharray="4"/>
      <text x="30" y="55" fill="#fbbf24" font-size="10" font-family="monospace">A</text>
      <line x1="100" y1="200" x2="260" y2="200" stroke="#34d399" stroke-width="1.5"/>
      <text x="155" y="215" fill="#34d399" font-size="10" font-family="monospace">λ</text>
      <text x="40" y="30" fill="#93c5fd" font-size="13" font-family="monospace">v = fλ</text>
      <text x="280" y="30" fill="#a78bfa" font-size="11" font-family="monospace">f (Hz)</text>`,
    optics: `
      <line x1="20" y1="110" x2="180" y2="110" stroke="#fbbf24" stroke-width="2"><animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite"/></line>
      <line x1="180" y1="110" x2="380" y2="60" stroke="#f87171" stroke-width="2"/>
      <line x1="180" y1="110" x2="380" y2="160" stroke="#60a5fa" stroke-width="2" stroke-dasharray="6"/>
      <line x1="180" y1="20" x2="180" y2="200" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="4"/>
      <ellipse cx="180" cy="110" rx="8" ry="60" fill="none" stroke="#8b5cf6" stroke-width="2"/>
      <text x="30" y="100" fill="#fbbf24" font-size="11" font-family="monospace">Incident</text>
      <text x="300" y="55" fill="#f87171" font-size="11" font-family="monospace">Reflected</text>
      <text x="300" y="175" fill="#60a5fa" font-size="11" font-family="monospace">Refracted</text>
      <text x="60" y="195" fill="#93c5fd" font-size="12" font-family="monospace">n₁ sin θ₁ = n₂ sin θ₂</text>`,
    quadratic: `${grid}
      <path d="M 60,190 Q 200,10 340,190" stroke="#a78bfa" stroke-width="3" fill="none" filter="url(#gl-${uid})"><animate attributeName="stroke-dashoffset" from="300" to="0" dur="2s" repeatCount="indefinite"/></path>
      <circle cx="110" cy="130" r="6" fill="#34d399"><animate attributeName="r" values="6;9;6" dur="1.5s" repeatCount="indefinite"/></circle>
      <circle cx="290" cy="130" r="6" fill="#34d399"><animate attributeName="r" values="6;9;6" dur="1.5s" repeatCount="indefinite"/></circle>
      <text x="95" y="155" fill="#34d399" font-size="10" font-family="monospace">root₁</text>
      <text x="275" y="155" fill="#34d399" font-size="10" font-family="monospace">root₂</text>
      <text x="30" y="30" fill="#a78bfa" font-size="13" font-family="monospace" font-weight="bold">ax² + bx + c = 0</text>
      <text x="50" y="210" fill="#93c5fd" font-size="11" font-family="monospace">x = (-b ± √(b²-4ac)) / 2a</text>`,
    trigonometry: `
      <circle cx="150" cy="110" r="70" fill="none" stroke="#3b82f6" stroke-width="2"/>
      <line x1="150" y1="110" x2="220" y2="110" stroke="#94a3b8" stroke-width="1"/>
      <line x1="150" y1="110" x2="199" y2="61" stroke="#fbbf24" stroke-width="2"/>
      <line x1="199" y1="61" x2="199" y2="110" stroke="#f87171" stroke-width="2" stroke-dasharray="4"/>
      <line x1="150" y1="110" x2="199" y2="110" stroke="#34d399" stroke-width="2" stroke-dasharray="4"/>
      <text x="200" y="90" fill="#f87171" font-size="10" font-family="monospace">sin θ</text>
      <text x="155" y="125" fill="#34d399" font-size="10" font-family="monospace">cos θ</text>
      <path d="M 255,180 Q 275,120 295,180 Q 315,240 335,180 Q 355,120 375,180" stroke="#a78bfa" stroke-width="2" fill="none"><animate attributeName="d" values="M 255,180 Q 275,120 295,180 Q 315,240 335,180 Q 355,120 375,180;M 255,180 Q 275,240 295,180 Q 315,120 335,180 Q 355,240 375,180;M 255,180 Q 275,120 295,180 Q 315,240 335,180 Q 355,120 375,180" dur="3s" repeatCount="indefinite"/></path>
      <text x="280" y="100" fill="#a78bfa" font-size="11" font-family="monospace">sin wave</text>
      <text x="60" y="30" fill="#93c5fd" font-size="12" font-family="monospace">sin²θ + cos²θ = 1</text>`,
    calculus: `${grid}
      <path d="M 40,180 C 100,180 150,40 200,100 C 250,160 300,30 360,50" stroke="#60a5fa" stroke-width="2.5" fill="none" filter="url(#gl-${uid})"/>
      <path d="M 40,180 C 100,180 150,40 200,100 C 250,160 300,30 360,50 L 360,200 L 40,200 Z" fill="rgba(96,165,250,0.15)"/>
      <line x1="180" y1="50" x2="220" y2="130" stroke="#fbbf24" stroke-width="2"/>
      <circle cx="200" cy="90" r="5" fill="#fbbf24"/>
      <text x="225" y="95" fill="#fbbf24" font-size="10" font-family="monospace">tangent</text>
      <text x="300" y="195" fill="#60a5fa" font-size="10" font-family="monospace">∫f(x)dx</text>
      <text x="40" y="30" fill="#93c5fd" font-size="13" font-family="monospace" font-weight="bold">dy/dx</text>
      <text x="180" y="210" fill="#34d399" font-size="10" font-family="monospace">area under curve</text>`,
    periodic: `
      ${[0,1,2,3,4,5,6,7].map((c)=>[0,1,2,3].map((r)=>{const colors=['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#6366f1','#14b8a6','#f97316'];return `<rect x="${35+c*42}" y="${30+r*45}" width="36" height="38" rx="4" fill="${colors[(c+r)%8]}" opacity="0.7"><animate attributeName="opacity" values="0.5;0.9;0.5" dur="${1.5+c*0.2}s" repeatCount="indefinite"/></rect><text x="${45+c*42}" y="${55+r*45}" fill="#fff" font-size="10" font-family="monospace" font-weight="bold">${['H','He','Li','Be','B','C','N','O','Na','Mg','Al','Si','P','S','Cl','Ar','K','Ca','Fe','Cu','Zn','Br','Ag','Au','Pt','I','Xe','Rn','Fr','Ra','Hg','Pb'][(c+r*8)%32]}</text>`;}).join('')).join('')}
      <text x="40" y="215" fill="#93c5fd" font-size="11" font-family="monospace">Periodic Table of Elements</text>`,
    bonds: `
      <circle cx="120" cy="90" r="30" fill="none" stroke="#3b82f6" stroke-width="2"/>
      <text x="110" y="95" fill="#60a5fa" font-size="14" font-family="monospace" font-weight="bold">Na</text>
      <circle cx="280" cy="90" r="30" fill="none" stroke="#10b981" stroke-width="2"/>
      <text x="273" y="95" fill="#34d399" font-size="14" font-family="monospace" font-weight="bold">Cl</text>
      <circle cx="155" cy="85" r="5" fill="#fbbf24"><animate attributeName="cx" values="155;245;245;155" dur="3s" repeatCount="indefinite"/></circle>
      <text x="175" y="75" fill="#fbbf24" font-size="10" font-family="monospace">e⁻ transfer</text>
      <line x1="150" y1="90" x2="250" y2="90" stroke="#fbbf24" stroke-width="1.5" stroke-dasharray="6"><animate attributeName="stroke-dashoffset" from="12" to="0" dur="0.5s" repeatCount="indefinite"/></line>
      <text x="160" y="50" fill="#93c5fd" font-size="12" font-family="monospace">Ionic Bond</text>
      <circle cx="120" cy="180" r="20" fill="none" stroke="#8b5cf6" stroke-width="2"/>
      <circle cx="200" cy="180" r="20" fill="none" stroke="#8b5cf6" stroke-width="2"/>
      <ellipse cx="160" cy="180" rx="25" ry="12" fill="rgba(139,92,246,0.2)" stroke="#a78bfa" stroke-width="1.5"/>
      <text x="140" y="215" fill="#a78bfa" font-size="11" font-family="monospace">Covalent</text>`,
    photosynthesis: `
      <circle cx="60" cy="50" r="28" fill="#fbbf24" opacity="0.8"><animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite"/></circle>
      <text x="48" y="55" fill="#92400e" font-size="12" font-family="monospace">☀️</text>
      <line x1="90" y1="65" x2="140" y2="90" stroke="#fbbf24" stroke-width="1.5" stroke-dasharray="4"><animate attributeName="opacity" values="0.3;1;0.3" dur="1s" repeatCount="indefinite"/></line>
      <ellipse cx="200" cy="120" rx="60" ry="40" fill="#166534" opacity="0.6" rx="60"/>
      <ellipse cx="200" cy="120" rx="45" ry="28" fill="#22c55e" opacity="0.4"/>
      <text x="175" y="125" fill="#fff" font-size="11" font-family="monospace">Leaf</text>
      <text x="30" y="140" fill="#60a5fa" font-size="10" font-family="monospace">CO₂+H₂O</text>
      <text x="290" y="100" fill="#34d399" font-size="10" font-family="monospace">C₆H₁₂O₆</text>
      <text x="290" y="140" fill="#93c5fd" font-size="10" font-family="monospace">+ O₂</text>
      <text x="60" y="200" fill="#86efac" font-size="12" font-family="monospace" font-weight="bold">6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂</text>`,
    cell: `
      <ellipse cx="200" cy="110" rx="150" ry="80" fill="rgba(59,130,246,0.1)" stroke="#3b82f6" stroke-width="2"/>
      <circle cx="200" cy="100" r="30" fill="rgba(139,92,246,0.2)" stroke="#8b5cf6" stroke-width="2"/>
      <text x="185" y="105" fill="#a78bfa" font-size="11" font-family="monospace">Nucleus</text>
      <ellipse cx="120" cy="130" rx="20" ry="12" fill="rgba(16,185,129,0.3)" stroke="#10b981" stroke-width="1.5"/>
      <text x="100" y="155" fill="#34d399" font-size="8" font-family="monospace">Mito</text>
      <ellipse cx="280" cy="90" rx="18" ry="10" fill="rgba(245,158,11,0.3)" stroke="#f59e0b" stroke-width="1.5"/>
      <text x="265" y="80" fill="#fbbf24" font-size="8" font-family="monospace">ER</text>
      <circle cx="300" cy="140" r="10" fill="rgba(239,68,68,0.2)" stroke="#ef4444" stroke-width="1.5"/>
      <text x="285" y="160" fill="#f87171" font-size="8" font-family="monospace">Golgi</text>
      ${[...Array(6)].map((_,i)=>`<circle cx="${100+i*35}" cy="${70+Math.sin(i*1.2)*15}" r="3" fill="#60a5fa" opacity="0.5"><animate attributeName="cy" values="${70+Math.sin(i*1.2)*15};${60+Math.sin(i*1.2)*15};${70+Math.sin(i*1.2)*15}" dur="${1+i*0.2}s" repeatCount="indefinite"/></circle>`).join('')}
      <text x="130" y="210" fill="#93c5fd" font-size="12" font-family="monospace">Eukaryotic Cell</text>`,
    dna: `
      ${[...Array(10)].map((_,i)=>{const y=20+i*20;const xL=160+Math.sin(i*0.7)*40;const xR=240-Math.sin(i*0.7)*40;const colors=[['#ef4444','#3b82f6'],['#fbbf24','#10b981']];const c=colors[i%2];return `<circle cx="${xL}" cy="${y}" r="6" fill="${c[0]}"/><circle cx="${xR}" cy="${y}" r="6" fill="${c[1]}"/><line x1="${xL+6}" y1="${y}" x2="${xR-6}" y2="${y}" stroke="#94a3b8" stroke-width="1.5"/>`;}).join('')}
      <path d="${[...Array(10)].map((_,i)=>`${i===0?'M':'L'} ${160+Math.sin(i*0.7)*40} ${20+i*20}`).join(' ')}" fill="none" stroke="#ef4444" stroke-width="1.5" opacity="0.5"/>
      <path d="${[...Array(10)].map((_,i)=>`${i===0?'M':'L'} ${240-Math.sin(i*0.7)*40} ${20+i*20}`).join(' ')}" fill="none" stroke="#3b82f6" stroke-width="1.5" opacity="0.5"/>
      <text x="30" y="60" fill="#ef4444" font-size="10" font-family="monospace">A-T</text>
      <text x="30" y="80" fill="#fbbf24" font-size="10" font-family="monospace">G-C</text>
      <text x="300" y="110" fill="#93c5fd" font-size="12" font-family="monospace">Double</text>
      <text x="300" y="128" fill="#93c5fd" font-size="12" font-family="monospace">Helix</text>`
  };

  const svg = visuals[topicId] || visuals.gravity;
  return `<svg class="manim-svg" viewBox="0 0 400 220" xmlns="http://www.w3.org/2000/svg">${bg}${svg}${particles}</svg>`;
}

// ── COMMON ENGLISH WORD SET (for spelling accuracy check) ──
const COMMON_EN_WORDS = new Set([
  'the','and','for','are','but','not','you','all','can','had','her','was','one','our',
  'out','day','get','has','him','his','how','its','may','new','now','old','see','two',
  'who','did','let','put','say','she','too','use','way','will','with','able',
  'also','been','come','does','done','each','from','give','good','have','here','just','know',
  'last','left','life','like','long','made','make','many','more','most','much','must','name',
  'need','next','over','part','same','seem','some','take','than','that','them','then','they',
  'this','time','very','want','well','went','were','what','when','whom','will','with','year',
  'your','about','after','again','along','among','asked','being','bring','built','carry',
  'cause','clear','close','could','cover','cross','earth','every','found','gives','going',
  'great','group','heard','house','large','later','light','lived','means','model','never',
  'night','often','order','other','place','plant','point','right','river','shown','since',
  'small','sound','state','still','story','study','their','there','these','think','three',
  'those','under','until','where','which','while','white','whole','whose','world','would',
  'write','young','above','added','always','answer','around','before','below','between',
  'called','change','chapter','children','complete','contain','continue','country','decided',
  'different','during','example','explain','family','follow','given','happen','important',
  'include','keep','kind','known','learn','less','letter','level','list','little','lived',
  'longer','look','main','might','miss','move','never','number','often','open','outside',
  'own','people','perhaps','picture','problem','produce','provide','question','rather','read',
  'reason','result','return','run','seen','sentence','several','should','simple','something',
  'sometimes','soon','start','stop','strong','surface','system','through','together','told',
  'took','toward','true','turn','understand','usually','various','walk','watch','without',
  'what','why','how','when','where','which','who','explain','describe','define','tell',
  'show','calculate','derive','prove','compare','contrast','difference','between','example',
  'means','work','happen','cause','effect','result','apply','real','life','used','help',
  'concept','theory','law','rule','formula','equation','principle','method','process',
  'type','kind','form','class','case','fact','idea','mind','note','test','term','unit',
  'list','step','role','rate','base','area','data','body','cell','draw',
  'page','code','view','plan','link','sort','mark','sign','line','size','speed',
  'one','two','three','four','five','six','seven','eight','nine','ten','first','second',
  'third','last','next','same','other','new','old','big','small','high','low','long',
  'short','fast','slow','hot','cold','hard','soft','full','half','open','closed','true',
  'false','right','wrong','good','bad','best','most','less','more','much','many','few',
]);

function analyzeSpelling(words) {
  const domainSet = new Set();
  Object.values(DOMAIN_VOCAB).forEach(levels =>
    Object.values(levels).forEach(list =>
      list.forEach(w => w.split(' ').forEach(part => domainSet.add(part.toLowerCase())))
    )
  );

  const meaningful = words.filter(w => w.length > 2);
  if (meaningful.length === 0) return 0.5;

  let validCount = 0;
  meaningful.forEach(word => {
    if (COMMON_EN_WORDS.has(word) || domainSet.has(word) || word.length <= 2 || /^\d+$/.test(word)) {
      validCount++;
    } else {
      const hasVowel = /[aeiou]/i.test(word);
      if (hasVowel && word.length <= 14) validCount += 0.6;
    }
  });

  return Math.min(1, validCount / meaningful.length);
}

function analyzeSentenceClarity(text) {
  const trimmed = text.trim();
  let score = 0;
  if (/^[A-Z]/.test(trimmed)) score += 0.10;
  if (/[?.!]$/.test(trimmed)) score += 0.10;
  const intentPattern = /\b(what|why|how|when|where|which|who|explain|describe|define|tell|show|calculate|derive|prove|compare|difference|example|understand|help)\b/i;
  if (intentPattern.test(trimmed)) score += 0.25;
  const verbPattern = /\b(is|are|was|were|do|does|did|will|would|can|could|should|have|has|had|be|been|make|work|happen|cause|mean|give|get|find|use|apply|relate)\b/i;
  if (verbPattern.test(trimmed)) score += 0.20;
  const wordCount = trimmed.split(/\s+/).filter(w => w.length > 0).length;
  if (wordCount >= 5 && wordCount <= 30) score += 0.20;
  else if (wordCount >= 3) score += 0.10;
  if (trimmed !== trimmed.toUpperCase()) score += 0.05;
  if (/\s/.test(trimmed)) score += 0.10;
  return Math.min(1, score);
}

function analyzePromptVocabulary(text, subject) {
  const words = text.toLowerCase().replace(/[^a-zA-Z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2);
  const dict = DOMAIN_VOCAB[subject] || DOMAIN_VOCAB.Physics;

  let beginnerHits = 0, intermediateHits = 0, advancedHits = 0;
  const matchedTerms = [];

  words.forEach(word => {
    if (dict.advanced.some(t => word.includes(t) || t.includes(word))) {
      advancedHits++; matchedTerms.push({ word, level: 'advanced' });
    } else if (dict.intermediate.some(t => word.includes(t) || t.includes(word))) {
      intermediateHits++; matchedTerms.push({ word, level: 'intermediate' });
    } else if (dict.beginner.some(t => word.includes(t) || t.includes(word))) {
      beginnerHits++; matchedTerms.push({ word, level: 'beginner' });
    }
  });

  const totalHits = beginnerHits + intermediateHits + advancedHits;
  let domainScore;
  if (totalHits === 0) {
    domainScore = 0.20;
  } else {
    const weightedSum = (beginnerHits * 0.25) + (intermediateHits * 0.55) + (advancedHits * 0.95);
    const rawScore = weightedSum / totalHits;
    const coverageBonus = Math.min(0.15, totalHits * 0.03);
    domainScore = Math.min(0.80, rawScore + coverageBonus);
  }

  const spellingAcc = analyzeSpelling(words);
  const clarityAcc = analyzeSentenceClarity(text);
  const linguisticBonus = Math.min(0.20, (spellingAcc * 0.10) + (clarityAcc * 0.10));
  const finalScore = Math.min(1, Math.max(0, domainScore + linguisticBonus));

  const level = finalScore >= 0.70 ? 'advanced' : finalScore >= 0.45 ? 'intermediate' : 'basic';
  return {
    score: finalScore,
    domainScore,
    spellingScore: spellingAcc,
    clarityScore: clarityAcc,
    linguisticBonus,
    matchedTerms,
    level,
    totalHits,
    beginnerHits,
    intermediateHits,
    advancedHits,
  };
}

// ── TOPIC MATCHER ──
function matchTopic(text, subject) {
  const lower = text.toLowerCase();
  let bestMatch = null;
  let bestScore = 0;

  for (const [id, topic] of Object.entries(TOPIC_DB)) {
    // Only consider topics that match the subject (or all if no specific match)
    let subjectMatch = !subject || topic.subject === subject;
    let score = 0;

    topic.keywords.forEach(kw => {
      if (lower.includes(kw.toLowerCase())) {
        score += kw.length; // longer keyword matches = more specific = higher score
      }
    });

    // Boost score if subject matches
    if (subjectMatch) score *= 1.5;

    if (score > bestScore) {
      bestScore = score;
      bestMatch = { ...topic, topicId: id };
    }
  }

  // Fallback: pick a default topic for the subject
  if (!bestMatch) {
    const defaults = { Physics: 'gravity', Maths: 'quadratic', Chemistry: 'periodic_table', Biology: 'cell_biology' };
    const fallbackId = defaults[subject] || 'gravity';
    bestMatch = { ...TOPIC_DB[fallbackId], topicId: fallbackId };
  }

  return bestMatch;
}
