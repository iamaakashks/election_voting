// RSA Blind Signature utilities for True Server Anonymity

// Basic BigInt modular arithmetic
function gcd(a: bigint, b: bigint): bigint {
    if (b === 0n) return a;
    return gcd(b, a % b);
}

function modInverse(a: bigint, m: bigint): bigint {
    let old_r = a;
    let r = m;
    let old_s = 1n;
    let s = 0n;
    
    while (r !== 0n) {
        let quotient = old_r / r;
        let temp_r = r;
        r = old_r - quotient * r;
        old_r = temp_r;
        
        let temp_s = s;
        s = old_s - quotient * s;
        old_s = temp_s;
    }
    
    let res = old_s % m;
    if (res < 0n) {
        res += m;
    }
    return res;
}

function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
    let res = 1n;
    base = base % mod;
    while (exp > 0n) {
        if (exp % 2n === 1n) res = (res * base) % mod;
        exp = exp / 2n;
        base = (base * base) % mod;
    }
    return res;
}

function generateRandomBigInt(max: bigint): bigint {
    // Generate a random BigInt between 2 and max - 1
    const hex = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    const num = BigInt('0x' + hex);
    return (num % (max - 3n)) + 2n;
}

export interface RSAPublicKey {
    n: string; // hex
    e: string; // hex
}

export interface BlindedData {
    token: string; // original token (hex)
    blindingFactor: string; // r (hex)
    blindedToken: string; // blinded token (hex)
}

export function generateBlindedToken(pubKey: RSAPublicKey): BlindedData {
    const n = BigInt('0x' + pubKey.n);
    const e = BigInt('0x' + pubKey.e);

    // 1. Generate random token m
    const token = generateRandomBigInt(n);

    // 2. Generate random blinding factor r (coprime to n)
    let r = generateRandomBigInt(n);
    while (gcd(r, n) !== 1n) {
        r = generateRandomBigInt(n);
    }

    // 3. Blind the token: m' = (m * r^e) mod n
    const r_e = modPow(r, e, n);
    const blindedToken = (token * r_e) % n;

    return {
        token: token.toString(16),
        blindingFactor: r.toString(16),
        blindedToken: blindedToken.toString(16)
    };
}

export function unblindSignature(blindedSignatureHex: string, blindingFactorHex: string, pubKey: RSAPublicKey): string {
    const n = BigInt('0x' + pubKey.n);
    const s_prime = BigInt('0x' + blindedSignatureHex);
    const r = BigInt('0x' + blindingFactorHex);

    // 4. Unblind the signature: s = (s' * r^-1) mod n
    const r_inv = modInverse(r, n);
    const signature = (s_prime * r_inv) % n;

    return signature.toString(16);
}
