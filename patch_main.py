import re

with open("backend/main.py", "r", encoding="utf-8") as f:
    content = f.read()

# Find the start of cast_vote
start_idx = content.find('@app.post("/vote")\ndef cast_vote(request: VoteRequest,')

# Find the start of the next function
end_idx = content.find('# ============== Admin Endpoints ==============')

if start_idx == -1 or end_idx == -1:
    print("Could not find the function boundaries!")
    exit(1)

old_code = content[start_idx:end_idx]

new_code = """import blind_rsa

@app.get("/public/rsa-key")
def get_rsa_public_key():
    return blind_rsa.get_public_key()

@app.post("/vote/request-token")
def request_voting_token(request: TokenRequest, student_usn: Optional[str] = None, db: Session = Depends(database.get_db)):
    \"\"\"Step 1: Student requests authorization to vote. Returns a blind signature.\"\"\"
    usn = request.student_usn or student_usn
    if not usn:
        raise HTTPException(status_code=400, detail="Student USN is required.")
    
    student = db.query(models.Student).filter(models.Student.usn == usn).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    election = db.query(models.Election).filter(models.Election.id == request.election_id).first()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")
        
    now = datetime.utcnow()
    if not election.is_active or not (election.start_time <= now <= election.end_time):
        raise HTTPException(status_code=400, detail="This election is not active.")
        
    from auth import hash_usn_for_receipt
    usn_hash = hash_usn_for_receipt(student.usn, election.id)
    
    # Check if student already got a token (VoteReceipt acts as authorization receipt now)
    existing_receipt = db.query(models.VoteReceipt).filter(
        models.VoteReceipt.student_usn_hash == usn_hash,
        models.VoteReceipt.election_id == election.id
    ).first()
    if existing_receipt:
        raise HTTPException(status_code=400, detail="You have already requested a voting token for this election.")
        
    # Sign the token
    try:
        signature_hex = blind_rsa.sign_blinded_token(request.blinded_token)
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid token format")
        
    # Record authorization
    vote_receipt = models.VoteReceipt(
        student_usn_hash=usn_hash,
        election_id=request.election_id
    )
    db.add(vote_receipt)
    student.has_voted = True  # Prevent asking for another token
    db.commit()
    
    return {
        "signature": signature_hex,
        "message": "Token authorized successfully."
    }

@app.post("/vote")
def cast_vote(request: VoteRequest, db: Session = Depends(database.get_db)):
    \"\"\"Step 2: Anonymous voting using the unblinded token and signature.\"\"\"
    election = db.query(models.Election).filter(models.Election.id == request.election_id).first()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")

    now = datetime.utcnow()
    if not election.is_active or not (election.start_time <= now <= election.end_time):
        raise HTTPException(status_code=400, detail="This election is not active.")
        
    # Verify cryptographic signature
    if not blind_rsa.verify_token_signature(request.token, request.signature):
        raise HTTPException(status_code=401, detail="Invalid or unauthorized voting token signature.")
        
    # Prevent double spending
    import hashlib
    token_hash = hashlib.sha256(request.token.encode()).hexdigest()
    existing_vote = db.query(models.Vote).filter(models.Vote.voting_token_hash == token_hash).first()
    if existing_vote:
        raise HTTPException(status_code=400, detail="This voting token has already been used.")

    if request.is_nota:
        candidate_id = None
    else:
        if not request.candidate_id:
            raise HTTPException(status_code=400, detail="Invalid vote: must select a candidate or NOTA")
        candidate = db.query(models.Candidate).filter(
            models.Candidate.id == request.candidate_id,
            models.Candidate.election_id == request.election_id,
            models.Candidate.approved == True
        ).first()
        if not candidate:
            raise HTTPException(status_code=400, detail="Invalid candidate.")
        candidate_id = request.candidate_id
        
    last_vote = db.query(models.Vote).filter(models.Vote.election_id == election.id).order_by(models.Vote.cast_at.desc()).first()
    previous_hash = last_vote.vote_hash if last_vote else None
    cast_at = datetime.utcnow()
    
    from auth import create_vote_hash, generate_receipt_code, build_merkle_tree
    vote_hash = create_vote_hash(election.id, candidate_id or -1, cast_at.isoformat(), previous_hash)

    try:
        new_vote = models.Vote(
            election_id=request.election_id,
            candidate_id=candidate_id,
            cast_at=cast_at,
            previous_hash=previous_hash,
            vote_hash=vote_hash,
            voting_token_hash=token_hash
        )
        db.add(new_vote)
        db.flush()

        receipt_code = generate_receipt_code()
        vote_receipt_code = models.VoteReceiptCode(
            vote_id=new_vote.id,
            election_id=request.election_id,
            receipt_code=receipt_code
        )
        db.add(vote_receipt_code)

        # Update Merkle tree
        votes = db.query(models.Vote).filter(models.Vote.election_id == request.election_id).order_by(models.Vote.cast_at).all()
        vote_hashes = [v.vote_hash for v in votes]
        merkle_data = build_merkle_tree(vote_hashes)

        merkle_tree = db.query(models.MerkleTree).filter(models.MerkleTree.election_id == request.election_id).first()
        if merkle_tree:
            merkle_tree.root_hash = merkle_data["root_hash"]
            merkle_tree.tree_data = json.dumps(merkle_data["tree"])
            merkle_tree.vote_count = len(votes)
        else:
            merkle_tree = models.MerkleTree(
                election_id=request.election_id,
                root_hash=merkle_data["root_hash"],
                tree_data=json.dumps(merkle_data["tree"]),
                vote_count=len(votes)
            )
            db.add(merkle_tree)
            
        # Update SectionElectionRecord
        academic_year = f"{cast_at.year - 1 if cast_at.month < 4 else cast_at.year}-{cast_at.year + 1 if cast_at.month < 4 else cast_at.year + 1}"
        section_record = db.query(models.SectionElectionRecord).filter(
            models.SectionElectionRecord.branch == election.branch,
            models.SectionElectionRecord.section == election.section,
            models.SectionElectionRecord.academic_year == academic_year
        ).first()

        if section_record:
            total_voters = db.query(models.Student).filter(
                models.Student.branch == election.branch,
                models.Student.section == election.section,
                models.Student.is_admin == False,
                models.Student.has_voted == True
            ).count()
            total_students = db.query(models.Student).filter(
                models.Student.branch == election.branch,
                models.Student.section == election.section,
                models.Student.is_admin == False
            ).count()
            turnout_percentage = round((total_voters / total_students * 100), 2) if total_students > 0 else 0
            section_record.total_voters = total_voters
            section_record.turnout_percentage = turnout_percentage
            section_record.updated_at = cast_at

        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to cast vote due to a server error. Please retry.")

    run_async_safely(
        lambda: manager.broadcast_to_election(
            request.election_id,
            {
                "type": "vote_cast",
                "election_id": request.election_id,
                "message": "A vote has been cast",
                "timestamp": datetime.utcnow().isoformat()
            }
        ),
        "broadcast_vote_cast"
    )

    return {
        "message": "Vote cast successfully" + (" (NOTA)" if request.is_nota else ""),
        "timestamp": cast_at.isoformat(),
        "vote_id": new_vote.id,
        "receipt_code": receipt_code,
        "chain_verified": True,
        "is_nota": request.is_nota,
        "merkle_root": merkle_data["root_hash"]
    }

"""

with open("backend/main.py", "w", encoding="utf-8") as f:
    f.write(content[:start_idx] + new_code + content[end_idx:])

print("Successfully patched main.py")