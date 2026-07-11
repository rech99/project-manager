from django.db.models.signals import post_save
from django.dispatch import receiver
from apps.tasks.models import Task, Comment
from apps.users.models import Notification
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

@receiver(post_save, sender=Task)
def task_assignment_signal(sender, instance, created, **kwargs):
    actor = getattr(instance, '_current_user', None)
    
    # If the task has an assignee
    if instance.assignee:
        # Don't notify the assignee if they are the one who performed the action
        if instance.assignee == actor:
            return
            
        if created:
            Notification.objects.create(
                recipient=instance.assignee,
                actor=actor,
                verb='assigned_to_task',
                target_task=instance
            )
        else:
            try:
                from apps.tasks.models import TaskHistory
                # Check if assignee actually changed in this update
                latest_history = TaskHistory.objects.filter(task=instance, field_changed='assignee').first()
                if latest_history:
                    # Avoid creating duplicate notification for the same action
                    if not Notification.objects.filter(
                        recipient=instance.assignee,
                        actor=actor,
                        verb='assigned_to_task',
                        target_task=instance,
                        created_at__gte=instance.updated_at
                    ).exists():
                        Notification.objects.create(
                            recipient=instance.assignee,
                            actor=actor,
                            verb='assigned_to_task',
                            target_task=instance
                        )
            except Exception:
                pass

@receiver(post_save, sender=Comment)
def comment_added_signal(sender, instance, created, **kwargs):
    if created:
        task = instance.task
        # If the task has an assignee and they are not the comment author
        if task.assignee and task.assignee != instance.user:
            Notification.objects.create(
                recipient=task.assignee,
                actor=instance.user,
                verb='commented_on_task',
                target_task=task
            )

@receiver(post_save, sender=Notification)
def broadcast_notification_signal(sender, instance, created, **kwargs):
    if created:
        try:
            channel_layer = get_channel_layer()
            board_id = instance.target_task.board.id
            async_to_sync(channel_layer.group_send)(
                f"board_{board_id}",
                {
                    "type": "board_message",
                    "message": {
                        "event": "NOTIFICATION_CREATED",
                        "payload": {
                            "id": str(instance.id),
                            "recipient_id": str(instance.recipient.id),
                            "actor_name": f"{instance.actor.first_name} {instance.actor.last_name}".strip() or instance.actor.username if instance.actor else "System",
                            "verb": instance.verb,
                            "task_id": str(instance.target_task.id),
                            "task_key": instance.target_task.key,
                            "task_title": instance.target_task.title,
                            "created_at": instance.created_at.isoformat()
                        }
                    }
                }
            )
        except Exception:
            pass
