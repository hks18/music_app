"""
Supabase client singleton.

Usage anywhere in Django:
    from music_room.supabase_client import get_supabase_client
    supabase = get_supabase_client()

    # Example: log a room event directly to Supabase
    supabase.table('room_events').insert({
        'room_code': 'ABC123',
        'event': 'member_joined',
    }).execute()
"""
from django.conf import settings

_supabase_client = None


def get_supabase_client(use_service_role: bool = False):
    """
    Returns a Supabase client instance.
    - use_service_role=False  → uses anon key  (safe for read-only / user-level ops)
    - use_service_role=True   → uses service role key (bypasses RLS, server-side only)
    """
    global _supabase_client

    if _supabase_client is None:
        try:
            from supabase import create_client, Client
            key = settings.SUPABASE_SERVICE_ROLE_KEY if use_service_role else settings.SUPABASE_ANON_KEY
            if not settings.SUPABASE_URL or not key:
                raise ValueError("SUPABASE_URL and SUPABASE_ANON_KEY must be set in .env")
            _supabase_client = create_client(settings.SUPABASE_URL, key)
        except ImportError:
            raise ImportError("supabase package not installed. Run: pip install supabase")

    return _supabase_client
