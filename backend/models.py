from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from database import Base
import datetime


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    usn = Column(String(20), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    branch = Column(String(10), nullable=False)
    section = Column(String(5), nullable=False)
    year = Column(Integer, nullable=False)
    is_admin = Column(Boolean, default=False)
    has_voted = Column(Boolean, default=False)
    password_hash = Column(String(255), nullable=True)  # For authentication
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    candidacies = relationship("Candidate", back_populates="student", cascade="all, delete-orphan")


class Election(Base):
    __tablename__ = "elections"
    
    id = Column(Integer, primary_key=True, index=True)
    branch = Column(String(10), nullable=False, index=True)
    section = Column(String(5), nullable=False, index=True)
    start_time = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    end_time = Column(DateTime, nullable=False)
    is_active = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    # Relationships
    candidates = relationship("Candidate", back_populates="election", cascade="all, delete-orphan")
    votes = relationship("Vote", back_populates="election", cascade="all, delete-orphan")
    vote_receipts = relationship("VoteReceipt", back_populates="election", cascade="all, delete-orphan")


class Candidate(Base):
    __tablename__ = "candidates"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    election_id = Column(Integer, ForeignKey("elections.id"), nullable=False)
    manifesto = Column(Text, nullable=False)
    approved = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    # Relationships
    student = relationship("Student", back_populates="candidacies")
    election = relationship("Election", back_populates="candidates")
    votes = relationship("Vote", back_populates="candidate", cascade="all, delete-orphan")
    
    __table_args__ = (
        UniqueConstraint('student_id', 'election_id', name='unique_candidate_per_election'),
    )


class Vote(Base):
    __tablename__ = "votes"

    id = Column(Integer, primary_key=True, index=True)
    election_id = Column(Integer, ForeignKey("elections.id"), nullable=False, index=True)
    # Nullable to support NOTA votes (None of the Above).
    candidate_id = Column(Integer, ForeignKey("candidates.id"), nullable=True, index=True)
    cast_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    
    # Hash Chain for tamper-evidence
    previous_hash = Column(String(64), nullable=True)  # Hash of previous vote (None for first vote)
    vote_hash = Column(String(64), nullable=True, index=True)  # Hash of this vote data
    
    # Relationships
    election = relationship("Election", back_populates="votes")
    candidate = relationship("Candidate", back_populates="votes")


class VoteReceipt(Base):
    __tablename__ = "vote_receipts"

    id = Column(Integer, primary_key=True, index=True)
    student_usn_hash = Column(String(64), unique=True, nullable=False, index=True)
    election_id = Column(Integer, ForeignKey("elections.id"), nullable=False)
    voted_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    # Relationships
    election = relationship("Election", back_populates="vote_receipts")

    __table_args__ = (
        UniqueConstraint('student_usn_hash', 'election_id', name='unique_vote_per_student_per_election'),
    )


class CandidatureWindow(Base):
    __tablename__ = "candidature_windows"

    id = Column(Integer, primary_key=True, index=True)
    branch = Column(String(10), nullable=False, index=True)
    section = Column(String(5), nullable=False, index=True)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    is_open = Column(Boolean, default=False, index=True)
    election_id = Column(Integer, ForeignKey("elections.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('branch', 'section', name='unique_window_per_section'),
    )


class OTPStore(Base):
    """Store OTPs in database instead of memory for production use."""
    __tablename__ = "otp_stores"

    id = Column(Integer, primary_key=True, index=True)
    usn = Column(String(20), nullable=False, index=True)
    email = Column(String(255), nullable=False)
    otp = Column(String(6), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    is_used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class GlobalRegistrationWindow(Base):
    """Global registration window that opens/closes registration for all sections simultaneously."""
    __tablename__ = "global_registration_windows"

    id = Column(Integer, primary_key=True, index=True)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    is_open = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


class SectionRegistrationOverride(Base):
    """Section-specific registration override - allows admin to re-open registration for specific sections."""
    __tablename__ = "section_registration_overrides"

    id = Column(Integer, primary_key=True, index=True)
    branch = Column(String(10), nullable=False, index=True)
    section = Column(String(5), nullable=False, index=True)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    is_open = Column(Boolean, default=False, index=True)
    reason = Column(Text, nullable=True)  # Admin can specify reason for override
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('branch', 'section', name='unique_override_per_section'),
    )


class ElectionResult(Base):
    """Stores election results and PDF generation status."""
    __tablename__ = "election_results"

    id = Column(Integer, primary_key=True, index=True)
    election_id = Column(Integer, ForeignKey("elections.id"), nullable=False, unique=True)
    winner_candidate_id = Column(Integer, ForeignKey("candidates.id"), nullable=True)
    winner_name = Column(String(100), nullable=True)
    winner_votes = Column(Integer, default=0)
    total_votes = Column(Integer, default=0)
    pdf_generated = Column(Boolean, default=False)
    pdf_path = Column(String(500), nullable=True)
    generated_at = Column(DateTime, nullable=True)
    generated_by = Column(String(100), nullable=True)  # Admin who generated
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


class AuditLog(Base):
    """Audit trail for all critical database operations."""
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, nullable=False, index=True)
    action = Column(String(50), nullable=False)  # CREATE, UPDATE, DELETE, VOTE, LOGIN
    entity_type = Column(String(50), nullable=False)  # Student, Election, Vote, etc.
    entity_id = Column(Integer, nullable=True)
    user_email = Column(String(255), nullable=True)  # Who performed the action
    old_values = Column(Text, nullable=True)  # JSON of old values
    new_values = Column(Text, nullable=True)  # JSON of new values
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)


class VoteReceiptCode(Base):
    """Unique receipt codes for voters to verify their vote was counted."""
    __tablename__ = "vote_receipt_codes"

    id = Column(Integer, primary_key=True, index=True)
    vote_id = Column(Integer, ForeignKey("votes.id"), nullable=False, unique=True)
    election_id = Column(Integer, ForeignKey("elections.id"), nullable=False, index=True)
    receipt_code = Column(String(16), nullable=False, unique=True, index=True)  # e.g., "VOTE-ABCD-1234"
    generated_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    is_verified = Column(Boolean, default=False)
    verified_at = Column(DateTime, nullable=True)
    
    # Relationship
    vote = relationship("Vote", backref="receipt_code")


class MerkleTree(Base):
    """Stores Merkle tree root hash for election integrity verification."""
    __tablename__ = "merkle_trees"

    id = Column(Integer, primary_key=True, index=True)
    election_id = Column(Integer, ForeignKey("elections.id"), nullable=False, unique=True)
    root_hash = Column(String(64), nullable=False)
    tree_data = Column(Text, nullable=True)  # JSON of full tree structure
    vote_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    # Relationship
    election = relationship("Election", backref="merkle_tree")
