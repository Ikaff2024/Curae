import { query } from './db'

export async function runMigrations() {
  try {
    // ── Migration 000 : schéma de base ───────────────────────────────────────
    await query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`)

    await query(`
      CREATE TABLE IF NOT EXISTS medecins (
        id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email           VARCHAR(255) UNIQUE NOT NULL,
        password_hash   VARCHAR(255) NOT NULL,
        nom             VARCHAR(100) NOT NULL,
        prenoms         VARCHAR(150),
        specialite      VARCHAR(100) DEFAULT 'Médecin généraliste',
        telephone       VARCHAR(30),
        numero_ordre    VARCHAR(50),
        cabinet         VARCHAR(150),
        adresse_cabinet TEXT,
        ville           VARCHAR(100),
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        updated_at      TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    await query(`
      CREATE TABLE IF NOT EXISTS patients (
        id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        medecin_id       UUID NOT NULL REFERENCES medecins(id) ON DELETE CASCADE,
        numero_dossier   VARCHAR(30) UNIQUE NOT NULL,
        nom              VARCHAR(100) NOT NULL,
        prenoms          VARCHAR(150) NOT NULL,
        date_naissance   DATE NOT NULL,
        sexe             CHAR(1) CHECK (sexe IN ('M','F')) DEFAULT 'M',
        telephone        VARCHAR(30),
        whatsapp         VARCHAR(30),
        email            VARCHAR(255),
        adresse          TEXT,
        assurance        VARCHAR(100),
        numero_assurance VARCHAR(80),
        antecedents      TEXT,
        created_at       TIMESTAMPTZ DEFAULT NOW(),
        updated_at       TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    await query(`CREATE INDEX IF NOT EXISTS idx_patients_medecin ON patients(medecin_id)`)
    await query(`CREATE INDEX IF NOT EXISTS idx_patients_nom ON patients(nom, prenoms)`)

    await query(`
      CREATE TABLE IF NOT EXISTS rendez_vous (
        id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        medecin_id     UUID NOT NULL REFERENCES medecins(id) ON DELETE CASCADE,
        patient_id     UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        date           DATE NOT NULL,
        heure          TIME NOT NULL,
        duree_minutes  INT DEFAULT 30,
        motif          VARCHAR(255),
        type_rdv       VARCHAR(50) DEFAULT 'consultation',
        statut         VARCHAR(30) DEFAULT 'confirme' CHECK (statut IN ('confirme','annule','effectue','no_show')),
        notes          TEXT,
        rappel_envoye  BOOLEAN DEFAULT FALSE,
        created_at     TIMESTAMPTZ DEFAULT NOW(),
        updated_at     TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    await query(`CREATE INDEX IF NOT EXISTS idx_rdv_medecin_date ON rendez_vous(medecin_id, date)`)
    await query(`CREATE INDEX IF NOT EXISTS idx_rdv_patient ON rendez_vous(patient_id)`)

    await query(`
      CREATE TABLE IF NOT EXISTS comptes_rendus (
        id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        medecin_id           UUID NOT NULL REFERENCES medecins(id) ON DELETE CASCADE,
        patient_id           UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        type_cr              VARCHAR(50) NOT NULL,
        motif                TEXT,
        anamnese             TEXT,
        examen_clinique      TEXT,
        pa_droite            VARCHAR(20),
        pa_gauche            VARCHAR(20),
        fc                   VARCHAR(10),
        spo2                 VARCHAR(10),
        donnees_specialisees JSONB DEFAULT '{}',
        conclusion           TEXT,
        traitement           TEXT,
        recommandations      TEXT,
        statut               VARCHAR(20) DEFAULT 'brouillon' CHECK (statut IN ('brouillon','finalise','envoye')),
        genere_par_ia        BOOLEAN DEFAULT FALSE,
        created_at           TIMESTAMPTZ DEFAULT NOW(),
        updated_at           TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    await query(`CREATE INDEX IF NOT EXISTS idx_cr_medecin ON comptes_rendus(medecin_id)`)
    await query(`CREATE INDEX IF NOT EXISTS idx_cr_patient ON comptes_rendus(patient_id)`)

    await query(`
      CREATE TABLE IF NOT EXISTS factures (
        id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        medecin_id        UUID NOT NULL REFERENCES medecins(id) ON DELETE CASCADE,
        patient_id        UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        numero            VARCHAR(30) UNIQUE NOT NULL,
        actes             JSONB DEFAULT '[]',
        montant_total     NUMERIC(12,0) NOT NULL,
        montant_assurance NUMERIC(12,0) DEFAULT 0,
        montant_patient   NUMERIC(12,0) NOT NULL,
        mode_paiement     VARCHAR(30) DEFAULT 'direct',
        statut            VARCHAR(20) DEFAULT 'en_attente' CHECK (statut IN ('en_attente','paye','rembourse','annule')),
        date_emission     DATE DEFAULT CURRENT_DATE,
        date_paiement     DATE,
        notes             TEXT,
        created_at        TIMESTAMPTZ DEFAULT NOW(),
        updated_at        TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    await query(`CREATE INDEX IF NOT EXISTS idx_factures_medecin ON factures(medecin_id)`)

    // ── Migration 001 : table organisations ──────────────────────────────────
    await query(`
      CREATE TABLE IF NOT EXISTS organisations (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nom         VARCHAR(200) NOT NULL,
        type        VARCHAR(50)  NOT NULL DEFAULT 'cabinet',
        adresse     TEXT,
        ville       VARCHAR(100) DEFAULT 'Abidjan',
        pays        VARCHAR(100) DEFAULT 'Côte d''Ivoire',
        telephone   VARCHAR(20),
        email       VARCHAR(200),
        created_at  TIMESTAMPTZ  DEFAULT NOW(),
        updated_at  TIMESTAMPTZ  DEFAULT NOW()
      )
    `)

    // ── Migration 002 : médecins → organisation_id + role ───────────────────
    await query(`ALTER TABLE medecins ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(id)`)
    await query(`ALTER TABLE medecins ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'admin_medecin'`)

    // ── Migration 003 : créer auto une organisation pour les médecins legacy ─
    await query(`
      DO $$
      DECLARE r RECORD; new_id UUID;
      BEGIN
        FOR r IN
          SELECT id, nom, prenoms, email, telephone, specialite
          FROM medecins WHERE organisation_id IS NULL
        LOOP
          INSERT INTO organisations (nom, type, telephone, email)
          VALUES (
            'Cabinet ' || COALESCE(NULLIF(TRIM(r.prenoms), ''), '') || ' ' || r.nom,
            'cabinet',
            r.telephone,
            r.email
          )
          RETURNING id INTO new_id;

          UPDATE medecins SET organisation_id = new_id, role = 'admin_medecin'
          WHERE id = r.id;
        END LOOP;
      END $$
    `)

    // ── Migration 004 : organisation_id sur les tables métier ───────────────
    await query(`ALTER TABLE patients       ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(id)`)
    await query(`ALTER TABLE rendez_vous    ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(id)`)
    await query(`ALTER TABLE comptes_rendus ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(id)`)
    await query(`ALTER TABLE factures       ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(id)`)

    // ── Migration 005 : backfill organisation_id depuis medecin_id ───────────
    await query(`
      UPDATE patients p SET organisation_id = m.organisation_id
      FROM medecins m WHERE p.medecin_id = m.id AND p.organisation_id IS NULL
    `)
    await query(`
      UPDATE rendez_vous r SET organisation_id = m.organisation_id
      FROM medecins m WHERE r.medecin_id = m.id AND r.organisation_id IS NULL
    `)
    await query(`
      UPDATE comptes_rendus cr SET organisation_id = m.organisation_id
      FROM medecins m WHERE cr.medecin_id = m.id AND cr.organisation_id IS NULL
    `)
    await query(`
      UPDATE factures f SET organisation_id = m.organisation_id
      FROM medecins m WHERE f.medecin_id = m.id AND f.organisation_id IS NULL
    `)

    // ── Migration 006 : table abonnements ───────────────────────────────────
    await query(`
      CREATE TABLE IF NOT EXISTS abonnements (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        medecin_id      UUID NOT NULL REFERENCES medecins(id) ON DELETE CASCADE,
        plan            VARCHAR(20) NOT NULL DEFAULT 'solo',
        statut          VARCHAR(20) NOT NULL DEFAULT 'essai',
        date_debut      TIMESTAMPTZ DEFAULT NOW(),
        date_fin        TIMESTAMPTZ,
        wave_ref        VARCHAR(200),
        wave_session_id VARCHAR(200),
        montant_paye    INTEGER,
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (medecin_id)
      )
    `)

    console.log('[Migrations] ✓ Toutes les migrations appliquées')
  } catch (err) {
    console.error('[Migrations] Erreur :', err)
  }
}
