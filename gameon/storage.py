"""Demo imports only: no database implementation or connections."""
class StorageError(Exception): pass
class DatabaseUnavailable(StorageError): pass
