-- Migration: Ajouter les colonnes de configuration à store_settings
-- Date: 2025-11-16
-- Description: Colonnes JSONB pour categories, vat_rates, payment_methods, configs

-- Ajouter les colonnes de configuration paramétrable
DO $$
BEGIN
    -- Categories (JSONB)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'store_settings'
        AND column_name = 'categories'
    ) THEN
        ALTER TABLE store_settings ADD COLUMN categories JSONB DEFAULT '[]'::jsonb;
        COMMENT ON COLUMN store_settings.categories IS 'Catégories de produits paramétrables';
    END IF;

    -- VAT Rates (JSONB)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'store_settings'
        AND column_name = 'vat_rates'
    ) THEN
        ALTER TABLE store_settings ADD COLUMN vat_rates JSONB DEFAULT '[]'::jsonb;
        COMMENT ON COLUMN store_settings.vat_rates IS 'Taux de TVA paramétrables';
    END IF;

    -- Payment Methods (JSONB)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'store_settings'
        AND column_name = 'payment_methods'
    ) THEN
        ALTER TABLE store_settings ADD COLUMN payment_methods JSONB DEFAULT '{}'::jsonb;
        COMMENT ON COLUMN store_settings.payment_methods IS 'Méthodes de paiement disponibles';
    END IF;

    -- Theme Color
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'store_settings'
        AND column_name = 'theme_color'
    ) THEN
        ALTER TABLE store_settings ADD COLUMN theme_color VARCHAR(7) DEFAULT '#FF6B35';
        COMMENT ON COLUMN store_settings.theme_color IS 'Couleur du thème (format hex)';
    END IF;

    -- Logo URL
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'store_settings'
        AND column_name = 'logo_url'
    ) THEN
        ALTER TABLE store_settings ADD COLUMN logo_url TEXT;
        COMMENT ON COLUMN store_settings.logo_url IS 'URL ou chemin du logo du commerce';
    END IF;

    -- Language
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'store_settings'
        AND column_name = 'language'
    ) THEN
        ALTER TABLE store_settings ADD COLUMN language VARCHAR(5) DEFAULT 'fr-FR';
        COMMENT ON COLUMN store_settings.language IS 'Langue de l''interface (fr-FR, en-US, etc.)';
    END IF;

    -- Timezone
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'store_settings'
        AND column_name = 'timezone'
    ) THEN
        ALTER TABLE store_settings ADD COLUMN timezone VARCHAR(50) DEFAULT 'Europe/Paris';
        COMMENT ON COLUMN store_settings.timezone IS 'Fuseau horaire (IANA timezone)';
    END IF;

    -- SumUp Config (JSONB)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'store_settings'
        AND column_name = 'sumup_config'
    ) THEN
        ALTER TABLE store_settings ADD COLUMN sumup_config JSONB DEFAULT '{"enabled": false, "api_key": "", "merchant_code": "", "affiliate_key": ""}'::jsonb;
        COMMENT ON COLUMN store_settings.sumup_config IS 'Configuration SumUp (paiement TPE)';
    END IF;

    -- Printer Config (JSONB)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'store_settings'
        AND column_name = 'printer_config'
    ) THEN
        ALTER TABLE store_settings ADD COLUMN printer_config JSONB DEFAULT '{"enabled": false, "type": "epson", "interface": "tcp", "ip": "", "port": 9100, "path": "", "auto_print": true}'::jsonb;
        COMMENT ON COLUMN store_settings.printer_config IS 'Configuration imprimante thermique ESC/POS';
    END IF;

    -- Email Config (JSONB)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'store_settings'
        AND column_name = 'email_config'
    ) THEN
        ALTER TABLE store_settings ADD COLUMN email_config JSONB DEFAULT '{"enabled": false, "smtp_host": "", "smtp_port": 587, "smtp_secure": false, "smtp_user": "", "smtp_password": "", "from_email": "", "from_name": ""}'::jsonb;
        COMMENT ON COLUMN store_settings.email_config IS 'Configuration email SMTP';
    END IF;

END $$;

-- Migration complete
DO $$
BEGIN
    RAISE NOTICE 'Migration 012: Store config fields added successfully';
END $$;
