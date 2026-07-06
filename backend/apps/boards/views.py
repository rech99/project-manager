from rest_framework import viewsets, permissions
from .models import Board, Column
from .serializers import BoardSerializer, ColumnSerializer
from apps.projects.permissions import IsProjectMember, IsProjectAdmin
from utils.lexorank import lexorank_between

class BoardViewSet(viewsets.ModelViewSet):
    serializer_class = BoardSerializer
    permission_classes = (permissions.IsAuthenticated, IsProjectMember, IsProjectAdmin)

    def get_queryset(self):
        # Only return boards of projects the user is a member of
        queryset = Board.objects.filter(project__members__user=self.request.user).distinct()
        project_id = self.request.query_params.get('project')
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        return queryset

    def perform_create(self, serializer):
        # We need project from request data
        serializer.save()

class ColumnViewSet(viewsets.ModelViewSet):
    serializer_class = ColumnSerializer
    permission_classes = (permissions.IsAuthenticated, IsProjectMember, IsProjectAdmin)

    def get_queryset(self):
        board_id = self.request.query_params.get('board')
        if board_id:
            return Column.objects.filter(board_id=board_id, board__project__members__user=self.request.user).distinct()
        return Column.objects.filter(board__project__members__user=self.request.user).distinct()

    def perform_create(self, serializer):
        board_id = self.request.data.get('board')
        # Find the last column's rank_order to append to the end
        last_col = Column.objects.filter(board_id=board_id).order_by('rank_order').last()
        prev_rank = last_col.rank_order if last_col else None
        
        # Calculate rank_order
        rank = lexorank_between(prev_rank, None)
        serializer.save(rank_order=rank)
