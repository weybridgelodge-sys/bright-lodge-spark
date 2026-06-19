// Seed catalogues for the Member Development module.
// Idempotent: rows are upserted by (member_id, stage, topic) / (member_id, ritual_group, piece).

export type ChecklistSeed = { stage: string; topic: string };
export type RitualSeed = { ritual_group: string; piece: string; degree: string | null };

export const CHECKLIST_STAGES = [
  "Pre-Initiation",
  "First Degree — Entered Apprentice",
  "Second Degree — Fellow Craft",
  "Third Degree — Master Mason",
  "Royal Arch",
  "Lodge Knowledge",
  "General Masonic Development",
] as const;

export const CHECKLIST_CATALOGUE: ChecklistSeed[] = [
  // Pre-Initiation
  { stage: "Pre-Initiation", topic: "Masonic background explained" },
  { stage: "Pre-Initiation", topic: "Lodge history shared" },
  { stage: "Pre-Initiation", topic: "Meeting format and dress code explained" },
  { stage: "Pre-Initiation", topic: "Introduction to key officers" },
  { stage: "Pre-Initiation", topic: "Festive Board customs and toasts explained" },
  { stage: "Pre-Initiation", topic: "Questions answered" },
  { stage: "Pre-Initiation", topic: "Candidate's family/partner briefed" },
  { stage: "Pre-Initiation", topic: "Obligations discussed" },
  // First Degree — Entered Apprentice
  { stage: "First Degree — Entered Apprentice", topic: "Initiation completed" },
  { stage: "First Degree — Entered Apprentice", topic: "Signs, tokens and words explained" },
  { stage: "First Degree — Entered Apprentice", topic: "Entered Apprentice Song attended" },
  { stage: "First Degree — Entered Apprentice", topic: "Initiates Chain explained" },
  { stage: "First Degree — Entered Apprentice", topic: "First Degree tracing board discussed" },
  { stage: "First Degree — Entered Apprentice", topic: "Working tools explained" },
  { stage: "First Degree — Entered Apprentice", topic: "Recommended reading provided" },
  { stage: "First Degree — Entered Apprentice", topic: "Ritual script provided" },
  { stage: "First Degree — Entered Apprentice", topic: "First LoI attendance" },
  { stage: "First Degree — Entered Apprentice", topic: "Participated in First Degree LoI work" },
  { stage: "First Degree — Entered Apprentice", topic: "Check-in meeting at month 1" },
  { stage: "First Degree — Entered Apprentice", topic: "Check-in meeting at month 3" },
  { stage: "First Degree — Entered Apprentice", topic: "Check-in meeting at month 6" },
  // Second Degree — Fellow Craft
  { stage: "Second Degree — Fellow Craft", topic: "Assessed as ready" },
  { stage: "Second Degree — Fellow Craft", topic: "Passing completed" },
  { stage: "Second Degree — Fellow Craft", topic: "Signs, tokens and words explained" },
  { stage: "Second Degree — Fellow Craft", topic: "Tracing board discussed" },
  { stage: "Second Degree — Fellow Craft", topic: "Working tools explained" },
  { stage: "Second Degree — Fellow Craft", topic: "Middle Chamber lecture discussed" },
  { stage: "Second Degree — Fellow Craft", topic: "Ritual script provided" },
  { stage: "Second Degree — Fellow Craft", topic: "Participated in Second Degree LoI work" },
  { stage: "Second Degree — Fellow Craft", topic: "Check-in meeting" },
  // Third Degree — Master Mason
  { stage: "Third Degree — Master Mason", topic: "Assessed as ready" },
  { stage: "Third Degree — Master Mason", topic: "Raising completed" },
  { stage: "Third Degree — Master Mason", topic: "Signs, tokens and words explained" },
  { stage: "Third Degree — Master Mason", topic: "Tracing board discussed" },
  { stage: "Third Degree — Master Mason", topic: "Working tools explained" },
  { stage: "Third Degree — Master Mason", topic: "Legend discussed" },
  { stage: "Third Degree — Master Mason", topic: "Full rights explained" },
  { stage: "Third Degree — Master Mason", topic: "Participated in Third Degree LoI work" },
  { stage: "Third Degree — Master Mason", topic: "Lodge offices and progression explained" },
  { stage: "Third Degree — Master Mason", topic: "Check-in meeting" },
  // Royal Arch
  { stage: "Royal Arch", topic: "Royal Arch explained" },
  { stage: "Royal Arch", topic: "Recommended for Exaltation" },
  { stage: "Royal Arch", topic: "Introduced to Chapter" },
  { stage: "Royal Arch", topic: "Exaltation completed" },
  { stage: "Royal Arch", topic: "Signs, tokens and words explained" },
  { stage: "Royal Arch", topic: "Veils discussed" },
  { stage: "Royal Arch", topic: "Tracing board discussed" },
  { stage: "Royal Arch", topic: "Chapter structure explained" },
  // Lodge Knowledge
  { stage: "Lodge Knowledge", topic: "Lodge history" },
  { stage: "Lodge Knowledge", topic: "By-Laws" },
  { stage: "Lodge Knowledge", topic: "All officer roles understood" },
  { stage: "Lodge Knowledge", topic: "Annual programme" },
  { stage: "Lodge Knowledge", topic: "Charitable giving policy" },
  { stage: "Lodge Knowledge", topic: "Social calendar" },
  { stage: "Lodge Knowledge", topic: "Visiting etiquette" },
  { stage: "Lodge Knowledge", topic: "Provincial structure" },
  { stage: "Lodge Knowledge", topic: "UGLE structure" },
  { stage: "Lodge Knowledge", topic: "Website signed up" },
  // General Masonic Development
  { stage: "General Masonic Development", topic: "Attended 3 consecutive meetings" },
  { stage: "General Masonic Development", topic: "Attended social event" },
  { stage: "General Masonic Development", topic: "Visited another Lodge" },
  { stage: "General Masonic Development", topic: "Received a visitor" },
  { stage: "General Masonic Development", topic: "Attended Provincial event" },
  { stage: "General Masonic Development", topic: "Positive integration feedback" },
  { stage: "General Masonic Development", topic: "Expressed interest in office" },
  { stage: "General Masonic Development", topic: "Formal mentoring concluded" },
];

