import { z } from 'zod'

export const TEMPLATE_TYPE_OPTIONS = [
  { value: 0, label: 'T0: Standard' },
  { value: 1, label: 'T1: Photo Evidence' },
  { value: 2, label: 'T2: Procedure Table' },
  { value: 3, label: 'T3: Measurement' },
  { value: 4, label: 'T4: Link Verification' },
  { value: 5, label: 'T5: Sign-off' },
]

export const FREQUENCY_OPTIONS = ['Daily', 'Weekly', 'Monthly', 'Yearly']

const standardConfigSchema = z.object({
  allow_na: z.boolean().default(false),
  note_required_on_ng: z.boolean().default(true),
  auto_open_incident: z.boolean().default(false),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
})

const photoConfigSchema = z.object({
  photo_points: z.array(z.string().trim().min(1)).min(1, 'ต้องมีอย่างน้อย 1 จุดถ่ายภาพ'),
  min_photos: z.coerce.number().int().min(1).default(1),
  allow_retake: z.boolean().default(true),
  enable_location_toggle: z.boolean().default(true),
  watermark: z.object({
    timestamp: z.boolean().default(true),
    user: z.boolean().default(true),
    target_code: z.boolean().default(false),
  }).default({
    timestamp: true,
    user: true,
    target_code: false,
  }),
})

const procedureConfigSchema = z.object({
  plan_id: z.string().trim().min(1, 'กรุณาเลือก Procedure Plan'),
  enforce_sequence: z.boolean().default(true),
  require_all_steps: z.boolean().default(true),
})

const measurementConfigSchema = z.object({
  unit: z.string().trim().min(1, 'กรุณาระบุหน่วยวัด'),
  min: z.number().nullable().default(null),
  max: z.number().nullable().default(null),
  decimal_places: z.coerce.number().int().min(0).max(4).default(1),
  fail_mode: z.enum(['outside_range', 'warning_only']).default('outside_range'),
}).superRefine((value, ctx) => {
  if (value.min === null && value.max === null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'ต้องกำหนดค่า min หรือ max อย่างน้อย 1 ค่า',
      path: ['min'],
    })
  }
})

const linkConfigSchema = z.object({
  url: z.string().trim().url('URL ไม่ถูกต้อง'),
  note_required: z.boolean().default(true),
  screenshot_required: z.boolean().default(false),
})

const signoffConfigSchema = z.object({
  signers: z.array(z.string().trim().min(1)).min(1, 'ต้องมีผู้ลงนามอย่างน้อย 1 role'),
  require_order: z.boolean().default(true),
  pin_required: z.boolean().default(true),
})

const baseTemplateSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  category: z.string().trim().min(1, 'กรุณาเลือกหมวดหมู่'),
  freq_type: z.enum(FREQUENCY_OPTIONS),
  item_label: z.string().trim().min(1, 'กรุณาระบุชื่อรายการ'),
  instruction: z.string().trim().default(''),
  ui_template_type: z.number().int().min(0).max(5),
  template_config: z.object({}).catchall(z.unknown()).default({}),
  // New fields for Target Registry support
  scope_mode: z.enum(['global', 'per_target', 'per_group']).default('global'),
  target_type: z.string().trim().optional().nullable().default(null),
  validation_rules: z.object({}).catchall(z.unknown()).optional().default({}),
  incident_rules: z.object({}).catchall(z.unknown()).optional().default({}),
})

const DEFAULT_CONFIGS = {
  0: {
    allow_na: false,
    note_required_on_ng: true,
    auto_open_incident: false,
    severity: 'medium',
  },
  1: {
    photo_points: ['ภาพหลักฐาน 1'],
    min_photos: 1,
    allow_retake: true,
    enable_location_toggle: true,
    watermark: {
      timestamp: true,
      user: true,
      target_code: false,
    },
  },
  2: {
    plan_id: '',
    enforce_sequence: true,
    require_all_steps: true,
  },
  3: {
    unit: '',
    min: null,
    max: null,
    decimal_places: 1,
    fail_mode: 'outside_range',
  },
  4: {
    url: '',
    note_required: true,
    screenshot_required: false,
  },
  5: {
    signers: ['it_staff'],
    require_order: true,
    pin_required: true,
  },
}

