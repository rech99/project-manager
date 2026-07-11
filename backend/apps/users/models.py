from django.contrib.auth.models import AbstractUser
from django.db import models
from django.conf import settings
import uuid
from apps.tasks.models import Task

class User(AbstractUser):
    bio = models.TextField(blank=True, null=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)

    def __str__(self):
        return self.email or self.username

class Notification(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='notifications'
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='actions_logged'
    )
    verb = models.CharField(max_length=50)  # e.g., 'assigned_to_task', 'commented_on_task'
    target_task = models.ForeignKey(
        Task, 
        on_delete=models.CASCADE, 
        related_name='notifications'
    )
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'is_read', '-created_at']),
        ]

    def __str__(self):
        return f"{self.actor} {self.verb} {self.recipient}"
