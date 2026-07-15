from datetime import datetime, time, date, timedelta
from zoneinfo import ZoneInfo
from sqlalchemy.orm import Session
from app.models.models import HolidayCalendar

IST_TZ = ZoneInfo("Asia/Kolkata")

def get_current_ist_time() -> datetime:
    return datetime.now(IST_TZ)

def check_is_weekend(d: date) -> bool:
    # 5 = Saturday, 6 = Sunday
    return d.weekday() >= 5

def get_market_status(db: Session, check_time: datetime = None) -> tuple[str, str]:
    """
    Returns (status_code, reason)
    status_code: "PRE_OPEN", "OPEN", "CLOSED"
    reason: description like "Pre-Open Session", "Market Open", "Market Closed", "Weekend", or Holiday Name
    """
    if check_time is None:
        check_time = get_current_ist_time()
    
    check_date = check_time.date()
    
    # 1. Check Weekend
    if check_is_weekend(check_date):
        return "CLOSED", "Market Closed - Weekend"
        
    # 2. Check Holiday Calendar
    holiday = db.query(HolidayCalendar).filter(HolidayCalendar.holiday_date == check_date).first()
    if holiday:
        return "CLOSED", f"Market Closed - {holiday.holiday_name}"
        
    # 3. Check Hours (IST)
    current_time = check_time.time()
    
    pre_open_start = time(9, 0, 0)
    market_open = time(9, 15, 0)
    market_close = time(15, 30, 0)
    
    if pre_open_start <= current_time < market_open:
        return "PRE_OPEN", "Pre-Open"
    elif market_open <= current_time < market_close:
        return "OPEN", "Market Open"
    else:
        return "CLOSED", "Market Closed"
