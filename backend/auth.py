import os
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from dotenv import load_dotenv
import hashlib
import secrets
import json

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "fallback-secret-key-change-in-production")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

pwd_context = CryptContext(schemes=["sha256_crypt"], deprecated="auto")


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token with the provided data."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "iat": datetime.utcnow()})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> Optional[dict]:
    """Verify and decode a JWT token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


def generate_otp() -> str:
    """Generate a cryptographically secure 6-digit OTP."""
    return ''.join([str(secrets.randbelow(10)) for _ in range(6)])


def generate_receipt_code() -> str:
    """Generate a unique vote receipt code (format: VOTE-XXXX-XXXX)."""
    chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'  # No I, O, 0, 1 to avoid confusion
    part1 = ''.join(secrets.choice(chars) for _ in range(4))
    part2 = ''.join(secrets.choice(chars) for _ in range(4))
    return f"VOTE-{part1}-{part2}"


def hash_usn_for_receipt(usn: str, election_id: int, salt: str = None) -> str:
    """
    Create a SHA256 hash of USN + election_id + salt for anonymous vote receipt.
    This ensures votes cannot be traced back to students while preventing double-voting.
    """
    if salt is None:
        salt = SECRET_KEY[:16]  # Use part of secret key as salt
    data = f"{usn}:{election_id}:{salt}"
    return hashlib.sha256(data.encode()).hexdigest()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password."""
    return pwd_context.hash(password)


def create_vote_hash(election_id: int, candidate_id: int, cast_at: str, previous_hash: str = None) -> str:
    """
    Create a SHA256 hash for vote chaining.
    Includes previous vote hash to create tamper-evident chain.
    """
    data = f"{election_id}:{candidate_id}:{cast_at}:{previous_hash or 'GENESIS'}"
    return hashlib.sha256(data.encode()).hexdigest()


def verify_vote_chain(votes: list) -> dict:
    """
    Verify the integrity of the vote chain.
    Returns verification status and any broken links.
    """
    if not votes:
        return {"valid": True, "message": "No votes to verify", "broken_links": []}
    
    broken_links = []
    previous_hash = None
    
    for i, vote in enumerate(votes):
        expected_hash = create_vote_hash(
            vote['election_id'],
            vote['candidate_id'],
            vote['cast_at'],
            vote.get('previous_hash')
        )
        
        if vote.get('vote_hash') != expected_hash:
            broken_links.append({
                "vote_id": vote.get('id'),
                "position": i,
                "reason": "Hash mismatch"
            })
        
        if i > 0 and vote.get('previous_hash') != votes[i-1].get('vote_hash'):
            broken_links.append({
                "vote_id": vote.get('id'),
                "position": i,
                "reason": "Chain broken - previous hash mismatch"
            })
        
        previous_hash = vote.get('vote_hash')
    
    return {
        "valid": len(broken_links) == 0,
        "message": "Vote chain verified successfully" if len(broken_links) == 0 else f"Found {len(broken_links)} integrity issues",
        "broken_links": broken_links
    }


def build_merkle_tree(vote_hashes: list) -> dict:
    """
    Build a Merkle tree from a list of vote hashes.
    Returns root hash and tree structure.
    """
    if not vote_hashes:
        return {"root_hash": hashlib.sha256(b"EMPTY").hexdigest(), "tree": [], "vote_count": 0}
    
    # Pad to power of 2
    while len(vote_hashes) & (len(vote_hashes) - 1) != 0:
        vote_hashes.append(vote_hashes[-1])
    
    tree = [vote_hashes[:]]
    
    current_level = vote_hashes[:]
    while len(current_level) > 1:
        next_level = []
        for i in range(0, len(current_level), 2):
            combined = current_level[i] + current_level[i + 1]
            next_level.append(hashlib.sha256(combined.encode()).hexdigest())
        tree.append(next_level)
        current_level = next_level
    
    return {
        "root_hash": current_level[0] if current_level else hashlib.sha256(b"EMPTY").hexdigest(),
        "tree": tree,
        "vote_count": len(vote_hashes)
    }


def verify_merkle_proof(leaf_hash: str, proof: list, root_hash: str, leaf_index: int) -> bool:
    """
    Verify that a leaf hash is part of the Merkle tree.
    """
    current_hash = leaf_hash
    current_index = leaf_index
    
    for sibling_hash in proof:
        if current_index % 2 == 0:
            combined = current_hash + sibling_hash
        else:
            combined = sibling_hash + current_hash
        current_hash = hashlib.sha256(combined.encode()).hexdigest()
        current_index //= 2
    
    return current_hash == root_hash
