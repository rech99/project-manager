from rest_framework import permissions
from .models import ProjectMember

class IsProjectMember(permissions.BasePermission):
    """
    Allows access only to users who are members of the project.
    """
    def has_permission(self, request, view):
        # We check project_id from URL kwargs if present (e.g. nested routes /api/projects/<project_id>/boards/)
        project_id = view.kwargs.get('project_id') or request.data.get('project') or request.query_params.get('project')
        if not project_id:
            # If no project_id is found in context, default to returning True
            # Detail permission will handle object-level checks
            return True
            
        return ProjectMember.objects.filter(project_id=project_id, user=request.user).exists()

    def has_object_permission(self, request, view, obj):
        # Determine if obj is a Project or related to a project
        project = obj if hasattr(obj, 'organization') else getattr(obj, 'project', None)
        if not project:
            # Fallback if object has no direct relation
            return True
        return ProjectMember.objects.filter(project=project, user=request.user).exists()

class IsProjectAdmin(permissions.BasePermission):
    """
    Allows modifying project, columns, sprints only for project ADMIN members.
    """
    def has_permission(self, request, view):
        # If read-only, allow
        if request.method in permissions.SAFE_METHODS:
            return True
            
        project_id = view.kwargs.get('project_id') or request.data.get('project') or request.query_params.get('project')
        if not project_id:
            return True
            
        return ProjectMember.objects.filter(project_id=project_id, user=request.user, role='ADMIN').exists()

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
            
        project = obj if hasattr(obj, 'organization') else getattr(obj, 'project', None)
        if not project:
            return True
            
        return ProjectMember.objects.filter(project=project, user=request.user, role='ADMIN').exists()
