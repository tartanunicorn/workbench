
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "balances_notices": {
                  Row: {
                    "amount": number | null,"created_at": string,"customer_id": string | null,"deleted_at": string | null,"kind": string | null,"notice_id": string,"owner_id": string | null,"period": string | null,"place": string | null,"received_on": string | null,"respond_by": string | null,"status": string | null,"task_id": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount"?: number | null,"created_at"?: string,"customer_id"?: string | null,"deleted_at"?: string | null,"kind"?: string | null,"notice_id": string,"owner_id"?: string | null,"period"?: string | null,"place"?: string | null,"received_on"?: string | null,"respond_by"?: string | null,"status"?: string | null,"task_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "amount"?: number | null,"created_at"?: string,"customer_id"?: string | null,"deleted_at"?: string | null,"kind"?: string | null,"notice_id"?: string,"owner_id"?: string | null,"period"?: string | null,"place"?: string | null,"received_on"?: string | null,"respond_by"?: string | null,"status"?: string | null,"task_id"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "balances_notices_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customer_grid"
      referencedColumns: ["customer_id"]
    },{
      foreignKeyName: "balances_notices_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["customer_id"]
    },{
      foreignKeyName: "balances_notices_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "owners"
      referencedColumns: ["owner_id"]
    },{
      foreignKeyName: "balances_notices_task_id_fkey"
      columns: ["task_id"]
isOneToOne: false
      referencedRelation: "return_board"
      referencedColumns: ["header_task_id"]
    },{
      foreignKeyName: "balances_notices_task_id_fkey"
      columns: ["task_id"]
isOneToOne: false
      referencedRelation: "task_board"
      referencedColumns: ["parent_id"]
    },{
      foreignKeyName: "balances_notices_task_id_fkey"
      columns: ["task_id"]
isOneToOne: false
      referencedRelation: "task_board"
      referencedColumns: ["task_id"]
    },{
      foreignKeyName: "balances_notices_task_id_fkey"
      columns: ["task_id"]
isOneToOne: false
      referencedRelation: "task_grid"
      referencedColumns: ["parent_id"]
    },{
      foreignKeyName: "balances_notices_task_id_fkey"
      columns: ["task_id"]
isOneToOne: false
      referencedRelation: "task_grid"
      referencedColumns: ["task_id"]
    },{
      foreignKeyName: "balances_notices_task_id_fkey"
      columns: ["task_id"]
isOneToOne: false
      referencedRelation: "tasks"
      referencedColumns: ["task_id"]
    }
                  ]
                },"countries": {
                  Row: {
                    "country_code": string,"created_at": string,"currency": string | null,"deleted_at": string | null,"is_union": boolean,"name": string,"notes": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "country_code": string,"created_at"?: string,"currency"?: string | null,"deleted_at"?: string | null,"is_union"?: boolean,"name": string,"notes"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "country_code"?: string,"created_at"?: string,"currency"?: string | null,"deleted_at"?: string | null,"is_union"?: boolean,"name"?: string,"notes"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"customers": {
                  Row: {
                    "created_at": string,"customer_approver": string | null,"customer_id": string,"deleted_at": string | null,"historical_scope": string | null,"internal_review": boolean,"name": string,"notes": string | null,"org_id": string | null,"release_owner": string | null,"status": string,"tier": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"customer_approver"?: string | null,"customer_id"?: string,"deleted_at"?: string | null,"historical_scope"?: string | null,"internal_review"?: boolean,"name": string,"notes"?: string | null,"org_id"?: string | null,"release_owner"?: string | null,"status"?: string,"tier"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"customer_approver"?: string | null,"customer_id"?: string,"deleted_at"?: string | null,"historical_scope"?: string | null,"internal_review"?: boolean,"name"?: string,"notes"?: string | null,"org_id"?: string | null,"release_owner"?: string | null,"status"?: string,"tier"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "customers_customer_approver_fkey"
      columns: ["customer_approver"]
isOneToOne: false
      referencedRelation: "owners"
      referencedColumns: ["owner_id"]
    },{
      foreignKeyName: "customers_release_owner_fkey"
      columns: ["release_owner"]
isOneToOne: false
      referencedRelation: "owners"
      referencedColumns: ["owner_id"]
    }
                  ]
                },"holidays": {
                  Row: {
                    "calendar": string,"created_at": string,"date": string,"deleted_at": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "calendar": string,"created_at"?: string,"date": string,"deleted_at"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "calendar"?: string,"created_at"?: string,"date"?: string,"deleted_at"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"members": {
                  Row: {
                    "added_at": string,"email": string
                  }
                  ComputedFields: never
                  Insert: {
                    "added_at"?: string,"email": string
                  }
                  Update: {
                    "added_at"?: string,"email"?: string
                  }
                  Relationships: [
                    
                  ]
                },"owners": {
                  Row: {
                    "active": boolean,"capacity_per_run": number | null,"created_at": string,"deleted_at": string | null,"name": string,"owner_id": string,"role_note": string | null,"team_or_company": string | null,"type": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"capacity_per_run"?: number | null,"created_at"?: string,"deleted_at"?: string | null,"name": string,"owner_id": string,"role_note"?: string | null,"team_or_company"?: string | null,"type": string,"updated_at"?: string
                  }
                  Update: {
                    "active"?: boolean,"capacity_per_run"?: number | null,"created_at"?: string,"deleted_at"?: string | null,"name"?: string,"owner_id"?: string,"role_note"?: string | null,"team_or_company"?: string | null,"type"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"ownerships": {
                  Row: {
                    "created_at": string,"deleted_at": string | null,"from_date": string | null,"owner_id": string,"ownership_id": number,"return_id": string | null,"role": string,"run_id": string | null,"task_id": string | null,"to_date": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"deleted_at"?: string | null,"from_date"?: string | null,"owner_id": string,"ownership_id"?: never,"return_id"?: string | null,"role": string,"run_id"?: string | null,"task_id"?: string | null,"to_date"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"deleted_at"?: string | null,"from_date"?: string | null,"owner_id"?: string,"ownership_id"?: never,"return_id"?: string | null,"role"?: string,"run_id"?: string | null,"task_id"?: string | null,"to_date"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ownerships_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "owners"
      referencedColumns: ["owner_id"]
    },{
      foreignKeyName: "ownerships_return_id_fkey"
      columns: ["return_id"]
isOneToOne: false
      referencedRelation: "return_board"
      referencedColumns: ["return_id"]
    },{
      foreignKeyName: "ownerships_return_id_fkey"
      columns: ["return_id"]
isOneToOne: false
      referencedRelation: "return_grid"
      referencedColumns: ["return_id"]
    },{
      foreignKeyName: "ownerships_return_id_fkey"
      columns: ["return_id"]
isOneToOne: false
      referencedRelation: "returns"
      referencedColumns: ["return_id"]
    },{
      foreignKeyName: "ownerships_run_id_fkey"
      columns: ["run_id"]
isOneToOne: false
      referencedRelation: "run_calendar"
      referencedColumns: ["run_id"]
    },{
      foreignKeyName: "ownerships_run_id_fkey"
      columns: ["run_id"]
isOneToOne: false
      referencedRelation: "runs"
      referencedColumns: ["run_id"]
    },{
      foreignKeyName: "ownerships_task_id_fkey"
      columns: ["task_id"]
isOneToOne: false
      referencedRelation: "return_board"
      referencedColumns: ["header_task_id"]
    },{
      foreignKeyName: "ownerships_task_id_fkey"
      columns: ["task_id"]
isOneToOne: false
      referencedRelation: "task_board"
      referencedColumns: ["parent_id"]
    },{
      foreignKeyName: "ownerships_task_id_fkey"
      columns: ["task_id"]
isOneToOne: false
      referencedRelation: "task_board"
      referencedColumns: ["task_id"]
    },{
      foreignKeyName: "ownerships_task_id_fkey"
      columns: ["task_id"]
isOneToOne: false
      referencedRelation: "task_grid"
      referencedColumns: ["parent_id"]
    },{
      foreignKeyName: "ownerships_task_id_fkey"
      columns: ["task_id"]
isOneToOne: false
      referencedRelation: "task_grid"
      referencedColumns: ["task_id"]
    },{
      foreignKeyName: "ownerships_task_id_fkey"
      columns: ["task_id"]
isOneToOne: false
      referencedRelation: "tasks"
      referencedColumns: ["task_id"]
    }
                  ]
                },"regions": {
                  Row: {
                    "country_code": string,"created_at": string,"deleted_at": string | null,"level": string | null,"name": string,"notes": string | null,"parent_region": string | null,"region_code": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "country_code": string,"created_at"?: string,"deleted_at"?: string | null,"level"?: string | null,"name": string,"notes"?: string | null,"parent_region"?: string | null,"region_code": string,"updated_at"?: string
                  }
                  Update: {
                    "country_code"?: string,"created_at"?: string,"deleted_at"?: string | null,"level"?: string | null,"name"?: string,"notes"?: string | null,"parent_region"?: string | null,"region_code"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "regions_country_code_fkey"
      columns: ["country_code"]
isOneToOne: false
      referencedRelation: "countries"
      referencedColumns: ["country_code"]
    },{
      foreignKeyName: "regions_parent_region_fkey"
      columns: ["parent_region"]
isOneToOne: false
      referencedRelation: "regions"
      referencedColumns: ["region_code"]
    }
                  ]
                },"registration_type_rules": {
                  Row: {
                    "created_at": string,"deleted_at": string | null,"field": string,"notes": string | null,"registration_type_id": string,"rule_id": string,"updated_at": string,"valid_from": string,"value": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"deleted_at"?: string | null,"field": string,"notes"?: string | null,"registration_type_id": string,"rule_id"?: string,"updated_at"?: string,"valid_from": string,"value"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"deleted_at"?: string | null,"field"?: string,"notes"?: string | null,"registration_type_id"?: string,"rule_id"?: string,"updated_at"?: string,"valid_from"?: string,"value"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "return_type_rules_return_type_id_fkey"
      columns: ["registration_type_id"]
isOneToOne: false
      referencedRelation: "registration_type_grid"
      referencedColumns: ["registration_type_id"]
    },{
      foreignKeyName: "return_type_rules_return_type_id_fkey"
      columns: ["registration_type_id"]
isOneToOne: false
      referencedRelation: "registration_types"
      referencedColumns: ["registration_type_id"]
    }
                  ]
                },"registration_types": {
                  Row: {
                    "active": boolean,"country_code": string,"created_at": string,"deleted_at": string | null,"frequency": string,"name": string,"notes": string | null,"region_code": string | null,"registration_type_id": string,"tax_type": string,"updated_at": string,"workflow": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"country_code": string,"created_at"?: string,"deleted_at"?: string | null,"frequency": string,"name": string,"notes"?: string | null,"region_code"?: string | null,"registration_type_id"?: string,"tax_type": string,"updated_at"?: string,"workflow": string
                  }
                  Update: {
                    "active"?: boolean,"country_code"?: string,"created_at"?: string,"deleted_at"?: string | null,"frequency"?: string,"name"?: string,"notes"?: string | null,"region_code"?: string | null,"registration_type_id"?: string,"tax_type"?: string,"updated_at"?: string,"workflow"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "return_types_country_code_fkey"
      columns: ["country_code"]
isOneToOne: false
      referencedRelation: "countries"
      referencedColumns: ["country_code"]
    },{
      foreignKeyName: "return_types_region_code_fkey"
      columns: ["region_code"]
isOneToOne: false
      referencedRelation: "regions"
      referencedColumns: ["region_code"]
    }
                  ]
                },"registrations": {
                  Row: {
                    "account_ref": string | null,"account_source": string | null,"active_from": string,"active_to": string | null,"created_at": string,"customer_id": string,"deleted_at": string | null,"frequency_source": string | null,"last_portal_check": string | null,"notes": string | null,"registration_id": string,"registration_type_id": string,"updated_at": string,"verified_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "account_ref"?: string | null,"account_source"?: string | null,"active_from": string,"active_to"?: string | null,"created_at"?: string,"customer_id": string,"deleted_at"?: string | null,"frequency_source"?: string | null,"last_portal_check"?: string | null,"notes"?: string | null,"registration_id"?: string,"registration_type_id": string,"updated_at"?: string,"verified_by"?: string | null
                  }
                  Update: {
                    "account_ref"?: string | null,"account_source"?: string | null,"active_from"?: string,"active_to"?: string | null,"created_at"?: string,"customer_id"?: string,"deleted_at"?: string | null,"frequency_source"?: string | null,"last_portal_check"?: string | null,"notes"?: string | null,"registration_id"?: string,"registration_type_id"?: string,"updated_at"?: string,"verified_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "registrations_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customer_grid"
      referencedColumns: ["customer_id"]
    },{
      foreignKeyName: "registrations_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["customer_id"]
    },{
      foreignKeyName: "registrations_return_type_id_fkey"
      columns: ["registration_type_id"]
isOneToOne: false
      referencedRelation: "registration_type_grid"
      referencedColumns: ["registration_type_id"]
    },{
      foreignKeyName: "registrations_return_type_id_fkey"
      columns: ["registration_type_id"]
isOneToOne: false
      referencedRelation: "registration_types"
      referencedColumns: ["registration_type_id"]
    },{
      foreignKeyName: "registrations_verified_by_fkey"
      columns: ["verified_by"]
isOneToOne: false
      referencedRelation: "owners"
      referencedColumns: ["owner_id"]
    }
                  ]
                },"return_events": {
                  Row: {
                    "actor": string | null,"at": string,"created_at": string,"deleted_at": string | null,"event_id": string,"from_stage": string | null,"from_state": string | null,"note": string | null,"return_id": string,"source": string | null,"to_stage": string | null,"to_state": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actor"?: string | null,"at"?: string,"created_at"?: string,"deleted_at"?: string | null,"event_id"?: string,"from_stage"?: string | null,"from_state"?: string | null,"note"?: string | null,"return_id": string,"source"?: string | null,"to_stage"?: string | null,"to_state"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "actor"?: string | null,"at"?: string,"created_at"?: string,"deleted_at"?: string | null,"event_id"?: string,"from_stage"?: string | null,"from_state"?: string | null,"note"?: string | null,"return_id"?: string,"source"?: string | null,"to_stage"?: string | null,"to_state"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "return_events_actor_fkey"
      columns: ["actor"]
isOneToOne: false
      referencedRelation: "owners"
      referencedColumns: ["owner_id"]
    },{
      foreignKeyName: "return_events_return_id_fkey"
      columns: ["return_id"]
isOneToOne: false
      referencedRelation: "return_board"
      referencedColumns: ["return_id"]
    },{
      foreignKeyName: "return_events_return_id_fkey"
      columns: ["return_id"]
isOneToOne: false
      referencedRelation: "return_grid"
      referencedColumns: ["return_id"]
    },{
      foreignKeyName: "return_events_return_id_fkey"
      columns: ["return_id"]
isOneToOne: false
      referencedRelation: "returns"
      referencedColumns: ["return_id"]
    }
                  ]
                },"returns": {
                  Row: {
                    "approved_on": string | null,"calculated": number | null,"collected": number | null,"confirmation_no": string | null,"created_at": string,"deleted_at": string | null,"due": number | null,"kind": string,"notes": string | null,"period_end": string,"period_start": string,"reason": string | null,"registration_id": string,"released_on": string | null,"return_id": string,"run_id": string,"stage": string,"state": string,"statutory_due": string | null,"submitted_on": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "approved_on"?: string | null,"calculated"?: number | null,"collected"?: number | null,"confirmation_no"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"due"?: number | null,"kind"?: string,"notes"?: string | null,"period_end": string,"period_start": string,"reason"?: string | null,"registration_id": string,"released_on"?: string | null,"return_id"?: string,"run_id": string,"stage"?: string,"state"?: string,"statutory_due"?: string | null,"submitted_on"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "approved_on"?: string | null,"calculated"?: number | null,"collected"?: number | null,"confirmation_no"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"due"?: number | null,"kind"?: string,"notes"?: string | null,"period_end"?: string,"period_start"?: string,"reason"?: string | null,"registration_id"?: string,"released_on"?: string | null,"return_id"?: string,"run_id"?: string,"stage"?: string,"state"?: string,"statutory_due"?: string | null,"submitted_on"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "returns_registration_id_fkey"
      columns: ["registration_id"]
isOneToOne: false
      referencedRelation: "registration_grid"
      referencedColumns: ["registration_id"]
    },{
      foreignKeyName: "returns_registration_id_fkey"
      columns: ["registration_id"]
isOneToOne: false
      referencedRelation: "registrations"
      referencedColumns: ["registration_id"]
    },{
      foreignKeyName: "returns_run_id_fkey"
      columns: ["run_id"]
isOneToOne: false
      referencedRelation: "run_calendar"
      referencedColumns: ["run_id"]
    },{
      foreignKeyName: "returns_run_id_fkey"
      columns: ["run_id"]
isOneToOne: false
      referencedRelation: "runs"
      referencedColumns: ["run_id"]
    }
                  ]
                },"rule_results": {
                  Row: {
                    "evaluated_at": string,"evidence": NonNullable<Json>,"pinned": boolean,"result": string,"return_id": string,"rule_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "evaluated_at"?: string,"evidence"?: NonNullable<Json>,"pinned"?: boolean,"result": string,"return_id": string,"rule_id": string
                  }
                  Update: {
                    "evaluated_at"?: string,"evidence"?: NonNullable<Json>,"pinned"?: boolean,"result"?: string,"return_id"?: string,"rule_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "rule_results_return_id_fkey"
      columns: ["return_id"]
isOneToOne: false
      referencedRelation: "return_board"
      referencedColumns: ["return_id"]
    },{
      foreignKeyName: "rule_results_return_id_fkey"
      columns: ["return_id"]
isOneToOne: false
      referencedRelation: "return_grid"
      referencedColumns: ["return_id"]
    },{
      foreignKeyName: "rule_results_return_id_fkey"
      columns: ["return_id"]
isOneToOne: false
      referencedRelation: "returns"
      referencedColumns: ["return_id"]
    },{
      foreignKeyName: "rule_results_rule_id_fkey"
      columns: ["rule_id"]
isOneToOne: false
      referencedRelation: "rules"
      referencedColumns: ["rule_id"]
    }
                  ]
                },"rules": {
                  Row: {
                    "active": boolean,"condition_id": string | null,"created_at": string,"deleted_at": string | null,"expression": Json | null,"kind": string,"message": string | null,"name": string,"notes": string | null,"registration_type_id": string | null,"rule_id": string,"source": string | null,"step_title": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"condition_id"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"expression"?: Json | null,"kind": string,"message"?: string | null,"name": string,"notes"?: string | null,"registration_type_id"?: string | null,"rule_id"?: string,"source"?: string | null,"step_title"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "active"?: boolean,"condition_id"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"expression"?: Json | null,"kind"?: string,"message"?: string | null,"name"?: string,"notes"?: string | null,"registration_type_id"?: string | null,"rule_id"?: string,"source"?: string | null,"step_title"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "rules_condition_id_fkey"
      columns: ["condition_id"]
isOneToOne: false
      referencedRelation: "rules"
      referencedColumns: ["rule_id"]
    },{
      foreignKeyName: "rules_return_type_id_fkey"
      columns: ["registration_type_id"]
isOneToOne: false
      referencedRelation: "registration_type_grid"
      referencedColumns: ["registration_type_id"]
    },{
      foreignKeyName: "rules_return_type_id_fkey"
      columns: ["registration_type_id"]
isOneToOne: false
      referencedRelation: "registration_types"
      referencedColumns: ["registration_type_id"]
    }
                  ]
                },"runs": {
                  Row: {
                    "created_at": string,"deleted_at": string | null,"notes": string | null,"period_end": string,"period_start": string,"run_id": string,"run_month": string,"status": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"deleted_at"?: string | null,"notes"?: string | null,"period_end": string,"period_start": string,"run_id": string,"run_month": string,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"deleted_at"?: string | null,"notes"?: string | null,"period_end"?: string,"period_start"?: string,"run_id"?: string,"run_month"?: string,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"settings": {
                  Row: {
                    "created_at": string,"deleted_at": string | null,"key": string,"notes": string | null,"updated_at": string,"value": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"deleted_at"?: string | null,"key": string,"notes"?: string | null,"updated_at"?: string,"value"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"deleted_at"?: string | null,"key"?: string,"notes"?: string | null,"updated_at"?: string,"value"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"task_relations": {
                  Row: {
                    "created_at": string,"deleted_at": string | null,"from_task_id": string,"notes": string | null,"relation_id": string,"relation_type": string,"to_task_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"deleted_at"?: string | null,"from_task_id": string,"notes"?: string | null,"relation_id"?: string,"relation_type": string,"to_task_id": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"deleted_at"?: string | null,"from_task_id"?: string,"notes"?: string | null,"relation_id"?: string,"relation_type"?: string,"to_task_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "task_relations_from_task_id_fkey"
      columns: ["from_task_id"]
isOneToOne: false
      referencedRelation: "return_board"
      referencedColumns: ["header_task_id"]
    },{
      foreignKeyName: "task_relations_from_task_id_fkey"
      columns: ["from_task_id"]
isOneToOne: false
      referencedRelation: "task_board"
      referencedColumns: ["parent_id"]
    },{
      foreignKeyName: "task_relations_from_task_id_fkey"
      columns: ["from_task_id"]
isOneToOne: false
      referencedRelation: "task_board"
      referencedColumns: ["task_id"]
    },{
      foreignKeyName: "task_relations_from_task_id_fkey"
      columns: ["from_task_id"]
isOneToOne: false
      referencedRelation: "task_grid"
      referencedColumns: ["parent_id"]
    },{
      foreignKeyName: "task_relations_from_task_id_fkey"
      columns: ["from_task_id"]
isOneToOne: false
      referencedRelation: "task_grid"
      referencedColumns: ["task_id"]
    },{
      foreignKeyName: "task_relations_from_task_id_fkey"
      columns: ["from_task_id"]
isOneToOne: false
      referencedRelation: "tasks"
      referencedColumns: ["task_id"]
    },{
      foreignKeyName: "task_relations_to_task_id_fkey"
      columns: ["to_task_id"]
isOneToOne: false
      referencedRelation: "return_board"
      referencedColumns: ["header_task_id"]
    },{
      foreignKeyName: "task_relations_to_task_id_fkey"
      columns: ["to_task_id"]
isOneToOne: false
      referencedRelation: "task_board"
      referencedColumns: ["parent_id"]
    },{
      foreignKeyName: "task_relations_to_task_id_fkey"
      columns: ["to_task_id"]
isOneToOne: false
      referencedRelation: "task_board"
      referencedColumns: ["task_id"]
    },{
      foreignKeyName: "task_relations_to_task_id_fkey"
      columns: ["to_task_id"]
isOneToOne: false
      referencedRelation: "task_grid"
      referencedColumns: ["parent_id"]
    },{
      foreignKeyName: "task_relations_to_task_id_fkey"
      columns: ["to_task_id"]
isOneToOne: false
      referencedRelation: "task_grid"
      referencedColumns: ["task_id"]
    },{
      foreignKeyName: "task_relations_to_task_id_fkey"
      columns: ["to_task_id"]
isOneToOne: false
      referencedRelation: "tasks"
      referencedColumns: ["task_id"]
    }
                  ]
                },"tasks": {
                  Row: {
                    "anchor": string | null,"applies_to_tier": string | null,"category": string | null,"completes_stage": number | null,"created_at": string,"customer_id": string | null,"deleted_at": string | null,"description": string | null,"done_on": string | null,"due_date": string | null,"kind": string,"notes": string | null,"notice_id": string | null,"offset": number | null,"owner_role": string | null,"priority": string | null,"raised_by": string | null,"raised_on": string | null,"registration_id": string | null,"registration_type_id": string | null,"resolution": string | null,"return_filter": string | null,"return_id": string | null,"run_id": string | null,"source": string | null,"source_ref": string | null,"status": string | null,"systemic_fix": boolean | null,"task_id": string,"template_id": string | null,"title": string,"updated_at": string,"waiting_on": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "anchor"?: string | null,"applies_to_tier"?: string | null,"category"?: string | null,"completes_stage"?: number | null,"created_at"?: string,"customer_id"?: string | null,"deleted_at"?: string | null,"description"?: string | null,"done_on"?: string | null,"due_date"?: string | null,"kind": string,"notes"?: string | null,"notice_id"?: string | null,"offset"?: number | null,"owner_role"?: string | null,"priority"?: string | null,"raised_by"?: string | null,"raised_on"?: string | null,"registration_id"?: string | null,"registration_type_id"?: string | null,"resolution"?: string | null,"return_filter"?: string | null,"return_id"?: string | null,"run_id"?: string | null,"source"?: string | null,"source_ref"?: string | null,"status"?: string | null,"systemic_fix"?: boolean | null,"task_id"?: string,"template_id"?: string | null,"title": string,"updated_at"?: string,"waiting_on"?: string | null
                  }
                  Update: {
                    "anchor"?: string | null,"applies_to_tier"?: string | null,"category"?: string | null,"completes_stage"?: number | null,"created_at"?: string,"customer_id"?: string | null,"deleted_at"?: string | null,"description"?: string | null,"done_on"?: string | null,"due_date"?: string | null,"kind"?: string,"notes"?: string | null,"notice_id"?: string | null,"offset"?: number | null,"owner_role"?: string | null,"priority"?: string | null,"raised_by"?: string | null,"raised_on"?: string | null,"registration_id"?: string | null,"registration_type_id"?: string | null,"resolution"?: string | null,"return_filter"?: string | null,"return_id"?: string | null,"run_id"?: string | null,"source"?: string | null,"source_ref"?: string | null,"status"?: string | null,"systemic_fix"?: boolean | null,"task_id"?: string,"template_id"?: string | null,"title"?: string,"updated_at"?: string,"waiting_on"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "tasks_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customer_grid"
      referencedColumns: ["customer_id"]
    },{
      foreignKeyName: "tasks_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["customer_id"]
    },{
      foreignKeyName: "tasks_notice_id_fkey"
      columns: ["notice_id"]
isOneToOne: false
      referencedRelation: "balances_notices"
      referencedColumns: ["notice_id"]
    },{
      foreignKeyName: "tasks_registration_id_fkey"
      columns: ["registration_id"]
isOneToOne: false
      referencedRelation: "registration_grid"
      referencedColumns: ["registration_id"]
    },{
      foreignKeyName: "tasks_registration_id_fkey"
      columns: ["registration_id"]
isOneToOne: false
      referencedRelation: "registrations"
      referencedColumns: ["registration_id"]
    },{
      foreignKeyName: "tasks_return_id_fkey"
      columns: ["return_id"]
isOneToOne: false
      referencedRelation: "return_board"
      referencedColumns: ["return_id"]
    },{
      foreignKeyName: "tasks_return_id_fkey"
      columns: ["return_id"]
isOneToOne: false
      referencedRelation: "return_grid"
      referencedColumns: ["return_id"]
    },{
      foreignKeyName: "tasks_return_id_fkey"
      columns: ["return_id"]
isOneToOne: false
      referencedRelation: "returns"
      referencedColumns: ["return_id"]
    },{
      foreignKeyName: "tasks_return_type_id_fkey"
      columns: ["registration_type_id"]
isOneToOne: false
      referencedRelation: "registration_type_grid"
      referencedColumns: ["registration_type_id"]
    },{
      foreignKeyName: "tasks_return_type_id_fkey"
      columns: ["registration_type_id"]
isOneToOne: false
      referencedRelation: "registration_types"
      referencedColumns: ["registration_type_id"]
    },{
      foreignKeyName: "tasks_run_id_fkey"
      columns: ["run_id"]
isOneToOne: false
      referencedRelation: "run_calendar"
      referencedColumns: ["run_id"]
    },{
      foreignKeyName: "tasks_run_id_fkey"
      columns: ["run_id"]
isOneToOne: false
      referencedRelation: "runs"
      referencedColumns: ["run_id"]
    },{
      foreignKeyName: "tasks_template_id_fkey"
      columns: ["template_id"]
isOneToOne: false
      referencedRelation: "return_board"
      referencedColumns: ["header_task_id"]
    },{
      foreignKeyName: "tasks_template_id_fkey"
      columns: ["template_id"]
isOneToOne: false
      referencedRelation: "task_board"
      referencedColumns: ["parent_id"]
    },{
      foreignKeyName: "tasks_template_id_fkey"
      columns: ["template_id"]
isOneToOne: false
      referencedRelation: "task_board"
      referencedColumns: ["task_id"]
    },{
      foreignKeyName: "tasks_template_id_fkey"
      columns: ["template_id"]
isOneToOne: false
      referencedRelation: "task_grid"
      referencedColumns: ["parent_id"]
    },{
      foreignKeyName: "tasks_template_id_fkey"
      columns: ["template_id"]
isOneToOne: false
      referencedRelation: "task_grid"
      referencedColumns: ["task_id"]
    },{
      foreignKeyName: "tasks_template_id_fkey"
      columns: ["template_id"]
isOneToOne: false
      referencedRelation: "tasks"
      referencedColumns: ["task_id"]
    }
                  ]
                }
          }
          Views: {
            "customer_grid": {
                  Row: {
                    "customer_approver": string | null,"customer_id": string,"historical_scope": string | null,"internal_review": boolean,"name": string,"notes": string | null,"open_issues": number | null,"org_id": string | null,"registrations": number | null,"release_owner": string | null,"setup_open": number | null,"status": string,"tier": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"registration_grid": {
                  Row: {
                    "account_ref": string | null,"account_source": string | null,"active_from": string,"active_to": string | null,"customer_id": string,"customer_name": string,"frequency": string,"is_active": boolean | null,"last_portal_check": string | null,"notes": string | null,"place_code": string | null,"registration_id": string,"registration_type_id": string,"setup_open": number | null,"state": string | null,"tax_type": string,"type_name": string,"verified_by": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "registrations_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customer_grid"
      referencedColumns: ["customer_id"]
    },{
      foreignKeyName: "registrations_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["customer_id"]
    },{
      foreignKeyName: "registrations_return_type_id_fkey"
      columns: ["registration_type_id"]
isOneToOne: false
      referencedRelation: "registration_type_grid"
      referencedColumns: ["registration_type_id"]
    },{
      foreignKeyName: "registrations_return_type_id_fkey"
      columns: ["registration_type_id"]
isOneToOne: false
      referencedRelation: "registration_types"
      referencedColumns: ["registration_type_id"]
    }
                  ]
                },"registration_type_grid": {
                  Row: {
                    "active": boolean,"automation": string | null,"country_code": string,"customers": number | null,"default_preparer": string | null,"default_reviewer": string | null,"due_rule": string | null,"due_value": string | null,"frequency": string,"name": string,"notes": string | null,"place_code": string | null,"region_code": string | null,"registration_type_id": string,"tax_type": string,"template_tasks": number | null,"workflow": string
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "return_types_country_code_fkey"
      columns: ["country_code"]
isOneToOne: false
      referencedRelation: "countries"
      referencedColumns: ["country_code"]
    },{
      foreignKeyName: "return_types_region_code_fkey"
      columns: ["region_code"]
isOneToOne: false
      referencedRelation: "regions"
      referencedColumns: ["region_code"]
    }
                  ]
                },"return_board": {
                  Row: {
                    "account_ref": string | null,"approved_on": string | null,"authority_due": string | null,"calculated": number | null,"collected": number | null,"confirmation_no": string | null,"customer_approver": string | null,"customer_id": string,"customer_name": string,"flag": string | null,"frequency": string,"gap": number | null,"header_task_id": string | null,"kind": string,"notes": string | null,"open_issues": number | null,"period_end": string,"period_start": string,"place_code": string | null,"preparer": string | null,"reason": string | null,"registration_id": string,"registration_type_id": string,"release_by": string | null,"release_owner": string | null,"released_on": string | null,"return_id": string,"reviewer": string | null,"rule_flags": (string)[] | null,"run_id": string,"stage": string,"stage_n": number | null,"state": string,"steps_done": number | null,"steps_total": number | null,"submit_due": string | null,"submitted_on": string | null,"tax_type": string,"tier": string | null,"tier_reasons": (string)[] | null,"tier_unknowns": (string)[] | null,"type_name": string,"workflow": string
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "registrations_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customer_grid"
      referencedColumns: ["customer_id"]
    },{
      foreignKeyName: "registrations_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["customer_id"]
    },{
      foreignKeyName: "registrations_return_type_id_fkey"
      columns: ["registration_type_id"]
isOneToOne: false
      referencedRelation: "registration_type_grid"
      referencedColumns: ["registration_type_id"]
    },{
      foreignKeyName: "registrations_return_type_id_fkey"
      columns: ["registration_type_id"]
isOneToOne: false
      referencedRelation: "registration_types"
      referencedColumns: ["registration_type_id"]
    },{
      foreignKeyName: "returns_registration_id_fkey"
      columns: ["registration_id"]
isOneToOne: false
      referencedRelation: "registration_grid"
      referencedColumns: ["registration_id"]
    },{
      foreignKeyName: "returns_registration_id_fkey"
      columns: ["registration_id"]
isOneToOne: false
      referencedRelation: "registrations"
      referencedColumns: ["registration_id"]
    },{
      foreignKeyName: "returns_run_id_fkey"
      columns: ["run_id"]
isOneToOne: false
      referencedRelation: "run_calendar"
      referencedColumns: ["run_id"]
    },{
      foreignKeyName: "returns_run_id_fkey"
      columns: ["run_id"]
isOneToOne: false
      referencedRelation: "runs"
      referencedColumns: ["run_id"]
    }
                  ]
                },"return_grid": {
                  Row: {
                    "calculated": number | null,"collected": number | null,"customer_name": string,"flag": string | null,"frequency": string,"gap": number | null,"kind": string,"open_issues": number | null,"period_end": string,"period_start": string,"place_code": string | null,"preparer": string | null,"preparer_name": string | null,"release_by": string | null,"return_id": string,"reviewer": string | null,"reviewer_name": string | null,"rule_flags": string | null,"run_id": string,"stage": string,"stage_n": number | null,"state": string,"submit_due": string | null,"tasks_done": number | null,"tasks_total": number | null,"tax_type": string,"tier": string | null,"tier_reasons": string | null,"tier_unknowns": string | null,"type_name": string
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "returns_run_id_fkey"
      columns: ["run_id"]
isOneToOne: false
      referencedRelation: "run_calendar"
      referencedColumns: ["run_id"]
    },{
      foreignKeyName: "returns_run_id_fkey"
      columns: ["run_id"]
isOneToOne: false
      referencedRelation: "runs"
      referencedColumns: ["run_id"]
    }
                  ]
                },"return_rules": {
                  Row: {
                    "evaluated_at": string,"evidence": NonNullable<Json>,"kind": string,"message": string | null,"name": string,"pinned": boolean,"result": string,"return_id": string,"rule_id": string,"step_title": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "rule_results_return_id_fkey"
      columns: ["return_id"]
isOneToOne: false
      referencedRelation: "return_board"
      referencedColumns: ["return_id"]
    },{
      foreignKeyName: "rule_results_return_id_fkey"
      columns: ["return_id"]
isOneToOne: false
      referencedRelation: "return_grid"
      referencedColumns: ["return_id"]
    },{
      foreignKeyName: "rule_results_return_id_fkey"
      columns: ["return_id"]
isOneToOne: false
      referencedRelation: "returns"
      referencedColumns: ["return_id"]
    },{
      foreignKeyName: "rule_results_rule_id_fkey"
      columns: ["rule_id"]
isOneToOne: false
      referencedRelation: "rules"
      referencedColumns: ["rule_id"]
    }
                  ]
                },"rule_summary": {
                  Row: {
                    "result": string,"returns": number | null,"rule_id": string,"run_id": string
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "returns_run_id_fkey"
      columns: ["run_id"]
isOneToOne: false
      referencedRelation: "run_calendar"
      referencedColumns: ["run_id"]
    },{
      foreignKeyName: "returns_run_id_fkey"
      columns: ["run_id"]
isOneToOne: false
      referencedRelation: "runs"
      referencedColumns: ["run_id"]
    },{
      foreignKeyName: "rule_results_rule_id_fkey"
      columns: ["rule_id"]
isOneToOne: false
      referencedRelation: "rules"
      referencedColumns: ["rule_id"]
    }
                  ]
                },"run_calendar": {
                  Row: {
                    "as_of": string | null,"bd1": string | null,"expected_stage": number | null,"period_end": string,"period_start": string,"release_by": string | null,"run_id": string,"run_month": string,"status": string,"submit_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                           "as_of"?: never,"bd1"?: never,"expected_stage"?: never,"period_end"?: string | null,"period_start"?: string | null,"release_by"?: never,"run_id"?: string | null,"run_month"?: string | null,"status"?: string | null,"submit_by"?: never
                         }
                        Update: {
                           "as_of"?: never,"bd1"?: never,"expected_stage"?: never,"period_end"?: string | null,"period_start"?: string | null,"release_by"?: never,"run_id"?: string | null,"run_month"?: string | null,"status"?: string | null,"submit_by"?: never
                         }
                        Relationships: [
                    
                  ]
                },"run_summary": {
                  Row: {
                    "flag": string | null,"returns": number | null,"run_id": string,"stage": string,"stage_n": number | null,"steps_done": number | null,"steps_total": number | null,"tier": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "returns_run_id_fkey"
      columns: ["run_id"]
isOneToOne: false
      referencedRelation: "run_calendar"
      referencedColumns: ["run_id"]
    },{
      foreignKeyName: "returns_run_id_fkey"
      columns: ["run_id"]
isOneToOne: false
      referencedRelation: "runs"
      referencedColumns: ["run_id"]
    }
                  ]
                },"task_board": {
                  Row: {
                    "anchor": string | null,"applies_to_tier": string | null,"blocked_by": (string)[] | null,"category": string | null,"completes_stage": number | null,"customer_id": string | null,"description": string | null,"done_on": string | null,"due_date": string | null,"due_flag": string | null,"kind": string,"notes": string | null,"notice_id": string | null,"offset": number | null,"owner_id": string | null,"owner_role": string | null,"parent_id": string | null,"parent_kind": string | null,"parent_title": string | null,"priority": string | null,"raised_by": string | null,"raised_on": string | null,"registration_id": string | null,"resolution": string | null,"return_filter": string | null,"return_id": string | null,"run_id": string | null,"source": string | null,"source_ref": string | null,"status": string | null,"task_id": string,"template_id": string | null,"title": string,"waiting_on": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "tasks_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customer_grid"
      referencedColumns: ["customer_id"]
    },{
      foreignKeyName: "tasks_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["customer_id"]
    },{
      foreignKeyName: "tasks_notice_id_fkey"
      columns: ["notice_id"]
isOneToOne: false
      referencedRelation: "balances_notices"
      referencedColumns: ["notice_id"]
    },{
      foreignKeyName: "tasks_registration_id_fkey"
      columns: ["registration_id"]
isOneToOne: false
      referencedRelation: "registration_grid"
      referencedColumns: ["registration_id"]
    },{
      foreignKeyName: "tasks_registration_id_fkey"
      columns: ["registration_id"]
isOneToOne: false
      referencedRelation: "registrations"
      referencedColumns: ["registration_id"]
    },{
      foreignKeyName: "tasks_run_id_fkey"
      columns: ["run_id"]
isOneToOne: false
      referencedRelation: "run_calendar"
      referencedColumns: ["run_id"]
    },{
      foreignKeyName: "tasks_run_id_fkey"
      columns: ["run_id"]
isOneToOne: false
      referencedRelation: "runs"
      referencedColumns: ["run_id"]
    },{
      foreignKeyName: "tasks_template_id_fkey"
      columns: ["template_id"]
isOneToOne: false
      referencedRelation: "return_board"
      referencedColumns: ["header_task_id"]
    },{
      foreignKeyName: "tasks_template_id_fkey"
      columns: ["template_id"]
isOneToOne: false
      referencedRelation: "task_board"
      referencedColumns: ["parent_id"]
    },{
      foreignKeyName: "tasks_template_id_fkey"
      columns: ["template_id"]
isOneToOne: false
      referencedRelation: "task_board"
      referencedColumns: ["task_id"]
    },{
      foreignKeyName: "tasks_template_id_fkey"
      columns: ["template_id"]
isOneToOne: false
      referencedRelation: "task_grid"
      referencedColumns: ["parent_id"]
    },{
      foreignKeyName: "tasks_template_id_fkey"
      columns: ["template_id"]
isOneToOne: false
      referencedRelation: "task_grid"
      referencedColumns: ["task_id"]
    },{
      foreignKeyName: "tasks_template_id_fkey"
      columns: ["template_id"]
isOneToOne: false
      referencedRelation: "tasks"
      referencedColumns: ["task_id"]
    }
                  ]
                },"task_grid": {
                  Row: {
                    "affects": string | null,"blocked_by": string | null,"category": string | null,"completes_stage": number | null,"customer_id": string | null,"customer_name": string | null,"description": string | null,"done_on": string | null,"due_date": string | null,"due_flag": string | null,"is_blocked": boolean | null,"kind": string,"kind_label": string | null,"notes": string | null,"owner_id": string | null,"owner_name": string | null,"owner_role": string | null,"parent_id": string | null,"parent_title": string | null,"priority": string | null,"raised_by": string | null,"raised_on": string | null,"registration_id": string | null,"resolution": string | null,"return_id": string | null,"returns_affected": number | null,"run_id": string | null,"source_ref": string | null,"status": string | null,"task_id": string,"title": string,"waiting_on": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "tasks_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customer_grid"
      referencedColumns: ["customer_id"]
    },{
      foreignKeyName: "tasks_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["customer_id"]
    },{
      foreignKeyName: "tasks_registration_id_fkey"
      columns: ["registration_id"]
isOneToOne: false
      referencedRelation: "registration_grid"
      referencedColumns: ["registration_id"]
    },{
      foreignKeyName: "tasks_registration_id_fkey"
      columns: ["registration_id"]
isOneToOne: false
      referencedRelation: "registrations"
      referencedColumns: ["registration_id"]
    },{
      foreignKeyName: "tasks_run_id_fkey"
      columns: ["run_id"]
isOneToOne: false
      referencedRelation: "run_calendar"
      referencedColumns: ["run_id"]
    },{
      foreignKeyName: "tasks_run_id_fkey"
      columns: ["run_id"]
isOneToOne: false
      referencedRelation: "runs"
      referencedColumns: ["run_id"]
    }
                  ]
                },"task_summary": {
                  Row: {
                    "due_flag": string | null,"kind": string,"owner_id": string | null,"run_id": string | null,"status": string | null,"tasks": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "tasks_run_id_fkey"
      columns: ["run_id"]
isOneToOne: false
      referencedRelation: "run_calendar"
      referencedColumns: ["run_id"]
    },{
      foreignKeyName: "tasks_run_id_fkey"
      columns: ["run_id"]
isOneToOne: false
      referencedRelation: "runs"
      referencedColumns: ["run_id"]
    }
                  ]
                }
          }
          Functions: {
            "anchor_date":
{ Args: { "p_anchor": string,"p_offset": number,"p_run_month": string,"p_submit_due"?: string }; Returns: string
                           },
"as_of":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"business_day":
{ Args: { "p_month": string,"p_n": number }; Returns: string
                           },
"business_days_between":
{ Args: { "a": string,"b": string }; Returns: number
                           },
"copy_template":
{ Args: { "p_from": string,"p_to": string }; Returns: number
                           },
"end_registration":
{ Args: { "p_last_day": string,"p_registration": string }; Returns: undefined
                           },
"eval_expr":
{ Args: { "depth"?: number,"e": Json,"f": Json }; Returns: Record<string, unknown>
                           },
"evaluate_return":
{ Args: { "p_return": string }; Returns: undefined
                           },
"evaluate_run":
{ Args: { "p_run": string }; Returns: number
                           },
"is_business_day":
{ Args: { "d": string }; Returns: boolean
                           },
"kick_off_and_evaluate":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"kick_off_next_run":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"next_run_preview":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"open_issues":
{ Args: { "p_return": string }; Returns: number
                           },
"owner_of":
{ Args: { "p_return": string,"p_role": string,"p_task": string }; Returns: string
                           },
"periods_for":
{ Args: { "p_frequency": string,"p_month": string }; Returns: {
              "period_end": string,"period_start": string
            }[]
                           },
"register_customers":
{ Args: { "p_rows": Json,"p_type": string }; Returns: Json
                           },
"return_facts":
{ Args: { "p_return": string }; Returns: Json
                           },
"setting":
{ Args: { "p_key": string }; Returns: string
                           },
"statutory_due_for":
{ Args: { "p_period_end": string,"p_run_month": string,"p_type": string }; Returns: string
                           },
"type_rule":
{ Args: { "p_field": string,"p_on": string,"p_type": string }; Returns: string
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            
          }
        }
} as const
