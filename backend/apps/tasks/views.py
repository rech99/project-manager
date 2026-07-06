from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.utils import timezone
from .models import Task, TaskHistory, Comment, Attachment
from .serializers import TaskCompactSerializer, TaskDetailSerializer, CommentSerializer, AttachmentSerializer
from apps.projects.permissions import IsProjectMember
from apps.projects.models import Project, ProjectMember
from utils.lexorank import lexorank_between

class TaskViewSet(viewsets.ModelViewSet):
    permission_classes = (permissions.IsAuthenticated, IsProjectMember)

    def get_serializer_class(self):
        if self.action in ['retrieve', 'update', 'partial_update']:
            return TaskDetailSerializer
        return TaskCompactSerializer

    def get_queryset(self):
        # Only return tasks belonging to projects the user is a member of
        user_projects = Project.objects.filter(members__user=self.request.user)
        queryset = Task.objects.filter(project__in=user_projects, deleted_at__isnull=True)
        
        # Filtering
        project_id = self.request.query_params.get('project')
        board_id = self.request.query_params.get('board')
        column_id = self.request.query_params.get('column')
        sprint_id = self.request.query_params.get('sprint')
        
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        if board_id:
            queryset = queryset.filter(board_id=board_id)
        if column_id:
            queryset = queryset.filter(column_id=column_id)
        if sprint_id:
            if sprint_id.lower() == 'null':
                queryset = queryset.filter(sprint__isnull=True)
            else:
                queryset = queryset.filter(sprint_id=sprint_id)
                
        return queryset

    def perform_create(self, serializer):
        project_id = self.request.data.get('project')
        project = Project.objects.get(pk=project_id)
        column_id = self.request.data.get('column')
        
        # 1. Check if user is a viewer (Viewers cannot create tasks)
        member = ProjectMember.objects.get(project=project, user=self.request.user)
        if member.role == 'VIEWER':
            raise permissions.exceptions.PermissionDenied("Viewers cannot create tasks.")

        # 2. Auto-generate sequential key: key = PROJECT_KEY + '-' + (total_tasks + 1)
        # Note: In production we would use select_for_update() on project or similar to avoid race conditions,
        # but for a portfolio SQLite setup, this is perfect.
        total_tasks = Task.objects.filter(project=project).count()
        task_key = f"{project.key}-{total_tasks + 1}"
        
        # 3. Calculate Lexorank rank_order (put at the end of the column)
        last_task = Task.objects.filter(column_id=column_id, deleted_at__isnull=True).order_by('rank_order').last()
        prev_rank = last_task.rank_order if last_task else None
        rank = lexorank_between(prev_rank, None)
        
        # 4. Save reporter as current user, and set current user for history logs
        task = serializer.save(
            key=task_key,
            rank_order=rank,
            reporter=self.request.user
        )
        # Seed initial history row
        TaskHistory.objects.create(
            task=task,
            user=self.request.user,
            field_changed='created',
            new_value=task_key
        )

    def perform_update(self, serializer):
        # Set current user on the instance so that the save method logs who made the changes
        task = serializer.instance
        task._current_user = self.request.user
        
        # Check permissions (Viewers cannot edit tasks)
        member = ProjectMember.objects.get(project=task.project, user=self.request.user)
        if member.role == 'VIEWER':
            raise permissions.exceptions.PermissionDenied("Viewers cannot modify tasks.")
            
        serializer.save()

    def perform_destroy(self, instance):
        # Soft delete
        member = ProjectMember.objects.get(project=instance.project, user=self.request.user)
        if member.role == 'VIEWER':
            raise permissions.exceptions.PermissionDenied("Viewers cannot delete tasks.")
            
        instance.deleted_at = timezone.now()
        instance.save()

    @action(detail=True, methods=['patch'], url_path='move')
    def move_task(self, request, pk=None):
        """
        Custom endpoint to move tasks (useful as HTTP fallback or REST alternative to WebSockets).
        Expects:
        - target_column_id
        - prev_task_rank (rank of the card above, or null if moving to top)
        - next_task_rank (rank of the card below, or null if moving to bottom)
        - sprint_id (optional, to move tasks in/out of Sprints)
        """
        task = self.get_object()
        
        # Verify permissions
        member = ProjectMember.objects.get(project=task.project, user=request.user)
        if member.role == 'VIEWER':
            return Response({"error": "Viewers cannot move tasks."}, status=status.HTTP_403_FORBIDDEN)

        target_column_id = request.data.get('target_column_id')
        prev_rank = request.data.get('prev_task_rank')
        next_rank = request.data.get('next_task_rank')
        sprint_id = request.data.get('sprint_id')

        if not target_column_id:
            return Response({"error": "target_column_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Generate new rank
        new_rank = lexorank_between(prev_rank, next_rank)
        
        # 2. Update task fields
        task._current_user = request.user
        task.column_id = target_column_id
        task.rank_order = new_rank
        
        if sprint_id:
            if sprint_id.lower() == 'null':
                task.sprint = None
            else:
                task.sprint_id = sprint_id

        task.save()
        
        serializer = self.get_serializer(task)
        return Response(serializer.data, status=status.HTTP_200_OK)


class CommentViewSet(viewsets.ModelViewSet):
    serializer_class = CommentSerializer
    permission_classes = (permissions.IsAuthenticated, IsProjectMember)

    def get_queryset(self):
        task_id = self.request.query_params.get('task')
        if task_id:
            return Comment.objects.filter(task_id=task_id, task__project__members__user=self.request.user)
        return Comment.objects.filter(task__project__members__user=self.request.user)

    def perform_destroy(self, instance):
        # Only comment owner or project ADMIN can delete comments
        is_owner = instance.user == self.request.user
        is_admin = ProjectMember.objects.filter(project=instance.task.project, user=self.request.user, role='ADMIN').exists()
        if not is_owner and not is_admin:
            raise permissions.exceptions.PermissionDenied("You cannot delete other users' comments.")
        instance.delete()


class AttachmentViewSet(viewsets.ModelViewSet):
    serializer_class = AttachmentSerializer
    permission_classes = (permissions.IsAuthenticated, IsProjectMember)

    def get_queryset(self):
        task_id = self.request.query_params.get('task')
        if task_id:
            return Attachment.objects.filter(task_id=task_id, task__project__members__user=self.request.user)
        return Attachment.objects.filter(task__project__members__user=self.request.user)
        
    def perform_destroy(self, instance):
        is_owner = instance.user == self.request.user
        is_admin = ProjectMember.objects.filter(project=instance.task.project, user=self.request.user, role='ADMIN').exists()
        if not is_owner and not is_admin:
            raise permissions.exceptions.PermissionDenied("You cannot delete this attachment.")
        instance.delete()
