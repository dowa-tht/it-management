-- Migration: Checklist Item Steps (Sub-step results per procedure plan step)
-- Date: 2026-05-25
-- Description:
--   สร้าง table checklist_item_steps เพื่อเก็บผลการดำเนินการ
--   ต่อ sub-step ของแต่ละ checklist item แยก row แทนการเก็บใน JSONB
--   รองรับ step_type: check, photo, measure, text, link

begin;

-- ============================================================
-- 1. Create Table: checklist_item_steps
-- ============================================================
CREATE TABLE IF NOT EXISTS public.checklist_item_steps (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id           UUID        NOT NULL REFERENCES public.checklist_items(id) ON DELETE CASCADE,
  step_index        INTEGER     NOT NULL,                        -- ลำดับ step จาก procedure plan (0-based)
  step_type         TEXT        NOT NULL DEFAULT 'check'
                    CHECK (step_type IN ('check', 'photo', 'measure', 'text', 'link')),
  result            TEXT        CHECK (result IN ('OK', 'NG')), -- ผลการประเมิน (NULL = ยังไม่ได้ทำ)
  remark            TEXT,                                        -- บังคับเมื่อ result = 'NG'
  actual_duration   INTEGER,                                     -- เวลาจริงที่ใช้ (นาที)
  text_value        TEXT,                                        -- สำหรับ step_type = 'text'
  measure_value     NUMERIC,                                     -- สำหรับ step_type = 'measure'
  measure_unit      TEXT,                                        -- หน่วย measure
  photo_url         TEXT,                                        -- สำหรับ step_type = 'photo'
  link_clicked      BOOLEAN     DEFAULT FALSE,                   -- สำหรับ step_type = 'link'
  completed_at      TIMESTAMPTZ,                                 -- เวลาที่ step นี้เสร็จ
  completed_by      UUID        REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (item_id, step_index)
);

-- ============================================================
-- 2. Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_checklist_item_steps_item_id
  ON public.checklist_item_steps(item_id);

CREATE INDEX IF NOT EXISTS idx_checklist_item_steps_result
  ON public.checklist_item_steps(item_id, result)
  WHERE result IS NOT NULL;

-- ============================================================
-- 3. Auto-update updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_checklist_item_steps_updated_at ON public.checklist_item_steps;
CREATE TRIGGER trg_checklist_item_steps_updated_at
  BEFORE UPDATE ON public.checklist_item_steps
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 4. RLS
-- ============================================================
ALTER TABLE public.checklist_item_steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_checklist_item_steps" ON public.checklist_item_steps;
DROP POLICY IF EXISTS "insert_checklist_item_steps" ON public.checklist_item_steps;
DROP POLICY IF EXISTS "update_checklist_item_steps" ON public.checklist_item_steps;
DROP POLICY IF EXISTS "delete_checklist_item_steps" ON public.checklist_item_steps;

-- SELECT: ดูได้ถ้ามีสิทธิ์เข้าถึง checklist_doc
CREATE POLICY "select_checklist_item_steps"
ON public.checklist_item_steps FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.checklist_items ci
    WHERE ci.id = item_id
    AND public.current_user_can_access_checklist_doc(ci.doc_id)
  )
);

-- INSERT: เพิ่มได้ถ้ามีสิทธิ์เข้าถึง checklist_doc
CREATE POLICY "insert_checklist_item_steps"
ON public.checklist_item_steps FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.checklist_items ci
    WHERE ci.id = item_id
    AND public.current_user_can_access_checklist_doc(ci.doc_id)
  )
);

-- UPDATE: แก้ไขได้ถ้ามีสิทธิ์เข้าถึง checklist_doc
CREATE POLICY "update_checklist_item_steps"
ON public.checklist_item_steps FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.checklist_items ci
    WHERE ci.id = item_id
    AND public.current_user_can_access_checklist_doc(ci.doc_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.checklist_items ci
    WHERE ci.id = item_id
    AND public.current_user_can_access_checklist_doc(ci.doc_id)
  )
);

-- DELETE: admin เท่านั้น
CREATE POLICY "delete_checklist_item_steps"
ON public.checklist_item_steps FOR DELETE TO authenticated
USING (public.current_user_is_admin());

commit;
