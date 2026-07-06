from rest_framework import viewsets, permissions
from .models import Organization, Project, ProjectMember
from .serializers import OrganizationSerializer, ProjectSerializer, ProjectMemberSerializer
from .permissions import IsProjectMember, IsProjectAdmin

class OrganizationViewSet(viewsets.ModelViewSet):
    queryset = Organization.objects.all()
    serializer_class = OrganizationSerializer
    permission_classes = (permissions.IsAuthenticated,)

class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer
    permission_classes = (permissions.IsAuthenticated, IsProjectMember, IsProjectAdmin)

    def get_queryset(self):
        # Users only see projects they are members of
        return Project.objects.filter(members__user=self.request.user).distinct()

    def perform_create(self, serializer):
        # We auto-generate the project key if not provided (first 4 uppercase letters of project name)
        name = self.request.data.get('name', 'PROJ')
        key = self.request.data.get('key', '').upper()
        if not key:
            key = "".join([c for c in name if c.isalnum()][:4]).upper()
        
        # Ensure key is unique
        base_key = key
        counter = 1
        while Project.objects.filter(key=key).exists():
            key = f"{base_key}{counter}"
            counter += 1
            
        serializer.save(key=key)

class ProjectMemberViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectMemberSerializer
    permission_classes = (permissions.IsAuthenticated, IsProjectMember)

    def get_queryset(self):
        project_id = self.kwargs.get('project_pk') or self.request.query_params.get('project')
        if project_id:
            return ProjectMember.objects.filter(project_id=project_id)
        return ProjectMember.objects.filter(project__members__user=self.request.user).distinct()

    def perform_create(self, serializer):
        project_id = self.kwargs.get('project_pk') or self.request.data.get('project')
        # Check if current user is admin of the project to add new members
        is_admin = ProjectMember.objects.filter(project_id=project_id, user=self.request.user, role='ADMIN').exists()
        if not is_admin:
            raise permissions.exceptions.PermissionDenied("Only project administrators can invite members.")
        serializer.save(project_id=project_id)
