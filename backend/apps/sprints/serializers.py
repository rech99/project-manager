from rest_framework import serializers
from .models import Sprint

class SprintSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sprint
        fields = ('id', 'project', 'name', 'goal', 'status', 'start_date', 'end_date', 'created_at')
        read_only_fields = ('id', 'created_at')
