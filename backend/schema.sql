-- Curaé — Schéma PostgreSQL
-- Créer une extension UUID si pas encore disponible
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Médecins ──────────────────────────────────────────────────────────
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
);

-- ── Patients ──────────────────────────────────────────────────────────
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
);

CREATE INDEX IF NOT EXISTS idx_patients_medecin ON patients(medecin_id);
CREATE INDEX IF NOT EXISTS idx_patients_nom ON patients(nom, prenoms);

-- ── Rendez-vous ───────────────────────────────────────────────────────
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
);

CREATE INDEX IF NOT EXISTS idx_rdv_medecin_date ON rendez_vous(medecin_id, date);
CREATE INDEX IF NOT EXISTS idx_rdv_patient ON rendez_vous(patient_id);

-- ── Comptes-rendus ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comptes_rendus (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  medecin_id          UUID NOT NULL REFERENCES medecins(id) ON DELETE CASCADE,
  patient_id          UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  type_cr             VARCHAR(50) NOT NULL,
  motif               TEXT,
  anamnese            TEXT,
  examen_clinique     TEXT,
  pa_droite           VARCHAR(20),
  pa_gauche           VARCHAR(20),
  fc                  VARCHAR(10),
  spo2                VARCHAR(10),
  donnees_specialisees JSONB DEFAULT '{}',
  conclusion          TEXT,
  traitement          TEXT,
  recommandations     TEXT,
  statut              VARCHAR(20) DEFAULT 'brouillon' CHECK (statut IN ('brouillon','finalise','envoye')),
  genere_par_ia       BOOLEAN DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cr_medecin ON comptes_rendus(medecin_id);
CREATE INDEX IF NOT EXISTS idx_cr_patient ON comptes_rendus(patient_id);

-- ── Factures ──────────────────────────────────────────────────────────
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
);

CREATE INDEX IF NOT EXISTS idx_factures_medecin ON factures(medecin_id);

-- ── Abonnements ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS abonnements (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  medecin_id      UUID UNIQUE NOT NULL REFERENCES medecins(id) ON DELETE CASCADE,
  plan            VARCHAR(20) DEFAULT 'solo' CHECK (plan IN ('solo','cabinet')),
  statut          VARCHAR(20) DEFAULT 'essai' CHECK (statut IN ('actif','expire','annule','essai')),
  date_debut      TIMESTAMPTZ DEFAULT NOW(),
  date_fin        TIMESTAMPTZ,
  wave_session_id VARCHAR(100),
  wave_ref        VARCHAR(100),
  montant_paye    NUMERIC(12,0),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
