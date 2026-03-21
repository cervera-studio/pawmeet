output "fqdn" {
  description = "Container App FQDN"
  value       = azurerm_container_app.main.ingress[0].fqdn
}

output "id" {
  description = "Container App resource ID"
  value       = azurerm_container_app.main.id
}

output "identity_principal_id" {
  description = "Managed identity principal ID"
  value       = azurerm_user_assigned_identity.pull.principal_id
}
