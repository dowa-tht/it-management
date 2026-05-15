'use client'

import { buildTemplatePreview } from '@/lib/checklistTemplateValidation'
import { cn } from '@/lib/cn'

export function TemplatePreview({ template, procedurePlans }) {
  const preview = buildTemplatePreview(template, procedurePlans)

  return (
    <div className={cn('template-preview-card')}>
      <style>{`
        .template-preview-card {
          border: 1px solid rgba(226, 232, 240, 0.9);
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.92);
          padding: 28px;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
        }
        .template-preview-shell {
          display: grid;
          gap: 20px;
        }
        .template-preview-title {
          font-size: 20px;
          font-weight: 800;
          color: #0f172a;
        }
        .template-preview-description {
          margin-top: 6px;
          font-size: 14px;
          line-height: 1.65;
          color: #64748b;
        }
        .template-preview-config-box {
          border-radius: 22px;
          border: 1px solid #e2e8f0;
          background: rgba(248, 250, 252, 0.9);
          padding: 20px;
          display: grid;
          gap: 16px;
        }
        .template-preview-summary {
          border-radius: 20px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          padding: 18px 16px;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
        }
        .template-preview-badge {
          display: inline-flex;
          width: fit-content;
          align-items: center;
          border-radius: 999px;
          border: 1px solid #bfdbfe;
          background: #eff6ff;
          padding: 3px 10px;
          font-size: 12px;
          font-weight: 700;
          color: #1d4ed8;
        }
        .template-preview-context {
          display: grid;
          gap: 8px;
          min-width: 0;
        }
        .template-preview-type {
          flex: 0 0 auto;
          border-radius: 999px;
          background: #0f172a;
          padding: 4px 10px;
          font-size: 12px;
          font-weight: 700;
          color: #ffffff;
        }
        .template-preview-lines {
          display: grid;
          gap: 12px;
        }
        .template-preview-line {
          border-radius: 18px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          padding: 14px 16px;
          font-size: 14px;
          line-height: 1.6;
          color: #334155;
        }
        @media (max-width: 768px) {
          .template-preview-card {
            padding: 22px 18px;
          }
          .template-preview-title {
            font-size: 18px;
          }
          .template-preview-config-box {
            padding: 16px;
          }
          .template-preview-summary {
            flex-direction: column;
          }
        }
      `}</style>
      <div className="template-preview-shell">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Live Preview</p>
          <h3 className="template-preview-title" style={{ marginTop: 8 }}>{template.item_label || 'New template'}</h3>
          <p className="template-preview-description">{template.instruction || 'ยังไม่ได้ระบุคำอธิบายสำหรับรายการตรวจเช็คนี้'}</p>
        </div>

        <div className="template-preview-config-box">
          <div className="template-preview-summary">
            <div className="template-preview-context">
              <span className="template-preview-badge">{preview.badge}</span>
              <div>
                <p className="text-base font-bold leading-snug text-slate-900">{template.category || 'ยังไม่ได้เลือกหมวดหมู่'}</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">{template.freq_type} inspection workflow</p>
              </div>
            </div>
            <span className="template-preview-type">T{template.ui_template_type}</span>
          </div>

          <div className="template-preview-lines">
            {preview.lines.map((line) => (
              <div key={line} className="template-preview-line">
                {line}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