export const RITUAL_GROUPS = [
  "Opening & Closing",
  "Initiation Ceremony",
  "Passing Ceremony",
  "Raising Ceremony",
  "Installation Ceremony",
  "LoI Roles",
  "Lodge Traditions",
] as const;

export const RITUAL_CATALOGUE: RitualSeed[] = [
  // Opening & Closing
  { ritual_group: "Opening & Closing", piece: "First Degree Opening", degree: "First" },
  { ritual_group: "Opening & Closing", piece: "First Degree Closing", degree: "First" },
  { ritual_group: "Opening & Closing", piece: "Second Degree Opening", degree: "Second" },
  { ritual_group: "Opening & Closing", piece: "Second Degree Closing", degree: "Second" },
  { ritual_group: "Opening & Closing", piece: "Third Degree Opening", degree: "Third" },
  { ritual_group: "Opening & Closing", piece: "Third Degree Closing", degree: "Third" },
  // Initiation
  { ritual_group: "Initiation Ceremony", piece: "Preparation", degree: "First" },
  { ritual_group: "Initiation Ceremony", piece: "Admission and perambulations", degree: "First" },
  { ritual_group: "Initiation Ceremony", piece: "Obligation", degree: "First" },
  { ritual_group: "Initiation Ceremony", piece: "Entrusting", degree: "First" },
  { ritual_group: "Initiation Ceremony", piece: "Charge after Initiation", degree: "First" },
  { ritual_group: "Initiation Ceremony", piece: "First Degree Tracing Board", degree: "First" },
  { ritual_group: "Initiation Ceremony", piece: "Address to the Wardens", degree: "First" },
  { ritual_group: "Initiation Ceremony", piece: "Address to the Brethren", degree: "First" },
  // Passing
  { ritual_group: "Passing Ceremony", piece: "Preparation and admission", degree: "Second" },
  { ritual_group: "Passing Ceremony", piece: "Obligation", degree: "Second" },
  { ritual_group: "Passing Ceremony", piece: "Entrusting", degree: "Second" },
  { ritual_group: "Passing Ceremony", piece: "Middle Chamber lecture", degree: "Second" },
  { ritual_group: "Passing Ceremony", piece: "Charge after Passing", degree: "Second" },
  { ritual_group: "Passing Ceremony", piece: "Second Degree Tracing Board", degree: "Second" },
  // Raising
  { ritual_group: "Raising Ceremony", piece: "Preparation and admission", degree: "Third" },
  { ritual_group: "Raising Ceremony", piece: "Obligation", degree: "Third" },
  { ritual_group: "Raising Ceremony", piece: "Entrusting", degree: "Third" },
  { ritual_group: "Raising Ceremony", piece: "Legend of Hiram Abiff", degree: "Third" },
  { ritual_group: "Raising Ceremony", piece: "Raising", degree: "Third" },
  { ritual_group: "Raising Ceremony", piece: "Charge after Raising", degree: "Third" },
  { ritual_group: "Raising Ceremony", piece: "Third Degree Tracing Board", degree: "Third" },
  { ritual_group: "Raising Ceremony", piece: "Address to the Master Mason", degree: "Third" },
  // Installation
  { ritual_group: "Installation Ceremony", piece: "Installing Master", degree: "Installation" },
  { ritual_group: "Installation Ceremony", piece: "WM Obligation", degree: "Installation" },
  { ritual_group: "Installation Ceremony", piece: "Charges to Officers", degree: "Installation" },
  { ritual_group: "Installation Ceremony", piece: "Working Tools", degree: "Installation" },
  { ritual_group: "Installation Ceremony", piece: "Inner Working", degree: "Installation" },
  { ritual_group: "Installation Ceremony", piece: "Address to the Wardens", degree: "Installation" },
  { ritual_group: "Installation Ceremony", piece: "Address to the Brethren", degree: "Installation" },
  { ritual_group: "Installation Ceremony", piece: "Address to the Master", degree: "Installation" },
  // LoI Roles
  { ritual_group: "LoI Roles", piece: "Worshipful Master", degree: null },
  { ritual_group: "LoI Roles", piece: "Senior Warden", degree: null },
  { ritual_group: "LoI Roles", piece: "Junior Warden", degree: null },
  { ritual_group: "LoI Roles", piece: "Senior Deacon", degree: null },
  { ritual_group: "LoI Roles", piece: "Junior Deacon", degree: null },
  { ritual_group: "LoI Roles", piece: "Inner Guard", degree: null },
  { ritual_group: "LoI Roles", piece: "Tyler", degree: null },
  { ritual_group: "LoI Roles", piece: "Director of Ceremonies", degree: null },
  // Lodge Traditions
  { ritual_group: "Lodge Traditions", piece: "Initiates Chain", degree: null },
  { ritual_group: "Lodge Traditions", piece: "Entered Apprentice Song", degree: null },
  { ritual_group: "Lodge Traditions", piece: "Tyler's Toast", degree: null },
  { ritual_group: "Lodge Traditions", piece: "Response on behalf of visitors", degree: null },
  { ritual_group: "Lodge Traditions", piece: "Response on behalf of initiates", degree: null },
];

export const STATUS_LABELS: Record<string, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  complete: "Complete",
};
