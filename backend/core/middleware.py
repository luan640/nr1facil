class DevCorsMiddleware:
    """
    Minimal CORS middleware for local development.
    Replace with django-cors-headers in production-ready setup.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        from django.conf import settings
        from django.http import HttpResponse

        if request.method == 'OPTIONS':
            response = HttpResponse(status=204)
        else:
            response = self.get_response(request)

        origin = request.headers.get('Origin')
        allowed_origins = getattr(settings, 'CORS_ALLOW_ORIGINS', getattr(settings, 'DEV_CORS_ALLOW_ORIGINS', []))

        if origin and ('*' in allowed_origins or origin in allowed_origins):
            response['Access-Control-Allow-Origin'] = origin
            response['Vary'] = 'Origin'
            response['Access-Control-Allow-Credentials'] = 'true'
            response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Skip-Toast'
            response['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
            response['Access-Control-Expose-Headers'] = 'Content-Length, Content-Disposition, Content-Type'

        return response
