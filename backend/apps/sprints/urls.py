from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SprintViewSet

router = DefaultRouter()
router.register('sprints', SprintViewSet, basename='sprint')

urlpatterns = [
    path('', include(router.urls)),
]
