import os
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ConfigurationError
from dotenv import load_dotenv

# Load backend/.env
env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
load_dotenv(env_path)

_client = None

def get_database():
    """
    Returns the MongoDB database instance.
    Creates the MongoClient if it doesn't exist yet.
    """
    global _client
    
    uri = os.environ.get("MONGODB_URI")
    db_name = os.environ.get("MONGODB_DATABASE")
    
    if not uri or not db_name:
        raise ConfigurationError("MONGODB_URI and MONGODB_DATABASE must be set in backend/.env")
        
    if _client is None:
        import certifi
        try:
            _client = MongoClient(uri, serverSelectionTimeoutMS=5000, tlsCAFile=certifi.where())
            # Ping the server to verify connection
            _client.admin.command('ping')
        except ConnectionFailure as e:
            _client = None
            raise ConnectionFailure("Failed to connect to MongoDB Atlas.") from e
            
    return _client[db_name]
