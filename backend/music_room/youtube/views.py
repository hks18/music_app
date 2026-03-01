import requests
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3'


class SearchVideosView(APIView):
    """
    GET /youtube/search/?q=<query>&max_results=10
    Search YouTube for music videos using the Data API v3.
    No auth required — only needs YOUTUBE_API_KEY in .env.
    """
    def get(self, request):
        api_key = settings.YOUTUBE_API_KEY
        if not api_key:
            return Response(
                {'error': 'YOUTUBE_API_KEY not set in .env'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        query = request.GET.get('q', '').strip()
        max_results = min(int(request.GET.get('max_results', 10)), 25)

        if not query:
            return Response({'error': 'Query parameter "q" is required.'}, status=status.HTTP_400_BAD_REQUEST)

        resp = requests.get(
            f'{YOUTUBE_API_BASE}/search',
            params={
                'part': 'snippet',
                'q': query,
                'type': 'video',
                'videoCategoryId': '10',  # Music category
                'maxResults': max_results,
                'key': api_key,
            }
        )

        if resp.status_code != 200:
            return Response(
                {'error': 'YouTube API error', 'details': resp.json()},
                status=status.HTTP_400_BAD_REQUEST
            )

        items = resp.json().get('items', [])
        results = []
        for item in items:
            snippet = item.get('snippet', {})
            video_id = item['id'].get('videoId')
            if not video_id:
                continue
            results.append({
                'video_id': video_id,
                'title': snippet.get('title'),
                'channel': snippet.get('channelTitle'),
                'thumbnail': snippet.get('thumbnails', {}).get('high', {}).get('url'),
                'published_at': snippet.get('publishedAt'),
                'url': f'https://www.youtube.com/watch?v={video_id}',
            })

        return Response({'results': results, 'total': len(results)})


class VideoDetailView(APIView):
    """
    GET /youtube/video/<video_id>/
    Returns metadata for a single YouTube video (title, duration, thumbnail).
    """
    def get(self, request, video_id):
        api_key = settings.YOUTUBE_API_KEY
        if not api_key:
            return Response({'error': 'YOUTUBE_API_KEY not set in .env'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        resp = requests.get(
            f'{YOUTUBE_API_BASE}/videos',
            params={
                'part': 'snippet,contentDetails',
                'id': video_id,
                'key': api_key,
            }
        )

        if resp.status_code != 200:
            return Response({'error': 'YouTube API error'}, status=status.HTTP_400_BAD_REQUEST)

        items = resp.json().get('items', [])
        if not items:
            return Response({'error': 'Video not found.'}, status=status.HTTP_404_NOT_FOUND)

        item = items[0]
        snippet = item.get('snippet', {})
        content = item.get('contentDetails', {})

        return Response({
            'video_id': video_id,
            'title': snippet.get('title'),
            'channel': snippet.get('channelTitle'),
            'description': snippet.get('description', '')[:300],
            'thumbnail': snippet.get('thumbnails', {}).get('high', {}).get('url'),
            'duration_iso': content.get('duration'),  # e.g. PT3M45S
            'url': f'https://www.youtube.com/watch?v={video_id}',
        })
