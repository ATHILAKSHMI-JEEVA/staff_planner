from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.hashers import make_password

from .models import AuditLog
from .serializers import AuditLogSerializer
from users.models import Branch, User, Child
from users.serializers import UserSerializer


class AuditLogListView(generics.ListAPIView):
    serializer_class = AuditLogSerializer

    def get_queryset(self):
        return AuditLog.objects.all().order_by('-created_at')

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        return Response({'logs': AuditLogSerializer(qs, many=True).data})


# ── Branch List & Create ──────────────────────────────────────────────────────
class BranchListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        branches = Branch.objects.all().order_by('name')
        result = []
        for b in branches:
            members = User.objects.filter(branch=b)
            managing_users = b.managers.all()
            counts = {'client': 0, 'staff': 0, 'incharge': 0, 'sub_incharge': 0, 'manager': 0}
            for u in members:
                roles = u.roles or []
                if 'parent' in roles:   counts['client'] += 1
                if 'teacher' in roles:  counts['staff'] += 1
                if 'incharge' in roles: counts['incharge'] += 1
            manager_ids = set(managing_users.values_list('id', flat=True))
            for u in members:
                if 'manager' in (u.roles or []):
                    manager_ids.add(u.id)
            counts['manager'] = len(manager_ids)

            primary_ids = set(members.values_list('id', flat=True))
            extra_manager_count = len(manager_ids - primary_ids)
            total = members.count() + extra_manager_count

            result.append({
                'id': str(b.id),
                'name': b.name,
                'address': getattr(b, 'address', ''),
                'phone': getattr(b, 'phone', ''),
                'is_active': True,
                'member_counts': counts,
                'total_members': total,
            })
        return Response({'branches': result})

    def post(self, request):
        name = request.data.get('name', '').strip()
        if not name:
            return Response({'message': 'Branch name required'}, status=400)
        if Branch.objects.filter(name=name).exists():
            return Response({'message': 'Branch name already exists'}, status=409)
        branch = Branch.objects.create(name=name)
        return Response({'branch': {
            'id': str(branch.id),
            'name': branch.name,
            'address': '',
            'phone': '',
            'is_active': True,
            'member_counts': {'client': 0, 'staff': 0, 'incharge': 0, 'manager': 0},
            'total_members': 0,
        }}, status=201)


# ── Branch Detail, Update, Delete ────────────────────────────────────────────
class BranchDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_branch(self, pk):
        try:
            return Branch.objects.get(pk=pk)
        except Branch.DoesNotExist:
            return None

    def get(self, request, pk):
        branch = self.get_branch(pk)
        if not branch:
            return Response({'message': 'Branch not found'}, status=404)
        primary_members = list(User.objects.filter(branch=branch))
        primary_ids = {u.id for u in primary_members}
        extra_managers = [u for u in branch.managers.all() if u.id not in primary_ids]
        all_members = primary_members + extra_managers
        return Response({'branch': {
            'id': str(branch.id),
            'name': branch.name,
            'address': getattr(branch, 'address', ''),
            'phone': getattr(branch, 'phone', ''),
            'is_active': True,
            'members': [{
                'id': str(u.id),
                'name': u.name,
                'email': u.email,
                'phone': u.phone,
                'roles': u.roles,
            } for u in all_members],
        }})

    def put(self, request, pk):
        branch = self.get_branch(pk)
        if not branch:
            return Response({'message': 'Branch not found'}, status=404)
        if 'name' in request.data:
            branch.name = request.data['name'].strip()
        branch.save()
        return Response({'branch': {'id': str(branch.id), 'name': branch.name}})

    def delete(self, request, pk):
        branch = self.get_branch(pk)
        if not branch:
            return Response({'message': 'Branch not found'}, status=404)
        count = User.objects.filter(branch=branch).count()
        if count > 0:
            return Response({'message': f'Cannot delete: branch has {count} member(s). Remove them first.'}, status=400)
        branch.delete()
        return Response({'message': 'Branch deleted'})


# ── Branch Members ────────────────────────────────────────────────────────────
ROLE_MAP = {
    'client': 'parent',
    'staff': 'teacher',
    'incharge': 'incharge',
    'manager': 'manager',
}


class AvailableManagersView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            branch = Branch.objects.get(pk=pk)
        except Branch.DoesNotExist:
            return Response({'message': 'Branch not found'}, status=404)

        managers = User.objects.filter(roles__contains=['manager'])
        result = []
        for u in managers:
            managed = list(u.managed_branches.values_list('id', flat=True))
            primary = u.branch_id
            all_branch_ids = [str(i) for i in managed]
            if primary and str(primary) not in all_branch_ids:
                all_branch_ids.append(str(primary))
            already_assigned = str(branch.id) in all_branch_ids
            result.append({
                'id': str(u.id),
                'name': u.name,
                'email': u.email,
                'phone': u.phone,
                'roles': u.roles,
                'managed_branch_ids': all_branch_ids,
                'already_assigned': already_assigned,
            })
        return Response({'managers': result})


