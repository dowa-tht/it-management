import { z } from 'zod'

export const PROCEDURE_STEP_TYPES = ['check', 'photo', 'measure', 'text', 'link']

const evidenceRuleSchema = z.object({
  photo_required: z.boolean().default(false),
  note_required: z.boolean().default(false),
})

const procedureStepSchema = z.object({
  step_no: z.number().int().min(1),
  title: z.string().trim().min(1, 'กรุณาระบุชื่อขั้นตอน'),
  instruction: z.string().trim().default(''),
  step_type: z.enum(PROCEDURE_STEP_TYPES),
  required: z.boolean().default(true),
  evidence_rule: evidenceRuleSchema.default({
    photo_required: false,
    note_required: false,
  }),
})

const procedurePlanSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  plan_name: z.string().trim().min(1, 'กรุณาระบุชื่อแผนการตรวจสอบ'),
  steps: z.array(z.any()).default([]),
  // New fields for Target Registry support
  scope_mode: z.enum(['global', 'per_target', 'per_group']).default('global'),
  target_type: z.string().trim().optional().nullable().default(null),
  validation_rules: z.object({}).catchall(z.unknown()).optional().default({}),
  incident_rules: z.object({}).catchall(z.unknown()).optional().default({}),
})

export function normalizeProcedurePlanSteps(rawSteps) {
  const source = Array.isArray(rawSteps)
    ? rawSteps
    : Array.isArray(rawSteps?.rows)
      ? rawSteps.rows
      : []

  return source.map((step, index) => {
    const safeStep = step && typeof step === 'object' ? step : {}

    return {
      step_no: Number.isFinite(Number(safeStep.step_no)) ? Number(safeStep.step_no) : index + 1,
      title: String(safeStep.title ?? (typeof safeStep === 'string' ? safeStep : '')).trim(),
      instruction: String(safeStep.instruction ?? '').trim(),
      step_type: PROCEDURE_STEP_TYPES.includes(safeStep.step_type) ? safeStep.step_type : 'check',
      required: safeStep.required !== false,
      evidence_rule: {
        photo_required: Boolean(safeStep.evidence_rule?.photo_required),
        note_required: Boolean(safeStep.evidence_rule?.note_required),
      },
    }
  })
}

export function normalizeProcedurePlan(record) {
  return {
    id: record?.id ?? null,
    plan_name: record?.plan_name ?? '',
    steps: normalizeProcedurePlanSteps(record?.steps),
  }
}

export function validateProcedurePlanInput(payload) {
  const baseParse = procedurePlanSchema.safeParse(payload)

  if (!baseParse.success) {
    return {
      success: false,
      errors: baseParse.error.flatten().fieldErrors,
    }
  }

  const normalized = normalizeProcedurePlan(baseParse.data)
  const stepResults = normalized.steps.map((step, index) => {
    const parsed = procedureStepSchema.safeParse({
      ...step,
      step_no: index + 1,
    })

    return parsed.success ? parsed.data : parsed.error
  })

  const hasErrors = stepResults.some((result) => result instanceof z.ZodError)
  if (hasErrors) {
    const stepErrors = {}

    stepResults.forEach((result, index) => {
      if (result instanceof z.ZodError) {
        stepErrors[index] = result.flatten().fieldErrors
      }
    })

    return {
      success: false,
      errors: {
        steps: ['ข้อมูลบางขั้นตอนยังไม่ครบ'],
        stepDetails: stepErrors,
      },
    }
  }

  return {
    success: true,
    data: {
      ...normalized,
      steps: stepResults,
    },
  }
}
