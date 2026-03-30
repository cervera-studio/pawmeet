output "fqdn" {
  description = "Fully qualified domain name of the PostgreSQL server"
  value       = azurerm_postgresql_flexible_server.main.fqdn
}

output "database_url" {
  description = "PostgreSQL connection string (direct, port 5432)"
  value       = "postgresql://${var.admin_username}:${var.admin_password}@${azurerm_postgresql_flexible_server.main.fqdn}:5432/${var.database_name}?sslmode=require"
  sensitive   = true
}

output "database_url_pooled" {
  description = "PostgreSQL connection string via PgBouncer (port 6432)"
  value       = "postgresql://${var.admin_username}:${var.admin_password}@${azurerm_postgresql_flexible_server.main.fqdn}:6432/${var.database_name}?sslmode=require"
  sensitive   = true
}

output "server_id" {
  description = "Azure resource ID of the PostgreSQL server"
  value       = azurerm_postgresql_flexible_server.main.id
}
