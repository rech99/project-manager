from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Task, TaskHistory, Comment, Attachment
from apps.users.serializers import UserSerializer

User = get_user_model()

class CommentSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Comment
        fields = ('id', 'task', 'user', 'content', 'created_at', 'updated_at')
        read_only_fields = ('id', 'user', 'created_at', 'updated_at')

    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['user'] = user
        return super().create(validated_data)

class AttachmentSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Attachment
        fields = ('id', 'task', 'user', 'file', 'uploaded_at')
        read_only_fields = ('id', 'user', 'uploaded_at')

    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['user'] = user
        return super().create(validated_data)

class TaskHistorySerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = TaskHistory
        fields = ('id', 'task', 'user', 'field_changed', 'old_value', 'new_value', 'created_at')

class TaskSubtaskSerializer(serializers.ModelSerializer):
    """Compact serializer for subtasks to display on parent details."""
    assignee_name = serializers.CharField(source='assignee.username', read_only=True)

    class Meta:
        model = Task
        fields = ('id', 'key', 'title', 'task_type', 'priority', 'rank_order', 'column', 'assignee_name')

class TaskCompactSerializer(serializers.ModelSerializer):
    assignee = UserSerializer(read_only=True)
    assignee_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source='assignee', write_only=True, required=False, allow_null=True
    )
    reporter = UserSerializer(read_only=True)
    subtask_count = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = (
            'id', 'project', 'board', 'column', 'sprint', 'parent', 'key', 'title',
            'task_type', 'priority', 'story_points', 'rank_order', 'assignee', 'assignee_id',
            'reporter', 'time_spent_seconds', 'time_estimate_seconds', 'subtask_count', 'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'key', 'rank_order', 'reporter', 'created_at', 'updated_at')

    def get_subtask_count(self, obj):
        return obj.subtasks.count()

class TaskDetailSerializer(serializers.ModelSerializer):
    assignee = UserSerializer(read_only=True)
    assignee_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source='assignee', write_only=True, required=False, allow_null=True
    )
    reporter = UserSerializer(read_only=True)
    subtasks = TaskSubtaskSerializer(many=True, read_only=True)
    comments = CommentSerializer(many=True, read_only=True)
    attachments = AttachmentSerializer(many=True, read_only=True)
    history = TaskHistorySerializer(many=True, read_only=True)

    class Meta:
        model = Task
        fields = (
            'id', 'project', 'board', 'column', 'sprint', 'parent', 'key', 'title',
            'description', 'task_type', 'priority', 'story_points', 'rank_order',
            'assignee', 'assignee_id', 'reporter', 'time_spent_seconds', 'time_estimate_seconds',
            'subtasks', 'comments', 'attachments', 'history', 'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'key', 'rank_order', 'reporter', 'created_at', 'updated_at')
