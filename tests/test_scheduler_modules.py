import unittest
from unittest.mock import MagicMock
from app.services.scheduler.state_manager import SchedulerStateManager, OfficeScanState
from app.services.scheduler.recovery_manager import SchedulerRecoveryManager
from app.services.scheduler_service import ONTSchedulerService

class TestSchedulerModules(unittest.TestCase):

    def test_office_scan_state_initialization(self):
        """Memastikan OfficeScanState diinisialisasi dengan benar per kantor"""
        state = SchedulerStateManager.get_office_state("Pusat")
        self.assertEqual(state.kantor, "pusat")
        self.assertFalse(state.is_scanning)
        self.assertFalse(state.is_paused)
        self.assertFalse(state.is_stopped)
        self.assertEqual(state.current_scan_index, 0)

    def test_singleton_scheduler_service(self):
        """Memastikan instance ONTSchedulerService bertindak sebagai Singleton"""
        s1 = ONTSchedulerService()
        s2 = ONTSchedulerService()
        self.assertIs(s1, s2)

    def test_check_office_configuration_mocked(self):
        """Memvalidasi kalkulasi konfigurasi kantor menggunakan mock session DB"""
        mock_db = MagicMock()
        mock_setting = MagicMock()
        mock_setting.value_text = '[{"username": "admin", "password": "tekno2025"}]'
        
        # Simulasi return nilai setting dari DB dan query count
        mock_db.query.return_value.filter.return_value.first.return_value = mock_setting
        mock_db.query.return_value.filter.return_value.count.return_value = 1
        
        cfg = SchedulerRecoveryManager.check_office_configuration(mock_db, kantor="banyumas")
        self.assertEqual(cfg["kantor"], "banyumas")
        self.assertTrue(cfg["has_credentials"])
        self.assertIn("warning_threshold_dbm", cfg)
        self.assertIn("critical_threshold_dbm", cfg)
        self.assertIn("polling_interval_minutes", cfg)

if __name__ == "__main__":
    unittest.main()
