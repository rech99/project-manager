from rest_framework import serializers
from .models import Organization, Project, ProjectMember
from apps.users.serializers import UserSerializer

class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = '__all__'

class ProjectMemberSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=ProjectMember._meta.get_field('user').remote_field.model.objects.all(),
        source='user',
        write_only=True
    )

    class Meta:
        model = ProjectMember
        fields = ('id', 'project', 'user', 'user_id', 'role', 'joined_at')
        read_only_fields = ('id', 'project', 'joined_at')

class ProjectSerializer(serializers.ModelSerializer):
    members = ProjectMemberSerializer(many=True, read_only=True)
    organization_name = serializers.CharField(source='organization.name', read_only=True)

    class Meta:
        model = Project
        fields = ('id', 'organization', 'organization_name', 'name', 'key', 'description', 'project_type', 'members', 'created_at', 'updated_at')
        read_only_fields = ('id', 'key', 'created_at', 'updated_at')

    def create(self, validated_data):
        # We auto-assign the creator as ADMIN project member
        project = super().create(validated_data)
        user = self.context['request'].user
        ProjectMember.objects.create(project=project, user=user, role='ADMIN')
        return project
