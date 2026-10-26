import os
from fastapi import Request, HTTPException, status

AI_INTERNAL_SECRET = os.environ.get("AI_INTERNAL_SECRET", "internal_shared_secret_school_crm_ai_service_token")

async def verify_internal_token(request: Request):
    """
    Validates that incoming requests to the private AI microservice carry
    a valid `x-internal-ai-secret` header matching `AI_INTERNAL_SECRET`.
    Exempts `/health` and `/` endpoints for load balancer health probes.
    """
    if request.url.path in ["/", "/health", "/docs", "/openapi.json"]:
        return

    secret_header = request.headers.get("x-internal-ai-secret")
    if not secret_header or secret_header != AI_INTERNAL_SECRET:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized access to internal AI microservice. Invalid or missing secret token header."
        )
