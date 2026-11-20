import type { Absence, Assignment, DB, Profile, Project, WikiArticle } from '../types';
import { addDays, recalcFree, todayIso } from './logic';

export const DEMO_PASSWORD = 'demo1234';

/** Realistische radiologische Demo-Daten (keine Patientendaten). Datumsangaben relativ zu heute. */
export function seedDb(): { db: DB; passwords: Record<string, string> } {
  const t = todayIso();
  const d = (n: number) => addDays(t, n);
  const created = (n: number) => new Date(Date.now() + n * 86400000).toISOString();

  const mk = (
    id: string, username: string, full_name: string, role: Profile['role'],
    contract_hours = 0, skills: string[] = [],
  ): Profile => ({
    id, username, email: `${username}@demo.radconnect.local`, full_name, role,
    contract_hours, free_hours: contract_hours, skills, onboarded: true, created_at: created(-90),
  });

  const profiles: Profile[] = [
    mk('u-admin', 'koordinator', 'Mohammad (Koordination)', 'admin'),
    mk('u-weber', 'dr.weber', 'Dr. Anna Weber', 'arzt'),
    mk('u-schmidt', 'pd.schmidt', 'PD Dr. Jonas Schmidt', 'arzt'),
    mk('u-okafor', 'dr.okafor', 'Dr. Chidi Okafor', 'arzt'),
    mk('u-lena', 'lena.k', 'Lena Krüger', 'shk', 40, ['Segmentierung', 'DICOM-Export', '3D Slicer']),
    mk('u-tim', 'tim.m', 'Tim Maurer', 'shk', 40, ['SPSS', 'R', 'Datenbereinigung']),
    mk('u-sara', 'sara.y', 'Sara Yilmaz', 'shk', 30, ['Python', 'Segmentierung', 'Radiomics']),
    mk('u-jonas', 'jonas.p', 'Jonas Peters', 'shk', 40, ['Literaturrecherche', 'SPSS', 'Excel']),
    mk('u-mia', 'mia.h', 'Mia Hartmann', 'shk', 20, ['DICOM-Export', 'Python']),
    mk('u-david', 'david.r', 'David Richter', 'shk', 40, ['Segmentierung', 'SPSS', 'Datenbereinigung']),
  ];

  const wiki: WikiArticle[] = [
    {
      id: 'w-onb', title: 'Willkommen im Team – Onboarding Tag 1', category: 'Allgemeines Onboarding',
      summary: 'Alles, was du in den ersten Tagen brauchst.',
      steps: [
        'Zugang zum Klinik-PC beim IT-Service beantragen',
        'Datenschutz- und Schweigepflichtbelehrung absolvieren',
        'In RadConnect Skills und Vertragsstunden pflegen',
        'Ansprechperson im Koordinationsteam kennenlernen',
      ],
      links: [{ label: 'Intranet: Datenschutzbelehrung', url: 'https://example.org/datenschutz' }],
      author_id: 'u-admin', created_at: created(-60),
    },
    {
      id: 'w-dicom', title: 'DICOM-Export aus dem PACS (anonymisiert)', category: 'PACS / DICOM',
      summary: 'Studien pseudonymisiert exportieren – niemals mit Klarnamen auf lokale Rechner.',
      steps: [
        'Studie im PACS öffnen und den Export-Dialog wählen',
        'Option „Anonymisieren“ aktivieren',
        'Zielordner auf dem Forschungslaufwerk wählen',
        'Export-Log im Projektordner ablegen',
      ],
      links: [{ label: 'DICOM Standard Browser', url: 'https://dicom.innolitics.com/ciods' }],
      author_id: 'u-admin', created_at: created(-55),
    },
    {
      id: 'w-spss', title: 'SPSS: Deskriptive Statistik & Gruppenvergleiche', category: 'Statistik & SPSS',
      summary: 'Standard-Auswertung für Kohortenstudien.',
      steps: [
        'Datensatz importieren und Variablentypen prüfen',
        'Analysieren › Deskriptive Statistiken › Explorative Datenanalyse',
        'Normalverteilung prüfen (Shapiro-Wilk)',
        't-Test bzw. Mann-Whitney-U durchführen',
        'Ergebnisse als Tabelle exportieren',
      ],
      links: [{ label: 'SPSS Statistics Dokumentation', url: 'https://www.ibm.com/docs/en/spss-statistics' }],
      author_id: 'u-weber', created_at: created(-40),
    },
    {
      id: 'w-seg', title: 'Koronarsegmentierung mit 3D Slicer', category: 'Segmentierung',
      summary: 'Semi-automatische Segmentierung von Koronararterien im CT.',
      steps: [
        'DICOM-Serie in 3D Slicer laden (Modul „DICOM“)',
        'Modul „Segment Editor“ öffnen und Segment „Koronar“ anlegen',
        'Threshold-Effekt setzen (ca. 200–600 HU)',
        'Mit „Islands“ unverbundene Bereiche entfernen',
        'Segmentierung als .seg.nrrd im Projektordner speichern',
      ],
      links: [{ label: '3D Slicer Dokumentation', url: 'https://slicer.readthedocs.io' }],
      author_id: 'u-schmidt', created_at: created(-30),
    },
    {
      id: 'w-lit', title: 'Systematische Literaturrecherche (PubMed)', category: 'Allgemeines Onboarding',
      summary: 'Suchstrategie aufsetzen und Treffer dokumentieren.',
      steps: [
        'PICO-Frage formulieren',
        'MeSH-Terms und Freitext in PubMed kombinieren',
        'Treffer in Zotero-Gruppenbibliothek exportieren',
        'Screening-Entscheidungen in einer Tabelle dokumentieren',
      ],
      links: [{ label: 'PubMed', url: 'https://pubmed.ncbi.nlm.nih.gov' }],
      author_id: 'u-admin', created_at: created(-20),
    },
  ];

  const projects: Project[] = [
    {
      id: 'p-pcct', title: 'Photon-Counting CT Koronarien Auswertung',
      description: 'Quantitative Auswertung von Koronarplaques in Photon-Counting-CT-Datensätzen im Vergleich zum konventionellen CT.',
      estimated_hours: 120, deadline: d(45), skills: ['Segmentierung', 'DICOM-Export', 'SPSS'],
      milestone_target: 200, milestone_current: 120, milestone_unit: 'CT-Datensätze',
      sop_ids: ['w-dicom', 'w-seg', 'w-spss'], owner_id: 'u-weber', status: 'aktiv',
      priority: 'Hoch',
      technicalContactName: 'Dr. Anna Weber /OA-Funktionsbereich CT',
      technicalContactPhone: '-4821 (DECT)',
      comments: [
        {
          id: 'c-1', author_id: 'u-weber', author_name: 'Dr. Anna Weber', author_role: 'arzt',
          kind: 'update', text: 'Statusupdate: Kohorte erweitert auf Pat. 0001–0200. Bitte rekonstruierte 0,4 mm Kernel nutzen.',
          created_at: created(-7),
        },
        {
          id: 'c-2', author_id: 'u-lena', author_name: 'Lena Krüger', author_role: 'shk',
          kind: 'done', text: 'Erledigt: Pat. 0001–0120 im PACS anonymisiert exportiert und in 3D Slicer segmentiert.',
          created_at: created(-2),
        },
      ],
      created_at: created(-50),
    },
    {
      id: 'p-nadel', title: 'Nadel-Detektions-Validierung',
      description: 'Validierung eines KI-Algorithmus zur Nadeldetektion in CT-gesteuerten Interventionen.',
      estimated_hours: 80, deadline: d(30), skills: ['Python', 'Segmentierung'],
      milestone_target: 500, milestone_current: 460, milestone_unit: 'Sequenzen',
      sop_ids: ['w-seg'], owner_id: 'u-schmidt', status: 'review',
      priority: 'Hoch',
      technicalContactName: 'PD Dr. Jonas Schmidt (Intervention)',
      technicalContactPhone: '-4910 (DECT)',
      comments: [
        {
          id: 'c-3', author_id: 'u-sara', author_name: 'Sara Yilmaz', author_role: 'shk',
          kind: 'question', text: 'Frage an Betreuer: Sollen Sequenzen mit Metallartefakten (Pat. 0310–0325) separat markiert werden?',
          created_at: created(-3),
        },
        {
          id: 'c-4', author_id: 'u-schmidt', author_name: 'PD Dr. Jonas Schmidt', author_role: 'arzt',
          kind: 'update', text: 'Statusupdate: Ja, bitte in Spalte „Artefakt_Grad“ (0–2) codieren. Bereit für finales Review.',
          created_at: created(-1),
        },
      ],
      created_at: created(-25),
    },
    {
      id: 'p-lunge', title: 'Retrospektive Lungenrundherd-Kohorte',
      description: 'Retrospektive Erfassung und Auswertung von Lungenrundherden (Follow-up nach Fleischner-Kriterien).',
      estimated_hours: 150, deadline: d(75), skills: ['SPSS', 'Literaturrecherche', 'Datenbereinigung'],
      milestone_target: 300, milestone_current: 0, milestone_unit: 'Fälle',
      sop_ids: ['w-spss', 'w-lit'], owner_id: 'u-okafor', status: 'offen',
      priority: 'Mittel',
      technicalContactName: 'Dr. Chidi Okafor',
      technicalContactPhone: '-4755',
      comments: [],
      created_at: created(-5),
    },
    {
      id: 'p-prostata', title: 'MRT-Prostata PI-RADS Reader-Studie',
      description: 'Multi-Reader-Studie zur Vergleichbarkeit von PI-RADS-Scores mit und ohne KI-Unterstützung.',
      estimated_hours: 60, deadline: d(48), skills: ['DICOM-Export', 'SPSS'],
      milestone_target: 100, milestone_current: 0, milestone_unit: 'Reads',
      sop_ids: ['w-dicom'], owner_id: 'u-weber', status: 'beantragt',
      priority: 'Mittel',
      technicalContactName: 'Dr. Anna Weber',
      technicalContactPhone: '-4821 (DECT)',
      comments: [],
      created_at: created(-1),
    },
    {
      id: 'p-lit', title: 'Literaturrecherche: KI in der Notfallradiologie',
      description: 'Systematisches Scoping-Review zu KI-Anwendungen in der Notfallradiologie.',
      estimated_hours: 40, deadline: d(60), skills: ['Literaturrecherche'],
      milestone_target: 0, milestone_current: 0, milestone_unit: 'Prozent',
      sop_ids: ['w-lit'], owner_id: 'u-schmidt', status: 'abgeschlossen',
      priority: 'Niedrig',
      technicalContactName: 'PD Dr. Jonas Schmidt',
      technicalContactPhone: '-4910',
      comments: [
        {
          id: 'c-5', author_id: 'u-jonas', author_name: 'Jonas Peters', author_role: 'shk',
          kind: 'done', text: 'Erledigt: PRISMA-Flowchart und Zotero-Export abgeschlossen.',
          created_at: created(-4),
        },
      ],
      created_at: created(-35),
    },
  ];

  const as = (id: string, project_id: string, shk_id: string, status: Assignment['status'], hm: number, ht: number): Assignment => ({
    id, project_id, shk_id, status, hours_month: hm, hours_total: ht, created_at: created(-20),
  });
  const assignments: Assignment[] = [
    as('a1', 'p-pcct', 'u-lena', 'aktiv', 20, 52),
    as('a2', 'p-pcct', 'u-david', 'aktiv', 10, 18),
    as('a3', 'p-nadel', 'u-sara', 'aktiv', 18, 22),
    as('a4', 'p-nadel', 'u-mia', 'aktiv', 8, 6),
    as('a5', 'p-lunge', 'u-jonas', 'beworben', 0, 0),
    as('a6', 'p-lunge', 'u-tim', 'beworben', 0, 0),
  ];

  const ab = (id: string, shk_id: string, type: Absence['type'], s: number, e: number, pct: number, note = ''): Absence => ({
    id, shk_id, type, start_date: d(s), end_date: d(e), available_pct: pct, note, created_at: created(-10),
  });
  const absences: Absence[] = [
    ab('x1', 'u-lena', 'klausur', 40, 55, 0, 'Staatsexamen-Block'),
    ab('x2', 'u-tim', 'klausur', 38, 52, 0),
    ab('x3', 'u-mia', 'klausur', 40, 54, 20, 'Nur 4 Std./Woche'),
    ab('x4', 'u-david', 'urlaub', 10, 17, 0),
    ab('x5', 'u-sara', 'famulatur', 60, 90, 50, 'Famulatur Innere'),
    ab('x6', 'u-jonas', 'klausur', 42, 56, 0),
  ];

  const passwords: Record<string, string> = {};
  profiles.forEach((p) => (passwords[p.id] = DEMO_PASSWORD));

  return {
    db: { profiles: recalcFree(profiles, assignments), projects, assignments, absences, wiki },
    passwords,
  };
}
