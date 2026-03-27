CREATE TABLE IF NOT EXISTS auth_verification_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(150) NOT NULL,
    code_hash VARCHAR(255) NOT NULL,
    purpose VARCHAR(40) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_codes_email_purpose_created
    ON auth_verification_codes(email, purpose, created_at DESC);
