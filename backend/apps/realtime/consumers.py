from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken
from urllib.parse import parse_qs

from apps.boards.models import Board
from apps.projects.models import ProjectMember
from apps.tasks.models import Task

User = get_user_model()

class BoardConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.board_id = self.scope['url_route']['kwargs']['board_id']
        self.room_group_name = f'board_{self.board_id}'
        
        # 1. Extract and validate JWT Token from query parameters
        query_string = self.scope.get('query_string', b'').decode('utf-8')
        query_params = parse_qs(query_string)
        token_list = query_params.get('token', [])
        
        self.user = AnonymousUser()
        if token_list:
            token = token_list[0]
            self.user = await self.get_user_from_token(token)

        if isinstance(self.user, AnonymousUser):
            await self.close(code=4001)  # Unauthorized
            return

        # 2. Check if user is member of the project for this board
        has_access = await self.check_project_membership(self.board_id, self.user)
        if not has_access:
            await self.close(code=4003)  # Forbidden
            return

        # 3. Join the board channel group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name'):
            # Leave room group
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

    async def receive_json(self, content):
        action = content.get('action')
        payload = content.get('payload', {})

        if action == 'task_move':
            # Handle task movement
            task_id = payload.get('task_id')
            target_column_id = payload.get('target_column_id')
            new_rank_order = payload.get('new_rank_order')
            sprint_id = payload.get('sprint_id')

            # Verify permissions (Viewers cannot modify tasks)
            is_allowed = await self.check_write_permission(self.board_id, self.user)
            if not is_allowed:
                await self.send_json({
                    "event": "ERROR",
                    "payload": {"message": "You do not have permission to move cards."}
                })
                return

            # Apply move in database
            moved_task = await self.db_move_task(task_id, target_column_id, new_rank_order, sprint_id, self.user)
            if moved_task:
                # Broadcast move to all users in the board group
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'board_message',
                        'message': {
                            'event': 'TASK_MOVED',
                            'actor': {
                                'id': str(self.user.id),
                                'username': self.user.username,
                                'name': f"{self.user.first_name} {self.user.last_name}".strip() or self.user.username
                            },
                            'payload': {
                                'task_id': task_id,
                                'source_column_id': payload.get('source_column_id'),
                                'target_column_id': target_column_id,
                                'new_rank_order': new_rank_order,
                                'sprint_id': sprint_id,
                                'updated_at': str(moved_task.updated_at)
                            }
                        }
                    }
                )

        elif action == 'presence_update':
            # Broadcast collaborative mouse cursor/typing to others
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'presence_message',
                    'sender_channel_name': self.channel_name,
                    'message': {
                        'event': 'PRESENCE_UPDATED',
                        'user': {
                            'id': str(self.user.id),
                            'username': self.user.username,
                            'name': f"{self.user.first_name} {self.user.last_name}".strip() or self.user.username
                        },
                        'payload': payload
                    }
                }
            )

    # Helper: receive message from room group
    async def board_message(self, event):
        message = event['message']
        await self.send_json(message)

    # Helper: receive presence message (skip self)
    async def presence_message(self, event):
        if self.channel_name != event['sender_channel_name']:
            await self.send_json(event['message'])

    # Database sync wrappers
    @database_sync_to_async
    def get_user_from_token(self, token_string):
        try:
            access_token = AccessToken(token_string)
            user_id = access_token['user_id']
            return User.objects.get(id=user_id)
        except Exception:
            return AnonymousUser()

    @database_sync_to_async
    def check_project_membership(self, board_id, user):
        try:
            board = Board.objects.get(pk=board_id)
            return ProjectMember.objects.filter(project=board.project, user=user).exists()
        except Board.DoesNotExist:
            return False

    @database_sync_to_async
    def check_write_permission(self, board_id, user):
        try:
            board = Board.objects.get(pk=board_id)
            member = ProjectMember.objects.get(project=board.project, user=user)
            return member.role in ['ADMIN', 'MEMBER']
        except Exception:
            return False

    @database_sync_to_async
    def db_move_task(self, task_id, target_column_id, new_rank_order, sprint_id, user):
        try:
            task = Task.objects.get(pk=task_id)
            task._current_user = user
            task.column_id = target_column_id
            task.rank_order = new_rank_order
            
            if sprint_id:
                if sprint_id.lower() == 'null':
                    task.sprint = None
                else:
                    task.sprint_id = sprint_id
            
            task.save()
            return task
        except Exception as e:
            print("WebSocket database save failed:", e)
            return None
