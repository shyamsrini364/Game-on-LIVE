"""Paid inference is disabled in this public demo."""
class ProviderError(Exception): pass
class OpenAIResponsesProvider:
    def __init__(self,*args,**kwargs): raise ProviderError("Live inference disabled")
