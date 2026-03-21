variable "name" {
  description = "Service name (e.g. api)"
  type        = string
}

variable "project" {
  description = "Project name"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "resource_group_name" {
  description = "Resource group name"
  type        = string
}

variable "location" {
  description = "Azure region"
  type        = string
}

variable "container_app_environment_id" {
  description = "Container Apps Environment ID"
  type        = string
}

variable "container_registry_id" {
  description = "ACR resource ID (for role assignment)"
  type        = string
}

variable "container_registry_server" {
  description = "ACR login server (e.g. crpawmeetprod.azurecr.io)"
  type        = string
}

variable "image_tag" {
  description = "Docker image tag"
  type        = string
}

variable "port" {
  description = "Container port"
  type        = number
  default     = 3000
}

variable "cpu" {
  description = "CPU cores per replica"
  type        = number
  default     = 1.0
}

variable "memory" {
  description = "Memory per replica (e.g. 2Gi)"
  type        = string
  default     = "2Gi"
}

variable "min_replicas" {
  description = "Minimum replicas"
  type        = number
  default     = 2
}

variable "max_replicas" {
  description = "Maximum replicas"
  type        = number
  default     = 5
}

variable "http_concurrency_threshold" {
  description = "Concurrent requests per replica before scaling"
  type        = number
  default     = 100
}

variable "health_check_path" {
  description = "Health check endpoint path"
  type        = string
  default     = "/health"
}

variable "session_affinity_enabled" {
  description = "Enable sticky sessions (required for WebSocket)"
  type        = bool
  default     = false
}

variable "env_vars" {
  description = "Plain environment variables"
  type        = map(string)
  default     = {}
}

variable "secret_env_vars" {
  description = "Secret environment variables"
  type        = map(string)
  default     = {}
  sensitive   = true
}

variable "tags" {
  description = "Azure resource tags"
  type        = map(string)
  default     = {}
}
