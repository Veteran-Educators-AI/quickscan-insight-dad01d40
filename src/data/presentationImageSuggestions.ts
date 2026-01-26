/**
 * Subject-specific detailed image prompts for the Nycologic Presents presentation builder.
 * Each prompt is 500+ words with extensive detail for high-quality AI image generation.
 * Teachers see only the short title and click to add.
 */

export interface ImageSuggestion {
  id: string;
  title: string; // Short one-line title that teachers see
  prompt: string; // Detailed 500+ word prompt for AI generation
  category: string;
}

// Helper to create rich prompts that incorporate the topic and slide title
// Now generates a pure topic description without presentation meta-language
export function createTopicSpecificPrompt(
  basePrompt: string,
  topic: string,
  slideTitle: string
): string {
  // Clean up the slide title to extract the core concept
  const cleanTitle = slideTitle.replace(/\*\*/g, '').replace(/["']/g, '');
  
  return `${basePrompt}

Create a vivid, detailed illustration about ${cleanTitle} within the context of ${topic}. Focus entirely on representing the subject matter itself - the concepts, processes, structures, or ideas involved. Show the actual content that students need to understand.

For example, if the topic is about cell division, show the actual biological process with chromosomes, spindle fibers, and cell membranes. If it's about a historical event, depict the scene, people, and setting. If it's a literary theme, visualize the metaphors and emotional content.

The image should be educational and scientifically/historically/thematically accurate. Use vibrant, engaging colors appropriate to the subject. Professional quality suitable for classroom use with high school students. No text, labels, or words in the image. High resolution with clear focal point.`;
}

// English Literature & ELA suggestions
export const literatureSuggestions: ImageSuggestion[] = [
  {
    id: 'lit-othello-jealousy',
    title: 'Othello - The Green-Eyed Monster',
    category: 'Shakespeare',
    prompt: `Create a powerful, emotionally evocative illustration that captures the destructive nature of jealousy as depicted in Shakespeare's Othello. The image should feature a dramatic composition showing the psychological torment of jealousy consuming a noble figure. 

The central element should be a dignified Moorish general figure, rendered with classical Renaissance portraiture sensibilities, whose expression conveys internal anguish and growing suspicion. Behind or around this figure, visualize jealousy as an insidious force - perhaps as creeping green tendrils, shadowy whispers, or a metaphorical "green-eyed monster" lurking at the edges of consciousness. The color palette should transition from warm, golden tones representing love and trust on one side, to sickly greens and dark shadows representing jealousy's corruption on the other.

Include symbolic elements that reference key themes from the play: a delicate handkerchief (Desdemona's strawberry-spotted handkerchief) either pristine or being corrupted, Venice's architecture in the background rendered in deep shadows, perhaps military regalia suggesting Othello's status as a general. The lighting should be dramatic, almost Caravaggio-esque, with strong chiaroscuro effects that emphasize the emotional darkness overtaking the character.

The artistic style should blend Renaissance painting techniques with modern illustration clarity. Think of the emotional intensity of Baroque art combined with the accessibility of contemporary educational illustration. The composition should draw the eye from the corrupted emotional state toward subtle symbols of the tragedy to come - perhaps wilting flowers, a dimming candle, or storm clouds gathering over Venice's spires.

The overall mood should be tragic and contemplative, helping students understand how jealousy transforms a noble hero into his own destroyer. The image should provoke discussion about the power of manipulation, the fragility of trust, and the devastating consequences of allowing negative emotions to override reason and love.

Color emphasis: Deep venetian reds, corrupted greens, golden ochres fading to shadow, midnight blues. No text, labels, or words in the image. Professional quality suitable for high school classroom projection.`,
  },
  {
    id: 'lit-othello-race',
    title: 'Othello - Race and Identity',
    category: 'Shakespeare',
    prompt: `Create a sophisticated, thought-provoking illustration exploring themes of race, identity, and otherness in Shakespeare's Othello. This image should sensitively and powerfully depict the experience of being an outsider in Venetian society while rising to a position of great power and respect.

The composition should center on a dignified, commanding figure of a Moorish general - rendered with nobility and strength - standing at the intersection of two worlds. One half of the image should represent the exotic, warm North African heritage: rich golden sands, Moroccan architectural elements, warm terracotta and amber tones, symbols of military prowess and honored service. The other half should depict Renaissance Venice: elaborate European architecture, cooler marble tones, the canals and bridges of the city, symbols of Western power structures.

The central figure should stand proudly but with a subtle expression that conveys the complex internal experience of navigating between these worlds. Around him, include visual metaphors for the prejudices he faces: perhaps whispered shadows in Venetian masks, subtle pointing fingers dissolved into the background, or the contrast between public admiration and private prejudice.

Include symbolic elements of his achievements: military medals, the Duke's favor represented by official seals or documents, Desdemona's love represented by intertwined hands or a pure white flower. But also hint at the vulnerability of his position: cracks in the Venetian marble, storm clouds on the horizon, the famous handkerchief as a symbol of how easily trust can be manipulated.

The artistic style should be dignified and respectful, drawing from both Moorish and Venetian artistic traditions. Rich, jewel-toned colors should dominate: deep purples of nobility, gold of military honor, the contrast of warm African earth tones against cool European marble. The lighting should be golden-hour warmth, suggesting both the heights of Othello's achievement and the fragility of his position.

This image should facilitate classroom discussions about representation, cultural identity, the construction of "the other," and the tragedy of internalized prejudice. It should honor the complexity of Othello's character while acknowledging the historical context of race in Renaissance Europe and Shakespeare's own complicated treatment of these themes.

No text or labels. High resolution, classroom-appropriate, thought-provoking educational illustration.`,
  },
  {
    id: 'lit-gatsby-american-dream',
    title: 'The Great Gatsby - American Dream',
    category: 'American Literature',
    prompt: `Create a stunning, evocative illustration that captures the allure and ultimate tragedy of the American Dream as depicted in F. Scott Fitzgerald's The Great Gatsby. This image should be visually striking while conveying deep thematic content about aspiration, wealth, corruption, and disillusionment in 1920s America.

The composition should feature the iconic green light at the end of Daisy's dock as a central focal point - glowing with promise across the dark waters of Long Island Sound. On one side of the water, render Gatsby's magnificent West Egg mansion ablaze with party lights, champagne towers, and the silhouettes of dancing flappers - all the glamour and excess of the Jazz Age captured in golden, electric brilliance.

Across the water, the green light should glow with an almost supernatural allure, representing not just Daisy but all the promises America makes to those who dare to dream. Behind it, suggest East Egg's old-money elegance in more subdued, established tones.

Above this scene, create a dreamlike quality in the sky: perhaps the eyes of Doctor T.J. Eckleburg watching from a weathered billboard, representing the death of spiritual values in commercial America. The eyes should be melancholy and all-seeing, rendered in faded yellows and blues against the night sky.

Include the Valley of Ashes as a smoldering, industrial wasteland between the two eggs - gray and desolate, with small figures of workers (the Wilsons of the world) toiling in forgotten poverty while wealth glitters on either side of them.

Gatsby himself should appear as a solitary figure on his dock, arm outstretched toward the green light, dressed immaculately but fundamentally alone. His posture should convey both hope and tragedy - the romantic who built an empire of dreams that could never survive contact with reality.

The color palette should be a masterwork of contrast: electric golds, champagne sparkles, and warm party lights against cool midnight blues, the sickly green of false hope, and the gray ash of industrial decay. Art Deco styling should influence the architectural elements and decorative motifs.

The overall mood should be seductively beautiful yet deeply melancholic - gorgeous enough to understand why people chased this dream, tragic enough to understand why it destroyed them.

No text or words. High-resolution, suitable for classroom projection and discussion about American values, class, and the corruption of dreams.`,
  },
  {
    id: 'lit-gatsby-class-divide',
    title: 'The Great Gatsby - Old vs New Money',
    category: 'American Literature',
    prompt: `Create a sophisticated illustration depicting the class divide between old money and new money in F. Scott Fitzgerald's The Great Gatsby. This image should visually contrast the established aristocracy of East Egg with the flashy nouveau riche of West Egg, while revealing the hollow corruption beneath both facades.

The composition should be split or bridged by the waters of Long Island Sound, with each shore representing a different approach to wealth and status in 1920s America.

On the West Egg side, render Gatsby's world of new money: a spectacularly ostentatious mansion modeled on French châteaux, with every window blazing with electric light. The grounds should overflow with the excesses of his famous parties - champagne fountains, luxury automobiles (Gatsby's iconic yellow car prominently featured), jazz musicians, flappers in beaded dresses, fireworks exploding overhead. Everything should be slightly too much, too bright, too desperate to impress - beautiful but revealing the insecurity beneath the display.

On the East Egg side, depict the understated elegance of old money: the Buchanans' colonial mansion with its massive lawns sweeping down to the water. Everything here should suggest generations of accumulated wealth - antique furniture glimpsed through windows, polo mallets and horses, a careful, curated tastfulness that doesn't need to prove anything. But include subtle hints of the moral decay within: perhaps Tom's aggressive posture, signs of careless wealth that crushes everything in its path.

Between them, show the water as a metaphorical and literal divide - crossable by boats and bridges, but representing an unbridgeable social gulf. Include subtle references to the characters: Nick's modest cottage somewhere in between, the green light glowing at the end of Daisy's dock.

The artistic style should evoke 1920s Art Deco with its geometric patterns, bold lines, and metallic accents. The color palette should contrast warm golds and champagne tones of West Egg parties with the cooler, more refined silver and cream tones of East Egg propriety.

Include visual metaphors for the corruption beneath both surfaces: perhaps reflected in the water, or in shadows, show the emptiness, the moral bankruptcy, the carelessness that eventually destroys lives.

The overall mood should be glamorous yet hollow, inviting yet ultimately critical - helping students understand that Fitzgerald criticizes both the desperate climbers and the careless aristocrats, revealing the rottenness at the core of the American class system.

No text or labels. High-resolution educational illustration suitable for classroom discussion.`,
  },
  {
    id: 'lit-macbeth-ambition',
    title: 'Macbeth - Unchecked Ambition',
    category: 'Shakespeare',
    prompt: `Create a dark, psychologically intense illustration exploring the theme of destructive ambition in Shakespeare's Macbeth. This image should capture the seductive power of ambition and its terrible consequences, visualizing how the pursuit of power corrupts and ultimately destroys.

The central composition should feature Macbeth in his transformation from honored warrior to paranoid tyrant. Render him in Scottish medieval warrior garb, but show the corruption spreading through his being. Perhaps his armor, initially gleaming, becomes tarnished and blood-stained as the eye moves across the image. His face should show the terrible cost of his choices - sleeplessness, paranoia, the guilt that "will have blood."

Rising behind and through him, visualize ambition itself as a dark, intoxicating force: perhaps thorned vines of power growing from a crown, or shadowy hands reaching upward toward a throne that floats just out of reach. The crown itself should be rendered as both magnificent and cursed - glittering with terrible beauty but dripping with blood.

Include the iconic imagery from the play: the three witches as spectral presences in swirling mist, their prophecies visible as ghostly apparitions - the dagger that leads Macbeth to murder, Banquo's bloody ghost, the line of eight kings stretching to infinity. Lady Macbeth might appear as a shadow influence, her hands raised in the famous "out, damned spot" gesture.

The Scottish landscape should be rendered as a place of wild beauty turned sinister: heath-covered moors under a blood-red sky, Dunsinane castle silhouetted against storm clouds, perhaps Birnam Wood beginning its fateful march. Ravens and other ill-omened birds might circle overhead.

The color palette should be dominated by deep, bloody reds, shadows of purple and black, the cold silver of steel and moonlight, and sickly greens of supernatural influence. Lightning might illuminate scenes of violence glimpsed in the clouds.

The artistic style should evoke medieval Scottish aesthetics combined with expressionist drama - think of the psychological intensity of German Expressionist art applied to Celtic and medieval imagery. Strong contrasts of light and shadow (chiaroscuro) should emphasize the moral darkness consuming the protagonist.

The overall mood should be tragic and cautionary, showing how the shortest path to power is often the path to destruction. This image should help students understand why "vaulting ambition" leads Macbeth to lose everything he valued in his quest for everything he desired.

No text or labels. Professional quality suitable for high school English classroom.`,
  },
  {
    id: 'lit-romeo-juliet-fate',
    title: 'Romeo and Juliet - Star-Crossed Fate',
    category: 'Shakespeare',
    prompt: `Create a romantically tragic illustration capturing the theme of fate and destiny in Shakespeare's Romeo and Juliet. This image should visualize the concept of "star-crossed lovers" while showing how the cosmic and the personal intertwine to create tragedy.

The central composition should feature the two young lovers, rendered in the style of Italian Renaissance portraiture - beautiful, idealized, but marked by tragedy. They might be positioned as reaching toward each other across some divide, or intertwined in an embrace that suggests both passion and doom. Their clothing should reflect Veronese Renaissance fashion - rich velvets, elegant cuts, the visual language of their noble houses.

Above and around them, render the stars themselves as active participants in their fate. The night sky over Verona should be alive with celestial imagery: constellations forming the shapes of crossed swords, the stars themselves seeming to write their doom, perhaps the astrological symbols associated with ill-fated love prominently featured.

The city of Verona should appear in the background, its medieval Italian architecture rendered in warm terracotta and cream tones during the day scenes, but overshadowed by the dominant night sky. Include the famous balcony, perhaps the Capulet tomb, the square where the final tragedy unfolds.

Incorporate the family feud as a visual element: perhaps the Montague and Capulet crests as opposing forces, swords crossed, or the colors of the two houses (perhaps red and blue) competing for dominance in the composition. Show how these family hatreds literally surround and constrain the lovers.

Visual symbols from the play should be woven throughout: roses and thorns representing love and pain, the vial of poison as a glinting threat, the wedding rings that bind them in secret, the morning lark and night's candles referenced in their famous parting.

The color palette should be romantically rich but shadowed by tragedy: rose pinks and passionate reds, soft candlelit golds, deep midnight blues of the fateful night sky, with touches of deathly pale and poison green foreshadowing the end.

The artistic style should blend Renaissance romanticism with theatrical drama. The composition should feel like a stage tableau while maintaining the intimacy of the lovers' private world. Think Pre-Raphaelite beauty combined with Shakespearean tragedy.

The overall mood should be achingly beautiful yet inevitably tragic - helping students understand why this story of young love destroyed by circumstances beyond their control has resonated for centuries.

No text or labels. High-resolution illustration suitable for classroom use.`,
  },
];

// History suggestions
export const historySuggestions: ImageSuggestion[] = [
  {
    id: 'hist-civil-rights-march',
    title: 'March on Washington 1963',
    category: 'Civil Rights',
    prompt: `Create a powerful, historically evocative illustration of the March on Washington for Jobs and Freedom on August 28, 1963 - one of the largest political rallies for human rights in United States history. This image should capture both the massive scale of the event and its profound emotional and historical significance.

The composition should center on the National Mall, viewed from an elevated perspective that reveals the incredible scope of the quarter-million people gathered. The Washington Monument and Lincoln Memorial should anchor the scene, providing the iconic geographical context. The Reflecting Pool should mirror the sky and the masses of people lining its edges, creating a sense of infinite multiplication of hope and determination.

In the foreground, render diverse groups of marchers - Black and white together, men and women, young and old - carrying signs with civil rights messages (the signs should be visible but the specific text abstracted to maintain the no-text rule, perhaps shown as rectangular shapes with suggested slogans). The marchers should display a range of emotions: determination, hope, exhaustion, joy, solemnity. Their clothing should accurately reflect 1963 fashion - men in suits and ties despite the summer heat (maintaining dignity), women in their Sunday best dresses.

Capture the summer atmosphere: the August heat suggested through slightly hazy atmosphere, the brilliant sunshine illuminating the sea of faces, the contrast of the white marble monuments against the sky. Perhaps show some marchers seeking shade, drinking from water fountains, or fanning themselves while maintaining their dignified stance.

Include visual references to the coalition that made the march possible: labor union banners, church groups, student organizations, civil rights organizations. Show the interconnected nature of the struggle for economic and racial justice that the march represented.

The Lincoln Memorial in the background should glow with particular significance, as this was where Dr. King delivered his "I Have a Dream" speech. Perhaps show a distant figure at the podium, the crowds pressing closer to hear words that would change history.

The color palette should be based in the reality of the documentary photographs from that day: the whites of shirts and the marble monuments, the blue summer sky, the green of the Mall's grass, the rich diversity of skin tones representing the beautiful diversity of the movement.

The artistic style should balance historical accuracy with inspirational power - not a photograph, but an illustration that captures the emotional truth of that moment when America's conscience was awakened.

The overall mood should be one of determined hope, collective power, and the possibility of change through nonviolent action.

No text or labels. High-resolution, suitable for classroom discussion of the Civil Rights Movement.`,
  },
  {
    id: 'hist-american-revolution-independence',
    title: 'Declaration of Independence',
    category: 'American Revolution',
    prompt: `Create a dramatic, historically-grounded illustration capturing the momentous signing of the Declaration of Independence in Philadelphia on July 4, 1776. This image should convey both the historic gravity of the moment and the human drama of men committing what the British Crown would consider treason.

The setting is the Assembly Room of Independence Hall (then the Pennsylvania State House) in Philadelphia. Render the Georgian architecture of the room with historical accuracy: the tall windows letting in summer light, the green baize-covered tables, the Windsor chairs where delegates sat, the rising sun carved into Washington's chair (though Washington was not present at the signing).

The composition should center on the moment of signing itself - perhaps showing a delegate at the central table with quill poised over the parchment, while other founders look on with expressions ranging from resolve to anxiety. Remember that by signing, these men were literally risking their lives, their fortunes, and their sacred honor - their faces should reflect the weight of this commitment.

Populate the scene with historically appropriate figures: men in 18th-century colonial dress - powdered wigs, knee breeches, waistcoats, and formal coats in the somber colors appropriate to the occasion. Show the diversity of ages represented, from the young firebrands to the elder statesmen. Include subtle details that remind viewers of the regional diversity: Massachusetts men alongside Virginians, Pennsylvanians with delegates from Georgia and the Carolinas.

Through the windows, suggest the city of Philadelphia outside: perhaps the cobblestone streets, period architecture, the waiting crowds who don't yet know that a new nation is being born. The summer light streaming in should illuminate the scene with an almost providential glow.

Include symbolic elements that reference the ideas being declared: perhaps the Declaration document itself is visible as an illuminated parchment, quills and ink pots arranged on the table, the seals and stamps of official proceedings. The British Crown might be subtly referenced in shadows or distant imagery, representing what is being rejected.

The color palette should reflect 18th-century American aesthetics: rich but somewhat muted colonial colors - deep burgundies, forest greens, navy blues, cream and parchment tones, the warm brown of polished wood furniture, the gleam of brass fittings and silver buckles.

The artistic style should evoke classical American history painting traditions (think Trumbull's Declaration of Independence) while maintaining accessibility for modern students. The composition should feel momentous without being pompous.

The overall mood should convey that this is a moment when brave men risked everything for principles they believed were worth dying for.

No text or labels. Professional quality for American history classroom.`,
  },
  {
    id: 'hist-wwii-dday',
    title: 'D-Day - Normandy Landing',
    category: 'World War II',
    prompt: `Create a powerful, historically-grounded illustration depicting the D-Day invasion of Normandy on June 6, 1944 - the largest amphibious military operation in history and a turning point of World War II. This image should convey the scale, sacrifice, and determination of that fateful day while remaining appropriate for educational use.

The composition should capture the beach assault from a vantage point that shows both the massive naval armada and the soldiers making their way across the deadly beach. The English Channel behind should be filled with ships stretching to the horizon - landing craft, destroyers, battleships, all representing the unprecedented scale of the operation.

In the foreground, depict soldiers wading through the surf toward the beach. Their uniforms and equipment should be historically accurate to the 1944 American, British, or Canadian forces (depending on which beach sector you choose to depict - Omaha, Utah, Gold, Juno, or Sword). Show the heavy packs, the M1 Garands or Lee-Enfields, the distinctive helmets of each nation's forces. Their postures should convey the mixture of fear and determination as they advance under fire.

The Normandy beach itself should be rendered with its distinctive features: the wide sandy expanse at low tide, the sea wall or bluffs depending on the sector, the German defenses visible as concrete bunkers and obstacles. Show the "hedgehogs" and other beach obstacles the Germans had placed to impede landing craft.

The sky should be dramatic - perhaps the pre-dawn darkness giving way to gray morning light, or the smoke and haze of battle obscuring a sky that had just cleared from the stormy weather that nearly postponed the invasion. Allied aircraft might be visible overhead, supporting the ground troops.

Capture the chaos and coordination of the assault: landing craft lowering their ramps, soldiers rushing forward, the spray of the surf, the smoke from naval bombardment. But focus on the human element - individual acts of courage amid the larger strategic operation.

The color palette should be grounded in the gray-green reality of that morning: the cold gray-blue of the Channel, the khaki and olive drab of uniforms, the pale sand of the beach, the smoke-hazed sky. Occasional accents might include the red of medical crosses, the national colors on sleeve patches.

The artistic style should honor the gravity of the subject - not glorifying violence, but acknowledging the sacrifice of those who fought and died to liberate Europe from Nazi tyranny.

The overall mood should be one of determination against overwhelming odds, the courage of ordinary men doing extraordinary things.

No text or labels. Classroom-appropriate for WWII history education.`,
  },
  {
    id: 'hist-industrial-revolution',
    title: 'Industrial Revolution Factory',
    category: 'Industrial Age',
    prompt: `Create a detailed, atmospheric illustration depicting a typical factory during the height of the Industrial Revolution in 19th-century Britain or America. This image should capture both the technological marvels of the age and the human cost of industrialization, providing material for classroom discussion of this transformative period.

The setting should be the interior of a large textile mill, iron works, or manufacturing facility during the mid-to-late 1800s. Render the soaring industrial architecture: cast iron columns and beams, large multi-paned windows (some grimy with soot), brick walls, wooden or packed-earth floors.

The machinery should be a central focus: massive steam-powered looms or mechanical equipment, their gears, wheels, belts, and drive shafts creating a complex mechanical landscape. Show the power transmission systems of the era - the overhead line shafts running the length of the building, leather belts connecting to individual machines, the steam engine visible as the heart of the operation.

Populate the scene with workers representing the reality of industrial labor: men, women, and children (child labor being tragically common) tending machines. Their clothing should be period-appropriate - simple work clothes, caps, aprons. Show the mix of skilled workers and unskilled laborers, perhaps a foreman in slightly better dress overseeing the operation.

Capture the sensory reality of the industrial workplace: steam and smoke filling the air, the suggestion of incredible noise (expressed through workers' postures - perhaps covering ears or shouting to communicate), poor ventilation indicated by the hazy atmosphere, dangerous conditions suggested by the proximity of workers to unguarded machinery.

The lighting should be dramatic: harsh light streaming through tall windows creating strong contrasts, supplemented by gas lamps or oil lamps in darker corners, the glow of fires if it's a foundry or forge. The interplay of natural and artificial light can create a cathedral-like quality that both celebrates industrial achievement and comments on its oppressive nature.

Include details that tell the social story: perhaps a clock prominently displayed (representing the tyranny of industrial time), a notice board with rules and penalties, a foreman's elevated office where management surveyed workers, a door suggesting the world outside where workers might rarely see daylight.

The color palette should be dominated by the browns and grays of industrial Britain: soot-darkened brick, iron gray machinery, the muted colors of working-class clothing, punctuated by the orange glow of furnaces or the golden light from windows.

The artistic style should evoke Victorian-era industrial illustration while maintaining educational clarity - think of the documentary quality of contemporary illustrations from London Illustrated News combined with the drama of Romantic painters responding to industrialization.

The overall mood should be complex: awe at human ingenuity alongside concern for human welfare, the beauty and the horror of the industrial age captured in a single image.

No text or labels. Professional quality for history classroom discussion.`,
  },
];

// Science suggestions
export const scienceSuggestions: ImageSuggestion[] = [
  {
    id: 'sci-cell-biology',
    title: 'Animal Cell Structure',
    category: 'Biology',
    prompt: `Create a detailed, scientifically accurate yet visually stunning illustration of a typical animal cell and its organelles. This educational image should serve as a comprehensive visual reference for students studying cell biology while being engaging enough to capture their interest.

The cell should be rendered as a three-dimensional cross-section, revealing its internal structures while maintaining the sense of a complete, spherical cell. The plasma membrane should be clearly visible as a fluid mosaic, with phospholipids and embedded proteins suggested at a level of detail appropriate for high school biology.

The nucleus should be prominently featured as the cell's control center: a large, roughly spherical structure with the nuclear envelope clearly visible, including nuclear pores. Inside, show the nucleolus as a denser region, and chromatin as the tangled genetic material. The nuclear envelope should connect visibly to the endoplasmic reticulum.

Render the endoplasmic reticulum as an extensive network: the rough ER studded with ribosomes (shown as small dots) and continuous with the nuclear envelope, the smooth ER as a more tubular network in another region of the cell. The distinction between rough and smooth should be clear.

The Golgi apparatus should appear as its characteristic stacked membrane structure (cisternae), positioned to show its role in processing and packaging - perhaps with vesicles budding from its edges, suggesting the transport of cellular products.

Mitochondria should be rendered in their classic bean-shape with clear inner and outer membranes, the inner membrane folded into cristae. Their appearance should suggest their role as the cell's powerhouses. Include several to show they exist in multiples.

Other organelles to include: lysosomes as smaller, darker vesicles (the cell's recycling centers); the centrosome with centrioles near the nucleus; peroxisomes as small spherical structures; free ribosomes scattered through the cytoplasm; the cytoskeleton suggested as a network of filaments providing structure.

The cytoplasm should be rendered as a slightly textured, translucent matrix filling the cell, giving the sense of the gel-like substance in which organelles float. Use color and transparency to create depth and help students understand the three-dimensional nature of cellular organization.

The color palette should be educational yet appealing: perhaps the nucleus in purple/violet tones, mitochondria in orange/red (suggesting energy), the ER in blue-green, the Golgi in yellow-gold, the membrane in a warm tan or pink. Colors should be distinct enough to differentiate organelles but harmonious as a composition.

The artistic style should balance scientific accuracy with visual clarity. This should look like a high-quality textbook illustration that students would actually want to study - beautiful enough to be a poster, accurate enough to be a reference.

The overall presentation should be labeled-diagram ready (though no labels should appear in the image itself) - each organelle clearly visible and identifiable by its form alone.

No text, labels, or annotations. High-resolution, suitable for biology classroom projection and study.`,
  },
  {
    id: 'sci-dna-structure',
    title: 'DNA Double Helix Structure',
    category: 'Biology/Genetics',
    prompt: `Create a stunning, scientifically accurate illustration of the DNA double helix structure that captures both the elegant beauty of this molecule and its incredible information-storage capabilities. This image should serve as a memorable visual for students learning about genetics and molecular biology.

The central composition should feature a section of the DNA double helix, rendered in three dimensions with enough length to show multiple complete turns of the spiral. The famous double helix structure should be immediately recognizable: two sugar-phosphate backbones spiraling around each other, connected by the nitrogenous base pairs in the center.

The sugar-phosphate backbones should be clearly rendered, perhaps as ribbon-like or tubular structures that twist in the characteristic right-handed helix. The alternating sugar (deoxyribose) and phosphate groups that make up each backbone should be suggested, either through color coding or subtle shape variation.

The base pairs should be the most detailed element: show the four nucleotide bases (adenine, thymine, guanine, cytosine) as distinct molecular shapes fitting together in the center. The crucial Watson-Crick base pairing (A-T with two hydrogen bonds, G-C with three hydrogen bonds) should be visible in the way the bases connect. Use distinct colors for each base type to help students visualize the pairing rules.

The hydrogen bonds connecting base pairs should be rendered as the subtle but crucial connections they are - perhaps as dotted lines, glowing connections, or some other visual device that emphasizes their role in holding the double helix together.

Include enough of the molecule to show the major and minor grooves of the helix - the spaces between the backbones that are important for protein binding. The overall proportions should be accurate to the known dimensions of DNA (approximately 2 nanometers in diameter, with each complete turn about 3.4 nanometers in length containing about 10 base pairs).

The background should enhance rather than distract: perhaps a gradient suggesting the cellular environment, or an abstract representation of the nucleus where DNA resides. Subtle suggestions of other DNA molecules or chromatin in the background can provide context without cluttering the main subject.

The color palette should be carefully chosen to aid understanding: perhaps blues and silvers for the backbones (suggesting the chemical stability), warm reds and oranges for purines (adenine, guanine), cool greens and yellows for pyrimidines (thymine, cytosine). The overall effect should be both beautiful and informative.

The artistic style should sit at the intersection of scientific illustration and fine art - accurate enough to satisfy a biologist, beautiful enough to inspire a student's wonder at the molecular basis of life.

The image should convey the sense that this elegant molecule carries the complete instructions for building and operating a living organism.

No text or labels. High-resolution, suitable for genetics and biology classroom instruction.`,
  },
  {
    id: 'sci-solar-system',
    title: 'Solar System Overview',
    category: 'Astronomy',
    prompt: `Create a breathtaking, astronomically-informed illustration of our solar system that conveys both the beauty and the scale of our cosmic neighborhood. This educational image should serve as an inspiring introduction to planetary science while being scientifically grounded.

The composition should show all eight major planets in their orbits around the Sun, though not necessarily to perfect scale (which would make the inner planets invisible). Each planet should be rendered with enough detail to be recognizable by its distinctive features, while maintaining a cohesive artistic vision.

The Sun should anchor the composition, rendered with appropriate solar features: perhaps suggestions of the corona, solar flares, or sunspots, glowing with the brilliant yellow-orange light that powers our entire system. Its dominant size should be apparent even if not to true scale.

Mercury should appear as a small, crater-scarred world close to the Sun, its gray surface baked by solar radiation. Venus should glow with its characteristic yellowish clouds, hiding its hellish surface beneath. Earth should be the most detailed: blue oceans, white clouds, green-brown continents, perhaps with the Moon visible nearby. Mars should show its distinctive red-orange hue, perhaps with polar caps visible and suggestions of Olympus Mons or Valles Marineris.

The asteroid belt should be suggested between Mars and Jupiter as a zone of rocky debris without being overdramatized as an impassable wall of rocks.

The gas giants should dominate the outer solar system: Jupiter with its Great Red Spot and cloud bands, its four Galilean moons potentially visible. Saturn should be instantly recognizable by its magnificent ring system, rendered with appropriate detail to show the ring structure. Uranus should appear in its distinctive pale blue-green, tilted on its side. Neptune should glow with deep blue, perhaps with the Great Dark Spot visible.

The Kuiper Belt might be suggested in the outer reaches, with perhaps a hint of Pluto as a dwarf planet representative of that distant region.

The orbits should be suggested rather than drawn as hard lines - perhaps as subtle elliptical paths or simply implied by the planetary positions. The three-dimensional nature of the solar system should be conveyed through careful positioning and perspective.

The background should be the black of deep space, scattered with stars that remind us our solar system is just one small part of the Milky Way galaxy. Perhaps a suggestion of the galactic plane can be visible in one direction.

The color palette should be true to astronomical reality: the blackness of space, the distinctive colors of each planet, the golden glow of the Sun, the silver-white of stars.

The artistic style should balance scientific accuracy with inspirational wonder - helping students understand the solar system while filling them with awe at its grandeur.

No text or labels. High-resolution, suitable for astronomy and earth science classroom use.`,
  },
  {
    id: 'sci-water-cycle',
    title: 'The Water Cycle',
    category: 'Earth Science',
    prompt: `Create a comprehensive, visually engaging illustration of the water cycle (hydrological cycle) that clearly depicts all major processes by which water circulates through Earth's systems. This educational image should help students understand the continuous movement of water on, above, and below the surface of the Earth.

The composition should show a complete landscape cross-section that includes ocean, land, and atmosphere, allowing all stages of the water cycle to be depicted in context. The scene might span from ocean waters on one side through coastal regions, plains, and mountains to complete the cycle.

Evaporation should be prominently shown: water vapor rising from the ocean surface (perhaps rendered as subtle upward-moving wisps or particles), from lakes and rivers, and from soil. The process of water transitioning from liquid to gas should be suggested through visual effects like heat shimmer or rising mist.

Transpiration should be depicted through vegetation: trees, plants, and crops releasing water vapor through their leaves. Perhaps show a detailed section of forest to illustrate how much water plants cycle into the atmosphere.

Condensation should be visualized in the atmosphere: the formation of clouds as water vapor cools at altitude. Show different cloud types at different levels - perhaps cumulus clouds building, or high cirrus ice clouds. The transition from invisible vapor to visible cloud should be suggested.

Precipitation should be depicted in its various forms: rain falling on lower elevations, snow falling on mountain peaks, perhaps sleet or hail in between. Show rain falling into the ocean to complete that local cycle, and rain falling on land to feed the terrestrial portion of the cycle.

Surface runoff should be clearly shown: rainwater flowing downhill through streams and rivers, eventually making its way back to the ocean. Include features like watersheds, river systems, and perhaps a waterfall for visual interest.

Infiltration and groundwater should be depicted in a cross-section view: water soaking into the soil, percolating through rock layers, collecting in aquifers, and emerging from springs to feed surface water.

The sun should be prominently featured as the energy source driving the entire cycle - perhaps with visible rays suggesting its heating power.

The color palette should be dominated by blues of water in its various forms, the greens of vegetation, the browns of earth and rock, the white of clouds and snow, and the warm yellows of sunlight. Arrows or flow lines suggesting direction of movement should be implied through visual composition rather than added graphics.

The artistic style should be clear and educational while remaining visually appealing - like a high-quality textbook diagram brought to life with artistic rendering.

No text, labels, or arrows (direction should be implied through the imagery itself). High-resolution, suitable for earth science classroom use.`,
  },
];

// Math suggestions
export const mathSuggestions: ImageSuggestion[] = [
  {
    id: 'math-golden-ratio',
    title: 'Golden Ratio in Nature & Art',
    category: 'Geometry',
    prompt: `Create an intellectually stimulating and visually beautiful illustration exploring the golden ratio (phi, approximately 1.618) as it appears in nature, art, and mathematics. This image should help students see the remarkable presence of this proportion throughout our world.

The composition should artfully combine multiple manifestations of the golden ratio in a cohesive design. The golden spiral should be a central organizing element - that elegant logarithmic spiral that appears in nautilus shells, hurricane formations, and galaxies.

Nature should be well represented: a nautilus shell cross-section showing the classic spiral chambers, sunflower seed heads displaying the Fibonacci spiraling pattern, pinecone scales arranged in their characteristic pattern, fern fronds unfurling in fractal spirals, the spiral of a galaxy suggesting cosmic proportions, perhaps a hurricane satellite view.

Art and architecture references should be included: the proportions of the Parthenon, Leonardo da Vinci's Vitruvian Man, the spiral composition in famous paintings, the proportions of the human face, perhaps classical sculpture incorporating ideal proportions.

Mathematical representations should be woven throughout: the golden rectangle with its inscribed spiral, the relationship to Fibonacci numbers (1, 1, 2, 3, 5, 8, 13...) suggested perhaps through sized elements, the geometric construction of the golden ratio, perhaps fractal patterns that demonstrate the self-similarity inherent in phi.

The composition itself should be designed using golden ratio proportions - meta-reinforcing the concept through the very structure of the illustration. Elements should be positioned according to golden section divisions of the canvas.

Human applications might be suggested: product design, typography, musical instrument proportions, architectural facades - showing how designers consciously employ these proportions for aesthetic effect.

The color palette should be harmonious and sophisticated - perhaps using colors related by golden proportions themselves, or a natural palette of ocean blues, shell creams, and organic greens that reflects the natural origins of these patterns.

The artistic style should blend scientific precision with artistic elegance. This is a celebration of the mathematics underlying beauty, and the beauty underlying mathematics. The illustration should feel like discovering a secret pattern that connects all things.

The overall mood should inspire wonder at the mathematical harmony underlying nature and art, helping students see that mathematics is not abstract but deeply embedded in the fabric of reality.

No text, numbers, or labels. High-resolution, suitable for mathematics classroom and cross-curricular discussions.`,
  },
  {
    id: 'math-pythagorean',
    title: 'Pythagorean Theorem Visualization',
    category: 'Geometry',
    prompt: `Create an elegant, clear illustration that visually proves and explains the Pythagorean theorem (a² + b² = c²), the fundamental relationship between the sides of a right triangle. This educational image should make this crucial geometric concept immediately understandable and memorable.

The central composition should feature a right triangle with sides clearly distinguished - perhaps using different colors for the two legs (a and b) and the hypotenuse (c). The triangle should be rendered at an angle that allows all three squares to be visible.

The key visual proof should show squares constructed on each side of the triangle: a square of area a² on one leg, a square of area b² on the other leg, and a square of area c² on the hypotenuse. The visual relationship between these areas should be the core message - that the two smaller squares' combined area exactly equals the area of the largest square.

To make the proof intuitive, consider showing the classic visual demonstration where the two smaller squares can be divided into pieces that exactly fill the larger square. Perhaps use color coding to show how regions from the a² and b² squares combine to fill the c² square.

Include multiple instances of the theorem at different scales or orientations, showing that the relationship holds regardless of the specific triangle dimensions (as long as it's a right triangle). Perhaps show triangles of different proportions, including the famous 3-4-5 and 5-12-13 right triangles.

Add visual interest through dimensional treatment - perhaps render the squares as three-dimensional blocks, or show the construction on a beautiful geometric surface. The right angle should be clearly marked with the traditional square symbol.

Real-world applications might be subtly suggested in the background or borders: surveying equipment, architectural drawings, navigation charts, ladder-against-wall scenarios, television screen diagonals - helping students see the practical importance of this ancient theorem.

A subtle nod to history might be included: Greek architectural elements suggesting Pythagoras's era, perhaps patterns reminiscent of ancient mathematical manuscripts or geometric floor mosaics from antiquity.

The color palette should be clean and mathematical: perhaps primary colors for the three regions to make the relationship clear, set against a neutral background that doesn't distract from the geometric relationships.

The artistic style should be clean and precise, befitting mathematical content, while remaining visually interesting. Think of beautiful mathematical visualization rather than dry textbook diagram.

The overall effect should make students see why this theorem is true, not just memorize that it is true.

No text, numbers, or labels (the geometry should speak for itself). High-resolution, suitable for geometry classroom instruction.`,
  },
];

// Generate dynamic topic-specific suggestions when no pre-built suggestions match
function generateTopicSpecificSuggestions(topic: string, slideTitle: string): ImageSuggestion[] {
  // Clean up the topic and slide title
  const cleanTopic = topic.replace(/\*\*/g, '').trim();
  const cleanSlideTitle = slideTitle.replace(/\*\*/g, '').replace(/["']/g, '').trim();
  
  // Generate 3-4 dynamic suggestions based on the actual topic
  const suggestions: ImageSuggestion[] = [
    {
      id: `dynamic-main-${Date.now()}`,
      title: `${cleanTopic} - Key Concepts`,
      category: cleanTopic,
      prompt: `Create a detailed, educational illustration about ${cleanTopic}. Focus on the core concepts, processes, and ideas that are central to understanding this topic. Show the actual subject matter with accurate visual representations. Use vibrant, engaging colors. Professional quality suitable for classroom use. No text, labels, or words in the image.`,
    },
    {
      id: `dynamic-visual-${Date.now()}`,
      title: `${cleanTopic} - Visual Representation`,
      category: cleanTopic,
      prompt: `Create a vivid visual representation of ${cleanTopic}. Illustrate the main elements and their relationships. Show real-world applications or examples where applicable. Use clear, engaging imagery that helps students understand and remember the concept. Educational quality, no text or labels.`,
    },
    {
      id: `dynamic-diagram-${Date.now()}`,
      title: `${cleanTopic} - Process Diagram`,
      category: cleanTopic,
      prompt: `Create an educational diagram illustrating the key processes or steps involved in ${cleanTopic}. Show how different components relate to each other. Use clear visual flow and engaging colors. Make the concept easy to understand through visual organization. No text, arrows only for flow direction.`,
    },
  ];
  
  // Add a slide-specific suggestion if the slide title is different from the topic
  if (cleanSlideTitle && cleanSlideTitle.toLowerCase() !== cleanTopic.toLowerCase()) {
    suggestions.push({
      id: `dynamic-slide-${Date.now()}`,
      title: `${cleanSlideTitle}`,
      category: cleanTopic,
      prompt: `Create a detailed illustration specifically about "${cleanSlideTitle}" within the context of ${cleanTopic}. Focus on accurately depicting this specific aspect or concept. Educational quality with engaging visuals. No text or labels.`,
    });
  }
  
  return suggestions;
}

// Get suggestions based on subject and topic
export function getSubjectSuggestions(
  subject: string,
  topic: string,
  slideTitle: string
): ImageSuggestion[] {
  const lowerSubject = subject.toLowerCase();
  const lowerTopic = topic.toLowerCase();
  
  let baseSuggestions: ImageSuggestion[] = [];
  
  // Match based on subject
  if (lowerSubject.includes('english') || lowerSubject.includes('ela') || lowerSubject.includes('literature')) {
    baseSuggestions = literatureSuggestions;
  } else if (lowerSubject.includes('history') || lowerSubject.includes('social studies') || lowerSubject.includes('government')) {
    baseSuggestions = historySuggestions;
  } else if (lowerSubject.includes('science') || lowerSubject.includes('biology') || lowerSubject.includes('chemistry') || lowerSubject.includes('physics') || lowerSubject.includes('earth')) {
    baseSuggestions = scienceSuggestions;
  } else if (lowerSubject.includes('math') || lowerSubject.includes('algebra') || lowerSubject.includes('geometry') || lowerSubject.includes('calculus')) {
    baseSuggestions = mathSuggestions;
  }
  
  // Also match based on topic keywords
  if (lowerTopic.includes('othello') || lowerTopic.includes('shakespeare') || lowerTopic.includes('macbeth') || lowerTopic.includes('romeo')) {
    baseSuggestions = [...baseSuggestions, ...literatureSuggestions.filter(s => 
      s.category === 'Shakespeare' || s.prompt.toLowerCase().includes(lowerTopic)
    )];
  }
  if (lowerTopic.includes('gatsby') || lowerTopic.includes('american literature') || lowerTopic.includes('fitzgerald')) {
    baseSuggestions = [...baseSuggestions, ...literatureSuggestions.filter(s => 
      s.category === 'American Literature'
    )];
  }
  if (lowerTopic.includes('civil rights') || lowerTopic.includes('revolution') || lowerTopic.includes('war') || lowerTopic.includes('industrial')) {
    baseSuggestions = [...baseSuggestions, ...historySuggestions];
  }
  if (lowerTopic.includes('cell') || lowerTopic.includes('dna') || lowerTopic.includes('biology') || lowerTopic.includes('solar') || lowerTopic.includes('water cycle')) {
    baseSuggestions = [...baseSuggestions, ...scienceSuggestions];
  }
  if (lowerTopic.includes('theorem') || lowerTopic.includes('ratio') || lowerTopic.includes('geometry') || lowerTopic.includes('pythagorean')) {
    baseSuggestions = [...baseSuggestions, ...mathSuggestions];
  }
  
  // Also check for finance/economics topics
  if (lowerTopic.includes('money') || lowerTopic.includes('finance') || lowerTopic.includes('economics') || 
      lowerTopic.includes('investment') || lowerTopic.includes('interest') || lowerTopic.includes('value')) {
    // Generate dynamic suggestions for finance topics
    return generateTopicSpecificSuggestions(topic, slideTitle);
  }
  
  // Remove duplicates
  const uniqueSuggestions = baseSuggestions.filter((s, i, arr) => 
    arr.findIndex(item => item.id === s.id) === i
  );
  
  // If no matches, generate dynamic topic-specific suggestions instead of random ones
  if (uniqueSuggestions.length === 0) {
    return generateTopicSpecificSuggestions(topic, slideTitle);
  }
  
  return uniqueSuggestions.slice(0, 8); // Limit to 8 suggestions
}

// Get all suggestions organized by category
export function getAllSuggestionsByCategory(): Record<string, ImageSuggestion[]> {
  return {
    'English Literature': literatureSuggestions,
    'History': historySuggestions,
    'Science': scienceSuggestions,
    'Mathematics': mathSuggestions,
  };
}
