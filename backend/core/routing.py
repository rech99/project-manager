import os
import django
from django.core.asgi import get_asgi_application

# Set DJANGO_SETTINGS_MODULE before importing Channels components
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from channels.auth import AuthMiddlewareStack  # noqa: E402
from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: E402
from apps.realtime.routing import websocket_urlpatterns  # noqa: E402

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(
            websocket_urlpatterns
        )
    ),
})