const CONFIG_SCHEMAS = {
  0: standardConfigSchema,
  1: photoConfigSchema,
  2: procedureConfigSchema,
  3: measurementConfigSchema,
  4: linkConfigSchema,
  5: signoffConfigSchema,
}

function sanitizeStringList(value) {
  if (!Array.isArray(value)) return []
  return value.map((item) => String(item ?? '').trim()).filter(Boolean)
}

function sanitizeNumber(value) {
  if (value === '' || value === null || typeof value === 'undefined') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function sanitizeConfigForType(type, config) {
  const source = config && typeof config === 'object' ? config : {}

  switch (type) {
    case 0:
      return {
        allow_na: Boolean(source.allow_na),
        note_required_on_ng: source.note_required_on_ng !== false,
        auto_open_incident: Boolean(source.auto_open_incident),
        severity: ['low', 'medium', 'high', 'critical'].includes(source.severity) ? source.severity : 'medium',
      }
    case 1:
      return {
        photo_points: sanitizeStringList(source.photo_points),
        min_photos: Number.isFinite(Number(source.min_photos)) ? Number(source.min_photos) : 1,
        allow_retake: source.allow_retake !== false,
        enable_location_toggle: source.enable_location_toggle !== false,
        watermark: {
          timestamp: source.watermark?.timestamp !== false,
          user: source.watermark?.user !== false,
          target_code: Boolean(source.watermark?.target_code),
        },
      }
    case 2:
      return {
        plan_id: String(source.plan_id ?? '').trim(),
        enforce_sequence: source.enforce_sequence !== false,
        require_all_steps: source.require_all_steps !== false,
      }
    case 3:
      return {
        unit: String(source.unit ?? '').trim(),
        min: sanitizeNumber(source.min),
        max: sanitizeNumber(source.max),
        decimal_places: Number.isFinite(Number(source.decimal_places)) ? Number(source.decimal_places) : 1,
        fail_mode: source.fail_mode === 'warning_only' ? 'warning_only' : 'outside_range',
      }
    case 4:
      return {
        url: String(source.url ?? '').trim(),
        note_required: source.note_required !== false,
        screenshot_required: Boolean(source.screenshot_required),
      }
    case 5:
      return {
        signers: sanitizeStringList(source.signers),
        require_order: source.require_order !== false,
        pin_required: source.pin_required !== false,
      }
    default:
      return {}
  }
}

export function getDefaultTemplateConfig(templateType) {
  return structuredClone(DEFAULT_CONFIGS[templateType] ?? {})
}

export function normalizeTemplateRecord(record) {
  const source = record && typeof record === 'object' ? record : {}
  const uiTemplateType = Number.isInteger(source.ui_template_type)
    ? source.ui_template_type
    : Number.isFinite(Number(source.ui_template_type))
      ? Number(source.ui_template_type)
      : 0

  return {
    id: source.id ?? null,
    category: String(source.category ?? '').trim(),
    freq_type: FREQUENCY_OPTIONS.includes(source.freq_type) ? source.freq_type : FREQUENCY_OPTIONS[0],
    item_label: String(source.item_label ?? '').trim(),
    instruction: String(source.instruction ?? '').trim(),
    ui_template_type: Math.min(Math.max(uiTemplateType, 0), 5),
    template_config: sanitizeConfigForType(uiTemplateType, source.template_config),
    scope_mode: ['global', 'per_target', 'per_group'].includes(source.scope_mode) ? source.scope_mode : 'global',
    target_type: source.target_type ? String(source.target_type).trim() : null,
    validation_rules: source.validation_rules && typeof source.validation_rules === 'object' ? source.validation_rules : {},
    incident_rules: source.incident_rules && typeof source.incident_rules === 'object' ? source.incident_rules : {},
    is_active: source.is_active !== false,
    sort_order: Number.isFinite(Number(source.sort_order)) ? Number(source.sort_order) : 0,
  }
}

export function buildTemplatePreview(template, procedurePlans = []) {
  const normalized = normalizeTemplateRecord(template)
  const config = normalized.template_config

  const preview = {
    badge: `${normalized.freq_type} • ${normalized.scope_mode}`,
    lines: [],
  }

  switch (normalized.ui_template_type) {
    case 0:
      preview.lines = [
        `Allow N/A: ${config.allow_na ? 'Yes' : 'No'}`,
        `Note required on NG: ${config.note_required_on_ng ? 'Yes' : 'No'}`,
        `Incident severity: ${config.severity || 'medium'}`,
      ]
      break
    case 1:
      preview.lines = [
        `Photo points: ${Array.isArray(config.photo_points) && config.photo_points.length > 0 ? config.photo_points.join(', ') : 'Not configured'}`,
        `Minimum photos: ${config.min_photos ?? 1}`,
        `Location toggle: ${config.enable_location_toggle ? 'Enabled' : 'Disabled'}`,
      ]
      break
    case 2: {
      const matchedPlan = procedurePlans.find((plan) => plan.id === config.plan_id)
      preview.lines = [
        `Procedure plan: ${matchedPlan?.plan_name || config.plan_id || 'Not selected'}`,
        `Enforce sequence: ${config.enforce_sequence ? 'Yes' : 'No'}`,
        `Require all steps: ${config.require_all_steps ? 'Yes' : 'No'}`,
      ]
      break
    }
    case 3:
      preview.lines = [
        `Unit: ${config.unit || 'Not set'}`,
        `Range: ${config.min ?? '-'} to ${config.max ?? '-'}`,
        `Fail mode: ${config.fail_mode || 'outside_range'}`,
      ]
      break
    case 4:
      preview.lines = [
        `URL: ${config.url || 'Not set'}`,
        `Note required: ${config.note_required ? 'Yes' : 'No'}`,
        `Screenshot required: ${config.screenshot_required ? 'Yes' : 'No'}`,
      ]
      break
    case 5:
      preview.lines = [
        `Signers: ${Array.isArray(config.signers) && config.signers.length > 0 ? config.signers.join(', ') : 'Not configured'}`,
        `Require order: ${config.require_order ? 'Yes' : 'No'}`,
        `PIN required: ${config.pin_required ? 'Yes' : 'No'}`,
      ]
      break
    default:
      preview.lines = ['Preview is not available for this template type']
      break
  }

  return preview
}

export function validateChecklistTemplate(payload) {
  const baseResult = baseTemplateSchema.safeParse(payload)
  
  const type = Number.isInteger(payload?.ui_template_type) ? payload.ui_template_type : 0
  const configSchema = CONFIG_SCHEMAS[type]
  const configResult = configSchema ? configSchema.safeParse(payload.template_config) : { success: true }

  if (baseResult.success && configResult.success) {
    return {
      success: true,
      data: {
        ...baseResult.data,
        template_config: sanitizeConfigForType(type, payload.template_config),
      },
    }
  }

  const fieldErrors = {}
  const addIssues = (issues) => {
    issues.forEach((issue) => {
      // Map Zod path to a flat field name used by TemplateForm
      // 1. Ignore 'template_config' parent
      // 2. Ignore numeric indices (for arrays)
      // 3. Take the first relevant string identifier
      const field = issue.path.find((p) => typeof p === 'string' && p !== 'template_config') || issue.path[0]
      
      if (field && !fieldErrors[field]) {
        fieldErrors[field] = [issue.message]
      }
    })
  }

  if (!baseResult.success) addIssues(baseResult.error.issues)
  if (!configResult.success) addIssues(configResult.error.issues)

  return { success: false, errors: fieldErrors }
}
