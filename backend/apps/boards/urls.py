from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BoardViewSet, ColumnViewSet

router = DefaultRouter()
router.register('boards', BoardViewSet, basename='board')
router.register('columns', ColumnViewSet, basename='column')

urlpatterns = [
    path('', include(router.urls)),
]
