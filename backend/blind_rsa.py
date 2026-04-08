import os
import json
import hashlib
from base64 import b64encode, b64decode
import secrets

KEY_FILE = "server_rsa_key.json"
# e is typically 65537
E = 65537

def _is_prime(n, k=5):
    """Miller-Rabin primality test."""
    if n < 2: return False
    if n in (2, 3): return True
    if n % 2 == 0: return False
    
    r, s = 0, n - 1
    while s % 2 == 0:
        r += 1
        s //= 2
    for _ in range(k):
        a = secrets.randbelow(n - 3) + 2
        x = pow(a, s, n)
        if x == 1 or x == n - 1:
            continue
        for _ in range(r - 1):
            x = pow(x, 2, n)
            if x == n - 1:
                break
        else:
            return False
    return True

def _generate_prime(bits=1024):
    while True:
        p = secrets.randbits(bits) | (1 << (bits - 1)) | 1
        if _is_prime(p):
            return p

def _ext_gcd(a, b):
    if a == 0:
        return b, 0, 1
    gcd, x1, y1 = _ext_gcd(b % a, a)
    x = y1 - (b // a) * x1
    y = x1
    return gcd, x, y

def generate_keypair(bits=2048):
    p = _generate_prime(bits // 2)
    q = _generate_prime(bits // 2)
    n = p * q
    phi = (p - 1) * (q - 1)
    _, d, _ = _ext_gcd(E, phi)
    d = d % phi
    if d < 0: d += phi
    return (n, E), (n, d)

def load_or_generate_keys():
    if os.path.exists(KEY_FILE):
        with open(KEY_FILE, "r") as f:
            data = json.load(f)
            return (data["n"], data["e"]), (data["n"], data["d"])
    else:
        print("Generating new RSA keys for blind signatures (this may take a few seconds)...")
        pub, priv = generate_keypair(2048)
        with open(KEY_FILE, "w") as f:
            json.dump({
                "n": pub[0],
                "e": pub[1],
                "d": priv[1]
            }, f)
        return pub, priv

# Global keys
pub_key, priv_key = load_or_generate_keys()

def get_public_key():
    """Return public key as hex strings."""
    return {
        "n": hex(pub_key[0])[2:],
        "e": hex(pub_key[1])[2:]
    }

def sign_blinded_token(blinded_token_hex: str) -> str:
    """Sign a blinded token provided by the client."""
    blinded_token = int(blinded_token_hex, 16)
    n, d = priv_key
    # Sign: s' = (m')^d mod n
    signature = pow(blinded_token, d, n)
    return hex(signature)[2:]

def verify_token_signature(token_hex: str, signature_hex: str) -> bool:
    """Verify that a signature is valid for a given unblinded token."""
    token = int(token_hex, 16)
    signature = int(signature_hex, 16)
    n, e = pub_key
    # Verify: m = s^e mod n
    return pow(signature, e, n) == token
