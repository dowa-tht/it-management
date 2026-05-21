import test from 'node:test'
import assert from 'node:assert/strict'

import { getDefaultTemplateConfig, validateChecklistTemplate } from '../lib/checklistTemplateValidation.js'
import { normalizeProcedurePlanSteps, validateProcedurePlanInput } from '../lib/procedurePlanValidation.js'

test('validateChecklistTemplate accepts target registry fields for per_target templates', () => {
  const payload = {
    category: 'Infrastructure',
    freq_type: 'Monthly',
    item_label: 'Inspect CCTV cabinet exterior',
    instruction: 'Capture cabinet condition and verify labels',
    ui_template_type: 1,
    template_config: {
      ...getDefaultTemplateConfig(1),
      photo_points: ['Front photo', 'Interior photo'],
      min_photos: 2,
    },
    scope_mode: 'per_target',
    target_type: 'cctv_terminal',
    validation_rules: {
      require_note_on_ng: true,
    },
    incident_rules: {
      auto_open_incident: true,
      severity: 'high',
    },
  }

  const result = validateChecklistTemplate(payload)

  if (!result.success) {
    assert.fail(JSON.stringify(result.errors))
  }

  assert.equal(result.success, true)
  assert.equal(result.data.scope_mode, 'per_target')
  assert.equal(result.data.target_type, 'cctv_terminal')
  assert.deepEqual(result.data.validation_rules, { require_note_on_ng: true })
  assert.deepEqual(result.data.incident_rules, {
    auto_open_incident: true,
    severity: 'high',
  })
  assert.deepEqual(result.data.template_config.photo_points, ['Front photo', 'Interior photo'])
})

test('validateChecklistTemplate accepts object-based and mixed-based photo points', () => {
  const payload = {
    category: 'Infrastructure',
    freq_type: 'Monthly',
    item_label: 'Inspect CCTV cabinet exterior',
    instruction: 'Capture cabinet condition and verify labels',
    ui_template_type: 1,
    template_config: {
      ...getDefaultTemplateConfig(1),
      photo_points: [
        'Front photo',
        {
          point_code: 'P02',
          label: 'Interior component photo',
          qr_enabled: true,
        }
      ],
      min_photos: 2,
    },
    scope_mode: 'per_target',
    target_type: 'cctv_terminal',
  }

  const result = validateChecklistTemplate(payload)

  if (!result.success) {
    assert.fail(JSON.stringify(result.errors))
  }

  assert.equal(result.success, true)
  assert.equal(result.data.template_config.photo_points[0], 'Front photo')
  assert.deepEqual(result.data.template_config.photo_points[1], {
    point_id: null,
    point_code: 'P02',
    label: 'Interior component photo',
    description: null,
    sort_order: null,
    qr_enabled: true,
  })
})

test('validateChecklistTemplate rejects invalid scope_mode values', () => {
  const payload = {
    category: 'Infrastructure',
    freq_type: 'Monthly',
    item_label: 'Inspect CCTV cabinet exterior',
    instruction: '',
    ui_template_type: 0,
    template_config: getDefaultTemplateConfig(0),
    scope_mode: 'site_only',
  }

  const result = validateChecklistTemplate(payload)

  assert.equal(result.success, false)
  assert.ok(result.errors.scope_mode)
})

test('validateProcedurePlanInput accepts target registry companion fields', () => {
  const payload = {
    plan_name: 'CCTV Terminal Box SOP',
    scope_mode: 'per_type',
    target_type: 'cctv_terminal',
    validation_rules: {
      require_all_steps: true,
    },
    incident_rules: {
      auto_open_incident: false,
    },
    steps: [
      {
        step_no: 1,
        title: 'Open cabinet',
        instruction: 'Inspect before touching internal wiring',
        step_type: 'check',
        required: true,
        evidence_rule: {
          photo_required: false,
          note_required: false,
        },
      },
    ],
  }

  const result = validateProcedurePlanInput(payload)

  if (!result.success) {
    assert.fail(JSON.stringify(result.errors))
  }

  assert.equal(result.success, true)
  assert.equal(result.data.plan_name, 'CCTV Terminal Box SOP')
  assert.equal(result.data.steps.length, 1)
  assert.equal(result.data.steps[0].title, 'Open cabinet')
})

test('normalizeProcedurePlanSteps normalizes rows payload and defaults invalid step types', () => {
  const result = normalizeProcedurePlanSteps({
    rows: [
      {
        step_no: '9',
        title: 'Record reading',
        instruction: 'Capture measured voltage',
        step_type: 'measure',
        required: false,
        evidence_rule: {
          photo_required: true,
          note_required: true,
        },
      },
      {
        title: 'Fallback step',
        step_type: 'invalid-type',
      },
    ],
  })

  assert.equal(result.length, 2)
  assert.equal(result[0].step_no, 9)
  assert.equal(result[0].step_type, 'measure')
  assert.equal(result[0].evidence_rule.photo_required, true)
  assert.equal(result[1].step_type, 'check')
  assert.equal(result[1].required, true)
})

test('target action source contains server-side asset history loader', async () => {
  const { readFile } = await import('node:fs/promises')
  const source = await readFile(new URL('../app/actions/target.js', import.meta.url), 'utf8')

  assert.match(source, /export async function getTargetAssetHistory/)
  assert.match(source, /from\('checklist_docs'\)/)
  assert.match(source, /from\('checklist_items'\)/)
  assert.match(source, /buildAssetHistoryPhotoList/)
})

test('validateChecklistTemplate rejects ui_template_type greater than 4 (T5 decommissioned)', () => {
  const payload = {
    category: 'Infrastructure',
    freq_type: 'Monthly',
    item_label: 'Decommissioned T5',
    instruction: '',
    ui_template_type: 5,
    template_config: {},
    scope_mode: 'global',
  }

  const result = validateChecklistTemplate(payload)

  assert.equal(result.success, false)
  assert.ok(result.errors.ui_template_type)
})

test('validateChecklistTemplate accepts ui_template_type equal to 4 (T4 Link Verification)', () => {
  const payload = {
    category: 'Infrastructure',
    freq_type: 'Monthly',
    item_label: 'T4 Link Verification',
    instruction: '',
    ui_template_type: 4,
    template_config: {
      url: 'https://example.com/api',
      note_required: true,
      screenshot_required: false,
    },
    scope_mode: 'global',
  }

  const result = validateChecklistTemplate(payload)

  assert.equal(result.success, true)
  assert.equal(result.data.ui_template_type, 4)
  assert.equal(result.data.template_config.url, 'https://example.com/api')
})

test('validateChecklistTemplate accepts T1 template with empty photo_points (target-as-point mode)', () => {
  // When photo_points is [] each Target is the inspection point.
  // min_photos drives completion — no specific sub-points needed.
  const payload = {
    category: 'Infrastructure',
    freq_type: 'Monthly',
    item_label: 'CCTV Cabinet Photo Check',
    instruction: 'Capture at least 1 photo per target',
    ui_template_type: 1,
    template_config: {
      ...getDefaultTemplateConfig(1),
      photo_points: [],
      min_photos: 1,
    },
    scope_mode: 'per_target',
    target_type: 'cctv_terminal',
  }

  const result = validateChecklistTemplate(payload)

  if (!result.success) {
    assert.fail(JSON.stringify(result.errors))
  }

  assert.equal(result.success, true)
  assert.deepEqual(result.data.template_config.photo_points, [])
  assert.equal(result.data.template_config.min_photos, 1)
})
