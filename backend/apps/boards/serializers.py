from rest_framework import serializers
from .models import Board, Column
from apps.tasks.serializers import TaskCompactSerializer

class ColumnSerializer(serializers.ModelSerializer):
    class Meta:
        model = Column
        fields = ('id', 'board', 'name', 'wip_limit', 'rank_order', 'created_at')
        read_only_fields = ('id', 'rank_order', 'created_at')

class ColumnWithTasksSerializer(serializers.ModelSerializer):
    tasks = serializers.SerializerMethodField()

    class Meta:
        model = Column
        fields = ('id', 'board', 'name', 'wip_limit', 'rank_order', 'tasks', 'created_at')
        read_only_fields = ('id', 'rank_order', 'created_at')

    def get_tasks(self, obj):
        # Only return active/non-deleted parent tasks (subtasks are nested inside parent details)
        tasks = obj.tasks.filter(deleted_at__isnull=True, parent__isnull=True).order_by('rank_order')
        return TaskCompactSerializer(tasks, many=True).data

class BoardSerializer(serializers.ModelSerializer):
    columns = serializers.SerializerMethodField()

    class Meta:
        model = Board
        fields = ('id', 'project', 'name', 'description', 'columns', 'created_at')
        read_only_fields = ('id', 'created_at')

    def get_columns(self, obj):
        columns = obj.columns.all().order_by('rank_order')
        return ColumnWithTasksSerializer(columns, many=True).data
