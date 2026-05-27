import { query } from './db'

export async function runMigrations() {
  try {
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
    // (médecins existants sans organisation_id)
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

    console.log('[Migrations] ✓ Toutes les migrations appliquées')
  } catch (err) {
    console.error('[Migrations] Erreur :', err)
    // Ne pas crasher le serveur — les tables existent peut-être déjà
  }
}
