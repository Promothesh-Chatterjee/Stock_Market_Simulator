from datetime import date
from sqlalchemy.orm import Session
from app.core.database import Base, engine, SessionLocal
from app.models.models import HolidayCalendar
import logging

logger = logging.getLogger(__name__)

HOLIDAYS_2026 = [
    {"date": date(2026, 1, 26), "name": "Republic Day", "desc": "National Holiday"},
    {"date": date(2026, 3, 3), "name": "Holi", "desc": "Festival of Colors"},
    {"date": date(2026, 3, 26), "name": "Shri Ram Navami", "desc": "Ram Navami"},
    {"date": date(2026, 3, 31), "name": "Shri Mahavir Jayanti", "desc": "Mahavir Jayanti"},
    {"date": date(2026, 4, 3), "name": "Good Friday", "desc": "Good Friday"},
    {"date": date(2026, 4, 14), "name": "Dr. Baba Saheb Ambedkar Jayanti", "desc": "Ambedkar Jayanti"},
    {"date": date(2026, 5, 1), "name": "Maharashtra Day", "desc": "State Holiday"},
    {"date": date(2026, 5, 28), "name": "Bakri Id", "desc": "Eid-al-Adha"},
    {"date": date(2026, 6, 26), "name": "Muharram", "desc": "Islamic New Year"},
    {"date": date(2026, 9, 14), "name": "Ganesh Chaturthi", "desc": "Ganesh Festival"},
    {"date": date(2026, 10, 2), "name": "Mahatma Gandhi Jayanti", "desc": "Gandhi Jayanti"},
    {"date": date(2026, 10, 20), "name": "Dussehra", "desc": "Vijayadashami"},
    {"date": date(2026, 11, 10), "name": "Diwali - Balipratipada", "desc": "Festival of Lights"},
    {"date": date(2026, 11, 24), "name": "Prakash Gurpurb Sri Guru Nanak Dev", "desc": "Guru Nanak Jayanti"},
    {"date": date(2026, 12, 25), "name": "Christmas", "desc": "Christmas Day"}
]

def init_db():
    logger.info("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Check if holidays are already seeded
        count = db.query(HolidayCalendar).count()
        if count == 0:
            logger.info("Seeding 2026 NSE/BSE holidays calendar...")
            for h in HOLIDAYS_2026:
                holiday = HolidayCalendar(
                    holiday_date=h["date"],
                    holiday_name=h["name"],
                    description=h["desc"]
                )
                db.add(holiday)
            db.commit()
            logger.info(f"Successfully seeded {len(HOLIDAYS_2026)} holidays.")
        else:
            logger.info("Holiday calendar already seeded.")
    except Exception as e:
        logger.error(f"Error during database initialization: {e}")
        db.rollback()
    finally:
        db.close()
