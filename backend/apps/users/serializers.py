from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'bio', 'avatar')
        read_only_fields = ('id',)

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'first_name', 'last_name')

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', '')
        )
        return user

from .models import Notification

class NotificationSerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()
    task_key = serializers.CharField(source='target_task.key', read_only=True)
    task_title = serializers.CharField(source='target_task.title', read_only=True)

    class Meta:
        model = Notification
        fields = ('id', 'recipient', 'actor', 'actor_name', 'verb', 'target_task', 'task_key', 'task_title', 'is_read', 'created_at')
        read_only_fields = ('id', 'recipient', 'actor', 'actor_name', 'verb', 'target_task', 'task_key', 'task_title', 'created_at')

    def get_actor_name(self, obj):
        if obj.actor:
            return f"{obj.actor.first_name} {obj.actor.last_name}".strip() or obj.actor.username
        return "System"
