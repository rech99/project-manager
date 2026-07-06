from django.urls import re_path
from .consumers import BoardConsumer

websocket_urlpatterns = [
    re_path(r'^ws/board/(?P<board_id>[a-fA-F0-9\-]+)/$', BoardConsumer.as_asgi()),
]
