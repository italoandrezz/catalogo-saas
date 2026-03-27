CREATE TABLE IF NOT EXISTS operacoes_estoque (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    produto_id UUID NOT NULL REFERENCES produtos(id),
    tipo VARCHAR(20) NOT NULL,
    quantidade INTEGER NOT NULL,
    quantidade_anterior INTEGER,
    lead_nome VARCHAR(120),
    lead_telefone VARCHAR(30),
    sale_id UUID,
    criado_em TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_operacoes_estoque_tenant_id ON operacoes_estoque(tenant_id);
CREATE INDEX IF NOT EXISTS idx_operacoes_estoque_produto_id ON operacoes_estoque(produto_id);
CREATE INDEX IF NOT EXISTS idx_operacoes_estoque_tipo ON operacoes_estoque(tipo);
CREATE INDEX IF NOT EXISTS idx_operacoes_estoque_criado_em ON operacoes_estoque(criado_em DESC);
