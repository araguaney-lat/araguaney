"""Tests for ProfileService — profile update, campaigns/center summary, avatar upload."""

from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.schemas.user_domain import UserUpdate
from app.services.profile_service import ProfileService


def _make_user(**overrides):
    user = MagicMock()
    user.id = uuid4()
    user.email = "vol@centro.org"
    user.username = "voluntario1"
    user.full_name = "Ana Pérez"
    user.avatar_url = None
    user.center_role = "volunteer"
    user.center_id = uuid4()
    for k, v in overrides.items():
        setattr(user, k, v)
    return user


class TestGetProfile:
    @patch("app.services.profile_service.UserCampaignRepository")
    @patch("app.services.profile_service.CenterRepository")
    def test_includes_center_name_and_campaigns(self, mock_center_repo, mock_campaign_repo):
        user = _make_user()
        center = MagicMock(name="Centro CDMX")
        center.name = "Centro CDMX"
        mock_center_repo.return_value.find_by_id.return_value = center

        campaign = MagicMock()
        campaign.id = uuid4()
        campaign.name = "Donaciones Generales"
        mock_campaign_repo.return_value.list_campaigns_for_user.return_value = [campaign]

        result = ProfileService(MagicMock()).get_profile(user)

        assert result["center_name"] == "Centro CDMX"
        assert result["campaigns"] == [{"id": campaign.id, "name": "Donaciones Generales"}]
        assert result["email"] == user.email
        assert "role" not in result  # platform role intentionally not exposed here

    @patch("app.services.profile_service.UserCampaignRepository")
    @patch("app.services.profile_service.CenterRepository")
    def test_national_admin_has_no_center(self, mock_center_repo, mock_campaign_repo):
        user = _make_user(center_id=None, center_role="national_admin")
        mock_campaign_repo.return_value.list_campaigns_for_user.return_value = []

        result = ProfileService(MagicMock()).get_profile(user)

        assert result["center_name"] is None
        mock_center_repo.return_value.find_by_id.assert_not_called()


class TestUpdateProfile:
    @patch("app.services.profile_service.UserRepository")
    def test_updates_and_strips_full_name(self, mock_repo):
        user = _make_user()
        ProfileService(MagicMock()).update_profile(user, UserUpdate(full_name="  Ana María Pérez  "))
        assert user.full_name == "Ana María Pérez"
        mock_repo.return_value.save.assert_called_once_with(user)

    def test_rejects_blank_name(self):
        user = _make_user()
        with pytest.raises(HTTPException) as exc:
            ProfileService(MagicMock()).update_profile(user, UserUpdate(full_name="   "))
        assert exc.value.status_code == 400


class TestUploadAvatar:
    def test_rejects_unsupported_content_type(self):
        user = _make_user()
        with pytest.raises(HTTPException) as exc:
            ProfileService(MagicMock()).upload_avatar(user, "application/pdf", b"data")
        assert exc.value.status_code == 400

    def test_rejects_oversized_image(self):
        user = _make_user()
        oversized = b"x" * (5 * 1024 * 1024 + 1)
        with pytest.raises(HTTPException) as exc:
            ProfileService(MagicMock()).upload_avatar(user, "image/png", oversized)
        assert exc.value.status_code == 400

    @patch("app.services.profile_service.UserRepository")
    @patch("app.services.profile_service.cloudinary.uploader")
    @patch("app.services.profile_service.cloudinary.config")
    def test_uploads_and_stores_secure_url(self, mock_config, mock_uploader, mock_repo):
        user = _make_user()
        mock_uploader.upload.return_value = {"secure_url": "https://res.cloudinary.com/dtvdqlxtd/x.webp"}

        ProfileService(MagicMock()).upload_avatar(user, "image/jpeg", b"fake-bytes")

        assert user.avatar_url == "https://res.cloudinary.com/dtvdqlxtd/x.webp"
        mock_repo.return_value.save.assert_called_once_with(user)
        _, kwargs = mock_uploader.upload.call_args
        assert kwargs["folder"] == "araguaney/profile"
        assert kwargs["public_id"] == str(user.id)

    @patch("app.services.profile_service.UserRepository")
    @patch("app.services.profile_service.cloudinary.uploader")
    @patch("app.services.profile_service.cloudinary.config")
    def test_wraps_cloudinary_failure_as_502(self, mock_config, mock_uploader, mock_repo):
        user = _make_user()
        mock_uploader.upload.side_effect = RuntimeError("Cloudinary down")

        with pytest.raises(HTTPException) as exc:
            ProfileService(MagicMock()).upload_avatar(user, "image/jpeg", b"fake-bytes")
        assert exc.value.status_code == 502
        mock_repo.return_value.save.assert_not_called()
