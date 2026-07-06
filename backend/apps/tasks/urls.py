from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TaskViewSet, CommentViewSet, AttachmentViewSet

router = DefaultRouter()
router.register('tasks', TaskViewSet, basename='task')
router.register('comments', CommentViewSet, basename='comment')
router.register('attachments', AttachmentViewSet, basename='attachment')

urlpatterns = [
    path('', include(router.urls)),
]
