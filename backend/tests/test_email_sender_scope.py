"""Tests del filtro de remitente del webhook de Resend.

Una cuenta de Resend es compartida por varios productos y un endpoint de
webhook está en el alcance de la *cuenta*, no del dominio de envío: cada
endpoint recibe todos los eventos de la cuenta. El filtro decide cuáles son
nuestros.
"""
import pytest

from app.services.email_sender_scope import is_ours, owned_domains, sender_domain


class TestSenderDomain:
    @pytest.mark.parametrize(
        "value,expected",
        [
            ("Araguaney <noreply@araguaney.lat>", "araguaney.lat"),
            ("noreply@araguaney.lat", "araguaney.lat"),
            ("  NoReply@Araguaney.LAT  ", "araguaney.lat"),
            ("Bioflow <noreply@bioflow.app>", "bioflow.app"),
        ],
    )
    def test_extracts_domain(self, value, expected):
        assert sender_domain(value) == expected

    @pytest.mark.parametrize("value", [None, "", "sin-arroba", 42, {"from": "x@y.z"}])
    def test_unparseable_is_none(self, value):
        assert sender_domain(value) is None


class TestOwnedDomains:
    def test_falls_back_to_mail_from(self, monkeypatch):
        monkeypatch.setattr("app.config.settings.email_owned_domains", "")
        monkeypatch.setattr("app.config.settings.mail_from", "noreply@araguaney.lat")
        assert owned_domains() == {"araguaney.lat"}

    def test_explicit_list_wins_and_is_normalized(self, monkeypatch):
        monkeypatch.setattr(
            "app.config.settings.email_owned_domains", " Araguaney.lat , mail.araguaney.lat ,"
        )
        monkeypatch.setattr("app.config.settings.mail_from", "noreply@otro.test")
        assert owned_domains() == {"araguaney.lat", "mail.araguaney.lat"}

    def test_unknown_sender_yields_empty(self, monkeypatch):
        monkeypatch.setattr("app.config.settings.email_owned_domains", "")
        monkeypatch.setattr("app.config.settings.mail_from", "")
        assert owned_domains() == set()


class TestIsOurs:
    @pytest.fixture(autouse=True)
    def _our_domain(self, monkeypatch):
        monkeypatch.setattr("app.config.settings.email_owned_domains", "")
        monkeypatch.setattr("app.config.settings.mail_from", "noreply@araguaney.lat")

    def test_keeps_our_own_event(self):
        assert is_ours({"from": "Araguaney <noreply@araguaney.lat>"}) is True

    def test_keeps_a_sending_subdomain(self):
        assert is_ours({"from": "Araguaney <noreply@mail.araguaney.lat>"}) is True

    def test_drops_another_product_on_the_same_account(self):
        assert is_ours({"from": "Bioflow <noreply@bioflow.app>"}) is False

    def test_does_not_match_a_domain_that_merely_ends_the_same(self):
        assert is_ours({"from": "no@notaraguaney.lat"}) is False

    def test_missing_sender_is_kept(self):
        """Falla abierta: perder un rebote propio es peor que guardar uno ajeno."""
        assert is_ours({"email_id": "re_1"}) is True

    def test_keeps_everything_when_our_domain_is_unknown(self, monkeypatch):
        monkeypatch.setattr("app.config.settings.mail_from", "")
        assert is_ours({"from": "Bioflow <noreply@bioflow.app>"}) is True