class BranchMemberView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            branch = Branch.objects.get(pk=pk)
        except Branch.DoesNotExist:
            return Response({'message': 'Branch not found'}, status=404)

        member_type = request.data.get('memberType')
        role = ROLE_MAP.get(member_type)
        if not role:
            return Response({'message': 'Invalid member type'}, status=400)

        # ── Manager: assign existing user ─────────────────────────────────────
        if member_type == 'manager':
            existing_user_id = request.data.get('existingUserId')
            if existing_user_id:
                try:
                    user = User.objects.get(pk=existing_user_id)
                except User.DoesNotExist:
                    return Response({'message': 'Manager not found'}, status=404)
                if 'manager' not in (user.roles or []):
                    return Response({'message': 'User is not a manager'}, status=400)
                user.managed_branches.add(branch)
                if not user.branch_id:
                    user.branch = branch
                    user.save()
                return Response({'user': {
                    'id': str(user.id),
                    'name': user.name,
                    'email': user.email,
                    'roles': user.roles,
                    'branch_id': str(branch.id),
                    'managed_branch_ids': [str(b.id) for b in user.managed_branches.all()],
                }}, status=200)

        # ── All other roles: create new user ──────────────────────────────────
        name = request.data.get('name')
        email = request.data.get('email')
        password = request.data.get('password')
        phone = request.data.get('phone', '')
        child_names_raw = request.data.get('childNames')
        if isinstance(child_names_raw, list):
            child_names = [c.strip() for c in child_names_raw if isinstance(c, str) and c.strip()]
        else:
            child_names = []
        if not child_names and member_type == 'client':
            child_names = [name]

        # Email already exists → assign branch + role
        if email and User.objects.filter(email=email).exists():
            user = User.objects.get(email=email)
            current_roles = user.roles or []
            if role not in current_roles:
                user.roles = current_roles + [role]
            # Always update branch to the new branch being assigned
            user.branch = branch
            user.save()

            # ✅ If client (parent), create Child record(s) automatically
            if member_type == 'client':
                existing_names = set(
                    Child.objects.filter(parent_user=user, branch=branch).values_list('name', flat=True)
                )
                for cname in child_names:
                    if cname not in existing_names:
                        Child.objects.create(name=cname, parent_user=user, branch=branch)
                        existing_names.add(cname)

            return Response({'user': {
                'id': str(user.id),
                'name': user.name,
                'email': user.email,
                'roles': user.roles,
                'branch_id': str(branch.id),
            }}, status=200)

        # Create new user
        user = User.objects.create(
            name=name,
            email=email if email else None,
            password=make_password(password) if password else make_password(None),
            phone=phone,
            branch=branch,
            roles=[role],
        )

        if member_type == 'manager':
            user.managed_branches.add(branch)

        # ✅ If client (parent), create Child record(s) automatically
        if member_type == 'client':
            for cname in child_names:
                Child.objects.create(
                    name=cname,
                    parent_user=user,
                    branch=branch,
                )

        return Response({'user': {
            'id': str(user.id),
            'name': user.name,
            'email': user.email,
            'roles': user.roles,
            'branch_id': str(branch.id),
        }}, status=201)


class BranchMemberRemoveView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk, user_id):
        try:
            branch = Branch.objects.get(pk=pk)
        except Branch.DoesNotExist:
            return Response({'message': 'Branch not found'}, status=404)

        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({'message': 'User not found'}, status=404)

        changed = False
        if user.managed_branches.filter(id=branch.id).exists():
            user.managed_branches.remove(branch)
            changed = True
        if user.branch_id == branch.id:
            user.branch = None
            user.save()
            changed = True

        if not changed:
            return Response({'message': 'Member not found in this branch'}, status=404)
        return Response({'message': 'Member removed from branch'})
    
class StaffDirectoryView(APIView):
    permission_classes = [IsAuthenticated]

    def _basic(self, u):
        return {
            'id': str(u.id),
            'name': u.name,
            'email': u.email,
            'phone': u.phone,
            'roles': u.roles or [],
            'is_active': u.is_active,
            'branch_id': str(u.branch_id) if u.branch_id else None,
            'branch_name': u.branch.name if u.branch_id else None,
        }

    def get(self, request):
        all_users = User.objects.select_related('branch').all().order_by('name')

        managers, staff, parents, incharges = [], [], [], []

        for u in all_users:
            roles = u.roles or []
            base = self._basic(u)

            if 'manager' in roles:
                managed = list(u.managed_branches.all())
                managed_ids = {b.id for b in managed}
                # Primary branch counts as managed too, if set and not duplicated
                if u.branch_id and u.branch_id not in managed_ids:
                    managed.append(u.branch)
                    managed_ids.add(u.branch_id)

                branch_blocks = []
                for b in managed:
                    branch_members = User.objects.filter(branch=b)
                    b_staff = [self._basic(m) for m in branch_members if 'teacher' in (m.roles or [])]
                    b_parents = [self._basic(m) for m in branch_members if 'parent' in (m.roles or [])]
                    b_incharges = [self._basic(m) for m in branch_members if 'incharge' in (m.roles or [])]
                    branch_blocks.append({
                        'branch_id': str(b.id),
                        'branch_name': b.name,
                        'staff': b_staff,
                        'parents': b_parents,
                        'incharges': b_incharges,
                    })

                managers.append({**base, 'managed_branches': branch_blocks})

            if 'teacher' in roles:
                staff.append(base)

            if 'parent' in roles:
                parents.append(base)

            if 'incharge' in roles:
                incharges.append(base)

        return Response({
            'manager': managers,
            'staff': staff,
            'parent': parents,
            'incharge': incharges,
            'counts': {
                'manager': len(managers),
                'staff': len(staff),
                'parent': len(parents),
                'incharge': len(incharges),
            },
        })