# ── Azure Flexible Server for PostgreSQL ─────────────────────────
resource "azurerm_postgresql_flexible_server" "main" {
  name                          = "psql-${var.project}-${var.environment}"
  resource_group_name           = var.resource_group_name
  location                      = var.location
  version                       = "16"
  administrator_login           = var.admin_username
  administrator_password        = var.admin_password
  zone                          = "1"
  storage_mb                    = var.storage_mb
  sku_name                      = var.sku_name
  backup_retention_days         = 7
  geo_redundant_backup_enabled  = false
  public_network_access_enabled = true

  tags = var.tags
}

# ── Firewall: allow Azure services ──────────────────────────────
resource "azurerm_postgresql_flexible_server_firewall_rule" "azure_services" {
  name             = "AllowAzureServices"
  server_id        = azurerm_postgresql_flexible_server.main.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}

# ── Database ────────────────────────────────────────────────────
resource "azurerm_postgresql_flexible_server_database" "main" {
  name      = var.database_name
  server_id = azurerm_postgresql_flexible_server.main.id
  charset   = "UTF8"
  collation = "en_US.utf8"
}

# ── Extensions: PostGIS, pgvector, pg_trgm ──────────────────────
resource "azurerm_postgresql_flexible_server_configuration" "extensions" {
  name      = "azure.extensions"
  server_id = azurerm_postgresql_flexible_server.main.id
  value     = "POSTGIS,VECTOR,PG_TRGM"
}

# ── PgBouncer ───────────────────────────────────────────────────
resource "azurerm_postgresql_flexible_server_configuration" "pgbouncer" {
  name      = "pgbouncer.enabled"
  server_id = azurerm_postgresql_flexible_server.main.id
  value     = "true"
}
