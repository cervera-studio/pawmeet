# ── Managed Identity for ACR pull ───────────────────────────────
resource "azurerm_user_assigned_identity" "pull" {
  name                = "id-${var.project}-${var.name}-${var.environment}"
  resource_group_name = var.resource_group_name
  location            = var.location

  tags = var.tags
}

resource "azurerm_role_assignment" "acr_pull" {
  scope                = var.container_registry_id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_user_assigned_identity.pull.principal_id
}

# ── Container App ───────────────────────────────────────────────
resource "azurerm_container_app" "main" {
  name                         = "ca-${var.project}-${var.name}-${var.environment}"
  container_app_environment_id = var.container_app_environment_id
  resource_group_name          = var.resource_group_name
  revision_mode                = "Single"

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.pull.id]
  }

  registry {
    server   = var.container_registry_server
    identity = azurerm_user_assigned_identity.pull.id
  }

  ingress {
    external_enabled = true
    target_port      = var.port
    transport        = "auto"

    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }

  template {
    min_replicas = var.min_replicas
    max_replicas = var.max_replicas

    container {
      name   = var.name
      image  = "${var.container_registry_server}/${var.project}-${var.name}:${var.image_tag}"
      cpu    = var.cpu
      memory = var.memory

      # Plain environment variables
      dynamic "env" {
        for_each = var.env_vars
        content {
          name  = env.key
          value = env.value
        }
      }

      # Secret-backed environment variables
      dynamic "env" {
        for_each = nonsensitive(toset(keys(var.secret_env_vars)))
        content {
          name        = env.value
          secret_name = lower(replace(env.value, "_", "-"))
        }
      }

      # Startup probe — generous timeout for cold starts (ONNX model loading)
      startup_probe {
        path      = var.health_check_path
        port      = var.port
        transport = "HTTP"

        initial_delay    = 5
        interval_seconds = 5
        timeout          = 5
        failure_count_threshold = 10
      }

      # Liveness probe — restart unhealthy containers
      liveness_probe {
        path      = var.health_check_path
        port      = var.port
        transport = "HTTP"

        initial_delay    = 0
        interval_seconds = 30
        timeout          = 5
        failure_count_threshold = 3
      }

      # Readiness probe — stop routing to unready replicas
      readiness_probe {
        path      = var.health_check_path
        port      = var.port
        transport = "HTTP"

        interval_seconds = 10
        timeout          = 5
        failure_count_threshold = 3
      }
    }

    http_scale_rule {
      name                = "http-concurrency"
      concurrent_requests = tostring(var.http_concurrency_threshold)
    }
  }

  # Secrets
  dynamic "secret" {
    for_each = nonsensitive(toset(keys(var.secret_env_vars)))
    content {
      name  = lower(replace(secret.value, "_", "-"))
      value = var.secret_env_vars[secret.value]
    }
  }

  tags = var.tags

  depends_on = [azurerm_role_assignment.acr_pull]
}

# ── Sticky sessions (not yet in azurerm provider — patch via azapi) ──
# azapi_update_resource requires re-sending all secrets in the PUT payload,
# which is impractical since secret values are write-only. Use a local-exec
# provisioner with Azure CLI instead.
resource "terraform_data" "sticky_sessions" {
  count = var.session_affinity_enabled ? 1 : 0

  triggers_replace = [azurerm_container_app.main.id]

  provisioner "local-exec" {
    command = <<-EOT
      az containerapp ingress sticky-sessions set \
        --name ${azurerm_container_app.main.name} \
        --resource-group ${var.resource_group_name} \
        --affinity sticky
    EOT
  }
}

