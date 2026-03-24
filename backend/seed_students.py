import random
from sqlalchemy import text, create_engine
from database import SessionLocal, engine
from models import Student
from auth import get_password_hash

def seed_data():
    # Use a fresh connection with autocommit for TRUNCATE
    print("Clearing existing student data...")
    with engine.connect() as conn:
        conn.execute(text("COMMIT"))
        conn.execute(text("TRUNCATE TABLE students RESTART IDENTITY CASCADE"))
        conn.commit()
    print("✓ Existing data cleared")
    
    # Generate a common password hash to speed up seeding (so we don't hash 5000 times)
    common_password = "password123"
    print(f"Generating password hashes (default password: '{common_password}')...")
    common_password_hash = get_password_hash(common_password)
    
    branches = ["CSE", "ISE"]
    sections = ["A", "B", "C", "D"]
    
    # Target: 5000 students total
    # 2 branches × 4 sections = 8 combinations
    # 5000 / 8 = 625 students per branch-section combination
    
    students_per_combination = 625
    
    # First names and last names for realistic names
    first_names = [
        "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Ayan", "Krishna", "Ishaan",
        "Shaurya", "Atharva", "Rohan", "Pranav", "Karan", "Rahul", "Siddharth", "Ankit", "Vikram", "Arnav",
        "Priya", "Ananya", "Diya", "Saanvi", "Aadhya", "Pari", "Nandini", "Myra", "Shriya", "Kavya",
        "Meera", "Ishani", "Aisha", "Riya", "Sneha", "Anjali", "Pooja", "Neha", "Divya", "Lakshmi"
    ]
    
    last_names = [
        "Kumar", "Singh", "Sharma", "Verma", "Patel", "Reddy", "Nair", "Iyer", "Shankar", "Bhat",
        "Rao", "Hegde", "Kamath", "Shetty", "Bhandari", "Desai", "Joshi", "Kulkarni", "Patil", "More"
    ]
    
    print(f"\nSeeding {students_per_combination * 8} students...")
    print("Distribution: 2 branches (CSE, ISE) × 4 sections (A, B, C, D) = 8 combinations")
    print(f"Students per combination: {students_per_combination}\n")
    
    student_counter = 0
    
    for branch in branches:
        for section in sections:
            # Create a new session for each section to avoid batching issues
            db = SessionLocal()
            print(f"Processing {branch}-{section}...")
            branch_code = branch[:2].upper()
            
            # Vary the number of students slightly for each section
            actual_students = random.randint(55, 65)
            
            for i in range(1, actual_students + 1):
                # USN Format: 4NI22CSA001, 4NI23ISB045 etc. (includes section letter)
                year_suffix = random.choice(["22", "23", "24"])
                usn = f"4NI{year_suffix}{branch_code}{section}{str(i).zfill(3)}"
                
                # Generate realistic name
                name = f"{random.choice(first_names)} {random.choice(last_names)}"
                
                # Email includes section to ensure uniqueness across sections
                email = f"{usn.lower()}_c@nie.ac.in"
                
                student = Student(
                    usn=usn,
                    email=email,
                    name=name,
                    branch=branch,
                    section=section,
                    year=int(f"20{year_suffix}"),
                    is_admin=False,
                    has_voted=False,
                    password_hash=common_password_hash
                )
                db.add(student)
                student_counter += 1
                
                # Commit every 200 students
                if student_counter % 200 == 0:
                    db.commit()
                    print(f"  ✓ Inserted {student_counter} students...")
            
            db.commit()
            db.close()
            print(f"✓ Completed {branch}-{section}: {actual_students} students")
    
    # Create admin account
    db = SessionLocal()
    admin_password = "admin"
    admin_password_hash = get_password_hash(admin_password)
    admin = Student(
        usn="ADMIN001",
        email="admin@nie.ac.in",
        name="System Administrator",
        branch="ADMIN",
        section="X",
        year=2024,
        is_admin=True,
        has_voted=False,
        password_hash=admin_password_hash
    )
    db.add(admin)
    db.commit()
    db.close()
    print("\n✓ Admin account created (USN: ADMIN001)")
    
    # Print summary
    print("\n" + "="*60)
    print("📊 SEEDING SUMMARY")
    print("="*60)
    
    db = SessionLocal()
    for branch in branches:
        print(f"\n{branch}:")
        for section in sections:
            count = db.query(Student).filter(
                Student.branch == branch, 
                Student.section == section
            ).count()
            print(f"  Section {section}: {count} students")
    
    total = db.query(Student).filter(Student.is_admin == False).count()
    print(f"\n📋 Total Students (non-admin): {total}")
    print(f"📋 Admin Accounts: 1")
    print(f"📋 Grand Total: {total + 1}")
    
    # Print sample students for testing
    print("\n" + "="*60)
    print("📋 SAMPLE STUDENTS FOR TESTING")
    print("="*60)
    
    for branch in branches:
        for section in sections:
            sample = db.query(Student).filter(
                Student.branch == branch, 
                Student.section == section
            ).first()
            if sample:
                print(f"  {branch}-{section}: {sample.name} | USN: {sample.usn}")
    
    db.close()
    print("\n✅ Seeding complete!")

if __name__ == "__main__":
    seed_data()
