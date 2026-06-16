from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .models import RBACRole
from .serializers import RBACRoleSerializer


class RoleListCreateView(APIView):
    def get(self, request):

        roles = RBACRole.objects.all()

        return Response({"roles": RBACRoleSerializer(roles, many=True).data})

    def post(self, request):

        s = RBACRoleSerializer(data=request.data)

        if s.is_valid():
            role = s.save()

            return Response({"role": RBACRoleSerializer(role).data}, status=201)

        return Response(s.errors, status=400)


class RoleDetailView(APIView):
    def get(self, request, pk):

        role = RBACRole.objects.get(pk=pk)

        return Response({"role": RBACRoleSerializer(role).data})

    def put(self, request, pk):
        try:
            role = RBACRole.objects.get(pk=pk)
        except RBACRole.DoesNotExist:
            return Response({"error": "Role not found"}, status=404)

        # If only permissions are being updated, do it directly to avoid
        # serializer validation issues with read-only / unique fields
        if "permissions" in request.data and len(request.data) == 1:
            role.permissions = request.data["permissions"]
            role.save(update_fields=["permissions", "updated_at"])
            return Response({"role": RBACRoleSerializer(role).data})

        s = RBACRoleSerializer(role, data=request.data, partial=True)

        if s.is_valid():
            s.save()
            return Response({"role": s.data})

        return Response(s.errors, status=400)

    def delete(self, request, pk):

        RBACRole.objects.get(pk=pk).delete()

        return Response(status=204)


class RolePermissionsView(APIView):
    def get(self, request, pk):

        role = RBACRole.objects.get(pk=pk)

        return Response({"permissions": role.permissions})


class RolePermissionsByNameView(APIView):
    def get(self, request, name):

        role = RBACRole.objects.get(name=name)

        return Response({"permissions": role.permissions})