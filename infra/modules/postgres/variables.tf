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

variable "admin_username" {
  description = "PostgreSQL administrator username"
  type        = string
  default     = "pawmeetadmin"
}

variable "admin_password" {
  description = "PostgreSQL administrator password"
  type        = string
  sensitive   = true
}

variable "database_name" {
  description = "Name of the database to create"
  type        = string
  default     = "pawmeet"
}

variable "sku_name" {
  description = "Flexible Server SKU (e.g. B_Standard_B1ms for burstable)"
  type        = string
  default     = "B_Standard_B1ms"
}

variable "storage_mb" {
  description = "Storage in MB"
  type        = number
  default     = 32768 # 32 GB
}

variable "tags" {
  description = "Resource tags"
  type        = map(string)
  default     = {}
}
