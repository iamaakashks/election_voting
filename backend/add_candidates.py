from database import SessionLocal
from models import Student, Election, Candidate
from datetime import datetime, timedelta
import random

def add_test_candidates():
    db = SessionLocal()

    # Create an active election for CSE Section A
    election = db.query(Election).filter(
        Election.branch == "CSE", 
        Election.section == "A", 
        Election.is_active == True
    ).first()
    
    if not election:
        election = Election(
            branch="CSE",
            section="A",
            start_time=datetime.utcnow(),
            end_time=datetime.utcnow() + timedelta(minutes=15),
            is_active=True
        )
        db.add(election)
        db.commit()
        db.refresh(election)
        print(f"✓ Created active election for CSE A (ID: {election.id})")
    else:
        print(f"✓ Active election for CSE A already exists (ID: {election.id})")

    # Get students from CSE Section A
    students = db.query(Student).filter(
        Student.branch == "CSE", 
        Student.section == "A"
    ).all()
    
    if len(students) < 2:
        print("❌ Not enough students in CSE Section A to create candidates")
        db.close()
        return

    # Select 2-3 random students as candidates
    candidate_students = random.sample(students, min(3, len(students)))
    
    manifestos = [
        "Together, let's make our lab facilities world-class and ensure every student gets hands-on experience with the latest technology!",
        "Your voice matters! I promise to bridge the gap between students and faculty, ensuring our concerns are heard and addressed promptly.",
        "Innovation, collaboration, and excellence - these are my priorities. Let's build a CSE community that thrives on mutual support and growth!"
    ]

    candidates_added = 0
    for idx, s in enumerate(candidate_students):
        # Check if they are already a candidate
        existing = db.query(Candidate).filter(
            Candidate.student_id == s.id, 
            Candidate.election_id == election.id
        ).first()
        
        if not existing:
            candidate = Candidate(
                student_id=s.id,
                election_id=election.id,
                manifesto=manifestos[idx % len(manifestos)],
                approved=True  # Auto-approve for testing
            )
            db.add(candidate)
            print(f"✓ Added candidate: {s.name} (USN: {s.usn})")
            candidates_added += 1
        else:
            print(f"  - {s.name} is already a candidate")

    db.commit()
    
    if candidates_added == 0:
        print("\n⚠ No new candidates were added (they may already exist)")
    else:
        print(f"\n✅ Successfully added {candidates_added} candidate(s) for the election")
    
    db.close()
    
    # Print test credentials
    print("\n" + "="*60)
    print("📋 TEST CREDENTIALS")
    print("="*60)
    cse_a_students = db.query(Student).filter(
        Student.branch == "CSE", 
        Student.section == "A"
    ).limit(3).all()
    for s in cse_a_students:
        print(f"USN: {s.usn}")
        print(f"Email: {s.email}")
        print(f"Name: {s.name}")
        print("-" * 60)
    print("Note: OTP will be printed in backend console (mock email mode)")
    print("="*60)

if __name__ == "__main__":
    add_test_candidates()
