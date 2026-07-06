from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta
from .models import Sprint
from .serializers import SprintSerializer
from apps.projects.permissions import IsProjectMember, IsProjectAdmin
from apps.tasks.models import TaskHistory

class SprintViewSet(viewsets.ModelViewSet):
    serializer_class = SprintSerializer
    permission_classes = (permissions.IsAuthenticated, IsProjectMember, IsProjectAdmin)

    def get_queryset(self):
        project_id = self.request.query_params.get('project')
        if project_id:
            return Sprint.objects.filter(project_id=project_id, project__members__user=self.request.user).distinct()
        return Sprint.objects.filter(project__members__user=self.request.user).distinct()

    @action(detail=True, methods=['get'])
    def burndown(self, request, pk=None):
        sprint = self.get_object()
        
        if not sprint.start_date or not sprint.end_date:
            return Response([])
            
        tasks = sprint.tasks.all()
        total_points = sum([t.story_points for t in tasks if t.story_points]) or 0
        
        start_day = sprint.start_date.date()
        end_day = sprint.end_date.date()
        
        days_count = (end_day - start_day).days + 1
        if days_count <= 0 or days_count > 60:
            return Response([])
            
        # Get completion dates for all tasks in the sprint
        completions = {}
        histories = TaskHistory.objects.filter(
            task__sprint=sprint,
            field_changed='column',
            new_value__iexact='done'
        ).order_by('created_at')
        
        for h in histories:
            completions[h.task_id] = h.created_at.date()
            
        current_date = start_day
        day_num = 1
        data = []
        
        while current_date <= end_day:
            # Ideal remaining points (linear reduction to 0)
            ideal = total_points - (total_points * (day_num - 1) / (days_count - 1)) if days_count > 1 else 0
            
            # Actual remaining points
            completed_points = 0
            for t in tasks:
                if t.story_points:
                    # Check if task is currently in Done column and was completed on or before current_date
                    completed_date = completions.get(t.id)
                    if t.column.name.lower() == 'done' and completed_date and completed_date <= current_date:
                        completed_points += t.story_points
            
            actual = total_points - completed_points
            
            # If current_date is in the future, don't show actual line
            actual_val = actual if current_date <= timezone.now().date() else None
            
            data.append({
                "day": f"Day {day_num}",
                "date": str(current_date),
                "Ideal": round(ideal, 1),
                "Actual": round(actual_val, 1) if actual_val is not None else None
            })
            
            current_date += timedelta(days=1)
            day_num += 1
            
        return Response(data)

    @action(detail=False, methods=['get'])
    def velocity(self, request):
        project_id = request.query_params.get('project')
        if not project_id:
            return Response({"error": "project query parameter is required"}, status=400)
            
        sprints = Sprint.objects.filter(project_id=project_id).order_by('created_at')
        data = []
        
        for s in sprints:
            tasks = s.tasks.all()
            planned = sum([t.story_points for t in tasks if t.story_points]) or 0
            completed = sum([t.story_points for t in tasks if t.story_points and t.column.name.lower() == 'done']) or 0
            
            data.append({
                "name": s.name.split(':')[0],  # Shorten name, e.g. "Sprint 1"
                "Planned": planned,
                "Completed": completed
            })
            
        return Response(data)

