-- ── Admin ──────────────────────────────────────────────────────────────────
INSERT INTO admins (id, name, email, password, role, active, "createdAt", "updatedAt")
VALUES (
  'admin-kabijoux-1',
  'Admin KA Bijoux',
  'admin@kabijoux.com.br',
  '$2a$12$5sU/ujXAVMhu2ixQKEvVFeYqhDEADdpG3ZKgVMJ49dt4BhHiy.Ho6',
  'SUPER_ADMIN',
  true,
  NOW(), NOW()
) ON CONFLICT (email) DO NOTHING;

-- ── Cliente teste ───────────────────────────────────────────────────────────
INSERT INTO customers (id, name, email, phone, "passwordHash", active, "createdAt", "updatedAt")
VALUES (
  'cliente-teste-1',
  'Cliente Teste',
  'cliente@teste.com',
  '37999999999',
  '$2a$10$WYZw6mK1fSRdB9aVQxZD4OnlutJsdfX1sA/hM04tbugCBPGISHh4O',
  true,
  NOW(), NOW()
) ON CONFLICT (email) DO NOTHING;

-- ── Categorias principais ───────────────────────────────────────────────────
INSERT INTO categories (id, name, slug, description, active, "order", "parentId", "createdAt", "updatedAt") VALUES
('cat-sex-shop',          'Sex Shop',                        'sex-shop',                       'Linha adulta com discrição total',          true, 1,  NULL, NOW(), NOW()),
('cat-capinhas',          'Capinhas e acessórios de celular','capinhas-acessorios-celular',    'Capinhas e acessórios para celular',        true, 2,  NULL, NOW(), NOW()),
('cat-bijuterias',        'Bijuterias',                      'bijuterias',                     'Brincos, colares e pulseiras',              true, 3,  NULL, NOW(), NOW()),
('cat-bolsas',            'Bolsas e Necessaires',            'bolsas-necessaires',             'Bolsas, carteiras e necessaires',           true, 4,  NULL, NOW(), NOW()),
('cat-relogios',          'Relógios',                        'relogios',                       'Relógios masculinos e femininos',           true, 5,  NULL, NOW(), NOW()),
('cat-maquiagem',         'Maquiagem',                       'maquiagem',                      'Maquiagem e cosméticos',                    true, 6,  NULL, NOW(), NOW()),
('cat-utilidades',        'Utilidades domésticas',           'utilidades-domesticas',          'Utilidades para o lar',                     true, 7,  NULL, NOW(), NOW()),
('cat-decoracao',         'Decoração',                       'decoracao',                      'Itens de decoração',                        true, 8,  NULL, NOW(), NOW()),
('cat-perfumaria',        'Perfumaria',                      'perfumaria',                     'Perfumes e fragrâncias',                    true, 9,  NULL, NOW(), NOW()),
('cat-oculos',            'Óculos',                          'oculos',                         'Óculos de sol e grau fashion',              true, 10, NULL, NOW(), NOW()),
('cat-acessorios-cabelo', 'Acessórios de cabelo',            'acessorios-cabelo',              'Tiaras, presilhas e acessórios',            true, 11, NULL, NOW(), NOW()),
('cat-pijamas',           'Pijamas',                         'pijamas',                        'Pijamas confortáveis',                      true, 12, NULL, NOW(), NOW()),
('cat-lingerie',          'Lingerie',                        'lingerie',                       'Lingerie feminina',                         true, 13, NULL, NOW(), NOW()),
('cat-roupa-infantil',    'Roupa infantil',                  'roupa-infantil',                 'Roupas para crianças',                      true, 14, NULL, NOW(), NOW()),
('cat-acessorios-inverno','Acessórios de inverno',           'acessorios-inverno',             'Cachecóis, luvas e gorros',                 true, 15, NULL, NOW(), NOW()),
('cat-pet',               'Pet',                             'pet',                            'Produtos para pets',                        true, 16, NULL, NOW(), NOW()),
('cat-papelaria',         'Papelaria',                       'papelaria',                      'Cadernos, canetas e papelaria',             true, 17, NULL, NOW(), NOW()),
('cat-brinquedos',        'Brinquedos',                      'brinquedos',                     'Brinquedos e jogos',                        true, 18, NULL, NOW(), NOW()),
('cat-cintos',            'Cintos',                          'cintos',                         'Cintos masculinos e femininos',             true, 19, NULL, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- ── Subcategorias Sex Shop ─────────────────────────────────────────────────
INSERT INTO categories (id, name, slug, description, active, "order", "parentId", "createdAt", "updatedAt") VALUES
('sub-geis',        'Géis & Cremes',      'sex-shop-geis-e-cremes',    'Géis e cremes sensuais',      true, 1, 'cat-sex-shop', NOW(), NOW()),
('sub-vibradores',  'Vibradores',         'sex-shop-vibradores',       'Vibradores e massageadores',  true, 2, 'cat-sex-shop', NOW(), NOW()),
('sub-aneis',       'Anéis Penianos',     'sex-shop-aneis',            'Anéis penianos',              true, 3, 'cat-sex-shop', NOW(), NOW()),
('sub-masturbadores','Masturbadores',     'sex-shop-masturbadores',    'Masturbadores masculinos',    true, 4, 'cat-sex-shop', NOW(), NOW()),
('sub-lubrificantes','Lubrificantes',     'sex-shop-lubrificantes',    'Lubrificantes íntimos',       true, 5, 'cat-sex-shop', NOW(), NOW()),
('sub-balas',       'Balas Líquidas',     'sex-shop-balas-liquidas',   'Balas e gomas sensuais',      true, 6, 'cat-sex-shop', NOW(), NOW()),
('sub-desodorantes','Desodorantes Íntimos','sex-shop-desodorantes',    'Desodorantes íntimos',        true, 7, 'cat-sex-shop', NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- ── Subcategorias Óculos ───────────────────────────────────────────────────
INSERT INTO categories (id, name, slug, description, active, "order", "parentId", "createdAt", "updatedAt") VALUES
('sub-oculos-infantil', 'Infantil', 'oculos-infantil', 'Óculos infantis', true, 1, 'cat-oculos', NOW(), NOW()),
('sub-oculos-adulto',   'Adulto',   'oculos-adulto',   'Óculos adulto',   true, 2, 'cat-oculos', NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- ── Store settings ─────────────────────────────────────────────────────────
INSERT INTO store_settings (id, "storeName", "storeAddress", "storeCity", "storeState", "storeZipCode", "storePhone", "storeWhatsapp", "storeEmail", "mototaxiPrice", "mototaxiEnabled", "correiosEnabled", "storePickupEnabled", "updatedAt")
VALUES (
  'store-kabijoux-1',
  'KA Bijoux',
  'Rua Principal, 123',
  'Itaúna',
  'MG',
  '35680-000',
  '37999999999',
  '5537999999999',
  'contato@kabijoux.com.br',
  10.00,
  true,
  true,
  true,
  NOW()
) ON CONFLICT (id) DO NOTHING;
