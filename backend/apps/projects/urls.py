from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrganizationViewSet, ProjectViewSet, ProjectMemberViewSet

router = DefaultRouter()
router.register('organizations', OrganizationViewSet, basename='organization')
router.register('projects', ProjectViewSet, basename='project')

# Nested members
project_members_list = ProjectMemberViewSet.as_view({
    'get': 'list',
    'post': 'create'
})
project_members_detail = ProjectMemberViewSet.as_view({
    'get': 'retrieve',
    'put': 'update',
    'patch': 'update',
    'delete': 'destroy'
})

urlpatterns = [
    path('', include(router.urls)),
    path('projects/<uuid:project_pk>/members/', project_members_list, name='project-members-list'),
    path('projects/<uuid:project_pk>/members/<uuid:pk>/', project_members_detail, name='project-members-detail'),
]
