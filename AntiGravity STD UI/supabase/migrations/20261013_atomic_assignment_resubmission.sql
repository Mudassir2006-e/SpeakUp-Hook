-- ==============================================================================
-- SpeakUp LMS — Atomic Assignment Resubmission & History Retention Migration
-- File: supabase/migrations/20261013_atomic_assignment_resubmission.sql
-- Description: Provides a PostgreSQL transaction-safe RPC function to eliminate
--              race conditions during concurrent assignment submissions/resubmissions.
--              Guarantees strict atomic attempt numbering, full teacher evaluation
--              retention in history, and review-status lock protection.
-- ==============================================================================

-- 1. ATOMIC SUBMISSION & RESUBMISSION RPC FUNCTION
CREATE OR REPLACE FUNCTION public.submit_student_assignment_atomic(
    p_assignment_id TEXT,
    p_student_id UUID,
    p_course_id TEXT,
    p_module_id TEXT,
    p_lesson_id TEXT,
    p_practice_type TEXT,
    p_student_email TEXT,
    p_student_name TEXT,
    p_student_number TEXT,
    p_student_text_answer TEXT,
    p_pages JSONB,
    p_status TEXT,
    p_ai_evaluation JSONB DEFAULT NULL,
    p_ai_score NUMERIC DEFAULT NULL,
    p_ai_feedback TEXT DEFAULT NULL,
    p_is_resubmission BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_assignment RECORD;
    v_existing RECORD;
    v_prev_attempt JSONB;
    v_new_history JSONB;
    v_result RECORD;
    v_sub_id TEXT;
    v_final_score NUMERIC(5,2);
    v_final_feedback TEXT;
BEGIN
    -- 1. Caller Authorization Check
    -- Ensure caller is authenticated and matches p_student_id, or is an admin / service_role
    IF auth.uid() IS NOT NULL AND auth.uid() <> p_student_id AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Caller does not have permission to submit assignments for this student.'
            USING ERRCODE = '42501';
    END IF;

    -- 2. Verify parent assignment locking & resubmission settings if present
    SELECT is_locked, resubmission_allowed, is_active
    INTO v_assignment
    FROM public.assignments
    WHERE id = p_assignment_id;

    IF FOUND THEN
        IF v_assignment.is_locked = TRUE OR v_assignment.is_active = FALSE THEN
            RAISE EXCEPTION 'This assignment is currently locked or inactive and cannot accept submissions.'
                USING ERRCODE = 'ASLCK';
        END IF;
    END IF;

    -- 3. Acquire exclusive row lock on existing submission to serialize concurrent requests
    SELECT *
    INTO v_existing
    FROM public.assignment_submissions
    WHERE student_id = p_student_id AND assignment_id = p_assignment_id
    FOR UPDATE;

    -- 4. Case: First Attempt (no existing submission)
    IF v_existing IS NULL THEN
        v_sub_id := 'sub_' || extract(epoch from clock_timestamp())::bigint || '_' || substr(md5(random()::text), 1, 6);
        
        IF p_status = 'Checked' AND p_ai_score IS NOT NULL THEN
            v_final_score := p_ai_score;
            v_final_feedback := p_ai_feedback;
        ELSE
            v_final_score := NULL;
            v_final_feedback := NULL;
        END IF;

        INSERT INTO public.assignment_submissions (
            id,
            assignment_id,
            student_id,
            course_id,
            module_id,
            lesson_id,
            practice_type,
            student_email,
            student_name,
            student_number,
            student_text_answer,
            attempt_number,
            status,
            pages,
            ai_evaluation,
            ai_score,
            ai_feedback,
            final_score,
            final_feedback,
            admin_reviewed_at,
            admin_reviewed_by,
            history,
            submitted_at,
            updated_at
        ) VALUES (
            v_sub_id,
            p_assignment_id,
            p_student_id,
            p_course_id,
            p_module_id,
            p_lesson_id,
            p_practice_type,
            p_student_email,
            p_student_name,
            p_student_number,
            p_student_text_answer,
            1,
            p_status,
            COALESCE(p_pages, '[]'::jsonb),
            p_ai_evaluation,
            p_ai_score,
            p_ai_feedback,
            v_final_score,
            v_final_feedback,
            NULL,
            NULL,
            '[]'::jsonb,
            NOW(),
            NOW()
        )
        RETURNING * INTO v_result;

        RETURN jsonb_build_object(
            'success', true,
            'isDuplicate', false,
            'data', to_jsonb(v_result)
        );
    END IF;

    -- 5. Case: Existing submission already present
    -- If caller did not request resubmission, treat deterministically as duplicate submission
    IF NOT p_is_resubmission THEN
        RETURN jsonb_build_object(
            'success', true,
            'isDuplicate', true,
            'data', to_jsonb(v_existing),
            'message', 'You have already submitted this assignment.'
        );
    END IF;

    -- 6. Verify Resubmission Permissions & Review Status
    IF FOUND AND v_assignment.resubmission_allowed = FALSE THEN
        RAISE EXCEPTION 'Resubmission is not permitted for this assignment.'
            USING ERRCODE = 'RESUB';
    END IF;

    IF v_existing.status = 'Under Review' THEN
        RAISE EXCEPTION 'Your submission is currently under instructor review and cannot be updated at this time.'
            USING ERRCODE = 'INREV';
    END IF;

    -- 7. Preserve complete previous attempt snapshot (including teacher scores, feedback, metadata)
    v_prev_attempt := jsonb_build_object(
        'attemptNumber', v_existing.attempt_number,
        'submittedAt', v_existing.submitted_at,
        'studentTextAnswer', v_existing.student_text_answer,
        'pages', v_existing.pages,
        'aiEvaluation', v_existing.ai_evaluation,
        'aiScore', v_existing.ai_score,
        'aiFeedback', v_existing.ai_feedback,
        'finalScore', v_existing.final_score,
        'finalFeedback', v_existing.final_feedback,
        'adminReviewedAt', v_existing.admin_reviewed_at,
        'adminReviewedBy', v_existing.admin_reviewed_by,
        'status', v_existing.status
    );

    v_new_history := COALESCE(v_existing.history, '[]'::jsonb) || jsonb_build_array(v_prev_attempt);

    IF p_status = 'Checked' AND p_ai_score IS NOT NULL THEN
        v_final_score := p_ai_score;
        v_final_feedback := p_ai_feedback;
    ELSE
        v_final_score := NULL;
        v_final_feedback := NULL;
    END IF;

    -- 8. Atomic Update of Submission Record
    UPDATE public.assignment_submissions
    SET
        attempt_number = v_existing.attempt_number + 1,
        student_text_answer = p_student_text_answer,
        pages = COALESCE(p_pages, '[]'::jsonb),
        status = p_status,
        ai_evaluation = p_ai_evaluation,
        ai_score = p_ai_score,
        ai_feedback = p_ai_feedback,
        final_score = v_final_score,
        final_feedback = v_final_feedback,
        admin_reviewed_at = NULL,
        admin_reviewed_by = NULL,
        history = v_new_history,
        submitted_at = NOW(),
        updated_at = NOW()
    WHERE student_id = p_student_id AND assignment_id = p_assignment_id
    RETURNING * INTO v_result;

    RETURN jsonb_build_object(
        'success', true,
        'isDuplicate', false,
        'data', to_jsonb(v_result)
    );
END;
$$;

-- 2. HARDEN FUNCTION PRIVILEGES & SECURITY
REVOKE ALL ON FUNCTION public.submit_student_assignment_atomic(
    TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, JSONB, NUMERIC, TEXT, BOOLEAN
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.submit_student_assignment_atomic(
    TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, JSONB, NUMERIC, TEXT, BOOLEAN
) FROM anon;

GRANT EXECUTE ON FUNCTION public.submit_student_assignment_atomic(
    TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, JSONB, NUMERIC, TEXT, BOOLEAN
) TO authenticated, service_role, postgres;
