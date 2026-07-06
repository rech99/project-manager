import uuid
from django.db import models
from apps.projects.models import Project

class Board(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='boards')
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} - {self.project.name}"

class Column(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    board = models.ForeignKey(Board, on_delete=models.CASCADE, related_name='columns')
    name = models.CharField(max_length=50)
    wip_limit = models.IntegerField(blank=True, null=True, default=None)
    rank_order = models.CharField(max_length=255) # Lexorank string
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['rank_order']
        # We index column ranking
        indexes = [
            models.Index(fields=['board', 'rank_order']),
        ]

    def __str__(self):
        return f"{self.name} ({self.board.name})"
