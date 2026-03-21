terraform {
  required_version = ">= 1.5"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }

  backend "azurerm" {
    # Configure via backend.hcl or -backend-config flags:
    #   resource_group_name  = "pawmeet-tfstate"
    #   storage_account_name = "pawmeettfstate"
    #   container_name       = "tfstate"
    #   key                  = "api.tfstate"
  }
}

provider "azurerm" {
  features {}
  subscription_id = var.subscription_id
}

# ── Resource Group ──────────────────────────────────────────────
resource "azurerm_resource_group" "main" {
  name     = "rg-${var.project}-${var.environment}"
  location = var.location

  tags = local.tags
}

# ── Container Registry ──────────────────────────────────────────
resource "azurerm_container_registry" "main" {
  name                = replace("cr${var.project}${var.environment}", "-", "")
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku                 = "Basic"
  admin_enabled       = false

  tags = local.tags
}

# ── Log Analytics Workspace ─────────────────────────────────────
resource "azurerm_log_analytics_workspace" "main" {
  name                = "log-${var.project}-${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku                 = "PerGB2018"
  retention_in_days   = 30

  tags = local.tags
}

# ── Container Apps Environment ──────────────────────────────────
resource "azurerm_container_app_environment" "main" {
  name                       = "cae-${var.project}-${var.environment}"
  resource_group_name        = azurerm_resource_group.main.name
  location                   = azurerm_resource_group.main.location
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id

  tags = local.tags
}

# ── Container App (API) ────────────────────────────────────────
module "api" {
  source = "./modules/container-app"

  name                         = "api"
  project                      = var.project
  environment                  = var.environment
  resource_group_name          = azurerm_resource_group.main.name
  location                     = azurerm_resource_group.main.location
  container_app_environment_id = azurerm_container_app_environment.main.id
  container_registry_id        = azurerm_container_registry.main.id
  container_registry_server    = azurerm_container_registry.main.login_server

  image_tag = var.api_image_tag

  cpu    = 1.0
  memory = "2Gi"

  min_replicas = var.min_replicas
  max_replicas = var.max_replicas

  # Autoscale when concurrent HTTP requests exceed this threshold per replica
  http_concurrency_threshold = 100

  # Health probes matching current /health endpoint
  health_check_path = "/health"
  port              = 3000

  # WebSocket support
  session_affinity_enabled = true

  env_vars = {
    NODE_ENV    = "production"
    PORT        = "3000"
    APP_VERSION = var.api_image_tag
  }

  secret_env_vars = var.api_secrets

  tags = local.tags
}

# ── Outputs ─────────────────────────────────────────────────────
output "api_fqdn" {
  description = "API fully qualified domain name"
  value       = module.api.fqdn
}

output "api_url" {
  description = "API base URL"
  value       = "https://${module.api.fqdn}"
}

output "container_registry_server" {
  description = "ACR login server"
  value       = azurerm_container_registry.main.login_server
}
