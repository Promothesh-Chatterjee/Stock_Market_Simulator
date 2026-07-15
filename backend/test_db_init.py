import sys
import os

# Add the app directory to sys.path
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__))))

from app.core.init_db import init_db
from app.core.database import SessionLocal
from app.models.models import HolidayCalendar

if __name__ == "__main__":
    print("Testing DB initialization...")
    init_db()
    
    db = SessionLocal()
    try:
        holidays = db.query(HolidayCalendar).all()
        print(f"Database initialized. Seeded holidays count: {len(holidays)}")
        for h in holidays[:3]:
            print(f"  - {h.holiday_date}: {h.holiday_name} ({h.description})")
    except Exception as e:
        print(f"Error reading holidays: {e}")
    finally:
        db.close()
