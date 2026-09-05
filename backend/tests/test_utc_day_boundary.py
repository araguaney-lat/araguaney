"""The day a report cuts on is UTC, and the code says so.

Both `_resolve_dates` and the intake capture date used `date.today()`, which
reads the process's local clock. Production happens to run UTC — the
`python:3.12-slim` image sets no timezone — so the numbers were right by
accident rather than by decision, and the accident held only while nobody set
`TZ`.

What it did break, every day, is the suite: `report_repository` interprets the
boundaries as UTC days (`_start_dt`/`_end_dt`), so on any machine west of
Greenwich the default window ended before the rows the fixtures had just
written. Two permanently red tests teach people to ignore red tests.
"""

from datetime import date, datetime, timezone

from app.routers import report
from app.services import intake_service


def test_the_default_window_ends_on_the_utc_day(monkeypatch):
    """01:00 UTC on the 5th is still the 4th in Mexico City. The window has to
    end on the 5th, because that is the day the stored timestamps are in."""
    monkeypatch.setattr(
        report, "_now", lambda: datetime(2026, 9, 5, 1, 0, tzinfo=timezone.utc)
    )

    start, end = report._resolve_dates(None, None)

    assert end == date(2026, 9, 5)
    assert start == date(2026, 8, 7)  # 30 days inclusive


def test_the_reports_clock_is_utc():
    """Not merely aware: UTC. An aware clock in another zone would still cut
    the day somewhere the stored timestamps do not."""
    assert report._now().utcoffset() == timezone.utc.utcoffset(None)


def test_the_capture_date_is_the_utc_day():
    """The shelf-life rule measures from the capture date against expiry dates
    that are plain calendar days. Which day that is cannot depend on where the
    server happens to be running."""
    assert intake_service._capture_date() == datetime.now(timezone.utc).date()
