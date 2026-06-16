from admin_ops.models import AuditLog


def log_action(action: str, performed_by, session=None, meta=None,
               target_user=None, leave=None):
    """
    Rich audit logging — captures role, branch, target info automatically.
    """
    performer_role = ''
    performer_branch_name = ''
    target_user_id = None
    target_user_name = ''
    target_branch_name = ''
    leave_date = None
    leave_type_str = ''
    meta = dict(meta or {})

    if performed_by:
        roles = performed_by.roles if isinstance(performed_by.roles, list) else []
        performer_role = roles[0] if roles else ''
        if performed_by.branch:
            performer_branch_name = performed_by.branch.name

    if target_user:
        target_user_id = target_user.id
        target_user_name = target_user.name
        if target_user.branch:
            target_branch_name = target_user.branch.name

    if leave:
        leave_date = leave.date
        leave_type_str = leave.leave_type or ''
        if not target_user:
            target_user_id = leave.teacher_id
            target_user_name = leave.teacher.name if leave.teacher else ''
            if leave.teacher and leave.teacher.branch:
                target_branch_name = leave.teacher.branch.name
        # Auto-capture the leave reason so admins can see it in the audit trail
        if leave.reason and 'reason' not in meta:
            meta['reason'] = leave.reason

    AuditLog.objects.create(
        action=action,
        performed_by=performed_by,
        performer_role=performer_role,
        performer_branch_name=performer_branch_name,
        target_user_id=target_user_id,
        target_user_name=target_user_name,
        target_branch_name=target_branch_name,
        leave_date=leave_date,
        leave_type=leave_type_str,
        session=session,
        meta_json=meta,
    )