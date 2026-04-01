variable "subscription_id" {
  description = "Azure subscription ID"
  type        = string
}

variable "project" {
  description = "Project name used in resource naming"
  type        = string
  default     = "pawmeet"
}

variable "environment" {
  description = "Environment name (prod, staging)"
  type        = string
  default     = "prod"
}

variable "location" {
  description = "Azure region"
  type        = string
  default     = "westeurope"
}

variable "api_image_tag" {
  description = "Docker image tag for the API container"
  type        = string
  default     = "latest"
}

variable "min_replicas" {
  description = "Minimum number of container replicas"
  type        = number
  default     = 2
}

variable "max_replicas" {
  description = "Maximum number of container replicas"
  type        = number
  default     = 10
}

variable "api_secrets" {
  description = "Secret environment variables for the API (name → value)"
  type        = map(string)
  default     = {}
  sensitive   = true
}

variable "admin_image_tag" {
  description = "Docker image tag for the admin container"
  type        = string
  default     = "latest"
}

variable "admin_secrets" {
  description = "Secret environment variables for the admin app (name → value)"
  type        = map(string)
  default     = {}
  sensitive   = true
}
