import uuid
from django.db import models
from django.conf import settings
from apps.projects.models import Project
from apps.boards.models import Board, Column
from apps.sprints.models import Sprint

class Task(models.Model):
    TASK_TYPES = (
        ('STORY', 'Story'),
        ('TASK', 'Task'),
        ('BUG', 'Bug'),
        ('SUBTASK', 'Subtask'),
    )
    PRIORITIES = (
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
        ('CRITICAL', 'Critical'),
    )
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='tasks')
    board = models.ForeignKey(Board, on_delete=models.RESTRICT, related_name='tasks')
    column = models.ForeignKey(Column, on_delete=models.RESTRICT, related_name='tasks')
    sprint = models.ForeignKey(Sprint, on_delete=models.SET_NULL, null=True, blank=True, related_name='tasks')
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='subtasks')
    
    key = models.CharField(max_length=20, unique=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    task_type = models.CharField(max_length=20, choices=TASK_TYPES, default='TASK')
    priority = models.CharField(max_length=20, choices=PRIORITIES, default='MEDIUM')
    story_points = models.IntegerField(null=True, blank=True, default=None)
    
    rank_order = models.CharField(max_length=255) # Lexorank order within a column
    
    assignee = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_tasks')
    reporter = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.RESTRICT, related_name='reported_tasks')
    
    time_spent_seconds = models.IntegerField(default=0)
    time_estimate_seconds = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['rank_order']
        indexes = [
            models.Index(fields=['column', 'rank_order']),
        ]

    def __str__(self):
        return f"{self.key}: {self.title}"

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        old_task = None
        if not is_new:
            try:
                old_task = Task.objects.get(pk=self.pk)
            except Task.DoesNotExist:
                pass
        
        super().save(*args, **kwargs)
        
        if old_task:
            changes = []
            if old_task.column_id != self.column_id:
                changes.append(('column', old_task.column.name, self.column.name))
            if old_task.assignee_id != self.assignee_id:
                old_user = old_task.assignee.username if old_task.assignee else 'None'
                new_user = self.assignee.username if self.assignee else 'None'
                changes.append(('assignee', old_user, new_user))
            if old_task.story_points != self.story_points:
                changes.append(('story_points', str(old_task.story_points), str(self.story_points)))
            if old_task.priority != self.priority:
                changes.append(('priority', old_task.priority, self.priority))
            if old_task.sprint_id != self.sprint_id:
                old_sp = old_task.sprint.name if old_task.sprint else 'None'
                new_sp = self.sprint.name if self.sprint else 'None'
                changes.append(('sprint', old_sp, new_sp))
                
            for field, old_val, new_val in changes:
                user = getattr(self, '_current_user', None)
                TaskHistory.objects.create(
                    task=self,
                    user=user,
                    field_changed=field,
                    old_value=old_val,
                    new_value=new_val
                )


class TaskHistory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='history')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    field_changed = models.CharField(max_length=50) # e.g. 'column', 'story_points', 'assignee', etc.
    old_value = models.CharField(max_length=255, null=True, blank=True)
    new_value = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.task.key} - {self.field_changed} by {self.user.username if self.user else 'System'}"

class Comment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='comments')
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Comment on {self.task.key} by {self.user.username}"

class Attachment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='attachments')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    file = models.FileField(upload_to='attachments/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Attachment for {self.task.key}"
