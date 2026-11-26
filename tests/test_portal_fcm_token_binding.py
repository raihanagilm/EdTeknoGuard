import unittest
from unittest.mock import patch
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.models import Pelanggan, PerangkatONT
from app.portal.services.customer_service import PortalCustomerService


class TestPortalFcmTokenBinding(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Pelanggan.__table__.create(self.engine)
        PerangkatONT.__table__.create(self.engine)
        SessionLocal = sessionmaker(bind=self.engine)
        self.db = SessionLocal()

        self.kantoran = Pelanggan(
            id_pelanggan="cust202601010001",
            nama="Kantoran",
            no_hp="081111111111",
            fcm_token="device_fcm_token_123456789012345",
            kantor="pusat",
        )
        self.meity = Pelanggan(
            id_pelanggan="cust202601010002",
            nama="Meity Rahayu",
            no_hp="082222222222",
            fcm_token=None,
            kantor="pusat",
        )
        self.db.add_all([self.kantoran, self.meity])
        self.db.commit()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def test_reassign_fcm_token_clears_previous_owner(self):
        with patch("app.portal.services.customer_service.get_all_kantor_codes", return_value=[]):
            saved, nama, _ = PortalCustomerService.reassign_fcm_token(
                cust_id="cust202601010002",
                token="device_fcm_token_123456789012345",
                db=self.db,
                hint_kantor="pusat",
            )

        self.db.expire_all()
        kantoran = self.db.query(Pelanggan).filter_by(id_pelanggan="cust202601010001").first()
        meity = self.db.query(Pelanggan).filter_by(id_pelanggan="cust202601010002").first()

        self.assertTrue(saved)
        self.assertEqual(nama, "Meity Rahayu")
        self.assertIsNone(kantoran.fcm_token)
        self.assertEqual(meity.fcm_token, "device_fcm_token_123456789012345")

    def test_logout_app_clears_fcm_token_but_web_preserves_it(self):
        with patch("app.portal.services.customer_service.get_all_kantor_codes", return_value=[]):
            # Logout dari WEB tidak boleh menghapus token FCM HP Android
            PortalCustomerService.clear_fcm_token_on_logout(
                cust_id="cust202601010001",
                platform="WEB",
                fcm_token=None,
                db=self.db,
                hint_kantor="pusat",
            )
            self.db.expire_all()
            kantoran = self.db.query(Pelanggan).filter_by(id_pelanggan="cust202601010001").first()
            self.assertEqual(kantoran.fcm_token, "device_fcm_token_123456789012345")

            # Logout dari APP harus mencabut token FCM dari akun
            PortalCustomerService.clear_fcm_token_on_logout(
                cust_id="cust202601010001",
                platform="APP",
                fcm_token="device_fcm_token_123456789012345",
                db=self.db,
                hint_kantor="pusat",
            )
            self.db.expire_all()
            kantoran = self.db.query(Pelanggan).filter_by(id_pelanggan="cust202601010001").first()
            self.assertIsNone(kantoran.fcm_token)
