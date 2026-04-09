// Dexie (IndexedDB) schema for career-ops-plugin.
// Replaces the source repo's data/applications.md + reports/*.md + data/pipeline.md
// + data/scan-history.tsv + interview-prep/* + article-digest.md + cv.md file tree.
//
// Schema version history MUST be additive — new versions only add tables or
// new indices; they MUST NOT drop data. If a breaking change is needed, bump
// the major version and provide a migration callback.

import Dexie from 'dexie';
import type { Table } from 'dexie';
import type {
  Application,
  ArticleDigest,
  Cv,
  Customization,
  InterviewIntel,
  PdfBlob,
  PipelineItem,
  PortalsConfig,
  Profile,
  Report,
  ScanHistoryItem,
  StarRStory,
} from '../../shared/types';

export class CareerOpsDb extends Dexie {
  applications!: Table<Application, string>;
  reports!: Table<Report, string>;
  pipeline!: Table<PipelineItem, string>;
  scanHistory!: Table<ScanHistoryItem, string>;
  interviews!: Table<InterviewIntel, string>;
  stories!: Table<StarRStory, string>;
  profile!: Table<Profile, 'singleton'>;
  customization!: Table<Customization, 'singleton'>;
  cv!: Table<Cv, 'singleton'>;
  articleDigest!: Table<ArticleDigest, 'singleton'>;
  portals!: Table<PortalsConfig, 'singleton'>;
  pdfBlobs!: Table<PdfBlob, string>;

  constructor() {
    super('career-ops');

    // v1 — initial schema.
    // Dexie schema syntax: 'primaryKey,index1,index2,[compound+index]'
    this.version(1).stores({
      applications:
        'id,number,date,company,role,status,score,archetype,language,[company+role],createdAt,updatedAt',
      reports: 'id,applicationId,date,company,slug,version',
      pipeline: 'id,status,source,createdAt',
      scanHistory: 'id,url,hash,firstSeenAt,[company+title]',
      interviews: 'id,applicationId,company,updatedAt',
      stories: 'id,*tags,updatedAt',
      profile: 'id',
      customization: 'id',
      cv: 'id',
      articleDigest: 'id',
      portals: 'id',
      pdfBlobs: 'id,applicationId,createdAt',
    });
  }
}

let dbInstance: CareerOpsDb | null = null;

/** Get the singleton DB. Lazy-opened so tests can stub it. */
export function getDb(): CareerOpsDb {
  if (!dbInstance) {
    dbInstance = new CareerOpsDb();
  }
  return dbInstance;
}

/** Test-only: replace the singleton (e.g. with a happy-dom indexedDB). */
export function __setTestDb(db: CareerOpsDb | null): void {
  dbInstance = db;
}
